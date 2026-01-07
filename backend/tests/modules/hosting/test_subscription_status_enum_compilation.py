from sqlalchemy import select, cast, String
from sqlalchemy.dialects import postgresql

from app.modules.hosting.models import VPSSubscription, SubscriptionStatus


def test_subscription_status_direct_compare_uses_subscription_status_enum_name():
    """
    Regression test for Postgres enum name mismatch:
    - DB enum type: subscription_status
    - Accidental bind cast: ::subscriptionstatus
    """
    q = select(VPSSubscription).where(VPSSubscription.status == SubscriptionStatus.PENDING)
    sql = str(q.compile(dialect=postgresql.dialect()))

    assert "subscription_status" in sql
    assert "subscriptionstatus" not in sql


def test_subscription_status_cast_compare_does_not_use_enum_cast():
    """
    The repository compares status by casting the column to text and comparing against the enum value,
    which should avoid enum casts entirely.
    """
    q = select(VPSSubscription).where(
        cast(VPSSubscription.status, String) == SubscriptionStatus.PENDING.value
    )
    sql = str(q.compile(dialect=postgresql.dialect()))

    assert "CAST" in sql.upper()
    assert "subscriptionstatus" not in sql










