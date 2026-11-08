
from datetime import datetime

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    model_validator,
)


class ProjectCreate(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    key: str = Field(
        min_length=2,
        max_length=20,
        pattern=r"^[A-Za-z0-9_-]+$",
    )
    description: str | None = Field(
        default=None,
        max_length=2000,
    )


class ProjectUpdate(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=2,
        max_length=150,
    )
    key: str | None = Field(
        default=None,
        min_length=2,
        max_length=20,
        pattern=r"^[A-Za-z0-9_-]+$",
    )
    description: str | None = Field(
        default=None,
        max_length=2000,
    )

    @model_validator(mode="after")
    def validate_required_fields(self):
        if "name" in self.model_fields_set and self.name is None:
            raise ValueError("Project name cannot be null")

        if "key" in self.model_fields_set and self.key is None:
            raise ValueError("Project key cannot be null")

        return self


class ProjectResponse(BaseModel):
    id: int
    name: str
    key: str
    description: str | None
    owner_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)