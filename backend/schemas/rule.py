"""Rule and RuleCondition Pydantic schemas."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel


class RuleConditionBase(BaseModel):
    field: str
    operator: str
    value: Any
    order: int = 0


class RuleConditionResponse(RuleConditionBase):
    id: str
    rule_id: str

    model_config = {"from_attributes": True}


class RuleBase(BaseModel):
    name: str
    description: str | None = None
    department: str
    position: str | None = None
    priority: int = 0
    is_active: bool = True
    logic_operator: str = "AND"
    version: str = "1.0"
    effective_from: datetime | None = None
    effective_to: datetime | None = None


class RuleCreateRequest(RuleBase):
    conditions: list[RuleConditionBase] = []


class RuleUpdateRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    department: str | None = None
    position: str | None = None
    priority: int | None = None
    is_active: bool | None = None
    logic_operator: str | None = None
    version: str | None = None
    effective_from: datetime | None = None
    effective_to: datetime | None = None
    conditions: list[RuleConditionBase] | None = None


class RuleResponse(RuleBase):
    id: str
    conditions: list[RuleConditionResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RulesListResponse(BaseModel):
    rules: list[RuleResponse]
    total: int
