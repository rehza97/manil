"""
Price validation service.

Prevents client-side price manipulation by validating prices against
the product catalog server-side.
"""
from decimal import Decimal
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ValidationException
from app.core.logging import logger


class PriceValidationError(ValidationException):
    """Exception raised when price validation fails."""
    pass


class PriceValidator:
    """
    Validates item prices against product catalog.
    Prevents client-side price manipulation attacks.
    """

    def __init__(self, db: AsyncSession):
        """
        Initialize price validator.

        Args:
            db: Database session
        """
        self.db = db

    async def validate_invoice_items(
        self,
        items: List[dict],
        allow_custom_items: bool = False
    ) -> List[dict]:
        """
        Validate and correct invoice item prices.

        Args:
            items: List of invoice items with product_id and unit_price
            allow_custom_items: Whether to allow items without product_id

        Returns:
            List of validated items with corrected prices

        Raises:
            PriceValidationError: If price validation fails
        """
        from app.modules.products.models import Product

        validated_items = []

        for idx, item in enumerate(items):
            product_id = item.get('product_id')

            # Handle custom line items (no product reference)
            if not product_id:
                if not allow_custom_items:
                    raise PriceValidationError(
                        f"Item #{idx + 1}: product_id is required for price validation"
                    )
                # Custom items keep their provided price
                validated_items.append(item)
                logger.warning(
                    f"Custom invoice item without product_id: {item.get('description')}"
                )
                continue

            # Fetch product from catalog
            result = await self.db.execute(
                """
                SELECT id, name, price, is_active
                FROM products
                WHERE id = :product_id
                """,
                {"product_id": product_id}
            )
            product = result.first()

            if not product:
                raise PriceValidationError(
                    f"Item #{idx + 1}: Product with ID '{product_id}' not found"
                )

            if not product.is_active:
                raise PriceValidationError(
                    f"Item #{idx + 1}: Product '{product.name}' is no longer active"
                )

            # Validate price matches catalog
            catalog_price = Decimal(str(product.price))
            provided_price = Decimal(str(item.get('unit_price', 0)))

            # Allow small floating point differences (0.01)
            price_difference = abs(catalog_price - provided_price)

            if price_difference > Decimal('0.01'):
                logger.warning(
                    f"Price mismatch detected for product '{product.name}' "
                    f"(ID: {product_id}). "
                    f"Catalog: {catalog_price}, Provided: {provided_price}. "
                    f"Using catalog price."
                )

                # SECURITY: Always use catalog price, not client-provided price
                item['unit_price'] = catalog_price

            # Add validated item
            validated_items.append(item)

        logger.info(f"Validated {len(validated_items)} invoice items")
        return validated_items

    async def validate_quote_items(
        self,
        items: List[dict],
        allow_custom_pricing: bool = False
    ) -> List[dict]:
        """
        Validate and correct quote item prices.

        For quotes, we may allow custom pricing with approval,
        but still validate against catalog as baseline.

        Args:
            items: List of quote items with product_id and unit_price
            allow_custom_pricing: Whether to allow prices different from catalog

        Returns:
            List of validated items with corrected/flagged prices

        Raises:
            PriceValidationError: If price validation fails
        """
        from app.modules.products.models import Product

        validated_items = []

        for idx, item in enumerate(items):
            product_id = item.get('product_id')

            # Handle custom line items
            if not product_id:
                validated_items.append(item)
                continue

            # Fetch product from catalog
            result = await self.db.execute(
                """
                SELECT id, name, price, is_active
                FROM products
                WHERE id = :product_id
                """,
                {"product_id": product_id}
            )
            product = result.first()

            if not product:
                raise PriceValidationError(
                    f"Item #{idx + 1}: Product with ID '{product_id}' not found"
                )

            catalog_price = Decimal(str(product.price))
            provided_price = Decimal(str(item.get('unit_price', 0)))
            price_difference = abs(catalog_price - provided_price)

            if price_difference > Decimal('0.01'):
                if not allow_custom_pricing:
                    # For quotes without custom pricing, enforce catalog price
                    logger.warning(
                        f"Quote price mismatch for '{product.name}'. "
                        f"Enforcing catalog price: {catalog_price}"
                    )
                    item['unit_price'] = catalog_price
                else:
                    # Flag for approval if price differs significantly (>10%)
                    percentage_diff = (price_difference / catalog_price) * 100
                    if percentage_diff > 10:
                        item['requires_approval'] = True
                        item['catalog_price'] = catalog_price
                        logger.warning(
                            f"Quote item '{product.name}' has custom pricing "
                            f"({provided_price} vs {catalog_price}). "
                            f"Flagged for approval."
                        )

            validated_items.append(item)

        logger.info(f"Validated {len(validated_items)} quote items")
        return validated_items

    @staticmethod
    def validate_discount(
        subtotal: Decimal,
        discount_amount: Decimal,
        max_discount_percentage: Decimal = Decimal('50.00')
    ) -> None:
        """
        Validate discount amount is reasonable.

        Args:
            subtotal: Invoice/quote subtotal
            discount_amount: Discount amount to validate
            max_discount_percentage: Maximum allowed discount percentage

        Raises:
            PriceValidationError: If discount is invalid
        """
        if discount_amount < 0:
            raise PriceValidationError("Discount amount cannot be negative")

        if discount_amount > subtotal:
            raise PriceValidationError(
                f"Discount amount ({discount_amount}) cannot exceed subtotal ({subtotal})"
            )

        # Check if discount exceeds maximum percentage
        discount_percentage = (discount_amount / subtotal) * 100
        if discount_percentage > max_discount_percentage:
            raise PriceValidationError(
                f"Discount ({discount_percentage:.2f}%) exceeds maximum allowed "
                f"({max_discount_percentage}%)"
            )

    @staticmethod
    def validate_tax_rate(tax_rate: Decimal) -> None:
        """
        Validate tax rate is reasonable.

        Args:
            tax_rate: Tax rate to validate (percentage)

        Raises:
            PriceValidationError: If tax rate is invalid
        """
        if tax_rate < 0:
            raise PriceValidationError("Tax rate cannot be negative")

        if tax_rate > 100:
            raise PriceValidationError("Tax rate cannot exceed 100%")

        # Warn about unusual tax rates
        if tax_rate > 50:
            logger.warning(f"Unusually high tax rate: {tax_rate}%")


async def validate_invoice_prices(
    db: AsyncSession,
    items: List[dict],
    discount_amount: Optional[Decimal] = None,
    tax_rate: Optional[Decimal] = None
) -> List[dict]:
    """
    Convenience function to validate invoice prices.

    Args:
        db: Database session
        items: List of invoice items
        discount_amount: Optional discount to validate
        tax_rate: Optional tax rate to validate

    Returns:
        List of validated items with corrected prices

    Raises:
        PriceValidationError: If validation fails
    """
    validator = PriceValidator(db)

    # Validate items
    validated_items = await validator.validate_invoice_items(items)

    # Calculate subtotal
    subtotal = sum(
        Decimal(str(item['unit_price'])) * Decimal(str(item['quantity']))
        for item in validated_items
    )

    # Validate discount
    if discount_amount is not None:
        validator.validate_discount(subtotal, discount_amount)

    # Validate tax rate
    if tax_rate is not None:
        validator.validate_tax_rate(tax_rate)

    return validated_items


async def validate_quote_prices(
    db: AsyncSession,
    items: List[dict],
    discount_amount: Optional[Decimal] = None,
    tax_rate: Optional[Decimal] = None,
    allow_custom_pricing: bool = False
) -> List[dict]:
    """
    Convenience function to validate quote prices.

    Args:
        db: Database session
        items: List of quote items
        discount_amount: Optional discount to validate
        tax_rate: Optional tax rate to validate
        allow_custom_pricing: Whether to allow custom pricing

    Returns:
        List of validated items

    Raises:
        PriceValidationError: If validation fails
    """
    validator = PriceValidator(db)

    # Validate items
    validated_items = await validator.validate_quote_items(
        items, allow_custom_pricing=allow_custom_pricing
    )

    # Calculate subtotal
    subtotal = sum(
        Decimal(str(item['unit_price'])) * Decimal(str(item['quantity']))
        for item in validated_items
    )

    # Validate discount
    if discount_amount is not None:
        validator.validate_discount(subtotal, discount_amount)

    # Validate tax rate
    if tax_rate is not None:
        validator.validate_tax_rate(tax_rate)

    return validated_items
