"""
Template context builder for email templates.

Builds context dictionaries with common variables for each template type.
"""
from typing import Dict, Any
from app.config.settings import get_settings

settings = get_settings()


def build_base_context(**kwargs) -> Dict[str, Any]:
    """
    Build base context with common variables.

    Args:
        **kwargs: Additional context variables

    Returns:
        Context dictionary with base variables
    """
    context = {
        "site_url": getattr(settings, "FRONTEND_URL", "https://cloudmanager.dz"),
        "company_name": "CloudManager",
        "support_email": getattr(settings, "SUPPORT_EMAIL", "support@cloudmanager.dz"),
    }
    context.update(kwargs)
    return context


def build_welcome_context(user_name: str) -> Dict[str, Any]:
    """Build context for welcome email."""
    return build_base_context(user_name=user_name)


def build_password_reset_context(user_name: str, reset_token: str, reset_url: str = None) -> Dict[str, Any]:
    """Build context for password reset email."""
    if reset_url is None:
        reset_url = f"{getattr(settings, 'FRONTEND_URL', 'https://cloudmanager.dz')}/reset-password?token={reset_token}"
    return build_base_context(
        user_name=user_name,
        reset_token=reset_token,
        reset_link=reset_url,
    )


def build_ticket_created_context(ticket_id: str, subject: str) -> Dict[str, Any]:
    """Build context for ticket created email."""
    return build_base_context(
        ticket_id=ticket_id,
        subject=subject,
    )


def build_ticket_reply_context(
    ticket_id: str,
    subject: str,
    reply_author: str,
    is_internal: bool = False,
) -> Dict[str, Any]:
    """Build context for ticket reply email."""
    return build_base_context(
        ticket_id=ticket_id,
        subject=subject,
        reply_author=reply_author,
        is_internal=is_internal,
    )


def build_ticket_status_change_context(
    ticket_id: str,
    subject: str,
    old_status: str,
    new_status: str,
) -> Dict[str, Any]:
    """Build context for ticket status change email."""
    return build_base_context(
        ticket_id=ticket_id,
        subject=subject,
        old_status=old_status,
        new_status=new_status,
    )


def build_ticket_assigned_context(ticket_id: str, subject: str, assigned_to: str) -> Dict[str, Any]:
    """Build context for ticket assigned email."""
    return build_base_context(
        ticket_id=ticket_id,
        subject=subject,
        assigned_to=assigned_to,
    )


def build_ticket_closed_context(ticket_id: str, subject: str) -> Dict[str, Any]:
    """Build context for ticket closed email."""
    return build_base_context(
        ticket_id=ticket_id,
        subject=subject,
    )


def build_invoice_sent_context(
    invoice_number: str,
    customer_name: str,
    title: str,
    total_amount: float,
    due_date: str,
) -> Dict[str, Any]:
    """Build context for invoice sent email."""
    return build_base_context(
        invoice_number=invoice_number,
        customer_name=customer_name,
        title=title,
        total_amount=total_amount,
        due_date=due_date,
    )


def build_email_verification_context(
    full_name: str,
    verification_link: str,
    expires_in_hours: int = 24,
) -> Dict[str, Any]:
    """Build context for email verification email."""
    return build_base_context(
        full_name=full_name,
        verification_link=verification_link,
        expires_in_hours=expires_in_hours,
    )


def build_quote_sent_context(
    quote_number: str,
    customer_name: str,
    title: str,
    total_amount: float,
    valid_until: str,
) -> Dict[str, Any]:
    """Build context for quote sent email."""
    return build_base_context(
        quote_number=quote_number,
        customer_name=customer_name,
        title=title,
        total_amount=total_amount,
        valid_until=valid_until,
    )


def build_order_status_context(order_id: str, status: str) -> Dict[str, Any]:
    """Build context for order status email."""
    return build_base_context(
        order_id=order_id,
        status=status,
    )
