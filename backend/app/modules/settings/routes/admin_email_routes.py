"""
Admin email settings API routes.

Endpoints for testing and managing email configuration.
Uses same path as production: SMTP from .env, from/name/reply_to from DB.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.config.settings import get_settings
from app.core.dependencies import require_permission
from app.core.logging import logger
from app.core.permissions import Permission
from app.infrastructure.email.service import EmailService
from app.modules.auth.models import User

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
    Uses same config as production: SMTP from .env, from/name from DB.
    """
    try:
        from app.modules.settings.utils import get_app_name

        settings = get_settings()
        test_email = settings.ADMIN_EMAIL or settings.EMAIL_FROM
        if not test_email or test_email == "algerietelecomd@gmail.com":
            test_email = settings.EMAIL_FROM

        app_name = await get_app_name(db)
        subject = f"{app_name} Email Configuration Test"
        html_body = f"""
        <html>
            <body>
                <h2>Email Configuration Test</h2>
                <p>This is a test email from {app_name} to verify your SMTP configuration.</p>
                <p>If you received this email, your email settings are working correctly!</p>
                <hr>
                <p><small>Test sent at: {datetime.now(timezone.utc).isoformat()}</small></p>
            </body>
        </html>
        """
        text_body = f"This is a test email from {app_name} to verify your SMTP configuration.\n\nIf you received this email, your email settings are working correctly!"

        email_service = EmailService()
        success = await email_service.send_email(
            [test_email],
            subject,
            html_body,
            text_body=text_body,
            db=db,
        )

        if success:
            logger.info(
                "Email test successful - test email sent to %s", test_email)
            return EmailTestResponse(
                success=True,
                message=f"Test email sent successfully to {test_email}. Please check your inbox."
            )
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
