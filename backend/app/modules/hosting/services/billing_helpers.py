"""
VPS Hosting - Billing Calculation Helpers

Handles pro-rated billing with proper edge case management.
"""

from datetime import date, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Tuple
import calendar

from app.modules.hosting.models import VPSSubscription, VPSPlan


class BillingCalculator:
    """
    Handles all billing calculations with edge case handling.

    Edge cases handled:
    1. Upgrade on last day of billing cycle
    2. Months with different days (28, 29, 30, 31)
    3. Downgrades (prevented or negative credits)
    4. Multiple upgrades in same cycle
    5. Leap years
    6. First/last day of month
    """

    # Minimum charge to avoid 0.00 DZD invoices
    MIN_CHARGE = Decimal("0.01")

    # Maximum refund/credit allowed
    MAX_CREDIT_PERCENT = Decimal("100.00")  # 100% of monthly price

    @staticmethod
    def calculate_prorated_amount(
        subscription: VPSSubscription,
        new_plan: VPSPlan,
        upgrade_date: date = None
    ) -> Tuple[Decimal, dict]:
        """
        Calculate pro-rated amount for plan change with comprehensive edge case handling.

        Args:
            subscription: Current VPS subscription
            new_plan: Target plan to upgrade/downgrade to
            upgrade_date: Date of upgrade (default: today)

        Returns:
            Tuple of (prorated_amount, calculation_details)
            - prorated_amount: Decimal amount to charge (positive) or credit (negative)
            - calculation_details: Dict with breakdown of calculation
        """
        old_plan = subscription.plan
        upgrade_date = upgrade_date or date.today()

        # Get billing cycle dates
        cycle_start = subscription.start_date or subscription.created_at.date()
        cycle_end = subscription.next_billing_date

        # Validate dates
        if not cycle_end:
            raise ValueError("Subscription has no next_billing_date")

        if upgrade_date > cycle_end:
            raise ValueError(f"Upgrade date {upgrade_date} is after billing cycle end {cycle_end}")

        if upgrade_date < cycle_start:
            raise ValueError(f"Upgrade date {upgrade_date} is before billing cycle start {cycle_start}")

        # Calculate actual days in THIS billing cycle
        total_cycle_days = (cycle_end - cycle_start).days
        days_remaining = (cycle_end - upgrade_date).days
        days_used = (upgrade_date - cycle_start).days

        # Edge Case 1: Upgrade on last day (days_remaining = 0)
        if days_remaining == 0:
            # Charge full difference for next cycle
            prorated_amount = new_plan.monthly_price - old_plan.monthly_price

            return prorated_amount, {
                "scenario": "last_day_upgrade",
                "message": "Upgrade on last day - charging full price difference for next cycle",
                "old_plan_price": float(old_plan.monthly_price),
                "new_plan_price": float(new_plan.monthly_price),
                "total_cycle_days": total_cycle_days,
                "days_remaining": days_remaining,
                "days_used": days_used
            }

        # Edge Case 2: First day of cycle (days_used = 0)
        if days_used == 0:
            # Full month at new price
            prorated_amount = new_plan.monthly_price - old_plan.monthly_price

            return prorated_amount, {
                "scenario": "first_day_upgrade",
                "message": "Upgrade on first day - charging full month at new price",
                "old_plan_price": float(old_plan.monthly_price),
                "new_plan_price": float(new_plan.monthly_price),
                "total_cycle_days": total_cycle_days,
                "days_remaining": days_remaining,
                "days_used": days_used
            }

        # Standard pro-rated calculation using Decimal for precision
        old_price = Decimal(str(old_plan.monthly_price))
        new_price = Decimal(str(new_plan.monthly_price))

        # Calculate daily rates
        old_daily_rate = old_price / Decimal(total_cycle_days)
        new_daily_rate = new_price / Decimal(total_cycle_days)

        # Pro-rated amount = (new_daily_rate - old_daily_rate) * days_remaining
        rate_difference = new_daily_rate - old_daily_rate
        prorated_amount = rate_difference * Decimal(days_remaining)

        # Edge Case 3: Handle downgrades (negative prorated_amount)
        if prorated_amount < 0:
            # Downgrade - issue credit
            credit_amount = abs(prorated_amount)

            # Limit credit to prevent abuse
            max_credit = old_price * (BillingCalculator.MAX_CREDIT_PERCENT / Decimal("100"))
            if credit_amount > max_credit:
                credit_amount = max_credit

            prorated_amount = -credit_amount

            return prorated_amount, {
                "scenario": "downgrade",
                "message": "Downgrade detected - issuing credit for remainder of cycle",
                "old_plan_price": float(old_price),
                "new_plan_price": float(new_price),
                "old_daily_rate": float(old_daily_rate),
                "new_daily_rate": float(new_daily_rate),
                "total_cycle_days": total_cycle_days,
                "days_remaining": days_remaining,
                "days_used": days_used,
                "credit_amount": float(credit_amount),
                "max_credit_allowed": float(max_credit)
            }

        # Edge Case 4: Very small amounts (< 0.01 DZD)
        if 0 < prorated_amount < BillingCalculator.MIN_CHARGE:
            prorated_amount = BillingCalculator.MIN_CHARGE

        # Round to 2 decimal places (standard currency precision)
        prorated_amount = prorated_amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        return prorated_amount, {
            "scenario": "standard_prorated",
            "message": "Standard pro-rated calculation",
            "old_plan_price": float(old_price),
            "new_plan_price": float(new_price),
            "old_daily_rate": float(old_daily_rate),
            "new_daily_rate": float(new_daily_rate),
            "rate_difference": float(rate_difference),
            "total_cycle_days": total_cycle_days,
            "days_remaining": days_remaining,
            "days_used": days_used,
            "prorated_amount": float(prorated_amount)
        }

    @staticmethod
    def calculate_next_billing_date(
        current_billing_date: date,
        billing_cycle: str = "MONTHLY"
    ) -> date:
        """
        Calculate next billing date with proper handling of month-end dates.

        Args:
            current_billing_date: Current billing date
            billing_cycle: MONTHLY, QUARTERLY, or ANNUALLY

        Returns:
            Next billing date

        Examples:
            - Jan 31 + 1 month = Feb 28 (or 29 in leap year)
            - Jan 30 + 1 month = Feb 28 (or 29 in leap year)
            - Feb 28 + 1 month = Mar 28
        """
        if billing_cycle == "MONTHLY":
            # Add 1 month
            if current_billing_date.month == 12:
                next_month = 1
                next_year = current_billing_date.year + 1
            else:
                next_month = current_billing_date.month + 1
                next_year = current_billing_date.year

            # Handle day overflow (e.g., Jan 31 -> Feb 28)
            max_day = calendar.monthrange(next_year, next_month)[1]
            next_day = min(current_billing_date.day, max_day)

            return date(next_year, next_month, next_day)

        elif billing_cycle == "QUARTERLY":
            # Add 3 months
            return BillingCalculator.calculate_next_billing_date(
                BillingCalculator.calculate_next_billing_date(
                    BillingCalculator.calculate_next_billing_date(
                        current_billing_date, "MONTHLY"
                    ), "MONTHLY"
                ), "MONTHLY"
            )

        elif billing_cycle == "ANNUALLY":
            # Add 1 year
            next_year = current_billing_date.year + 1

            # Handle Feb 29 in non-leap year
            if current_billing_date.month == 2 and current_billing_date.day == 29:
                if not calendar.isleap(next_year):
                    return date(next_year, 2, 28)

            return date(next_year, current_billing_date.month, current_billing_date.day)

        else:
            raise ValueError(f"Invalid billing cycle: {billing_cycle}")

    @staticmethod
    def validate_upgrade_path(old_plan: VPSPlan, new_plan: VPSPlan, allow_downgrades: bool = False) -> Tuple[bool, str]:
        """
        Validate if upgrade/downgrade is allowed.

        Args:
            old_plan: Current plan
            new_plan: Target plan
            allow_downgrades: Whether to allow downgrades mid-cycle

        Returns:
            Tuple of (is_valid, error_message)
        """
        # Same plan
        if old_plan.id == new_plan.id:
            return False, "Cannot upgrade to the same plan"

        # Check if plan is active
        if not new_plan.is_active:
            return False, "Target plan is not available"

        # Downgrade check
        if new_plan.monthly_price < old_plan.monthly_price:
            if not allow_downgrades:
                return False, "Downgrades are not allowed mid-cycle. Cancel and create new subscription at end of period."

            # Warn about credit
            return True, "Note: Downgrade will issue credit for remainder of cycle"

        # All checks passed
        return True, ""

    @staticmethod
    def calculate_setup_fee_refund(
        subscription: VPSSubscription,
        cancellation_date: date = None,
        grace_period_days: int = 7
    ) -> Decimal:
        """
        Calculate setup fee refund if cancelled within grace period.

        Args:
            subscription: VPS subscription
            cancellation_date: Date of cancellation (default: today)
            grace_period_days: Days within which setup fee can be refunded

        Returns:
            Refund amount (0 if outside grace period)
        """
        if not subscription.start_date:
            return Decimal("0.00")

        cancellation_date = cancellation_date or date.today()
        days_since_start = (cancellation_date - subscription.start_date).days

        # Within grace period?
        if days_since_start <= grace_period_days:
            # Full setup fee refund
            return Decimal(str(subscription.plan.setup_fee))

        return Decimal("0.00")
