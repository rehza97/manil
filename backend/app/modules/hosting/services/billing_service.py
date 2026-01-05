"""
Subscription Billing Service.

Automated recurring billing, invoice generation, and payment processing.
"""
from datetime import datetime, timedelta, date
from decimal import Decimal
from typing import List, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, cast, String

from app.core.exceptions import NotFoundException, BadRequestException
from app.core.logging import logger
from app.modules.hosting.models import (
    VPSSubscription,
    VPSPlan,
    SubscriptionStatus,
    TimelineEventType
)
from app.modules.hosting.repository import VPSSubscriptionRepository, SubscriptionTimelineRepository
from app.modules.invoices.service import InvoiceService
from app.modules.invoices.models import Invoice, InvoiceItem, InvoiceStatus
from app.modules.invoices.schemas import InvoiceCreate, InvoiceItemCreate
from app.infrastructure.email.service import EmailService
from app.infrastructure.email import templates


class SubscriptionBillingService:
    """Service for VPS subscription billing and invoice management."""

    def __init__(self, db: AsyncSession):
        """Initialize billing service."""
        self.db = db
        self.subscription_repo = VPSSubscriptionRepository(db)
        self.timeline_repo = SubscriptionTimelineRepository(db)
        self.invoice_service = InvoiceService(db)
        self.email_service = EmailService()

    async def _get_or_create_customer(self, user_id: str) -> str:
        """
        Get or create customer record for a user.

        Args:
            user_id: User ID

        Returns:
            Customer ID

        Raises:
            NotFoundException: If user not found
        """
        from app.modules.auth.models import User
        from app.modules.customers.repository import CustomerRepository
        from app.modules.customers.schemas import CustomerCreate, CustomerType

        # Get user
        user_query = select(User).where(User.id == user_id)
        user_result = await self.db.execute(user_query)
        user = user_result.scalar_one_or_none()
        if not user:
            raise NotFoundException(f"User {user_id} not found")

        # Get or create customer
        customer_repo = CustomerRepository(self.db)
        customer = await customer_repo.get_by_email(user.email)

        if not customer:
            customer_data = CustomerCreate(
                name=user.full_name,
                email=user.email,
                phone="0000000000",  # Placeholder - user should update in profile
                customer_type=CustomerType.INDIVIDUAL,
            )
            customer = await customer_repo.create(customer_data, created_by=user_id)
            await self.db.flush()

        return customer.id

    async def generate_initial_invoice(self, subscription_id: str) -> Invoice:
        """
        Generate initial invoice (setup fee + first month).

        Args:
            subscription_id: Subscription ID

        Returns:
            Created invoice
        """
        subscription = await self.subscription_repo.get_by_id(subscription_id)
        if not subscription:
            raise NotFoundException(f"Subscription {subscription_id} not found")

        plan = subscription.plan

        # Get or create customer record
        customer_id = await self._get_or_create_customer(subscription.customer_id)

        # Create invoice items
        items = [
            InvoiceItemCreate(
                description=f"VPS Setup Fee - {plan.name}",
                quantity=1,
                unit_price=plan.setup_fee,
                product_id=None
            ),
            InvoiceItemCreate(
                description=f"VPS Monthly Subscription - {plan.name}",
                quantity=1,
                unit_price=plan.monthly_price,
                product_id=None
            )
        ]

        # Calculate totals
        subtotal = plan.setup_fee + plan.monthly_price
        tax_amount = Decimal("0.00")  # VPS subscriptions typically no tax
        total = subtotal

        # Create invoice
        invoice_data = InvoiceCreate(
            customer_id=customer_id,
            quote_id=subscription.quote_id,
            vps_subscription_id=subscription_id,
            title=f"VPS Initial Invoice - {subscription.subscription_number}",
            description=f"Initial invoice for VPS subscription {subscription.subscription_number}",
            items=items,
            tax_rate=Decimal("0.00"),
            discount_amount=Decimal("0.00"),
            issue_date=datetime.utcnow(),
            due_date=datetime.utcnow() + timedelta(days=7),
            notes=f"Initial invoice for VPS subscription {subscription.subscription_number}"
        )

        invoice = await self.invoice_service.create(invoice_data, created_by_id=subscription.customer_id)

        # Update subscription financials
        subscription.total_invoiced += total
        await self.subscription_repo.update(subscription)

        await self.db.commit()

        # Send initial invoice email
        try:
            customer_email = subscription.customer.email if subscription.customer else None
            if customer_email:
                subject = f"VPS Initial Invoice - {invoice.invoice_number}"
                html_body = templates.get_base_template(f"""
                    <h2>VPS Initial Invoice</h2>
                    <p>Dear Customer,</p>
                    <p>Your VPS subscription has been activated and your initial invoice is ready.</p>
                    <div style="background: white; padding: 15px; margin: 20px 0; border-left: 4px solid #2563eb;">
                        <p><strong>Subscription:</strong> {subscription.subscription_number}</p>
                        <p><strong>Invoice Number:</strong> {invoice.invoice_number}</p>
                        <p><strong>Total Amount:</strong> {total:,.2f} DZD</p>
                        <p><strong>Due Date:</strong> {invoice.due_date.strftime('%Y-%m-%d')}</p>
                    </div>
                    <p>This invoice includes the setup fee and first month's subscription.</p>
                    <a href="https://cloudmanager.dz/invoices/{invoice.id}" class="button">View Invoice</a>
                """)
                await self.email_service.send_email([customer_email], subject, html_body)
        except Exception as e:
            logger.error(f"Failed to send initial invoice email for subscription {subscription.subscription_number}: {e}")

        logger.info(f"Initial invoice generated for subscription {subscription.subscription_number}: {invoice.invoice_number}")

        return invoice

    async def generate_recurring_invoice(self, subscription_id: str) -> Invoice:
        """
        Generate monthly recurring invoice.

        Args:
            subscription_id: Subscription ID

        Returns:
            Created invoice
        """
        subscription = await self.subscription_repo.get_by_id(subscription_id)
        if not subscription:
            raise NotFoundException(f"Subscription {subscription_id} not found")

        if subscription.status != SubscriptionStatus.ACTIVE:
            raise BadRequestException(f"Cannot generate invoice for subscription with status {subscription.status}")

        plan = subscription.plan

        # Get or create customer record
        customer_id = await self._get_or_create_customer(subscription.customer_id)

        # Create invoice items
        items = [
            InvoiceItemCreate(
                description=f"VPS Monthly Subscription - {plan.name}",
                quantity=1,
                unit_price=plan.monthly_price,
                product_id=None
            )
        ]

        # Calculate totals
        subtotal = plan.monthly_price
        tax_amount = Decimal("0.00")
        total = subtotal

        # Create invoice
        invoice_data = InvoiceCreate(
            customer_id=customer_id,
            quote_id=None,
            vps_subscription_id=subscription_id,
            title=f"VPS Monthly Invoice - {subscription.subscription_number}",
            description=f"Monthly recurring invoice for VPS subscription {subscription.subscription_number}",
            items=items,
            tax_rate=Decimal("0.00"),
            discount_amount=Decimal("0.00"),
            issue_date=datetime.utcnow(),
            due_date=datetime.utcnow() + timedelta(days=subscription.grace_period_days),
            notes=f"Monthly recurring invoice for VPS subscription {subscription.subscription_number}"
        )

        invoice = await self.invoice_service.create(invoice_data, created_by_id=subscription.customer_id)

        # Update subscription billing dates
        subscription.last_billed_date = date.today()
        subscription.next_billing_date = date.today() + timedelta(days=30)
        subscription.total_invoiced += total
        await self.subscription_repo.update(subscription)

        # Create timeline event
        await self.timeline_repo.create_event(
            subscription_id=subscription.id,
            event_type=TimelineEventType.INVOICE_GENERATED,
            event_description=f"Monthly invoice generated: {invoice.invoice_number}",
            actor_id=None,
            actor_type="SYSTEM",
            metadata={
                "invoice_id": str(invoice.id),
                "amount": float(total)
            }
        )

        await self.db.commit()

        # Send recurring invoice email
        try:
            customer_email = subscription.customer.email if subscription.customer else None
            if customer_email:
                subject = f"VPS Monthly Invoice - {invoice.invoice_number}"
                html_body = templates.get_base_template(f"""
                    <h2>VPS Monthly Invoice</h2>
                    <p>Dear Customer,</p>
                    <p>Your monthly VPS subscription invoice is ready.</p>
                    <div style="background: white; padding: 15px; margin: 20px 0; border-left: 4px solid #2563eb;">
                        <p><strong>Subscription:</strong> {subscription.subscription_number}</p>
                        <p><strong>Plan:</strong> {plan.name}</p>
                        <p><strong>Invoice Number:</strong> {invoice.invoice_number}</p>
                        <p><strong>Amount:</strong> {total:,.2f} DZD</p>
                        <p><strong>Due Date:</strong> {invoice.due_date.strftime('%Y-%m-%d')}</p>
                    </div>
                    <p>Please ensure payment is made by the due date to avoid service interruption.</p>
                    <a href="https://cloudmanager.dz/invoices/{invoice.id}" class="button">View & Pay Invoice</a>
                """)
                await self.email_service.send_email([customer_email], subject, html_body)
        except Exception as e:
            logger.error(f"Failed to send recurring invoice email for subscription {subscription.subscription_number}: {e}")

        logger.info(f"Recurring invoice generated for subscription {subscription.subscription_number}: {invoice.invoice_number}")

        return invoice

    async def generate_prorated_invoice(
        self,
        subscription_id: str,
        prorated_amount: Decimal,
        old_plan: VPSPlan,
        new_plan: VPSPlan
    ) -> Invoice:
        """
        Generate pro-rated invoice for plan upgrade.

        Args:
            subscription_id: Subscription ID
            prorated_amount: Pro-rated amount to charge
            old_plan: Previous plan
            new_plan: New plan

        Returns:
            Created invoice
        """
        subscription = await self.subscription_repo.get_by_id(subscription_id)
        if not subscription:
            raise NotFoundException(f"Subscription {subscription_id} not found")

        # Get or create customer record
        customer_id = await self._get_or_create_customer(subscription.customer_id)

        # Create invoice items
        items = [
            InvoiceItemCreate(
                description=f"VPS Plan Upgrade - {old_plan.name} to {new_plan.name} (Pro-rated)",
                quantity=1,
                unit_price=prorated_amount,
                product_id=None
            )
        ]

        # Create invoice
        invoice_data = InvoiceCreate(
            customer_id=customer_id,
            quote_id=None,
            vps_subscription_id=subscription_id,
            title=f"VPS Upgrade Invoice - {subscription.subscription_number}",
            description=f"Pro-rated upgrade invoice for VPS subscription {subscription.subscription_number}",
            items=items,
            tax_rate=Decimal("0.00"),
            discount_amount=Decimal("0.00"),
            issue_date=datetime.utcnow(),
            due_date=datetime.utcnow() + timedelta(days=7),
            notes=f"Pro-rated upgrade from {old_plan.name} to {new_plan.name}"
        )

        invoice = await self.invoice_service.create(invoice_data, created_by_id=subscription.customer_id)

        # Update subscription financials
        subscription.total_invoiced += prorated_amount
        await self.subscription_repo.update(subscription)

        await self.db.commit()

        logger.info(f"Pro-rated invoice generated for subscription {subscription.subscription_number}: {invoice.invoice_number}")

        return invoice

    async def calculate_prorated_amount(self, subscription: VPSSubscription, new_plan: VPSPlan) -> Decimal:
        """
        Calculate pro-rated amount for mid-cycle upgrades.

        Args:
            subscription: Current subscription
            new_plan: New plan to upgrade to

        Returns:
            Pro-rated amount
        """
        old_plan = subscription.plan

        # Calculate days remaining in current billing cycle
        today = date.today()
        if not subscription.next_billing_date:
            # If no next billing date, assume 30 days from start
            subscription.next_billing_date = subscription.start_date + timedelta(days=30) if subscription.start_date else date.today() + timedelta(days=30)

        days_remaining = (subscription.next_billing_date - today).days
        if days_remaining <= 0:
            days_remaining = 0

        days_in_cycle = 30  # Assuming monthly billing

        # Calculate daily rates
        old_daily_rate = old_plan.monthly_price / Decimal(str(days_in_cycle))
        new_daily_rate = new_plan.monthly_price / Decimal(str(days_in_cycle))

        # Pro-rated amount = (new rate - old rate) * days remaining
        prorated_amount = (new_daily_rate - old_daily_rate) * Decimal(str(days_remaining))

        return round(prorated_amount, 2)

    async def process_payment_webhook(self, invoice_id: str) -> None:
        """
        Process payment webhook (called when payment received).

        Args:
            invoice_id: Invoice ID that was paid
        """
        invoice = await self.invoice_service.get_by_id(invoice_id)

        # Check if invoice is linked to VPS subscription
        if not invoice.vps_subscription_id:
            return

        subscription_id = invoice.vps_subscription_id

        subscription = await self.subscription_repo.get_by_id(subscription_id)
        if not subscription:
            logger.warning(f"Subscription {subscription_id} not found for invoice {invoice_id}")
            return

        # Update total paid
        subscription.total_paid += invoice.total_amount
        await self.subscription_repo.update(subscription)

        # If subscription was suspended due to non-payment, reactivate
        if subscription.status == SubscriptionStatus.SUSPENDED and \
           subscription.status_reason and "payment" in subscription.status_reason.lower():

            # Import here to avoid circular dependency
            from app.modules.hosting.services.provisioning_service import VPSProvisioningService
            provisioning_service = VPSProvisioningService(self.db)
            await provisioning_service.reactivate_subscription(subscription_id)

        # Create timeline event
        await self.timeline_repo.create_event(
            subscription_id=subscription.id,
            event_type=TimelineEventType.PAYMENT_RECEIVED,
            event_description=f"Payment received for invoice {invoice.invoice_number}",
            actor_id=None,
            actor_type="SYSTEM",
            metadata={
                "invoice_id": str(invoice.id),
                "amount": float(invoice.total_amount),
                "payment_method": invoice.payment_method.value if invoice.payment_method else None
            }
        )

        await self.db.commit()

        # Send payment confirmation email
        try:
            customer_email = subscription.customer.email if subscription.customer else None
            if customer_email:
                subject = f"Payment Received - Invoice {invoice.invoice_number}"
                html_body = templates.get_base_template(f"""
                    <h2>Payment Confirmation</h2>
                    <p>Dear Customer,</p>
                    <p>We have successfully received your payment.</p>
                    <div style="background: white; padding: 15px; margin: 20px 0; border-left: 4px solid #10b981;">
                        <p><strong>Subscription:</strong> {subscription.subscription_number}</p>
                        <p><strong>Invoice Number:</strong> {invoice.invoice_number}</p>
                        <p><strong>Amount Paid:</strong> {invoice.total_amount:,.2f} DZD</p>
                        <p><strong>Payment Date:</strong> {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}</p>
                    </div>
                    <p>Thank you for your payment. Your VPS subscription remains active.</p>
                    <a href="https://cloudmanager.dz/invoices/{invoice.id}" class="button">View Invoice</a>
                """)
                await self.email_service.send_email([customer_email], subject, html_body)
        except Exception as e:
            logger.error(f"Failed to send payment confirmation email for subscription {subscription.subscription_number}: {e}")

        logger.info(f"Payment processed for subscription {subscription.subscription_number}: invoice {invoice.invoice_number}")

    async def check_overdue_invoices(self) -> List[VPSSubscription]:
        """
        Scheduled task: Check for overdue invoices and suspend subscriptions.

        Returns:
            List of suspended subscriptions
        """
        today = date.today()

        # Find all active subscriptions with overdue invoices
        overdue_subscriptions = await self.subscription_repo.get_overdue_subscriptions()

        suspended_subscriptions = []

        for subscription in overdue_subscriptions:
            # Check if invoice is actually overdue (past grace period)
            if subscription.next_billing_date:
                days_overdue = (today - subscription.next_billing_date).days
                if days_overdue > subscription.grace_period_days:
                    # Send overdue warning email before suspension
                    try:
                        customer_email = subscription.customer.email if subscription.customer else None
                        if customer_email:
                            subject = f"URGENT: Payment Overdue - VPS Subscription {subscription.subscription_number}"
                            html_body = templates.get_base_template(f"""
                                <h2 style="color: #dc2626;">Payment Overdue - Immediate Action Required</h2>
                                <p>Dear Customer,</p>
                                <p>Your VPS subscription payment is overdue. Your service will be suspended if payment is not received immediately.</p>
                                <div style="background: #fef2f2; padding: 15px; margin: 20px 0; border-left: 4px solid #dc2626;">
                                    <p><strong>Subscription:</strong> {subscription.subscription_number}</p>
                                    <p><strong>Days Overdue:</strong> {days_overdue}</p>
                                    <p><strong>Grace Period:</strong> {subscription.grace_period_days} days</p>
                                    <p><strong>Status:</strong> Service will be suspended if payment is not received</p>
                                </div>
                                <p>Please make payment immediately to avoid service interruption. All data will be retained during suspension.</p>
                                <a href="https://cloudmanager.dz/subscriptions/{subscription.id}" class="button" style="background: #dc2626;">Make Payment Now</a>
                            """)
                            await self.email_service.send_email([customer_email], subject, html_body)
                    except Exception as e:
                        logger.error(f"Failed to send overdue warning email for subscription {subscription.subscription_number}: {e}")

                    # Suspend subscription (import here to avoid circular dependency)
                    from app.modules.hosting.services.provisioning_service import VPSProvisioningService
                    provisioning_service = VPSProvisioningService(self.db)
                    await provisioning_service.suspend_subscription(
                        subscription.id,
                        reason=f"Payment overdue (grace period: {subscription.grace_period_days} days)"
                    )
                    suspended_subscriptions.append(subscription)

        logger.info(f"Checked overdue invoices: {len(suspended_subscriptions)} subscriptions suspended")

        return suspended_subscriptions

    async def process_recurring_billing(self) -> int:
        """
        Scheduled task: Process recurring billing for all active subscriptions.

        Returns:
            Number of invoices generated
        """
        today = date.today()

        # Find all active subscriptions due for billing
        query = select(VPSSubscription).where(
            and_(
                # Compare as string to avoid enum type-name mismatches in PostgreSQL
                cast(VPSSubscription.status, String) == SubscriptionStatus.ACTIVE.value,
                VPSSubscription.auto_renew == True,
                VPSSubscription.next_billing_date <= today
            )
        )

        result = await self.db.execute(query)
        subscriptions = result.scalars().all()

        invoice_count = 0

        for subscription in subscriptions:
            try:
                await self.generate_recurring_invoice(subscription.id)
                invoice_count += 1
            except Exception as e:
                logger.error(f"Failed to generate recurring invoice for subscription {subscription.id}: {e}")

        logger.info(f"Processed recurring billing: {invoice_count} invoices generated")

        return invoice_count

    async def schedule_next_billing(self, subscription: VPSSubscription) -> date:
        """
        Calculate next billing date based on billing cycle.

        Args:
            subscription: VPS subscription

        Returns:
            Next billing date
        """
        from app.modules.hosting.models import BillingCycle

        today = date.today()

        # If subscription hasn't started yet, use start_date
        if subscription.start_date:
            base_date = subscription.start_date
        else:
            base_date = today

        # Calculate next billing date based on cycle
        if subscription.billing_cycle == BillingCycle.MONTHLY:
            # Add 1 month
            if base_date.month == 12:
                next_date = base_date.replace(year=base_date.year + 1, month=1, day=min(base_date.day, 28))
            else:
                # Handle month overflow (e.g., Jan 31 + 1 month = Feb 28)
                try:
                    next_date = base_date.replace(month=base_date.month + 1)
                except ValueError:
                    # Day doesn't exist in next month (e.g., Jan 31 -> Feb 31)
                    # Use last day of next month
                    from calendar import monthrange
                    next_month = base_date.month + 1
                    next_year = base_date.year
                    if next_month > 12:
                        next_month = 1
                        next_year += 1
                    last_day = monthrange(next_year, next_month)[1]
                    next_date = base_date.replace(year=next_year, month=next_month, day=min(base_date.day, last_day))
        elif subscription.billing_cycle == BillingCycle.QUARTERLY:
            # Add 3 months
            months_to_add = 3
            new_month = base_date.month + months_to_add
            new_year = base_date.year
            while new_month > 12:
                new_month -= 12
                new_year += 1
            # Handle day overflow
            try:
                next_date = base_date.replace(year=new_year, month=new_month)
            except ValueError:
                from calendar import monthrange
                last_day = monthrange(new_year, new_month)[1]
                next_date = base_date.replace(year=new_year, month=new_month, day=min(base_date.day, last_day))
        elif subscription.billing_cycle == BillingCycle.ANNUALLY:
            # Add 1 year
            try:
                next_date = base_date.replace(year=base_date.year + 1)
            except ValueError:
                # Leap year edge case (Feb 29 -> Feb 28 in non-leap year)
                from calendar import monthrange
                last_day = monthrange(base_date.year + 1, base_date.month)[1]
                next_date = base_date.replace(year=base_date.year + 1, day=min(base_date.day, last_day))
        else:
            # Default to monthly
            if base_date.month == 12:
                next_date = base_date.replace(year=base_date.year + 1, month=1, day=min(base_date.day, 28))
            else:
                try:
                    next_date = base_date.replace(month=base_date.month + 1)
                except ValueError:
                    from calendar import monthrange
                    next_month = base_date.month + 1
                    next_year = base_date.year
                    last_day = monthrange(next_year, next_month)[1]
                    next_date = base_date.replace(year=next_year, month=next_month, day=min(base_date.day, last_day))

        return next_date

