"""
Authentication business logic service.
Handles user authentication, registration, and 2FA.
"""
import pyotp
import qrcode
import io
import base64
from typing import Optional
from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.settings import get_settings
from app.core.exceptions import (
    UnauthorizedException,
    ConflictException,
    ValidationException,
)
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
    create_reset_token,
    verify_reset_token,
    create_pending_2fa_token,
    decode_pending_2fa_token,
    generate_reset_code,
    store_reset_code,
    verify_reset_code,
    delete_reset_code,
)
from app.modules.auth.models import User
from app.modules.auth.repository import UserRepository
from app.modules.auth.schemas import (
    UserCreate,
    UserUpdate,
    LoginResponse,
    Enable2FAResponse,
    VerifySetupRequired2FAResponse,
)
from app.modules.audit.service import AuditService
from app.modules.audit.models import AuditAction
from app.infrastructure.email.service import EmailService
from app.infrastructure.sms.service import SMSService
from app.modules.customers.repository import CustomerRepository
from app.core.logging import logger

settings = get_settings()


class AuthService:
    """Authentication service for business logic."""

    def __init__(self, db: AsyncSession):
        self.repository = UserRepository(db)
        self.audit_service = AuditService(db)
        self.email_service = EmailService()
        self.db = db

    async def register(self, user_data: UserCreate, request: Optional[Request] = None) -> LoginResponse:
        """
        Register a new user and automatically log them in.

        Args:
            user_data: User registration data
            request: FastAPI request for audit logging

        Returns:
            Login response with tokens and user information

        Raises:
            ConflictException: If email already exists
        """
        # Check if user exists
        existing_user = await self.repository.get_by_email(user_data.email)
        if existing_user:
            raise ConflictException("Email already registered")

        # Hash password
        password_hash = get_password_hash(user_data.password)

        # Create user
        user = await self.repository.create(user_data, password_hash)

        # Generate tokens for automatic login
        access_token = create_access_token(data={"sub": user.id})
        refresh_token = create_refresh_token(data={"sub": user.id})

        # Log successful registration
        await self.audit_service.log_action(
            action=AuditAction.USER_CREATE,
            resource_type="user",
            description=f"New user registered: {user.email}",
            user_id=user.id,
            user_email=user.email,
            user_role=user.role,
            request=request,
            success=True,
        )

        # Return login response with tokens
        return LoginResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            user=user,
        )

    async def login(
        self, email: str, password: str, request: Optional[Request] = None
    ) -> LoginResponse:
        """
        Authenticate user and generate tokens.

        Security:
        - Account lockout after 5 failed attempts for 30 minutes
        - Failed attempts reset on successful login
        - Locked accounts cannot login until lockout expires

        Args:
            email: User email
            password: User password
            request: FastAPI request for audit logging

        Returns:
            Login response with tokens

        Raises:
            UnauthorizedException: If credentials are invalid or account is locked
        """
        from datetime import datetime, timedelta

        # Get user by email
        user = await self.repository.get_by_email(email)
        if not user:
            # Log failed login attempt (wrap in try-except to ensure login error is still raised)
            try:
                await self.audit_service.log_action(
                    action=AuditAction.LOGIN_FAILED,
                    resource_type="auth",
                    description=f"Failed login attempt for {email} - user not found",
                    user_email=email,
                    request=request,
                    success=False,
                    error_message="Email not found",
                )
            except Exception as e:
                # Log error but don't prevent login error from being raised
                logger.error(f"Failed to log failed login attempt: {e}", exc_info=True)
            raise UnauthorizedException("Email not found")

        # SECURITY: Check if account is locked
        if user.locked_until:
            if datetime.utcnow() < user.locked_until:
                # Account is still locked
                time_remaining = user.locked_until - datetime.utcnow()
                minutes_remaining = int(time_remaining.total_seconds() / 60) + 1

                try:
                    await self.audit_service.log_action(
                        action=AuditAction.LOGIN_FAILED,
                        resource_type="auth",
                        description=f"Login attempt for locked account: {email}",
                        user_id=user.id,
                        user_email=email,
                        user_role=user.role,
                        request=request,
                        success=False,
                        error_message=f"Account locked for {minutes_remaining} more minutes",
                    )
                except Exception as e:
                    logger.error(f"Failed to log locked account login attempt: {e}", exc_info=True)

                raise UnauthorizedException(
                    f"Account is temporarily locked due to multiple failed login attempts. "
                    f"Please try again in {minutes_remaining} minutes."
                )
            else:
                # Lockout expired, reset counters
                user.locked_until = None
                user.failed_login_attempts = 0
                await self.db.commit()

        # Verify password
        password_valid = verify_password(password, user.password_hash)
        
        # If password is valid and it's using bcrypt (old hash), migrate to Argon2
        if password_valid:
            # Check if password is using bcrypt (starts with $2a$, $2b$, or $2y$)
            if user.password_hash.startswith(("$2a$", "$2b$", "$2y$")):
                # Migrate to Argon2
                from app.core.security import get_password_hash
                new_hash = get_password_hash(password)
                user.password_hash = new_hash
                await self.db.commit()
                logger.info(f"Password migrated to Argon2 for user {user.email}")
                
                # Log migration
                try:
                    await self.audit_service.log_action(
                        action=AuditAction.PASSWORD_CHANGE,
                        resource_type="user",
                        description=f"Password hash migrated from bcrypt to Argon2",
                        user_id=user.id,
                        user_email=user.email,
                        user_role=user.role,
                        request=request,
                        success=True,
                    )
                except Exception as e:
                    logger.warning(f"Failed to log password migration: {e}")
        
        if not password_valid:
            # SECURITY: Increment failed attempts and lock if threshold reached
            user.failed_login_attempts += 1
            user.last_failed_login = datetime.utcnow()

            if user.failed_login_attempts >= 5:
                # Lock account for 30 minutes
                user.locked_until = datetime.utcnow() + timedelta(minutes=30)

                await self.db.commit()

                try:
                    await self.audit_service.log_action(
                        action=AuditAction.LOGIN_FAILED,
                        resource_type="auth",
                        description=f"Account locked due to {user.failed_login_attempts} failed attempts: {email}",
                        user_id=user.id,
                        user_email=email,
                        user_role=user.role,
                        request=request,
                        success=False,
                        error_message="Account locked - too many failed attempts",
                    )
                except Exception as e:
                    logger.error(f"Failed to log account lock audit: {e}", exc_info=True)

                raise UnauthorizedException(
                    "Account has been locked due to multiple failed login attempts. "
                    "Please try again in 30 minutes or contact support."
                )

            await self.db.commit()

            try:
                await self.audit_service.log_action(
                    action=AuditAction.LOGIN_FAILED,
                    resource_type="auth",
                    description=f"Failed login attempt for {email} - invalid password (attempt {user.failed_login_attempts}/5)",
                    user_id=user.id,
                    user_email=email,
                    user_role=user.role,
                    request=request,
                    success=False,
                    error_message="Wrong password",
                )
            except Exception as e:
                logger.error(f"Failed to log failed login attempt: {e}", exc_info=True)

            raise UnauthorizedException("Wrong password")

        # Check if user is active
        if not user.is_active:
            try:
                await self.audit_service.log_action(
                    action=AuditAction.LOGIN_FAILED,
                    resource_type="auth",
                    description=f"Failed login for {email} - account inactive",
                    user_id=user.id,
                    user_email=email,
                    user_role=user.role,
                    request=request,
                    success=False,
                    error_message="Account is inactive",
                )
            except Exception as e:
                logger.error(f"Failed to log inactive account login attempt: {e}", exc_info=True)
            raise UnauthorizedException("Account is inactive")

        # Role-based 2FA requirement: reject login if role requires 2FA but user has not enabled it
        from app.modules.settings.utils import is_2fa_required
        if await is_2fa_required(self.db, user.role.value) and not user.is_2fa_enabled:
            raise ValidationException(
                "2FA is required for your role. Please enable 2FA in account settings before signing in."
            )

        # SECURITY: Reset failed login attempts on successful login
        user.failed_login_attempts = 0
        user.locked_until = None
        user.last_failed_login = None
        await self.db.commit()

        # 2FA required: withhold tokens until TOTP verified via /auth/2fa/complete-login
        if user.is_2fa_enabled:
            pending = create_pending_2fa_token(user.id)
            return LoginResponse(
                access_token="",
                refresh_token="",
                token_type="bearer",
                user=user,
                requires_2fa=True,
                pending_2fa_token=pending,
            )

        # Generate tokens
        access_token = create_access_token(data={"sub": user.id})
        refresh_token = create_refresh_token(data={"sub": user.id})

        # Update last login
        await self.repository.update_last_login(user)

        # Log successful login
        await self.audit_service.log_action(
            action=AuditAction.LOGIN_SUCCESS,
            resource_type="auth",
            description=f"Successful login for {email}",
            user_id=user.id,
            user_email=email,
            user_role=user.role,
            request=request,
            success=True,
        )

        return LoginResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=user,
        )

    async def refresh_access_token(self, refresh_token: str) -> dict:
        """
        Generate new access token from refresh token.

        Args:
            refresh_token: JWT refresh token

        Returns:
            New access token

        Raises:
            UnauthorizedException: If refresh token is invalid
        """
        payload = decode_token(refresh_token)
        if not payload or payload.get("type") != "refresh":
            raise UnauthorizedException("Invalid refresh token")

        user_id = payload.get("sub")
        if not user_id:
            raise UnauthorizedException("Invalid token payload")

        # Verify user exists
        user = await self.repository.get_by_id(user_id)
        if not user:
            raise UnauthorizedException("User not found")

        # Generate new access token
        access_token = create_access_token(data={"sub": user.id})

        return {
            "access_token": access_token,
            "token_type": "bearer",
        }

    async def complete_login_2fa(
        self, pending_2fa_token: str, code: str, request: Optional[Request] = None
    ) -> LoginResponse:
        """
        Complete login after 2FA verification. Call when login returned requires_2fa.

        Args:
            pending_2fa_token: Token from login response (requires_2fa)
            code: TOTP code
            request: Optional request for audit

        Returns:
            LoginResponse with access_token, refresh_token, user

        Raises:
            UnauthorizedException: If pending token invalid
            ValidationException: If TOTP code invalid
        """
        user_id = decode_pending_2fa_token(pending_2fa_token)
        if not user_id:
            raise UnauthorizedException("Invalid or expired 2FA login token. Please log in again.")

        user = await self.repository.get_by_id(user_id)
        if not user:
            raise UnauthorizedException("User not found")

        await self.verify_2fa(user_id, code)

        access_token = create_access_token(data={"sub": user.id})
        refresh_token = create_refresh_token(data={"sub": user.id})
        await self.repository.update_last_login(user)

        try:
            await self.audit_service.log_action(
                action=AuditAction.LOGIN_SUCCESS,
                resource_type="auth",
                description=f"Successful login for {user.email} (2FA verified)",
                user_id=user.id,
                user_email=user.email,
                user_role=user.role,
                request=request,
                success=True,
            )
        except Exception as e:
            logger.error(f"Failed to log 2FA login success: {e}", exc_info=True)

        return LoginResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            user=user,
        )

    async def enable_2fa(self, user_id: str) -> Enable2FAResponse:
        """
        Enable 2FA for user and generate QR code.

        Args:
            user_id: User ID

        Returns:
            2FA setup information with QR code

        Raises:
            ValidationException: If 2FA is already enabled
        """
        user = await self.repository.get_by_id(user_id)
        if not user:
            raise UnauthorizedException("User not found")

        if user.is_2fa_enabled:
            raise ValidationException("2FA is already enabled")

        # Generate TOTP secret
        secret = pyotp.random_base32()

        # Generate QR code
        totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
            name=user.email, issuer_name=settings.TOTP_ISSUER
        )

        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(totp_uri)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        qr_code_data = base64.b64encode(buffer.getvalue()).decode()
        qr_code_url = f"data:image/png;base64,{qr_code_data}"

        # Generate backup codes
        backup_codes = [pyotp.random_base32()[:8] for _ in range(10)]

        # Save secret
        await self.repository.update_2fa_secret(user, secret)

        return Enable2FAResponse(
            secret=secret,
            qr_code_url=qr_code_url,
            backup_codes=backup_codes,
        )

    async def verify_2fa(self, user_id: str, code: str) -> bool:
        """
        Verify 2FA code (TOTP only).

        Backup codes are not validated server-side; only TOTP (6-digit) codes
        are checked. Backup-code validation would require storing hashed
        codes and optionally invalidating after use.

        Args:
            user_id: User ID
            code: TOTP code (6 digits)

        Returns:
            True if code is valid

        Raises:
            ValidationException: If 2FA is not enabled or code is invalid
        """
        user = await self.repository.get_by_id(user_id)
        if not user:
            raise UnauthorizedException("User not found")

        if not user.is_2fa_enabled or not user.totp_secret:
            raise ValidationException("2FA is not enabled")

        # Verify TOTP code
        totp = pyotp.TOTP(user.totp_secret)
        is_valid = totp.verify(code, valid_window=1)

        if not is_valid:
            raise ValidationException("Invalid 2FA code")

        return True

    async def _verify_credentials(
        self, email: str, password: str, request: Optional[Request] = None
    ) -> User:
        """
        Verify user credentials and return user if valid.
        Internal helper method for credential verification.

        Args:
            email: User email
            password: User password
            request: FastAPI request for audit logging

        Returns:
            User object if credentials are valid

        Raises:
            UnauthorizedException: If credentials are invalid or account is locked/inactive
        """
        from datetime import datetime, timedelta

        # Get user by email
        user = await self.repository.get_by_email(email)
        if not user:
            raise UnauthorizedException("Email not found")

        # SECURITY: Check if account is locked
        if user.locked_until:
            if datetime.utcnow() < user.locked_until:
                time_remaining = user.locked_until - datetime.utcnow()
                minutes_remaining = int(time_remaining.total_seconds() / 60) + 1
                raise UnauthorizedException(
                    f"Account has been locked due to multiple failed login attempts. "
                    f"Please try again in {minutes_remaining} minute(s) or contact support."
                )

        # Verify password
        password_valid = verify_password(password, user.password_hash)

        # Handle password migration if needed
        if password_valid and user.password_hash.startswith("$2b$"):
            # Migrate to new hash format if using old bcrypt
            try:
                new_hash = get_password_hash(password)
                user.password_hash = new_hash
                await self.db.commit()
            except Exception as e:
                logger.warning(f"Failed to log password migration: {e}")

        if not password_valid:
            raise UnauthorizedException("Wrong password")

        # Check if user is active
        if not user.is_active:
            raise UnauthorizedException("Account is inactive")

        return user

    async def setup_required_2fa(
        self, email: str, password: str, request: Optional[Request] = None
    ) -> Enable2FAResponse:
        """
        Setup 2FA for user when it's required (unauthenticated endpoint).
        Verifies credentials and enables 2FA if required for role.

        Args:
            email: User email
            password: User password
            request: FastAPI request for audit logging

        Returns:
            2FA setup information with QR code

        Raises:
            UnauthorizedException: If credentials are invalid
            ValidationException: If 2FA is already enabled or not required
        """
        # Verify credentials
        user = await self._verify_credentials(email, password, request)

        # Check if 2FA is required for this role
        from app.modules.settings.utils import is_2fa_required

        if not await is_2fa_required(self.db, user.role.value):
            raise ValidationException("2FA is not required for your role")

        # Check if 2FA is already enabled
        if user.is_2fa_enabled:
            raise ValidationException("2FA is already enabled")

        # Log 2FA setup attempt
        try:
            await self.audit_service.log_action(
                action=AuditAction.USER_UPDATED,
                resource_type="auth",
                description=f"2FA setup initiated for {email} (required)",
                user_id=user.id,
                user_email=email,
                user_role=user.role,
                request=request,
                success=True,
            )
        except Exception as e:
            logger.error(f"Failed to log 2FA setup audit: {e}", exc_info=True)

        # Use existing enable_2fa logic
        return await self.enable_2fa(user.id)

    async def verify_setup_required_2fa(
        self, email: str, password: str, code: str, request: Optional[Request] = None
    ) -> VerifySetupRequired2FAResponse:
        """
        Verify 2FA code during required setup (unauthenticated endpoint).
        Verifies credentials, then verifies 2FA code.

        Args:
            email: User email
            password: User password
            code: TOTP code
            request: FastAPI request for audit logging

        Returns:
            Verification result

        Raises:
            UnauthorizedException: If credentials are invalid
            ValidationException: If 2FA code is invalid
        """
        # Verify credentials
        user = await self._verify_credentials(email, password, request)

        # Check if 2FA is enabled and has secret
        if not user.is_2fa_enabled or not user.totp_secret:
            raise ValidationException("2FA is not enabled. Please complete setup first.")

        # Verify TOTP code
        totp = pyotp.TOTP(user.totp_secret)
        is_valid = totp.verify(code, valid_window=1)

        if not is_valid:
            # Log failed verification attempt
            try:
                await self.audit_service.log_action(
                    action=AuditAction.LOGIN_FAILED,
                    resource_type="auth",
                    description=f"Failed 2FA verification during setup for {email}",
                    user_id=user.id,
                    user_email=email,
                    user_role=user.role,
                    request=request,
                    success=False,
                    error_message="Invalid 2FA code",
                )
            except Exception as e:
                logger.error(f"Failed to log 2FA verification audit: {e}", exc_info=True)

            raise ValidationException("Invalid 2FA code")

        # Log successful verification
        try:
            await self.audit_service.log_action(
                action=AuditAction.USER_UPDATED,
                resource_type="auth",
                description=f"2FA setup verified and completed for {email}",
                user_id=user.id,
                user_email=email,
                user_role=user.role,
                request=request,
                success=True,
            )
        except Exception as e:
            logger.error(f"Failed to log 2FA verification audit: {e}", exc_info=True)

        return VerifySetupRequired2FAResponse(
            success=True, message="2FA has been successfully enabled"
        )

    async def disable_2fa(self, user_id: str, code: str) -> User:
        """
        Disable 2FA for user.

        Args:
            user_id: User ID
            code: TOTP code for verification

        Returns:
            Updated user object

        Raises:
            ValidationException: If code is invalid
        """
        # Verify code first
        await self.verify_2fa(user_id, code)

        # Disable 2FA
        user = await self.repository.get_by_id(user_id)
        return await self.repository.disable_2fa(user)

    async def request_password_reset(self, email: str, method: str = "email") -> str:
        """
        Request password reset for user.

        Args:
            email: User email address
            method: Reset method - "email" or "sms" (default: "email")

        Returns:
            Password reset token (for email) or code (for SMS)

        Raises:
            UnauthorizedException: If user not found (but we don't reveal this)
        """
        # Check if user exists
        user = await self.repository.get_by_email(email)

        # Don't reveal if user exists or not for security
        if not user:
            # Still return a token (fake) to prevent user enumeration
            if method == "email":
                return create_reset_token(email)
            else:
                # Generate fake code for SMS method too
                fake_code = generate_reset_code()
                await store_reset_code(email, fake_code, "sms")
                return fake_code

        if method == "sms":
            # Get customer phone number
            customer_repo = CustomerRepository(self.db)
            customer = await customer_repo.get_by_email(email)
            
            if not customer or not customer.phone or not customer.phone.strip():
                # Fallback to email if no phone number
                logger.warning(f"No phone number found for {email}, falling back to email method")
                method = "email"
            else:
                # Generate 6-digit code
                reset_code = generate_reset_code()
                
                # Store code in Redis
                await store_reset_code(email, reset_code, "sms")
                
                # Send SMS with code
                sms_service = SMSService()
                await sms_service.send_password_reset_code(
                    to=customer.phone,
                    code=reset_code
                )
                
                return reset_code

        # Email method (default)
        # Generate reset token
        reset_token = create_reset_token(email)

        # Send reset email with token
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"
        await self.email_service.send_password_reset_email(
            to_email=email,
            user_name=user.full_name or user.email,
            reset_url=reset_url
        )

        return reset_token

    async def reset_password(
        self, 
        token: Optional[str] = None, 
        code: Optional[str] = None,
        email: Optional[str] = None,
        new_password: str = ""
    ) -> User:
        """
        Reset user password with token or code.

        Args:
            token: Password reset token (for email method)
            code: Password reset code (for SMS method, 6 digits)
            email: User email (required when using code)
            new_password: New password

        Returns:
            Updated user object

        Raises:
            UnauthorizedException: If token/code is invalid
            ValidationException: If user not found or missing required fields
        """
        user_email = None
        
        if token:
            # Email method - verify token
            user_email = verify_reset_token(token)
            if not user_email:
                raise UnauthorizedException("Invalid or expired reset token")
        elif code and email:
            # SMS method - verify code
            if not await verify_reset_code(email, code):
                raise UnauthorizedException("Invalid or expired reset code")
            user_email = email
        else:
            raise ValidationException("Either token or (code and email) must be provided")

        # Get user by email
        user = await self.repository.get_by_email(user_email)
        if not user:
            raise ValidationException("User not found")

        # Hash new password
        password_hash = get_password_hash(new_password)

        # Update password
        updated_user = await self.repository.update_password(user, password_hash)
        
        # Delete reset code from Redis if SMS method was used
        if code and email:
            await delete_reset_code(email)

        return updated_user

    async def update_profile(self, user_id: str, profile_data: "UserUpdate") -> User:
        """
        Update user profile information.

        Args:
            user_id: User ID
            profile_data: Profile update data

        Returns:
            Updated user object

        Raises:
            UnauthorizedException: If user not found
        """
        user = await self.repository.get_by_id(user_id)
        if not user:
            raise UnauthorizedException("User not found")
        return await self.repository.update(user, profile_data)

    async def change_password(
        self, user_id: str, current_password: str, new_password: str, request: Optional[Request] = None
    ) -> None:
        """
        Change user password after verifying current password.

        Args:
            user_id: User ID
            current_password: Current password
            new_password: New password
            request: FastAPI request for audit logging

        Raises:
            UnauthorizedException: If user not found
            ValidationException: If current password is incorrect
        """
        user = await self.repository.get_by_id(user_id)
        if not user:
            raise UnauthorizedException("User not found")

        if not verify_password(current_password, user.password_hash):
            raise ValidationException("Current password is incorrect")

        password_hash = get_password_hash(new_password)
        await self.repository.update_password(user, password_hash)

        # Log password change
        await self.audit_service.log_action(
            action=AuditAction.PASSWORD_CHANGE,
            resource_type="user",
            description="User changed password",
            user_id=user.id,
            user_email=user.email,
            user_role=user.role,
            request=request,
            success=True,
        )
