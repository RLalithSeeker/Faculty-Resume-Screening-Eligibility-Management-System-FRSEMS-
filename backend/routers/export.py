"""Export router — CSV and XLSX download endpoints."""

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from services.export_service import export_csv, export_xlsx

router = APIRouter()


@router.get("/csv")
async def download_csv(
    status: str | None = Query(None, description="Filter by eligibility status"),
    db: AsyncSession = Depends(get_db),
):
    """Download candidate data as CSV."""
    csv_content = await export_csv(db, status)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=candidates.csv"},
    )


@router.get("/xlsx")
async def download_xlsx(
    status: str | None = Query(None, description="Filter by eligibility status"),
    db: AsyncSession = Depends(get_db),
):
    """Download candidate data as XLSX."""
    xlsx_content = await export_xlsx(db, status)
    return Response(
        content=xlsx_content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=candidates.xlsx"},
    )
