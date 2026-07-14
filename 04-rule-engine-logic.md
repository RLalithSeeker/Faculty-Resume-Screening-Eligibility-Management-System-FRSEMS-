# 04 — Rule Engine Logic

---

## Core Principle

**No `eval()`. No hardcoded Python logic. No `exec()`.**

All eligibility rules are constructed dynamically from database records (`eligibility_rules` + `rule_conditions` tables) and evaluated using a whitelist operator dispatch map.

---

## Operator Dispatch Map

```python
from typing import Any, Callable

OPERATOR_MAP: dict[str, Callable[[Any, Any], bool]] = {
    "equals": lambda actual, expected: str(actual).lower() == str(expected).lower(),
    "in": lambda actual, expected: str(actual).lower() in [str(v).lower() for v in expected],
    "not_in": lambda actual, expected: str(actual).lower() not in [str(v).lower() for v in expected],
    "gte": lambda actual, expected: float(actual or 0) >= float(expected),
    "lte": lambda actual, expected: float(actual or 0) <= float(expected),
    "exists": lambda actual, expected: actual is not None and str(actual).strip() != "",
    "is_allied": lambda actual, expected: bool(actual) == bool(expected),
}
```

---

## Field Resolution

Before evaluating, the engine must **resolve** the `field` key from a `RuleCondition` to an actual value from the candidate's data:

```python
def resolve_field(field_key: str, candidate: Candidate, qualifications: list[Qualification], experiences: list[Experience]) -> Any:
    """Map a rule condition field key to the candidate's actual value."""

    if field_key == "phd_status":
        return candidate.phd_status
    elif field_key == "experience_years":
        return candidate.total_experience_years
    elif field_key == "teaching_experience":
        return sum(
            (e.end_year or 2026) - (e.start_year or 0)
            for e in experiences if e.is_teaching
        )
    elif field_key.startswith(("ug_", "pg_", "phd_")):
        level, attr = field_key.split("_", 1)
        qual = next((q for q in qualifications if q.level == level), None)
        if qual is None:
            return None
        return getattr(qual, attr.replace("degree", "degree_normalized").replace("field", "field_normalized"), None)
    return None
```

---

## Evaluation Flow

```
evaluate_candidate(candidate_id, rule_ids=None)
    │
    ├── Load candidate + qualifications + experiences
    │
    ├── If rule_ids is None → load ALL active rules
    │
    ├── For each rule:
    │   ├── Load rule.conditions (ordered by `order`)
    │   │
    │   ├── For each condition:
    │   │   ├── Resolve field → actual value
    │   │   ├── Look up operator in OPERATOR_MAP
    │   │   ├── Execute: operator(actual, condition.value)
    │   │   └── Record: { condition_id, field, operator, expected, actual, passed }
    │   │
    │   ├── Combine results using rule.logic_operator:
    │   │   ├── AND → all conditions must pass
    │   │   └── OR  → at least one condition must pass
    │   │
    │   └── Save EvaluationResult with full trace
    │
    ├── Determine overall status:
    │   ├── ANY rule passed → eligible
    │   ├── ALL rules failed → not_eligible
    │   └── Missing data prevented evaluation → manual_review
    │
    └── Update candidate.eligibility_status
```

---

## Evaluation Trace Format (JSON)

Every evaluation produces a JSON trace stored in `evaluation_results.evaluation_trace`:

```json
{
    "rule_id": "550e8400-e29b-41d4-a716-446655440000",
    "rule_name": "CSE Faculty — B.Tech + M.Tech + PhD Required",
    "department": "Computer Science",
    "logic_operator": "AND",
    "overall_passed": false,
    "evaluated_at": "2026-07-14T15:30:00Z",
    "conditions": [
        {
            "condition_id": "uuid-1",
            "field": "ug_degree",
            "operator": "in",
            "expected": ["B.Tech.", "B.E."],
            "actual": "B.Tech.",
            "passed": true
        },
        {
            "condition_id": "uuid-2",
            "field": "pg_degree",
            "operator": "in",
            "expected": ["M.Tech.", "M.E."],
            "actual": "M.Sc.",
            "passed": false
        },
        {
            "condition_id": "uuid-3",
            "field": "phd_status",
            "operator": "equals",
            "expected": "completed",
            "actual": "pursuing",
            "passed": false
        },
        {
            "condition_id": "uuid-4",
            "field": "experience_years",
            "operator": "gte",
            "expected": 3,
            "actual": 7.0,
            "passed": true
        }
    ]
}
```

---

## Re-Evaluation Triggers

Re-evaluation should be available (via button in UI) when:

1. **Data Edit**: A reviewer corrects a candidate's extracted data (qualification, experience, PhD status)
2. **Rule Change**: An admin modifies, creates, or deactivates a rule
3. **Normalization Update**: A new specialization alias is added that could affect existing candidates

Re-evaluation flow:
1. Delete existing `evaluation_results` for the candidate (or mark as superseded)
2. Run full evaluation against all active rules
3. Log in `audit_logs` with action = `re_evaluation`
4. Update `candidate.eligibility_status` based on new results

---

## Edge Cases

| Scenario | Behavior |
|---|---|
| Candidate has no qualifications at level checked by condition | `actual = None` → condition fails, but no error |
| Condition value is malformed JSON | Reject at API schema validation (Pydantic) |
| Operator not in OPERATOR_MAP | Raise `ValueError` → evaluation fails with error trace |
| Rule has zero conditions | Rule auto-passes (vacuous truth for AND, auto-fails for OR) |
| Multiple rules, mixed results | `eligible` if ANY rule passes; `not_eligible` only if ALL fail |
