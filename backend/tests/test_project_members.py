
def register_and_login(client, email, full_name="Team Test User"):
    registration = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": full_name,
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
    }, registration.json()["id"]


def create_project(client, headers):
    response = client.post(
        "/api/v1/projects/",
        headers=headers,
        json={
            "name": "Team Test Project",
            "key": "TEAM",
            "description": "Project for team testing",
        },
    )
    assert response.status_code == 201
    return response.json()["id"]


def test_add_project_member(client):
    owner_headers, _ = register_and_login(
        client, "teamowner1@example.com"
    )
    _, member_id = register_and_login(
        client, "teammember1@example.com"
    )

    project_id = create_project(client, owner_headers)

    response = client.post(
        f"/api/v1/projects/{project_id}/members",
        headers=owner_headers,
        json={"user_id": member_id},
    )

    assert response.status_code == 201
    assert response.json()["project_id"] == project_id
    assert response.json()["user_id"] == member_id


def test_duplicate_project_member(client):
    owner_headers, _ = register_and_login(
        client, "teamowner2@example.com"
    )
    _, member_id = register_and_login(
        client, "teammember2@example.com"
    )

    project_id = create_project(client, owner_headers)
    url = f"/api/v1/projects/{project_id}/members"

    first = client.post(
        url,
        headers=owner_headers,
        json={"user_id": member_id},
    )
    second = client.post(
        url,
        headers=owner_headers,
        json={"user_id": member_id},
    )

    assert first.status_code == 201
    assert second.status_code == 409


def test_list_project_members(client):
    owner_headers, _ = register_and_login(
        client, "teamowner3@example.com"
    )
    _, member_id = register_and_login(
        client, "teammember3@example.com"
    )

    project_id = create_project(client, owner_headers)

    client.post(
        f"/api/v1/projects/{project_id}/members",
        headers=owner_headers,
        json={"user_id": member_id},
    )

    response = client.get(
        f"/api/v1/projects/{project_id}/members",
        headers=owner_headers,
    )

    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["user_id"] == member_id


def test_remove_project_member(client):
    owner_headers, _ = register_and_login(
        client, "teamowner4@example.com"
    )
    _, member_id = register_and_login(
        client, "teammember4@example.com"
    )

    project_id = create_project(client, owner_headers)

    client.post(
        f"/api/v1/projects/{project_id}/members",
        headers=owner_headers,
        json={"user_id": member_id},
    )

    response = client.delete(
        f"/api/v1/projects/{project_id}/members/{member_id}",
        headers=owner_headers,
    )

    assert response.status_code == 200
    assert response.json()["message"] == "Project member removed successfully"


def test_non_owner_cannot_add_member(client):
    owner_headers, _ = register_and_login(
        client, "teamowner5@example.com"
    )
    outsider_headers, _ = register_and_login(
        client, "teamoutsider5@example.com"
    )
    _, new_member_id = register_and_login(
        client, "teamnewmember5@example.com"
    )

    project_id = create_project(client, owner_headers)

    response = client.post(
        f"/api/v1/projects/{project_id}/members",
        headers=outsider_headers,
        json={"user_id": new_member_id},
    )

    assert response.status_code == 403


def test_project_owner_cannot_be_added_as_member(client):
    owner_headers, owner_id = register_and_login(
        client, "teamowner6@example.com"
    )

    project_id = create_project(client, owner_headers)

    response = client.post(
        f"/api/v1/projects/{project_id}/members",
        headers=owner_headers,
        json={"user_id": owner_id},
    )

    assert response.status_code == 409