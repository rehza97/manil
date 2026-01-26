"""Customer status history service using audit logs."""

from typing import Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.modules.audit.repository import AuditRepository
from app.modules.audit.models import AuditLog, AuditAction
from app.modules.customers.schemas import CustomerStatus


class CustomerStatusHistoryService:
    """Service for retrieving customer status history from audit logs."""

    def __init__(self, db: AsyncSession):
        """Initialize service with database session."""
        self.db = db
        self.audit_repo = AuditRepository(db)

    async def get_status_history(
        self,
        customer_id: str,
        skip: int = 0,
        limit: int = 100,
    ) -> list[dict]:
        """
        Get status change history for a customer from audit logs.
        
        Args:
            customer_id: Customer ID
            skip: Number of records to skip
            limit: Maximum number of records to return
            
        Returns:
            List of status change records with old_status, new_status, reason, changed_by, changed_at
        """
        # Query audit logs for customer status changes
        query = (
            select(AuditLog)
            .where(
                and_(
                    AuditLog.resource_type == "customer",
                    AuditLog.resource_id == customer_id,
                    AuditLog.action == AuditAction.UPDATE,
                )
            )
            .order_by(AuditLog.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        
        result = await self.db.execute(query)
        audit_logs = result.scalars().all()
        
        # Extract status changes from audit logs
        status_history = []
        for log in audit_logs:
            old_values = log.old_values or {}
            new_values = log.new_values or {}
            
            # Check if this is a status change
            if "status" in old_values and "status" in new_values:
                old_status = old_values.get("status")
                new_status = new_values.get("status")
                
                if old_status != new_status:
                    # Extract reason from description
                    reason = None
                    if log.description and "Reason:" in log.description:
                        try:
                            reason = log.description.split("Reason:")[1].strip()
                        except:
                            reason = None
                    
                    status_history.append({
                        "id": log.id,
                        "old_status": old_status,
                        "new_status": new_status,
                        "reason": reason,
                        "changed_by": log.user_id,
                        "changed_by_email": log.user_email,
                        "changed_at": log.created_at,
                        "description": log.description,
                    })
        
        return status_history

    async def record_status_change(
        self,
        customer_id: str,
        old_status: CustomerStatus,
        new_status: CustomerStatus,
        reason: str,
        changed_by: str,
    ) -> None:
        """
        Record a status change in audit logs.
        
        Note: This is called automatically by the service when changing status.
        The actual logging is done in CustomerService.change_status().
        
        Args:
            customer_id: Customer ID
            old_status: Previous status
            new_status: New status
            reason: Reason for change
            changed_by: User ID making the change
        """
        # Status changes are already logged in CustomerService.change_status()
        # This method exists for consistency but doesn't need to do anything
        # as the audit logging is handled in the service layer
        pass
