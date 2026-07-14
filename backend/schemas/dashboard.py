"""Dashboard Pydantic schemas."""

from pydantic import BaseModel


class DashboardMetrics(BaseModel):
    total_resumes: int
    total_candidates: int
    eligible: int
    not_eligible: int
    manual_review: int
    pending: int


class PhDDistribution(BaseModel):
    completed: int
    pursuing: int
    not_found: int


class DashboardSummary(BaseModel):
    metrics: DashboardMetrics
    phd_distribution: PhDDistribution
