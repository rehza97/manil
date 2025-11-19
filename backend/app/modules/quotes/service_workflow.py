"""
Quote workflow service.

Handles approval workflow, versioning, sending, and expiration.
"""
from datetime import datetime, timezone
from typing import List

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException, BadRequestException, ForbiddenException
from app.modules.quotes.repository import QuoteRepository
from app.modules.quotes.models import Quote, QuoteItem, QuoteStatus
from app.modules.quotes.schemas import QuoteApprovalRequest, QuoteVersionRequest, QuoteSendRequest
from app.modules.quotes.service import QuoteService


class QuoteWorkflowService:
    """Quote workflow and lifecycle management."""

    def __init__(self, db: AsyncSession):
        self.repository = QuoteRepository(db)
        self.base_service = QuoteService(db)
        self.db = db

    async def submit_for_approval(self, quote_id: str, submitted_by_id: str) -> Quote:
        """Submit quote for approval."""
        quote = await self.base_service.get_by_id(quote_id)

        if quote.status != QuoteStatus.DRAFT:
            raise BadRequestException("Only draft quotes can be submitted for approval")

        if not quote.approval_required:
            raise BadRequestException("Quote does not require approval")

        quote.status = QuoteStatus.PENDING_APPROVAL
        quote = await self.repository.update(quote)

        await self.repository.add_timeline_event(
            quote_id=quote.id,
            event_type="submitted_for_approval",
            event_description="Quote submitted for approval",
            created_by_id=submitted_by_id,
            old_value=QuoteStatus.DRAFT.value,
            new_value=QuoteStatus.PENDING_APPROVAL.value
        )

        await self.repository.commit()
        return quote

    async def approve_quote(
        self,
        quote_id: str,
        approval_data: QuoteApprovalRequest,
        approved_by_id: str
    ) -> Quote:
        """Approve or reject a quote."""
        quote = await self.base_service.get_by_id(quote_id)

        if quote.status != QuoteStatus.PENDING_APPROVAL:
            raise BadRequestException("Only pending quotes can be approved/rejected")

        old_status = quote.status

        if approval_data.approved:
            quote.status = QuoteStatus.APPROVED
            quote.approved_by_id = approved_by_id
            quote.approved_at = datetime.now(timezone.utc)
            event_description = "Quote approved"
        else:
            quote.status = QuoteStatus.REJECTED
            event_description = "Quote rejected"

        quote.approval_notes = approval_data.notes
        quote = await self.repository.update(quote)

        await self.repository.add_timeline_event(
            quote_id=quote.id,
            event_type="approval_decision",
            event_description=event_description,
            created_by_id=approved_by_id,
            old_value=old_status.value,
            new_value=quote.status.value
        )

        await self.repository.commit()
        return quote

    async def send_quote(
        self,
        quote_id: str,
        send_data: QuoteSendRequest,
        sent_by_id: str
    ) -> Quote:
        """Send quote to customer."""
        quote = await self.base_service.get_by_id(quote_id)

        # Validate quote can be sent
        if quote.approval_required and quote.status != QuoteStatus.APPROVED:
            raise BadRequestException("Quote must be approved before sending")

        if quote.status not in [QuoteStatus.DRAFT, QuoteStatus.APPROVED]:
            raise BadRequestException(f"Cannot send quote with status {quote.status}")

        # Check if quote is expired
        if quote.valid_until < datetime.now(timezone.utc):
            raise BadRequestException("Cannot send expired quote")

        old_status = quote.status
        quote.status = QuoteStatus.SENT
        quote.sent_at = datetime.now(timezone.utc)
        quote = await self.repository.update(quote)

        await self.repository.add_timeline_event(
            quote_id=quote.id,
            event_type="sent",
            event_description="Quote sent to customer",
            created_by_id=sent_by_id,
            old_value=old_status.value,
            new_value=QuoteStatus.SENT.value
        )

        # TODO: Send email if requested
        if send_data.send_email:
            pass  # Implement email sending

        await self.repository.commit()
        return quote

    async def accept_quote(self, quote_id: str, accepted_by_id: str) -> Quote:
        """Customer accepts a quote."""
        quote = await self.base_service.get_by_id(quote_id)

        if quote.status != QuoteStatus.SENT:
            raise BadRequestException("Only sent quotes can be accepted")

        # Check if quote is expired
        if quote.valid_until < datetime.now(timezone.utc):
            quote.status = QuoteStatus.EXPIRED
            await self.repository.update(quote)
            await self.repository.commit()
            raise BadRequestException("Quote has expired")

        quote.status = QuoteStatus.ACCEPTED
        quote.accepted_at = datetime.now(timezone.utc)
        quote = await self.repository.update(quote)

        await self.repository.add_timeline_event(
            quote_id=quote.id,
            event_type="accepted",
            event_description="Quote accepted by customer",
            created_by_id=accepted_by_id,
            old_value=QuoteStatus.SENT.value,
            new_value=QuoteStatus.ACCEPTED.value
        )

        await self.repository.commit()
        return quote

    async def decline_quote(self, quote_id: str, declined_by_id: str, reason: str = None) -> Quote:
        """Customer declines a quote."""
        quote = await self.base_service.get_by_id(quote_id)

        if quote.status != QuoteStatus.SENT:
            raise BadRequestException("Only sent quotes can be declined")

        quote.status = QuoteStatus.DECLINED
        quote.declined_at = datetime.now(timezone.utc)
        quote = await self.repository.update(quote)

        event_description = "Quote declined by customer"
        if reason:
            event_description += f": {reason}"

        await self.repository.add_timeline_event(
            quote_id=quote.id,
            event_type="declined",
            event_description=event_description,
            created_by_id=declined_by_id,
            old_value=QuoteStatus.SENT.value,
            new_value=QuoteStatus.DECLINED.value
        )

        await self.repository.commit()
        return quote

    async def create_new_version(
        self,
        quote_id: str,
        version_data: QuoteVersionRequest,
        created_by_id: str
    ) -> Quote:
        """Create a new version of a quote."""
        original_quote = await self.base_service.get_by_id(quote_id)

        # Mark original as not latest
        original_quote.is_latest_version = False
        await self.repository.update(original_quote)

        # Create new version with copied data
        new_quote = Quote(
            quote_number=original_quote.quote_number,  # Same quote number
            version=original_quote.version + 1,  # Increment version
            parent_quote_id=original_quote.parent_quote_id or original_quote.id,
            is_latest_version=True,
            customer_id=original_quote.customer_id,
            title=original_quote.title,
            description=original_quote.description,
            status=QuoteStatus.DRAFT,  # New version starts as draft
            tax_rate=original_quote.tax_rate,
            discount_amount=original_quote.discount_amount,
            subtotal_amount=original_quote.subtotal_amount,
            tax_amount=original_quote.tax_amount,
            total_amount=original_quote.total_amount,
            valid_from=original_quote.valid_from,
            valid_until=original_quote.valid_until,
            approval_required=original_quote.approval_required,
            notes=original_quote.notes,
            terms_and_conditions=original_quote.terms_and_conditions,
            created_by_id=created_by_id
        )

        # Copy items
        for original_item in original_quote.items:
            new_item = QuoteItem(
                product_id=original_item.product_id,
                item_name=original_item.item_name,
                description=original_item.description,
                quantity=original_item.quantity,
                unit_price=original_item.unit_price,
                discount_percentage=original_item.discount_percentage,
                line_total=original_item.line_total,
                sort_order=original_item.sort_order
            )
            new_quote.items.append(new_item)

        new_quote = await self.repository.create(new_quote)

        await self.repository.add_timeline_event(
            quote_id=new_quote.id,
            event_type="version_created",
            event_description=f"New version {new_quote.version} created: {version_data.changes_description}",
            created_by_id=created_by_id
        )

        await self.repository.commit()
        return new_quote

    async def expire_old_quotes(self) -> int:
        """Mark expired quotes as expired. Returns count of expired quotes."""
        expired_quotes = await self.repository.get_expired_quotes()
        count = 0

        for quote in expired_quotes:
            quote.status = QuoteStatus.EXPIRED
            await self.repository.update(quote)

            await self.repository.add_timeline_event(
                quote_id=quote.id,
                event_type="expired",
                event_description="Quote expired automatically",
                created_by_id="system"
            )
            count += 1

        if count > 0:
            await self.repository.commit()

        return count

    async def get_quote_versions(self, quote_id: str) -> List[Quote]:
        """Get all versions of a quote."""
        return await self.repository.get_quote_versions(quote_id)
