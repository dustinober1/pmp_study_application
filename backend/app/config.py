"""
Application configuration using Pydantic Settings.
Loads configuration from environment variables with sensible defaults.
"""

from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_name: str = "PMP 2026 Study API"
    debug: bool = False
    environment: str = "development"

    # Database
    database_url: str = "postgresql://postgres:postgres@localhost:5432/pmp_study"

    # CORS - comma-separated list of allowed origins
    # For local dev, supports multiple ports: http://localhost:3000,http://localhost:3001
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    # Security
    secret_key: str = "dev-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days

    # PayPal Configuration
    paypal_mode: str = "sandbox"  # sandbox or live
    paypal_client_id: str = ""
    paypal_client_secret: str = ""
    paypal_webhook_id: str = ""
    paypal_webhook_url: str = ""
    paypal_product_id: str = ""
    paypal_plan_monthly: str = ""
    paypal_plan_yearly: str = ""

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.cors_origins.split(",")]


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
