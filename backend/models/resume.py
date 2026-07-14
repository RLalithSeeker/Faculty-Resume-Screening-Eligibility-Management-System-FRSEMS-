"""Resume model — file metadata, processing status, SHA-256 hash."""

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Integer, String, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class ResumeStatus(str, enum.Enum):
    UPLOADING = "uploading"
    EXTRACTING_TEXT = "extracting_text"
    EXTRACTING_DATA = "extracting_data"
    COMPLETED = "completed"
    FAILED = "failed"


class Resume(Base):
    __tablename__ = "resumes"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    stored_filename: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    file_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[ResumeStatus] = mapped_column(
        Enum(ResumeStatus), nullable=False, default=ResumeStatus.UPLOADING
    )
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_scanned: Mapped[bool] = mapped_column(Boolean, default=False)
    batch_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    raw_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    candidate_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("candidates.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    # Relationships
    candidate = relationship("Candidate", back_populates="resumes")

    __table_args__ = (
        Index("ix_resumes_file_hash", "file_hash", unique=True),
    )
