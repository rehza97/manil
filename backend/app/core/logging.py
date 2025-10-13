"""
Centralized logging configuration for CloudManager.

Provides structured logging with different handlers for development and production.
"""

import logging
import sys
from pathlib import Path
from logging.handlers import RotatingFileHandler
from datetime import datetime

from app.config.settings import get_settings

settings = get_settings()


def setup_logging() -> logging.Logger:
    """
    Configure and return the application logger.

    Returns:
        Configured logger instance
    """
    logger = logging.getLogger("cloudmanager")

    # Avoid duplicate handlers
    if logger.handlers:
        return logger

    # Set log level based on environment
    log_level = logging.DEBUG if settings.DEBUG else logging.INFO
    logger.setLevel(log_level)

    # Create formatters
    detailed_formatter = logging.Formatter(
        "[%(asctime)s] %(levelname)s [%(name)s.%(funcName)s:%(lineno)d] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    simple_formatter = logging.Formatter(
        "%(levelname)s: %(message)s"
    )

    # Console Handler (always enabled)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    console_handler.setFormatter(simple_formatter if settings.DEBUG else detailed_formatter)
    logger.addHandler(console_handler)

    # File Handler (production only)
    if not settings.DEBUG and settings.ENVIRONMENT != "development":
        log_dir = Path("logs")
        log_dir.mkdir(exist_ok=True)

        # Application log
        app_log_file = log_dir / f"cloudmanager_{datetime.now():%Y%m%d}.log"
        file_handler = RotatingFileHandler(
            app_log_file,
            maxBytes=10 * 1024 * 1024,  # 10MB
            backupCount=10,
        )
        file_handler.setLevel(logging.INFO)
        file_handler.setFormatter(detailed_formatter)
        logger.addHandler(file_handler)

        # Error log
        error_log_file = log_dir / f"errors_{datetime.now():%Y%m%d}.log"
        error_handler = RotatingFileHandler(
            error_log_file,
            maxBytes=10 * 1024 * 1024,  # 10MB
            backupCount=10,
        )
        error_handler.setLevel(logging.ERROR)
        error_handler.setFormatter(detailed_formatter)
        logger.addHandler(error_handler)

    return logger


# Global logger instance
logger = setup_logging()


def log_exception(exc: Exception, context: str = "") -> None:
    """
    Log an exception with context.

    Args:
        exc: Exception to log
        context: Additional context information
    """
    if context:
        logger.error(f"{context}: {exc}", exc_info=True)
    else:
        logger.error(f"Exception occurred: {exc}", exc_info=True)


def log_request(method: str, path: str, status_code: int, duration: float) -> None:
    """
    Log an HTTP request.

    Args:
        method: HTTP method
        path: Request path
        status_code: Response status code
        duration: Request duration in milliseconds
    """
    logger.info(f"{method} {path} {status_code} - {duration:.2f}ms")


def log_auth_event(event: str, user_id: str = None, details: str = "") -> None:
    """
    Log an authentication event.

    Args:
        event: Event type (login, logout, failed_login, etc.)
        user_id: User ID if available
        details: Additional details
    """
    msg = f"Auth Event: {event}"
    if user_id:
        msg += f" | User: {user_id}"
    if details:
        msg += f" | {details}"
    logger.info(msg)
