# 00 — Project Master Overview: FRSEMS

## Faculty Resume Screening & Eligibility Management System

---

## 1. Project Context

FRSEMS is a full-stack, production-grade web application custom-built for **university faculty hiring**, targeting environments like Woxsen University. It replaces manual spreadsheet-based resume screening with an automated, explainable pipeline.

**It is NOT a generic ATS.** It is a luxury-grade institutional platform with:
- Crisp, modern UI (slate/monochrome palette, deliberate status chips)
- Smooth Framer Motion transitions on every page mount
- A decoupled Python REST API backend designed for future LLM agent integration

---

## 2. The Core Business Problem

Academic hiring requires processing complex educational timelines (UG → PG → Ph.D.) and evaluating them against **strict, shifting criteria** such as:
- "Must have B.Tech and M.Tech in CSE, plus a Ph.D. in an allied field"
- "Minimum 5 years teaching experience post-PG"
- "Ph.D. must be completed, not pursuing"

### The System Solves This By:

1. **Ingesting** — Bulk parsing PDFs and DOCX files securely, catching duplicates via SHA-256 hashes.
2. **Normalizing** — Mapping noisy strings ("B.E.", "Bachelor of Tech") to standard database tokens ("B.Tech.").
3. **Evaluating** — Running those tokens through a dynamic, database-driven rule engine (no hard-coded logic).

---

## 3. The 9-Screen UI Plan

| # | Screen | Purpose |
|---|---|---|
| 1 | Dashboard | Summary metrics, donut charts for PhD status |
| 2 | Upload Resumes | Drag-and-drop, granular processing states |
| 3 | Candidates List | TanStack React Table, global search, column filters |
| 4 | Candidate Detail | Two-column: resume preview + editable extracted data |
| 5 | Eligibility Evaluation | Explainable pass/fail matrix per rule |
| 6 | Manual Review Queue | Edge cases with explicit review reasons |
| 7 | Eligibility Rules List | Active/inactive rules with priority levels |
| 8 | Create/Edit Rule | Multi-step wizard (Details → Conditions → Review) |
| 9 | Specialization Management | Master field list with aliases and allied flags |

---

## 4. Unbreakable Business Rules

### A. Data Integrity & Overrides
- **Never auto-reject** for missing info → set `Manual Review Required`
- **Preserve the source**: store both `degree_original` and `degree_normalized`
- **Audit trails**: all edits require a `reviewer_comment`, logged in `AuditLog`

### B. The Explainable Rule Engine
- **No `eval()` or hardcoded Python logic** — rules from database only
- **Explainability mandatory** — JSON trace of every pass/fail per condition
- **Re-evaluation** button after any data edit or rule change

### C. File & Processing Safety
- `PyMuPDF` for PDFs, `python-docx` for DOCX
- Scanned-document detection heuristic (text length vs file size)
- Sanitize filenames, validate MIME types via magic bytes
- Uploaded files must never be executable

---

## 5. Required API Endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/resumes/upload` | Multi-file upload with dedup |
| GET | `/api/candidates` | Paginated, filterable candidate list |
| POST | `/api/candidates/{id}/evaluate` | Run eligibility evaluation |
| GET | `/api/dashboard/summary` | Metric cards data |
| GET | `/api/export/csv` | CSV export |
| GET | `/api/export/xlsx` | Excel export |

---

## 6. AI Agent Execution Protocol

1. Always cross-reference `02-database-models.md` before writing SQLAlchemy queries
2. Write complete, production-ready code — no placeholders
3. Keep UI modular — use small, reusable Shadcn components, not monolithic `page.tsx`
