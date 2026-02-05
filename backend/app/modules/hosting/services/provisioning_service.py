"""
VPS Provisioning Service.

High-level orchestration of VPS lifecycle management.
"""
import secrets
from datetime import datetime, timedelta, date
from typing import Optional
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.exceptions import NotFoundException, BadRequestException, ConflictException
from app.core.logging import logger
from app.modules.hosting.models import (
    VPSSubscription,
    VPSPlan,
    ContainerInstance,
    SubscriptionStatus,
    ContainerStatus,
    TimelineEventType,
    ActorType,
    SubscriptionTimeline
)
from app.modules.hosting.repository import (
    VPSSubscriptionRepository,
    SubscriptionTimelineRepository,
    ContainerInstanceRepository
)
from app.modules.hosting.services.docker_service import DockerManagementService
from app.modules.hosting.distros import get_distro_by_id
from app.modules.quotes.service import QuoteService
from app.modules.quotes.models import Quote, QuoteItem, QuoteStatus
from app.modules.invoices.service import InvoiceService
from app.infrastructure.email.service import EmailService
from app.infrastructure.sms.service import SMSService
from app.modules.notifications.service import create_notification, user_id_by_email
from app.modules.settings.service import UserNotificationPreferencesService
from app.modules.settings.utils import notification_gate_allows


class VPSProvisioningService:
    """Service for VPS lifecycle orchestration and management."""

    def __init__(self, db: AsyncSession):
        """Initialize provisioning service."""
        self.db = db
        self.subscription_repo = VPSSubscriptionRepository(db)
        self.timeline_repo = SubscriptionTimelineRepository(db)
        self.container_repo = ContainerInstanceRepository(db)
        self.docker_service = DockerManagementService(db)
        self.quote_service = QuoteService(db)
        self.email_service = EmailService()

    async def _send_vps_notification(
        self,
        subscription: VPSSubscription,
        event_type: str,
        additional_context: Optional[dict] = None
    ) -> None:
        """
        Send email, SMS, and in-app notification for VPS subscription events.

        Args:
            subscription: VPS subscription object
            event_type: Event type (e.g., 'vps.created', 'vps.provisioned', etc.)
            additional_context: Additional data like reason, old_plan, new_plan, etc.
        """
        # Get customer info
        from app.modules.customers.repository import CustomerRepository
        customer_repo = CustomerRepository(self.db)
        customer = await customer_repo.get_by_id(subscription.customer_id)

        if not customer or not customer.email:
            logger.warning(f"[VPS NOTIFICATION] No customer email for subscription {subscription.id}")
            return

        logger.info(f"[VPS NOTIFICATION] Starting notification for customer {customer.email}, event={event_type}, subscription={subscription.id}")

        # Get user ID
        uid = await user_id_by_email(self.db, customer.email)
        logger.info(f"[VPS NOTIFICATION] User ID lookup: {uid}")

        # Check user preferences
        should_send_email = True
        should_send_sms = False
        if uid:
            prefs_svc = UserNotificationPreferencesService(self.db)
            prefs = await prefs_svc.get(uid)
            should_send_email = bool(prefs.get("email", {}).get("hostingUpdates", True))
            should_send_sms = bool(prefs.get("sms", {}).get("hostingUpdates", False))
            logger.info(f"[VPS NOTIFICATION] User preferences - Email: {should_send_email}, SMS: {should_send_sms}")
        else:
            logger.warning(f"[VPS NOTIFICATION] No user ID found for email {customer.email}")

        # Check notification gates
        gate_allows_email = await notification_gate_allows(self.db, "email", event_type)
        gate_allows_sms = await notification_gate_allows(self.db, "sms", event_type)
        logger.info(f"[VPS NOTIFICATION] Notification gates - Email: {gate_allows_email}, SMS: {gate_allows_sms}")

        # Get plan name
        plan_name = subscription.plan.name if subscription.plan else "VPS"

        # Prepare notification content based on event
        context = additional_context or {}

        if event_type == "vps.requested":
            subject = "VPS Request Received"
            html_body = (
                f"<p>Hello {customer.name or customer.email},</p>"
                f"<p>We have received your request for a {plan_name} VPS subscription.</p>"
                f"<p>Your request is being reviewed and will be approved shortly.</p>"
                f"<p><strong>Subscription ID:</strong> {subscription.id}</p>"
            )
            text_body = (
                f"Hello {customer.name or customer.email},\n\n"
                f"We have received your request for a {plan_name} VPS subscription.\n"
                f"Your request is being reviewed and will be approved shortly.\n\n"
                f"Subscription ID: {subscription.id}"
            )
            notif_type = "vps_requested"
            notif_title = "VPS Request Received"
            notif_body = f"Your {plan_name} VPS request has been received and is pending approval."
            sms_msg = f"Your {plan_name} VPS request has been received."

        elif event_type == "vps.approved":
            subject = "VPS Request Approved"
            html_body = (
                f"<p>Hello {customer.name or customer.email},</p>"
                f"<p>Great news! Your {plan_name} VPS request has been approved.</p>"
                f"<p>Your VPS is now being provisioned and will be ready shortly.</p>"
                f"<p><strong>Subscription ID:</strong> {subscription.id}</p>"
            )
            text_body = (
                f"Hello {customer.name or customer.email},\n\n"
                f"Great news! Your {plan_name} VPS request has been approved.\n"
                f"Your VPS is now being provisioned and will be ready shortly.\n\n"
                f"Subscription ID: {subscription.id}"
            )
            notif_type = "vps_approved"
            notif_title = "VPS Request Approved"
            notif_body = f"Your {plan_name} VPS request has been approved and is being provisioned."
            sms_msg = f"Your {plan_name} VPS request has been approved."

        elif event_type == "vps.provisioned":
            container_name = context.get("container_name", "your VPS")
            subject = "VPS Ready to Use"
            html_body = (
                f"<p>Hello {customer.name or customer.email},</p>"
                f"<p>Your {plan_name} VPS is now fully provisioned and ready to use!</p>"
                f"<p><strong>Container:</strong> {container_name}</p>"
                f"<p><strong>Subscription ID:</strong> {subscription.id}</p>"
                f"<p>You can now access your VPS from your dashboard.</p>"
            )
            text_body = (
                f"Hello {customer.name or customer.email},\n\n"
                f"Your {plan_name} VPS is now fully provisioned and ready to use!\n\n"
                f"Container: {container_name}\n"
                f"Subscription ID: {subscription.id}\n\n"
                f"You can now access your VPS from your dashboard."
            )
            notif_type = "vps_provisioned"
            notif_title = "VPS Ready"
            notif_body = f"Your {plan_name} VPS is ready to use!"
            sms_msg = f"Your {plan_name} VPS is ready to use!"

        elif event_type == "vps.suspended":
            reason = context.get("reason", "Administrative action")
            subject = "VPS Suspended"
            html_body = (
                f"<p>Hello {customer.name or customer.email},</p>"
                f"<p>Your {plan_name} VPS subscription has been suspended.</p>"
                f"<p><strong>Reason:</strong> {reason}</p>"
                f"<p><strong>Subscription ID:</strong> {subscription.id}</p>"
                f"<p>Please contact support if you have any questions.</p>"
            )
            text_body = (
                f"Hello {customer.name or customer.email},\n\n"
                f"Your {plan_name} VPS subscription has been suspended.\n\n"
                f"Reason: {reason}\n"
                f"Subscription ID: {subscription.id}\n\n"
                f"Please contact support if you have any questions."
            )
            notif_type = "vps_suspended"
            notif_title = "VPS Suspended"
            notif_body = f"Your {plan_name} VPS has been suspended. Reason: {reason}"
            sms_msg = f"Your {plan_name} VPS has been suspended. Contact support."

        elif event_type == "vps.reactivated":
            subject = "VPS Reactivated"
            html_body = (
                f"<p>Hello {customer.name or customer.email},</p>"
                f"<p>Good news! Your {plan_name} VPS subscription has been reactivated.</p>"
                f"<p><strong>Subscription ID:</strong> {subscription.id}</p>"
                f"<p>Your VPS is now active and running.</p>"
            )
            text_body = (
                f"Hello {customer.name or customer.email},\n\n"
                f"Good news! Your {plan_name} VPS subscription has been reactivated.\n\n"
                f"Subscription ID: {subscription.id}\n\n"
                f"Your VPS is now active and running."
            )
            notif_type = "vps_reactivated"
            notif_title = "VPS Reactivated"
            notif_body = f"Your {plan_name} VPS has been reactivated."
            sms_msg = f"Your {plan_name} VPS has been reactivated."

        elif event_type == "vps.cancelled":
            reason = context.get("reason", "User request")
            subject = "VPS Subscription Cancelled"
            html_body = (
                f"<p>Hello {customer.name or customer.email},</p>"
                f"<p>Your {plan_name} VPS subscription has been cancelled.</p>"
                f"<p><strong>Reason:</strong> {reason}</p>"
                f"<p><strong>Subscription ID:</strong> {subscription.id}</p>"
                f"<p>Thank you for using our VPS hosting services.</p>"
            )
            text_body = (
                f"Hello {customer.name or customer.email},\n\n"
                f"Your {plan_name} VPS subscription has been cancelled.\n\n"
                f"Reason: {reason}\n"
                f"Subscription ID: {subscription.id}\n\n"
                f"Thank you for using our VPS hosting services."
            )
            notif_type = "vps_cancelled"
            notif_title = "VPS Cancelled"
            notif_body = f"Your {plan_name} VPS subscription has been cancelled."
            sms_msg = f"Your {plan_name} VPS subscription has been cancelled."

        elif event_type == "vps.upgraded":
            old_plan = context.get("old_plan", "previous plan")
            new_plan = context.get("new_plan", plan_name)
            subject = "VPS Plan Upgraded"
            html_body = (
                f"<p>Hello {customer.name or customer.email},</p>"
                f"<p>Your VPS plan has been upgraded!</p>"
                f"<p><strong>From:</strong> {old_plan}</p>"
                f"<p><strong>To:</strong> {new_plan}</p>"
                f"<p><strong>Subscription ID:</strong> {subscription.id}</p>"
                f"<p>Your upgraded VPS resources are now available.</p>"
            )
            text_body = (
                f"Hello {customer.name or customer.email},\n\n"
                f"Your VPS plan has been upgraded!\n\n"
                f"From: {old_plan}\n"
                f"To: {new_plan}\n"
                f"Subscription ID: {subscription.id}\n\n"
                f"Your upgraded VPS resources are now available."
            )
            notif_type = "vps_upgraded"
            notif_title = "VPS Plan Upgraded"
            notif_body = f"Your VPS plan has been upgraded from {old_plan} to {new_plan}."
            sms_msg = f"Your VPS plan has been upgraded to {new_plan}."

        elif event_type == "vps.downgraded":
            old_plan = context.get("old_plan", "previous plan")
            new_plan = context.get("new_plan", plan_name)
            subject = "VPS Plan Changed"
            html_body = (
                f"<p>Hello {customer.name or customer.email},</p>"
                f"<p>Your VPS plan has been changed.</p>"
                f"<p><strong>From:</strong> {old_plan}</p>"
                f"<p><strong>To:</strong> {new_plan}</p>"
                f"<p><strong>Subscription ID:</strong> {subscription.id}</p>"
            )
            text_body = (
                f"Hello {customer.name or customer.email},\n\n"
                f"Your VPS plan has been changed.\n\n"
                f"From: {old_plan}\n"
                f"To: {new_plan}\n"
                f"Subscription ID: {subscription.id}"
            )
            notif_type = "vps_downgraded"
            notif_title = "VPS Plan Changed"
            notif_body = f"Your VPS plan has been changed from {old_plan} to {new_plan}."
            sms_msg = f"Your VPS plan has been changed to {new_plan}."

        else:
            # Generic VPS status change
            subject = "VPS Status Updated"
            html_body = (
                f"<p>Hello {customer.name or customer.email},</p>"
                f"<p>Your {plan_name} VPS status has been updated.</p>"
                f"<p><strong>Status:</strong> {subscription.status.value}</p>"
                f"<p><strong>Subscription ID:</strong> {subscription.id}</p>"
            )
            text_body = (
                f"Hello {customer.name or customer.email},\n\n"
                f"Your {plan_name} VPS status has been updated.\n\n"
                f"Status: {subscription.status.value}\n"
                f"Subscription ID: {subscription.id}"
            )
            notif_type = "vps_status_changed"
            notif_title = "VPS Status Updated"
            notif_body = f"Your {plan_name} VPS status: {subscription.status.value}"
            sms_msg = f"Your {plan_name} VPS status has been updated."

        # Send email
        if should_send_email and gate_allows_email:
            logger.info(f"[VPS NOTIFICATION] Sending email to {customer.email}")
            await self.email_service.send_email(
                to=[customer.email],
                subject=subject,
                html_body=html_body,
                text_body=text_body,
                db=self.db,
            )
            logger.info(f"[VPS NOTIFICATION] Email sent successfully")
        else:
            logger.warning(f"[VPS NOTIFICATION] Email NOT sent - should_send: {should_send_email}, gate_allows: {gate_allows_email}")

        # Send SMS
        if (
            customer.phone
            and customer.phone.strip()
            and should_send_sms
            and gate_allows_sms
        ):
            logger.info(f"[VPS NOTIFICATION] Sending SMS to {customer.phone}")
            sms_svc = SMSService()
            await sms_svc.send_sms(customer.phone, sms_msg, db=self.db)
            logger.info(f"[VPS NOTIFICATION] SMS sent successfully")
        else:
            logger.warning(f"[VPS NOTIFICATION] SMS NOT sent - phone: {customer.phone}, should_send: {should_send_sms}, gate_allows: {gate_allows_sms}")

        # Send in-app notification
        if uid:
            try:
                logger.info(f"[VPS NOTIFICATION] Creating in-app notification for user {uid}")
                await create_notification(
                    self.db,
                    uid,
                    notif_type,
                    notif_title,
                    body=notif_body,
                    link="/dashboard/vps",
                )
                logger.info(f"[VPS NOTIFICATION] In-app notification created successfully")
            except Exception as e:
                logger.error(f"[VPS NOTIFICATION] Failed to create in-app notification: {e}", exc_info=True)
        else:
            logger.warning(f"[VPS NOTIFICATION] No in-app notification created - no user ID")

    async def request_vps(self, user_id: str, plan_id: str, os_distro_id: Optional[str] = None) -> Quote:
        """
        Create a VPS request (quote + pending subscription).

        Args:
            user_id: User requesting VPS
            plan_id: VPS plan ID

        Returns:
            Created quote

        Raises:
            NotFoundException: If user or plan not found
            BadRequestException: If plan is inactive
        """
        # Validate user exists
        from app.modules.auth.models import User
        user_query = select(User).where(User.id == user_id)
        user_result = await self.db.execute(user_query)
        user = user_result.scalar_one_or_none()
        if not user:
            raise NotFoundException(f"User {user_id} not found")

        # Get or create customer record for this user
        from app.modules.customers.repository import CustomerRepository
        from app.modules.customers.schemas import CustomerCreate, CustomerType
        customer_repo = CustomerRepository(self.db)
        customer = await customer_repo.get_by_email(user.email)

        if not customer:
            # Create customer record from user information
            customer_data = CustomerCreate(
                name=user.full_name,
                email=user.email,
                phone="0000000000",  # Placeholder - user should update in profile
                customer_type=CustomerType.INDIVIDUAL,
            )
            customer = await customer_repo.create(customer_data, created_by=user_id)
            await self.db.flush()  # Ensure customer ID is available

        # Validate plan exists and is active
        plan_query = select(VPSPlan).where(VPSPlan.id == plan_id)
        plan_result = await self.db.execute(plan_query)
        plan = plan_result.scalar_one_or_none()
        if not plan:
            raise NotFoundException(f"VPS plan {plan_id} not found")
        if not plan.is_active:
            raise BadRequestException(f"VPS plan {plan.name} is not active")

        # Generate subscription number
        subscription_number = await self.subscription_repo.generate_subscription_number()

        # Create quote for VPS request
        from app.modules.quotes.schemas import QuoteCreate, QuoteItemCreate
        from datetime import datetime, timezone, timedelta

        quote_items = [
            QuoteItemCreate(
                item_name=f"VPS Setup Fee - {plan.name}",
                description=f"One-time setup fee for {plan.name}",
                quantity=1,
                unit_price=plan.setup_fee,
                product_id=None
            ),
            QuoteItemCreate(
                item_name=f"VPS Monthly Subscription - {plan.name}",
                description=f"Monthly subscription for {plan.name} ({plan.cpu_cores} CPU, {plan.ram_gb}GB RAM, {plan.storage_gb}GB Storage)",
                quantity=1,
                unit_price=plan.monthly_price,
                product_id=None
            )
        ]

        quote_data = QuoteCreate(
            customer_id=customer.id,
            title=f"VPS Hosting Request - {plan.name}",
            description=f"VPS hosting subscription request for {plan.name}",
            items=quote_items,
            tax_rate=Decimal("0.00"),
            discount_amount=Decimal("0.00"),
            valid_from=datetime.now(timezone.utc),
            valid_until=datetime.now(timezone.utc) + timedelta(days=30),
            approval_required=True,
            notes=f"VPS subscription request - awaiting admin approval"
        )

        quote = await self.quote_service.create(quote_data, created_by_id=user_id)

        # Create pending VPS subscription
        from app.modules.hosting.models import BillingCycle
        # Resolve OS selection (curated list) - default to Ubuntu 22.04
        resolved_distro_id = os_distro_id or "ubuntu-22.04"
        distro = get_distro_by_id(resolved_distro_id)
        if not distro:
            raise BadRequestException(
                f"Unsupported distro: {resolved_distro_id}")

        subscription = VPSSubscription(
            subscription_number=subscription_number,
            customer_id=user_id,
            plan_id=plan_id,
            quote_id=quote.id,
            status=SubscriptionStatus.PENDING,
            billing_cycle=BillingCycle.MONTHLY,  # Default to monthly
            auto_renew=True,
            grace_period_days=7,
            os_distro_id=distro["id"],
            os_docker_image=distro["docker_image"],
        )
        subscription = await self.subscription_repo.create(subscription)

        # Create timeline event
        await self.timeline_repo.create_event(
            subscription_id=subscription.id,
            event_type=TimelineEventType.CREATED,
            event_description="VPS subscription request created",
            actor_id=user_id,
            actor_type="CUSTOMER"
        )

        await self.db.commit()

        logger.info(
            f"VPS request created: {subscription.subscription_number} for user {user_id}")

        # Send VPS requested notification
        try:
            await self._send_vps_notification(subscription, "vps.requested")
        except Exception as e:
            logger.warning(f"Failed to send VPS requested notification: {e}")

        return quote

    async def approve_vps_request(self, subscription_id: str, approved_by_id: str) -> VPSSubscription:
        """
        Approve VPS request and trigger async provisioning.

        Args:
            subscription_id: Subscription ID to approve
            approved_by_id: Admin user ID approving

        Returns:
            Updated subscription

        Raises:
            NotFoundException: If subscription not found
            BadRequestException: If subscription not in PENDING status
        """
        subscription = await self.subscription_repo.get_by_id(subscription_id)
        if not subscription:
            raise NotFoundException(
                f"Subscription {subscription_id} not found")

        if subscription.status != SubscriptionStatus.PENDING:
            raise BadRequestException(
                f"Subscription is not pending (current status: {subscription.status})")

        # Ensure OS selection exists (default if missing)
        if not getattr(subscription, "os_distro_id", None) or not getattr(subscription, "os_docker_image", None):
            distro = get_distro_by_id("ubuntu-22.04")
            if distro:
                subscription.os_distro_id = distro["id"]
                subscription.os_docker_image = distro["docker_image"]

        # Update subscription status (download phase first)
        subscription.status = SubscriptionStatus.DOWNLOADING_IMAGE
        subscription.approved_at = datetime.utcnow()
        subscription.approved_by_id = approved_by_id
        subscription = await self.subscription_repo.update(subscription)

        # Update quote status
        if subscription.quote_id:
            quote = await self.quote_service.get_by_id(subscription.quote_id)
            quote.status = QuoteStatus.APPROVED
            quote.approved_by_id = approved_by_id
            quote.approved_at = datetime.utcnow()

        # Create timeline event
        await self.timeline_repo.create_event(
            subscription_id=subscription.id,
            event_type=TimelineEventType.APPROVED,
            event_description="VPS request approved by admin",
            actor_id=approved_by_id,
            actor_type="ADMIN"
        )

        await self.db.commit()

        logger.info(
            f"VPS request approved: {subscription.subscription_number} by {approved_by_id}")

        # Send VPS approved notification
        try:
            await self._send_vps_notification(subscription, "vps.approved")
        except Exception as e:
            logger.warning(f"Failed to send VPS approved notification: {e}")

        # Trigger async Celery task for image download (then provisioning)
        from app.modules.hosting.tasks import download_vps_image_async
        download_vps_image_async.delay(str(subscription.id))

        return subscription

    async def provision_vps(self, subscription_id: str) -> ContainerInstance:
        """
        Main provisioning workflow (called by Celery task or directly).

        Args:
            subscription_id: Subscription ID to provision

        Returns:
            Created container instance

        Raises:
            NotFoundException: If subscription not found
            BadRequestException: If subscription not in PROVISIONING status
        """
        subscription = await self.subscription_repo.get_by_id(subscription_id)
        if not subscription:
            raise NotFoundException(
                f"Subscription {subscription_id} not found")

        if subscription.status != SubscriptionStatus.PROVISIONING:
            raise BadRequestException(
                f"Subscription is not provisioning (current status: {subscription.status})")

        try:
            # Create container via Docker service
            container_instance = await self.docker_service.create_container(subscription)

            # Save container to database
            container_instance = await self.container_repo.create(container_instance)

            # Update subscription status
            subscription.status = SubscriptionStatus.ACTIVE
            subscription.start_date = date.today()
            subscription.next_billing_date = (
                date.today() + timedelta(days=30))
            subscription = await self.subscription_repo.update(subscription)

            # Create timeline event
            await self.timeline_repo.create_event(
                subscription_id=subscription.id,
                event_type=TimelineEventType.PROVISIONED,
                event_description="VPS successfully provisioned and started",
                actor_id=None,
                actor_type="SYSTEM",
                metadata={
                    "container_id": container_instance.container_id,
                    "ip_address": container_instance.ip_address,
                    "ssh_port": container_instance.ssh_port
                }
            )

            await self.db.commit()

            # Generate initial invoice (import here to avoid circular dependency)
            from app.modules.hosting.services.billing_service import SubscriptionBillingService
            billing_service = SubscriptionBillingService(self.db)
            await billing_service.generate_initial_invoice(subscription_id)

            # Send welcome email with credentials
            # Note: In production, decrypt password for email
            customer_email = subscription.customer.email if hasattr(
                subscription.customer, 'email') else None
            if customer_email:
                await self._send_welcome_email(
                    customer_email=customer_email,
                    subscription_number=subscription.subscription_number,
                    ip_address=container_instance.ip_address,
                    ssh_port=container_instance.ssh_port,
                    container_name=container_instance.container_name
                )

            logger.info(
                f"VPS provisioned successfully: {subscription.subscription_number}")

            # Send VPS provisioned/ready notification
            try:
                await self._send_vps_notification(
                    subscription,
                    "vps.provisioned",
                    {"container_name": container_instance.container_name}
                )
            except Exception as e:
                logger.warning(f"Failed to send VPS provisioned notification: {e}")

            return container_instance

        except Exception as e:
            # Rollback on failure
            logger.error(f"VPS provisioning failed for {subscription_id}: {e}")
            subscription.status = SubscriptionStatus.PENDING
            subscription.status_reason = f"Provisioning failed: {str(e)}"
            await self.subscription_repo.update(subscription)
            await self.db.commit()

            # Notify admin of failure
            await self._notify_provisioning_failure(subscription, str(e))
            raise

    async def upgrade_subscription(self, subscription_id: str, new_plan_id: str) -> VPSSubscription:
        """
        Upgrade subscription to higher-tier plan with pro-rated billing.

        Args:
            subscription_id: Subscription ID to upgrade
            new_plan_id: New plan ID

        Returns:
            Updated subscription

        Raises:
            NotFoundException: If subscription or plan not found
            BadRequestException: If downgrade attempted or subscription not active
        """
        subscription = await self.subscription_repo.get_by_id(subscription_id)
        if not subscription:
            raise NotFoundException(
                f"Subscription {subscription_id} not found")

        if subscription.status != SubscriptionStatus.ACTIVE:
            raise BadRequestException(
                f"Cannot upgrade subscription with status {subscription.status}")

        # Get new plan
        plan_query = select(VPSPlan).where(VPSPlan.id == new_plan_id)
        plan_result = await self.db.execute(plan_query)
        new_plan = plan_result.scalar_one_or_none()
        if not new_plan:
            raise NotFoundException(f"VPS plan {new_plan_id} not found")

        old_plan = subscription.plan

        # Validate upgrade path (no downgrades mid-cycle)
        if new_plan.monthly_price <= old_plan.monthly_price:
            raise BadRequestException(
                "Cannot downgrade mid-cycle. Cancel and create new subscription.")

        # Calculate pro-rated amount (import here to avoid circular dependency)
        from app.modules.hosting.services.billing_service import SubscriptionBillingService
        billing_service = SubscriptionBillingService(self.db)
        prorated_amount = await billing_service.calculate_prorated_amount(subscription, new_plan)

        # Update container resource limits (if container exists)
        container = await self.container_repo.get_by_subscription_id(subscription_id)
        if container:
            # Note: Docker service would need update_container_resources method
            # For now, just update database records
            container.cpu_limit = new_plan.cpu_cores
            container.memory_limit_gb = new_plan.ram_gb
            container.storage_limit_gb = new_plan.storage_gb
            await self.container_repo.update(container)

        # Update subscription plan
        subscription.plan_id = new_plan_id
        subscription = await self.subscription_repo.update(subscription)

        # Create timeline event
        await self.timeline_repo.create_event(
            subscription_id=subscription.id,
            event_type=TimelineEventType.UPGRADED,
            event_description=f"Upgraded from {old_plan.name} to {new_plan.name}",
            actor_id=subscription.customer_id,
            actor_type="CUSTOMER",
            metadata={
                "old_plan_id": str(old_plan.id),
                "old_plan_name": old_plan.name,
                "new_plan_id": str(new_plan.id),
                "new_plan_name": new_plan.name,
                "prorated_amount": float(prorated_amount)
            }
        )

        await self.db.commit()

        # Generate pro-rated invoice
        await billing_service.generate_prorated_invoice(
            subscription_id,
            prorated_amount,
            old_plan,
            new_plan
        )

        logger.info(
            f"Subscription upgraded: {subscription.subscription_number} from {old_plan.name} to {new_plan.name}")

        # Send VPS upgraded notification
        try:
            await self._send_vps_notification(
                subscription,
                "vps.upgraded",
                {"old_plan": old_plan.name, "new_plan": new_plan.name}
            )
        except Exception as e:
            logger.warning(f"Failed to send VPS upgraded notification: {e}")

        return subscription

    async def suspend_subscription(self, subscription_id: str, reason: str) -> VPSSubscription:
        """
        Suspend subscription (stops container, retains data).

        Args:
            subscription_id: Subscription ID to suspend
            reason: Reason for suspension

        Returns:
            Updated subscription
        """
        subscription = await self.subscription_repo.get_by_id(subscription_id)
        if not subscription:
            raise NotFoundException(
                f"Subscription {subscription_id} not found")

        # Stop container (data retained)
        container = await self.container_repo.get_by_subscription_id(subscription_id)
        if container and container.status == ContainerStatus.RUNNING:
            await self.docker_service.stop_container(container.container_id)
            container.status = ContainerStatus.STOPPED
            container.last_stopped_at = datetime.utcnow()
            await self.container_repo.update(container)

        # Update subscription status
        subscription.status = SubscriptionStatus.SUSPENDED
        subscription.status_reason = reason
        subscription = await self.subscription_repo.update(subscription)

        # Create timeline event
        await self.timeline_repo.create_event(
            subscription_id=subscription.id,
            event_type=TimelineEventType.SUSPENDED,
            event_description=f"Subscription suspended: {reason}",
            actor_id=None,
            actor_type="SYSTEM",
            metadata={"reason": reason}
        )

        await self.db.commit()

        logger.info(
            f"Subscription suspended: {subscription.subscription_number} - {reason}")

        # Send VPS suspended notification
        try:
            await self._send_vps_notification(subscription, "vps.suspended", {"reason": reason})
        except Exception as e:
            logger.warning(f"Failed to send VPS suspended notification: {e}")

        return subscription

    async def reactivate_subscription(self, subscription_id: str) -> VPSSubscription:
        """
        Reactivate suspended subscription.

        Args:
            subscription_id: Subscription ID to reactivate

        Returns:
            Updated subscription
        """
        subscription = await self.subscription_repo.get_by_id(subscription_id)
        if not subscription:
            raise NotFoundException(
                f"Subscription {subscription_id} not found")

        if subscription.status != SubscriptionStatus.SUSPENDED:
            raise BadRequestException(
                f"Subscription is not suspended (current status: {subscription.status})")

        # Start container
        container = await self.container_repo.get_by_subscription_id(subscription_id)
        if container:
            await self.docker_service.start_container(container.container_id)
            container.status = ContainerStatus.RUNNING
            container.last_started_at = datetime.utcnow()
            await self.container_repo.update(container)

        # Update subscription status
        subscription.status = SubscriptionStatus.ACTIVE
        subscription.status_reason = None
        subscription = await self.subscription_repo.update(subscription)

        # Create timeline event
        await self.timeline_repo.create_event(
            subscription_id=subscription.id,
            event_type=TimelineEventType.REACTIVATED,
            event_description="Subscription reactivated",
            actor_id=None,
            actor_type="SYSTEM"
        )

        await self.db.commit()

        logger.info(
            f"Subscription reactivated: {subscription.subscription_number}")

        # Send VPS reactivated notification
        try:
            await self._send_vps_notification(subscription, "vps.reactivated")
        except Exception as e:
            logger.warning(f"Failed to send VPS reactivated notification: {e}")

        return subscription

    async def cancel_subscription(self, subscription_id: str, immediate: bool, reason: str) -> VPSSubscription:
        """
        Cancel subscription (immediate or end of billing period).

        Args:
            subscription_id: Subscription ID to cancel
            immediate: If True, terminate immediately; if False, cancel at end of period
            reason: Reason for cancellation

        Returns:
            Updated subscription
        """
        if immediate:
            return await self.terminate_subscription(subscription_id)

        subscription = await self.subscription_repo.get_by_id(subscription_id)
        if not subscription:
            raise NotFoundException(
                f"Subscription {subscription_id} not found")

        subscription.auto_renew = False
        subscription.status = SubscriptionStatus.CANCELLED
        subscription.cancelled_at = datetime.utcnow()
        subscription.status_reason = reason
        subscription = await self.subscription_repo.update(subscription)

        # Create timeline event
        await self.timeline_repo.create_event(
            subscription_id=subscription.id,
            event_type=TimelineEventType.CANCELLED,
            event_description=f"Subscription cancelled: {reason}",
            actor_id=subscription.customer_id,
            actor_type="CUSTOMER",
            metadata={"reason": reason, "immediate": False}
        )

        await self.db.commit()

        logger.info(
            f"Subscription cancelled: {subscription.subscription_number} - {reason}")

        # Send VPS cancelled notification
        try:
            await self._send_vps_notification(subscription, "vps.cancelled", {"reason": reason})
        except Exception as e:
            logger.warning(f"Failed to send VPS cancelled notification: {e}")

        return subscription

    async def terminate_subscription(self, subscription_id: str) -> VPSSubscription:
        """
        Permanently terminate subscription and delete all data.

        Args:
            subscription_id: Subscription ID to terminate

        Returns:
            Updated subscription
        """
        subscription = await self.subscription_repo.get_by_id(subscription_id)
        if not subscription:
            raise NotFoundException(
                f"Subscription {subscription_id} not found")

        # Delete container and all volumes
        container = await self.container_repo.get_by_subscription_id(subscription_id)
        if container:
            await self.docker_service.delete_container(container.container_id, remove_volumes=True)
            container.status = ContainerStatus.TERMINATED
            await self.container_repo.update(container)

        # Update subscription status
        subscription.status = SubscriptionStatus.TERMINATED
        subscription.terminated_at = datetime.utcnow()
        subscription = await self.subscription_repo.update(subscription)

        # Create timeline event
        await self.timeline_repo.create_event(
            subscription_id=subscription.id,
            event_type=TimelineEventType.TERMINATED,
            event_description="Subscription terminated and all data deleted",
            actor_id=None,
            actor_type="ADMIN"
        )

        await self.db.commit()

        logger.info(
            f"Subscription terminated: {subscription.subscription_number}")

        return subscription

    async def start_container(self, subscription_id: str) -> ContainerInstance:
        """Start container for subscription."""
        subscription = await self.subscription_repo.get_by_id(subscription_id)
        if not subscription:
            raise NotFoundException(
                f"Subscription {subscription_id} not found")

        container = await self.container_repo.get_by_subscription_id(subscription_id)
        if not container:
            raise NotFoundException(
                f"Container not found for subscription {subscription_id}")

        success = await self.docker_service.start_container(container.container_id)
        if not success:
            raise BadRequestException("Failed to start container")

        container.status = ContainerStatus.RUNNING
        container.last_started_at = datetime.utcnow()
        container = await self.container_repo.update(container)

        await self.timeline_repo.create_event(
            subscription_id=subscription_id,
            event_type=TimelineEventType.STARTED,
            event_description="Container started",
            actor_id=subscription.customer_id,
            actor_type="CUSTOMER"
        )

        await self.db.commit()
        return container

    async def stop_container(self, subscription_id: str) -> ContainerInstance:
        """Stop container for subscription."""
        subscription = await self.subscription_repo.get_by_id(subscription_id)
        if not subscription:
            raise NotFoundException(
                f"Subscription {subscription_id} not found")

        container = await self.container_repo.get_by_subscription_id(subscription_id)
        if not container:
            raise NotFoundException(
                f"Container not found for subscription {subscription_id}")

        success = await self.docker_service.stop_container(container.container_id)
        if not success:
            raise BadRequestException("Failed to stop container")

        container.status = ContainerStatus.STOPPED
        container.last_stopped_at = datetime.utcnow()
        container = await self.container_repo.update(container)

        await self.timeline_repo.create_event(
            subscription_id=subscription_id,
            event_type=TimelineEventType.STOPPED,
            event_description="Container stopped",
            actor_id=subscription.customer_id,
            actor_type="CUSTOMER"
        )

        await self.db.commit()
        return container

    async def reboot_container(self, subscription_id: str) -> ContainerInstance:
        """Reboot container for subscription."""
        subscription = await self.subscription_repo.get_by_id(subscription_id)
        if not subscription:
            raise NotFoundException(
                f"Subscription {subscription_id} not found")

        container = await self.container_repo.get_by_subscription_id(subscription_id)
        if not container:
            raise NotFoundException(
                f"Container not found for subscription {subscription_id}")

        success = await self.docker_service.reboot_container(container.container_id)
        if not success:
            raise BadRequestException("Failed to reboot container")

        container.status = ContainerStatus.RUNNING
        container.last_started_at = datetime.utcnow()
        container = await self.container_repo.update(container)

        await self.timeline_repo.create_event(
            subscription_id=subscription_id,
            event_type=TimelineEventType.REBOOTED,
            event_description="Container rebooted",
            actor_id=subscription.customer_id,
            actor_type="CUSTOMER"
        )

        await self.db.commit()
        return container

    async def _send_welcome_email(
        self,
        customer_email: str,
        subscription_number: str,
        ip_address: str,
        ssh_port: int,
        container_name: str
    ) -> None:
        """Send welcome email with VPS credentials."""
        from app.infrastructure.email import templates

        template = templates.vps_welcome_template(
            subscription_number=subscription_number,
            ip_address=ip_address,
            ssh_port=ssh_port,
            container_name=container_name
        )
        await self.email_service.send_email(
            to=[customer_email],
            subject=template["subject"],
            html_body=template["html"],
            text_body=template.get("text")
        )

    async def _notify_provisioning_failure(self, subscription: VPSSubscription, error: str) -> None:
        """Notify admins of provisioning failure."""
        # In production, send email to admins
        logger.error(
            f"Provisioning failure notification for {subscription.subscription_number}: {error}")
