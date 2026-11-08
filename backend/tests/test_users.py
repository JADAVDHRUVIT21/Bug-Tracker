
from app.models.user import User, UserRole


def register_and_login(client, email):
    registration = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "User Test Account",
            "email": email,
            "password": "TestPassword123",
        },
    )
    assert registration.status_code == 201

    login = client.post(
        "/api/v1/auth/login",
        json={
            "email": email,
            "password": "TestPassword123",
        },
    )
    assert login.status_code == 200

    return {
        "Authorization": f"Bearer {login.json()['access_token']}"
    }


def promote_to_admin(client, db_session, headers):
    profile = client.get(
        "/api/v1/users/me",
        headers=headers,
    )
    assert profile.status_code == 200

    user = db_session.query(User).filter(
        User.id == profile.json()["id"]
    ).first()

    user.role = UserRole.ADMIN
    db_session.commit()
    db_session.refresh(user)

    # Obtain a fresh token after the role change.
    login = client.post(
        "/api/v1/auth/login",
        json={
            "email": user.email,
            "password": "TestPassword123",
        },
    )
    assert login.status_code == 200

    return {
        "Authorization": f"Bearer {login.json()['access_token']}"
    }


def test_user_can_view_own_profile(client):
    headers = register_and_login(
        client, "userprofile@example.com"
    )

    response = client.get(
        "/api/v1/users/me",
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json()["email"] == "userprofile@example.com"
    assert response.json()["role"] == "developer"


def test_user_list_forbidden_for_developer(client):
    headers = register_and_login(
        client, "userlistdeveloper@example.com"
    )

    response = client.get(
        "/api/v1/users/",
        headers=headers,
    )

    assert response.status_code == 403


def test_admin_can_list_users(client, db_session):
    headers = register_and_login(
        client, "userlistadmin@example.com"
    )
    admin_headers = promote_to_admin(
        client, db_session, headers
    )

    response = client.get(
        "/api/v1/users/",
        headers=admin_headers,
    )

    assert response.status_code == 200
    assert isinstance(response.json(), list)
    assert len(response.json()) >= 1


def test_admin_can_get_user(client, db_session):
    headers = register_and_login(
        client, "getuseradmin@example.com"
    )
    admin_headers = promote_to_admin(
        client, db_session, headers
    )

    profile = client.get(
        "/api/v1/users/me",
        headers=admin_headers,
    )
    user_id = profile.json()["id"]

    response = client.get(
        f"/api/v1/users/{user_id}",
        headers=admin_headers,
    )

    assert response.status_code == 200
    assert response.json()["id"] == user_id


def test_developer_cannot_get_user_by_id(client):
    headers = register_and_login(
        client, "getuserdeveloper@example.com"
    )

    response = client.get(
        "/api/v1/users/1",
        headers=headers,
    )

    assert response.status_code == 403


def test_admin_can_update_user_name(client, db_session):
    headers = register_and_login(
        client, "updateuseradmin@example.com"
    )
    admin_headers = promote_to_admin(
        client, db_session, headers
    )

    profile = client.get(
        "/api/v1/users/me",
        headers=admin_headers,
    )
    user_id = profile.json()["id"]

    response = client.patch(
        f"/api/v1/users/{user_id}",
        headers=admin_headers,
        json={
            "full_name": "Updated Admin Name",
        },
    )

    assert response.status_code == 200
    assert response.json()["full_name"] == "Updated Admin Name"


def test_admin_can_change_user_role(client, db_session):
    admin_headers = register_and_login(
        client, "changeroleadmin@example.com"
    )
    admin_headers = promote_to_admin(
        client, db_session, admin_headers
    )

    developer_headers = register_and_login(
        client, "rolechangeuser@example.com"
    )
    developer_profile = client.get(
        "/api/v1/users/me",
        headers=developer_headers,
    )
    user_id = developer_profile.json()["id"]

    response = client.patch(
        f"/api/v1/users/{user_id}",
        headers=admin_headers,
        json={
            "role": "viewer",
        },
    )

    assert response.status_code == 200
    assert response.json()["role"] == "viewer"


def test_admin_cannot_assign_duplicate_email(
    client, db_session
):
    admin_headers = register_and_login(
        client, "duplicateemailadmin@example.com"
    )
    admin_headers = promote_to_admin(
        client, db_session, admin_headers
    )

    other_headers = register_and_login(
        client, "existingemail@example.com"
    )
    other_profile = client.get(
        "/api/v1/users/me",
        headers=other_headers,
    )

    admin_profile = client.get(
        "/api/v1/users/me",
        headers=admin_headers,
    )
    admin_id = admin_profile.json()["id"]

    response = client.patch(
        f"/api/v1/users/{admin_id}",
        headers=admin_headers,
        json={
            "email": "existingemail@example.com",
        },
    )

    assert response.status_code == 409
    assert response.json()["detail"] == (
        "An account with this email already exists"
    )


def test_admin_get_nonexistent_user_returns_404(
    client, db_session
):
    headers = register_and_login(
        client, "missinguseradmin@example.com"
    )
    admin_headers = promote_to_admin(
        client, db_session, headers
    )

    response = client.get(
        "/api/v1/users/999999",
        headers=admin_headers,
    )

    assert response.status_code == 404