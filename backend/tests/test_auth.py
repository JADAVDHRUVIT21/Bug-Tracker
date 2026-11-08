
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