"""Candidate, Qualification, Experience Pydantic schemas."""

from datetime import datetime
from pydantic import BaseModel


# --- Qualification ---

class QualificationBase(BaseModel):
    level: str
    degree_original: str
    degree_normalized: str | None = None
    field_original: str | None = None
    field_normalized: str | None = None
    institution: str | None = None
    year_of_completion: int | None = None
    is_allied: bool | None = None


class QualificationResponse(QualificationBase):
    id: str
    candidate_id: str

    model_config = {"from_attributes": True}


# --- Experience ---

class ExperienceBase(BaseModel):
    designation: str
    institution: str
    start_year: int | None = None
    end_year: int | None = None
    is_teaching: bool = False


class ExperienceResponse(ExperienceBase):
    id: str
    candidate_id: str

    model_config = {"from_attributes": True}


# --- Candidate ---

class CandidateBase(BaseModel):
    name: str
    email: str | None = None
    phone: str | None = None
    current_designation: str | None = None
    current_institution: str | None = None
    total_experience_years: float | None = None
    phd_status: str = "not_found"


class CandidateCreateRequest(CandidateBase):
    eligibility_status: str = "pending"


class CandidateListItem(BaseModel):
    id: str
    name: str
    email: str | None = None
    phone: str | None = None
    current_designation: str | None = None
    current_institution: str | None = None
    total_experience_years: float | None = None
    phd_status: str
    eligibility_status: str
    review_reason: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CandidateDetail(CandidateListItem):
    qualifications: list[QualificationResponse] = []
    experiences: list[ExperienceResponse] = []
    resumes: list[dict] = []

    model_config = {"from_attributes": True}


class CandidateUpdateRequest(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    current_designation: str | None = None
    current_institution: str | None = None
    total_experience_years: float | None = None
    phd_status: str | None = None
    reviewer_comment: str  # Required for any edit


class CandidateStatusOverride(BaseModel):
    eligibility_status: str
    reviewer_comment: str  # Required


class CandidatesListResponse(BaseModel):
    candidates: list[CandidateListItem]
    total: int
    page: int
    page_size: int
