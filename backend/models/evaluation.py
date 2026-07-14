"""EvaluationResult model — stores rule evaluation traces."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, JSON, String, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class EvaluationResult(Base):
    __tablename__ = "evaluation_results"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    candidate_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False
    )
    rule_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("eligibility_rules.id"), nullable=False
    )
    passed: Mapped[bool] = mapped_column(Boolean, nullable=False)
    evaluation_trace: Mapped[dict] = mapped_column(JSON, nullable=False)
    evaluated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    # Relationships
    candidate = relationship("Candidate", back_populates="evaluation_results")
    rule = relationship("EligibilityRule", back_populates="evaluation_results")

    __table_args__ = (
        Index("ix_evaluation_results_candidate_id", "candidate_id"),
        Index("ix_evaluation_results_candidate_rule", "candidate_id", "rule_id", unique=True),
    )
