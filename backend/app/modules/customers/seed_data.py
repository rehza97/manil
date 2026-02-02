"""
Production-like customer seed data for reports.

Seeds 20 customers (15 individual, 5 corporate) with Algerian names/cities.
Each production-seed customer gets a matching client User account (same email)
so they can log in; linking is by email. Seed client accounts use password
Client123!; change after first login.
Idempotent: skips if 20+ production.seed customers exist.
"""

import logging
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash
from app.modules.auth.models import User
from app.modules.customers.models import Customer
from app.modules.customers.schemas import CustomerStatus, CustomerType, ApprovalStatus
from app.modules.settings.utils import get_role_id_by_slug
from app.core.seed_utils import random_algerian_phone, random_dz_email, date_months_ago

logger = logging.getLogger(__name__)

PRODUCTION_SEED_EMAIL_DOMAIN = "%@production.seed%"
CUSTOMER_COUNT_TARGET = 20
# Default password for all seed client accounts (change after first login)
SEED_CLIENT_PASSWORD = "Client123!"

# 20 names: 15 individual-style, 5 can be company contacts
NAMES = [
    "Ahmed Benali", "Fatima Zohra", "Mohamed Khelifi", "Yasmine Mansouri",
    "Karim Bensaid", "Nadia Cherif", "Omar Hadjadj", "Leila Amrani",
    "Rachid Bouzid", "Samira Taleb", "Hakim Djebbar", "Soraya Hamdi",
    "Nabil Meziane", "Amel Kaci", "Farid Ouahabi", "Djamila Rahmouni",
    "Sofiane Belkacem", "Nassima Benali", "Tarek Ghoul", "Salima Ferhat",
]
CITIES = ["Algiers", "Oran", "Constantine", "Annaba", "Blida", "Batna", "Sétif"]


async def _get_seed_user_id(db: AsyncSession) -> str:
    """Return admin or first user ID for created_by."""
    q = select(User.id).where(User.email == "admin@cloudmanager.dz").limit(1)
    r = await db.execute(q)
    uid = r.scalar_one_or_none()
    if uid:
        return str(uid)
    q = select(User.id).limit(1)
    r = await db.execute(q)
    return str(r.scalar_one())

 
async def seed_production_customers(db: AsyncSession) -> list[str]:
    """
    Seed 20 production-like customers. Idempotent.
    Returns list of customer IDs for use by quote/order/invoice/ticket seeds.
    """
    count_q = select(func.count(Customer.id)).where(Customer.email.like(PRODUCTION_SEED_EMAIL_DOMAIN))
    r = await db.execute(count_q)
    if r.scalar() >= CUSTOMER_COUNT_TARGET:
        q = select(Customer).where(Customer.email.like(PRODUCTION_SEED_EMAIL_DOMAIN)).limit(20)
        r2 = await db.execute(q)
        customers = r2.scalars().all()
        user_id = await _get_seed_user_id(db)
        client_role_id = await get_role_id_by_slug(db, "client")
        if client_role_id is None:
            logger.warning("Client role not found; skipping backfill of user accounts for seed customers.")
        else:
            for c in customers:
                existing_user = (await db.execute(select(User.id).where(User.email == c.email))).scalar_one_or_none()
                if not existing_user:
                    seed_user = User(
                        email=c.email,
                        full_name=c.name,
                        password_hash=get_password_hash(SEED_CLIENT_PASSWORD),
                        role_id=client_role_id,
                        is_active=True,
                        is_2fa_enabled=False,
                        created_by=user_id,
                        updated_by=user_id,
                    )
                    db.add(seed_user)
                    await db.flush()
        await db.commit()
        return [str(c.id) for c in customers]
    user_id = await _get_seed_user_id(db)
    client_role_id = await get_role_id_by_slug(db, "client")
    if client_role_id is None:
        logger.warning("Client role not found; skipping creation of user accounts for seed customers.")
    # Distribution: 14 ACTIVE, 4 PENDING, 2 SUSPENDED (20 total); 14 APPROVED, 4 PENDING, 2 REJECTED
    statuses = (
        [CustomerStatus.ACTIVE] * 14 + [CustomerStatus.PENDING] * 4 + [CustomerStatus.SUSPENDED] * 2
    )
    approvals = (
        [ApprovalStatus.APPROVED] * 14 + [ApprovalStatus.PENDING] * 4 + [ApprovalStatus.REJECTED] * 2
    )
    types_ = [CustomerType.INDIVIDUAL] * 15 + [CustomerType.CORPORATE] * 5
    ids_created: list[str] = []
    for i, name in enumerate(NAMES):
        email = random_dz_email(name.replace(" ", ".") + str(i), "production.seed")
        existing = (await db.execute(select(Customer.id).where(Customer.email == email))).scalar_one_or_none()
        if existing:
            ids_created.append(existing)
            continue
        c = Customer(
            name=name,
            email=email,
            phone=random_algerian_phone(),
            customer_type=types_[i],
            status=statuses[i],
            approval_status=approvals[i],
            city=CITIES[i % len(CITIES)],
            state="Algeria",
            country="Algeria",
            created_by=user_id,
            updated_by=user_id,
        )
        if types_[i] == CustomerType.CORPORATE:
            c.company_name = f"Corp {name.split()[0]}"
            c.tax_id = f"NIF-{100000 + i}"
        db.add(c)
        await db.flush()
        ids_created.append(c.id)
        # Create client User account for this customer (link by email) if none exists
        if client_role_id is not None:
            existing_user = (await db.execute(select(User.id).where(User.email == c.email))).scalar_one_or_none()
            if not existing_user:
                seed_user = User(
                    email=c.email,
                    full_name=c.name,
                    password_hash=get_password_hash(SEED_CLIENT_PASSWORD),
                    role_id=client_role_id,
                    is_active=True,
                    is_2fa_enabled=False,
                    created_by=user_id,
                    updated_by=user_id,
                )
                db.add(seed_user)
                await db.flush()
    await db.commit()
    return ids_created
