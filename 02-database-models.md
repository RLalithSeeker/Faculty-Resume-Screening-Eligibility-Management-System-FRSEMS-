# 02 — Database Models

> **This file is the single source of truth.** Always cross-reference before writing any SQLAlchemy query.

---

## Entity Relationship Diagram

```
Resume ──────┐
             ├──→ Candidate ──┬──→ Qualification (1:N)
             │                ├──→ Experience (1:N)
             │                ├──→ EvaluationResult (1:N)
             │                └──→ AuditLog (1:N)
             │
EligibilityRule ──→ RuleCondition (1:N)
             │
             └──→ EvaluationResult (N:1)

Specialization ──→ SpecializationAlias (1:N)
```

---

## Table Definitions

### `resumes`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK, default uuid4 | |
| `original_filename` | VARCHAR(255) | NOT NULL | Sanitized original name |
| `stored_filename` | VARCHAR(255) | NOT NULL, UNIQUE | UUID-based filename on disk |
| `file_hash` | VARCHAR(64) | NOT NULL, UNIQUE INDEX | SHA-256 hex digest |
| `file_size` | INTEGER | NOT NULL | Bytes |
| `mime_type` | VARCHAR(100) | NOT NULL | Validated via magic bytes |
| `status` | ENUM | NOT NULL, DEFAULT 'uploading' | Values: `uploading`, `extracting_text`, `extracting_data`, `completed`, `failed` |
| `error_message` | TEXT | NULLABLE | Failure details |
| `is_scanned` | BOOLEAN | DEFAULT FALSE | Scanned-doc heuristic |
| `candidate_id` | UUID | FK → candidates.id, NULLABLE | Linked after extraction |
| `created_at` | DATETIME | DEFAULT now() | |

### `candidates`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK, default uuid4 | |
| `name` | VARCHAR(255) | NOT NULL | |
| `email` | VARCHAR(255) | NULLABLE, UNIQUE | |
| `phone` | VARCHAR(50) | NULLABLE | |
| `current_designation` | VARCHAR(255) | NULLABLE | |
| `current_institution` | VARCHAR(255) | NULLABLE | |
| `total_experience_years` | FLOAT | NULLABLE | Computed from Experience |
| `phd_status` | ENUM | DEFAULT 'not_found' | Values: `completed`, `pursuing`, `not_found` |
| `eligibility_status` | ENUM | DEFAULT 'pending' | Values: `pending`, `eligible`, `not_eligible`, `manual_review` |
| `review_reason` | TEXT | NULLABLE | Why manual review was triggered |
| `created_at` | DATETIME | DEFAULT now() | |
| `updated_at` | DATETIME | DEFAULT now(), ON UPDATE now() | |

### `qualifications`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK, default uuid4 | |
| `candidate_id` | UUID | FK → candidates.id, NOT NULL, CASCADE | |
| `level` | ENUM | NOT NULL | Values: `ug`, `pg`, `phd` |
| `degree_original` | VARCHAR(255) | NOT NULL | Exactly as extracted from document |
| `degree_normalized` | VARCHAR(255) | NULLABLE | Mapped canonical token (e.g., "B.Tech.") |
| `field_original` | VARCHAR(255) | NULLABLE | Field as extracted |
| `field_normalized` | VARCHAR(255) | NULLABLE | Normalized field name |
| `institution` | VARCHAR(500) | NULLABLE | |
| `year_of_completion` | INTEGER | NULLABLE | |
| `is_allied` | BOOLEAN | NULLABLE | NULL = unknown, set by normalizer |

### `experiences`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK, default uuid4 | |
| `candidate_id` | UUID | FK → candidates.id, NOT NULL, CASCADE | |
| `designation` | VARCHAR(255) | NOT NULL | |
| `institution` | VARCHAR(500) | NOT NULL | |
| `start_year` | INTEGER | NULLABLE | |
| `end_year` | INTEGER | NULLABLE | NULL = present/ongoing |
| `is_teaching` | BOOLEAN | DEFAULT FALSE | Teaching vs industry flag |

### `eligibility_rules`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK, default uuid4 | |
| `name` | VARCHAR(255) | NOT NULL | e.g., "CSE Faculty — B.Tech + M.Tech + PhD" |
| `description` | TEXT | NULLABLE | |
| `department` | VARCHAR(255) | NOT NULL | Target department |
| `priority` | INTEGER | NOT NULL, DEFAULT 0 | Lower number = higher priority |
| `is_active` | BOOLEAN | DEFAULT TRUE | |
| `logic_operator` | ENUM | NOT NULL, DEFAULT 'AND' | Values: `AND`, `OR` — top-level connector |
| `created_at` | DATETIME | DEFAULT now() | |
| `updated_at` | DATETIME | DEFAULT now(), ON UPDATE now() | |

### `rule_conditions`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK, default uuid4 | |
| `rule_id` | UUID | FK → eligibility_rules.id, NOT NULL, CASCADE | |
| `field` | VARCHAR(100) | NOT NULL | Target field to check (see Field Reference below) |
| `operator` | ENUM | NOT NULL | Values: `equals`, `in`, `not_in`, `gte`, `lte`, `exists`, `is_allied` |
| `value` | JSON | NOT NULL | Expected value — string, array, or number |
| `order` | INTEGER | NOT NULL, DEFAULT 0 | Display/evaluation order |

**Field Reference for `rule_conditions.field`:**

| Field Key | Maps To | Type |
|---|---|---|
| `ug_degree` | Qualification where level=ug → degree_normalized | string |
| `ug_field` | Qualification where level=ug → field_normalized | string |
| `pg_degree` | Qualification where level=pg → degree_normalized | string |
| `pg_field` | Qualification where level=pg → field_normalized | string |
| `phd_status` | Candidate → phd_status | string |
| `phd_field` | Qualification where level=phd → field_normalized | string |
| `phd_is_allied` | Qualification where level=phd → is_allied | boolean |
| `experience_years` | Candidate → total_experience_years | number |
| `teaching_experience` | Sum of teaching Experience entries | number |

### `evaluation_results`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK, default uuid4 | |
| `candidate_id` | UUID | FK → candidates.id, NOT NULL, CASCADE | |
| `rule_id` | UUID | FK → eligibility_rules.id, NOT NULL | |
| `passed` | BOOLEAN | NOT NULL | |
| `evaluation_trace` | JSON | NOT NULL | Full explainability trace (see 04-rule-engine-logic.md) |
| `evaluated_at` | DATETIME | DEFAULT now() | |

### `audit_logs`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK, default uuid4 | |
| `candidate_id` | UUID | FK → candidates.id, NULLABLE | |
| `action` | ENUM | NOT NULL | Values: `data_edit`, `status_override`, `rule_change`, `re_evaluation` |
| `field_changed` | VARCHAR(255) | NULLABLE | |
| `old_value` | TEXT | NULLABLE | |
| `new_value` | TEXT | NULLABLE | |
| `reviewer_comment` | TEXT | NOT NULL | **Required** — enforced at API level |
| `created_at` | DATETIME | DEFAULT now() | |

### `specializations`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK, default uuid4 | |
| `name` | VARCHAR(255) | NOT NULL, UNIQUE | Canonical name (e.g., "Computer Science") |
| `is_allied` | BOOLEAN | DEFAULT FALSE | Allied-field flag |
| `department` | VARCHAR(255) | NOT NULL | Parent department |

### `specialization_aliases`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK, default uuid4 | |
| `specialization_id` | UUID | FK → specializations.id, NOT NULL, CASCADE | |
| `alias` | VARCHAR(255) | NOT NULL | e.g., "InfoSec", "Info Security", "IS" |

---

## Indexes

| Table | Columns | Type |
|---|---|---|
| resumes | file_hash | UNIQUE |
| candidates | email | UNIQUE (where not null) |
| candidates | eligibility_status | INDEX |
| qualifications | candidate_id | INDEX |
| qualifications | candidate_id, level | COMPOSITE INDEX |
| experiences | candidate_id | INDEX |
| evaluation_results | candidate_id | INDEX |
| evaluation_results | candidate_id, rule_id | COMPOSITE UNIQUE |
| audit_logs | candidate_id | INDEX |
| specialization_aliases | alias | INDEX |
