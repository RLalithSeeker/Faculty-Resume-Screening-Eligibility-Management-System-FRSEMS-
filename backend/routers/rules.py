"""Rules router — CRUD for eligibility rules and conditions."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.rule import EligibilityRule, RuleCondition, LogicOperator, ConditionOperator
from schemas.rule import (
    RuleCreateRequest,
    RuleUpdateRequest,
    RuleResponse,
    RulesListResponse,
)

router = APIRouter()


@router.get("", response_model=RulesListResponse)
async def list_rules(
    active_only: bool = False,
    db: AsyncSession = Depends(get_db),
):
    """List all eligibility rules."""
    stmt = select(EligibilityRule).order_by(EligibilityRule.priority.asc())
    if active_only:
        stmt = stmt.where(EligibilityRule.is_active == True)

    result = await db.execute(stmt)
    rules = result.scalars().all()

    total = await db.scalar(select(func.count(EligibilityRule.id))) or 0

    return RulesListResponse(
        rules=[RuleResponse.model_validate(r) for r in rules],
        total=total,
    )


@router.get("/{rule_id}", response_model=RuleResponse)
async def get_rule(
    rule_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a single rule with conditions."""
    stmt = select(EligibilityRule).where(EligibilityRule.id == rule_id)
    result = await db.execute(stmt)
    rule = result.scalar_one_or_none()

    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    return RuleResponse.model_validate(rule)


@router.post("", response_model=RuleResponse, status_code=201)
async def create_rule(
    request: RuleCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create a new eligibility rule with conditions."""
    rule = EligibilityRule(
        name=request.name,
        description=request.description,
        department=request.department,
        position=request.position,
        priority=request.priority,
        is_active=request.is_active,
        logic_operator=LogicOperator(request.logic_operator),
        version=request.version,
        effective_from=request.effective_from,
        effective_to=request.effective_to,
    )
    db.add(rule)
    await db.flush()

    # Add conditions
    for idx, cond in enumerate(request.conditions):
        condition = RuleCondition(
            rule_id=rule.id,
            field=cond.field,
            operator=ConditionOperator(cond.operator),
            value=cond.value,
            order=cond.order if cond.order else idx,
        )
        db.add(condition)

    await db.flush()

    # Reload to get conditions
    await db.refresh(rule)
    return RuleResponse.model_validate(rule)


@router.put("/{rule_id}", response_model=RuleResponse)
async def update_rule(
    rule_id: str,
    request: RuleUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing rule and its conditions."""
    stmt = select(EligibilityRule).where(EligibilityRule.id == rule_id)
    result = await db.execute(stmt)
    rule = result.scalar_one_or_none()

    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    # Update scalar fields
    update_data = request.model_dump(exclude={"conditions"}, exclude_unset=True)
    for key, value in update_data.items():
        if key == "logic_operator" and value is not None:
            setattr(rule, key, LogicOperator(value))
        else:
            setattr(rule, key, value)

    rule.updated_at = datetime.utcnow()

    # Replace conditions if provided
    if request.conditions is not None:
        # Delete existing conditions
        for cond in list(rule.conditions):
            await db.delete(cond)

        # Add new conditions
        for idx, cond in enumerate(request.conditions):
            condition = RuleCondition(
                rule_id=rule.id,
                field=cond.field,
                operator=ConditionOperator(cond.operator),
                value=cond.value,
                order=cond.order if cond.order else idx,
            )
            db.add(condition)

    await db.flush()
    await db.refresh(rule)
    return RuleResponse.model_validate(rule)


@router.delete("/{rule_id}")
async def delete_rule(
    rule_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Delete (soft-deactivate) a rule."""
    stmt = select(EligibilityRule).where(EligibilityRule.id == rule_id)
    result = await db.execute(stmt)
    rule = result.scalar_one_or_none()

    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    rule.is_active = False
    rule.updated_at = datetime.utcnow()
    await db.flush()

    return {"message": f"Rule '{rule.name}' deactivated"}
