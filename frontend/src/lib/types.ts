/**
 * FRSEMS — Shared TypeScript interfaces matching backend Pydantic schemas.
 */

// --- Enums ---

export type EligibilityStatus = "pending" | "eligible" | "not_eligible" | "manual_review";
export type PhDStatus = "completed" | "pursuing" | "not_found";
export type ResumeStatus = "uploading" | "extracting_text" | "extracting_data" | "completed" | "failed";
export type QualificationLevel = "ug" | "pg" | "phd";
export type LogicOperator = "AND" | "OR";
export type ConditionOperator = "equals" | "in" | "not_in" | "gte" | "lte" | "exists" | "is_allied";
export type AuditAction = "data_edit" | "status_override" | "rule_change" | "re_evaluation";

// --- Resume ---

export interface Resume {
  id: string;
  original_filename: string;
  stored_filename: string;
  file_hash: string;
  file_size: number;
  mime_type: string;
  status: ResumeStatus;
  error_message: string | null;
  is_scanned: boolean;
  batch_name?: string | null;
  raw_text?: string | null;
  candidate_id: string | null;
  created_at: string;
}

export interface ResumeUploadResponse {
  message: string;
  resumes: Resume[];
  duplicates: { filename: string; existing_candidate_id: string | null; file_hash: string }[];
}

// --- Qualification ---

export interface Qualification {
  id: string;
  candidate_id: string;
  level: QualificationLevel;
  degree_original: string;
  degree_normalized: string | null;
  field_original: string | null;
  field_normalized: string | null;
  institution: string | null;
  year_of_completion: number | null;
  is_allied: boolean | null;
}

// --- Experience ---

export interface Experience {
  id: string;
  candidate_id: string;
  designation: string;
  institution: string;
  start_year: number | null;
  end_year: number | null;
  is_teaching: boolean;
}

// --- Candidate ---

export interface CandidateListItem {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  current_designation: string | null;
  current_institution: string | null;
  total_experience_years: number | null;
  phd_status: PhDStatus;
  eligibility_status: EligibilityStatus;
  review_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface CandidateDetail extends CandidateListItem {
  qualifications: Qualification[];
  experiences: Experience[];
  resumes: { id: string; original_filename: string; stored_filename: string; status: string }[];
}

export interface CandidatesListResponse {
  candidates: CandidateListItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface CandidateUpdateRequest {
  name?: string;
  email?: string;
  phone?: string;
  current_designation?: string;
  current_institution?: string;
  total_experience_years?: number;
  phd_status?: string;
  reviewer_comment: string;
}

// --- Rule ---

export interface RuleCondition {
  id?: string;
  rule_id?: string;
  field: string;
  operator: ConditionOperator;
  value: unknown;
  order: number;
}

export interface EligibilityRule {
  id: string;
  name: string;
  description: string | null;
  department: string;
  position?: string | null;
  priority: number;
  is_active: boolean;
  logic_operator: LogicOperator;
  version?: string;
  effective_from?: string | null;
  effective_to?: string | null;
  conditions: RuleCondition[];
  created_at: string;
  updated_at: string;
}

export interface RuleCreateRequest {
  name: string;
  description?: string;
  department: string;
  priority?: number;
  is_active?: boolean;
  logic_operator?: LogicOperator;
  conditions: Omit<RuleCondition, "id" | "rule_id">[];
}

export interface RulesListResponse {
  rules: EligibilityRule[];
  total: number;
}

// --- Evaluation ---

export interface ConditionTrace {
  condition_id: string;
  field: string;
  operator: string;
  expected: unknown;
  actual: unknown;
  passed: boolean;
  error?: string;
}

export interface EvaluationTrace {
  rule_id: string;
  rule_name: string;
  department: string;
  logic_operator: string;
  overall_passed: boolean;
  evaluated_at: string;
  conditions: ConditionTrace[];
}

export interface EvaluationResult {
  id: string;
  candidate_id: string;
  rule_id: string;
  passed: boolean;
  evaluation_trace: EvaluationTrace;
  evaluated_at: string;
}

export interface EvaluationResponse {
  candidate_id: string;
  overall_status: string;
  results: EvaluationTrace[];
}

// --- Dashboard ---

export interface DashboardMetrics {
  total_resumes: number;
  total_candidates: number;
  eligible: number;
  not_eligible: number;
  manual_review: number;
  pending: number;
}

export interface PhDDistribution {
  completed: number;
  pursuing: number;
  not_found: number;
}

export interface DashboardSummary {
  metrics: DashboardMetrics;
  phd_distribution: PhDDistribution;
}

// --- Specialization ---

export interface SpecializationAlias {
  id: string;
  specialization_id: string;
  alias: string;
}

export interface Specialization {
  id: string;
  name: string;
  is_allied: boolean;
  department: string;
  aliases: SpecializationAlias[];
}

export interface SpecializationsListResponse {
  specializations: Specialization[];
  total: number;
}

// --- Audit ---

export interface AuditLogEntry {
  id: string;
  candidate_id: string | null;
  action: AuditAction;
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  reviewer_comment: string;
  created_at: string;
}
