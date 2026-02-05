"""Customer service containing ALL business logic."""

import logging
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException, ConflictException, ValidationException
from app.modules.customers.repository import CustomerRepository
from app.modules.customers.schemas import (
    CustomerCreate,
    CustomerUpdate,
    CustomerListResponse,
    CustomerStatistics,
    CustomerStatus,
    CustomerType,
)
from app.modules.customers.models import Customer
from app.modules.customers.validation import validate_status_transition, check_kyc_requirements
from app.modules.audit.service import AuditService
from app.modules.audit.models import AuditAction
from app.infrastructure.email.service import EmailService
from app.infrastructure.sms.service import SMSService
from app.modules.notifications.service import create_notification, user_id_by_email
from app.modules.settings.service import UserNotificationPreferencesService
from app.modules.settings.utils import notification_gate_allows

logger = logging.getLogger(__name__)


class CustomerService:
    """Customer business logic service."""

    def __init__(self, db: AsyncSession):
        """Initialize service with database session."""
        self.repository = CustomerRepository(db)
        self.db = db

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        status: Optional[CustomerStatus] = None,
        customer_type: Optional[CustomerType] = None,
        search: Optional[str] = None,
    ) -> CustomerListResponse:
        """Get all customers with pagination and filtering."""
        customers, total = await self.repository.get_all(
            skip=skip,
            limit=limit,
            status=status,
            customer_type=customer_type,
            search=search,
        )

        # Calculate pagination metadata
        page = (skip // limit) + 1 if limit > 0 else 1
        total_pages = (total + limit - 1) // limit if limit > 0 else 1

        return CustomerListResponse(
            data=customers,
            total=total,
            page=page,
            page_size=limit,
            total_pages=total_pages,
        )

    async def get_by_id(self, customer_id: str) -> Customer:
        """Get customer by ID."""
        customer = await self.repository.get_by_id(customer_id)
        if not customer:
            raise NotFoundException(
                f"Customer with ID {customer_id} not found")
        return customer

    async def get_by_email(self, email: str) -> Optional[Customer]:
        """Get customer by email address."""
        return await self.repository.get_by_email(email)

    async def create(self, customer_data: CustomerCreate, created_by: str) -> Customer:
        """
        Create a new customer.

        Business rules:
        - Email must be unique
        - Corporate customers must have company_name
        - Validate tax_id format if provided
        """
        # #region agent log
        import json
        import os
        import time
        log_path = '/tmp/debug.log'
        dump_data = customer_data.model_dump()
        try:
            with open(log_path, 'a') as f:
                f.write(json.dumps({"sessionId": "debug-session", "runId": "run1", "hypothesisId": "D", "location": "service.py:65", "message": "Service received from router", "data": {"customer_type": str(customer_data.customer_type), "customer_type_type": str(type(customer_data.customer_type)), "customer_type_value":
                        customer_data.customer_type.value if hasattr(customer_data.customer_type, 'value') else None, "model_dump_customer_type": dump_data.get('customer_type'), "model_dump_customer_type_type": str(type(dump_data.get('customer_type'))) if dump_data.get('customer_type') else None}, "timestamp": int(time.time()*1000)})+'\n')
        except:
            pass
        # #endregion
        # Check if email already exists
        existing = await self.repository.get_by_email(customer_data.email)
        if existing:
            raise ConflictException(
                f"Customer with email {customer_data.email} already exists")

        # Validate corporate customer requirements
        if customer_data.customer_type == CustomerType.CORPORATE:
            if not customer_data.company_name:
                raise ValidationException(
                    "Company name is required for corporate customers")

        # Create customer
        customer = await self.repository.create(customer_data, created_by)
        return customer

    async def update(self, customer_id: str, customer_data: CustomerUpdate, updated_by: str) -> Customer:
        """Update customer with validation."""
        try:
            # Get existing customer
            customer = await self.get_by_id(customer_id)

            # Validate email uniqueness if being updated
            if customer_data.email and customer_data.email != customer.email:
                exists = await self.repository.exists_by_email(
                    customer_data.email,
                    exclude_id=customer_id
                )
                if exists:
                    raise ConflictException(
                        f"Customer with email {customer_data.email} already exists")

            # Validate corporate requirements
            updated_type = customer_data.customer_type or customer.customer_type
            updated_company = customer_data.company_name if customer_data.company_name is not None else customer.company_name
            if updated_type == CustomerType.CORPORATE and not updated_company:
                raise ValidationException(
                    "Company name is required for corporate customers")

            # Update customer
            return await self.repository.update(customer, customer_data, updated_by)
        except Exception as e:
            logger.error(
                f"Failed to update customer {customer_id}: {e}", exc_info=True)
            raise

    async def delete(self, customer_id: str, deleted_by: str) -> None:
        """Soft delete customer."""
        try:
            customer = await self.get_by_id(customer_id)
            await self.repository.delete(customer, deleted_by)
            logger.info(
                f"Customer {customer_id} soft deleted by user {deleted_by}")
        except Exception as e:
            logger.error(
                f"Failed to delete customer {customer_id}: {e}", exc_info=True)
            raise

    async def change_status(
        self,
        customer_id: str,
        new_status: CustomerStatus,
        reason: str,
        updated_by: str,
    ) -> Customer:
        """
        Change customer status with validation and audit logging.

        Args:
            customer_id: Customer ID
            new_status: New status to transition to
            reason: Reason for status change (required)
            updated_by: User ID making the change

        Returns:
            Updated customer instance
        """
        customer = await self.get_by_id(customer_id)
        old_status = customer.status

        # Validate transition
        validate_status_transition(old_status, new_status, reason)

        # Check KYC requirements if needed
        if new_status == CustomerStatus.ACTIVE:
            await check_kyc_requirements(self.db, customer_id, new_status)

        # Update status
        update_data = CustomerUpdate(status=new_status)
        result = await self.repository.update(customer, update_data, updated_by)

        # Log to audit system (async)
        try:
            from app.modules.audit.repository import AuditRepository
            from app.modules.audit.schemas import AuditLogCreate
            from sqlalchemy import select
            from app.modules.auth.models import User

            # Get user info if available
            user_result = await self.db.execute(select(User).where(User.id == updated_by))
            user = user_result.scalar_one_or_none()

            # AuditRepository accepts both Session and AsyncSession
            # The async methods work with AsyncSession
            audit_repo = AuditRepository(self.db)
            audit_data = AuditLogCreate(
                action=AuditAction.UPDATE,
                resource_type="customer",
                resource_id=customer_id,
                description=f"Customer status changed from {old_status.value} to {new_status.value}. Reason: {reason}",
                user_id=updated_by,
                user_email=user.email if user else None,
                user_role=user.role_slug if user else None,
                old_values={"status": old_status.value},
                new_values={"status": new_status.value},
            )
            await audit_repo.create(audit_data)
        except Exception as e:
            logger.warning(f"Failed to log status change to audit: {e}")

        # Send status change notification to customer
        try:
            await self._send_status_change_notification(
                customer=result,
                old_status=old_status,
                new_status=new_status,
                reason=reason
            )
        except Exception as e:
            logger.warning(f"Failed to send status change notification: {e}")

        logger.info(
            f"Customer {customer_id} status changed from {old_status.value} to {new_status.value} by {updated_by}")
        return result

    async def _send_status_change_notification(
        self,
        customer: Customer,
        old_status: CustomerStatus,
        new_status: CustomerStatus,
        reason: str,
    ) -> None:
        """Send email, SMS, and in-app notification when customer status changes."""
        if not customer.email:
            logger.warning(f"[STATUS CHANGE NOTIFICATION] No email for customer {customer.id}")
            return

        logger.info(f"[STATUS CHANGE NOTIFICATION] Starting notification for customer {customer.email}, {old_status.value} → {new_status.value}")

        # Get user ID
        uid = await user_id_by_email(self.db, customer.email)
        logger.info(f"[STATUS CHANGE NOTIFICATION] User ID lookup: {uid}")

        # Determine event type
        event_map = {
            CustomerStatus.SUSPENDED: "customer.suspended",
            CustomerStatus.ACTIVE: "customer.reactivated" if old_status == CustomerStatus.SUSPENDED else "customer.activated",
            CustomerStatus.INACTIVE: "customer.deactivated",
        }
        event = event_map.get(new_status, "customer.status_changed")

        # Check user preferences
        should_send_email = True
        should_send_sms = False
        if uid:
            prefs_svc = UserNotificationPreferencesService(self.db)
            prefs = await prefs_svc.get(uid)
            should_send_email = bool(prefs.get("email", {}).get("accountUpdates", True))
            should_send_sms = bool(prefs.get("sms", {}).get("accountUpdates", False))
            logger.info(f"[STATUS CHANGE NOTIFICATION] User preferences - Email: {should_send_email}, SMS: {should_send_sms}")
        else:
            logger.warning(f"[STATUS CHANGE NOTIFICATION] No user ID found for email {customer.email}")

        # Check notification gates
        gate_allows_email = await notification_gate_allows(self.db, "email", event)
        gate_allows_sms = await notification_gate_allows(self.db, "sms", event)
        logger.info(f"[STATUS CHANGE NOTIFICATION] Notification gates - Email: {gate_allows_email}, SMS: {gate_allows_sms}")

        # Prepare notification content based on status
        if new_status == CustomerStatus.SUSPENDED:
            subject = "Account Suspended"
            html_body = (
                f"<p>Hello {customer.name or customer.email},</p>"
                f"<p>Your account has been suspended.</p>"
                f"<p><strong>Reason:</strong> {reason}</p>"
                f"<p>If you have any questions, please contact our support team.</p>"
            )
            text_body = (
                f"Hello {customer.name or customer.email},\n\n"
                f"Your account has been suspended.\n\n"
                f"Reason: {reason}\n\n"
                f"If you have any questions, please contact our support team."
            )
            notif_type = "customer_suspended"
            notif_title = "Account Suspended"
            notif_body = f"Your account has been suspended. Reason: {reason}"
            sms_msg = f"Your account has been suspended. Please contact support."

        elif new_status == CustomerStatus.ACTIVE:
            if old_status == CustomerStatus.SUSPENDED:
                subject = "Account Reactivated"
                html_body = (
                    f"<p>Hello {customer.name or customer.email},</p>"
                    f"<p>Good news! Your account has been reactivated.</p>"
                    f"<p>You can now access all services.</p>"
                )
                text_body = (
                    f"Hello {customer.name or customer.email},\n\n"
                    f"Good news! Your account has been reactivated.\n"
                    f"You can now access all services."
                )
                notif_type = "customer_reactivated"
                notif_title = "Account Reactivated"
                notif_body = "Your account has been reactivated. You can now access all services."
                sms_msg = "Your account has been reactivated."
            else:
                subject = "Account Activated"
                html_body = (
                    f"<p>Hello {customer.name or customer.email},</p>"
                    f"<p>Your account has been activated.</p>"
                    f"<p>You can now access all services.</p>"
                )
                text_body = (
                    f"Hello {customer.name or customer.email},\n\n"
                    f"Your account has been activated.\n"
                    f"You can now access all services."
                )
                notif_type = "customer_activated"
                notif_title = "Account Activated"
                notif_body = "Your account has been activated. Welcome!"
                sms_msg = "Your account has been activated."

        elif new_status == CustomerStatus.INACTIVE:
            subject = "Account Deactivated"
            html_body = (
                f"<p>Hello {customer.name or customer.email},</p>"
                f"<p>Your account has been deactivated.</p>"
                f"<p><strong>Reason:</strong> {reason}</p>"
                f"<p>If you believe this is an error, please contact our support team.</p>"
            )
            text_body = (
                f"Hello {customer.name or customer.email},\n\n"
                f"Your account has been deactivated.\n\n"
                f"Reason: {reason}\n\n"
                f"If you believe this is an error, please contact our support team."
            )
            notif_type = "customer_deactivated"
            notif_title = "Account Deactivated"
            notif_body = f"Your account has been deactivated. Reason: {reason}"
            sms_msg = "Your account has been deactivated. Please contact support."

        else:
            # Generic status change
            subject = "Account Status Changed"
            html_body = (
                f"<p>Hello {customer.name or customer.email},</p>"
                f"<p>Your account status has been updated to: {new_status.value}</p>"
                f"<p><strong>Reason:</strong> {reason}</p>"
            )
            text_body = (
                f"Hello {customer.name or customer.email},\n\n"
                f"Your account status has been updated to: {new_status.value}\n\n"
                f"Reason: {reason}"
            )
            notif_type = "customer_status_changed"
            notif_title = "Account Status Changed"
            notif_body = f"Your account status: {new_status.value}"
            sms_msg = f"Your account status has been updated to: {new_status.value}"

        # Send email
        if should_send_email and gate_allows_email:
            logger.info(f"[STATUS CHANGE NOTIFICATION] Sending email to {customer.email}")
            email_svc = EmailService()
            await email_svc.send_email(
                to=[customer.email],
                subject=subject,
                html_body=html_body,
                text_body=text_body,
                db=self.db,
            )
            logger.info(f"[STATUS CHANGE NOTIFICATION] Email sent successfully")
        else:
            logger.warning(f"[STATUS CHANGE NOTIFICATION] Email NOT sent - should_send: {should_send_email}, gate_allows: {gate_allows_email}")

        # Send SMS
        if (
            customer.phone
            and customer.phone.strip()
            and should_send_sms
            and gate_allows_sms
        ):
            logger.info(f"[STATUS CHANGE NOTIFICATION] Sending SMS to {customer.phone}")
            sms_svc = SMSService()
            await sms_svc.send_sms(customer.phone, sms_msg, db=self.db)
            logger.info(f"[STATUS CHANGE NOTIFICATION] SMS sent successfully")
        else:
            logger.warning(f"[STATUS CHANGE NOTIFICATION] SMS NOT sent - phone: {customer.phone}, should_send: {should_send_sms}, gate_allows: {gate_allows_sms}")

        # Send in-app notification
        if uid:
            try:
                logger.info(f"[STATUS CHANGE NOTIFICATION] Creating in-app notification for user {uid}")
                await create_notification(
                    self.db,
                    uid,
                    notif_type,
                    notif_title,
                    body=notif_body,
                    link="/dashboard/profile",
                )
                logger.info(f"[STATUS CHANGE NOTIFICATION] In-app notification created successfully")
            except Exception as e:
                logger.error(f"[STATUS CHANGE NOTIFICATION] Failed to create in-app notification: {e}", exc_info=True)
        else:
            logger.warning(f"[STATUS CHANGE NOTIFICATION] No in-app notification created - no user ID")

    async def activate(self, customer_id: str, updated_by: str, reason: str = "Customer activated") -> Customer:
        """Activate customer account with validation."""
        return await self.change_status(customer_id, CustomerStatus.ACTIVE, reason, updated_by)

    async def suspend(self, customer_id: str, updated_by: str, reason: str = "Customer suspended") -> Customer:
        """Suspend customer account with validation."""
        return await self.change_status(customer_id, CustomerStatus.SUSPENDED, reason, updated_by)

    async def get_statistics(self) -> CustomerStatistics:
        """Get customer statistics (optimized single query)."""
        try:
            # Get counts grouped by status in a single query
            stats_by_status = await self.repository.get_statistics_grouped()

            # Extract counts with defaults
            active = stats_by_status.get(CustomerStatus.ACTIVE, 0)
            pending = stats_by_status.get(CustomerStatus.PENDING, 0)
            suspended = stats_by_status.get(CustomerStatus.SUSPENDED, 0)
            inactive = stats_by_status.get(CustomerStatus.INACTIVE, 0)
            total = sum(stats_by_status.values())

            return CustomerStatistics(
                total=total,
                active=active,
                pending=pending,
                suspended=suspended,
                inactive=inactive,
            )
        except Exception as e:
            logger.error(
                f"Failed to get customer statistics: {e}", exc_info=True)
            raise
