
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AttachmentResponse(BaseModel):
    id: int
    original_filename: str
    content_type: str
    file_size: int
    ticket_id: int
    uploaded_by: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
