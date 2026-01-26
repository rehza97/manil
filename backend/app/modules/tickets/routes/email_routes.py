"""Email account and mail-to-ticket API routes.

Handles:
- Email account CRUD operations
- Email message viewing and management
- Webhook endpoints for email service providers
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
import uuid
from datetime import datetime, timezone
from typing import Optional, List

from app.config.database import get_sync_db
from app.modules.tickets.models import EmailAccount, EmailMessage, EmailBounce
from app.modules.tickets.services.imap_service import IMAPService, IMAPError
from app.modules.tickets.services.email_parser_service import EmailParserService, EmailParseError
from app.modules.tickets.services.email_to_ticket_service import EmailToTicketService
from app.modules.tickets.services.spam_filter_service import SpamFilterService
from app.modules.tickets.services.webhook_service import WebhookService
from app.modules.notifications.services.bounce_service import BounceService
from app.modules.tickets.notifications import TicketNotificationService
from app.core.dependencies import get_current_user, require_permission
from app.core.permissions import Permission
from app.modules.auth.models import User
from app.config.database import AsyncSessionLocal
from app.modules.notifications.service import user_id_by_email
from app.modules.settings.service import UserNotificationPreferencesService
from app.core.logging import logger

# Pydantic models for request/response
from pydantic import BaseModel, EmailStr
from enum import Enum


class EmailAccountCreate(BaseModel):
    """Create email account request."""

    email_address: EmailStr
    imap_server: str
    imap_port: int = 993
    imap_username: str
    imap_password: str
    use_tls: bool = True
    polling_interval_minutes: int = 5


class EmailAccountUpdate(BaseModel):
    """Update email account request."""

    imap_server: Optional[str] = None
    imap_port: Optional[int] = None
    imap_username: Optional[str] = None
    imap_password: Optional[str] = None
    use_tls: Optional[bool] = None
    polling_interval_minutes: Optional[int] = None
    is_active: Optional[bool] = None


class EmailAccountResponse(BaseModel):
    """Email account response model."""

    id: str
    email_address: str
    imap_server: str
    imap_port: int
    use_tls: bool
    polling_interval_minutes: int
    is_active: bool
    last_checked_at: Optional[datetime] = None
    last_error: Optional[str] = None
    error_count: int

    class Config:
        from_attributes = True


class EmailMessageResponse(BaseModel):
    """Email message response model."""

    id: str
    message_id: str
    from_address: str
    subject: str
    body_text: Optional[str] = None
    received_at: datetime
    ticket_id: Optional[str] = None
    spam_score: int
    is_spam: bool
    has_attachments: bool
    attachment_count: int

    class Config:
        from_attributes = True


class TestConnectionResponse(BaseModel):
    """Test connection response model."""

    success: bool
    message: str


class SyncResponse(BaseModel):
    """Sync response model."""

    emails_processed: int
    tickets_created: int
    replies_added: int
    errors: List[str] = []


# Create router
router = APIRouter(prefix="/api/v1/email-accounts", tags=["email"])


# ============================================================================
# Email Account CRUD Endpoints
# ============================================================================


@router.post("", response_model=EmailAccountResponse, status_code=status.HTTP_201_CREATED)
async def create_email_account(
    request: EmailAccountCreate,
    db: Session = Depends(get_sync_db),
    current_user: User = Depends(require_permission(Permission.EMAIL_MANAGE)),
):
    """Create new email account.

    Args:
        request: Email account details
        db: Database session
        current_user: Current authenticated user

    Returns:
        EmailAccountResponse: Created account
    """

    # Check if account already exists
    existing = db.query(EmailAccount).filter(
        EmailAccount.email_address == request.email_address
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Email account {request.email_address} already exists",
        )

    # Encrypt password
    encrypted_password = IMAPService.encrypt_password(request.imap_password)

    # Create account
    account = EmailAccount(
        id=str(uuid.uuid4()),
        email_address=request.email_address,
        imap_server=request.imap_server,
        imap_port=request.imap_port,
        imap_username=request.imap_username,
        imap_password_encrypted=encrypted_password,
        use_tls=request.use_tls,
        polling_interval_minutes=request.polling_interval_minutes,
        is_active=True,
    )

    db.add(account)
    db.commit()
    db.refresh(account)

    return account


@router.get("", response_model=List[EmailAccountResponse])
async def list_email_accounts(
    db: Session = Depends(get_sync_db),
    current_user: User = Depends(require_permission(Permission.EMAIL_VIEW)),
):
    """List all email accounts.

    Args:
        db: Database session
        current_user: Current authenticated user

    Returns:
        List[EmailAccountResponse]: List of accounts
    """

    accounts = db.query(EmailAccount).all()
    return accounts


@router.get("/{account_id}", response_model=EmailAccountResponse)
async def get_email_account(
    account_id: str,
    db: Session = Depends(get_sync_db),
    current_user = Depends(get_current_user),
):
    """Get email account details.

    Args:
        account_id: Account ID
        db: Database session
        current_user: Current authenticated user

    Returns:
        EmailAccountResponse: Account details
    """
    require_admin(current_user)

    account = db.query(EmailAccount).filter(EmailAccount.id == account_id).first()

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email account not found",
        )

    return account


@router.put("/{account_id}", response_model=EmailAccountResponse)
async def update_email_account(
    account_id: str,
    request: EmailAccountUpdate,
    db: Session = Depends(get_sync_db),
    current_user: User = Depends(require_permission(Permission.EMAIL_MANAGE)),
):
    """Update email account.

    Args:
        account_id: Account ID
        request: Update data
        db: Database session
        current_user: Current authenticated user

    Returns:
        EmailAccountResponse: Updated account
    """

    account = db.query(EmailAccount).filter(EmailAccount.id == account_id).first()

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email account not found",
        )

    # Update fields
    if request.imap_server:
        account.imap_server = request.imap_server
    if request.imap_port:
        account.imap_port = request.imap_port
    if request.imap_username:
        account.imap_username = request.imap_username
    if request.imap_password:
        account.imap_password_encrypted = IMAPService.encrypt_password(request.imap_password)
    if request.use_tls is not None:
        account.use_tls = request.use_tls
    if request.polling_interval_minutes:
        account.polling_interval_minutes = request.polling_interval_minutes
    if request.is_active is not None:
        account.is_active = request.is_active

    account.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(account)

    return account


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_email_account(
    account_id: str,
    db: Session = Depends(get_sync_db),
    current_user = Depends(get_current_user),
):
    """Delete email account.

    Args:
        account_id: Account ID
        db: Database session
        current_user: Current authenticated user
    """
    require_admin(current_user)

    account = db.query(EmailAccount).filter(EmailAccount.id == account_id).first()

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email account not found",
        )

    db.delete(account)
    db.commit()


# ============================================================================
# Email Account Management Endpoints
# ============================================================================


@router.post("/{account_id}/test-connection", response_model=TestConnectionResponse)
async def test_connection(
    account_id: str,
    db: Session = Depends(get_sync_db),
    current_user: User = Depends(require_permission(Permission.EMAIL_MANAGE)),
):
    """Test IMAP connection for account.

    Args:
        account_id: Account ID
        db: Database session
        current_user: Current authenticated user

    Returns:
        TestConnectionResponse: Test result
    """

    account = db.query(EmailAccount).filter(EmailAccount.id == account_id).first()

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email account not found",
        )

    try:
        success, message = IMAPService.test_connection(account)
        return TestConnectionResponse(success=success, message=message)
    except Exception as e:
        return TestConnectionResponse(
            success=False,
            message=f"Connection test failed: {str(e)}",
        )


@router.post("/{account_id}/sync-now", response_model=SyncResponse)
async def sync_emails(
    account_id: str,
    db: Session = Depends(get_sync_db),
    current_user = Depends(get_current_user),
):
    """Sync emails from account now.

    Args:
        account_id: Account ID
        db: Database session
        current_user: Current authenticated user

    Returns:
        SyncResponse: Sync result
    """
    require_admin(current_user)

    account = db.query(EmailAccount).filter(EmailAccount.id == account_id).first()

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email account not found",
        )

    emails_processed = 0
    tickets_created = 0
    replies_added = 0
    errors = []

    try:
        # Fetch unseen emails
        imap_emails = IMAPService.fetch_unseen_emails(account, limit=50)

        for imap_email in imap_emails:
            try:
                # Parse email
                parsed_email = EmailParserService.parse_email(imap_email.raw_email)

                # Analyze for spam
                spam_analysis = SpamFilterService.analyze_email(parsed_email)

                # Convert to ticket
                result = EmailToTicketService.process_email(db, parsed_email, account)

                if result.success:
                    emails_processed += 1
                    if result.is_reply:
                        replies_added += 1
                    else:
                        tickets_created += 1
                        # Send acknowledgement (ticket-created) email to customer (respect prefs)
                        if result.customer_email and result.ticket_id and result.subject:
                            try:
                                async with AsyncSessionLocal() as adb:
                                    uid = await user_id_by_email(adb, result.customer_email)
                                    skip = False
                                    if uid:
                                        prefs_svc = UserNotificationPreferencesService(adb)
                                        prefs = await prefs_svc.get(uid)
                                        skip = not prefs.get("email", {}).get(
                                            "ticketUpdates", True
                                        )
                                if not skip:
                                    svc = TicketNotificationService()
                                    await svc.notify_ticket_created(
                                        result.customer_email,
                                        result.ticket_id,
                                        result.subject,
                                    )
                            except Exception as ack_err:
                                errors.append(
                                    f"Created ticket {result.ticket_id} but ack email failed: {ack_err}"
                                )

                    # Mark as seen
                    IMAPService.mark_as_seen(account, imap_email.uid)
                else:
                    errors.append(f"Failed to process {imap_email.message_id}: {result.error_message}")

            except Exception as e:
                errors.append(f"Error processing email: {str(e)}")

        # Update account sync timestamp
        account.last_checked_at = datetime.now(timezone.utc)
        account.error_count = 0
        db.commit()

        return SyncResponse(
            emails_processed=emails_processed,
            tickets_created=tickets_created,
            replies_added=replies_added,
            errors=errors,
        )

    except IMAPError as e:
        account.last_error = str(e)
        account.error_count += 1
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Email sync failed: {str(e)}",
        )


# ============================================================================
# Email Message Endpoints
# ============================================================================


@router.get("/messages", response_model=List[EmailMessageResponse])
async def list_email_messages(
    account_id: Optional[str] = None,
    ticket_id: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_sync_db),
    current_user: User = Depends(require_permission(Permission.EMAIL_HISTORY)),
):
    """List email messages.

    Args:
        account_id: Filter by account
        ticket_id: Filter by ticket
        limit: Maximum results
        db: Database session
        current_user: Current authenticated user

    Returns:
        List[EmailMessageResponse]: Email messages
    """

    query = db.query(EmailMessage)

    if account_id:
        query = query.filter(EmailMessage.email_account_id == account_id)

    if ticket_id:
        query = query.filter(EmailMessage.ticket_id == ticket_id)

    messages = query.order_by(EmailMessage.received_at.desc()).limit(limit).all()

    return messages


@router.get("/messages/{message_id}", response_model=EmailMessageResponse)
async def get_email_message(
    message_id: str,
    db: Session = Depends(get_sync_db),
    current_user: User = Depends(require_permission(Permission.EMAIL_HISTORY)),
):
    """Get email message details.

    Args:
        message_id: Message ID
        db: Database session
        current_user: Current authenticated user

    Returns:
        EmailMessageResponse: Message details
    """

    message = db.query(EmailMessage).filter(EmailMessage.id == message_id).first()

    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email message not found",
        )

    return message


@router.post("/messages/{message_id}/mark-spam")
async def mark_message_spam(
    message_id: str,
    db: Session = Depends(get_sync_db),
    current_user = Depends(get_current_user),
):
    """Mark email message as spam.

    Args:
        message_id: Message ID
        db: Database session
        current_user: Current authenticated user
    """
    require_admin(current_user)

    message = db.query(EmailMessage).filter(EmailMessage.id == message_id).first()

    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email message not found",
        )

    message.is_spam = True
    message.spam_score = 100
    db.commit()

    return {"status": "marked_spam"}


@router.delete("/messages/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_email_message(
    message_id: str,
    db: Session = Depends(get_sync_db),
    current_user: User = Depends(require_permission(Permission.EMAIL_MANAGE)),
):
    """Delete email message.

    Args:
        message_id: Message ID
        db: Database session
        current_user: Current authenticated user
    """

    message = db.query(EmailMessage).filter(EmailMessage.id == message_id).first()

    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email message not found",
        )

    db.delete(message)
    db.commit()


# ============================================================================
# Webhook Endpoints
# ============================================================================


@router.post("/webhooks/sendgrid")
async def handle_sendgrid_webhook(
    request: Request,
    db: Session = Depends(get_sync_db),
):
    """Handle SendGrid webhook events.

    Supports:
    - Inbound emails (converted to tickets)
    - Bounce events (tracked in bounce table)
    - Spam reports (tracked as bounces)

    Args:
        request: FastAPI request object
        db: Database session
    """
    from app.modules.tickets.services.webhook_service import WebhookService
    from app.modules.tickets.services.email_parser_service import EmailParserService
    from app.modules.tickets.services.email_to_ticket_service import EmailToTicketService
    from app.modules.notifications.services.bounce_service import BounceService
    from app.modules.tickets.models import EmailAccount
    from datetime import datetime
    
    try:
        # Get webhook payload (SendGrid sends JSON array)
        body = await request.body()
        payload = await request.json()
        
        # Verify signature if configured
        signature = request.headers.get("X-Twilio-Email-Event-Webhook-Signature")
        timestamp = request.headers.get("X-Twilio-Email-Event-Webhook-Timestamp")
        
        if signature and timestamp:
            if not WebhookService.verify_sendgrid_signature(
                body.decode() if isinstance(body, bytes) else str(body),
                signature,
                timestamp,
            ):
                logger.warning("Invalid SendGrid webhook signature")
                return {"status": "error", "message": "Invalid signature"}
        
        # Parse events
        events = WebhookService.parse_sendgrid_webhook(payload if isinstance(payload, list) else [payload])
        
        processed = 0
        tickets_created = 0
        bounces_processed = 0
        
        # Get default email account for inbound processing
        default_account = db.query(EmailAccount).filter(EmailAccount.is_active.is_(True)).first()
        
        for event in events:
            event_type = event.get("event_type")
            email_address = event.get("email")
            
            if event_type == "inbound":
                # Process inbound email
                if default_account:
                    try:
                        # SendGrid inbound emails come as base64 encoded
                        # For now, we'll need to fetch the full email from SendGrid API
                        # This is a simplified implementation
                        logger.info(f"Received inbound email from {email_address}")
                        # TODO: Fetch full email content from SendGrid API using message_id
                        processed += 1
                    except Exception as e:
                        logger.error(f"Failed to process inbound email: {e}")
            
            elif event_type in ("bounce", "dropped", "spamreport"):
                # Process bounce event
                try:
                    bounce_reason = event.get("reason", "Unknown bounce reason")
                    bounce_code = event.get("status", None)
                    
                    BounceService.process_bounce(
                        db=db,
                        email_address=email_address,
                        bounce_reason=bounce_reason,
                        bounce_code=bounce_code,
                        bounce_timestamp=datetime.fromtimestamp(event.get("timestamp", datetime.now().timestamp()), tz=timezone.utc) if event.get("timestamp") else datetime.now(timezone.utc),
                    )
                    bounces_processed += 1
                except Exception as e:
                    logger.error(f"Failed to process bounce: {e}")
        
        return {
            "status": "processed",
            "events_processed": processed,
            "tickets_created": tickets_created,
            "bounces_processed": bounces_processed,
        }
    
    except Exception as e:
        logger.error(f"SendGrid webhook error: {e}", exc_info=True)
        return {"status": "error", "message": str(e)}


@router.post("/webhooks/mailgun")
async def handle_mailgun_webhook(
    request: Request,
    db: Session = Depends(get_sync_db),
):
    """Handle Mailgun webhook events.

    Supports:
    - Inbound emails (converted to tickets)
    - Failed events (tracked as bounces)

    Args:
        request: FastAPI request object
        db: Database session
    """
    from app.modules.tickets.services.email_parser_service import EmailParserService
    from app.modules.tickets.services.email_to_ticket_service import EmailToTicketService
    from app.modules.tickets.models import EmailAccount
    from datetime import datetime
    
    try:
        # Mailgun sends form-encoded data
        form_data = await request.form()
        payload = dict(form_data)
        
        # Verify signature
        token = payload.get("token")
        signature = payload.get("signature")
        timestamp = payload.get("timestamp")
        
        if token and signature and timestamp:
            if not WebhookService.verify_mailgun_signature(token, signature, timestamp):
                logger.warning("Invalid Mailgun webhook signature")
                return {"status": "error", "message": "Invalid signature"}
        
        # Parse event
        event = WebhookService.parse_mailgun_webhook(payload)
        event_type = event.get("event_type")
        email_address = event.get("email")
        
        processed = 0
        tickets_created = 0
        bounces_processed = 0
        
        # Get default email account for inbound processing
        default_account = db.query(EmailAccount).filter(EmailAccount.is_active.is_(True)).first()
        
        if event_type == "inbound":
            # Process inbound email
            if default_account:
                try:
                    # Mailgun provides message-url or body-mime
                    message_url = payload.get("message-url")
                    body_mime = payload.get("body-mime")
                    
                    if body_mime:
                        # Parse email from MIME content
                        parsed_email = EmailParserService.parse_email(body_mime)
                        result = EmailToTicketService.process_email(db, parsed_email, default_account)
                        
                        if result.success:
                            tickets_created += 1
                            processed += 1
                    elif message_url:
                        # TODO: Fetch email from message-url
                        logger.info(f"Received inbound email URL: {message_url}")
                        processed += 1
                except Exception as e:
                    logger.error(f"Failed to process inbound email: {e}")
        
        elif event_type == "failed":
            # Process bounce event
            try:
                bounce_reason = event.get("reason", "Unknown bounce reason")
                bounce_code = event.get("status", None)
                
                BounceService.process_bounce(
                    db=db,
                    email_address=email_address,
                    bounce_reason=bounce_reason,
                    bounce_code=bounce_code,
                    bounce_timestamp=datetime.fromtimestamp(float(timestamp), tz=timezone.utc) if timestamp else datetime.now(timezone.utc),
                )
                bounces_processed += 1
            except Exception as e:
                logger.error(f"Failed to process bounce: {e}")
        
        return {
            "status": "processed",
            "events_processed": processed,
            "tickets_created": tickets_created,
            "bounces_processed": bounces_processed,
        }
    
    except Exception as e:
        logger.error(f"Mailgun webhook error: {e}", exc_info=True)
        return {"status": "error", "message": str(e)}
