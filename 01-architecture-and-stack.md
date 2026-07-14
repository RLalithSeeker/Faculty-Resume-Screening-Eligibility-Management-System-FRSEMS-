# 01 — Architecture & Technology Stack

---

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend                          │
│  Next.js 15 (App Router) + Tailwind v4 + Shadcn UI │
│  Framer Motion · TanStack Table · Axios             │
│  Port: 3000                                          │
└───────────────────┬─────────────────────────────────┘
                    │ HTTP (Axios)
                    ▼
┌─────────────────────────────────────────────────────┐
│                    Backend                           │
│  FastAPI (Python 3.11+) · Pydantic v2               │
│  SQLAlchemy 2.0 (async) · aiosqlite                 │
│  Port: 8000                                          │
├─────────────────────────────────────────────────────┤
│  Services:                                           │
│  ├── Document Processor (PyMuPDF, python-docx)      │
│  ├── Data Extractor (regex-based)                   │
│  ├── Normalizer (alias table lookup)                │
│  ├── Rule Engine (operator dispatch, JSON trace)    │
│  ├── Duplicate Detector (SHA-256)                   │
│  └── Export Service (openpyxl, csv)                 │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│                    Storage                           │
│  SQLite (dev) / PostgreSQL (prod)                   │
│  File System: uploads/ directory                    │
└─────────────────────────────────────────────────────┘
```

---

## Technology Matrix

### Backend

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Framework | FastAPI | ≥0.115 | Async REST API |
| ORM | SQLAlchemy | ≥2.0.30 | Async ORM with Mapped columns |
| DB Driver | aiosqlite | ≥0.20 | Async SQLite for dev |
| Validation | Pydantic | ≥2.7 | Request/response schemas |
| Config | pydantic-settings | ≥2.3 | Environment-based config |
| PDF | PyMuPDF (fitz) | ≥1.24 | PDF text extraction |
| DOCX | python-docx | ≥1.1 | Word document parsing |
| Excel Export | openpyxl | ≥3.1 | XLSX generation |
| MIME Check | python-magic-bin | ≥0.4.14 | Magic byte validation |
| File Upload | python-multipart | ≥0.0.9 | Multipart form handling |
| Async Files | aiofiles | ≥24.1 | Non-blocking file I/O |
| Server | Uvicorn | ≥0.30 | ASGI server |

### Frontend

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Framework | Next.js | 15 | App Router, SSR/CSR |
| Language | TypeScript | 5.x | Type safety |
| Styling | Tailwind CSS | v4 | Utility-first CSS |
| Components | Shadcn UI | latest | Radix-based primitives |
| Animation | Framer Motion | ≥11 | Page transitions, micro-animations |
| Data Table | TanStack React Table | v8 | Headless table with filters |
| HTTP Client | Axios | ≥1.7 | API communication |
| Charts | Recharts | ≥2.12 | Donut chart on dashboard |
| Icons | Lucide React | latest | Consistent icon set |
| Font | Inter | Variable | Google Fonts |

---

## Directory Structure

```
WORK(1)/
├── 00-project-master-overview.md
├── 01-architecture-and-stack.md
├── 02-database-models.md
├── 03-document-processing-engine.md
├── 04-rule-engine-logic.md
├── 05-frontend-architecture.md
├── 06-execution-roadmap.md
│
├── backend/
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── requirements.txt
│   ├── models/
│   │   ├── __init__.py
│   │   ├── candidate.py
│   │   ├── resume.py
│   │   ├── rule.py
│   │   ├── specialization.py
│   │   ├── evaluation.py
│   │   └── audit.py
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── candidate.py
│   │   ├── resume.py
│   │   ├── rule.py
│   │   ├── specialization.py
│   │   ├── evaluation.py
│   │   ├── dashboard.py
│   │   └── audit.py
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── resumes.py
│   │   ├── candidates.py
│   │   ├── evaluation.py
│   │   ├── rules.py
│   │   ├── specializations.py
│   │   ├── dashboard.py
│   │   └── export.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── document_processor.py
│   │   ├── data_extractor.py
│   │   ├── normalizer.py
│   │   ├── rule_engine.py
│   │   ├── duplicate_detector.py
│   │   └── export_service.py
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── file_safety.py
│   │   └── scanned_detector.py
│   └── uploads/
│
└── frontend/
    ├── package.json
    ├── next.config.ts
    ├── tailwind.config.ts
    ├── tsconfig.json
    ├── components.json
    ├── public/
    └── src/
        ├── app/           # 9 page routes
        ├── components/    # Modular UI components
        ├── lib/           # Axios client, utils, types
        └── hooks/         # Data fetching hooks
```

---

## Communication Protocol

- Frontend → Backend: **Axios HTTP client** with base URL `http://localhost:8000`
- All API routes prefixed with `/api/`
- Responses use Pydantic models serialized as JSON
- File uploads use `multipart/form-data`
- Errors return `{ "detail": "message" }` with appropriate HTTP status codes

---

## CORS Configuration

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```
