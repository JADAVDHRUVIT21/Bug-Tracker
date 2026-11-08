
from pathlib import Path

import pytest

from app.core.config import settings


def register_and_login(client, email):
    registration = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Attachment Test User",
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


def create_project(client, headers):
    response = client.post(
        "/api/v1/projects/",
        headers=headers,
        json={
            "name": "Attachment Test Project",
            "key": "ATTACH",
            "description": "Project for attachment testing",
        },
    )
    assert response.status_code == 201
    return response.json()["id"]


def create_ticket(client, headers, project_id):
    response = client.post(
        "/api/v1/tickets/",
        headers=headers,
        json={
            "title": "Attachment Test Ticket",
            "description": "Ticket for attachment testing",
            "ticket_type": "bug",
            "priority": "medium",
            "project_id": project_id,
        },
    )
    assert response.status_code == 201
    return response.json()["id"]


def upload_text_file(client, headers, ticket_id, filename="notes.txt"):
    return client.post(
        f"/api/v1/attachments/tickets/{ticket_id}",
        headers=headers,
        files={
            "file": (
                filename,
                b"Attachment test content",
                "text/plain",
            )
        },
    )


def find_saved_file(tmp_path):
    files = [
        path
        for path in Path(tmp_path).rglob("*")
        if path.is_file()
    ]
    assert len(files) == 1
    return files[0]


def test_upload_attachment(client, monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "UPLOAD_DIR", str(tmp_path))

    headers = register_and_login(client, "attachment1@example.com")
    project_id = create_project(client, headers)
    ticket_id = create_ticket(client, headers, project_id)

    response = upload_text_file(client, headers, ticket_id)

    assert response.status_code == 201

    data = response.json()
    assert data["original_filename"] == "notes.txt"
    assert data["content_type"] == "text/plain"
    assert data["file_size"] == len(b"Attachment test content")
    assert data["ticket_id"] == ticket_id

    # Internal storage paths should not be exposed in the API response.
    assert "file_path" not in data
    assert "stored_filename" not in data

    saved_file = find_saved_file(tmp_path)
    assert saved_file.read_bytes() == b"Attachment test content"


def test_list_attachments(client, monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "UPLOAD_DIR", str(tmp_path))

    headers = register_and_login(client, "attachment2@example.com")
    project_id = create_project(client, headers)
    ticket_id = create_ticket(client, headers, project_id)

    first = upload_text_file(
        client, headers, ticket_id, "first.txt"
    )
    second = upload_text_file(
        client, headers, ticket_id, "second.txt"
    )

    assert first.status_code == 201
    assert second.status_code == 201

    response = client.get(
        f"/api/v1/attachments/tickets/{ticket_id}",
        headers=headers,
    )

    assert response.status_code == 200
    assert len(response.json()) == 2


def test_download_attachment(client, monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "UPLOAD_DIR", str(tmp_path))

    headers = register_and_login(client, "attachment3@example.com")
    project_id = create_project(client, headers)
    ticket_id = create_ticket(client, headers, project_id)

    uploaded = upload_text_file(client, headers, ticket_id)
    assert uploaded.status_code == 201

    attachment_id = uploaded.json()["id"]

    response = client.get(
        f"/api/v1/attachments/{attachment_id}/download",
        headers=headers,
    )

    assert response.status_code == 200
    assert response.content == b"Attachment test content"


def test_delete_attachment(client, monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "UPLOAD_DIR", str(tmp_path))

    headers = register_and_login(client, "attachment4@example.com")
    project_id = create_project(client, headers)
    ticket_id = create_ticket(client, headers, project_id)

    uploaded = upload_text_file(client, headers, ticket_id)
    assert uploaded.status_code == 201

    attachment_id = uploaded.json()["id"]
    saved_file = find_saved_file(tmp_path)

    assert saved_file.is_file()

    response = client.delete(
        f"/api/v1/attachments/{attachment_id}",
        headers=headers,
    )

    assert response.status_code == 204
    assert not saved_file.exists()


def test_reject_disallowed_file_extension(
    client, monkeypatch, tmp_path
):
    monkeypatch.setattr(settings, "UPLOAD_DIR", str(tmp_path))

    headers = register_and_login(client, "attachment5@example.com")
    project_id = create_project(client, headers)
    ticket_id = create_ticket(client, headers, project_id)

    response = client.post(
        f"/api/v1/attachments/tickets/{ticket_id}",
        headers=headers,
        files={
            "file": (
                "malware.exe",
                b"Some file content",
                "application/octet-stream",
            )
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "File extension is not allowed"


def test_reject_mismatched_file_content_type(
    client, monkeypatch, tmp_path
):
    monkeypatch.setattr(settings, "UPLOAD_DIR", str(tmp_path))

    headers = register_and_login(client, "attachment6@example.com")
    project_id = create_project(client, headers)
    ticket_id = create_ticket(client, headers, project_id)

    response = client.post(
        f"/api/v1/attachments/tickets/{ticket_id}",
        headers=headers,
        files={
            "file": (
                "notes.txt",
                b"Some file content",
                "application/pdf",
            )
        },
    )

    assert response.status_code == 400


def test_reject_empty_file(client, monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "UPLOAD_DIR", str(tmp_path))

    headers = register_and_login(client, "attachment7@example.com")
    project_id = create_project(client, headers)
    ticket_id = create_ticket(client, headers, project_id)

    response = client.post(
        f"/api/v1/attachments/tickets/{ticket_id}",
        headers=headers,
        files={
            "file": (
                "empty.txt",
                b"",
                "text/plain",
            )
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Empty files are not allowed"


def test_reject_file_with_invalid_signature(
    client, monkeypatch, tmp_path
):
    monkeypatch.setattr(settings, "UPLOAD_DIR", str(tmp_path))

    headers = register_and_login(client, "attachment8@example.com")
    project_id = create_project(client, headers)
    ticket_id = create_ticket(client, headers, project_id)

    response = client.post(
        f"/api/v1/attachments/tickets/{ticket_id}",
        headers=headers,
        files={
            "file": (
                "fake.pdf",
                b"This is not a real PDF file",
                "application/pdf",
            )
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == (
        "File content does not match its extension"
    )


def test_outsider_cannot_access_attachments(
    client, monkeypatch, tmp_path
):
    monkeypatch.setattr(settings, "UPLOAD_DIR", str(tmp_path))

    owner_headers = register_and_login(
        client, "attachmentowner@example.com"
    )
    outsider_headers = register_and_login(
        client, "attachmentoutsider@example.com"
    )

    project_id = create_project(client, owner_headers)
    ticket_id = create_ticket(client, owner_headers, project_id)

    response = client.get(
        f"/api/v1/attachments/tickets/{ticket_id}",
        headers=outsider_headers,
    )

    assert response.status_code == 403

def test_delete_ticket_removes_attachment_file(
    client, monkeypatch, tmp_path
):
    monkeypatch.setattr(settings, "UPLOAD_DIR", str(tmp_path))

    headers = register_and_login(
        client, "attachment_ticket_delete@example.com"
    )
    project_id = create_project(client, headers)
    ticket_id = create_ticket(client, headers, project_id)

    uploaded = upload_text_file(client, headers, ticket_id)
    assert uploaded.status_code == 201

    saved_file = find_saved_file(tmp_path)
    assert saved_file.is_file()

    response = client.delete(
        f"/api/v1/tickets/{ticket_id}",
        headers=headers,
    )

    assert response.status_code == 200
    assert not saved_file.exists()

    remaining_attachments = client.get(
        f"/api/v1/attachments/tickets/{ticket_id}",
        headers=headers,
    )

    assert remaining_attachments.status_code == 404

def test_delete_project_removes_attachment_files(
    client, monkeypatch, tmp_path
):
    monkeypatch.setattr(settings, "UPLOAD_DIR", str(tmp_path))

    headers = register_and_login(
        client, "attachment_project_delete@example.com"
    )

    project_id = create_project(client, headers)
    ticket_id = create_ticket(client, headers, project_id)

    uploaded = upload_text_file(client, headers, ticket_id)
    assert uploaded.status_code == 201

    saved_file = find_saved_file(tmp_path)
    assert saved_file.is_file()

    response = client.delete(
        f"/api/v1/projects/{project_id}",
        headers=headers,
    )

    assert response.status_code == 200
    assert not saved_file.exists()

    # Confirm the project was deleted.
    project_response = client.get(
        f"/api/v1/projects/{project_id}",
        headers=headers,
    )

    assert project_response.status_code == 404