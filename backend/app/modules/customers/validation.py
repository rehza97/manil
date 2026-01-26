"""Customer status transition validation."""

from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ValidationException, ForbiddenException
from app.modules.customers.schemas import CustomerStatus
from app.modules.customers.models import Customer
from app.modules.customers.kyc_service import KYCService


# Valid status transitions
STATUS_TRANSITIONS = {
    CustomerStatus.PENDING: [CustomerStatus.ACTIVE, CustomerStatus.INACTIVE],
    CustomerStatus.ACTIVE: [CustomerStatus.SUSPENDED, CustomerStatus.INACTIVE],
    CustomerStatus.SUSPENDED: [CustomerStatus.ACTIVE, CustomerStatus.INACTIVE],
    CustomerStatus.INACTIVE: [CustomerStatus.PENDING],  # Réactivation
}


def validate_status_transition(
    old_status: CustomerStatus,
    new_status: CustomerStatus,
    reason: Optional[str] = None,
) -> None:
    """
    Validate if a status transition is allowed.
    
    Args:
        old_status: Current customer status
        new_status: Desired new status
        reason: Optional reason for the transition
        
    Raises:
        ValidationException: If transition is not allowed
    """
    allowed_transitions = STATUS_TRANSITIONS.get(old_status, [])
    
    if new_status not in allowed_transitions:
        raise ValidationException(
            f"Cannot transition from {old_status.value} to {new_status.value}. "
            f"Allowed transitions: {[s.value for s in allowed_transitions]}"
        )
    
    # Reason is required for all transitions
    if not reason or not reason.strip():
        raise ValidationException("Reason is required for status transitions")


async def check_kyc_requirements(
    db: AsyncSession,
    customer_id: str,
    target_status: CustomerStatus,
) -> None:
    """
    Check if KYC requirements are met for a status transition.
    
    Args:
        db: Database session
        customer_id: Customer ID
        target_status: Target status to transition to
        
    Raises:
        ValidationException: If KYC requirements are not met
    """
    # KYC is required for PENDING -> ACTIVE transition
    if target_status == CustomerStatus.ACTIVE:
        kyc_service = KYCService(db)
        kyc_status = await kyc_service.get_customer_kyc_status(customer_id)
        
        # Check if KYC is complete and approved
        if kyc_status.kyc_status != "approved":
            missing_docs = ", ".join([d.value for d in kyc_status.missing_documents])
            raise ValidationException(
                f"Cannot activate customer: KYC verification incomplete. "
                f"Status: {kyc_status.kyc_status}. "
                f"Missing documents: {missing_docs if missing_docs else 'None'}"
            )
        
        # Verify all required documents are approved
        summary = kyc_status.summary
        if not summary.can_activate:
            raise ValidationException(
                f"Cannot activate customer: KYC documents not fully approved. "
                f"Approved: {summary.approved_documents}, "
                f"Pending: {summary.pending_documents}, "
                f"Rejected: {summary.rejected_documents}"
            )


async def can_transition_to(
    db: AsyncSession,
    customer: Customer,
    new_status: CustomerStatus,
    reason: Optional[str] = None,
) -> tuple[bool, Optional[str]]:
    """
    Check if customer can transition to new status.
    
    Args:
        db: Database session
        customer: Customer instance
        new_status: Desired new status
        reason: Optional reason for transition
        
    Returns:
        Tuple of (can_transition: bool, error_message: Optional[str])
    """
    try:
        # Validate transition rules
        validate_status_transition(customer.status, new_status, reason)
        
        # Check KYC requirements if needed
        if new_status == CustomerStatus.ACTIVE:
            await check_kyc_requirements(db, customer.id, new_status)
        
        return True, None
    except ValidationException as e:
        return False, str(e)
    except Exception as e:
        return False, f"Validation error: {str(e)}"
