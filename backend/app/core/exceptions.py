"""
Custom exception classes for the application.
All exceptions inherit from CloudManagerException.
"""
from fastapi import HTTPException, status


class CloudManagerException(HTTPException):
    """
    Base exception for CloudManager application.

    All custom exceptions should inherit from this class.
    """

    def __init__(
        self,
        detail: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        headers: dict | None = None,
    ):
        super().__init__(status_code=status_code, detail=detail, headers=headers)


class NotFoundException(CloudManagerException):
    """
    Exception raised when a requested resource is not found.

    Args:
        detail: Description of what was not found
    """

    def __init__(self, detail: str = "Resource not found"):
        super().__init__(detail=detail, status_code=status.HTTP_404_NOT_FOUND)


class ConflictException(CloudManagerException):
    """
    Exception raised when a resource conflict occurs.

    Args:
        detail: Description of the conflict
    """

    def __init__(self, detail: str = "Resource already exists"):
        super().__init__(detail=detail, status_code=status.HTTP_409_CONFLICT)


class UnauthorizedException(CloudManagerException):
    """
    Exception raised when authentication fails.

    Args:
        detail: Description of the authentication failure
    """

    def __init__(self, detail: str = "Authentication required"):
        super().__init__(
            detail=detail,
            status_code=status.HTTP_401_UNAUTHORIZED,
            headers={"WWW-Authenticate": "Bearer"},
        )


class ForbiddenException(CloudManagerException):
    """
    Exception raised when user lacks permission for an action.

    Args:
        detail: Description of the forbidden action
    """

    def __init__(self, detail: str = "Insufficient permissions"):
        super().__init__(detail=detail, status_code=status.HTTP_403_FORBIDDEN)


class ValidationException(CloudManagerException):
    """
    Exception raised when data validation fails.

    Args:
        detail: Description of the validation error
    """

    def __init__(self, detail: str = "Validation error"):
        super().__init__(
            detail=detail, status_code=status.HTTP_422_UNPROCESSABLE_ENTITY
        )


class RateLimitException(CloudManagerException):
    """
    Exception raised when rate limit is exceeded.

    Args:
        detail: Description of the rate limit error
    """

    def __init__(self, detail: str = "Rate limit exceeded"):
        super().__init__(
            detail=detail, status_code=status.HTTP_429_TOO_MANY_REQUESTS
        )
