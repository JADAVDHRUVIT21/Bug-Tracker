import pytest
from pydantic import ValidationError

from app.core.config import Settings


def create_settings(**overrides):
    config = {
        "DATABASE_URL": "postgresql+psycopg://test:test@localhost/test",
        "SECRET_KEY": "test-secret",
    }
    config.update(overrides)
    return Settings(**config)


def test_valid_configuration():
    settings = create_settings()

    assert settings.APP_NAME == "Bug Tracker API"
    assert settings.API_V1_PREFIX == "/api/v1"


def test_invalid_api_prefix_rejected():
    with pytest.raises(ValidationError):
        create_settings(API_V1_PREFIX="api/v1")


def test_empty_secret_key_rejected():
    with pytest.raises(ValidationError):
        create_settings(SECRET_KEY="   ")


def test_zero_token_expiry_rejected():
    with pytest.raises(ValidationError):
        create_settings(ACCESS_TOKEN_EXPIRE_MINUTES=0)


def test_zero_upload_size_rejected():
    with pytest.raises(ValidationError):
        create_settings(MAX_UPLOAD_SIZE=0)


def test_production_debug_rejected():
    with pytest.raises(ValidationError):
        create_settings(
            APP_ENV="production",
            DEBUG=True,
            SECRET_KEY="x" * 32,
        )


def test_short_production_secret_rejected():
    with pytest.raises(ValidationError):
        create_settings(
            APP_ENV="production",
            SECRET_KEY="short",
        )


def test_production_wildcard_cors_rejected():
    with pytest.raises(ValidationError):
        create_settings(
            APP_ENV="production",
            SECRET_KEY="x" * 32,
            CORS_ORIGINS=["*"],
        )


def test_production_empty_cors_rejected():
    with pytest.raises(ValidationError):
        create_settings(
            APP_ENV="production",
            SECRET_KEY="x" * 32,
            CORS_ORIGINS=[],
        )


def test_cors_origins_are_normalized():
    settings = create_settings(
        CORS_ORIGINS=[
            " http://localhost:5173/ ",
            "http://127.0.0.1:5173/",
        ]
    )

    assert settings.CORS_ORIGINS == [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
