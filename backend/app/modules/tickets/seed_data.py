"""
Seed data for Ticket Management System.

Creates default support groups, tags, and automation rules.
"""
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.modules.tickets.models import (
    SupportGroup, AutomationRule, Tag, TicketCategory, ResponseTemplate,
    TicketPriority, TicketStatus
)


# ============================================================================
# Support Groups
# ============================================================================

SUPPORT_GROUPS = [
    {
        "name": "General Support",
        "description": "Handle general customer inquiries and basic technical support",
        "is_active": True
    },
    {
        "name": "Technical Support",
        "description": "Advanced technical issues and VPS management",
        "is_active": True
    },
    {
        "name": "Billing Support",
        "description": "Billing inquiries, payments, and invoice issues",
        "is_active": True
    },
    {
        "name": "DNS Support",
        "description": "DNS configuration and zone management",
        "is_active": True
    },
]


# ============================================================================
# Tags
# ============================================================================

TAGS = [
    {
        "name": "vps",
        "color": "#3B82F6",
        "description": "VPS related issues"
    },
    {
        "name": "dns",
        "color": "#10B981",
        "description": "DNS configuration and zones"
    },
    {
        "name": "billing",
        "color": "#F59E0B",
        "description": "Billing and payment issues"
    },
    {
        "name": "urgent",
        "color": "#EF4444",
        "description": "Urgent issues requiring immediate attention"
    },
    {
        "name": "bug",
        "color": "#DC2626",
        "description": "Software bugs"
    },
    {
        "name": "feature-request",
        "color": "#8B5CF6",
        "description": "Feature requests"
    },
    {
        "name": "migration",
        "color": "#06B6D4",
        "description": "Migration related"
    },
    {
        "name": "security",
        "color": "#EF4444",
        "description": "Security issues"
    },
]


# ============================================================================
# Ticket Categories
# ============================================================================

TICKET_CATEGORIES = [
    {
        "name": "VPS Issues",
        "slug": "vps-issues",
        "description": "VPS server problems, performance issues, and configuration",
        "color": "#3B82F6",
        "icon": "server",
        "display_order": 1,
        "default_priority": "high"
    },
    {
        "name": "DNS Issues",
        "slug": "dns-issues",
        "description": "DNS zone management, record issues, and propagation",
        "color": "#10B981",
        "icon": "globe",
        "display_order": 2,
        "default_priority": "medium"
    },
    {
        "name": "Billing Question",
        "slug": "billing-question",
        "description": "Billing inquiries, invoices, and payment issues",
        "color": "#F59E0B",
        "icon": "credit-card",
        "display_order": 3,
        "default_priority": "medium"
    },
    {
        "name": "Technical Support",
        "slug": "technical-support",
        "description": "General technical assistance and how-to questions",
        "color": "#8B5CF6",
        "icon": "wrench",
        "display_order": 4,
        "default_priority": "medium"
    },
    {
        "name": "Feature Request",
        "slug": "feature-request",
        "description": "Suggestions for new features or improvements",
        "color": "#06B6D4",
        "icon": "lightbulb",
        "display_order": 5,
        "default_priority": "low"
    },
    {
        "name": "Bug Report",
        "slug": "bug-report",
        "description": "Report software bugs or system errors",
        "color": "#DC2626",
        "icon": "bug",
        "display_order": 6,
        "default_priority": "high"
    },
    {
        "name": "Security Issue",
        "slug": "security-issue",
        "description": "Security concerns, vulnerabilities, or incidents",
        "color": "#EF4444",
        "icon": "shield",
        "display_order": 7,
        "default_priority": "urgent"
    },
]


# ============================================================================
# Response Templates
# ============================================================================

RESPONSE_TEMPLATES = [
    {
        "title": "Welcome & First Response",
        "description": "We've received your ticket #{ticket_id}",
        "is_default": False,
        "content": """Hello {{customer_name}},

Thank you for contacting us. We've received your ticket and our support team will review it shortly.

**Ticket Details:**
- Ticket ID: #{{ticket_id}}
- Subject: {{ticket_subject}}
- Priority: {{ticket_priority}}

We aim to respond to all tickets within {{sla_response_time}}. You'll receive an email notification when we reply.

Best regards,
{{agent_name}}
{{company_name}} Support Team""",
        "category": "General",
        "is_public": True
    },
    {
        "title": "VPS Reboot Confirmation",
        "description": "VPS Server Rebooted - #{ticket_id}",
        "is_default": False,
        "content": """Hello {{customer_name}},

We've successfully rebooted your VPS server as requested.

**Server Details:**
- Server: {{vps_hostname}}
- IP Address: {{vps_ip}}
- Reboot completed at: {{current_time}}

Your server should be fully operational now. Please allow 2-3 minutes for all services to start.

If you continue to experience issues, please let us know.

Best regards,
{{agent_name}}""",
        "category": "VPS",
        "is_public": True
    },
    {
        "title": "DNS Propagation Info",
        "description": "DNS Propagation Information",
        "is_default": False,
        "content": """Hello {{customer_name}},

Your DNS changes have been applied successfully on our nameservers.

**Important:** DNS changes can take 24-48 hours to fully propagate worldwide due to DNS caching.

You can check propagation status using these tools:
- https://dnschecker.org
- https://www.whatsmydns.net

If your changes aren't visible after 48 hours, please reply to this ticket.

Best regards,
{{agent_name}}""",
        "category": "DNS",
        "is_public": True
    },
    {
        "title": "Billing - Invoice Sent",
        "description": "Invoice #{invoice_id} for {{customer_name}}",
        "is_default": False,
        "content": """Hello {{customer_name}},

Your invoice is ready for review and payment.

**Invoice Details:**
- Invoice #: {{invoice_id}}
- Amount Due: {{invoice_amount}}
- Due Date: {{invoice_due_date}}

You can view and pay your invoice here: {{invoice_url}}

If you have any questions about this invoice, please reply to this ticket.

Best regards,
{{agent_name}}
Billing Department""",
        "category": "Billing",
        "is_public": True
    },
    {
        "title": "Ticket Resolved",
        "description": "Ticket #{ticket_id} Resolved",
        "is_default": False,
        "content": """Hello {{customer_name}},

We're marking this ticket as resolved. We hope we've fully addressed your issue.

If you need any further assistance or if the issue persists, please reply to this ticket and we'll reopen it immediately.

Otherwise, this ticket will be automatically closed in 48 hours.

Thank you for choosing {{company_name}}!

Best regards,
{{agent_name}}""",
        "category": "General",
        "is_public": True
    },
    {
        "title": "Escalation to Senior Team",
        "description": None,
        "is_default": False,
        "content": """**INTERNAL NOTE**

Escalating this ticket to senior technical team.

Reason: {{escalation_reason}}

Customer has been waiting for {{wait_time}}.

Priority: {{ticket_priority}}

Please review and provide solution ASAP.

- {{agent_name}}""",
        "category": "Internal",
        "is_public": False
    },
]


# ============================================================================
# Automation Rules
# ============================================================================

AUTOMATION_RULES = [
    {
        "name": "Auto-assign VPS tickets to Technical Support",
        "description": "Automatically assign tickets with 'VPS' category to Technical Support group",
        "is_active": True,
        "trigger_type": "ticket_created",
        "conditions": {
            "category_name": "VPS Issues"
        },
        "actions": {
            "assign_group": "Technical Support",
            "set_priority": "HIGH"
        },
        "priority": 1
    },
    {
        "name": "Auto-assign DNS tickets to DNS Support",
        "description": "Route DNS-related tickets to specialized DNS team",
        "is_active": True,
        "trigger_type": "ticket_created",
        "conditions": {
            "category_name": "DNS Issues"
        },
        "actions": {
            "assign_group": "DNS Support"
        },
        "priority": 2
    },
    {
        "name": "Auto-assign Billing tickets",
        "description": "Route billing questions to Billing Support team",
        "is_active": True,
        "trigger_type": "ticket_created",
        "conditions": {
            "category_name": "Billing Question"
        },
        "actions": {
            "assign_group": "Billing Support"
        },
        "priority": 3
    },
    {
        "name": "Escalate high priority unassigned tickets",
        "description": "Escalate high priority tickets if not assigned within 1 hour",
        "is_active": True,
        "trigger_type": "ticket_idle",
        "conditions": {
            "priority": "HIGH",
            "assigned": False,
            "age_hours": 1
        },
        "actions": {
            "escalate": 1,
            "notify_managers": True
        },
        "priority": 10
    },
    {
        "name": "Send welcome message on new ticket",
        "description": "Send automated first response to customer",
        "is_active": True,
        "trigger_type": "ticket_created",
        "conditions": {},
        "actions": {
            "send_template": "Welcome & First Response"
        },
        "priority": 1
    },
]


# ============================================================================
# Seeding Functions
# ============================================================================

async def seed_support_groups(db: AsyncSession):
    """Seed support groups."""
    print("\n=== Seeding Support Groups ===\n")

    for group_data in SUPPORT_GROUPS:
        query = select(SupportGroup).where(SupportGroup.name == group_data["name"])
        result = await db.execute(query)
        existing = result.scalar_one_or_none()

        if not existing:
            group = SupportGroup(
                id=str(uuid.uuid4()),
                **group_data
            )
            db.add(group)
            print(f"✓ Created support group: {group_data['name']}")
        else:
            print(f"⊘ Support group already exists: {group_data['name']}")

    await db.commit()


async def seed_tags(db: AsyncSession):
    """Seed tags."""
    print("\n=== Seeding Tags ===\n")

    # Get admin user for created_by field
    from app.modules.auth.models import User
    from sqlalchemy import text
    admin_query = select(User).where(text("role = 'ADMIN'")).limit(1)
    admin_result = await db.execute(admin_query)
    admin = admin_result.scalar_one_or_none()

    if not admin:
        print("⚠️  Warning: No admin user found, skipping tag seeding")
        return

    for tag_data in TAGS:
        query = select(Tag).where(Tag.name == tag_data["name"])
        result = await db.execute(query)
        existing = result.scalar_one_or_none()

        if not existing:
            tag = Tag(
                id=str(uuid.uuid4()),
                created_by=admin.id,
                **tag_data
            )
            db.add(tag)
            print(f"✓ Created tag: {tag_data['name']}")
        else:
            print(f"⊘ Tag already exists: {tag_data['name']}")

    await db.commit()


async def seed_ticket_categories(db: AsyncSession):
    """Seed ticket categories."""
    print("\n=== Seeding Ticket Categories ===\n")

    # Get admin user for created_by field
    from app.modules.auth.models import User
    from sqlalchemy import text
    admin_query = select(User).where(text("role = 'ADMIN'")).limit(1)
    admin_result = await db.execute(admin_query)
    admin = admin_result.scalar_one_or_none()

    if not admin:
        print("⚠️  Warning: No admin user found, skipping ticket category seeding")
        return

    # Get support groups for default assignments
    support_groups_query = select(SupportGroup)
    support_groups_result = await db.execute(support_groups_query)
    support_groups = {sg.name: sg for sg in support_groups_result.scalars().all()}

    for category_data in TICKET_CATEGORIES:
        query = select(TicketCategory).where(TicketCategory.name == category_data["name"])
        result = await db.execute(query)
        existing = result.scalar_one_or_none()

        if not existing:
            # Map category to support group
            default_group = None
            if category_data["name"] == "VPS Issues":
                default_group = support_groups.get("Technical Support")
            elif category_data["name"] == "DNS Issues":
                default_group = support_groups.get("DNS Support")
            elif category_data["name"] == "Billing Question":
                default_group = support_groups.get("Billing Support")
            else:
                default_group = support_groups.get("General Support")

            category = TicketCategory(
                id=str(uuid.uuid4()),
                created_by=admin.id,
                default_support_group_id=default_group.id if default_group else None,
                **category_data
            )
            db.add(category)
            print(f"✓ Created ticket category: {category_data['name']}")
        else:
            print(f"⊘ Ticket category already exists: {category_data['name']}")

    await db.commit()


async def seed_response_templates(db: AsyncSession):
    """Seed response templates."""
    print("\n=== Seeding Response Templates ===\n")

    # Get admin user for created_by field
    from app.modules.auth.models import User
    from sqlalchemy import text
    admin_query = select(User).where(text("role = 'ADMIN'")).limit(1)
    admin_result = await db.execute(admin_query)
    admin = admin_result.scalar_one_or_none()

    if not admin:
        print("⚠️  Warning: No admin user found, skipping response template seeding")
        return

    for template_data in RESPONSE_TEMPLATES:
        query = select(ResponseTemplate).where(ResponseTemplate.title == template_data["title"])
        result = await db.execute(query)
        existing = result.scalar_one_or_none()

        if not existing:
            template = ResponseTemplate(
                id=str(uuid.uuid4()),
                created_by=admin.id,
                **template_data
            )
            db.add(template)
            print(f"✓ Created response template: {template_data['title']}")
        else:
            print(f"⊘ Response template already exists: {template_data['title']}")

    await db.commit()


async def seed_automation_rules(db: AsyncSession):
    """Seed automation rules."""
    print("\n=== Seeding Automation Rules ===\n")

    for rule_data in AUTOMATION_RULES:
        query = select(AutomationRule).where(AutomationRule.name == rule_data["name"])
        result = await db.execute(query)
        existing = result.scalar_one_or_none()

        if not existing:
            rule = AutomationRule(
                id=str(uuid.uuid4()),
                **rule_data
            )
            db.add(rule)
            print(f"✓ Created automation rule: {rule_data['name']}")
        else:
            print(f"⊘ Automation rule already exists: {rule_data['name']}")

    await db.commit()


async def seed_all_ticket_data(db: AsyncSession):
    """Seed all ticket system data."""
    print("\n" + "="*60)
    print("  SEEDING TICKET SYSTEM DATA")
    print("="*60)

    try:
        await seed_support_groups(db)
        await seed_ticket_categories(db)
        await seed_tags(db)
        await seed_response_templates(db)
        await seed_automation_rules(db)

        print("\n" + "="*60)
        print("  TICKET SYSTEM SEEDING COMPLETE")
        print("="*60)
        print("\n📊 Summary:")
        print(f"  Support Groups: {len(SUPPORT_GROUPS)}")
        print(f"  Ticket Categories: {len(TICKET_CATEGORIES)}")
        print(f"  Tags: {len(TAGS)}")
        print(f"  Response Templates: {len(RESPONSE_TEMPLATES)}")
        print(f"  Automation Rules: {len(AUTOMATION_RULES)}")
        print("\n✅ Ticket system is ready!\n")

    except Exception as e:
        print(f"\n❌ Error seeding ticket data: {e}")
        await db.rollback()
        raise
