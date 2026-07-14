"""AuditLog model — tracks all human edits and overrides."""

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class AuditAction(str, enum.Enum):
    DATA_EDIT = "data_edit"
    STATUS_OVERRIDE = "status_override"
    RULE_CHANGE = "rule_change"
    RE_EVALUATION = "re_evaluation"


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    candidate_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("candidates.id", ondelete="CASCADE"), nullable=True
    )
    action: Mapped[AuditAction] = mapped_column(
        Enum(AuditAction), nullable=False
    )
    field_changed: Mapped[str | None] = mapped_column(String(255), nullable=True)
    old_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    new_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewer_comment: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    # Relationships
    candidate = relationship("Candidate", back_populates="audit_logs")

    __table_args__ = (
        Index("ix_audit_logs_candidate_id", "candidate_id"),
    )
