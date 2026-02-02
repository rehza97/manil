"""
Shared utilities for production-like seed data.

Date generators, financial calculators, and random helpers.
No external faker; uses random + fixed lists for reproducibility.
"""

import random
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, List


def random_date_in_range(start: datetime, end: datetime) -> datetime:
    """Return a random datetime between start and end (timezone-aware UTC)."""
    if start.tzinfo is None:
        start = start.replace(tzinfo=timezone.utc)
    if end.tzinfo is None:
        end = end.replace(tzinfo=timezone.utc)
    delta = end - start
    sec = random.randint(0, max(0, int(delta.total_seconds())))
    return start + timedelta(seconds=sec)


def date_months_ago(months: int) -> datetime:
    """Return a datetime N months ago from now (UTC)."""
    now = datetime.now(timezone.utc)
    # Approximate: 30 days per month
    return now - timedelta(days=months * 30)


def calculate_tax(subtotal: Decimal, rate: Decimal = Decimal("0.19")) -> Decimal:
    """Calculate tax amount from subtotal and rate (default 19%)."""
    return (subtotal * rate).quantize(Decimal("0.01"))


def calculate_total(
    subtotal: Decimal, tax: Decimal, discount: Decimal = Decimal("0")
) -> Decimal:
    """Total = subtotal + tax - discount."""
    return (subtotal + tax - discount).quantize(Decimal("0.01"))


def random_algerian_phone() -> str:
    """Return a plausible Algerian mobile number (e.g. 05XX XX XX XX)."""
    prefix = random.choice(["5", "6", "7"])
    rest = "".join(str(random.randint(0, 9)) for _ in range(8))
    return f"0{prefix}{rest[:2]} {rest[2:4]} {rest[4:6]} {rest[6:8]}"


def random_dz_email(name: str, domain: str = "production.seed") -> str:
    """Slug from name + @domain (e.g. ahmed.benali@production.seed)."""
    slug = name.lower().replace(" ", ".").replace("'", "")
    return f"{slug}@{domain}"


def random_amount(min_val: int, max_val: int) -> Decimal:
    """Random amount in range [min_val, max_val], 2 decimal places."""
    val = random.randint(min_val, max_val) + random.random()
    return Decimal(str(round(val, 2)))


def weighted_choice(choices: List[Any], weights: List[float]) -> Any:
    """Return one element from choices with probability proportional to weights."""
    total = sum(weights)
    r = random.uniform(0, total)
    acc = 0.0
    for c, w in zip(choices, weights):
        acc += w
        if r <= acc:
            return c
    return choices[-1]
