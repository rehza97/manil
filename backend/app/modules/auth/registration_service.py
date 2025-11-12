"""
User registration service.
Handles registration workflows: initiation, email verification, and account activation.
"""
import logging
import secrets
from datetime import datetime, timedelta
from typing import Optional, Tuple

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.core.exceptions import NotFoundException, ConflictException, BadRequestException
from app.modules.auth.registration_models import (
    RegistrationRequest,
    EmailVerificationToken,
    RegistrationStatus,
)
from app.modules.auth.registration_schemas import (
    RegistrationRequest as RegistrationRequestSchema,
    VerifyEmailRequest,
    ActivateAccountRequest,
)
from app.modules.auth.models import User
from app.modules.auth.schemas import UserRole
from app.core.security import get_password_hash
from app.modules.customers.models import Customer
from app.modules.customers.schemas import CustomerStatus, CustomerType

logger = logging.getLogger(__name__)


class RegistrationService:
    """Service for managing user registration workflows."""

    @staticmethod
    def initiate_registration(
        db: Session,
        data: RegistrationRequestSchema,
    ) -> RegistrationRequest:
        """
        Initiate a new user registration.

        Args:
            db: Database session
            data: Registration request data

        Returns:
            RegistrationRequest: Created registration request

        Raises:
            ConflictException: If email already exists
        """
        # Check if email already exists
        existing_user = db.query(User).filter(User.email == data.email).first()
        if existing_user:
            raise ConflictException(f"Email {data.email} is already registered")

        existing_registration = db.query(RegistrationRequest).filter(
            and_(
                RegistrationRequest.email == data.email,
                RegistrationRequest.status != RegistrationStatus.CANCELLED,
                RegistrationRequest.status != RegistrationStatus.EXPIRED,
            )
        ).first()
        if existing_registration:
            raise ConflictException(f"Registration for {data.email} is already in progress")

        try:
            # Hash the password
            password_hash = get_password_hash(data.password)

            # Create registration request
            registration = RegistrationRequest(
                email=data.email,
                full_name=data.full_name,
                password_hash=password_hash,
                phone=data.phone,
                company_name=data.company_name,
                status=RegistrationStatus.PENDING,
            )

            db.add(registration)
            db.flush()  # Get the ID without committing

            # Generate and create email verification token
            token = RegistrationService._generate_verification_token(db, registration.id)

            db.commit()

            logger.info(f"Registration initiated for email: {data.email}")

            return registration

        except Exception as e:
            db.rollback()
            logger.error(f"Error initiating registration: {str(e)}")
            raise

    @staticmethod
    def _generate_verification_token(db: Session, registration_id: str) -> str:
        """
        Generate a unique verification token for email verification.

        Args:
            db: Database session
            registration_id: Registration request ID

        Returns:
            str: Generated verification token
        """
        # Generate a secure random token
        token = secrets.token_urlsafe(32)

        # Store token in database (in production, this would be hashed)
        email_token = EmailVerificationToken(
            token=token,
            registration_id=registration_id,
        )

        db.add(email_token)
        db.commit()

        return token

    @staticmethod
    def verify_email(
        db: Session,
        data: VerifyEmailRequest,
    ) -> RegistrationRequest:
        """
        Verify user email address using token.

        Args:
            db: Database session
            data: Email verification request data

        Returns:
            RegistrationRequest: Updated registration request

        Raises:
            NotFoundException: If registration not found
            BadRequestException: If token is invalid or expired
        """
        # Find registration request
        registration = db.query(RegistrationRequest).filter(
            RegistrationRequest.id == data.registration_id
        ).first()

        if not registration:
            raise NotFoundException(f"Registration request not found: {data.registration_id}")

        if registration.is_expired():
            registration.status = RegistrationStatus.EXPIRED
            db.commit()
            raise BadRequestException("Registration request has expired")

        if registration.email_verified:
            raise BadRequestException("Email has already been verified")

        # Find and validate token
        email_token = db.query(EmailVerificationToken).filter(
            and_(
                EmailVerificationToken.registration_id == registration.id,
                EmailVerificationToken.token == data.token,
            )
        ).first()

        if not email_token:
            raise BadRequestException("Invalid verification token")

        if not email_token.is_valid():
            raise BadRequestException("Verification token has expired or been used")

        try:
            # Mark email as verified
            registration.mark_email_verified()

            # Mark token as used
            email_token.used = True
            email_token.used_at = datetime.utcnow()

            db.commit()

            logger.info(f"Email verified for registration: {registration.id}")

            return registration

        except Exception as e:
            db.rollback()
            logger.error(f"Error verifying email: {str(e)}")
            raise

    @staticmethod
    def activate_account(
        db: Session,
        registration_id: str,
        admin_user_id: str | None = None,
    ) -> Tuple[RegistrationRequest, User, Customer]:
        """
        Activate account by creating User and Customer records.

        Args:
            db: Database session
            registration_id: Registration request ID
            admin_user_id: ID of admin activating the account (optional)

        Returns:
            Tuple of (RegistrationRequest, User, Customer)

        Raises:
            NotFoundException: If registration not found
            BadRequestException: If registration not ready for activation
        """
        # Find registration request
        registration = db.query(RegistrationRequest).filter(
            RegistrationRequest.id == registration_id
        ).first()

        if not registration:
            raise NotFoundException(f"Registration request not found: {registration_id}")

        if registration.is_expired():
            registration.status = RegistrationStatus.EXPIRED
            db.commit()
            raise BadRequestException("Registration request has expired")

        if not registration.email_verified:
            raise BadRequestException("Email must be verified before account activation")

        if registration.account_activated:
            raise BadRequestException("Account has already been activated")

        try:
            # Create User account with the password provided during registration
            user = User(
                email=registration.email,
                full_name=registration.full_name,
                password_hash=registration.password_hash,
                role=UserRole.CLIENT,
                is_active=True,
            )

            db.add(user)
            db.flush()

            # Create Customer record
            customer = Customer(
                name=registration.full_name,
                email=registration.email,
                phone=registration.phone or "",
                customer_type=CustomerType.CORPORATE if registration.company_name else CustomerType.INDIVIDUAL,
                status=CustomerStatus.ACTIVE,
                company_name=registration.company_name,
                created_by=admin_user_id or user.id,
            )

            db.add(customer)
            db.flush()

            # Update registration request
            registration.user_id = user.id
            registration.customer_id = customer.id
            registration.mark_activated()

            db.commit()

            logger.info(
                f"Account activated for registration {registration_id}: "
                f"user_id={user.id}, customer_id={customer.id}"
            )

            return registration, user, customer

        except Exception as e:
            db.rollback()
            logger.error(f"Error activating account: {str(e)}")
            raise

    @staticmethod
    def resend_verification_email(
        db: Session,
        registration_id: str,
    ) -> Tuple[RegistrationRequest, str]:
        """
        Resend verification email with new token.

        Args:
            db: Database session
            registration_id: Registration request ID

        Returns:
            Tuple of (RegistrationRequest, new_token)

        Raises:
            NotFoundException: If registration not found
            BadRequestException: If registration cannot be verified
        """
        registration = db.query(RegistrationRequest).filter(
            RegistrationRequest.id == registration_id
        ).first()

        if not registration:
            raise NotFoundException(f"Registration request not found: {registration_id}")

        if registration.is_expired():
            registration.status = RegistrationStatus.EXPIRED
            db.commit()
            raise BadRequestException("Registration request has expired")

        if registration.email_verified:
            raise BadRequestException("Email has already been verified")

        try:
            # Invalidate old tokens
            old_tokens = db.query(EmailVerificationToken).filter(
                EmailVerificationToken.registration_id == registration_id
            ).all()

            for token in old_tokens:
                if not token.used:
                    token.used = True
                    token.used_at = datetime.utcnow()

            # Generate new token
            new_token = RegistrationService._generate_verification_token(db, registration_id)

            db.commit()

            logger.info(f"Resent verification email for registration: {registration_id}")

            return registration, new_token

        except Exception as e:
            db.rollback()
            logger.error(f"Error resending verification email: {str(e)}")
            raise

    @staticmethod
    def cancel_registration(
        db: Session,
        registration_id: str,
    ) -> RegistrationRequest:
        """
        Cancel a registration request.

        Args:
            db: Database session
            registration_id: Registration request ID

        Returns:
            RegistrationRequest: Updated registration request

        Raises:
            NotFoundException: If registration not found
        """
        registration = db.query(RegistrationRequest).filter(
            RegistrationRequest.id == registration_id
        ).first()

        if not registration:
            raise NotFoundException(f"Registration request not found: {registration_id}")

        try:
            registration.status = RegistrationStatus.CANCELLED
            db.commit()

            logger.info(f"Registration cancelled: {registration_id}")

            return registration

        except Exception as e:
            db.rollback()
            logger.error(f"Error cancelling registration: {str(e)}")
            raise

    @staticmethod
    def get_registration(db: Session, registration_id: str) -> RegistrationRequest:
        """
        Get a registration request by ID.

        Args:
            db: Database session
            registration_id: Registration request ID

        Returns:
            RegistrationRequest

        Raises:
            NotFoundException: If registration not found
        """
        registration = db.query(RegistrationRequest).filter(
            RegistrationRequest.id == registration_id
        ).first()

        if not registration:
            raise NotFoundException(f"Registration request not found: {registration_id}")

        return registration

    @staticmethod
    def list_registrations(
        db: Session,
        skip: int = 0,
        limit: int = 20,
        status: Optional[RegistrationStatus] = None,
        email: Optional[str] = None,
    ) -> Tuple[list[RegistrationRequest], int]:
        """
        List registration requests with filtering.

        Args:
            db: Database session
            skip: Number of records to skip
            limit: Maximum number of records to return
            status: Filter by registration status
            email: Filter by email address

        Returns:
            Tuple of (registrations list, total count)
        """
        query = db.query(RegistrationRequest)

        if status:
            query = query.filter(RegistrationRequest.status == status)

        if email:
            query = query.filter(RegistrationRequest.email.ilike(f"%{email}%"))

        total = query.count()
        registrations = query.order_by(RegistrationRequest.created_at.desc()).offset(skip).limit(limit).all()

        return registrations, total
