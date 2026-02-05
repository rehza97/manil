"""
Script to update notification settings in the database.
Run this to add the new KYC and customer notification events.

Usage:
    python update_notification_settings.py
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import text
from app.config.database import get_db_engine


async def update_notification_settings():
    """Update notification settings in database."""
    engine = get_db_engine()

    async with engine.begin() as conn:
        print("Updating notification settings...")

        # Update notification.kyc_events
        kyc_events_value = {
            "value": {
                "document_uploaded": True,
                "document_approved": True,
                "document_rejected": True,
                "document_expired": True
            },
            "type": "object"
        }

        await conn.execute(
            text("""
                INSERT INTO system_settings (key, value, category, description, is_public)
                VALUES (:key, :value::jsonb, :category, :description, :is_public)
                ON CONFLICT (key) DO UPDATE SET
                    value = EXCLUDED.value,
                    description = EXCLUDED.description,
                    updated_at = NOW()
            """),
            {
                "key": "notification.kyc_events",
                "value": str(kyc_events_value).replace("'", '"').replace("True", "true").replace("False", "false"),
                "category": "notification",
                "description": "Enable/disable notifications for KYC events",
                "is_public": False
            }
        )
        print("✓ Updated notification.kyc_events")

        # Add notification.customer_events
        customer_events_value = {
            "value": {
                "submitted_for_approval": True,
                "approval_approved": True,
                "approval_rejected": True,
                "suspended": True,
                "activated": True,
                "reactivated": True,
                "deactivated": True,
                "status_changed": True
            },
            "type": "object"
        }

        await conn.execute(
            text("""
                INSERT INTO system_settings (key, value, category, description, is_public)
                VALUES (:key, :value::jsonb, :category, :description, :is_public)
                ON CONFLICT (key) DO UPDATE SET
                    value = EXCLUDED.value,
                    description = EXCLUDED.description,
                    updated_at = NOW()
            """),
            {
                "key": "notification.customer_events",
                "value": str(customer_events_value).replace("'", '"').replace("True", "true").replace("False", "false"),
                "category": "notification",
                "description": "Enable/disable notifications for customer account status events",
                "is_public": False
            }
        )
        print("✓ Added notification.customer_events")

        # Add notification.vps_events
        vps_events_value = {
            "value": {
                "requested": True,
                "approved": True,
                "provisioned": True,
                "suspended": True,
                "reactivated": True,
                "cancelled": True,
                "upgraded": True,
                "downgraded": True
            },
            "type": "object"
        }

        await conn.execute(
            text("""
                INSERT INTO system_settings (key, value, category, description, is_public)
                VALUES (:key, :value::jsonb, :category, :description, :is_public)
                ON CONFLICT (key) DO UPDATE SET
                    value = EXCLUDED.value,
                    description = EXCLUDED.description,
                    updated_at = NOW()
            """),
            {
                "key": "notification.vps_events",
                "value": str(vps_events_value).replace("'", '"').replace("True", "true").replace("False", "false"),
                "category": "notification",
                "description": "Enable/disable notifications for VPS subscription lifecycle events",
                "is_public": False
            }
        )
        print("✓ Added notification.vps_events")

        print("\n✅ Notification settings updated successfully!")
        print("\nYou can now test:")
        print("  1. Upload a KYC document")
        print("  2. Reject a customer account")
        print("  3. Request/approve/provision a VPS")
        print("  4. Suspend/reactivate/cancel a VPS")
        print("  5. Check backend logs for [KYC UPLOAD NOTIFICATION], [STATUS CHANGE NOTIFICATION], and [VPS NOTIFICATION]")


if __name__ == "__main__":
    asyncio.run(update_notification_settings())
