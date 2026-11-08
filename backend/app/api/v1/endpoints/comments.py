
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.dependencies import get_db
from app.models.comment import Comment
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.ticket import Ticket
from app.models.user import User, UserRole
from app.schemas.comment import (
    CommentCreate,
    CommentResponse,
    CommentUpdate,
)


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

    if not is_admin and not is_owner and not is_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this ticket",
        )

    return ticket


def get_comment_or_404(
    comment_id: int,
    db: Session,
) -> Comment:
    comment = (
        db.query(Comment)
        .filter(Comment.id == comment_id)
        .first()
    )

    if comment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found",
        )

    return comment


@router.post(
    "/tickets/{ticket_id}/comments",
    response_model=CommentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_comment(
    ticket_id: int,
    comment_data: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ticket = get_accessible_ticket(
        ticket_id,
        current_user,
        db,
    )

    if comment_data.parent_id is not None:
        parent_comment = get_comment_or_404(
            comment_data.parent_id,
            db,
        )

        if parent_comment.ticket_id != ticket.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You can only reply to a comment on the same ticket",
            )

    comment = Comment(
        content=comment_data.content,
        ticket_id=ticket.id,
        author_id=current_user.id,
        parent_id=comment_data.parent_id,
    )

    db.add(comment)
    db.commit()
    db.refresh(comment)

    return comment


@router.get(
    "/tickets/{ticket_id}/comments",
    response_model=list[CommentResponse],
)
def list_ticket_comments(
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
        db.query(Comment)
        .filter(Comment.ticket_id == ticket_id)
        .order_by(Comment.created_at.asc(), Comment.id.asc())
        .all()
    )


@router.patch(
    "/comments/{comment_id}",
    response_model=CommentResponse,
)
def update_comment(
    comment_id: int,
    comment_data: CommentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    comment = get_comment_or_404(comment_id, db)

    get_accessible_ticket(
        comment.ticket_id,
        current_user,
        db,
    )

    if comment.author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only edit your own comments",
        )

    comment.content = comment_data.content

    db.commit()
    db.refresh(comment)

    return comment


@router.delete("/comments/{comment_id}")
def delete_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    comment = get_comment_or_404(comment_id, db)

    ticket = get_accessible_ticket(
        comment.ticket_id,
        current_user,
        db,
    )

    project = (
        db.query(Project)
        .filter(Project.id == ticket.project_id)
        .first()
    )

    is_author = comment.author_id == current_user.id
    is_admin = current_user.role == UserRole.ADMIN
    is_owner = project.owner_id == current_user.id

    if not is_author and not is_admin and not is_owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this comment",
        )

    db.delete(comment)
    db.commit()

    return {
        "message": "Comment deleted successfully",
    }