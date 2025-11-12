"""
User registration API routes.
Endpoints for user registration, email verification, and account activation.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

from app.config.database import get_db
from app.core.exceptions import (
    NotFoundException,
    ConflictException,
    BadRequestException,
)
from app.modules.auth.registration_schemas import (
    RegistrationRequest as RegistrationRequestSchema,
    RegistrationResponse,
    RegistrationListResponse,
    VerifyEmailRequest,
    VerifyEmailResponse,
    ActivateAccountRequest,
    ActivateAccountResponse,
    ResendVerificationEmailRequest,
    ResendVerificationEmailResponse,
    RegistrationStatus,
)
from app.modules.auth.registration_service import RegistrationService
from app.infrastructure.email.service import EmailService

router = APIRouter(prefix="/auth/register", tags=["registration"])
email_service = EmailService()


@router.post("", response_model=RegistrationResponse, status_code=status.HTTP_201_CREATED)
def register(
    registration_data: RegistrationRequestSchema,
    db: Session = Depends(get_db),
):
    """
    Initiate user registration.

    Creates a registration request and sends verification email.
    User must verify email and activate account to complete registration.

    **Request body:**
    - email: Email address for new account
    - full_name: Full name of user
    - password: Account password (min 8 characters)
    - phone: Phone number (optional)
    - company_name: Company name for corporate registration (optional)

    **Response:**
    - Returns registration request with ID and status
    - Verification email sent to provided email address
    """
    try:
        registration = RegistrationService.initiate_registration(db, registration_data)

        # Get the verification token that was created during registration
        from app.modules.auth.registration_models import EmailVerificationToken
        token = db.query(EmailVerificationToken).filter(
            EmailVerificationToken.registration_id == registration.id
        ).order_by(EmailVerificationToken.created_at.desc()).first()

        try:
            # Send verification email with token
            if token:
                # In production, use your frontend domain
                verification_link = f"http://localhost:3000/verify-email?registration_id={registration.id}&token={token.token}"
            else:
                # Fallback if token creation failed
                verification_link = f"http://localhost:3000/verify-email?registration_id={registration.id}"

            email_service.send_email(
                to=registration.email,
                subject="Verify your email address",
                template="verification_email",
                context={
                    "full_name": registration.full_name,
                    "verification_link": verification_link,
                    "expires_in_hours": 24,
                },
            )
        except Exception as e:
            # Log email error but don't fail registration
            logger.warning(f"Failed to send verification email to {registration.email}: {str(e)}")

        return RegistrationResponse.model_validate(registration)

    except ConflictException as e:
        raise HTTPException(status_code=409, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{registration_id}", response_model=RegistrationResponse)
def get_registration(
    registration_id: str,
    db: Session = Depends(get_db),
):
    """
    Get registration request details by ID.

    Returns current status and information about a registration request.
    """
    try:
        registration = RegistrationService.get_registration(db, registration_id)
        return RegistrationResponse.model_validate(registration)
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/verify-email", response_model=VerifyEmailResponse)
def verify_email(
    data: VerifyEmailRequest,
    db: Session = Depends(get_db),
):
    """
    Verify user email with token.

    After registration, user receives email with verification token.
    This endpoint confirms the email address using that token.

    **Request body:**
    - registration_id: Registration request ID
    - token: Verification token from email

    **Response:**
    - Returns updated registration with email_verified status
    """
    try:
        registration = RegistrationService.verify_email(db, data)
        return VerifyEmailResponse(
            id=registration.id,
            email=registration.email,
            status=registration.status,
            email_verified=registration.email_verified,
            email_verified_at=registration.email_verified_at,
            message="Email verified successfully. Please proceed to account activation.",
        )
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except BadRequestException as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/resend-verification-email", response_model=ResendVerificationEmailResponse)
def resend_verification_email(
    data: ResendVerificationEmailRequest,
    db: Session = Depends(get_db),
):
    """
    Resend verification email with new token.

    If user didn't receive or lost the verification email, request a new one.

    **Request body:**
    - registration_id: Registration request ID

    **Response:**
    - Returns success message
    - New verification email sent
    """
    try:
        registration, token = RegistrationService.resend_verification_email(db, data.registration_id)

        try:
            # Send new verification email
            verification_link = f"http://localhost:3000/verify-email?registration_id={registration.id}&token={token}"
            email_service.send_email(
                to=registration.email,
                subject="Verify your email address",
                template="verification_email",
                context={
                    "full_name": registration.full_name,
                    "verification_link": verification_link,
                    "expires_in_hours": 24,
                },
            )
        except Exception as e:
            print(f"Failed to send verification email: {str(e)}")

        return ResendVerificationEmailResponse(
            message="Verification email sent successfully",
            registration_id=registration.id,
            email=registration.email,
        )
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except BadRequestException as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/activate", response_model=ActivateAccountResponse)
def activate_account(
    data: ActivateAccountRequest,
    db: Session = Depends(get_db),
):
    """
    Activate account after email verification.

    Final step of registration. Creates User and Customer records.
    User can then log in with registered credentials.

    **Request body:**
    - registration_id: Registration request ID

    **Response:**
    - Returns newly created user_id and customer_id
    - Account is now active
    """
    try:
        registration, user, customer = RegistrationService.activate_account(
            db, data.registration_id
        )

        try:
            # Send welcome email
            email_service.send_email(
                to=registration.email,
                subject="Welcome to our platform!",
                template="welcome_email",
                context={
                    "full_name": registration.full_name,
                    "login_url": "http://localhost:3000/login",
                },
            )
        except Exception as e:
            print(f"Failed to send welcome email: {str(e)}")

        return ActivateAccountResponse(
            id=registration.id,
            user_id=user.id,
            customer_id=customer.id,
            status=registration.status,
            account_activated=registration.account_activated,
            activated_at=registration.activated_at,
            message="Account activated successfully. You can now log in.",
        )
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except BadRequestException as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{registration_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_registration(
    registration_id: str,
    db: Session = Depends(get_db),
):
    """
    Cancel a registration request.

    Can be used to cancel incomplete registration.
    """
    try:
        RegistrationService.cancel_registration(db, registration_id)
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("", response_model=RegistrationListResponse)
def list_registrations(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: RegistrationStatus | None = Query(None),
    email: str | None = Query(None),
    db: Session = Depends(get_db),
):
    """
    List registration requests with filtering.

    **Query parameters:**
    - page: Page number (default 1)
    - page_size: Records per page (default 20, max 100)
    - status: Filter by registration status (optional)
    - email: Filter by email address (optional, partial match)

    **Response:**
    - Returns paginated list of registration requests
    """
    skip = (page - 1) * page_size

    registrations, total = RegistrationService.list_registrations(
        db,
        skip=skip,
        limit=page_size,
        status=status,
        email=email,
    )

    return RegistrationListResponse(
        data=[RegistrationResponse.model_validate(r) for r in registrations],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )
