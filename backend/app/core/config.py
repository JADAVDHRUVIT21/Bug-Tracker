
from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "Bug Tracker API"
    APP_ENV: Literal["development", "testing", "production"] = "development"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"

    DATABASE_URL: str

    SECRET_KEY: str
    ALGORITHM: Literal["HS256"] = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30, gt=0)

    UPLOAD_DIR: str = "uploads/attachments"
    MAX_UPLOAD_SIZE: int = Field(default=5242880, gt=0)

    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://bug-tracker-bugbase.vercel.app"
        
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    @field_validator("API_V1_PREFIX")
    @classmethod
    def validate_api_prefix(cls, value: str) -> str:
        value = value.strip()

        if not value.startswith("/"):
            raise ValueError("API_V1_PREFIX must start with '/'")

        return value.rstrip("/") or "/"

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, value: str) -> str:
        value = value.strip()

        if not value:
            raise ValueError("SECRET_KEY cannot be empty")

        return value

    @field_validator("CORS_ORIGINS")
    @classmethod
    def validate_cors_origins(cls, value: list[str]) -> list[str]:
        return [origin.strip().rstrip("/") for origin in value if origin.strip()]

    @model_validator(mode="after")
    def validate_environment(self):
        if self.APP_ENV == "production":
            if self.DEBUG:
                raise ValueError("DEBUG must be False in production")

            if not self.CORS_ORIGINS:
                 raise ValueError(
                     "At least one CORS origin must be configured in production"
                  )

            if len(self.SECRET_KEY.encode("utf-8")) < 32:
                raise ValueError(
                    "Production SECRET_KEY must contain at least 32 bytes"
                )

            if "*" in self.CORS_ORIGINS:
                raise ValueError(
                    "Wildcard CORS origins are not allowed in production"
                )

        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()