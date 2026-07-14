"""Candidate, Qualification, Experience models."""

import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class PhDStatus(str, enum.Enum):
    COMPLETED = "completed"
    PURSUING = "pursuing"
    NOT_FOUND = "not_found"


class EligibilityStatus(str, enum.Enum):
    PENDING = "pending"
    ELIGIBLE = "eligible"
    NOT_ELIGIBLE = "not_eligible"
    MANUAL_REVIEW = "manual_review"


class QualificationLevel(str, enum.Enum):
    UG = "ug"
    PG = "pg"
    PHD = "phd"


class Candidate(Base):
    __tablename__ = "candidates"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True, unique=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    current_designation: Mapped[str | None] = mapped_column(String(255), nullable=True)
    current_institution: Mapped[str | None] = mapped_column(String(255), nullable=True)
    total_experience_years: Mapped[float | None] = mapped_column(Float, nullable=True)
    phd_status: Mapped[PhDStatus] = mapped_column(
        Enum(PhDStatus), nullable=False, default=PhDStatus.NOT_FOUND
    )
    eligibility_status: Mapped[EligibilityStatus] = mapped_column(
        Enum(EligibilityStatus), nullable=False, default=EligibilityStatus.PENDING
    )
    review_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    resumes = relationship("Resume", back_populates="candidate", lazy="selectin")
    qualifications = relationship(
        "Qualification", back_populates="candidate", cascade="all, delete-orphan", lazy="selectin"
    )
    experiences = relationship(
        "Experience", back_populates="candidate", cascade="all, delete-orphan", lazy="selectin"
    )
    evaluation_results = relationship(
        "EvaluationResult", back_populates="candidate", cascade="all, delete-orphan", lazy="selectin"
    )
    audit_logs = relationship(
        "AuditLog", back_populates="candidate", cascade="all, delete-orphan", lazy="selectin"
    )

    __table_args__ = (
        Index("ix_candidates_eligibility_status", "eligibility_status"),
    )


class Qualification(Base):
    __tablename__ = "qualifications"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    candidate_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False
    )
    level: Mapped[QualificationLevel] = mapped_column(
        Enum(QualificationLevel), nullable=False
    )
    degree_original: Mapped[str] = mapped_column(String(255), nullable=False)
    degree_normalized: Mapped[str | None] = mapped_column(String(255), nullable=True)
    field_original: Mapped[str | None] = mapped_column(String(255), nullable=True)
    field_normalized: Mapped[str | None] = mapped_column(String(255), nullable=True)
    institution: Mapped[str | None] = mapped_column(String(500), nullable=True)
    year_of_completion: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_allied: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    # Relationships
    candidate = relationship("Candidate", back_populates="qualifications")

    __table_args__ = (
        Index("ix_qualifications_candidate_id", "candidate_id"),
        Index("ix_qualifications_candidate_level", "candidate_id", "level"),
    )


class Experience(Base):
    __tablename__ = "experiences"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    candidate_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False
    )
    designation: Mapped[str] = mapped_column(String(255), nullable=False)
    institution: Mapped[str] = mapped_column(String(500), nullable=False)
    start_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    end_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_teaching: Mapped[bool] = mapped_column(Boolean, default=False)

    # Relationships
    candidate = relationship("Candidate", back_populates="experiences")

    __table_args__ = (
        Index("ix_experiences_candidate_id", "candidate_id"),
    )
