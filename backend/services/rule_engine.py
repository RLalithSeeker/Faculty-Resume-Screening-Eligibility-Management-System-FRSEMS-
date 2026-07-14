"""
Rule Engine — Dynamic eligibility evaluation with explainable JSON traces.
No eval(). No exec(). No hardcoded logic. Operator dispatch map only.
"""

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from models.candidate import Candidate, Qualification, Experience, EligibilityStatus
from models.rule import EligibilityRule, RuleCondition
from models.evaluation import EvaluationResult
from models.audit import AuditLog, AuditAction


# --- Operator Dispatch Map (whitelist — nothing else executes) ---

OPERATOR_MAP: dict[str, callable] = {
    "equals": lambda actual, expected: str(actual or "").lower() == str(expected).lower(),
    "in": lambda actual, expected: str(actual or "").lower() in [str(v).lower() for v in expected],
    "not_in": lambda actual, expected: str(actual or "").lower() not in [str(v).lower() for v in expected],
    "gte": lambda actual, expected: float(actual or 0) >= float(expected),
    "lte": lambda actual, expected: float(actual or 0) <= float(expected),
    "exists": lambda actual, expected: actual is not None and str(actual).strip() != "",
    "is_allied": lambda actual, expected: bool(actual) == bool(expected),
}


def resolve_field(
    field_key: str,
    candidate: Candidate,
    qualifications: list[Qualification],
    experiences: list[Experience],
) -> Any:
    """Map a rule condition field key to the candidate's actual value."""

    if field_key == "phd_status":
        return candidate.phd_status.value if candidate.phd_status else None
    elif field_key == "experience_years":
        return candidate.total_experience_years
    elif field_key == "teaching_experience":
        total = 0.0
        for e in experiences:
            if e.is_teaching and e.start_year:
                end = e.end_year or 2026
                total += max(0, end - e.start_year)
        return total

    # Handle qualification-level fields: ug_degree, pg_field, phd_is_allied, etc.
    level_prefixes = {"ug": "ug", "pg": "pg", "phd": "phd"}
    for prefix, level_value in level_prefixes.items():
        if field_key.startswith(f"{prefix}_"):
            attr_name = field_key[len(prefix) + 1:]
            qual = next((q for q in qualifications if q.level.value == level_value), None)
            if qual is None:
                return None

            # Map attribute names
            attr_map = {
                "degree": "degree_normalized",
                "field": "field_normalized",
                "is_allied": "is_allied",
            }
            actual_attr = attr_map.get(attr_name, attr_name)
            return getattr(qual, actual_attr, None)

    return None


def evaluate_condition(
    condition: RuleCondition,
    candidate: Candidate,
    qualifications: list[Qualification],
    experiences: list[Experience],
) -> dict:
    """Evaluate a single condition and return a trace entry."""
    actual = resolve_field(condition.field, candidate, qualifications, experiences)
    operator_fn = OPERATOR_MAP.get(condition.operator.value if hasattr(condition.operator, 'value') else condition.operator)

    if operator_fn is None:
        return {
            "condition_id": condition.id,
            "field": condition.field,
            "operator": condition.operator.value if hasattr(condition.operator, 'value') else condition.operator,
            "expected": condition.value,
            "actual": str(actual) if actual is not None else None,
            "passed": False,
            "error": f"Unknown operator: {condition.operator}",
        }

    try:
        passed = operator_fn(actual, condition.value)
    except (ValueError, TypeError) as e:
        passed = False

    return {
        "condition_id": condition.id,
        "field": condition.field,
        "operator": condition.operator.value if hasattr(condition.operator, 'value') else condition.operator,
        "expected": condition.value,
        "actual": str(actual) if actual is not None else None,
        "passed": passed,
    }


async def evaluate_candidate(
    candidate_id: str,
    db: AsyncSession,
    rule_ids: list[str] | None = None,
) -> dict:
    """
    Evaluate a candidate against eligibility rules.

    Returns a dict with overall status and per-rule results with traces.
    """
    # Load candidate with relationships
    stmt = select(Candidate).where(Candidate.id == candidate_id)
    result = await db.execute(stmt)
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise ValueError(f"Candidate {candidate_id} not found")

    qualifications = list(candidate.qualifications)
    experiences = list(candidate.experiences)

    # Load rules
    if rule_ids:
        rules_stmt = select(EligibilityRule).where(
            EligibilityRule.id.in_(rule_ids),
            EligibilityRule.is_active == True,
        )
    else:
        rules_stmt = select(EligibilityRule).where(EligibilityRule.is_active == True)

    rules_result = await db.execute(rules_stmt)
    rules = rules_result.scalars().all()

    if not rules:
        return {
            "candidate_id": candidate_id,
            "overall_status": "pending",
            "results": [],
            "message": "No active rules found",
        }

    # Delete existing evaluation results for this candidate
    delete_stmt = delete(EvaluationResult).where(EvaluationResult.candidate_id == candidate_id)
    await db.execute(delete_stmt)

    evaluation_results = []
    any_passed = False

    for rule in rules:
        conditions = sorted(rule.conditions, key=lambda c: c.order)
        condition_traces = []

        for condition in conditions:
            trace = evaluate_condition(condition, candidate, qualifications, experiences)
            condition_traces.append(trace)

        # Combine using logic operator
        if rule.logic_operator.value == "AND":
            overall_passed = all(ct["passed"] for ct in condition_traces) if condition_traces else True
        else:  # OR
            overall_passed = any(ct["passed"] for ct in condition_traces) if condition_traces else False

        if overall_passed:
            any_passed = True

        # Build evaluation trace
        trace = {
            "rule_id": rule.id,
            "rule_name": rule.name,
            "department": rule.department,
            "logic_operator": rule.logic_operator.value,
            "overall_passed": overall_passed,
            "evaluated_at": datetime.now(timezone.utc).isoformat(),
            "conditions": condition_traces,
        }

        # Save evaluation result
        eval_result = EvaluationResult(
            candidate_id=candidate_id,
            rule_id=rule.id,
            passed=overall_passed,
            evaluation_trace=trace,
        )
        db.add(eval_result)
        evaluation_results.append(trace)

    # Determine overall status
    if any_passed:
        overall_status = EligibilityStatus.ELIGIBLE
    else:
        overall_status = EligibilityStatus.NOT_ELIGIBLE

    candidate.eligibility_status = overall_status
    candidate.updated_at = datetime.utcnow()

    await db.flush()

    return {
        "candidate_id": candidate_id,
        "overall_status": overall_status.value,
        "results": evaluation_results,
    }
