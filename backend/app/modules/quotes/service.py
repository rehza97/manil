"""
Quote service.

Business logic for quote management, versioning, approval, and expiration.
"""
import uuid
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import List, Optional, Tuple

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException, BadRequestException, ConflictException, ForbiddenException
from app.core.price_validator import validate_quote_prices, PriceValidationError
from app.core.logging import logger
from app.modules.quotes.repository import QuoteRepository
from app.modules.quotes.models import Quote, QuoteItem, QuoteStatus
from app.modules.quotes.schemas import (
    QuoteCreate,
    QuoteUpdate,
    QuoteItemCreate,
    QuoteApprovalRequest,
    QuoteVersionRequest,
    QuoteStatistics
)


class QuoteService:
    """Quote business logic service."""

    def __init__(self, db: AsyncSession):
        self.repository = QuoteRepository(db)
        self.db = db

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        customer_id: Optional[str] = None,
        status: Optional[QuoteStatus] = None
    ) -> Tuple[List[Quote], int]:
        """Get all quotes with pagination."""
        quotes = await self.repository.get_all(
            skip=skip,
            limit=limit,
            customer_id=customer_id,
            status=status
        )
        total = await self.repository.count(customer_id=customer_id, status=status)
        return quotes, total

    async def get_by_id(self, quote_id: str) -> Quote:
        """Get quote by ID."""
        quote = await self.repository.get_by_id(quote_id)
        if not quote:
            raise NotFoundException(f"Quote {quote_id} not found")
        return quote

    async def create(self, quote_data: QuoteCreate, created_by_id: str) -> Quote:
        """Create a new quote with price validation.

        Security:
        - Validates all item prices against product catalog
        - Allows custom pricing for quotes (flagged for approval if >10% difference)
        - Validates discount and tax rates
        """
        # SECURITY: Validate prices against product catalog
        try:
            items_dict = [item.model_dump() for item in quote_data.items]
            validated_items = await validate_quote_prices(
                self.db,
                items_dict,
                discount_amount=quote_data.discount_amount,
                tax_rate=quote_data.tax_rate,
                allow_custom_pricing=True  # Quotes allow custom pricing with approval
            )
            logger.info(f"Price validation passed for quote with {len(validated_items)} items")

            # Check if any items require approval due to custom pricing
            requires_approval = any(item.get('requires_approval', False) for item in validated_items)
            if requires_approval:
                quote_data.approval_required = True
                logger.warning("Quote requires approval due to custom pricing")

        except PriceValidationError as e:
            logger.error(f"Price validation failed: {str(e)}")
            raise BadRequestException(f"Price validation failed: {str(e)}")

        # Update quote_data items with validated prices
        for idx, validated_item in enumerate(validated_items):
            quote_data.items[idx].unit_price = Decimal(str(validated_item['unit_price']))

        # Generate quote number
        quote_number = await self._generate_quote_number()

        # Calculate totals (using validated prices)
        subtotal, tax_amount, total = self._calculate_totals(
            quote_data.items,
            quote_data.tax_rate,
            quote_data.discount_amount
        )

        # Create quote
        quote = Quote(
            quote_number=quote_number,
            customer_id=quote_data.customer_id,
            title=quote_data.title,
            description=quote_data.description,
            status=QuoteStatus.DRAFT,
            tax_rate=quote_data.tax_rate,
            discount_amount=quote_data.discount_amount,
            subtotal_amount=subtotal,
            tax_amount=tax_amount,
            total_amount=total,
            valid_from=quote_data.valid_from,
            valid_until=quote_data.valid_until,
            approval_required=quote_data.approval_required,
            notes=quote_data.notes,
            terms_and_conditions=quote_data.terms_and_conditions,
            created_by_id=created_by_id,
            version=1,
            is_latest_version=True
        )

        # Create quote items
        for idx, item_data in enumerate(quote_data.items):
            line_total = self._calculate_line_total(
                item_data.quantity,
                item_data.unit_price,
                item_data.discount_percentage
            )

            item = QuoteItem(
                quote_id=quote.id,
                product_id=item_data.product_id,
                item_name=item_data.item_name,
                description=item_data.description,
                quantity=item_data.quantity,
                unit_price=item_data.unit_price,
                discount_percentage=item_data.discount_percentage,
                line_total=line_total,
                sort_order=item_data.sort_order if item_data.sort_order > 0 else idx
            )
            quote.items.append(item)

        # Save quote
        quote = await self.repository.create(quote)

        # Add timeline event
        await self.repository.add_timeline_event(
            quote_id=quote.id,
            event_type="created",
            event_description=f"Quote {quote.quote_number} created",
            created_by_id=created_by_id
        )

        await self.repository.commit()
        return quote

    async def update(
        self,
        quote_id: str,
        quote_data: QuoteUpdate,
        updated_by_id: str
    ) -> Quote:
        """Update a quote."""
        quote = await self.get_by_id(quote_id)

        # Check if quote can be updated
        if quote.status in [QuoteStatus.CONVERTED, QuoteStatus.EXPIRED]:
            raise BadRequestException(f"Cannot update quote with status {quote.status}")

        # Update basic fields
        if quote_data.title is not None:
            quote.title = quote_data.title
        if quote_data.description is not None:
            quote.description = quote_data.description
        if quote_data.tax_rate is not None:
            quote.tax_rate = quote_data.tax_rate
        if quote_data.discount_amount is not None:
            quote.discount_amount = quote_data.discount_amount
        if quote_data.valid_from is not None:
            quote.valid_from = quote_data.valid_from
        if quote_data.valid_until is not None:
            quote.valid_until = quote_data.valid_until
        if quote_data.notes is not None:
            quote.notes = quote_data.notes
        if quote_data.terms_and_conditions is not None:
            quote.terms_and_conditions = quote_data.terms_and_conditions

        # Update items if provided
        if quote_data.items is not None:
            # Remove old items
            quote.items.clear()
            await self.db.flush()

            # Add new items
            for idx, item_data in enumerate(quote_data.items):
                line_total = self._calculate_line_total(
                    item_data.quantity,
                    item_data.unit_price,
                    item_data.discount_percentage
                )

                item = QuoteItem(
                    quote_id=quote.id,
                    product_id=item_data.product_id,
                    item_name=item_data.item_name,
                    description=item_data.description,
                    quantity=item_data.quantity,
                    unit_price=item_data.unit_price,
                    discount_percentage=item_data.discount_percentage,
                    line_total=line_total,
                    sort_order=item_data.sort_order if item_data.sort_order > 0 else idx
                )
                quote.items.append(item)

            # Recalculate totals
            await self.db.flush()
            await self.db.refresh(quote, attribute_names=["items"])

            subtotal, tax_amount, total = self._calculate_totals_from_items(
                quote.items,
                quote.tax_rate,
                quote.discount_amount
            )
            quote.subtotal_amount = subtotal
            quote.tax_amount = tax_amount
            quote.total_amount = total

        quote.updated_by_id = updated_by_id
        quote = await self.repository.update(quote)

        # Add timeline event
        await self.repository.add_timeline_event(
            quote_id=quote.id,
            event_type="updated",
            event_description="Quote updated",
            created_by_id=updated_by_id
        )

        await self.repository.commit()
        return quote

    def _calculate_line_total(
        self,
        quantity: int,
        unit_price: Decimal,
        discount_percentage: Decimal
    ) -> Decimal:
        """Calculate line item total."""
        subtotal = Decimal(quantity) * unit_price
        discount = subtotal * (discount_percentage / Decimal("100"))
        return subtotal - discount

    def _calculate_totals(
        self,
        items: List[QuoteItemCreate],
        tax_rate: Decimal,
        discount_amount: Decimal
    ) -> Tuple[Decimal, Decimal, Decimal]:
        """Calculate quote totals from item data."""
        subtotal = sum(
            self._calculate_line_total(item.quantity, item.unit_price, item.discount_percentage)
            for item in items
        )
        subtotal_after_discount = subtotal - discount_amount
        tax_amount = subtotal_after_discount * (tax_rate / Decimal("100"))
        total = subtotal_after_discount + tax_amount
        return subtotal, tax_amount, total

    def _calculate_totals_from_items(
        self,
        items: List[QuoteItem],
        tax_rate: Decimal,
        discount_amount: Decimal
    ) -> Tuple[Decimal, Decimal, Decimal]:
        """Calculate quote totals from quote items."""
        subtotal = sum(item.line_total for item in items)
        subtotal_after_discount = subtotal - discount_amount
        tax_amount = subtotal_after_discount * (tax_rate / Decimal("100"))
        total = subtotal_after_discount + tax_amount
        return subtotal, tax_amount, total

    async def _generate_quote_number(self) -> str:
        """Generate a unique quote number."""
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d")
        random_part = str(uuid.uuid4())[:6].upper()
        return f"QT-{timestamp}-{random_part}"

    async def delete(self, quote_id: str) -> None:
        """Soft delete a quote."""
        quote = await self.get_by_id(quote_id)

        if quote.status in [QuoteStatus.ACCEPTED, QuoteStatus.CONVERTED]:
            raise BadRequestException(f"Cannot delete quote with status {quote.status}")

        await self.repository.delete(quote, hard_delete=False)
        await self.repository.commit()
