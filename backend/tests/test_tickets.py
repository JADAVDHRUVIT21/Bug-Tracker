
def register_and_login(client, email):
    registration = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Ticket Test User",
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

    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def create_project(client, headers):
    response = client.post(
        "/api/v1/projects/",
        headers=headers,
        json={
            "name": "Ticket Test Project",
            "key": "TICKET",
            "description": "Project for ticket testing",
        },
    )
    assert response.status_code == 201
    return response.json()["id"]


def create_ticket(client, headers, project_id, title="Test Ticket"):
    return client.post(
        "/api/v1/tickets/",
        headers=headers,
        json={
            "title": title,
            "description": "Created for automated testing",
            "ticket_type": "bug",
            "priority": "high",
            "project_id": project_id,
        },
    )


def test_create_ticket(client):
    headers = register_and_login(client, "ticket1@example.com")
    project_id = create_project(client, headers)

    response = create_ticket(client, headers, project_id)

    assert response.status_code == 201

    data = response.json()
    assert data["title"] == "Test Ticket"
    assert data["ticket_type"] == "bug"
    assert data["status"] == "todo"
    assert data["priority"] == "high"
    assert data["project_id"] == project_id
    assert data["reporter_id"] > 0


def test_list_tickets(client):
    headers = register_and_login(client, "ticket2@example.com")
    project_id = create_project(client, headers)

    create_ticket(client, headers, project_id, "First Ticket")
    create_ticket(client, headers, project_id, "Second Ticket")

    response = client.get(
        f"/api/v1/tickets/?project_id={project_id}",
        headers=headers,
    )

    assert response.status_code == 200

    data = response.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2
    assert data["page"] == 1


def test_get_ticket(client):
    headers = register_and_login(client, "ticket3@example.com")
    project_id = create_project(client, headers)

    created = create_ticket(client, headers, project_id)
    ticket_id = created.json()["id"]

    response = client.get(
        f"/api/v1/tickets/{ticket_id}",
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json()["id"] == ticket_id


def test_update_ticket(client):
    headers = register_and_login(client, "ticket4@example.com")
    project_id = create_project(client, headers)

    created = create_ticket(client, headers, project_id)
    ticket_id = created.json()["id"]

    response = client.patch(
        f"/api/v1/tickets/{ticket_id}",
        headers=headers,
        json={
            "title": "Updated Ticket",
            "status": "in_progress",
            "priority": "critical",
        },
    )

    assert response.status_code == 200
    assert response.json()["title"] == "Updated Ticket"
    assert response.json()["status"] == "in_progress"
    assert response.json()["priority"] == "critical"


def test_delete_ticket(client):
    headers = register_and_login(client, "ticket5@example.com")
    project_id = create_project(client, headers)

    created = create_ticket(client, headers, project_id)
    ticket_id = created.json()["id"]

    response = client.delete(
        f"/api/v1/tickets/{ticket_id}",
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json()["message"] == "Ticket deleted successfully"

    get_response = client.get(
        f"/api/v1/tickets/{ticket_id}",
        headers=headers,
    )

    assert get_response.status_code == 404


def test_ticket_pagination(client):
    headers = register_and_login(client, "ticket6@example.com")
    project_id = create_project(client, headers)

    for number in range(1, 4):
        response = create_ticket(
            client,
            headers,
            project_id,
            f"Pagination Ticket {number}",
        )
        assert response.status_code == 201

    response = client.get(
        f"/api/v1/tickets/?project_id={project_id}&page=1&page_size=2",
        headers=headers,
    )

    assert response.status_code == 200

    data = response.json()
    assert data["total"] == 3
    assert len(data["items"]) == 2
    assert data["page"] == 1
    assert data["page_size"] == 2
    assert data["total_pages"] == 2


def test_ticket_search(client):
    headers = register_and_login(client, "ticket7@example.com")
    project_id = create_project(client, headers)

    create_ticket(client, headers, project_id, "Login Button Bug")
    create_ticket(client, headers, project_id, "Dashboard Feature")

    response = client.get(
        f"/api/v1/tickets/?project_id={project_id}&search=Login",
        headers=headers,
    )

    assert response.status_code == 200

    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["title"] == "Login Button Bug"


def test_ticket_status_filter(client):
    headers = register_and_login(client, "ticket8@example.com")
    project_id = create_project(client, headers)

    created = create_ticket(
        client, headers, project_id, "Status Filter Ticket"
    )
    ticket_id = created.json()["id"]

    client.patch(
        f"/api/v1/tickets/{ticket_id}",
        headers=headers,
        json={"status": "in_progress"},
    )

    response = client.get(
        f"/api/v1/tickets/?project_id={project_id}&ticket_status=in_progress",
        headers=headers,
    )

    assert response.status_code == 200

    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["status"] == "in_progress"


def test_outsider_cannot_access_ticket(client):
    owner_headers = register_and_login(
        client, "ticketowner@example.com"
    )
    outsider_headers = register_and_login(
        client, "ticketoutsider@example.com"
    )

    project_id = create_project(client, owner_headers)

    created = create_ticket(client, owner_headers, project_id)
    ticket_id = created.json()["id"]

    response = client.get(
        f"/api/v1/tickets/{ticket_id}",
        headers=outsider_headers,
    )

    assert response.status_code == 403
