"""
Verify production seed data exists for all report modules.

Usage:
    python -m scripts.verify_seed_data
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select, func
from app.config.database import AsyncSessionLocal
from app.modules.customers.models import Customer
from app.modules.quotes.models import Quote
from app.modules.orders.models import Order
from app.modules.invoices.models import Invoice
from app.modules.hosting.models import VPSSubscription, ContainerMetrics
from app.modules.tickets.models import Ticket
from app.modules.audit.models import AuditLog


async def verify_seed_counts():
    """Check counts of seeded production data."""
    async with AsyncSessionLocal() as db:
        checks = {
            "Customers (production.seed)": (Customer, Customer.email.like("%@production.seed%"), 20),
            "Quotes": (Quote, Quote.deleted_at.is_(None), 40),
            "Orders": (Order, Order.deleted_at.is_(None), 50),
            "Invoices": (Invoice, Invoice.deleted_at.is_(None), 50),
            "VPS Subscriptions": (VPSSubscription, VPSSubscription.subscription_number.like("VPS-PROD-%"), 15),
            "Tickets": (Ticket, Ticket.deleted_at.is_(None), 50),
            "Audit Logs (seed)": (AuditLog, AuditLog.description.like("%[seed]%"), 100),
            "Container Metrics": (ContainerMetrics, None, 300),
        }

        results = []
        all_ok = True

        for name, (model, condition, expected) in checks.items():
            try:
                if condition is not None:
                    query = select(func.count(model.id)).where(condition)
                else:
                    query = select(func.count(model.id))

                result = await db.execute(query)
                count = result.scalar()
                status = "[OK]" if count >= expected else "[MISSING]"
                results.append(f"{status} {name}: {count}/{expected}")

                if count < expected:
                    all_ok = False
            except Exception as e:
                results.append(f"[ERROR] {name}: {str(e)}")
                all_ok = False

        print("\n" + "=" * 60)
        print(" Seed Data Verification Report")
        print("=" * 60 + "\n")

        for line in results:
            print(f"  {line}")

        print("\n" + "=" * 60)

        if all_ok:
            print(" Result: All seed data verified successfully!")
        else:
            print(" Result: Some seed data missing or incomplete.")
            print("\n To create seed data, run:")
            print("   python -m scripts.init_system")

        print("=" * 60 + "\n")

        return all_ok


if __name__ == "__main__":
    result = asyncio.run(verify_seed_counts())
    sys.exit(0 if result else 1)
