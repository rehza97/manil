"""
Production-like audit log seed data for reports.

Seeds 100+ audit entries (login, CRUD, permissions, etc.). Idempotent.
"""

import random
from datetime import datetime, timezone

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.audit.models import AuditLog, AuditAction
from app.modules.auth.models import User
from app.core.seed_utils import date_months_ago, random_date_in_range


AUDIT_COUNT_TARGET = 100
SEED_DESCRIPTION_PREFIX = "[seed] "
RESOURCE_TYPES = ["Customer", "Order", "Invoice", "Ticket", "VPSSubscription", "User"]
IPS = ["192.168.1.10", "10.0.0.5", "172.16.0.1", "192.168.2.20", "10.0.1.100", "172.20.0.5", "192.168.3.30", "10.0.2.50"]
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1",
    "Mozilla/5.0 (X11; Linux x86_64) Firefox/121.0",
    "PostmanRuntime/7.32.0",
    "curl/7.88.0",
]


async def _get_user_ids_and_emails(db: AsyncSession, limit: int = 10) -> list[tuple[str, str]]:
    r = await db.execute(select(User.id, User.email).limit(limit))
    return [(str(row[0]), str(row[1] or "")) for row in r.fetchall()]


async def seed_production_audit_logs(db: AsyncSession) -> None:
    """Seed 100+ production-like audit log entries. Idempotent."""
    r = await db.execute(
        select(func.count(AuditLog.id)).where(AuditLog.description.like(f"%{SEED_DESCRIPTION_PREFIX}%"))
    )
    if (r.scalar() or 0) >= AUDIT_COUNT_TARGET:
        return

    users = await _get_user_ids_and_emails(db, 10)
    if not users:
        return

    action_dist = [
        (AuditAction.LOGIN_SUCCESS, 20), (AuditAction.LOGIN_FAILED, 10),
        (AuditAction.CREATE, 15), (AuditAction.UPDATE, 20), (AuditAction.DELETE, 10),
        (AuditAction.PERMISSION_GRANT, 5), (AuditAction.PERMISSION_REVOKE, 5),
        (AuditAction.LOGOUT, 5), (AuditAction.DATA_EXPORT, 5), (AuditAction.CONFIG_CHANGE, 5),
    ]
    start = date_months_ago(12)
    end = datetime.now(timezone.utc)

    logs: list[AuditLog] = []
    n = 0
    for action, cnt in action_dist:
        for _ in range(cnt):
            if n >= AUDIT_COUNT_TARGET:
                break
            user_id, user_email = users[random.randint(0, len(users) - 1)]
            resource_type = random.choice(RESOURCE_TYPES) if action in (AuditAction.CREATE, AuditAction.UPDATE, AuditAction.DELETE) else "Auth"
            resource_id = str(random.randint(1000, 9999)) if resource_type != "Auth" else None
            desc = f"{SEED_DESCRIPTION_PREFIX}{action.value} on {resource_type}"
            log = AuditLog(
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                description=desc,
                user_id=user_id,
                user_email=user_email or None,
                user_role="admin" if "admin" in (user_email or "").lower() else "client",
                ip_address=random.choice(IPS),
                user_agent=random.choice(USER_AGENTS),
                success=action != AuditAction.LOGIN_FAILED,
                created_at=random_date_in_range(start, end).replace(tzinfo=None),
            )
            if action == AuditAction.UPDATE and random.random() > 0.5:
                log.old_values = {"status": "pending"}
                log.new_values = {"status": "active"}
            logs.append(log)
            n += 1
    for log in logs:
        db.add(log)
    await db.commit()
