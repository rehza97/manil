"""
Comprehensive demo/seed data for the entire hosting system.

This module seeds:
- Demo users (various roles)
- Products (add-ons, services)
- VPS subscriptions (demo instances)
- DNS zones and records
- Complete system demonstration
"""
import uuid
from decimal import Decimal
from datetime import datetime, timedelta, date
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.modules.auth.models import User, UserRole
from app.modules.hosting.models import (
    VPSPlan, VPSSubscription, SubscriptionStatus, BillingCycle,
    ContainerStatus, DNSZone, DNSRecord, DNSZoneStatus, DNSRecordType,
    DNSZoneType, DNSZoneTemplate, DNSTemplateType
)
from app.modules.products.models import Product, ProductCategory
from app.modules.customers.models import Customer, CustomerType
from app.core.security import get_password_hash


# ============================================================================
# Demo Users
# ============================================================================

DEMO_USERS = [
    {
        "email": "admin@cloudmanager.dz",
        "password": "Admin123",
        "full_name": "System Administrator",
        "role": UserRole.ADMIN,
        "description": "Main system administrator"
    },
    {
        "email": "demo@cloudmanager.dz",
        "password": "Demo123",
        "full_name": "Demo User",
        "role": UserRole.CLIENT,
        "description": "Regular demo user with VPS subscription"
    },
    {
        "email": "corporate@cloudmanager.dz",
        "password": "Corp123",
        "full_name": "Corporate Demo",
        "role": UserRole.CORPORATE,
        "description": "Corporate customer demo account"
    },
    {
        "email": "client2@cloudmanager.dz",
        "password": "Client123",
        "full_name": "Client Demo 2",
        "role": UserRole.CLIENT,
        "description": "Second client demo account"
    },
]


# ============================================================================
# Demo Products (Add-ons and Services)
# ============================================================================

DEMO_PRODUCTS = [
    # Storage Add-ons
    {
        "name": "Extra Storage - 10GB",
        "slug": "storage-10gb",
        "sku": "STOR-010",
        "category": "storage",
        "description": "Additional 10GB SSD storage for your VPS",
        "price": Decimal("5.00"),
        "is_recurring": True,
        "stock_quantity": None,  # Unlimited
        "is_featured": True,
        "meta_data": {
            "storage_gb": 10,
            "type": "ssd"
        }
    },
    {
        "name": "Extra Storage - 50GB",
        "slug": "storage-50gb",
        "sku": "STOR-050",
        "category": "storage",
        "description": "Additional 50GB SSD storage for your VPS",
        "price": Decimal("20.00"),
        "is_recurring": True,
        "stock_quantity": None,
        "is_featured": True,
        "meta_data": {
            "storage_gb": 50,
            "type": "ssd"
        }
    },
    {
        "name": "Extra Storage - 100GB",
        "slug": "storage-100gb",
        "sku": "STOR-100",
        "category": "storage",
        "description": "Additional 100GB SSD storage for your VPS",
        "price": Decimal("35.00"),
        "is_recurring": True,
        "stock_quantity": None,
        "is_featured": False,
        "meta_data": {
            "storage_gb": 100,
            "type": "ssd"
        }
    },

    # Backup Services
    {
        "name": "Daily Backup Service",
        "slug": "backup-daily",
        "sku": "BACK-DAY",
        "category": "backup",
        "description": "Automated daily backups with 7-day retention",
        "price": Decimal("10.00"),
        "is_recurring": True,
        "stock_quantity": None,
        "is_featured": True,
        "meta_data": {
            "frequency": "daily",
            "retention_days": 7
        }
    },
    {
        "name": "Weekly Backup Service",
        "slug": "backup-weekly",
        "sku": "BACK-WEK",
        "category": "backup",
        "description": "Automated weekly backups with 30-day retention",
        "price": Decimal("5.00"),
        "is_recurring": True,
        "stock_quantity": None,
        "is_featured": False,
        "meta_data": {
            "frequency": "weekly",
            "retention_days": 30
        }
    },

    # IP Addresses
    {
        "name": "Additional IPv4 Address",
        "slug": "ipv4-additional",
        "sku": "IP-V4",
        "category": "networking",
        "description": "Additional dedicated IPv4 address",
        "price": Decimal("3.00"),
        "is_recurring": True,
        "stock_quantity": 50,  # Limited availability
        "is_featured": False,
        "meta_data": {
            "ip_version": "4"
        }
    },

    # Security Services
    {
        "name": "DDoS Protection - Basic",
        "slug": "ddos-basic",
        "sku": "DDOS-BAS",
        "category": "security",
        "description": "Basic DDoS protection up to 10Gbps",
        "price": Decimal("15.00"),
        "is_recurring": True,
        "stock_quantity": None,
        "is_featured": True,
        "meta_data": {
            "protection_gbps": 10,
            "tier": "basic"
        }
    },
    {
        "name": "SSL Certificate - Standard",
        "slug": "ssl-standard",
        "sku": "SSL-STD",
        "category": "security",
        "description": "Standard SSL/TLS certificate for 1 domain",
        "price": Decimal("50.00"),
        "is_recurring": True,
        "stock_quantity": None,
        "is_featured": True,
        "meta_data": {
            "validity_years": 1,
            "domains": 1
        }
    },

    # Professional Services
    {
        "name": "Server Setup & Configuration",
        "slug": "server-setup",
        "sku": "SERV-SETUP",
        "category": "services",
        "description": "Professional server setup and configuration service",
        "price": Decimal("100.00"),
        "is_recurring": False,
        "stock_quantity": None,
        "is_featured": True,
        "meta_data": {
            "delivery_hours": 24,
            "includes": ["os_installation", "security_hardening", "basic_optimization"]
        }
    },
    {
        "name": "Website Migration Service",
        "slug": "website-migration",
        "sku": "SERV-MIGR",
        "category": "services",
        "description": "Professional website migration to your VPS",
        "price": Decimal("75.00"),
        "is_recurring": False,
        "stock_quantity": None,
        "is_featured": True,
        "meta_data": {
            "delivery_hours": 48,
            "max_sites": 1
        }
    },

    # Control Panels
    {
        "name": "cPanel License",
        "slug": "cpanel-license",
        "sku": "LIC-CPANEL",
        "category": "software",
        "description": "cPanel/WHM license for VPS management",
        "price": Decimal("15.00"),
        "is_recurring": True,
        "stock_quantity": None,
        "is_featured": True,
        "meta_data": {
            "software": "cpanel",
            "accounts": 100
        }
    },
]


# ============================================================================
# DNS Templates
# ============================================================================

DNS_TEMPLATES = [
    {
        "name": "Web Server Template",
        "template_type": DNSTemplateType.WEB_SERVER,
        "description": "Standard web server DNS configuration",
        "record_definitions": [
            {
                "record_name": "@",
                "record_type": "A",
                "record_value": "{VPS_IP}",
                "ttl": 3600
            },
            {
                "record_name": "www",
                "record_type": "A",
                "record_value": "{VPS_IP}",
                "ttl": 3600
            },
            {
                "record_name": "@",
                "record_type": "TXT",
                "record_value": "v=spf1 a mx ~all",
                "ttl": 3600
            }
        ]
    },
    {
        "name": "Mail Server Template",
        "template_type": DNSTemplateType.MAIL_SERVER,
        "description": "Mail server DNS configuration",
        "record_definitions": [
            {
                "record_name": "@",
                "record_type": "MX",
                "record_value": "mail.{ZONE_NAME}",
                "ttl": 3600,
                "priority": 10
            },
            {
                "record_name": "mail",
                "record_type": "A",
                "record_value": "{VPS_IP}",
                "ttl": 3600
            },
            {
                "record_name": "@",
                "record_type": "TXT",
                "record_value": "v=spf1 a mx ~all",
                "ttl": 3600
            }
        ]
    }
]


# ============================================================================
# Seeding Functions
# ============================================================================

async def seed_demo_users(db: AsyncSession) -> dict[str, User]:
    """Seed demo users and return them by email."""
    print("\n=== Seeding Demo Users ===\n")
    users = {}

    for user_data in DEMO_USERS:
        # Check if user already exists
        query = select(User).where(User.email == user_data["email"])
        result = await db.execute(query)
        existing_user = result.scalar_one_or_none()

        if not existing_user:
            user = User(
                id=str(uuid.uuid4()),
                email=user_data["email"],
                password_hash=get_password_hash(user_data["password"]),
                full_name=user_data["full_name"],
                role=user_data["role"],
                is_active=True
            )
            db.add(user)
            await db.flush()
            await db.refresh(user)
            users[user_data["email"]] = user
            print(f"✓ Created demo user: {user_data['email']} ({user_data['description']})")
            print(f"  Password: {user_data['password']}")
        else:
            users[user_data["email"]] = existing_user
            print(f"⊘ Demo user already exists: {user_data['email']}")

    await db.commit()
    return users


async def seed_product_categories(db: AsyncSession) -> dict[str, ProductCategory]:
    """Seed product categories."""
    print("\n=== Seeding Product Categories ===\n")

    categories_data = [
        {"name": "Storage", "slug": "storage", "description": "Additional storage options"},
        {"name": "Backup", "slug": "backup", "description": "Backup services"},
        {"name": "Networking", "slug": "networking", "description": "Network services and IPs"},
        {"name": "Security", "slug": "security", "description": "Security services and certificates"},
        {"name": "Professional Services", "slug": "services", "description": "Professional setup and migration services"},
        {"name": "Software Licenses", "slug": "software", "description": "Control panels and software licenses"},
    ]

    categories = {}
    for cat_data in categories_data:
        query = select(ProductCategory).where(ProductCategory.slug == cat_data["slug"])
        result = await db.execute(query)
        existing = result.scalar_one_or_none()

        if not existing:
            category = ProductCategory(
                id=str(uuid.uuid4()),
                **cat_data
            )
            db.add(category)
            await db.flush()
            await db.refresh(category)
            categories[cat_data["slug"]] = category
            print(f"✓ Created category: {cat_data['name']}")
        else:
            categories[cat_data["slug"]] = existing
            print(f"⊘ Category already exists: {cat_data['name']}")

    await db.commit()
    return categories


async def seed_demo_products(db: AsyncSession, categories: dict[str, ProductCategory]) -> list[Product]:
    """Seed demo products."""
    print("\n=== Seeding Demo Products ===\n")
    products = []

    for product_data in DEMO_PRODUCTS:
        query = select(Product).where(Product.slug == product_data["slug"])
        result = await db.execute(query)
        existing = result.scalar_one_or_none()

        if not existing:
            # Get category ID from slug
            category_slug = product_data.pop("category")
            category = categories.get(category_slug)
            if not category:
                print(f"⚠️  Skipping product {product_data['name']}: category '{category_slug}' not found")
                continue

            # Map 'price' to 'regular_price' for Product model
            price = product_data.pop("price")
            # Remove fields that aren't in the Product model
            product_data.pop("is_recurring", None)
            product_data.pop("meta_data", None)

            product = Product(
                id=str(uuid.uuid4()),
                category_id=category.id,
                regular_price=price,
                is_active=True,
                **product_data
            )
            db.add(product)
            await db.flush()
            await db.refresh(product)
            products.append(product)
            print(f"✓ Created product: {product.name} (${price})")
        else:
            products.append(existing)
            print(f"⊘ Product already exists: {product_data['name']}")

    await db.commit()
    return products


async def seed_demo_vps_subscriptions(
    db: AsyncSession,
    users: dict[str, User]
) -> list[VPSSubscription]:
    """Seed demo VPS subscriptions."""
    print("\n=== Seeding Demo VPS Subscriptions ===\n")

    # Get VPS plans
    query = select(VPSPlan).where(VPSPlan.is_active == True)
    result = await db.execute(query)
    plans = result.scalars().all()

    if not plans:
        print("⚠️  No VPS plans found. Skipping subscription seeding.")
        return []

    subscriptions = []
    demo_user = users.get("demo@cloudmanager.dz")
    corporate_user = users.get("corporate@cloudmanager.dz")

    if not demo_user:
        print("⚠️  Demo user not found. Skipping subscription seeding.")
        return []

    # Create subscription for demo user
    subscription_data = {
        "customer_id": demo_user.id,
        "plan_id": plans[0].id,  # Starter plan
        "subscription_number": f"VPS-{datetime.now().strftime('%Y%m%d')}-00001",
        "status": SubscriptionStatus.ACTIVE,
        "billing_cycle": BillingCycle.MONTHLY,
        "start_date": date.today(),
        "next_billing_date": date.today() + timedelta(days=30),
        "auto_renew": True,
        "is_trial": False
    }

    query = select(VPSSubscription).where(
        VPSSubscription.subscription_number == subscription_data["subscription_number"]
    )
    result = await db.execute(query)
    existing = result.scalar_one_or_none()

    if not existing:
        subscription = VPSSubscription(
            id=str(uuid.uuid4()),
            **subscription_data
        )
        db.add(subscription)
        await db.flush()
        await db.refresh(subscription)
        subscriptions.append(subscription)
        print(f"✓ Created demo VPS subscription: {subscription.subscription_number}")
        print(f"  Customer: {demo_user.email}")
        print(f"  Plan: {plans[0].name}")
    else:
        subscriptions.append(existing)
        print(f"⊘ Demo subscription already exists")

    await db.commit()
    return subscriptions


async def seed_demo_dns_zones(
    db: AsyncSession,
    subscriptions: list[VPSSubscription]
) -> list[DNSZone]:
    """Seed demo DNS zones."""
    print("\n=== Seeding Demo DNS Zones ===\n")

    if not subscriptions:
        print("⚠️  No subscriptions found. Skipping DNS zone seeding.")
        return []

    zones = []
    zone_data = {
        "subscription_id": subscriptions[0].id,
        "zone_name": "demo.example.com",
        "zone_type": DNSZoneType.FORWARD,
        "status": DNSZoneStatus.ACTIVE,
        "ttl_default": 3600,
        "notes": "Demo DNS zone for testing"
    }

    query = select(DNSZone).where(DNSZone.zone_name == zone_data["zone_name"])
    result = await db.execute(query)
    existing = result.scalar_one_or_none()

    if not existing:
        zone = DNSZone(
            id=str(uuid.uuid4()),
            **zone_data
        )
        db.add(zone)
        await db.flush()
        await db.refresh(zone)

        # Add demo DNS records
        demo_records = [
            {
                "zone_id": zone.id,
                "record_name": "@",
                "record_type": DNSRecordType.A,
                "record_value": "192.168.1.100",
                "ttl": 3600
            },
            {
                "zone_id": zone.id,
                "record_name": "www",
                "record_type": DNSRecordType.A,
                "record_value": "192.168.1.100",
                "ttl": 3600
            },
            {
                "zone_id": zone.id,
                "record_name": "@",
                "record_type": DNSRecordType.TXT,
                "record_value": "v=spf1 a mx ~all",
                "ttl": 3600
            }
        ]

        for record_data in demo_records:
            record = DNSRecord(
                id=str(uuid.uuid4()),
                **record_data
            )
            db.add(record)

        zones.append(zone)
        print(f"✓ Created demo DNS zone: {zone.zone_name}")
        print(f"  Records: {len(demo_records)}")
    else:
        zones.append(existing)
        print(f"⊘ Demo DNS zone already exists")

    await db.commit()
    return zones


async def seed_dns_templates(db: AsyncSession) -> list[DNSZoneTemplate]:
    """Seed DNS zone templates."""
    print("\n=== Seeding DNS Templates ===\n")

    templates = []
    for template_data in DNS_TEMPLATES:
        query = select(DNSZoneTemplate).where(
            DNSZoneTemplate.name == template_data["name"]
        )
        result = await db.execute(query)
        existing = result.scalar_one_or_none()

        if not existing:
            template = DNSZoneTemplate(
                id=str(uuid.uuid4()),
                is_active=True,
                **template_data
            )
            db.add(template)
            await db.flush()
            await db.refresh(template)
            templates.append(template)
            print(f"✓ Created DNS template: {template_data['name']}")
        else:
            templates.append(existing)
            print(f"⊘ DNS template already exists: {template_data['name']}")

    await db.commit()
    return templates


async def seed_all_demo_data(db: AsyncSession):
    """Seed all demo data in correct order."""
    print("\n" + "="*60)
    print("  SEEDING COMPREHENSIVE DEMO DATA")
    print("="*60)

    try:
        # 1. Seed demo users
        users = await seed_demo_users(db)

        # 2. Seed product categories
        categories = await seed_product_categories(db)

        # 3. Seed products
        products = await seed_demo_products(db, categories)

        # 4. Seed VPS subscriptions
        subscriptions = await seed_demo_vps_subscriptions(db, users)

        # 5. Seed DNS zones
        zones = await seed_demo_dns_zones(db, subscriptions)

        # 6. Seed DNS templates
        templates = await seed_dns_templates(db)

        print("\n" + "="*60)
        print("  DEMO DATA SEEDING COMPLETE")
        print("="*60)
        print("\n📊 Summary:")
        print(f"  Users: {len(users)}")
        print(f"  Product Categories: {len(categories)}")
        print(f"  Products: {len(products)}")
        print(f"  VPS Subscriptions: {len(subscriptions)}")
        print(f"  DNS Zones: {len(zones)}")
        print(f"  DNS Templates: {len(templates)}")

        print("\n🔐 Demo Credentials:")
        for user_data in DEMO_USERS:
            print(f"  {user_data['email']} / {user_data['password']} ({user_data['role'].value})")

        print("\n✅ System is ready for use!\n")

    except Exception as e:
        print(f"\n❌ Error seeding demo data: {e}")
        await db.rollback()
        raise
