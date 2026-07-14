"""Resume Pydantic schemas."""

from datetime import datetime
from pydantic import BaseModel


class ResumeResponse(BaseModel):
    id: str
    original_filename: str
    stored_filename: str
    file_hash: str
    file_size: int
    mime_type: str
    status: str
    error_message: str | None = None
    is_scanned: bool = False
    batch_name: str | None = None
    raw_text: str | None = None
    candidate_id: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ResumeUploadResponse(BaseModel):
    message: str
    resumes: list[ResumeResponse]
    duplicates: list[dict] = []


class ResumeDuplicateInfo(BaseModel):
    filename: str
    existing_candidate_id: str | None
    file_hash: str
