
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.dependencies import get_db
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.user import User, UserRole
from app.schemas.project_member import (
    ProjectMemberCreate,
    ProjectMemberResponse,
)


router = APIRouter()


def get_project_or_404(
    project_id: int,
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

    return project


def check_project_manager(
    project: Project,
    current_user: User,
):
    is_admin = current_user.role == UserRole.ADMIN
    is_owner = project.owner_id == current_user.id

    if not is_admin and not is_owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the project owner or an admin can manage team members",
        )


@router.post(
    "/projects/{project_id}/members",
    response_model=ProjectMemberResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_project_member(
    project_id: int,
    member_data: ProjectMemberCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = get_project_or_404(project_id, db)
    check_project_manager(project, current_user)

    user = (
        db.query(User)
        .filter(User.id == member_data.user_id)
        .first()
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot add an inactive user to the project",
        )

    if project.owner_id == user.id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The project owner is already part of the project",
        )

    existing_member = (
        db.query(ProjectMember)
        .filter(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user.id,
        )
        .first()
    )

    if existing_member:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User is already a member of this project",
        )

    membership = ProjectMember(
        project_id=project_id,
        user_id=user.id,
    )

    try:
        db.add(membership)
        db.commit()
        db.refresh(membership)

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User is already a member of this project",
        )

    return membership


@router.get(
    "/projects/{project_id}/members",
    response_model=list[ProjectMemberResponse],
)
def list_project_members(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = get_project_or_404(project_id, db)

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

    return (
        db.query(ProjectMember)
        .filter(ProjectMember.project_id == project_id)
        .order_by(ProjectMember.id.asc())
        .all()
    )


@router.delete(
    "/projects/{project_id}/members/{user_id}",
)
def remove_project_member(
    project_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = get_project_or_404(project_id, db)
    check_project_manager(project, current_user)

    membership = (
        db.query(ProjectMember)
        .filter(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
        )
        .first()
    )

    if membership is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project membership not found",
        )

    db.delete(membership)
    db.commit()

    return {
        "message": "Project member removed successfully",
    }