"""Specializations router — CRUD for specializations and aliases."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.specialization import Specialization, SpecializationAlias
from schemas.specialization import (
    SpecializationCreateRequest,
    SpecializationUpdateRequest,
    SpecializationResponse,
    SpecializationsListResponse,
)

router = APIRouter()


@router.get("", response_model=SpecializationsListResponse)
async def list_specializations(
    department: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """List all specializations with aliases."""
    stmt = select(Specialization).order_by(Specialization.name.asc())
    if department:
        stmt = stmt.where(Specialization.department == department)

    result = await db.execute(stmt)
    specs = result.scalars().all()
    total = await db.scalar(select(func.count(Specialization.id))) or 0

    return SpecializationsListResponse(
        specializations=[SpecializationResponse.model_validate(s) for s in specs],
        total=total,
    )


@router.post("", response_model=SpecializationResponse, status_code=201)
async def create_specialization(
    request: SpecializationCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create a specialization with optional aliases."""
    # Check for duplicate name
    existing = await db.scalar(
        select(Specialization).where(func.lower(Specialization.name) == request.name.lower())
    )
    if existing:
        raise HTTPException(status_code=409, detail=f"Specialization '{request.name}' already exists")

    spec = Specialization(
        name=request.name,
        is_allied=request.is_allied,
        department=request.department,
    )
    db.add(spec)
    await db.flush()

    # Add aliases
    for alias_text in request.aliases:
        alias = SpecializationAlias(
            specialization_id=spec.id,
            alias=alias_text,
        )
        db.add(alias)

    await db.flush()
    await db.refresh(spec)
    return SpecializationResponse.model_validate(spec)


@router.put("/{spec_id}", response_model=SpecializationResponse)
async def update_specialization(
    spec_id: str,
    request: SpecializationUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update a specialization and its aliases."""
    stmt = select(Specialization).where(Specialization.id == spec_id)
    result = await db.execute(stmt)
    spec = result.scalar_one_or_none()

    if not spec:
        raise HTTPException(status_code=404, detail="Specialization not found")

    # Update scalar fields
    update_data = request.model_dump(exclude={"aliases"}, exclude_unset=True)
    for key, value in update_data.items():
        setattr(spec, key, value)

    # Replace aliases if provided
    if request.aliases is not None:
        for alias in list(spec.aliases):
            await db.delete(alias)

        for alias_text in request.aliases:
            alias = SpecializationAlias(
                specialization_id=spec.id,
                alias=alias_text,
            )
            db.add(alias)

    await db.flush()
    await db.refresh(spec)
    return SpecializationResponse.model_validate(spec)


@router.delete("/{spec_id}")
async def delete_specialization(
    spec_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Delete a specialization and all its aliases."""
    stmt = select(Specialization).where(Specialization.id == spec_id)
    result = await db.execute(stmt)
    spec = result.scalar_one_or_none()

    if not spec:
        raise HTTPException(status_code=404, detail="Specialization not found")

    await db.delete(spec)
    await db.flush()

    return {"message": f"Specialization '{spec.name}' deleted"}
