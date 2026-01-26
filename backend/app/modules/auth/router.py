"""
Authentication API routes.
Handles user registration, login, and 2FA endpoints.
"""
from typing import Annotated

from fastapi import APIRouter, Depends, status, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.core.dependencies import get_current_user_id
from app.core.rate_limiter import (
    login_rate_limit,
    password_reset_rate_limit,
    two_fa_rate_limit,
    registration_rate_limit,
    token_refresh_rate_limit,
    two_fa_setup_required_rate_limit,
)
from app.modules.auth.session import SessionManager, SessionData
from app.modules.auth.schemas import (
    UserCreate,
    UserUpdate,
    UserResponse,
    LoginRequest,
    LoginResponse,
    RefreshTokenRequest,
    Enable2FAResponse,
    Verify2FARequest,
    CompleteLogin2FARequest,
    PasswordResetRequest,
    PasswordResetConfirm,
    PasswordResetResponse,
    ChangePasswordRequest,
    SetupRequired2FARequest,
    VerifySetupRequired2FARequest,
    VerifySetupRequired2FAResponse,
)
from app.modules.auth.service import AuthService
from app.modules.audit.schemas import AuditLogFilter

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
@registration_rate_limit
async def register(
    user_data: UserCreate,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Register a new user and automatically log them in.

    Security:
    - Rate limited: 3 attempts per hour per IP
    - Prevents mass account creation

    Args:
        user_data: User registration data
        request: FastAPI request for rate limiting
        db: Database session

    Returns:
        Access token, refresh token, and user information
    """
    service = AuthService(db)
    return await service.register(user_data, request)


@router.post("/login", response_model=LoginResponse)
@login_rate_limit
async def login(
    login_data: LoginRequest,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Login with email and password.

    Security:
    - Rate limited: 5 attempts per 5 minutes per IP
    - Prevents brute force attacks
    - Failed attempts are logged for security monitoring

    Args:
        login_data: Login credentials
        request: FastAPI request for audit logging and rate limiting
        db: Database session

    Returns:
        Access token, refresh token, and user information
    """
    service = AuthService(db)
    return await service.login(login_data.email, login_data.password, request)


@router.post("/2fa/complete-login", response_model=LoginResponse)
@two_fa_rate_limit
async def complete_login_2fa(
    body: CompleteLogin2FARequest,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Complete login after 2FA verification.

    Call when login returns requires_2fa=True. Submit pending_2fa_token and TOTP code.
    Returns full LoginResponse with access_token and refresh_token.

    Security:
    - Rate limited: 5 attempts per 5 minutes per IP
    """
    service = AuthService(db)
    return await service.complete_login_2fa(
        body.pending_2fa_token, body.code, request
    )


@router.post("/refresh")
@token_refresh_rate_limit
async def refresh_token(
    token_data: RefreshTokenRequest,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Refresh access token using refresh token.

    Security:
    - Rate limited: 10 attempts per minute per IP
    - Prevents token refresh abuse

    Args:
        token_data: Refresh token
        request: FastAPI request for rate limiting
        db: Database session

    Returns:
        New access token
    """
    service = AuthService(db)
    return await service.refresh_access_token(token_data.refresh_token)


@router.post("/2fa/enable", response_model=Enable2FAResponse)
async def enable_2fa(
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Enable 2FA for current user.

    Args:
        user_id: Current user ID
        db: Database session

    Returns:
        2FA setup information with QR code
    """
    service = AuthService(db)
    return await service.enable_2fa(user_id)


@router.post("/2fa/verify")
@two_fa_rate_limit
async def verify_2fa(
    code_data: Verify2FARequest,
    request: Request,
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Verify 2FA code.

    Security:
    - Rate limited: 5 attempts per 5 minutes per IP
    - Prevents brute force 2FA code guessing

    Args:
        code_data: TOTP code
        request: FastAPI request for rate limiting
        user_id: Current user ID
        db: Database session

    Returns:
        Verification result
    """
    service = AuthService(db)
    is_valid = await service.verify_2fa(user_id, code_data.code)
    return {"valid": is_valid}


@router.post("/2fa/disable", response_model=UserResponse)
async def disable_2fa(
    code_data: Verify2FARequest,
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Disable 2FA for current user.

    Args:
        code_data: TOTP code for verification
        user_id: Current user ID
        db: Database session

    Returns:
        Updated user information
    """
    service = AuthService(db)
    user = await service.disable_2fa(user_id, code_data.code)
    return user


@router.post("/password-reset/request", response_model=PasswordResetResponse)
@password_reset_rate_limit
async def request_password_reset(
    reset_data: PasswordResetRequest,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Request password reset token.

    Security:
    - Rate limited: 3 attempts per 15 minutes per IP
    - Prevents email bombing and account enumeration attempts

    Args:
        reset_data: Password reset request with email
        request: FastAPI request for rate limiting
        db: Database session

    Returns:
        Password reset confirmation message
    """
    service = AuthService(db)
    method = getattr(reset_data, "method", "email")
    await service.request_password_reset(reset_data.email, method=method)

    # Always return success for security (don't reveal if email exists)
    if method == "sms":
        message = "If the email exists and has a phone number, a password reset code has been sent via SMS"
    else:
        message = "If the email exists, a password reset link has been sent"
    
    return PasswordResetResponse(
        message=message,
        email=reset_data.email,
    )


@router.post("/2fa/setup-required", response_model=Enable2FAResponse)
@two_fa_setup_required_rate_limit
async def setup_required_2fa(
    setup_data: SetupRequired2FARequest,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Setup 2FA when required for role (unauthenticated endpoint).
    
    Allows users to enable 2FA before first login when their role requires it.
    Verifies credentials using email/password instead of JWT token.

    Security:
    - Rate limited: 5 attempts per 15 minutes per IP
    - Requires valid email/password credentials
    - Only works if 2FA is required for user's role
    - Only works if 2FA is not already enabled

    Args:
        setup_data: Email and password for credential verification
        request: FastAPI request for rate limiting and audit logging
        db: Database session

    Returns:
        2FA setup information with QR code

    Raises:
        UnauthorizedException: If credentials are invalid
        ValidationException: If 2FA is already enabled or not required
    """
    service = AuthService(db)
    return await service.setup_required_2fa(
        setup_data.email, setup_data.password, request
    )


@router.post("/2fa/verify-setup-required", response_model=VerifySetupRequired2FAResponse)
@two_fa_setup_required_rate_limit
async def verify_setup_required_2fa(
    verify_data: VerifySetupRequired2FARequest,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Verify 2FA code during required setup (unauthenticated endpoint).
    
    Verifies credentials and 2FA code to complete the setup process.
    After successful verification, user can proceed with login.

    Security:
    - Rate limited: 5 attempts per 15 minutes per IP
    - Requires valid email/password credentials
    - Verifies TOTP code

    Args:
        verify_data: Email, password, and TOTP code
        request: FastAPI request for rate limiting and audit logging
        db: Database session

    Returns:
        Verification result

    Raises:
        UnauthorizedException: If credentials are invalid
        ValidationException: If 2FA code is invalid
    """
    service = AuthService(db)
    return await service.verify_setup_required_2fa(
        verify_data.email, verify_data.password, verify_data.code, request
    )


@router.get("/2fa/check-requirement")
@two_fa_setup_required_rate_limit
async def check_2fa_requirement(
    email: str = Query(..., description="User email address"),
    request: Request = None,
    db: Annotated[AsyncSession, Depends(get_db)] = ...,
):
    """
    Check if 2FA is required for a user's role (public endpoint).
    
    Allows frontend to check 2FA requirement before login attempt.
    Does not require authentication and does not reveal if user exists.

    Security:
    - Rate limited: 5 attempts per 15 minutes per IP
    - Does not reveal if email exists (returns False if user not found)

    Args:
        email: User email address
        request: FastAPI request for rate limiting
        db: Database session

    Returns:
        Dictionary with is_required flag and role (if user exists)
    """
    from app.modules.settings.utils import is_2fa_required
    from app.modules.auth.repository import UserRepository

    repository = UserRepository(db)
    user = await repository.get_by_email(email)

    # Don't reveal if user exists for security
    if not user:
        return {"is_required": False, "role": None}

    is_required = await is_2fa_required(db, user.role.value)
    return {"is_required": is_required, "role": user.role.value}


@router.post("/password-reset/confirm", response_model=UserResponse)
async def confirm_password_reset(
    reset_data: PasswordResetConfirm,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Confirm password reset with token and new password.

    Args:
        reset_data: Reset token and new password
        db: Database session

    Returns:
        Updated user information
    """
    service = AuthService(db)
    
    # Support both token (email) and code (SMS) methods
    if reset_data.token:
        user = await service.reset_password(
            token=reset_data.token,
            new_password=reset_data.new_password
        )
    elif reset_data.code and reset_data.email:
        user = await service.reset_password(
            code=reset_data.code,
            email=reset_data.email,
            new_password=reset_data.new_password
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either token or (code and email) must be provided"
        )
    
    return user


@router.get("/sessions", response_model=list[SessionData])
async def get_user_sessions(
    user_id: Annotated[str, Depends(get_current_user_id)],
):
    """
    Get all active sessions for current user.

    Args:
        user_id: Current user ID

    Returns:
        List of active user sessions
    """
    session_manager = SessionManager()
    return await session_manager.get_user_sessions(user_id)


@router.delete("/sessions/{session_id}")
async def invalidate_session(
    session_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
):
    """
    Invalidate a specific session.

    Args:
        session_id: Session ID to invalidate
        user_id: Current user ID

    Returns:
        Success message
    """
    session_manager = SessionManager()

    # Verify session belongs to user
    session = await session_manager.get_session(session_id)
    if not session or session.user_id != user_id:
        return {"success": False, "message": "Session not found"}

    success = await session_manager.invalidate_session(session_id)
    return {"success": success, "message": "Session invalidated"}


@router.delete("/sessions")
async def invalidate_all_sessions(
    user_id: Annotated[str, Depends(get_current_user_id)],
):
    """
    Invalidate all sessions for current user (logout from all devices).

    Args:
        user_id: Current user ID

    Returns:
        Success message with count of invalidated sessions
    """
    session_manager = SessionManager()
    count = await session_manager.invalidate_all_user_sessions(user_id)
    return {"success": True, "count": count, "message": f"Invalidated {count} sessions"}


@router.get("/security/login-history")
async def get_login_history(
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """
    Get login history for current user.

    Args:
        user_id: Current user ID
        db: Database session
        page: Page number
        page_size: Items per page

    Returns:
        List of login attempts (successful and failed)
    """
    from app.modules.audit.service import AuditService
    from app.modules.audit.models import AuditAction

    service = AuditService(db)
    # Filter by both login success and failed attempts
    # Note: AuditLogFilter doesn't support multiple actions, so we filter by user_id and success field
    # We'll get all login-related actions for this user
    filters = AuditLogFilter(user_id=user_id)
    logs = await service.get_logs(page=page, page_size=page_size, filters=filters)
    # Filter to only include login-related actions
    login_actions = [log for log in logs.data if log.action in [AuditAction.LOGIN_SUCCESS, AuditAction.LOGIN_FAILED]]
    # Return filtered results with same pagination structure
    from app.modules.audit.schemas import AuditLogListResponse
    return AuditLogListResponse(
        data=login_actions,
        total=len(login_actions),
        page=page,
        page_size=page_size,
        total_pages=(len(login_actions) + page_size - 1) // page_size if page_size > 0 else 1
    )


@router.get("/security/activity")
async def get_security_activity(
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """
    Get all security-related activity for current user.

    Args:
        user_id: Current user ID
        db: Database session
        page: Page number
        page_size: Items per page

    Returns:
        List of security events (login, 2FA, password changes, etc.)
    """
    from app.modules.audit.service import AuditService

    service = AuditService(db)
    return await service.get_user_activity(
        user_id=user_id, page=page, page_size=page_size
    )


@router.put("/profile", response_model=UserResponse)
async def update_profile(
    profile_data: UserUpdate,
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Update current user's profile.

    Args:
        profile_data: Profile update data
        user_id: Current user ID
        db: Database session

    Returns:
        Updated user information
    """
    service = AuthService(db)
    user = await service.update_profile(user_id, profile_data)
    return user


@router.put("/change-password")
async def change_password(
    password_data: ChangePasswordRequest,
    user_id: Annotated[str, Depends(get_current_user_id)],
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Change current user's password.

    Args:
        password_data: Password change request with current and new password
        user_id: Current user ID
        request: FastAPI request for audit logging
        db: Database session

    Returns:
        Success message
    """
    service = AuthService(db)
    await service.change_password(
        user_id, password_data.current_password, password_data.new_password, request
    )
    return {"message": "Password changed successfully"}
