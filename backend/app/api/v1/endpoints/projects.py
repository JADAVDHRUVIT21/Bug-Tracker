import uuid
from pathlib import Path

from app.core.config import settings
from app.models.attachment import Attachment
from app.models.ticket import Ticket
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.core.permissions import require_developer_or_admin
from app.db.dependencies import get_db
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.user import User, UserRole
from app.schemas.project import (
    ProjectCreate,
    ProjectResponse,
    ProjectUpdate,
)


router = APIRouter()


def get_accessible_project(
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

    if current_user.role == UserRole.ADMIN:
        return project

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

    if not is_owner and not is_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this project",
        )

    return project


@router.post(
    "/",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_project(
    project_data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_developer_or_admin),
):
    project_key = project_data.key.upper()

    existing_project = (
        db.query(Project)
        .filter(Project.key == project_key)
        .first()
    )

    if existing_project:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A project with this key already exists",
        )

    project = Project(
        name=project_data.name,
        key=project_key,
        description=project_data.description,
        owner_id=current_user.id,
    )

    try:
        db.add(project)
        db.commit()
        db.refresh(project)

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A project with this key already exists",
        )

    return project


@router.get("/", response_model=list[ProjectResponse])
def list_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Project)

    if current_user.role != UserRole.ADMIN:
        query = (
            query.outerjoin(
                ProjectMember,
                ProjectMember.project_id == Project.id,
            )
            .filter(
                or_(
                    Project.owner_id == current_user.id,
                    ProjectMember.user_id == current_user.id,
                )
            )
        )

    return (
        query.distinct()
        .order_by(Project.id.desc())
        .all()
    )


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_accessible_project(
        project_id,
        current_user,
        db,
    )


@router.patch("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int,
    project_data: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_developer_or_admin),
):
    project = get_accessible_project(
        project_id,
        current_user,
        db,
    )

    if (
        current_user.role != UserRole.ADMIN
        and project.owner_id != current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the project owner or an admin can update this project",
        )

    update_data = project_data.model_dump(exclude_unset=True)

    if "key" in update_data:
        update_data["key"] = update_data["key"].upper()

        existing_project = (
            db.query(Project)
            .filter(
                Project.key == update_data["key"],
                Project.id != project_id,
            )
            .first()
        )

        if existing_project:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A project with this key already exists",
            )

    for field, value in update_data.items():
        setattr(project, field, value)

    try:
        db.commit()
        db.refresh(project)

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A project with this key already exists",
        )

    return project


@router.delete("/{project_id}")
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_developer_or_admin),
):
    project = get_accessible_project(
        project_id,
        current_user,
        db,
    )

    if (
        current_user.role != UserRole.ADMIN
        and project.owner_id != current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the project owner or an admin can delete this project",
        )

    # Find attachments belonging to tickets in this project.
    attachments = (
        db.query(Attachment)
        .join(Ticket, Attachment.ticket_id == Ticket.id)
        .filter(Ticket.project_id == project.id)
        .all()
    )

    upload_directory = Path(settings.UPLOAD_DIR).resolve()
    moved_files = []

    try:
        # Temporarily move files before deleting database records.
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

        # Delete project and commit database changes.
        db.delete(project)
        db.commit()

    except Exception:
        db.rollback()

        # Restore files if database deletion fails.
        for original_path, temporary_path in reversed(moved_files):
            try:
                if temporary_path.exists():
                    temporary_path.replace(original_path)
            except OSError:
                pass

        raise

    # Permanently remove staged files after successful commit.
    for original_path, temporary_path in moved_files:
        try:
            if temporary_path.exists():
                temporary_path.unlink()
        except OSError:
            pass

    return {
        "message": "Project deleted successfully",
    }