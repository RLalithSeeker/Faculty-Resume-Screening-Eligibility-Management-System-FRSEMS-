"""EligibilityRule and RuleCondition models."""

import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Integer, String, Text, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class LogicOperator(str, enum.Enum):
    AND = "AND"
    OR = "OR"


class ConditionOperator(str, enum.Enum):
    EQUALS = "equals"
    IN = "in"
    NOT_IN = "not_in"
    GTE = "gte"
    LTE = "lte"
    EXISTS = "exists"
    IS_ALLIED = "is_allied"


class EligibilityRule(Base):
    __tablename__ = "eligibility_rules"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    department: Mapped[str] = mapped_column(String(255), nullable=False)
    position: Mapped[str | None] = mapped_column(String(100), nullable=True)
    priority: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    logic_operator: Mapped[LogicOperator] = mapped_column(
        Enum(LogicOperator), nullable=False, default=LogicOperator.AND
    )
    version: Mapped[str] = mapped_column(String(20), default="1.0", nullable=False)
    effective_from: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    effective_to: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    conditions = relationship(
        "RuleCondition", back_populates="rule", cascade="all, delete-orphan",
        lazy="selectin", order_by="RuleCondition.order"
    )
    evaluation_results = relationship(
        "EvaluationResult", back_populates="rule", lazy="selectin"
    )


class RuleCondition(Base):
    __tablename__ = "rule_conditions"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    rule_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("eligibility_rules.id", ondelete="CASCADE"), nullable=False
    )
    field: Mapped[str] = mapped_column(String(100), nullable=False)
    operator: Mapped[ConditionOperator] = mapped_column(
        Enum(ConditionOperator), nullable=False
    )
    value: Mapped[dict] = mapped_column(JSON, nullable=False)
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Relationships
    rule = relationship("EligibilityRule", back_populates="conditions")
