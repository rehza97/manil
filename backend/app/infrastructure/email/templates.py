"""
Email templates for various notifications.

All templates support variable substitution and HTML formatting.
"""

from typing import Dict


def get_base_template(content: str) -> str:
    """
    Get base HTML template with branding.

    Args:
        content: Main content HTML

    Returns:
        Complete HTML email template
    """
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: #2563eb; color: white; padding: 20px; text-align: center; }}
            .content {{ padding: 20px; background: #f9fafb; }}
            .footer {{ padding: 20px; text-align: center; font-size: 12px; color: #666; }}
            .button {{ display: inline-block; padding: 12px 24px; background: #2563eb;
                      color: white; text-decoration: none; border-radius: 5px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>CloudManager</h1>
            </div>
            <div class="content">
                {content}
            </div>
            <div class="footer">
                <p>&copy; 2025 CloudManager. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """


def welcome_email_template(user_name: str) -> Dict[str, str]:
    """
    Welcome email for new users.

    Args:
        user_name: Name of the user

    Returns:
        Dict with subject and HTML body
    """
    content = f"""
        <h2>Welcome to CloudManager!</h2>
        <p>Hi {user_name},</p>
        <p>Thank you for registering with CloudManager. Your account has been created successfully.</p>
        <p>You can now log in and start managing your cloud services.</p>
        <a href="https://cloudmanager.dz/login" class="button">Log In</a>
    """

    return {
        "subject": "Welcome to CloudManager",
        "html": get_base_template(content),
        "text": f"Welcome to CloudManager! Hi {user_name}, your account has been created.",
    }


def password_reset_template(user_name: str, reset_token: str) -> Dict[str, str]:
    """
    Password reset email template.

    Args:
        user_name: Name of the user
        reset_token: Password reset token

    Returns:
        Dict with subject and HTML body
    """
    reset_link = f"https://cloudmanager.dz/reset-password?token={reset_token}"

    content = f"""
        <h2>Password Reset Request</h2>
        <p>Hi {user_name},</p>
        <p>We received a request to reset your password. Click the button below to proceed:</p>
        <a href="{reset_link}" class="button">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
    """

    return {
        "subject": "Password Reset Request",
        "html": get_base_template(content),
        "text": f"Password reset link: {reset_link}",
    }


def password_reset_url_template(user_name: str, reset_url: str) -> Dict[str, str]:
    """
    Password reset email template with full URL.

    Args:
        user_name: Name of the user
        reset_url: Complete password reset URL

    Returns:
        Dict with subject and HTML body
    """
    content = f"""
        <h2>Password Reset Request</h2>
        <p>Hi {user_name},</p>
        <p>We received a request to reset your password. Click the button below to proceed:</p>
        <a href="{reset_url}" class="button">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
    """

    return {
        "subject": "Password Reset Request",
        "html": get_base_template(content),
        "text": f"Password reset link: {reset_url}",
    }


def ticket_created_template(ticket_id: str, subject: str) -> Dict[str, str]:
    """
    Ticket creation confirmation email.

    Args:
        ticket_id: Ticket ID
        subject: Ticket subject

    Returns:
        Dict with subject and HTML body
    """
    content = f"""
        <h2>Ticket Created Successfully</h2>
        <p>Your support ticket has been created.</p>
        <p><strong>Ticket ID:</strong> {ticket_id}</p>
        <p><strong>Subject:</strong> {subject}</p>
        <p>Our support team will review your request and respond shortly.</p>
        <a href="https://cloudmanager.dz/tickets/{ticket_id}" class="button">View Ticket</a>
    """

    return {
        "subject": f"Ticket Created: {ticket_id}",
        "html": get_base_template(content),
        "text": f"Ticket {ticket_id} created: {subject}",
    }


def order_status_template(order_id: str, status: str) -> Dict[str, str]:
    """
    Order status update email.

    Args:
        order_id: Order ID
        status: New order status

    Returns:
        Dict with subject and HTML body
    """
    content = f"""
        <h2>Order Status Update</h2>
        <p>Your order status has been updated.</p>
        <p><strong>Order ID:</strong> {order_id}</p>
        <p><strong>New Status:</strong> {status}</p>
        <a href="https://cloudmanager.dz/orders/{order_id}" class="button">View Order</a>
    """

    return {
        "subject": f"Order {order_id} - Status Update",
        "html": get_base_template(content),
        "text": f"Order {order_id} status: {status}",
    }


def invoice_sent_template(invoice_id: str, amount: float) -> Dict[str, str]:
    """
    Invoice sent notification email.

    Args:
        invoice_id: Invoice ID
        amount: Invoice amount

    Returns:
        Dict with subject and HTML body
    """
    content = f"""
        <h2>New Invoice</h2>
        <p>You have received a new invoice.</p>
        <p><strong>Invoice ID:</strong> {invoice_id}</p>
        <p><strong>Amount:</strong> {amount:,.2f} DZD</p>
        <a href="https://cloudmanager.dz/invoices/{invoice_id}" class="button">View Invoice</a>
    """

    return {
        "subject": f"Invoice {invoice_id}",
        "html": get_base_template(content),
        "text": f"Invoice {invoice_id}: {amount:,.2f} DZD",
    }
