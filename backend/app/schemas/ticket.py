
from datetime import datetime

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    model_validator,
)

from app.models.ticket import (
    TicketPriority,
    TicketStatus,
    TicketType,
)


class TicketCreate(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    description: str | None = Field(
        default=None,
        max_length=10000,
    )
    ticket_type: TicketType = TicketType.BUG
    priority: TicketPriority = TicketPriority.MEDIUM
    project_id: int = Field(gt=0)
    assignee_id: int | None = Field(default=None, gt=0)


class TicketUpdate(BaseModel):
    title: str | None = Field(
        default=None,
        min_length=2,
        max_length=200,
    )
    description: str | None = Field(
        default=None,
        max_length=10000,
    )
    ticket_type: TicketType | None = None
    status: TicketStatus | None = None
    priority: TicketPriority | None = None
    assignee_id: int | None = Field(default=None, gt=0)

    @model_validator(mode="after")
    def validate_non_nullable_fields(self):
        non_nullable_fields = (
            "title",
            "ticket_type",
            "status",
            "priority",
        )

        for field in non_nullable_fields:
            if (
                field in self.model_fields_set
                and getattr(self, field) is None
            ):
                raise ValueError(
                    f"{field} cannot be null"
                )

        return self


class TicketResponse(BaseModel):
    id: int
    title: str
    description: str | None
    ticket_type: TicketType
    status: TicketStatus
    priority: TicketPriority
    project_id: int
    reporter_id: int
    assignee_id: int | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TicketListResponse(BaseModel):
    items: list[TicketResponse]
    total: int
    page: int
    page_size: int
    total_pages: int