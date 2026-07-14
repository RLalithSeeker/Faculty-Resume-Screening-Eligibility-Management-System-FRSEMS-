"""Specialization Pydantic schemas."""

from pydantic import BaseModel


class AliasBase(BaseModel):
    alias: str


class AliasResponse(AliasBase):
    id: str
    specialization_id: str

    model_config = {"from_attributes": True}


class SpecializationBase(BaseModel):
    name: str
    is_allied: bool = False
    department: str


class SpecializationCreateRequest(SpecializationBase):
    aliases: list[str] = []


class SpecializationUpdateRequest(BaseModel):
    name: str | None = None
    is_allied: bool | None = None
    department: str | None = None
    aliases: list[str] | None = None


class SpecializationResponse(SpecializationBase):
    id: str
    aliases: list[AliasResponse] = []

    model_config = {"from_attributes": True}


class SpecializationsListResponse(BaseModel):
    specializations: list[SpecializationResponse]
    total: int
