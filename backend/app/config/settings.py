"""
Application settings and configuration management.
Uses Pydantic Settings for environment variable loading.
"""
from functools import lru_cache
from typing import List
import os

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator


def _is_production() -> bool:
    return os.getenv("ENVIRONMENT", "development").strip().lower() == "production"


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # App Configuration
    APP_NAME: str = "CloudManager"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    # Database Configuration
    DATABASE_URL: str = "postgresql+asyncpg://postgres:123456789@localhost:5432/cloudmanager"
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20
    DATABASE_ECHO: bool = False

    # Redis Configuration
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_PASSWORD: str | None = None
    REDIS_MAX_CONNECTIONS: int = 10

    # Cache TTL (Time To Live in seconds)
    CACHE_TTL_SHORT: int = 300  # 5 minutes
    CACHE_TTL_MEDIUM: int = 1800  # 30 minutes
    CACHE_TTL_LONG: int = 3600  # 1 hour
    CACHE_TTL_SESSION: int = 86400  # 24 hours

    # JWT Configuration
    JWT_SECRET_KEY: str = "your-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    @field_validator("JWT_SECRET_KEY")
    @classmethod
    def validate_jwt_secret(cls, v: str) -> str:
        if v == "your-secret-key-change-in-production" and _is_production():
            raise ValueError(
                "JWT_SECRET_KEY must be set to a secure value in production. "
                "Do not use the default. Set JWT_SECRET_KEY in environment."
            )
        return v

    # Security Configuration
    BCRYPT_ROUNDS: int = 12
    PASSWORD_HASH_ALGORITHM: str = "argon2"  # argon2 or bcrypt
    ARGON2_TIME_COST: int = 2
    ARGON2_MEMORY_COST: int = 65536  # 64 MB
    ARGON2_PARALLELISM: int = 4
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173", "http://localhost:3000", "http://localhost:80"]
    CORS_ALLOW_CREDENTIALS: bool = True

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    # Email Configuration (set via env; no default secrets)
    EMAIL_PROVIDER: str = "smtp"  # smtp | sendgrid | ses
    EMAIL_FROM: str = "noreply@localhost"
    EMAIL_FROM_NAME: str = "CloudManager"
    ADMIN_EMAIL: str = "admin@cloudmanager.dz"  # Admin email for critical notifications
    SENDGRID_API_KEY: str | None = None
    AWS_SES_REGION: str = "us-east-1"
    AWS_ACCESS_KEY_ID: str | None = None
    AWS_SECRET_ACCESS_KEY: str | None = None
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_USE_TLS: bool = True
    
    # Webhook Configuration
    SENDGRID_WEBHOOK_SECRET: str | None = None
    MAILGUN_WEBHOOK_SECRET: str | None = None

    # SMS Configuration (set via env; no default secrets)
    SMS_PROVIDER: str = "custom"  # Options: "custom", "twilio", "infobip", "mock"
    TWILIO_ACCOUNT_SID: str | None = None
    TWILIO_AUTH_TOKEN: str | None = None
    TWILIO_PHONE_NUMBER: str | None = None

    # 2FA Configuration
    TOTP_ISSUER: str = "CloudManager"
    TOTP_DIGITS: int = 6
    TOTP_INTERVAL: int = 30

    # File Storage Configuration
    STORAGE_PROVIDER: str = "local"
    STORAGE_PATH: str = "./storage"
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB

    # KYC Configuration
    KYC_MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    KYC_ALLOWED_MIME_TYPES: List[str] = [
        "image/jpeg",
        "image/png",
        "image/jpg",
        "application/pdf",
    ]
    KYC_ALLOWED_EXTENSIONS: List[str] = [".jpg", ".jpeg", ".png", ".pdf"]

    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_PER_MINUTE: int = 60

    # VPS / Docker Deployment Engine
    # - auto: prefer host Docker via docker-socket-proxy, fallback to DinD if proxy unreachable
    # - proxy: always use host Docker via proxy (builds happen on the host)
    # - dind: always use Docker-in-Docker inside the VPS (builds happen inside the VPS container)
    VPS_DOCKER_ENGINE_MODE: str = "auto"

    # Pagination
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100

    # cPanel / WHM Integration
    CPANEL_HOST: str | None = None  # e.g., host.yourdomain.com or IP
    CPANEL_USERNAME: str | None = None  # usually 'root' for WHM API
    WHM_API_TOKEN: str | None = None  # create in WHM -> Manage API Tokens
    CPANEL_SSL_VERIFY: bool = True

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        env_parse_none_str="",
        extra="ignore",
    )


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance.
    Uses lru_cache to ensure settings are loaded only once.
    """
    return Settings()
