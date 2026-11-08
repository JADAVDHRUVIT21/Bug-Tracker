
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ProjectMemberCreate(BaseModel):
    user_id: int = Field(gt=0)


class ProjectMemberResponse(BaseModel):
    id: int
    project_id: int
    user_id: int
    joined_at: datetime

    model_config = ConfigDict(from_attributes=True)
