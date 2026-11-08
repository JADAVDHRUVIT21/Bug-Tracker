import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.dependencies import get_current_user
from app.db.dependencies import get_db
from app.models.attachment import Attachment
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.ticket import Ticket, TicketPriority, TicketStatus, TicketType
from app.models.user import User, UserRole
from app.schemas.ticket import (
    TicketCreate,
    TicketListResponse,
    TicketResponse,
    TicketUpdate,
)


router = APIRouter()


def get_project_access(
    project_id: int,
    current_user: User,
    db: Session,
) -> Project:
    project = (
        db.query(Project)
        .filter(Project.id == project_id)
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
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id,
        )
        .first()
        is not None
    )

    if not is_admin and not is_owner and not is_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this project",
        )

    return project


def ensure_project_developer(
    project: Project,
    current_user: User,
    db: Session,
) -> None:
    if current_user.role == UserRole.ADMIN:
        return

    if current_user.role != UserRole.DEVELOPER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only developers and admins can perform this action",
        )

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

    if not is_owner and not is_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must belong to this project to perform this action",
        )


def validate_assignee(
    assignee_id: int | None,
    project_id: int,
    db: Session,
) -> None:
    if assignee_id is None:
        return

    assignee = (
        db.query(User)
        .filter(User.id == assignee_id)
        .first()
    )

    if assignee is None or not assignee.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active assignee not found",
        )

    if assignee.role not in (
        UserRole.DEVELOPER,
        UserRole.ADMIN,
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only Developers and Admins can be assigned tickets",
        )

    project = (
        db.query(Project)
        .filter(Project.id == project_id)
        .first()
    )

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    is_owner = project.owner_id == assignee_id

    is_member = (
        db.query(ProjectMember)
        .filter(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == assignee_id,
        )
        .first()
        is not None
    )

    if not is_owner and not is_member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assignee must belong to the project",
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

    get_project_access(
        ticket.project_id,
        current_user,
        db,
    )

    return ticket


@router.post(
    "/",
    response_model=TicketResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_ticket(
    ticket_data: TicketCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = get_project_access(
        ticket_data.project_id,
        current_user,
        db,
    )

    ensure_project_developer(project, current_user, db)

    validate_assignee(
        ticket_data.assignee_id,
        ticket_data.project_id,
        db,
    )

    ticket = Ticket(
        title=ticket_data.title,
        description=ticket_data.description,
        ticket_type=ticket_data.ticket_type,
        status=TicketStatus.TODO,
        priority=ticket_data.priority,
        project_id=ticket_data.project_id,
        reporter_id=current_user.id,
        assignee_id=ticket_data.assignee_id,
    )

    try:
        db.add(ticket)
        db.commit()
        db.refresh(ticket)
    except Exception:
        db.rollback()
        raise

    return ticket


@router.get("/", response_model=TicketListResponse)
def list_tickets(
    project_id: int | None = Query(default=None, gt=0),
    ticket_type: TicketType | None = None,
    ticket_status: TicketStatus | None = None,
    priority: TicketPriority | None = None,
    assignee_id: int | None = Query(default=None, gt=0),
    search: str | None = Query(default=None, max_length=200),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Ticket).join(
        Project,
        Ticket.project_id == Project.id,
    )

    if current_user.role != UserRole.ADMIN:
        query = query.outerjoin(
            ProjectMember,
            ProjectMember.project_id == Project.id,
        ).filter(
            or_(
                Project.owner_id == current_user.id,
                ProjectMember.user_id == current_user.id,
            )
        )

    if project_id is not None:
        query = query.filter(Ticket.project_id == project_id)

    if ticket_type is not None:
        query = query.filter(Ticket.ticket_type == ticket_type)

    if ticket_status is not None:
        query = query.filter(Ticket.status == ticket_status)

    if priority is not None:
        query = query.filter(Ticket.priority == priority)

    if assignee_id is not None:
        query = query.filter(Ticket.assignee_id == assignee_id)

    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Ticket.title.ilike(search_term),
                Ticket.description.ilike(search_term),
            )
        )

    filtered_query = query.distinct()

    total = filtered_query.order_by(None).count()

    tickets = (
        filtered_query
        .order_by(Ticket.created_at.desc(), Ticket.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    total_pages = (total + page_size - 1) // page_size

    return {
        "items": tickets,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@router.get("/{ticket_id}", response_model=TicketResponse)
def get_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_accessible_ticket(
        ticket_id,
        current_user,
        db,
    )


@router.patch("/{ticket_id}", response_model=TicketResponse)
def update_ticket(
    ticket_id: int,
    ticket_data: TicketUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ticket = get_accessible_ticket(
        ticket_id,
        current_user,
        db,
    )

    project = get_project_access(
        ticket.project_id,
        current_user,
        db,
    )

    ensure_project_developer(project, current_user, db)

    update_data = ticket_data.model_dump(exclude_unset=True)

    if "assignee_id" in update_data:
        validate_assignee(
            update_data["assignee_id"],
            ticket.project_id,
            db,
        )

    try:
        for field, value in update_data.items():
            setattr(ticket, field, value)

        db.commit()
        db.refresh(ticket)
    except Exception:
        db.rollback()
        raise

    return ticket


@router.delete("/{ticket_id}")
def delete_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ticket = get_accessible_ticket(
        ticket_id,
        current_user,
        db,
    )

    project = get_project_access(
        ticket.project_id,
        current_user,
        db,
    )

    is_admin = current_user.role == UserRole.ADMIN
    is_owner = project.owner_id == current_user.id

    if not is_admin and not is_owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the project owner or an admin can delete tickets",
        )

    attachments = (
        db.query(Attachment)
        .filter(Attachment.ticket_id == ticket.id)
        .all()
    )

    upload_directory = Path(settings.UPLOAD_DIR).resolve()
    moved_files = []

    try:
        # Move attachment files temporarily before deleting database records.
        for attachment in attachments:
            file_path = (
                upload_directory / attachment.stored_filename
            ).resolve()

            # Prevent deletion outside the configured upload directory.
            if file_path.parent != upload_directory:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid attachment file path",
                )

            if not file_path.is_file():
                continue

            temporary_path = (
                upload_directory / f".{uuid.uuid4().hex}.deleting"
            )

            file_path.replace(temporary_path)
            moved_files.append((file_path, temporary_path))

        # Delete the ticket and its related database records.
        db.delete(ticket)
        db.commit()

    except Exception:
        db.rollback()

        # Restore files if the database transaction fails.
        for original_path, temporary_path in reversed(moved_files):
            try:
                if temporary_path.exists():
                    temporary_path.replace(original_path)
            except OSError:
                # Preserve the original exception.
                pass

        raise

    # Database deletion succeeded. Remove temporary attachment files.
    for original_path, temporary_path in moved_files:
        try:
            if temporary_path.exists():
                temporary_path.unlink()
        except OSError:
            # A leftover temporary file can be cleaned up later.
            pass

    return {
        "message": "Ticket deleted successfully",
    }