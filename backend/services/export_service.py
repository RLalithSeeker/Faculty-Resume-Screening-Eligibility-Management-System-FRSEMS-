"""Export service — CSV and XLSX generation for candidate data."""

import csv
import io
from datetime import datetime

from openpyxl import Workbook
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.candidate import Candidate


EXPORT_COLUMNS = [
    "Name", "Email", "Phone", "Current Designation", "Current Institution",
    "Total Experience (Years)", "PhD Status", "Eligibility Status",
    "Review Reason", "Created At",
]


async def _get_candidates(db: AsyncSession, status_filter: str | None = None) -> list[Candidate]:
    """Fetch all candidates, optionally filtered by status."""
    stmt = select(Candidate).order_by(Candidate.created_at.desc())
    if status_filter:
        stmt = stmt.where(Candidate.eligibility_status == status_filter)
    result = await db.execute(stmt)
    return list(result.scalars().all())


def _candidate_to_row(c: Candidate) -> list:
    """Convert a candidate ORM object to a flat row."""
    return [
        c.name,
        c.email or "",
        c.phone or "",
        c.current_designation or "",
        c.current_institution or "",
        c.total_experience_years or "",
        c.phd_status.value if hasattr(c.phd_status, "value") else (c.phd_status or ""),
        c.eligibility_status.value if hasattr(c.eligibility_status, "value") else (c.eligibility_status or ""),
        c.review_reason or "",
        c.created_at.isoformat() if c.created_at else "",
    ]


async def export_csv(db: AsyncSession, status_filter: str | None = None) -> str:
    """Generate CSV content for candidates."""
    candidates = await _get_candidates(db, status_filter)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(EXPORT_COLUMNS)

    for c in candidates:
        writer.writerow(_candidate_to_row(c))

    return output.getvalue()


async def export_xlsx(db: AsyncSession, status_filter: str | None = None) -> bytes:
    """Generate XLSX bytes for candidates."""
    candidates = await _get_candidates(db, status_filter)

    wb = Workbook()
    ws = wb.active
    ws.title = "Candidates"

    # Header row with styling
    ws.append(EXPORT_COLUMNS)
    for cell in ws[1]:
        cell.font = cell.font.copy(bold=True)

    # Data rows
    for c in candidates:
        ws.append(_candidate_to_row(c))

    # Auto-width columns
    for col in ws.columns:
        max_length = 0
        col_letter = col[0].column_letter
        for cell in col:
            try:
                if cell.value:
                    max_length = max(max_length, len(str(cell.value)))
            except Exception:
                pass
        ws.column_dimensions[col_letter].width = min(max_length + 2, 50)

    output = io.BytesIO()
    wb.save(output)
    return output.getvalue()
