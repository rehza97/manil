"""
Unit tests for OrderService, including order total calculation with discounts.
"""
from types import SimpleNamespace

import pytest

from app.modules.orders.service import OrderService


def test_calculate_order_total_subtracts_discount():
    """Order total must satisfy: total_amount == subtotal + tax_amount - discount_amount."""
    # Item: 100 * 2 = 200, 10% discount = 20
    item = SimpleNamespace(unit_price=100.0, quantity=2,
                           discount_percentage=10.0)
    subtotal, tax, discount, total = OrderService._calculate_order_total(
        [item], tax_rate=0.1
    )
    assert subtotal == 200.0
    assert discount == 20.0
    # tax on (subtotal - discount) = 180 * 0.1 = 18
    assert tax == 18.0
    assert total == subtotal - discount + tax  # 200 - 20 + 18 = 198
    assert total == 198.0


def test_calculate_order_total_no_discount():
    """With no discount, total = subtotal + tax."""
    item = SimpleNamespace(unit_price=50.0, quantity=4,
                           discount_percentage=0.0)
    subtotal, tax, discount, total = OrderService._calculate_order_total(
        [item], tax_rate=0.1
    )
    assert subtotal == 200.0
    assert discount == 0.0
    assert tax == 20.0
    assert total == 220.0
    assert total == subtotal + tax - discount
