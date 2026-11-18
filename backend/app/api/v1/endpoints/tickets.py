import uuid
import shutil
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import func, or_
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
    TicketReorder,
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


def get_column_tickets(
    project_id: int,
    ticket_status: TicketStatus,
    db: Session,
) -> list[Ticket]:
    return (
        db.query(Ticket)
        .filter(
            Ticket.project_id == project_id,
            Ticket.status == ticket_status,
        )
        .order_by(Ticket.position.asc(), Ticket.id.asc())
        .all()
    )


def save_column_positions(tickets: list[Ticket]) -> None:
    for index, ticket in enumerate(tickets):
        ticket.position = index


def move_ticket(
    ticket: Ticket,
    destination_status: TicketStatus,
    destination_position: int,
    db: Session,
) -> None:
    source_status = ticket.status

    source_tickets = get_column_tickets(
        ticket.project_id,
        source_status,
        db,
    )

    destination_tickets = (
        source_tickets
        if source_status == destination_status
        else get_column_tickets(
            ticket.project_id,
            destination_status,
            db,
        )
    )

    source_tickets = [
        item for item in source_tickets
        if item.id != ticket.id
    ]

    if source_status == destination_status:
        destination_tickets = source_tickets
    else:
        destination_tickets = [
            item for item in destination_tickets
            if item.id != ticket.id
        ]

    destination_position = max(
        0,
        min(destination_position, len(destination_tickets)),
    )

    ticket.status = destination_status

    destination_tickets.insert(
        destination_position,
        ticket,
    )

    if source_status != destination_status:
        save_column_positions(source_tickets)

    save_column_positions(destination_tickets)


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

    last_position = (
        db.query(func.max(Ticket.position))
        .filter(
            Ticket.project_id == ticket_data.project_id,
            Ticket.status == TicketStatus.TODO,
        )
        .scalar()
    )

    ticket = Ticket(
        title=ticket_data.title,
        description=ticket_data.description,
        ticket_type=ticket_data.ticket_type,
        status=TicketStatus.TODO,
        position=(last_position + 1) if last_position is not None else 0,
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
        .order_by(
            Ticket.project_id.asc(),
            Ticket.status.asc(),
            Ticket.position.asc(),
            Ticket.id.asc(),
        )
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


@router.patch(
    "/{ticket_id}/position",
    response_model=TicketResponse,
)
def reorder_ticket(
    ticket_id: int,
    reorder_data: TicketReorder,
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

    try:
        move_ticket(
            ticket=ticket,
            destination_status=reorder_data.status,
            destination_position=reorder_data.position,
            db=db,
        )

        db.commit()
        db.refresh(ticket)

    except Exception:
        db.rollback()
        raise

    return ticket


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
        new_status = update_data.pop("status", ticket.status)

        for field, value in update_data.items():
            setattr(ticket, field, value)

        if new_status != ticket.status:
            destination_tickets = get_column_tickets(
                ticket.project_id,
                new_status,
                db,
            )

            destination_position = len(destination_tickets)

            move_ticket(
                ticket=ticket,
                destination_status=new_status,
                destination_position=destination_position,
                db=db,
            )

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
        for attachment in attachments:
            file_path = (
                upload_directory / attachment.stored_filename
            ).resolve()

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

        db.delete(ticket)
        db.commit()

    except Exception:
        db.rollback()

        for original_path, temporary_path in reversed(moved_files):
            try:
                if temporary_path.exists():
                    temporary_path.replace(original_path)
            except OSError:
                pass

        raise

    for original_path, temporary_path in moved_files:
        try:
            if temporary_path.exists():
                temporary_path.unlink()
        except OSError:
            pass

    return {
        "message": "Ticket deleted successfully",
    }


# ==============================================================================
# NEW ATTACHMENT UPLOAD ENDPOINT
# ==============================================================================

@router.post(
    "/{ticket_id}/attachments",
    status_code=status.HTTP_201_CREATED,
)
async def upload_attachment(
    ticket_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 1. Verify ticket exists and user has access
    ticket = get_accessible_ticket(
        ticket_id,
        current_user,
        db,
    )

    # 2. Validate file size (10MB limit)
    MAX_SIZE = 10 * 1024 * 1024
    file.file.seek(0, 2) # Move to end of file to get size
    file_size = file.file.tell()
    file.file.seek(0) # Reset to beginning

    if file_size > MAX_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File is too large. Maximum size is 10MB.",
        )

    # 3. Generate unique filename
    file_extension = Path(file.filename).suffix
    unique_filename = f"{uuid.uuid4().hex}{file_extension}"
    
    # 4. Ensure upload directory exists & build path
    upload_directory = Path(settings.UPLOAD_DIR).resolve()
    upload_directory.mkdir(parents=True, exist_ok=True)
    
    file_path = upload_directory / unique_filename

    # 5. Save file to disk
    try:
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save file to disk",
        )
    finally:
        file.file.close()

    # 6. Save record to database
    # Note: Assuming your Attachment model has these fields based on the delete route
    new_attachment = Attachment(
        ticket_id=ticket.id,
        original_filename=file.filename,
        stored_filename=unique_filename,
        file_size=file_size,
        uploaded_by=current_user.id,
    )

    try:
        db.add(new_attachment)
        db.commit()
        db.refresh(new_attachment)
    except Exception:
        db.rollback()
        # Cleanup file if DB save fails
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save file metadata to database",
        )

    # 7. Return the data to the frontend
    return {
        "id": new_attachment.id,
        "file_name": new_attachment.original_filename,
        "file_size": new_attachment.file_size,
        # Assuming you serve files via a /uploads static route in your main.py
        "file_url": f"/uploads/{new_attachment.stored_filename}", 
    }