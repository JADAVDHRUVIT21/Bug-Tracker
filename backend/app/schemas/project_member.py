from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr

class ProjectMemberCreate(BaseModel):
    email: EmailStr

class ProjectMemberResponse(BaseModel):
    id: int
    project_id: int
    user_id: int
    joined_at: datetime

    model_config = ConfigDict(from_attributes=True)