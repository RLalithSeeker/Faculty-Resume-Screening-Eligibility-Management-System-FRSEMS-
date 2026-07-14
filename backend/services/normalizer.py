"""Normalizer — maps extracted field strings to canonical tokens via specialization alias table."""

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.specialization import Specialization, SpecializationAlias


async def normalize_field(field_original: str | None, db: AsyncSession) -> tuple[str | None, bool | None]:
    """
    Look up a field name in the specialization alias table.

    Returns:
        (field_normalized, is_allied) — or (None, None) if no match found.
    """
    if not field_original:
        return None, None

    # Case-insensitive search across aliases
    clean = field_original.strip()

    stmt = (
        select(Specialization)
        .join(SpecializationAlias)
        .where(func.lower(SpecializationAlias.alias) == clean.lower())
    )
    result = await db.execute(stmt)
    spec = result.scalar_one_or_none()

    if spec:
        return spec.name, spec.is_allied

    # Try matching against canonical specialization names directly
    stmt2 = select(Specialization).where(func.lower(Specialization.name) == clean.lower())
    result2 = await db.execute(stmt2)
    spec2 = result2.scalar_one_or_none()

    if spec2:
        return spec2.name, spec2.is_allied

    return None, None
