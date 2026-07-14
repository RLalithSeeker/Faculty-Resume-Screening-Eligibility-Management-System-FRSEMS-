"""AuditLog Pydantic schemas."""

from datetime import datetime
from pydantic import BaseModel


class AuditLogResponse(BaseModel):
    id: str
    candidate_id: str | None
    action: str
    field_changed: str | None
    old_value: str | None
    new_value: str | None
    reviewer_comment: str
    created_at: datetime

    model_config = {"from_attributes": True}
