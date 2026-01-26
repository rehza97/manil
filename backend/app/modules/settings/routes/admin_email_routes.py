"""
Admin email settings API routes.

Endpoints for testing and managing email configuration.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.core.dependencies import require_permission
from app.core.logging import logger
from app.core.permissions import Permission
from app.modules.auth.models import User
from app.config.settings import get_settings
from app.infrastructure.email.providers import get_email_provider
from pydantic import BaseModel

router = APIRouter(prefix="/email", tags=["admin-email-settings"])


class EmailTestResponse(BaseModel):
    """Response model for email test endpoint."""
    success: bool
    message: str


@router.post("/test", response_model=EmailTestResponse)
async def test_email_configuration(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.SETTINGS_EDIT)),
) -> EmailTestResponse:
    """
    Test email configuration by sending a test email.
    
    Attempts to connect to SMTP server and send a test email to the admin email.
    Returns success/failure status with detailed error message if failed.
    
    Requires SETTINGS_EDIT permission.
    """
    try:
        settings = get_settings()
        provider = get_email_provider()
        
        # Get admin email or use EMAIL_FROM as fallback
        test_email = settings.ADMIN_EMAIL or settings.EMAIL_FROM
        
        if not test_email or test_email == "admin@cloudmanager.dz":
            # Use a test email if admin email is not configured
            test_email = settings.EMAIL_FROM
        
        # Prepare test email content
        subject = "CloudManager Email Configuration Test"
        html_body = f"""
        <html>
            <body>
                <h2>Email Configuration Test</h2>
                <p>This is a test email from CloudManager to verify your SMTP configuration.</p>
                <p>If you received this email, your email settings are working correctly!</p>
                <hr>
                <p><small>Test sent at: {__import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat()}</small></p>
            </body>
        </html>
        """
        text_body = "This is a test email from CloudManager to verify your SMTP configuration.\n\nIf you received this email, your email settings are working correctly!"
        
        # Attempt to send test email
        success = await provider.send_email(
            to=[test_email],
            subject=subject,
            html_body=html_body,
            text_body=text_body,
        )
        
        if success:
            logger.info(f"Email test successful - test email sent to {test_email}")
            return EmailTestResponse(
                success=True,
                message=f"Test email sent successfully to {test_email}. Please check your inbox."
            )
        else:
            logger.error("Email test failed - provider returned False")
            return EmailTestResponse(
                success=False,
                message="Failed to send test email. Please check your SMTP configuration and credentials."
            )
            
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Email test error: {error_msg}")
        
        # Provide more helpful error messages
        if "authentication failed" in error_msg.lower() or "login" in error_msg.lower():
            return EmailTestResponse(
                success=False,
                message=f"SMTP authentication failed: {error_msg}. Please verify your SMTP username and password."
            )
        elif "connection" in error_msg.lower() or "refused" in error_msg.lower():
            return EmailTestResponse(
                success=False,
                message=f"Could not connect to SMTP server: {error_msg}. Please verify SMTP_HOST and SMTP_PORT settings."
            )
        elif "tls" in error_msg.lower() or "ssl" in error_msg.lower():
            return EmailTestResponse(
                success=False,
                message=f"TLS/SSL error: {error_msg}. Please verify SMTP_USE_TLS setting."
            )
        else:
            return EmailTestResponse(
                success=False,
                message=f"Email test failed: {error_msg}"
            )
