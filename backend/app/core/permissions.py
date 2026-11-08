
from fastapi import Depends, HTTPException, status

from app.core.dependencies import get_current_user
from app.models.user import User, UserRole


def require_roles(*allowed_roles: UserRole):
    def role_checker(
        current_user: User = Depends(get_current_user),
    ) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action",
            )

        return current_user

    return role_checker


def require_admin(
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
) -> User:
    return current_user


def require_developer_or_admin(
    current_user: User = Depends(
        require_roles(UserRole.DEVELOPER, UserRole.ADMIN)
    ),
) -> User:
    return current_user
