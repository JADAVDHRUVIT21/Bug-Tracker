
def register_and_login(client, email):
    registration = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Project Test User",
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

    token = login.json()["access_token"]

    return {"Authorization": f"Bearer {token}"}


def create_project(client, headers, key="TEST"):
    return client.post(
        "/api/v1/projects/",
        headers=headers,
        json={
            "name": "Test Project",
            "key": key,
            "description": "Project created for automated testing",
        },
    )


def test_create_project(client):
    headers = register_and_login(client, "project1@example.com")

    response = create_project(client, headers)

    assert response.status_code == 201
    assert response.json()["name"] == "Test Project"
    assert response.json()["key"] == "TEST"
    assert response.json()["owner_id"] > 0


def test_duplicate_project_key(client):
    headers = register_and_login(client, "project2@example.com")

    first = create_project(client, headers, "DUP")
    second = create_project(client, headers, "DUP")

    assert first.status_code == 201
    assert second.status_code == 409


def test_list_projects(client):
    headers = register_and_login(client, "project3@example.com")

    create_project(client, headers, "LIST1")
    create_project(client, headers, "LIST2")

    response = client.get(
        "/api/v1/projects/",
        headers=headers,
    )

    assert response.status_code == 200
    assert len(response.json()) == 2


def test_get_project(client):
    headers = register_and_login(client, "project4@example.com")

    created = create_project(client, headers)
    project_id = created.json()["id"]

    response = client.get(
        f"/api/v1/projects/{project_id}",
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json()["id"] == project_id


def test_update_project(client):
    headers = register_and_login(client, "project5@example.com")

    created = create_project(client, headers)
    project_id = created.json()["id"]

    response = client.patch(
        f"/api/v1/projects/{project_id}",
        headers=headers,
        json={
            "name": "Updated Test Project",
            "description": "Updated description",
        },
    )

    assert response.status_code == 200
    assert response.json()["name"] == "Updated Test Project"
    assert response.json()["description"] == "Updated description"


def test_delete_project(client):
    headers = register_and_login(client, "project6@example.com")

    created = create_project(client, headers)
    project_id = created.json()["id"]

    response = client.delete(
        f"/api/v1/projects/{project_id}",
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json()["message"] == "Project deleted successfully"

    get_response = client.get(
        f"/api/v1/projects/{project_id}",
        headers=headers,
    )

    assert get_response.status_code == 404


def test_create_project_without_token(client):
    response = client.post(
        "/api/v1/projects/",
        json={
            "name": "Unauthorized Project",
            "key": "UNAUTH",
        },
    )

    assert response.status_code == 401