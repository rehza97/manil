"""Customer approval workflow service."""

import logging
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException, ValidationException
from app.modules.customers.repository import CustomerRepository
from app.modules.customers.models import Customer
from app.modules.customers.schemas import ApprovalStatus, CustomerStatus
from app.modules.customers.notes_service import CustomerNoteService
from app.modules.customers.notes_schemas import CustomerNoteCreate
from app.modules.customers.notes_models import NoteType
from app.modules.customers.kyc_service import KYCService
from app.infrastructure.email.service import EmailService
from app.infrastructure.sms.service import SMSService
from app.modules.notifications.service import create_notification, user_id_by_email
from app.modules.settings.service import UserNotificationPreferencesService
from app.modules.settings.utils import notification_gate_allows

logger = logging.getLogger(__name__)


class CustomerWorkflowService:
    """Service for managing customer approval workflows."""

    def __init__(self, db: AsyncSession):
        """Initialize service with database session."""
        self.db = db
        self.repository = CustomerRepository(db)
        self.note_service = CustomerNoteService(db)
        self.kyc_service = KYCService(db)

    async def submit_for_approval(
        self,
        customer_id: str,
        submitted_by: str,
        notes: Optional[str] = None,
    ) -> Customer:
        """
        Submit customer for approval.

        Args:
            customer_id: Customer ID
            submitted_by: User ID submitting for approval
            notes: Optional notes for submission

        Returns:
            Updated customer instance
        """
        customer = await self.repository.get_by_id(customer_id)
        if not customer:
            raise NotFoundException(f"Customer {customer_id} not found")

        if customer.approval_status == ApprovalStatus.PENDING:
            raise ValidationException("Customer is already pending approval")

        if customer.approval_status == ApprovalStatus.APPROVED:
            raise ValidationException("Customer is already approved")

        # Update approval status
        customer.approval_status = ApprovalStatus.PENDING
        customer.updated_by = submitted_by
        await self.db.commit()
        await self.db.refresh(customer)

        # Create internal note
        note_content = f"Customer submitted for approval."
        if notes:
            note_content += f"\n\nNotes: {notes}"

        try:
            await self.note_service.create_note(
                customer_id=customer_id,
                note_data=CustomerNoteCreate(
                    note_type=NoteType.INTERNAL,
                    title="Submitted for Approval",
                    content=note_content,
                    is_pinned=False,
                ),
                created_by=submitted_by,
            )
        except Exception as e:
            logger.warning(
                f"Failed to create note for approval submission: {e}")

        logger.info(
            f"Customer {customer_id} submitted for approval by {submitted_by}")

        # Send notification to customer
        try:
            if customer.email:
                # Check notification gates
                gate_allows_email = await notification_gate_allows(self.db, "email", "customer.submitted_for_approval")
                gate_allows_sms = await notification_gate_allows(self.db, "sms", "customer.submitted_for_approval")

                # Check user preferences
                uid = await user_id_by_email(self.db, customer.email)
                should_send_email = True
                should_send_sms = False

                if uid:
                    prefs_svc = UserNotificationPreferencesService(self.db)
                    prefs = await prefs_svc.get(uid)
                    should_send_email = bool(
                        prefs.get("email", {}).get("accountUpdates", True))
                    should_send_sms = bool(
                        prefs.get("sms", {}).get("accountUpdates", False))

                # Send email notification
                if should_send_email and gate_allows_email:
                    email_service = EmailService()
                    # TODO: Create email template for customer.submitted_for_approval
                    # For now, using a simple notification
                    await email_service.send_email(
                        to=[customer.email],
                        subject="Account Submitted for Approval",
                        html_body=f"<p>Hello {customer.name or customer.email},</p><p>Your account has been submitted for approval. We will review your information and notify you once a decision has been made.</p>",
                        text_body=f"Hello {customer.name or customer.email},\n\nYour account has been submitted for approval. We will review your information and notify you once a decision has been made.",
                        db=self.db
                    )

                # Send SMS notification
                if customer.phone and customer.phone.strip() and should_send_sms and gate_allows_sms:
                    sms_service = SMSService()
                    await sms_service.send_sms(
                        customer.phone,
                        f"Your account has been submitted for approval. We'll notify you once reviewed.",
                        db=self.db
                    )

                # Create in-app notification
                if uid:
                    try:
                        await create_notification(
                            self.db,
                            uid,
                            "customer_submitted_for_approval",
                            "Account Submitted for Approval",
                            body="Your account has been submitted for approval. We will review your information and notify you once a decision has been made.",
                            link="/dashboard/profile"
                        )
                    except Exception as e:
                        logger.warning(
                            f"Failed to create in-app notification for customer submission: {e}")
        except Exception as e:
            logger.warning(
                f"Failed to send customer submission notification: {e}")

        return customer

    async def approve_customer(
        self,
        customer_id: str,
        approved_by: str,
        notes: Optional[str] = None,
    ) -> Customer:
        """
        Approve customer.

        If KYC is complete, automatically activates the customer.

        Args:
            customer_id: Customer ID
            approved_by: User ID approving
            notes: Optional approval notes

        Returns:
            Updated customer instance
        """
        customer = await self.repository.get_by_id(customer_id)
        if not customer:
            raise NotFoundException(f"Customer {customer_id} not found")

        if customer.approval_status != ApprovalStatus.PENDING:
            raise ValidationException(
                f"Cannot approve customer with status {customer.approval_status.value}"
            )

        # Update approval status
        customer.approval_status = ApprovalStatus.APPROVED
        customer.updated_by = approved_by

        # Check if KYC is complete and activate if so
        try:
            kyc_status = await self.kyc_service.get_customer_kyc_status(customer_id)
            if kyc_status.kyc_status == "approved" and kyc_status.summary.can_activate:
                if customer.status == CustomerStatus.PENDING:
                    customer.status = CustomerStatus.ACTIVE
                    logger.info(
                        f"Customer {customer_id} automatically activated after approval")
        except Exception as e:
            logger.warning(f"Could not check KYC status during approval: {e}")

        await self.db.commit()
        await self.db.refresh(customer)

        # Create internal note
        note_content = f"Customer approved."
        if notes:
            note_content += f"\n\nApproval notes: {notes}"
        if customer.status == CustomerStatus.ACTIVE:
            note_content += "\n\nCustomer automatically activated (KYC complete)."

        try:
            await self.note_service.create_note(
                customer_id=customer_id,
                note_data=CustomerNoteCreate(
                    note_type=NoteType.INTERNAL,
                    title="Customer Approved",
                    content=note_content,
                    is_pinned=False,
                ),
                created_by=approved_by,
            )
        except Exception as e:
            logger.warning(f"Failed to create note for approval: {e}")

        logger.info(f"Customer {customer_id} approved by {approved_by}")

        # Send notification to customer (CRITICAL - customer must be notified)
        try:
            if customer.email:
                # Check notification gates
                gate_allows_email = await notification_gate_allows(self.db, "email", "customer.approved")
                gate_allows_sms = await notification_gate_allows(self.db, "sms", "customer.approved")

                # Check user preferences
                uid = await user_id_by_email(self.db, customer.email)
                should_send_email = True
                should_send_sms = False

                if uid:
                    prefs_svc = UserNotificationPreferencesService(self.db)
                    prefs = await prefs_svc.get(uid)
                    should_send_email = bool(
                        prefs.get("email", {}).get("accountUpdates", True))
                    should_send_sms = bool(
                        prefs.get("sms", {}).get("accountUpdates", False))

                # Send email notification
                if should_send_email and gate_allows_email:
                    email_service = EmailService()
                    activation_msg = "Your account has been activated and you can now access all features." if customer.status == CustomerStatus.ACTIVE else "Your account approval is complete. Please complete KYC to activate your account."
                    await email_service.send_email(
                        to=[customer.email],
                        subject="Account Approved - Welcome!",
                        html_body=f"<p>Hello {customer.name or customer.email},</p><p>Great news! Your account has been approved. {activation_msg}</p>",
                        text_body=f"Hello {customer.name or customer.email},\n\nGreat news! Your account has been approved. {activation_msg}",
                        db=self.db
                    )

                # Send SMS notification
                if customer.phone and customer.phone.strip() and should_send_sms and gate_allows_sms:
                    sms_service = SMSService()
                    await sms_service.send_sms(
                        customer.phone,
                        f"Your account has been approved! {activation_msg if customer.status == CustomerStatus.ACTIVE else 'Please complete KYC to activate.'}",
                        db=self.db
                    )

                # Create in-app notification
                if uid:
                    try:
                        await create_notification(
                            self.db,
                            uid,
                            "customer_approved",
                            "Account Approved",
                            body=f"Your account has been approved! {activation_msg}",
                            link="/dashboard"
                        )
                    except Exception as e:
                        logger.warning(
                            f"Failed to create in-app notification for customer approval: {e}")
        except Exception as e:
            logger.warning(
                f"Failed to send customer approval notification: {e}")

        return customer

    async def reject_customer(
        self,
        customer_id: str,
        rejected_by: str,
        reason: str,
    ) -> Customer:
        """
        Reject customer approval.

        Args:
            customer_id: Customer ID
            rejected_by: User ID rejecting
            reason: Reason for rejection (required)

        Returns:
            Updated customer instance
        """
        if not reason or not reason.strip():
            raise ValidationException("Rejection reason is required")

        customer = await self.repository.get_by_id(customer_id)
        if not customer:
            raise NotFoundException(f"Customer {customer_id} not found")

        if customer.approval_status != ApprovalStatus.PENDING:
            raise ValidationException(
                f"Cannot reject customer with status {customer.approval_status.value}"
            )

        # Update approval status and deactivate
        customer.approval_status = ApprovalStatus.REJECTED
        customer.status = CustomerStatus.INACTIVE
        customer.updated_by = rejected_by
        await self.db.commit()
        await self.db.refresh(customer)

        # Create issue note with rejection reason
        try:
            await self.note_service.create_note(
                customer_id=customer_id,
                note_data=CustomerNoteCreate(
                    note_type=NoteType.ISSUE,
                    title="Customer Approval Rejected",
                    content=f"Customer approval rejected.\n\nReason: {reason}",
                    is_pinned=True,  # Pin rejection notes
                ),
                created_by=rejected_by,
            )
        except Exception as e:
            logger.warning(f"Failed to create note for rejection: {e}")

        # Send rejection notification to customer
        try:
            if customer.email:
                uid = await user_id_by_email(self.db, customer.email)

                # Check notification gates
                gate_allows_email = await notification_gate_allows(
                    self.db, "email", "customer.approval_rejected"
                )
                gate_allows_sms = await notification_gate_allows(
                    self.db, "sms", "customer.approval_rejected"
                )

                # Check user preferences
                should_send_email = True
                should_send_sms = False
                if uid:
                    prefs_svc = UserNotificationPreferencesService(self.db)
                    prefs = await prefs_svc.get(uid)
                    should_send_email = bool(
                        prefs.get("email", {}).get("accountUpdates", True)
                    )
                    should_send_sms = bool(
                        prefs.get("sms", {}).get("accountUpdates", False)
                    )

                # Send email notification
                if should_send_email and gate_allows_email:
                    email_svc = EmailService()
                    await email_svc.send_email(
                        to=[customer.email],
                        subject="Account Approval Decision",
                        html_body=(
                            f"<p>Hello {customer.name or customer.email},</p>"
                            f"<p>We regret to inform you that your account application was not approved at this time.</p>"
                            f"<p><strong>Reason:</strong> {reason}</p>"
                            f"<p>If you have any questions or would like to discuss this decision, "
                            f"please contact our support team.</p>"
                        ),
                        text_body=(
                            f"Hello {customer.name or customer.email},\n\n"
                            f"We regret to inform you that your account application was not approved at this time.\n\n"
                            f"Reason: {reason}\n\n"
                            f"If you have any questions or would like to discuss this decision, "
                            f"please contact our support team."
                        ),
                        db=self.db,
                    )

                # Send SMS notification
                if (
                    customer.phone
                    and customer.phone.strip()
                    and should_send_sms
                    and gate_allows_sms
                ):
                    sms_svc = SMSService()
                    await sms_svc.send_sms(
                        customer.phone,
                        f"Your account application was not approved. Please contact support for details.",
                        db=self.db,
                    )

                # Send in-app notification
                if uid:
                    try:
                        await create_notification(
                            self.db,
                            uid,
                            "customer_rejected",
                            "Account Not Approved",
                            body=f"Your account application was not approved. Reason: {reason}",
                            link="/dashboard/profile",
                        )
                    except Exception as e:
                        logger.warning(
                            f"Failed to create in-app rejection notification: {e}"
                        )
        except Exception as e:
            logger.warning(f"Failed to send customer rejection notification: {e}")

        logger.info(
            f"Customer {customer_id} rejected by {rejected_by}: {reason}")
        return customer
