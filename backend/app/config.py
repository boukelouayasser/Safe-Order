"""
Safe Order — Application Configuration
Loads settings from environment variables via pydantic-settings.
"""
from pydantic_settings import BaseSettings
from typing import Optional, List


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Safe Order"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    DEMO_MODE: bool = True  # Enables demo shortcuts (fake OTP, fake payments)

    # Database
    DATABASE_URL: str = "sqlite:///./safeorder.db"

    # JWT Auth
    SECRET_KEY: str = "dev-secret-key-change-in-production-please"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day for demo comfort
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    # FRONTEND_URL is the canonical production frontend.
    # CORS_ORIGINS is a comma-separated list for additional origins (preview deployments, etc.).
    # Set CORS_ALLOW_ALL=True to allow any origin (only for staging/dev).
    FRONTEND_URL: str = "http://localhost:5173"
    CORS_ORIGINS: str = ""
    CORS_ALLOW_ALL: bool = False

    # Simulated Services
    DEMO_OTP_CODE: str = "123456"
    DEMO_PAYMENT_SUCCESS: bool = True

    # SMS (Twilio — unused in demo mode)
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    TWILIO_PHONE_NUMBER: Optional[str] = None

    @property
    def cors_origin_list(self) -> List[str]:
        origins = {
            self.FRONTEND_URL,
            "http://localhost:5173",
            "http://localhost:3000",
            "http://127.0.0.1:5173",
        }
        for extra in (self.CORS_ORIGINS or "").split(","):
            extra = extra.strip()
            if extra:
                origins.add(extra)
        return [o for o in origins if o]

    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
        "extra": "ignore",
    }


settings = Settings()
