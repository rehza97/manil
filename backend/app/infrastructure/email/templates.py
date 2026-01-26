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


def ticket_reply_template(ticket_id: str, subject: str, reply_author: str, is_internal: bool = False) -> Dict[str, str]:
    """
    Ticket reply notification email.

    Args:
        ticket_id: Ticket ID
        subject: Ticket subject
        reply_author: Name of person who replied
        is_internal: Whether the reply is internal (staff-only)

    Returns:
        Dict with subject and HTML body
    """
    internal_note = "<p><em>This is an internal note and not visible to the customer.</em></p>" if is_internal else ""

    content = f"""
        <h2>New Reply on Ticket {ticket_id}</h2>
        <p>Your support ticket has received a new reply.</p>
        <p><strong>Ticket ID:</strong> {ticket_id}</p>
        <p><strong>Subject:</strong> {subject}</p>
        <p><strong>Replied by:</strong> {reply_author}</p>
        {internal_note}
        <a href="https://cloudmanager.dz/tickets/{ticket_id}" class="button">View Ticket</a>
    """

    return {
        "subject": f"Re: {subject} (Ticket {ticket_id})",
        "html": get_base_template(content),
        "text": f"New reply on ticket {ticket_id}: {subject}",
    }


def ticket_status_change_template(ticket_id: str, subject: str, old_status: str, new_status: str) -> Dict[str, str]:
    """
    Ticket status change notification email.

    Args:
        ticket_id: Ticket ID
        subject: Ticket subject
        old_status: Previous status
        new_status: New status

    Returns:
        Dict with subject and HTML body
    """
    content = f"""
        <h2>Ticket Status Changed</h2>
        <p>Your support ticket status has been updated.</p>
        <p><strong>Ticket ID:</strong> {ticket_id}</p>
        <p><strong>Subject:</strong> {subject}</p>
        <p><strong>Previous Status:</strong> {old_status.replace('_', ' ').title()}</p>
        <p><strong>New Status:</strong> {new_status.replace('_', ' ').title()}</p>
        <a href="https://cloudmanager.dz/tickets/{ticket_id}" class="button">View Ticket</a>
    """

    return {
        "subject": f"Ticket {ticket_id} - Status Updated to {new_status.replace('_', ' ').title()}",
        "html": get_base_template(content),
        "text": f"Ticket {ticket_id} status changed to {new_status.replace('_', ' ').title()}",
    }


def ticket_assigned_template(ticket_id: str, subject: str, assigned_to: str) -> Dict[str, str]:
    """
    Ticket assignment notification email.

    Args:
        ticket_id: Ticket ID
        subject: Ticket subject
        assigned_to: Name of assigned agent

    Returns:
        Dict with subject and HTML body
    """
    content = f"""
        <h2>Ticket Assigned to You</h2>
        <p>A support ticket has been assigned to you.</p>
        <p><strong>Ticket ID:</strong> {ticket_id}</p>
        <p><strong>Subject:</strong> {subject}</p>
        <p><strong>Assigned to:</strong> {assigned_to}</p>
        <a href="https://cloudmanager.dz/tickets/{ticket_id}" class="button">View Ticket</a>
    """

    return {
        "subject": f"Ticket {ticket_id} Assigned to You",
        "html": get_base_template(content),
        "text": f"Ticket {ticket_id} assigned to {assigned_to}",
    }


def ticket_closed_template(ticket_id: str, subject: str) -> Dict[str, str]:
    """
    Ticket closed notification email.

    Args:
        ticket_id: Ticket ID
        subject: Ticket subject

    Returns:
        Dict with subject and HTML body
    """
    content = f"""
        <h2>Ticket Closed</h2>
        <p>Your support ticket has been closed.</p>
        <p><strong>Ticket ID:</strong> {ticket_id}</p>
        <p><strong>Subject:</strong> {subject}</p>
        <p>If you need further assistance, please feel free to open a new ticket.</p>
        <a href="https://cloudmanager.dz/tickets" class="button">View All Tickets</a>
    """

    return {
        "subject": f"Ticket {ticket_id} - Closed",
        "html": get_base_template(content),
        "text": f"Ticket {ticket_id} has been closed",
    }


def quote_sent_template(
    quote_number: str,
    customer_name: str,
    title: str,
    total_amount: float,
    valid_until: str,
) -> Dict[str, str]:
    """
    Quote sent notification email.

    Args:
        quote_number: Quote number
        customer_name: Customer name
        title: Quote title
        total_amount: Quote total amount
        valid_until: Quote expiration date

    Returns:
        Dict with subject and HTML body
    """
    content = f"""
        <h2>New Quote Available</h2>
        <p>Dear {customer_name},</p>
        <p>We are pleased to provide you with the following quote:</p>
        <div style="background: white; padding: 15px; margin: 20px 0; border-left: 4px solid #2563eb;">
            <p><strong>Quote Number:</strong> {quote_number}</p>
            <p><strong>Title:</strong> {title}</p>
            <p><strong>Total Amount:</strong> {total_amount:,.2f} DZD</p>
            <p><strong>Valid Until:</strong> {valid_until}</p>
        </div>
        <p>Please find the detailed quote attached to this email.</p>
        <p>If you have any questions or would like to proceed, please don't hesitate to contact us.</p>
        <a href="https://cloudmanager.dz/quotes/{quote_number}" class="button">View Quote</a>
    """

    return {
        "subject": f"Quote {quote_number} - {title}",
        "html": get_base_template(content),
        "text": f"New quote {quote_number}: {title}. Total: {total_amount:,.2f} DZD. Valid until: {valid_until}",
    }


def invoice_sent_template_with_attachment(
    invoice_number: str,
    customer_name: str,
    title: str,
    total_amount: float,
    due_date: str,
) -> Dict[str, str]:
    """
    Invoice sent notification email with attachment.

    Args:
        invoice_number: Invoice number
        customer_name: Customer name
        title: Invoice title
        total_amount: Invoice total amount
        due_date: Payment due date

    Returns:
        Dict with subject and HTML body
    """
    content = f"""
        <h2>New Invoice</h2>
        <p>Dear {customer_name},</p>
        <p>You have received a new invoice from CloudManager:</p>
        <div style="background: white; padding: 15px; margin: 20px 0; border-left: 4px solid #2563eb;">
            <p><strong>Invoice Number:</strong> {invoice_number}</p>
            <p><strong>Title:</strong> {title}</p>
            <p><strong>Total Amount:</strong> {total_amount:,.2f} DZD</p>
            <p><strong>Due Date:</strong> {due_date}</p>
        </div>
        <p>Please find the detailed invoice attached to this email.</p>
        <p>We appreciate your business and look forward to serving you.</p>
        <a href="https://cloudmanager.dz/invoices/{invoice_number}" class="button">View & Pay Invoice</a>
    """

    return {
        "subject": f"Invoice {invoice_number} - {title}",
        "html": get_base_template(content),
        "text": f"New invoice {invoice_number}: {title}. Amount: {total_amount:,.2f} DZD. Due: {due_date}",
    }


def email_verification_template(full_name: str, verification_link: str, expires_in_hours: int = 24) -> Dict[str, str]:
    """
    Email verification template for registration.

    Args:
        full_name: User's full name
        verification_link: Email verification link
        expires_in_hours: Link expiration time in hours

    Returns:
        Dict with subject and HTML body
    """
    content = f"""
        <h2>Verify Your Email Address</h2>
        <p>Hi {full_name},</p>
        <p>Thank you for registering with CloudManager. Please verify your email address by clicking the button below:</p>
        <a href="{verification_link}" class="button">Verify Email</a>
        <p>This verification link will expire in {expires_in_hours} hours.</p>
        <p>If you didn't create an account, please ignore this email.</p>
    """

    return {
        "subject": "Verify Your Email Address - CloudManager",
        "html": get_base_template(content),
        "text": f"Verify your email: {verification_link}",
    }


def quote_creation_template(customer_name: str, quote_id: str, title: str, quantity: int, quote_link: str) -> Dict[str, str]:
    """
    Quote request creation notification email.

    Args:
        customer_name: Customer name
        quote_id: Quote request ID
        title: Quote title
        quantity: Requested quantity
        quote_link: Link to view quote

    Returns:
        Dict with subject and HTML body
    """
    content = f"""
        <h2>Quote Request Received</h2>
        <p>Dear {customer_name},</p>
        <p>Thank you for your quote request. We have received your request and will review it shortly.</p>
        <div style="background: white; padding: 15px; margin: 20px 0; border-left: 4px solid #2563eb;">
            <p><strong>Quote Request ID:</strong> {quote_id[:8]}</p>
            <p><strong>Title:</strong> {title}</p>
            <p><strong>Quantity:</strong> {quantity}</p>
        </div>
        <p>Our team will review your request and get back to you soon.</p>
        <a href="{quote_link}" class="button">View Quote Request</a>
    """

    return {
        "subject": f"Quote Request #{quote_id[:8]} Received",
        "html": get_base_template(content),
        "text": f"Quote request {quote_id[:8]} received: {title}",
    }


def quote_reviewed_template(customer_name: str, quote_id: str, title: str, message: str, quote_link: str) -> Dict[str, str]:
    """
    Quote reviewed notification email.

    Args:
        customer_name: Customer name
        quote_id: Quote request ID
        title: Quote title
        message: Review message
        quote_link: Link to view quote

    Returns:
        Dict with subject and HTML body
    """
    content = f"""
        <h2>Quote Reviewed</h2>
        <p>Dear {customer_name},</p>
        <p>{message}</p>
        <div style="background: white; padding: 15px; margin: 20px 0; border-left: 4px solid #2563eb;">
            <p><strong>Quote ID:</strong> {quote_id[:8]}</p>
            <p><strong>Title:</strong> {title}</p>
        </div>
        <a href="{quote_link}" class="button">View Quote</a>
    """

    return {
        "subject": f"Quote #{quote_id[:8]} Reviewed",
        "html": get_base_template(content),
        "text": f"Quote {quote_id[:8]} reviewed: {title}",
    }


def quote_quoted_template(customer_name: str, quote_id: str, title: str, price: float, message: str, quote_link: str) -> Dict[str, str]:
    """
    Quote price provided notification email.

    Args:
        customer_name: Customer name
        quote_id: Quote request ID
        title: Quote title
        price: Quoted price
        message: Additional message
        quote_link: Link to view quote

    Returns:
        Dict with subject and HTML body
    """
    content = f"""
        <h2>Quote Price Ready</h2>
        <p>Dear {customer_name},</p>
        <p>{message}</p>
        <div style="background: white; padding: 15px; margin: 20px 0; border-left: 4px solid #2563eb;">
            <p><strong>Quote ID:</strong> {quote_id[:8]}</p>
            <p><strong>Title:</strong> {title}</p>
            <p><strong>Quoted Price:</strong> {price:,.2f} DZD</p>
        </div>
        <a href="{quote_link}" class="button">View Quote Details</a>
    """

    return {
        "subject": f"Quote #{quote_id[:8]} - Price Quote Ready",
        "html": get_base_template(content),
        "text": f"Quote {quote_id[:8]} price ready: {price:,.2f} DZD",
    }


def quote_accepted_customer_template(customer_name: str, quote_id: str, title: str, message: str, quote_link: str) -> Dict[str, str]:
    """
    Quote accepted notification email for customer.

    Args:
        customer_name: Customer name
        quote_id: Quote request ID
        title: Quote title
        message: Acceptance message
        quote_link: Link to view quote

    Returns:
        Dict with subject and HTML body
    """
    content = f"""
        <h2>Quote Accepted</h2>
        <p>Dear {customer_name},</p>
        <p>{message}</p>
        <div style="background: white; padding: 15px; margin: 20px 0; border-left: 4px solid #2563eb;">
            <p><strong>Quote ID:</strong> {quote_id[:8]}</p>
            <p><strong>Title:</strong> {title}</p>
        </div>
        <p>We will proceed with your order and keep you updated on the progress.</p>
        <a href="{quote_link}" class="button">View Quote</a>
    """

    return {
        "subject": f"Quote #{quote_id[:8]} - Accepted",
        "html": get_base_template(content),
        "text": f"Quote {quote_id[:8]} accepted: {title}",
    }


def quote_accepted_corporate_template(customer_name: str, customer_email: str, quote_id: str, title: str, price: float, quote_link: str) -> Dict[str, str]:
    """
    Quote accepted notification email for corporate team.

    Args:
        customer_name: Customer name
        customer_email: Customer email
        quote_id: Quote request ID
        title: Quote title
        price: Final price
        quote_link: Link to view quote

    Returns:
        Dict with subject and HTML body
    """
    content = f"""
        <h2>Quote Accepted by Customer</h2>
        <p>A quote has been accepted by a customer.</p>
        <div style="background: white; padding: 15px; margin: 20px 0; border-left: 4px solid #2563eb;">
            <p><strong>Customer:</strong> {customer_name} ({customer_email})</p>
            <p><strong>Quote ID:</strong> {quote_id[:8]}</p>
            <p><strong>Title:</strong> {title}</p>
            <p><strong>Final Price:</strong> {price:,.2f} DZD</p>
        </div>
        <p>Please proceed with order processing.</p>
        <a href="{quote_link}" class="button">View Quote</a>
    """

    return {
        "subject": f"Quote #{quote_id[:8]} - Accepted by Customer",
        "html": get_base_template(content),
        "text": f"Quote {quote_id[:8]} accepted by {customer_name}",
    }


def quote_rejected_customer_template(customer_name: str, quote_id: str, title: str, reason: str, message: str, quote_link: str) -> Dict[str, str]:
    """
    Quote rejected notification email for customer.

    Args:
        customer_name: Customer name
        quote_id: Quote request ID
        title: Quote title
        reason: Rejection reason
        message: Additional message
        quote_link: Link to view quote

    Returns:
        Dict with subject and HTML body
    """
    content = f"""
        <h2>Quote Status Update</h2>
        <p>Dear {customer_name},</p>
        <p>{message}</p>
        <div style="background: white; padding: 15px; margin: 20px 0; border-left: 4px solid #2563eb;">
            <p><strong>Quote ID:</strong> {quote_id[:8]}</p>
            <p><strong>Title:</strong> {title}</p>
            <p><strong>Reason:</strong> {reason}</p>
        </div>
        <p>If you have any questions, please don't hesitate to contact us.</p>
        <a href="{quote_link}" class="button">View Quote</a>
    """

    return {
        "subject": f"Quote #{quote_id[:8]} - Status Update",
        "html": get_base_template(content),
        "text": f"Quote {quote_id[:8]} status update: {title}",
    }


def quote_rejected_corporate_template(customer_name: str, customer_email: str, quote_id: str, title: str, reason: str, quote_link: str) -> Dict[str, str]:
    """
    Quote rejected notification email for corporate team.

    Args:
        customer_name: Customer name
        customer_email: Customer email
        quote_id: Quote request ID
        title: Quote title
        reason: Rejection reason
        quote_link: Link to view quote

    Returns:
        Dict with subject and HTML body
    """
    content = f"""
        <h2>Quote Rejected</h2>
        <p>A quote has been rejected.</p>
        <div style="background: white; padding: 15px; margin: 20px 0; border-left: 4px solid #2563eb;">
            <p><strong>Customer:</strong> {customer_name} ({customer_email})</p>
            <p><strong>Quote ID:</strong> {quote_id[:8]}</p>
            <p><strong>Title:</strong> {title}</p>
            <p><strong>Reason:</strong> {reason or 'Not specified'}</p>
        </div>
        <a href="{quote_link}" class="button">View Quote</a>
    """

    return {
        "subject": f"Quote #{quote_id[:8]} - Rejected",
        "html": get_base_template(content),
        "text": f"Quote {quote_id[:8]} rejected: {title}",
    }


def service_request_confirmation_template(customer_name: str, service_id: str, service_type: str, message: str, service_link: str) -> Dict[str, str]:
    """
    Service request confirmation email.

    Args:
        customer_name: Customer name
        service_id: Service request ID
        service_type: Type of service requested
        message: Confirmation message
        service_link: Link to view service request

    Returns:
        Dict with subject and HTML body
    """
    content = f"""
        <h2>Service Request Received</h2>
        <p>Dear {customer_name},</p>
        <p>{message}</p>
        <div style="background: white; padding: 15px; margin: 20px 0; border-left: 4px solid #2563eb;">
            <p><strong>Service Request ID:</strong> {service_id[:8]}</p>
            <p><strong>Service Type:</strong> {service_type}</p>
        </div>
        <a href="{service_link}" class="button">View Service Request</a>
    """

    return {
        "subject": f"Service Request #{service_id[:8]} Received",
        "html": get_base_template(content),
        "text": f"Service request {service_id[:8]} received: {service_type}",
    }


def vps_welcome_template(subscription_number: str, ip_address: str, ssh_port: int, container_name: str) -> Dict[str, str]:
    """
    VPS provisioning welcome email with connection details.

    Args:
        subscription_number: VPS subscription number
        ip_address: VPS IP address
        ssh_port: SSH port number
        container_name: Docker container name

    Returns:
        Dict with subject and HTML body
    """
    content = f"""
        <h2>Your VPS is Ready!</h2>
        <p>Your VPS hosting subscription has been successfully provisioned.</p>
        <div style="background: white; padding: 15px; margin: 20px 0; border-left: 4px solid #2563eb;">
            <p><strong>Subscription:</strong> {subscription_number}</p>
            <p><strong>IP Address:</strong> {ip_address}</p>
            <p><strong>SSH Port:</strong> {ssh_port}</p>
            <p><strong>Container:</strong> {container_name}</p>
        </div>
        <h3>Connection Details:</h3>
        <p>You can connect via SSH using:</p>
        <pre style="background: #f3f4f6; padding: 10px; border-radius: 5px; overflow-x: auto;">ssh root@{ip_address} -p {ssh_port}</pre>
        <p><strong>Note:</strong> Your root password has been sent separately for security.</p>
        <a href="https://cloudmanager.dz/vps/subscriptions/{subscription_number}" class="button">Manage VPS</a>
    """

    return {
        "subject": f"Your VPS is Ready - {subscription_number}",
        "html": get_base_template(content),
        "text": f"VPS {subscription_number} ready. IP: {ip_address}, SSH Port: {ssh_port}",
    }


def vps_alert_template(subscription_number: str, alert_type: str, severity: str, threshold: float, detected_at: str, subscription_link: str) -> Dict[str, str]:
    """
    VPS resource alert notification email.

    Args:
        subscription_number: VPS subscription number
        alert_type: Type of alert (CPU, Memory, Disk)
        severity: Alert severity (warning, critical)
        threshold: Alert threshold percentage
        detected_at: Detection timestamp
        subscription_link: Link to subscription details

    Returns:
        Dict with subject and HTML body
    """
    severity_color = "#f59e0b" if severity == "warning" else "#ef4444"
    content = f"""
        <h2>VPS Resource Alert</h2>
        <p>Your VPS has triggered a resource usage alert.</p>
        <div style="background: white; padding: 15px; margin: 20px 0; border-left: 4px solid {severity_color};">
            <p><strong>Subscription:</strong> {subscription_number}</p>
            <p><strong>Alert Type:</strong> {alert_type}</p>
            <p><strong>Severity:</strong> <span style="color: {severity_color}; font-weight: bold;">{severity.upper()}</span></p>
            <p><strong>Threshold:</strong> {threshold:.2f}%</p>
            <p><strong>Detected At:</strong> {detected_at}</p>
        </div>
        <p>Please review your VPS resource usage and consider upgrading your plan if this continues.</p>
        <a href="{subscription_link}" class="button">View VPS Details</a>
    """

    return {
        "subject": f"VPS Alert: {alert_type} - {subscription_number}",
        "html": get_base_template(content),
        "text": f"VPS {subscription_number} {alert_type} alert: {severity}",
    }


def vps_provisioning_failure_template(subscription_id: str, task_id: str, error_message: str, timestamp: str) -> Dict[str, str]:
    """
    VPS provisioning failure notification email.

    Args:
        subscription_id: Subscription ID
        task_id: Task ID
        error_message: Error message
        timestamp: Failure timestamp

    Returns:
        Dict with subject and HTML body
    """
    content = f"""
        <h2>VPS Provisioning Failed</h2>
        <p>The VPS provisioning task failed after multiple retries.</p>
        <div style="background: #fee2e2; padding: 15px; margin: 20px 0; border-left: 4px solid #ef4444;">
            <p><strong>Subscription ID:</strong> {subscription_id}</p>
            <p><strong>Task ID:</strong> {task_id}</p>
            <p><strong>Error:</strong> {error_message}</p>
            <p><strong>Timestamp:</strong> {timestamp}</p>
        </div>
        <p>Please check the logs and investigate the issue.</p>
    """

    return {
        "subject": f"VPS Provisioning Failed: Subscription {subscription_id}",
        "html": get_base_template(content),
        "text": f"VPS provisioning failed for {subscription_id}: {error_message}",
    }


def invoice_initial_template(subscription_number: str, invoice_number: str, total_amount: float, due_date: str, invoice_link: str) -> Dict[str, str]:
    """
    Initial invoice notification email for VPS subscription.

    Args:
        subscription_number: VPS subscription number
        invoice_number: Invoice number
        total_amount: Invoice total amount
        due_date: Payment due date
        invoice_link: Link to invoice

    Returns:
        Dict with subject and HTML body
    """
    content = f"""
        <h2>Initial Invoice Ready</h2>
        <p>Dear Customer,</p>
        <p>Your VPS subscription has been activated and your initial invoice is ready.</p>
        <div style="background: white; padding: 15px; margin: 20px 0; border-left: 4px solid #2563eb;">
            <p><strong>Subscription:</strong> {subscription_number}</p>
            <p><strong>Invoice Number:</strong> {invoice_number}</p>
            <p><strong>Total Amount:</strong> {total_amount:,.2f} DZD</p>
            <p><strong>Due Date:</strong> {due_date}</p>
        </div>
        <p>This invoice includes the setup fee and first month's subscription.</p>
        <a href="{invoice_link}" class="button">View Invoice</a>
    """

    return {
        "subject": f"Invoice {invoice_number} - Initial Invoice",
        "html": get_base_template(content),
        "text": f"Initial invoice {invoice_number}: {total_amount:,.2f} DZD, Due: {due_date}",
    }


def invoice_recurring_template(subscription_number: str, invoice_number: str, total_amount: float, due_date: str, invoice_link: str) -> Dict[str, str]:
    """
    Recurring invoice notification email.

    Args:
        subscription_number: VPS subscription number
        invoice_number: Invoice number
        total_amount: Invoice total amount
        due_date: Payment due date
        invoice_link: Link to invoice

    Returns:
        Dict with subject and HTML body
    """
    content = f"""
        <h2>Monthly Invoice</h2>
        <p>Dear Customer,</p>
        <p>Your monthly recurring invoice is ready.</p>
        <div style="background: white; padding: 15px; margin: 20px 0; border-left: 4px solid #2563eb;">
            <p><strong>Subscription:</strong> {subscription_number}</p>
            <p><strong>Invoice Number:</strong> {invoice_number}</p>
            <p><strong>Total Amount:</strong> {total_amount:,.2f} DZD</p>
            <p><strong>Due Date:</strong> {due_date}</p>
        </div>
        <p>Please make payment by the due date to avoid service interruption.</p>
        <a href="{invoice_link}" class="button">View & Pay Invoice</a>
    """

    return {
        "subject": f"Invoice {invoice_number} - Monthly Recurring",
        "html": get_base_template(content),
        "text": f"Recurring invoice {invoice_number}: {total_amount:,.2f} DZD, Due: {due_date}",
    }


def invoice_overdue_template(subscription_number: str, invoice_number: str, total_amount: float, days_overdue: int, invoice_link: str) -> Dict[str, str]:
    """
    Overdue invoice warning email.

    Args:
        subscription_number: VPS subscription number
        invoice_number: Invoice number
        total_amount: Invoice total amount
        days_overdue: Number of days overdue
        invoice_link: Link to invoice

    Returns:
        Dict with subject and HTML body
    """
    content = f"""
        <h2>Invoice Overdue - Action Required</h2>
        <p>Dear Customer,</p>
        <p>Your invoice is now overdue. Please make payment immediately to avoid service suspension.</p>
        <div style="background: #fee2e2; padding: 15px; margin: 20px 0; border-left: 4px solid #ef4444;">
            <p><strong>Subscription:</strong> {subscription_number}</p>
            <p><strong>Invoice Number:</strong> {invoice_number}</p>
            <p><strong>Total Amount:</strong> {total_amount:,.2f} DZD</p>
            <p><strong>Days Overdue:</strong> {days_overdue}</p>
        </div>
        <p><strong>Important:</strong> Failure to pay may result in service suspension.</p>
        <a href="{invoice_link}" class="button">Pay Invoice Now</a>
    """

    return {
        "subject": f"URGENT: Invoice {invoice_number} Overdue",
        "html": get_base_template(content),
        "text": f"Overdue invoice {invoice_number}: {total_amount:,.2f} DZD ({days_overdue} days overdue)",
    }


def payment_confirmation_template(customer_name: str, invoice_number: str, payment_amount: float, payment_date: str, invoice_link: str) -> Dict[str, str]:
    """
    Payment received confirmation email.

    Args:
        customer_name: Customer name
        invoice_number: Invoice number
        payment_amount: Payment amount
        payment_date: Payment date
        invoice_link: Link to invoice

    Returns:
        Dict with subject and HTML body
    """
    content = f"""
        <h2>Payment Received</h2>
        <p>Dear {customer_name},</p>
        <p>Thank you! We have received your payment.</p>
        <div style="background: white; padding: 15px; margin: 20px 0; border-left: 4px solid #10b981;">
            <p><strong>Invoice Number:</strong> {invoice_number}</p>
            <p><strong>Payment Amount:</strong> {payment_amount:,.2f} DZD</p>
            <p><strong>Payment Date:</strong> {payment_date}</p>
        </div>
        <p>Your payment has been processed successfully.</p>
        <a href="{invoice_link}" class="button">View Invoice</a>
    """

    return {
        "subject": f"Payment Received - Invoice {invoice_number}",
        "html": get_base_template(content),
        "text": f"Payment received for invoice {invoice_number}: {payment_amount:,.2f} DZD",
    }
