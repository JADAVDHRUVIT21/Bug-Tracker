
def register_and_login(client, email):
    registration = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Comment Test User",
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


def create_project(client, headers, key="COMMENT"):
    response = client.post(
        "/api/v1/projects/",
        headers=headers,
        json={
            "name": "Comment Test Project",
            "key": key,
            "description": "Project for comment testing",
        },
    )
    assert response.status_code == 201
    return response.json()["id"]


def create_ticket(client, headers, project_id=None, title="Comment Test Ticket"):
    if project_id is None:
        raise ValueError("project_id is required to create a ticket")

    response = client.post(
        "/api/v1/tickets/",
        headers=headers,
        json={
            "title": title,
            "description": "Ticket for comment testing",
            "ticket_type": "bug",
            "priority": "medium",
            "project_id": project_id,
        },
    )
    assert response.status_code == 201
    return response.json()["id"]
    response = client.post(
        "/api/v1/tickets/",
        headers=headers,
        json={
            "title": title,
            "description": "Ticket for comment testing",
            "ticket_type": "bug",
            "priority": "medium",
            "project_id": project_id,
        },
    )
    assert response.status_code == 201
    return response.json()["id"]


def create_comment(client, headers, ticket_id, content="Test comment"):
    return client.post(
        f"/api/v1/tickets/{ticket_id}/comments",
        headers=headers,
        json={"content": content},
    )


def test_create_comment(client):
    headers = register_and_login(client, "comment1@example.com")
    project_id = create_project(client, headers)
    ticket_id = create_ticket(client, headers, project_id)

    response = create_comment(
        client, headers, ticket_id, "This is my first comment"
    )

    assert response.status_code == 201

    data = response.json()
    assert data["content"] == "This is my first comment"
    assert data["ticket_id"] == ticket_id
    assert data["author_id"] > 0
    assert data["parent_id"] is None


def test_list_ticket_comments(client):
    headers = register_and_login(client, "comment2@example.com")
    project_id = create_project(client, headers)
    ticket_id = create_ticket(client, headers, project_id)

    create_comment(client, headers, ticket_id, "First comment")
    create_comment(client, headers, ticket_id, "Second comment")

    response = client.get(
        f"/api/v1/tickets/{ticket_id}/comments",
        headers=headers,
    )

    assert response.status_code == 200
    assert len(response.json()) == 2
    assert response.json()[0]["content"] == "First comment"
    assert response.json()[1]["content"] == "Second comment"


def test_create_threaded_reply(client):
    headers = register_and_login(client, "comment3@example.com")
    project_id = create_project(client, headers)
    ticket_id = create_ticket(client, headers, project_id)

    parent = create_comment(
        client, headers, ticket_id, "Parent comment"
    )
    parent_id = parent.json()["id"]

    reply = client.post(
        f"/api/v1/tickets/{ticket_id}/comments",
        headers=headers,
        json={
            "content": "This is a reply",
            "parent_id": parent_id,
        },
    )

    assert reply.status_code == 201
    assert reply.json()["content"] == "This is a reply"
    assert reply.json()["parent_id"] == parent_id


def test_reply_to_comment_from_another_ticket_is_rejected(client):
    headers = register_and_login(client, "comment4@example.com")
    project_id = create_project(client, headers)

    first_ticket = create_ticket(
        client, headers, project_id, "First Ticket"
    )
    second_ticket = create_ticket(
        client, headers, project_id, "Second Ticket"
    )

    parent = create_comment(
        client, headers, first_ticket, "Comment on first ticket"
    )

    response = client.post(
        f"/api/v1/tickets/{second_ticket}/comments",
        headers=headers,
        json={
            "content": "Invalid cross-ticket reply",
            "parent_id": parent.json()["id"],
        },
    )

    assert response.status_code == 400


def test_update_own_comment(client):
    headers = register_and_login(client, "comment5@example.com")
    project_id = create_project(client, headers)
    ticket_id = create_ticket(client, headers, project_id)

    created = create_comment(
        client, headers, ticket_id, "Original comment"
    )
    comment_id = created.json()["id"]

    response = client.patch(
        f"/api/v1/comments/{comment_id}",
        headers=headers,
        json={"content": "Updated comment"},
    )

    assert response.status_code == 200
    assert response.json()["content"] == "Updated comment"


def test_user_cannot_update_another_users_comment(client):
    owner_headers = register_and_login(
        client, "commentowner@example.com"
    )
    other_headers = register_and_login(
        client, "commentother@example.com"
    )

    project_id = create_project(client, owner_headers)
    ticket_id = create_ticket(client, owner_headers, project_id)

    comment = create_comment(
        client, owner_headers, ticket_id, "Owner comment"
    )

    response = client.patch(
        f"/api/v1/comments/{comment.json()['id']}",
        headers=other_headers,
        json={"content": "Unauthorized update"},
    )

    assert response.status_code == 403


def test_delete_own_comment(client):
    headers = register_and_login(client, "comment7@example.com")
    project_id = create_project(client, headers)
    ticket_id = create_ticket(client, headers, project_id)

    comment = create_comment(
        client, headers, ticket_id, "Comment to delete"
    )
    comment_id = comment.json()["id"]

    response = client.delete(
        f"/api/v1/comments/{comment_id}",
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json()["message"] == "Comment deleted successfully"

    comments = client.get(
        f"/api/v1/tickets/{ticket_id}/comments",
        headers=headers,
    )
    assert comments.status_code == 200
    assert len(comments.json()) == 0


def test_user_cannot_delete_another_users_comment(client):
    owner_headers = register_and_login(
        client, "commentdeleteowner@example.com"
    )
    other_headers = register_and_login(
        client, "commentdeleteother@example.com"
    )

    project_id = create_project(client, owner_headers)
    ticket_id = create_ticket(client, owner_headers, project_id)

    comment = create_comment(
        client, owner_headers, ticket_id, "Protected comment"
    )

    response = client.delete(
        f"/api/v1/comments/{comment.json()['id']}",
        headers=other_headers,
    )

    assert response.status_code == 403


def test_outsider_cannot_access_ticket_comments(client):
    owner_headers = register_and_login(
        client, "commentticketowner@example.com"
    )
    outsider_headers = register_and_login(
        client, "commentticketoutsider@example.com"
    )

    project_id = create_project(client, owner_headers)
    ticket_id = create_ticket(client, owner_headers, project_id)

    response = client.get(
        f"/api/v1/tickets/{ticket_id}/comments",
        headers=outsider_headers,
    )

    assert response.status_code == 403