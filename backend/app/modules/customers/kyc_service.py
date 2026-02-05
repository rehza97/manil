"""KYC service containing ALL business logic for document verification."""

import logging
import os
from typing import Any, Optional
from datetime import datetime, timezone
from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    NotFoundException,
    ValidationException,
    ForbiddenException,
)
from app.modules.customers.kyc_repository import KYCRepository
from app.modules.customers.repository import CustomerRepository
from app.modules.customers.kyc_models import KYCDocument, KYCStatus, KYCDocumentType
from app.modules.customers.kyc_schemas import (
    KYCDocumentUpload,
    KYCDocumentUpdate,
    KYCVerificationAction,
    KYCStatusSummary,
    CustomerKYCStatus,
)
from app.infrastructure.storage.service import StorageService
from app.infrastructure.email.service import EmailService
from app.infrastructure.sms.service import SMSService
from app.modules.notifications.service import create_notification, user_id_by_email
from app.modules.settings.utils import notification_gate_allows
from app.modules.settings.service import UserNotificationPreferencesService
from app.config.settings import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


class KYCService:
    """KYC business logic service."""

    # Required documents for corporate customers (one document)
    REQUIRED_CORPORATE_DOCS = {
        KYCDocumentType.BUSINESS_REGISTRATION,
    }

    # Required documents for individual customers (one document)
    REQUIRED_INDIVIDUAL_DOCS = {
        KYCDocumentType.NATIONAL_ID,
    }

    def __init__(self, db: AsyncSession):
        """Initialize service with database session."""
        self.db = db
        self.repository = KYCRepository(db)
        self.customer_repository = CustomerRepository(db)
        self.storage = StorageService()
        self.settings = settings

    async def upload_document(
        self,
        customer_id: str,
        file: UploadFile,
        document_data: KYCDocumentUpload,
        uploaded_by: str,
    ) -> KYCDocument:
        """
        Upload and store KYC document.

        Business rules:
        - File type must be allowed (PDF, JPEG, PNG)
        - File size must not exceed 10MB
        - Customer must exist
        - Transaction safety: File is deleted if database operation fails
        """
        # Verify customer exists
        customer = await self.customer_repository.get_by_id(customer_id)
        if not customer:
            raise NotFoundException(f"Customer {customer_id} not found")

        # Check for duplicate document
        has_existing = await self.repository.has_existing_document(
            customer_id=customer_id,
            document_type=document_data.document_type,
        )
        if has_existing:
            raise ValidationException(
                f"Customer already has an active {document_data.document_type.value} document. "
                "Please delete or replace the existing document first."
            )

        # Validate file extension
        if file.filename:
            file_ext = os.path.splitext(file.filename)[1].lower()
            if file_ext not in self.settings.KYC_ALLOWED_EXTENSIONS:
                raise ValidationException(
                    f"Invalid file extension. Allowed extensions: {', '.join(self.settings.KYC_ALLOWED_EXTENSIONS)}"
                )

        # Validate file type (MIME type)
        if file.content_type not in self.settings.KYC_ALLOWED_MIME_TYPES:
            raise ValidationException(
                f"Invalid file type. Allowed types: {', '.join(self.settings.KYC_ALLOWED_MIME_TYPES)}"
            )

        # Validate file size
        file_content = await file.read()
        file_size = len(file_content)
        if file_size > self.settings.KYC_MAX_FILE_SIZE:
            raise ValidationException(
                f"File size exceeds maximum allowed size of {self.settings.KYC_MAX_FILE_SIZE / 1024 / 1024}MB"
            )

        # Validate expiry date if provided
        if document_data.expires_at:
            if document_data.expires_at <= datetime.utcnow():
                raise ValidationException(
                    "Document expiry date must be in the future"
                )

        file_path = None
        try:
            # Store file
            file_path = self.storage.save_kyc_document(
                customer_id=customer_id,
                file_content=file_content,
                filename=file.filename or "document",
                content_type=file.content_type,
            )

            # Create database record
            document = await self.repository.create(
                customer_id=customer_id,
                document_data=document_data,
                file_path=file_path,
                file_name=file.filename or "document",
                file_size=file_size,
                mime_type=file.content_type,
                created_by=uploaded_by,
            )

            # Send upload notification to customer
            try:
                await self._send_kyc_upload_notification(document, customer)
            except Exception as e:
                logger.warning(f"Failed to send KYC upload notification: {e}")

            return document

        except Exception as e:
            # If database operation fails, delete the uploaded file
            if file_path:
                try:
                    self.storage.delete_file(file_path)
                except Exception:
                    # Log but don't fail if file deletion fails
                    pass
            raise e

    async def get_document(self, document_id: str) -> KYCDocument:
        """Get KYC document by ID."""
        document = await self.repository.get_by_id(document_id)
        if not document:
            raise NotFoundException(f"KYC document {document_id} not found")
        return document

    async def get_customer_documents(
        self,
        customer_id: str,
        status: Optional[KYCStatus] = None,
    ) -> list[KYCDocument]:
        """Get all KYC documents for a customer."""
        return await self.repository.get_by_customer(customer_id, status)

    async def update_document(
        self,
        document_id: str,
        document_data: KYCDocumentUpdate,
        updated_by: str,
    ) -> KYCDocument:
        """Update KYC document metadata."""
        document = await self.get_document(document_id)
        return await self.repository.update(document, document_data, updated_by)

    async def verify_document(
        self,
        document_id: str,
        verification: KYCVerificationAction,
        verified_by: str,
    ) -> KYCDocument:
        """
        Verify or reject a KYC document.

        Business rules:
        - Only pending or under_review documents can be verified
        - Rejection must include a reason
        """
        document = await self.get_document(document_id)

        # Check if document can be verified
        if document.status not in [KYCStatus.PENDING, KYCStatus.UNDER_REVIEW]:
            raise ValidationException(
                f"Cannot verify document with status {document.status}"
            )

        document = await self.repository.verify(
            document=document,
            status=verification.status,
            verified_by=verified_by,
            rejection_reason=verification.rejection_reason,
            notes=verification.notes,
        )
        try:
            customer = await self.customer_repository.get_by_id(document.customer_id)
            if customer and customer.email:
                event = (
                    "kyc.document_approved"
                    if verification.status == KYCStatus.APPROVED
                    else "kyc.document_rejected"
                )
                await self._send_kyc_verification_notification(
                    document=document,
                    customer=customer,
                    event=event,
                    rejection_reason=verification.rejection_reason,
                )
        except Exception as e:
            logger.warning("Failed to send KYC verification notification: %s", e)
        return document

    async def _send_kyc_upload_notification(
        self,
        document: KYCDocument,
        customer: Any,
    ) -> None:
        """Send email, SMS, and in-app notification when KYC document is uploaded."""
        logger.info(f"[KYC UPLOAD NOTIFICATION] Starting notification for customer {customer.email}, document {document.id}")

        uid = await user_id_by_email(self.db, customer.email)
        logger.info(f"[KYC UPLOAD NOTIFICATION] User ID lookup: {uid}")

        should_send_email = True
        should_send_sms = False
        if uid:
            prefs_svc = UserNotificationPreferencesService(self.db)
            prefs = await prefs_svc.get(uid)
            should_send_email = bool(prefs.get("email", {}).get("accountUpdates", True))
            should_send_sms = bool(prefs.get("sms", {}).get("accountUpdates", False))
            logger.info(f"[KYC UPLOAD NOTIFICATION] User preferences - Email: {should_send_email}, SMS: {should_send_sms}")
        else:
            logger.warning(f"[KYC UPLOAD NOTIFICATION] No user ID found for email {customer.email}")

        doc_type = getattr(document.document_type, "value", str(document.document_type))
        event = "kyc.document_uploaded"

        gate_allows_email = await notification_gate_allows(self.db, "email", event)
        gate_allows_sms = await notification_gate_allows(self.db, "sms", event)
        logger.info(f"[KYC UPLOAD NOTIFICATION] Notification gates - Email: {gate_allows_email}, SMS: {gate_allows_sms}")

        subject = "KYC Document Received"
        html_body = (
            f"<p>Hello {customer.name or customer.email},</p>"
            f"<p>We have successfully received your {doc_type} document.</p>"
            f"<p>Our team will review it shortly and notify you of the outcome.</p>"
        )
        text_body = (
            f"Hello {customer.name or customer.email},\n\n"
            f"We have successfully received your {doc_type} document.\n"
            f"Our team will review it shortly and notify you of the outcome."
        )
        notif_type = "kyc_document_uploaded"
        notif_title = "KYC Document Received"
        notif_body = f"Your {doc_type} document has been received and is under review."
        sms_msg = f"Your {doc_type} document has been received. We will review it shortly."

        if should_send_email and gate_allows_email:
            logger.info(f"[KYC UPLOAD NOTIFICATION] Sending email to {customer.email}")
            email_svc = EmailService()
            await email_svc.send_email(
                to=[customer.email],
                subject=subject,
                html_body=html_body,
                text_body=text_body,
                db=self.db,
            )
            logger.info(f"[KYC UPLOAD NOTIFICATION] Email sent successfully")
        else:
            logger.warning(f"[KYC UPLOAD NOTIFICATION] Email NOT sent - should_send_email: {should_send_email}, gate_allows: {gate_allows_email}")

        if (
            customer.phone
            and customer.phone.strip()
            and should_send_sms
            and gate_allows_sms
        ):
            logger.info(f"[KYC UPLOAD NOTIFICATION] Sending SMS to {customer.phone}")
            sms_svc = SMSService()
            await sms_svc.send_sms(customer.phone, sms_msg, db=self.db)
            logger.info(f"[KYC UPLOAD NOTIFICATION] SMS sent successfully")
        else:
            logger.warning(f"[KYC UPLOAD NOTIFICATION] SMS NOT sent - phone: {customer.phone}, should_send_sms: {should_send_sms}, gate_allows: {gate_allows_sms}")

        if uid:
            try:
                logger.info(f"[KYC UPLOAD NOTIFICATION] Creating in-app notification for user {uid}")
                await create_notification(
                    self.db,
                    uid,
                    notif_type,
                    notif_title,
                    body=notif_body,
                    link="/dashboard/kyc",
                )
                logger.info(f"[KYC UPLOAD NOTIFICATION] In-app notification created successfully")
            except Exception as e:
                logger.error(f"[KYC UPLOAD NOTIFICATION] Failed to create in-app notification: {e}", exc_info=True)
        else:
            logger.warning(f"[KYC UPLOAD NOTIFICATION] No in-app notification created - no user ID")

    async def _send_kyc_expiration_notification(
        self,
        document: KYCDocument,
        customer: Any,
    ) -> None:
        """Send email, SMS, and in-app notification when KYC document expires."""
        uid = await user_id_by_email(self.db, customer.email)
        should_send_email = True
        should_send_sms = False
        if uid:
            prefs_svc = UserNotificationPreferencesService(self.db)
            prefs = await prefs_svc.get(uid)
            should_send_email = bool(prefs.get("email", {}).get("accountUpdates", True))
            should_send_sms = bool(prefs.get("sms", {}).get("accountUpdates", False))

        doc_type = getattr(document.document_type, "value", str(document.document_type))
        event = "kyc.document_expired"

        gate_allows_email = await notification_gate_allows(self.db, "email", event)
        gate_allows_sms = await notification_gate_allows(self.db, "sms", event)

        subject = "KYC Document Expired"
        html_body = (
            f"<p>Hello {customer.name or customer.email},</p>"
            f"<p>Your {doc_type} document has expired.</p>"
            f"<p>Please upload a new document to maintain your account verification status.</p>"
        )
        text_body = (
            f"Hello {customer.name or customer.email},\n\n"
            f"Your {doc_type} document has expired.\n"
            f"Please upload a new document to maintain your account verification status."
        )
        notif_type = "kyc_document_expired"
        notif_title = "KYC Document Expired"
        notif_body = f"Your {doc_type} document has expired. Please upload a new one."
        sms_msg = f"Your {doc_type} document has expired. Please upload a new document."

        if should_send_email and gate_allows_email:
            email_svc = EmailService()
            await email_svc.send_email(
                to=[customer.email],
                subject=subject,
                html_body=html_body,
                text_body=text_body,
                db=self.db,
            )
        if (
            customer.phone
            and customer.phone.strip()
            and should_send_sms
            and gate_allows_sms
        ):
            sms_svc = SMSService()
            await sms_svc.send_sms(customer.phone, sms_msg, db=self.db)
        if uid:
            try:
                await create_notification(
                    self.db,
                    uid,
                    notif_type,
                    notif_title,
                    body=notif_body,
                    link="/dashboard/kyc",
                )
            except Exception as e:
                logger.warning("Failed to create in-app KYC expiration notification: %s", e)

    async def _send_kyc_verification_notification(
        self,
        document: KYCDocument,
        customer: Any,
        event: str,
        rejection_reason: Optional[str] = None,
    ) -> None:
        """Send email, SMS, and in-app notification for KYC document approved/rejected."""
        uid = await user_id_by_email(self.db, customer.email)
        should_send_email = True
        should_send_sms = False
        if uid:
            prefs_svc = UserNotificationPreferencesService(self.db)
            prefs = await prefs_svc.get(uid)
            should_send_email = bool(prefs.get("email", {}).get("accountUpdates", True))
            should_send_sms = bool(prefs.get("sms", {}).get("accountUpdates", False))

        doc_type = getattr(document.document_type, "value", str(document.document_type))
        is_approved = event == "kyc.document_approved"

        gate_allows_email = await notification_gate_allows(self.db, "email", event)
        gate_allows_sms = await notification_gate_allows(self.db, "sms", event)

        if is_approved:
            subject = "KYC Document Approved"
            html_body = (
                f"<p>Hello {customer.name or customer.email},</p>"
                f"<p>Your KYC document ({doc_type}) has been verified and approved.</p>"
            )
            text_body = (
                f"Hello {customer.name or customer.email},\n\n"
                f"Your KYC document ({doc_type}) has been verified and approved."
            )
            notif_type = "kyc_document_approved"
            notif_title = "KYC Document Approved"
            notif_body = f"Your {doc_type} document has been approved."
            sms_msg = f"Your KYC document ({doc_type}) has been approved."
        else:
            reason = (rejection_reason or "Please contact support.").strip()
            subject = "KYC Document Rejected"
            html_body = (
                f"<p>Hello {customer.name or customer.email},</p>"
                f"<p>Your KYC document ({doc_type}) could not be approved.</p>"
                f"<p>Reason: {reason}</p><p>Please submit a new document or contact support.</p>"
            )
            text_body = (
                f"Hello {customer.name or customer.email},\n\n"
                f"Your KYC document ({doc_type}) was not approved. Reason: {reason}\n"
                "Please submit a new document or contact support."
            )
            notif_type = "kyc_document_rejected"
            notif_title = "KYC Document Rejected"
            notif_body = f"Your {doc_type} document was rejected. Reason: {reason}"
            sms_msg = f"KYC document rejected. Reason: {reason[:80]}"

        if should_send_email and gate_allows_email:
            email_svc = EmailService()
            await email_svc.send_email(
                to=[customer.email],
                subject=subject,
                html_body=html_body,
                text_body=text_body,
                db=self.db,
            )
        if (
            customer.phone
            and customer.phone.strip()
            and should_send_sms
            and gate_allows_sms
        ):
            sms_svc = SMSService()
            await sms_svc.send_sms(customer.phone, sms_msg, db=self.db)
        if uid:
            try:
                await create_notification(
                    self.db,
                    uid,
                    notif_type,
                    notif_title,
                    body=notif_body,
                    link="/dashboard/profile",
                )
            except Exception as e:
                logger.warning("Failed to create in-app KYC notification: %s", e)

    async def delete_document(
        self,
        document_id: str,
        deleted_by: str,
    ) -> None:
        """Delete a KYC document."""
        document = await self.get_document(document_id)
        await self.repository.delete(document, deleted_by)

        # Optionally delete file from storage
        try:
            self.storage.delete_file(document.file_path)
        except Exception:
            # Log but don't fail if file deletion fails
            pass

    async def get_kyc_summary(self, customer_id: str) -> KYCStatusSummary:
        """Get KYC status summary for a customer."""
        total = await self.repository.count_by_status(customer_id)
        pending = await self.repository.count_by_status(customer_id, KYCStatus.PENDING)
        approved = await self.repository.count_by_status(customer_id, KYCStatus.APPROVED)
        rejected = await self.repository.count_by_status(customer_id, KYCStatus.REJECTED)
        under_review = await self.repository.count_by_status(customer_id, KYCStatus.UNDER_REVIEW)
        expired = await self.repository.count_by_status(customer_id, KYCStatus.EXPIRED)

        # Determine overall status
        if total == 0:
            overall_status = "incomplete"
        elif pending > 0 or under_review > 0:
            overall_status = "pending_review"
        elif approved >= 1:  # At least 1 document approved
            overall_status = "complete"
        else:
            overall_status = "incomplete"

        # Customer can be activated if they have at least 1 approved document
        can_activate = approved >= 1

        return KYCStatusSummary(
            customer_id=customer_id,
            total_documents=total,
            pending_documents=pending,
            approved_documents=approved,
            rejected_documents=rejected,
            under_review_documents=under_review,
            expired_documents=expired,
            overall_status=overall_status,
            can_activate=can_activate,
        )

    async def get_document_file_path(self, document_id: str) -> tuple[str, str, str]:
        """
        Get file path for downloading a KYC document.

        Returns:
            Tuple of (file_path, file_name, mime_type)
        """
        document = await self.get_document(document_id)

        # Get absolute file path
        file_path = self.storage.get_file_path(document.file_path)

        if not file_path.exists():
            raise NotFoundException(
                f"Document file not found: {document.file_path}")

        return str(file_path), document.file_name, document.mime_type

    async def check_and_mark_expired_documents(self) -> int:
        """
        Check for expired documents and mark them as expired.

        This method should be called periodically (e.g., via cron job or scheduler).

        Returns:
            Number of documents marked as expired
        """
        expired_docs = await self.repository.get_expired_documents()
        count = 0

        for doc in expired_docs:
            await self.repository.mark_as_expired(doc)
            count += 1

            # Send expiration notification to customer
            try:
                customer = await self.customer_repository.get_by_id(doc.customer_id)
                if customer and customer.email:
                    await self._send_kyc_expiration_notification(doc, customer)
            except Exception as e:
                logger.warning(f"Failed to send KYC expiration notification for document {doc.id}: {e}")

        return count

    async def get_customer_kyc_status(self, customer_id: str) -> CustomerKYCStatus:
        """Get complete KYC status for a customer including missing documents."""
        customer = await self.customer_repository.get_by_id(customer_id)
        if not customer:
            raise NotFoundException(f"Customer {customer_id} not found")

        documents = await self.get_customer_documents(customer_id)
        summary = await self.get_kyc_summary(customer_id)

        # Determine required documents based on customer type
        from app.modules.customers.schemas import CustomerType
        if customer.customer_type == CustomerType.CORPORATE:
            required_docs = list(self.REQUIRED_CORPORATE_DOCS)
        else:
            required_docs = list(self.REQUIRED_INDIVIDUAL_DOCS)

        # Find missing documents
        uploaded_types = {doc.document_type for doc in documents}
        missing_docs = [
            doc_type for doc_type in required_docs if doc_type not in uploaded_types]

        # Determine overall KYC status
        if not documents:
            kyc_status = "not_submitted"
        elif summary.pending_documents > 0 or summary.under_review_documents > 0:
            kyc_status = "pending"
        elif summary.approved_documents >= len(required_docs):
            kyc_status = "approved"
        elif summary.rejected_documents > 0:
            kyc_status = "rejected"
        else:
            kyc_status = "not_submitted"

        return CustomerKYCStatus(
            customer_id=customer_id,
            kyc_status=kyc_status,
            documents=[doc for doc in documents],
            summary=summary,
            required_documents=required_docs,
            missing_documents=missing_docs,
        )
