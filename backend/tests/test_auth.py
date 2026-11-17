
import pytest
from jose import jwt

from app.core.config import settings
from app.core.security import create_access_token


def test_user_registration(client):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Test Developer",
            "email": "testdeveloper@example.com",
            "password": "TestPassword123",
        },
    )

    assert response.status_code == 201

    data = response.json()

    assert data["full_name"] == "Test Developer"
    assert data["email"] == "testdeveloper@example.com"
    assert data["role"] == "developer"
    assert data["is_active"] is True
    assert "hashed_password" not in data


def test_duplicate_registration(client):
    user_data = {
        "full_name": "Test Developer",
        "email": "duplicate@example.com",
        "password": "TestPassword123",
    }

    first_response = client.post(
        "/api/v1/auth/register",
        json=user_data,
    )

    second_response = client.post(
        "/api/v1/auth/register",
        json=user_data,
    )

    assert first_response.status_code == 201
    assert second_response.status_code == 409


def test_login_and_get_profile(client):
    registration_response = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Login Tester",
            "email": "login@example.com",
            "password": "TestPassword123",
        },
    )

    assert registration_response.status_code == 201

    login_response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "login@example.com",
            "password": "TestPassword123",
        },
    )

    assert login_response.status_code == 200

    token = login_response.json()["access_token"]

    assert login_response.json()["token_type"] == "bearer"

    profile_response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert profile_response.status_code == 200
    assert profile_response.json()["email"] == "login@example.com"
    assert profile_response.json()["full_name"] == "Login Tester"


def test_login_with_wrong_password(client):
    client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Wrong Password Tester",
            "email": "wrongpassword@example.com",
            "password": "CorrectPassword123",
        },
    )

    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "wrongpassword@example.com",
            "password": "IncorrectPassword123",
        },
    )

    assert response.status_code == 401


def test_profile_without_token(client):
    response = client.get("/api/v1/auth/me")

    assert response.status_code == 401


@pytest.mark.parametrize(
    "subject",
    ["abc", "0", "-1", ""],
)
def test_profile_rejects_invalid_jwt_subject(client, subject):
    token = create_access_token(subject=subject)

    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 401


def test_profile_rejects_non_string_jwt_subject(client):
    token = jwt.encode(
        {"sub": 123},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )

    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 401


def test_registration_rejects_short_password(client):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Short Password",
            "email": "shortpassword@example.com",
            "password": "123",
        },
    )

    assert response.status_code == 422


def test_registration_rejects_password_over_72_bytes(client):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Long Password",
            "email": "longpassword@example.com",
            "password": "A" * 73,
        },
    )

    assert response.status_code == 422


def test_registration_rate_limit(client):
    for index in range(3):
        response = client.post(
            "/api/v1/auth/register",
            json={
                "full_name": f"Rate Limit User {index}",
                "email": f"ratelimit{index}@example.com",
                "password": "TestPassword123",
            },
        )

        assert response.status_code == 201

    response = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Rate Limit User 4",
            "email": "ratelimit4@example.com",
            "password": "TestPassword123",
        },
    )

    assert response.status_code == 429


def test_login_rate_limit(client):
    registration_response = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Login Rate Tester",
            "email": "loginratelimit@example.com",
            "password": "TestPassword123",
        },
    )

    assert registration_response.status_code == 201

    login_data = {
        "email": "loginratelimit@example.com",
        "password": "TestPassword123",
    }

    for _ in range(5):
        response = client.post(
            "/api/v1/auth/login",
            json=login_data,
        )
        assert response.status_code == 200

    response = client.post(
        "/api/v1/auth/login",
        json=login_data,
    )

    assert response.status_code == 429


def test_form_login_rate_limit(client):
    registration_response = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Form Login Tester",
            "email": "formratelimit@example.com",
            "password": "TestPassword123",
        },
    )

    assert registration_response.status_code == 201

    login_data = {
        "username": "formratelimit@example.com",
        "password": "TestPassword123",
    }

    for _ in range(5):
        response = client.post(
            "/api/v1/auth/login/form",
            data=login_data,
        )
        assert response.status_code == 200

    response = client.post(
        "/api/v1/auth/login/form",
        data=login_data,
    )

    assert response.status_code == 429


def test_profile_rejects_expired_token(client):
    from datetime import timedelta

    token = create_access_token(
        subject="1",
        expires_delta=timedelta(seconds=-1),
    )

    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 401


def test_profile_rejects_wrong_secret_token(client):
    token = jwt.encode(
        {"sub": "1"},
        "incorrect-secret-key-for-testing",
        algorithm=settings.ALGORITHM,
    )

    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 401
