"""
Authentication business logic service.
Handles user authentication, registration, and 2FA.
"""
import pyotp
import qrcode
import io
import base64
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
)
from app.modules.auth.models import User
from app.modules.auth.repository import UserRepository
from app.modules.auth.schemas import UserCreate, LoginResponse, Enable2FAResponse

settings = get_settings()


class AuthService:
    """Authentication service for business logic."""

    def __init__(self, db: AsyncSession):
        self.repository = UserRepository(db)

    async def register(self, user_data: UserCreate) -> User:
        """
        Register a new user.

        Args:
            user_data: User registration data

        Returns:
            Created user object

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
        return user

    async def login(self, email: str, password: str) -> LoginResponse:
        """
        Authenticate user and generate tokens.

        Args:
            email: User email
            password: User password

        Returns:
            Login response with tokens

        Raises:
            UnauthorizedException: If credentials are invalid
        """
        # Get user by email
        user = await self.repository.get_by_email(email)
        if not user:
            raise UnauthorizedException("Invalid email or password")

        # Verify password
        if not verify_password(password, user.password_hash):
            raise UnauthorizedException("Invalid email or password")

        # Check if user is active
        if not user.is_active:
            raise UnauthorizedException("Account is inactive")

        # Generate tokens
        access_token = create_access_token(data={"sub": user.id})
        refresh_token = create_refresh_token(data={"sub": user.id})

        # Update last login
        await self.repository.update_last_login(user)

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
        Verify 2FA code.

        Args:
            user_id: User ID
            code: TOTP code

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

    async def request_password_reset(self, email: str) -> str:
        """
        Request password reset for user.

        Args:
            email: User email address

        Returns:
            Password reset token

        Raises:
            UnauthorizedException: If user not found (but we don't reveal this)
        """
        # Check if user exists
        user = await self.repository.get_by_email(email)

        # Don't reveal if user exists or not for security
        if not user:
            # Still return a token (fake) to prevent user enumeration
            return create_reset_token(email)

        # Generate reset token
        reset_token = create_reset_token(email)

        # TODO: Send reset email with token
        # await email_service.send_password_reset_email(email, reset_token)

        return reset_token

    async def reset_password(self, token: str, new_password: str) -> User:
        """
        Reset user password with token.

        Args:
            token: Password reset token
            new_password: New password

        Returns:
            Updated user object

        Raises:
            UnauthorizedException: If token is invalid
            ValidationException: If user not found
        """
        # Verify token and get email
        email = verify_reset_token(token)
        if not email:
            raise UnauthorizedException("Invalid or expired reset token")

        # Get user by email
        user = await self.repository.get_by_email(email)
        if not user:
            raise ValidationException("User not found")

        # Hash new password
        password_hash = get_password_hash(new_password)

        # Update password
        return await self.repository.update_password(user, password_hash)
