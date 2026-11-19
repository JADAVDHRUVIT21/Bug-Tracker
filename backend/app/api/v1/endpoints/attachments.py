
import os
from pathlib import Path
from urllib.parse import quote

from dotenv import load_dotenv
from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status,
)
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.dependencies import get_db
from app.models.attachment import Attachment
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.ticket import Ticket
from app.models.user import User, UserRole
from app.schemas.attachment import AttachmentResponse
from app.utils.file_upload import validate_upload_file


router = APIRouter()

load_dotenv()

SUPABASE_BUCKET = os.getenv(
    "SUPABASE_STORAGE_BUCKET",
    "bug-tracker-attachments",
)

_storage_client = None


def get_storage_client():
    global _storage_client

    if _storage_client is not None:
        return _storage_client

    supabase_url = os.getenv("SUPABASE_URL", "").strip()
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()

    if not supabase_url or not supabase_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase Storage is not configured.",
        )

    try:
        from supabase import create_client

        _storage_client = create_client(
            supabase_url,
            supabase_key,
        )

        return _storage_client

    except ImportError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase package is not installed.",
        ) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not initialize Supabase Storage.",
        ) from exc


def get_storage_bucket():
    return get_storage_client().storage.from_(SUPABASE_BUCKET)


def get_storage_path(attachment: Attachment) -> str:
    stored_path = (attachment.file_path or "").strip()

    # New attachments store their Supabase object key in file_path.
    if stored_path and not Path(stored_path).is_absolute():
        return stored_path.replace("\\", "/")

    # Fallback for older database records.
    return (
        f"tickets/{attachment.ticket_id}/"
        f"{attachment.stored_filename}"
    )


def get_accessible_ticket(
    ticket_id: int,
    current_user: User,
    db: Session,
) -> Ticket:

    ticket = (
        db.query(Ticket)
        .filter(Ticket.id == ticket_id)
        .first()
    )

    if ticket is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found",
        )

    project = (
        db.query(Project)
        .filter(Project.id == ticket.project_id)
        .first()
    )

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    is_admin = current_user.role == UserRole.ADMIN
    is_owner = project.owner_id == current_user.id

    is_member = (
        db.query(ProjectMember)
        .filter(
            ProjectMember.project_id == project.id,
            ProjectMember.user_id == current_user.id,
        )
        .first()
        is not None
    )

    if not (is_admin or is_owner or is_member):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this project",
        )

    return ticket


def get_attachment_or_404(
    attachment_id: int,
    db: Session,
) -> Attachment:

    attachment = (
        db.query(Attachment)
        .filter(Attachment.id == attachment_id)
        .first()
    )

    if attachment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attachment not found",
        )

    return attachment


@router.post(
    "/tickets/{ticket_id}",
    response_model=AttachmentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_attachment(
    ticket_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    ticket = get_accessible_ticket(
        ticket_id,
        current_user,
        db,
    )

    if current_user.role == UserRole.VIEWER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Viewers cannot upload attachments",
        )

    stored_filename, file_size = await validate_upload_file(file)

    try:
        content = await file.read()

        if len(content) != file_size:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File size validation failed",
            )

        original_filename = (
            (file.filename or "attachment")
            .replace("\\", "/")
            .rsplit("/", 1)[-1]
        )

        content_type = (
            file.content_type or "application/octet-stream"
        )

        storage_path = (
            f"tickets/{ticket.id}/{stored_filename}"
        )

        bucket = get_storage_bucket()

        try:
            bucket.upload(
                storage_path,
                content,
                file_options={
                    "content-type": content_type,
                    "upsert": "false",
                },
            )

        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Could not upload attachment to Supabase Storage.",
            ) from exc

        attachment = Attachment(
            original_filename=original_filename,
            stored_filename=stored_filename,
            file_path=storage_path,
            content_type=content_type,
            file_size=file_size,
            ticket_id=ticket.id,
            uploaded_by=current_user.id,
        )

        try:
            db.add(attachment)
            db.commit()
            db.refresh(attachment)

        except Exception:
            db.rollback()

            try:
                bucket.remove([storage_path])
            except Exception:
                pass

            raise

        return attachment

    finally:
        await file.close()


@router.get(
    "/tickets/{ticket_id}",
    response_model=list[AttachmentResponse],
)
def list_attachments(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    get_accessible_ticket(
        ticket_id,
        current_user,
        db,
    )

    return (
        db.query(Attachment)
        .filter(Attachment.ticket_id == ticket_id)
        .order_by(Attachment.created_at.asc())
        .all()
    )


@router.get("/{attachment_id}/download")
def download_attachment(
    attachment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    attachment = get_attachment_or_404(
        attachment_id,
        db,
    )

    get_accessible_ticket(
        attachment.ticket_id,
        current_user,
        db,
    )

    storage_path = get_storage_path(attachment)

    try:
        file_content = get_storage_bucket().download(
            storage_path
        )

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "Attachment file was not found in Supabase Storage. "
                "Previously uploaded files must be uploaded again."
            ),
        ) from exc

    if file_content is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attachment file was not found in Supabase Storage.",
        )

    safe_filename = (
        (attachment.original_filename or "attachment")
        .replace("\\", "/")
        .rsplit("/", 1)[-1]
    )

    return Response(
        content=file_content,
        media_type=(
            attachment.content_type or "application/octet-stream"
        ),
        headers={
            "Content-Disposition": (
                f"attachment; filename*=UTF-8''{quote(safe_filename)}"
            ),
            "Content-Length": str(len(file_content)),
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.delete(
    "/{attachment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_attachment(
    attachment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    attachment = get_attachment_or_404(
        attachment_id,
        db,
    )

    ticket = get_accessible_ticket(
        attachment.ticket_id,
        current_user,
        db,
    )

    project = (
        db.query(Project)
        .filter(Project.id == ticket.project_id)
        .first()
    )

    is_admin = current_user.role == UserRole.ADMIN

    is_project_owner = (
        project is not None
        and project.owner_id == current_user.id
    )

    is_uploader = (
        attachment.uploaded_by == current_user.id
    )

    if not (is_admin or is_project_owner or is_uploader):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot delete this attachment",
        )

    storage_path = get_storage_path(attachment)
    bucket = get_storage_bucket()

    original_content = None

    try:
        try:
            original_content = bucket.download(storage_path)
        except Exception:
            # Old attachment may not exist in Supabase.
            original_content = None

        try:
            bucket.remove([storage_path])

        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Could not delete attachment from Supabase Storage.",
            ) from exc

        db.delete(attachment)
        db.commit()

    except Exception as exc:
        db.rollback()

        # Restore the file if the database deletion fails.
        if original_content is not None:
            try:
                bucket.upload(
                    storage_path,
                    original_content,
                    file_options={
                        "content-type": (
                            attachment.content_type
                            or "application/octet-stream"
                        ),
                        "upsert": "true",
                    },
                )
            except Exception:
                pass

        if isinstance(exc, HTTPException):
            raise

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not delete attachment record.",
        ) from exc
