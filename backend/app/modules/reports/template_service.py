"""
Template Service

Jinja2 custom filters for report templates: format_currency, format_percentage,
color_status, trend_indicator. Use get_report_filters() to register on HTMLPDFService env.
"""

from typing import Any, Optional


def format_currency(value: Any, currency: str = "DZD") -> str:
    """Format number as currency string."""
    try:
        n = float(value)
        return f"{n:,.2f} {currency}"
    except (TypeError, ValueError):
        return str(value)


def format_percentage(value: Any, decimals: int = 2) -> str:
    """Format number as percentage."""
    try:
        n = float(value)
        return f"{n:.{decimals}f}%"
    except (TypeError, ValueError):
        return str(value)


def color_status(status: Any) -> str:
    """Return CSS class name for status (e.g. status-paid, status-overdue)."""
    s = (str(status) or "").lower()
    if s in ("paid", "completed", "delivered", "resolved", "closed"):
        return "status-paid"
    if s in ("overdue", "cancelled", "rejected", "failed"):
        return "status-overdue"
    if s in ("pending", "in_progress", "waiting"):
        return "status-pending"
    return "status-default"


def trend_indicator(current: Any, previous: Any) -> str:
    """Return CSS class for trend: trend-up (green), trend-down (red), trend-neutral."""
    try:
        c, p = float(current), float(previous)
        if p == 0:
            return "trend-neutral"
        if c > p:
            return "trend-up"
        if c < p:
            return "trend-down"
        return "trend-neutral"
    except (TypeError, ValueError):
        return "trend-neutral"


def get_report_filters() -> dict:
    """Return dict of filter_name -> callable for Jinja2 env.filters.update()."""
    return {
        "format_currency": format_currency,
        "format_percentage": format_percentage,
        "color_status": color_status,
        "trend_indicator": trend_indicator,
    }
