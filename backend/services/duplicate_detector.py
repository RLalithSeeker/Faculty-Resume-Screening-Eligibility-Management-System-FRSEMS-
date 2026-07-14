"""Duplicate detection via SHA-256 file hash."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.resume import Resume


async def check_duplicate(file_hash: str, db: AsyncSession) -> Resume | None:
    """Check if a resume with the given hash already exists."""
    stmt = select(Resume).where(Resume.file_hash == file_hash)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()
