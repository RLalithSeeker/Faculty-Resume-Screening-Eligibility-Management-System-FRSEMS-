"""Dashboard router — summary metrics for the frontend dashboard."""

from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.candidate import Candidate, EligibilityStatus, PhDStatus
from models.resume import Resume
from schemas.dashboard import DashboardSummary, DashboardMetrics, PhDDistribution

router = APIRouter()


@router.get("/summary", response_model=DashboardSummary)
async def get_dashboard_summary(db: AsyncSession = Depends(get_db)):
    """Get dashboard metrics: counts + PhD distribution."""

    # Total resumes
    resume_count = await db.scalar(select(func.count(Resume.id)))

    # Total candidates
    candidate_count = await db.scalar(select(func.count(Candidate.id)))

    # Status counts
    async def count_status(status: EligibilityStatus) -> int:
        return await db.scalar(
            select(func.count(Candidate.id)).where(Candidate.eligibility_status == status)
        ) or 0

    eligible = await count_status(EligibilityStatus.ELIGIBLE)
    not_eligible = await count_status(EligibilityStatus.NOT_ELIGIBLE)
    manual_review = await count_status(EligibilityStatus.MANUAL_REVIEW)
    pending = await count_status(EligibilityStatus.PENDING)

    # PhD distribution
    async def count_phd(status: PhDStatus) -> int:
        return await db.scalar(
            select(func.count(Candidate.id)).where(Candidate.phd_status == status)
        ) or 0

    phd_completed = await count_phd(PhDStatus.COMPLETED)
    phd_pursuing = await count_phd(PhDStatus.PURSUING)
    phd_not_found = await count_phd(PhDStatus.NOT_FOUND)

    return DashboardSummary(
        metrics=DashboardMetrics(
            total_resumes=resume_count or 0,
            total_candidates=candidate_count or 0,
            eligible=eligible,
            not_eligible=not_eligible,
            manual_review=manual_review,
            pending=pending,
        ),
        phd_distribution=PhDDistribution(
            completed=phd_completed,
            pursuing=phd_pursuing,
            not_found=phd_not_found,
        ),
    )
