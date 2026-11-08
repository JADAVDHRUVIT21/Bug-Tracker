
import uuid
from pathlib import Path

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import settings
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


def get_attachment_file_path(attachment: Attachment) -> Path:
    upload_directory = Path(settings.UPLOAD_DIR).resolve()

    file_path = (
        upload_directory / attachment.stored_filename
    ).resolve()

    if file_path.parent != upload_directory:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid attachment file path",
        )

    return file_path


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

    upload_directory = Path(settings.UPLOAD_DIR)
    upload_directory.mkdir(parents=True, exist_ok=True)

    file_path = (
        upload_directory / stored_filename
    ).resolve()

    try:
        content = await file.read()

        if len(content) != file_size:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File size validation failed",
            )

        with file_path.open("xb") as destination:
            destination.write(content)

        attachment = Attachment(
            original_filename=Path(file.filename or "").name,
            stored_filename=stored_filename,
            file_path=str(file_path),
            content_type=file.content_type or "application/octet-stream",
            file_size=file_size,
            ticket_id=ticket.id,
            uploaded_by=current_user.id,
        )

        db.add(attachment)
        db.commit()
        db.refresh(attachment)

        return attachment

    except Exception:
        db.rollback()

        if file_path.exists():
            file_path.unlink()

        raise

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
    get_accessible_ticket(ticket_id, current_user, db)

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
    attachment = get_attachment_or_404(attachment_id, db)

    get_accessible_ticket(
        attachment.ticket_id,
        current_user,
        db,
    )

    file_path = get_attachment_file_path(attachment)

    if not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attachment file is missing from storage",
        )

    return FileResponse(
        path=file_path,
        media_type=attachment.content_type,
        filename=attachment.original_filename,
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
    attachment = get_attachment_or_404(attachment_id, db)

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
    is_uploader = attachment.uploaded_by == current_user.id

    if not (is_admin or is_project_owner or is_uploader):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot delete this attachment",
        )

    file_path = get_attachment_file_path(attachment)

    temporary_path = (
        file_path.parent / f".{uuid.uuid4().hex}.deleting"
    )

    file_was_moved = False

    try:
        if file_path.is_file():
            file_path.replace(temporary_path)
            file_was_moved = True

        db.delete(attachment)
        db.commit()

    except Exception:
        db.rollback()

        if file_was_moved and temporary_path.exists():
            temporary_path.replace(file_path)

        raise

    if file_was_moved and temporary_path.exists():
        try:
            temporary_path.unlink()
        except OSError:
            # The database record is deleted. A leftover temporary
            # file can be cleaned up by a storage maintenance task.
            pass