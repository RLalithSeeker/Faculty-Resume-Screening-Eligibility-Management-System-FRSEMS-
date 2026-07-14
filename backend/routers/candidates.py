"""Candidates router — CRUD, search, filter, edit with audit logging."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.candidate import Candidate, EligibilityStatus
from models.audit import AuditLog, AuditAction
from schemas.candidate import (
    CandidateDetail,
    CandidateListItem,
    CandidateUpdateRequest,
    CandidateStatusOverride,
    CandidatesListResponse,
    CandidateCreateRequest,
)

router = APIRouter()


@router.post("", response_model=CandidateDetail, status_code=201)
async def create_candidate(
    request: CandidateCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Manually add a candidate."""
    if request.email:
        existing = await db.scalar(
            select(Candidate).where(Candidate.email == request.email)
        )
        if existing:
            raise HTTPException(
                status_code=409,
                detail=f"Candidate with email '{request.email}' already exists"
            )

    candidate = Candidate(
        name=request.name,
        email=request.email,
        phone=request.phone,
        current_designation=request.current_designation,
        current_institution=request.current_institution,
        total_experience_years=request.total_experience_years,
        phd_status=request.phd_status,
        eligibility_status=EligibilityStatus(request.eligibility_status),
    )
    db.add(candidate)
    await db.flush()

    audit = AuditLog(
        candidate_id=candidate.id,
        action=AuditAction.DATA_EDIT,
        reviewer_comment="Candidate manually added to the system",
    )
    db.add(audit)
    await db.flush()
    await db.refresh(candidate)

    return CandidateDetail.model_validate(candidate)


@router.get("", response_model=CandidatesListResponse)
async def list_candidates(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
    status: str | None = None,
    phd_status: str | None = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    db: AsyncSession = Depends(get_db),
):
    """List candidates with pagination, search, and filters."""
    stmt = select(Candidate)

    # Search filter — name, email, phone, institution
    if search:
        search_term = f"%{search}%"
        stmt = stmt.where(
            or_(
                Candidate.name.ilike(search_term),
                Candidate.email.ilike(search_term),
                Candidate.phone.ilike(search_term),
                Candidate.current_institution.ilike(search_term),
                Candidate.current_designation.ilike(search_term),
            )
        )

    # Status filter
    if status:
        stmt = stmt.where(Candidate.eligibility_status == status)

    # PhD status filter
    if phd_status:
        stmt = stmt.where(Candidate.phd_status == phd_status)

    # Count total
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = await db.scalar(count_stmt) or 0

    # Sorting
    sort_column = getattr(Candidate, sort_by, Candidate.created_at)
    if sort_order == "asc":
        stmt = stmt.order_by(sort_column.asc())
    else:
        stmt = stmt.order_by(sort_column.desc())

    # Pagination
    offset = (page - 1) * page_size
    stmt = stmt.offset(offset).limit(page_size)

    result = await db.execute(stmt)
    candidates = result.scalars().all()

    return CandidatesListResponse(
        candidates=[CandidateListItem.model_validate(c) for c in candidates],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/review-queue", response_model=CandidatesListResponse)
async def get_review_queue(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Get candidates needing manual review."""
    stmt = (
        select(Candidate)
        .where(Candidate.eligibility_status == EligibilityStatus.MANUAL_REVIEW)
        .order_by(Candidate.created_at.desc())
    )

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = await db.scalar(count_stmt) or 0

    offset = (page - 1) * page_size
    stmt = stmt.offset(offset).limit(page_size)

    result = await db.execute(stmt)
    candidates = result.scalars().all()

    return CandidatesListResponse(
        candidates=[CandidateListItem.model_validate(c) for c in candidates],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/audit-logs/all")
async def get_all_audit_logs(
    db: AsyncSession = Depends(get_db),
):
    """Retrieve all system-wide audit logs."""
    stmt = select(AuditLog).order_by(AuditLog.created_at.desc())
    result = await db.execute(stmt)
    logs = result.scalars().all()
    return logs


@router.get("/{candidate_id}", response_model=CandidateDetail)
async def get_candidate(
    candidate_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get full candidate detail with qualifications, experiences, and resumes."""
    stmt = select(Candidate).where(Candidate.id == candidate_id)
    result = await db.execute(stmt)
    candidate = result.scalar_one_or_none()

    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    # Build response with nested data
    response = CandidateDetail.model_validate(candidate)
    response.resumes = [
        {
            "id": r.id,
            "original_filename": r.original_filename,
            "stored_filename": r.stored_filename,
            "status": r.status.value,
            "raw_text": r.raw_text,
        }
        for r in candidate.resumes
    ]
    return response


@router.patch("/{candidate_id}", response_model=CandidateDetail)
async def update_candidate(
    candidate_id: str,
    update: CandidateUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Update candidate extracted data.
    Requires reviewer_comment — logged in audit trail.
    """
    stmt = select(Candidate).where(Candidate.id == candidate_id)
    result = await db.execute(stmt)
    candidate = result.scalar_one_or_none()

    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    # Track changes for audit
    update_data = update.model_dump(exclude={"reviewer_comment"}, exclude_unset=True)

    for field_name, new_value in update_data.items():
        old_value = getattr(candidate, field_name, None)
        if str(old_value) != str(new_value):
            # Create audit log entry
            audit = AuditLog(
                candidate_id=candidate_id,
                action=AuditAction.DATA_EDIT,
                field_changed=field_name,
                old_value=str(old_value) if old_value is not None else None,
                new_value=str(new_value),
                reviewer_comment=update.reviewer_comment,
            )
            db.add(audit)

            # Apply change
            setattr(candidate, field_name, new_value)

    candidate.updated_at = datetime.utcnow()
    await db.flush()

    return CandidateDetail.model_validate(candidate)


@router.post("/{candidate_id}/override-status", response_model=CandidateDetail)
async def override_candidate_status(
    candidate_id: str,
    override: CandidateStatusOverride,
    db: AsyncSession = Depends(get_db),
):
    """
    Manually override a candidate's eligibility status.
    Requires reviewer_comment — logged in audit trail.
    """
    stmt = select(Candidate).where(Candidate.id == candidate_id)
    result = await db.execute(stmt)
    candidate = result.scalar_one_or_none()

    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    old_status = candidate.eligibility_status.value if candidate.eligibility_status else None

    # Validate new status
    try:
        new_status = EligibilityStatus(override.eligibility_status)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status: {override.eligibility_status}")

    # Audit log
    audit = AuditLog(
        candidate_id=candidate_id,
        action=AuditAction.STATUS_OVERRIDE,
        field_changed="eligibility_status",
        old_value=old_status,
        new_value=new_status.value,
        reviewer_comment=override.reviewer_comment,
    )
    db.add(audit)

    candidate.eligibility_status = new_status
    candidate.updated_at = datetime.utcnow()
    await db.flush()

    return CandidateDetail.model_validate(candidate)
