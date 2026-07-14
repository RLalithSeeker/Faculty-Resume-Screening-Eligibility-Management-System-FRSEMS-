"""Evaluation Pydantic schemas."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel


class ConditionTrace(BaseModel):
    condition_id: str
    field: str
    operator: str
    expected: Any
    actual: Any
    passed: bool


class EvaluationTrace(BaseModel):
    rule_id: str
    rule_name: str
    department: str
    logic_operator: str
    overall_passed: bool
    evaluated_at: str
    conditions: list[ConditionTrace]


class EvaluationResultResponse(BaseModel):
    id: str
    candidate_id: str
    rule_id: str
    passed: bool
    evaluation_trace: EvaluationTrace
    evaluated_at: datetime

    model_config = {"from_attributes": True}


class EvaluationResponse(BaseModel):
    candidate_id: str
    overall_status: str
    results: list[EvaluationResultResponse]
