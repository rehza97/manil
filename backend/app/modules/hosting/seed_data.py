"""
Seed data for VPS Hosting module.

Initial VPS plans and permissions.
"""
from decimal import Decimal


# VPS Hosting Permissions
HOSTING_PERMISSIONS = [
    {
        "name": "Request VPS",
        "slug": "hosting:request",
        "category": "VPS Hosting",
        "resource": "hosting",
        "action": "request",
        "description": "Request new VPS subscription"
    },
    {
        "name": "View VPS",
        "slug": "hosting:view",
        "category": "VPS Hosting",
        "resource": "hosting",
        "action": "view",
        "description": "View VPS subscriptions and details"
    },
    {
        "name": "Manage VPS",
        "slug": "hosting:manage",
        "category": "VPS Hosting",
        "resource": "hosting",
        "action": "manage",
        "description": "Start, stop, reboot VPS containers"
    },
    {
        "name": "Upgrade VPS",
        "slug": "hosting:upgrade",
        "category": "VPS Hosting",
        "resource": "hosting",
        "action": "upgrade",
        "description": "Upgrade VPS plan"
    },
    {
        "name": "Cancel VPS",
        "slug": "hosting:cancel",
        "category": "VPS Hosting",
        "resource": "hosting",
        "action": "cancel",
        "description": "Cancel VPS subscription"
    },
    {
        "name": "Approve VPS",
        "slug": "hosting:approve",
        "category": "VPS Hosting",
        "resource": "hosting",
        "action": "approve",
        "description": "Approve or reject VPS requests (Admin)"
    },
    {
        "name": "Admin VPS",
        "slug": "hosting:admin",
        "category": "VPS Hosting",
        "resource": "hosting",
        "action": "admin",
        "description": "Full VPS administration (suspend, terminate, edit)"
    },
    {
        "name": "Monitor VPS",
        "slug": "hosting:monitor",
        "category": "VPS Hosting",
        "resource": "hosting",
        "action": "monitor",
        "description": "View all VPS metrics and monitoring data"
    },
]


# DNS Management Permissions
DNS_PERMISSIONS = [
    {
        "name": "View DNS",
        "slug": "dns:view",
        "category": "DNS Management",
        "resource": "dns",
        "action": "view",
        "description": "View DNS zones and records"
    },
    {
        "name": "Manage DNS",
        "slug": "dns:manage",
        "category": "DNS Management",
        "resource": "dns",
        "action": "manage",
        "description": "Create, update, delete DNS zones and records"
    },
    {
        "name": "Admin DNS",
        "slug": "dns:admin",
        "category": "DNS Management",
        "resource": "dns",
        "action": "admin",
        "description": "Full DNS administration including system zones and CoreDNS management"
    },
]


# Default VPS Plans
VPS_PLANS = [
    {
        "name": "Starter VPS",
        "slug": "starter",
        "description": "Perfect for small websites and development environments",
        "cpu_cores": 1.0,
        "ram_gb": 2,
        "storage_gb": 25,
        "bandwidth_tb": 1.0,
        "monthly_price": Decimal("10.00"),
        "setup_fee": Decimal("0.00"),
        "features": {
            "ssh": True,
            "ipv4": True,
            "backup": False,
            "snapshots": False,
            "priority_support": False
        },
        "docker_image": "ubuntu:22.04",
        "is_active": True,
        "display_order": 1
    },
    {
        "name": "Professional VPS",
        "slug": "professional",
        "description": "Ideal for production websites and small applications",
        "cpu_cores": 2.0,
        "ram_gb": 4,
        "storage_gb": 50,
        "bandwidth_tb": 2.0,
        "monthly_price": Decimal("20.00"),
        "setup_fee": Decimal("0.00"),
        "features": {
            "ssh": True,
            "ipv4": True,
            "backup": True,
            "snapshots": True,
            "priority_support": False
        },
        "docker_image": "ubuntu:22.04",
        "is_active": True,
        "display_order": 2
    },
    {
        "name": "Business VPS",
        "slug": "business",
        "description": "High-performance VPS for demanding applications",
        "cpu_cores": 4.0,
        "ram_gb": 8,
        "storage_gb": 100,
        "bandwidth_tb": 3.0,
        "monthly_price": Decimal("40.00"),
        "setup_fee": Decimal("0.00"),
        "features": {
            "ssh": True,
            "ipv4": True,
            "backup": True,
            "snapshots": True,
            "priority_support": True,
            "dedicated_ip": True
        },
        "docker_image": "ubuntu:22.04",
        "is_active": True,
        "display_order": 3
    },
]


async def seed_vps_plans(db):
    """Seed VPS plans into the database."""
    from app.modules.hosting.models import VPSPlan
    import uuid

    for plan_data in VPS_PLANS:
        # Check if plan already exists
        from sqlalchemy import select
        query = select(VPSPlan).where(VPSPlan.slug == plan_data["slug"])
        result = await db.execute(query)
        existing_plan = result.scalar_one_or_none()

        if not existing_plan:
            plan = VPSPlan(
                id=str(uuid.uuid4()),
                **plan_data
            )
            db.add(plan)
            print(f"✓ Seeded VPS plan: {plan.name}")
        else:
            print(f"⊘ VPS plan already exists: {plan_data['name']}")

    await db.commit()


async def seed_hosting_permissions(db):
    """Seed VPS hosting permissions into the database."""
    from app.modules.settings.models import Permission
    import uuid

    for perm_data in HOSTING_PERMISSIONS:
        # Check if permission already exists
        from sqlalchemy import select
        query = select(Permission).where(Permission.slug == perm_data["slug"])
        result = await db.execute(query)
        existing_perm = result.scalar_one_or_none()

        if not existing_perm:
            permission = Permission(
                id=str(uuid.uuid4()),
                is_system=True,
                is_active=True,
                **perm_data
            )
            db.add(permission)
            print(f"✓ Seeded hosting permission: {perm_data['name']}")
        else:
            print(f"⊘ Hosting permission already exists: {perm_data['name']}")

    await db.commit()


async def seed_dns_permissions(db):
    """Seed DNS management permissions into the database."""
    from app.modules.settings.models import Permission
    import uuid

    for perm_data in DNS_PERMISSIONS:
        # Check if permission already exists
        from sqlalchemy import select
        query = select(Permission).where(Permission.slug == perm_data["slug"])
        result = await db.execute(query)
        existing_perm = result.scalar_one_or_none()

        if not existing_perm:
            permission = Permission(
                id=str(uuid.uuid4()),
                is_system=True,
                is_active=True,
                **perm_data
            )
            db.add(permission)
            print(f"✓ Seeded DNS permission: {perm_data['name']}")
        else:
            print(f"⊘ DNS permission already exists: {perm_data['name']}")

    await db.commit()


async def seed_all_hosting_data(db):
    """Seed all VPS hosting data (plans and permissions)."""
    print("\n=== Seeding VPS Hosting Data ===\n")

    print("Seeding VPS Plans...")
    await seed_vps_plans(db)

    print("\nSeeding Hosting Permissions...")
    await seed_hosting_permissions(db)

    print("\nSeeding DNS Permissions...")
    await seed_dns_permissions(db)

    print("\n=== VPS Hosting Data Seeding Complete ===\n")
