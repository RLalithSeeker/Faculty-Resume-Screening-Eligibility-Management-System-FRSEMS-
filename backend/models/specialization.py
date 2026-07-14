"""Specialization and SpecializationAlias models."""

import uuid

from sqlalchemy import Boolean, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class Specialization(Base):
    __tablename__ = "specializations"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    is_allied: Mapped[bool] = mapped_column(Boolean, default=False)
    department: Mapped[str] = mapped_column(String(255), nullable=False)

    # Relationships
    aliases = relationship(
        "SpecializationAlias", back_populates="specialization",
        cascade="all, delete-orphan", lazy="selectin"
    )


class SpecializationAlias(Base):
    __tablename__ = "specialization_aliases"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    specialization_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("specializations.id", ondelete="CASCADE"), nullable=False
    )
    alias: Mapped[str] = mapped_column(String(255), nullable=False)

    # Relationships
    specialization = relationship("Specialization", back_populates="aliases")

    __table_args__ = (
        Index("ix_specialization_aliases_alias", "alias"),
    )
