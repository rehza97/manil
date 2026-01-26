"""Customer approval workflow service."""

import logging
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException, ValidationException
from app.modules.customers.repository import CustomerRepository
from app.modules.customers.models import Customer
from app.modules.customers.schemas import ApprovalStatus, CustomerStatus
from app.modules.customers.notes_service import CustomerNoteService
from app.modules.customers.notes_schemas import CustomerNoteCreate
from app.modules.customers.notes_models import NoteType
from app.modules.customers.kyc_service import KYCService

logger = logging.getLogger(__name__)


class CustomerWorkflowService:
    """Service for managing customer approval workflows."""

    def __init__(self, db: AsyncSession):
        """Initialize service with database session."""
        self.db = db
        self.repository = CustomerRepository(db)
        self.note_service = CustomerNoteService(db)
        self.kyc_service = KYCService(db)

    async def submit_for_approval(
        self,
        customer_id: str,
        submitted_by: str,
        notes: Optional[str] = None,
    ) -> Customer:
        """
        Submit customer for approval.
        
        Args:
            customer_id: Customer ID
            submitted_by: User ID submitting for approval
            notes: Optional notes for submission
            
        Returns:
            Updated customer instance
        """
        customer = await self.repository.get_by_id(customer_id)
        if not customer:
            raise NotFoundException(f"Customer {customer_id} not found")
        
        if customer.approval_status == ApprovalStatus.PENDING:
            raise ValidationException("Customer is already pending approval")
        
        if customer.approval_status == ApprovalStatus.APPROVED:
            raise ValidationException("Customer is already approved")
        
        # Update approval status
        customer.approval_status = ApprovalStatus.PENDING
        customer.updated_by = submitted_by
        await self.db.commit()
        await self.db.refresh(customer)
        
        # Create internal note
        note_content = f"Customer submitted for approval."
        if notes:
            note_content += f"\n\nNotes: {notes}"
        
        try:
            await self.note_service.create_note(
                customer_id=customer_id,
                note_data=CustomerNoteCreate(
                    note_type=NoteType.INTERNAL,
                    title="Submitted for Approval",
                    content=note_content,
                    is_pinned=False,
                ),
                created_by=submitted_by,
            )
        except Exception as e:
            logger.warning(f"Failed to create note for approval submission: {e}")
        
        logger.info(f"Customer {customer_id} submitted for approval by {submitted_by}")
        return customer

    async def approve_customer(
        self,
        customer_id: str,
        approved_by: str,
        notes: Optional[str] = None,
    ) -> Customer:
        """
        Approve customer.
        
        If KYC is complete, automatically activates the customer.
        
        Args:
            customer_id: Customer ID
            approved_by: User ID approving
            notes: Optional approval notes
            
        Returns:
            Updated customer instance
        """
        customer = await self.repository.get_by_id(customer_id)
        if not customer:
            raise NotFoundException(f"Customer {customer_id} not found")
        
        if customer.approval_status != ApprovalStatus.PENDING:
            raise ValidationException(
                f"Cannot approve customer with status {customer.approval_status.value}"
            )
        
        # Update approval status
        customer.approval_status = ApprovalStatus.APPROVED
        customer.updated_by = approved_by
        
        # Check if KYC is complete and activate if so
        try:
            kyc_status = await self.kyc_service.get_customer_kyc_status(customer_id)
            if kyc_status.kyc_status == "approved" and kyc_status.summary.can_activate:
                if customer.status == CustomerStatus.PENDING:
                    customer.status = CustomerStatus.ACTIVE
                    logger.info(f"Customer {customer_id} automatically activated after approval")
        except Exception as e:
            logger.warning(f"Could not check KYC status during approval: {e}")
        
        await self.db.commit()
        await self.db.refresh(customer)
        
        # Create internal note
        note_content = f"Customer approved."
        if notes:
            note_content += f"\n\nApproval notes: {notes}"
        if customer.status == CustomerStatus.ACTIVE:
            note_content += "\n\nCustomer automatically activated (KYC complete)."
        
        try:
            await self.note_service.create_note(
                customer_id=customer_id,
                note_data=CustomerNoteCreate(
                    note_type=NoteType.INTERNAL,
                    title="Customer Approved",
                    content=note_content,
                    is_pinned=False,
                ),
                created_by=approved_by,
            )
        except Exception as e:
            logger.warning(f"Failed to create note for approval: {e}")
        
        logger.info(f"Customer {customer_id} approved by {approved_by}")
        return customer

    async def reject_customer(
        self,
        customer_id: str,
        rejected_by: str,
        reason: str,
    ) -> Customer:
        """
        Reject customer approval.
        
        Args:
            customer_id: Customer ID
            rejected_by: User ID rejecting
            reason: Reason for rejection (required)
            
        Returns:
            Updated customer instance
        """
        if not reason or not reason.strip():
            raise ValidationException("Rejection reason is required")
        
        customer = await self.repository.get_by_id(customer_id)
        if not customer:
            raise NotFoundException(f"Customer {customer_id} not found")
        
        if customer.approval_status != ApprovalStatus.PENDING:
            raise ValidationException(
                f"Cannot reject customer with status {customer.approval_status.value}"
            )
        
        # Update approval status and deactivate
        customer.approval_status = ApprovalStatus.REJECTED
        customer.status = CustomerStatus.INACTIVE
        customer.updated_by = rejected_by
        await self.db.commit()
        await self.db.refresh(customer)
        
        # Create issue note with rejection reason
        try:
            await self.note_service.create_note(
                customer_id=customer_id,
                note_data=CustomerNoteCreate(
                    note_type=NoteType.ISSUE,
                    title="Customer Approval Rejected",
                    content=f"Customer approval rejected.\n\nReason: {reason}",
                    is_pinned=True,  # Pin rejection notes
                ),
                created_by=rejected_by,
            )
        except Exception as e:
            logger.warning(f"Failed to create note for rejection: {e}")
        
        logger.info(f"Customer {customer_id} rejected by {rejected_by}: {reason}")
        return customer
