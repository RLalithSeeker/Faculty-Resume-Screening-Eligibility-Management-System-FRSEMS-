# 06 — Execution Roadmap

---

## Build Philosophy

- **Backend first** — API must exist before frontend can consume it
- **Models first** — Database schema is the foundation for everything
- **No placeholders** — Every function, component, and endpoint is production-ready
- **Modular** — Small files, single responsibility, easy to test and swap

---

## Phase 1: Backend Foundation

**Goal:** Runnable FastAPI server with all database tables and basic CRUD.

| Step | Deliverable | File(s) |
|---|---|---|
| 1.1 | Project scaffold | `backend/main.py`, `config.py`, `database.py` |
| 1.2 | All SQLAlchemy models | `backend/models/*.py` |
| 1.3 | Pydantic schemas | `backend/schemas/*.py` |
| 1.4 | Candidates CRUD router | `backend/routers/candidates.py` |
| 1.5 | Rules CRUD router | `backend/routers/rules.py` |
| 1.6 | Specializations CRUD router | `backend/routers/specializations.py` |
| 1.7 | Dashboard summary router | `backend/routers/dashboard.py` |
| 1.8 | Requirements file | `backend/requirements.txt` |

**Verify:** `uvicorn main:app --reload` starts, `/docs` shows all endpoints.

---

## Phase 2: Document Processing Pipeline

**Goal:** Upload PDFs/DOCX, extract text, extract structured fields, normalize.

| Step | Deliverable | File(s) |
|---|---|---|
| 2.1 | File safety utilities | `backend/utils/file_safety.py` |
| 2.2 | Scanned document detector | `backend/utils/scanned_detector.py` |
| 2.3 | Document processor (PDF + DOCX) | `backend/services/document_processor.py` |
| 2.4 | Data extractor (regex) | `backend/services/data_extractor.py` |
| 2.5 | Normalizer (alias lookup) | `backend/services/normalizer.py` |
| 2.6 | Duplicate detector (SHA-256) | `backend/services/duplicate_detector.py` |
| 2.7 | Resume upload router | `backend/routers/resumes.py` |

**Verify:** Upload a PDF → see extracted candidate record in database.

---

## Phase 3: Rule Engine + Evaluation

**Goal:** Dynamic rule evaluation with explainable JSON traces.

| Step | Deliverable | File(s) |
|---|---|---|
| 3.1 | Rule engine (operator dispatch) | `backend/services/rule_engine.py` |
| 3.2 | Evaluation router | `backend/routers/evaluation.py` |
| 3.3 | Audit log system | `backend/models/audit.py`, `backend/routers/candidates.py` (PATCH) |
| 3.4 | Export service (CSV + XLSX) | `backend/services/export_service.py`, `backend/routers/export.py` |

**Verify:** Create rule → evaluate candidate → inspect JSON trace → verify pass/fail logic.

---

## Phase 4: Frontend Foundation

**Goal:** Next.js app with layout, design system, and API client.

| Step | Deliverable | File(s) |
|---|---|---|
| 4.1 | Scaffold Next.js 15 + Tailwind v4 | `frontend/` (npx create-next-app) |
| 4.2 | Install Shadcn UI | `frontend/components.json`, `frontend/src/components/ui/*` |
| 4.3 | Design tokens + global CSS | `frontend/src/app/globals.css` |
| 4.4 | Layout (sidebar + page transition) | `frontend/src/app/layout.tsx`, `frontend/src/components/layout/*` |
| 4.5 | Axios client | `frontend/src/lib/api.ts` |
| 4.6 | TypeScript interfaces | `frontend/src/lib/types.ts` |

**Verify:** `npm run dev` renders sidebar + blank content area.

---

## Phase 5: Frontend Screens 1–5

**Goal:** Core screens — dashboard, upload, candidates, detail, evaluations.

| Step | Deliverable | Screen |
|---|---|---|
| 5.1 | Dashboard page + metric cards + donut chart | Screen 1 |
| 5.2 | Upload page + dropzone + progress | Screen 2 |
| 5.3 | Candidates list + TanStack table | Screen 3 |
| 5.4 | Candidate detail + edit dialog | Screen 4 |
| 5.5 | Evaluation matrix + trace viewer | Screen 5 |

**Verify:** Navigate all 5 screens, data loads from API, interactions work.

---

## Phase 6: Frontend Screens 6–9 + Polish

**Goal:** Remaining screens + responsive polish + micro-animations.

| Step | Deliverable | Screen |
|---|---|---|
| 6.1 | Manual review queue | Screen 6 |
| 6.2 | Rules management list | Screen 7 |
| 6.3 | Rule wizard (3-step form) | Screen 8 |
| 6.4 | Specialization management | Screen 9 |
| 6.5 | Export buttons (CSV/XLSX) | Candidates list |
| 6.6 | Responsive layout polish | All screens |
| 6.7 | Framer Motion micro-animations | All screens |
| 6.8 | 390px mobile viewport verification | All screens |

**Verify:** Full end-to-end flow: Upload → Extract → Normalize → Create Rule → Evaluate → Review → Export.

---

## Dependency Graph

```
Phase 1 (Backend Foundation)
    │
    ├── Phase 2 (Document Processing) ─── depends on Phase 1
    │       │
    │       └── Phase 3 (Rule Engine) ─── depends on Phase 1 + 2
    │
    └── Phase 4 (Frontend Foundation) ─── independent of Phase 2/3
            │
            ├── Phase 5 (Screens 1-5) ─── depends on Phase 4 + backend running
            │
            └── Phase 6 (Screens 6-9) ─── depends on Phase 5
```

Phase 4 can start in parallel with Phase 2/3 since it only needs the backend server running (Phase 1).
