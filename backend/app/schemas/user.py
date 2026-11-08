
from datetime import datetime

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    model_validator,
)

from app.models.user import UserRole


class UserUpdate(BaseModel):
    full_name: str | None = Field(
        default=None,
        min_length=2,
        max_length=150,
    )
    email: EmailStr | None = None
    role: UserRole | None = None
    is_active: bool | None = None

    @model_validator(mode="after")
    def validate_non_nullable_fields(self):
        for field in ("full_name", "email", "role", "is_active"):
            if (
                field in self.model_fields_set
                and getattr(self, field) is None
            ):
                raise ValueError(f"{field} cannot be null")

        return self


class UserResponse(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    role: UserRole
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)