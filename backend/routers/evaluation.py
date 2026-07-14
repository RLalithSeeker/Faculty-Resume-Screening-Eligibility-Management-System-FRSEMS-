"""Evaluation router — trigger evaluation, get results."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.evaluation import EvaluationResult
from models.audit import AuditLog, AuditAction
from services.rule_engine import evaluate_candidate

router = APIRouter()


@router.post("/{candidate_id}/evaluate")
async def evaluate(
    candidate_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Evaluate a candidate against all active eligibility rules.
    Returns explainable JSON traces for each rule.
    """
    try:
        result = await evaluate_candidate(candidate_id, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    # Log re-evaluation in audit
    audit = AuditLog(
        candidate_id=candidate_id,
        action=AuditAction.RE_EVALUATION,
        reviewer_comment="Eligibility evaluation triggered",
    )
    db.add(audit)
    await db.flush()

    return result


@router.get("/{candidate_id}/evaluations")
async def get_evaluations(
    candidate_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get all evaluation results for a candidate."""
    stmt = (
        select(EvaluationResult)
        .where(EvaluationResult.candidate_id == candidate_id)
        .order_by(EvaluationResult.evaluated_at.desc())
    )
    result = await db.execute(stmt)
    evals = result.scalars().all()

    return [
        {
            "id": e.id,
            "candidate_id": e.candidate_id,
            "rule_id": e.rule_id,
            "passed": e.passed,
            "evaluation_trace": e.evaluation_trace,
            "evaluated_at": e.evaluated_at.isoformat(),
        }
        for e in evals
    ]
