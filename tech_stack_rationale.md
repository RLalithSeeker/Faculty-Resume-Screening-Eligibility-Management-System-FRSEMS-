# FRSEMS Tech Stack Rationale

This document outlines the technical reasoning behind the selection of the core technologies, database systems, and architecture patterns used in the Faculty Resume Screening & Eligibility Management System (FRSEMS).

---

## 🚀 Core Architecture: Decoupled REST Client-Server

FRSEMS is built as a decoupled application split into:
1.  **Frontend**: Next.js 15 (App Router, Tailwind CSS, Shadcn UI, Radix UI).
2.  **Backend**: Python 3.11+ REST API (FastAPI, SQLAlchemy 2.0, Pydantic v2).

### Why Decouple?
-   **Security & Compliance**: Resume parsing, eligibility evaluations, and database writes are decoupled from the client. The frontend has zero direct database credentials.
-   **Extensibility**: The Python backend can be easily updated to swap heuristic parsing or regex-based extraction with advanced LLM agents (e.g. LangChain, LlamaIndex, or proprietary models) without touching a single line of frontend interface code.
-   **Performance**: Separating server-side document parsing from client rendering guarantees that heavy file processing tasks do not block the user interface.

---

## 🎨 Frontend Stack: Next.js 15, Tailwind, & Shadcn UI

-   **Next.js 15 (App Router & Turbopack)**:
    -   *Server Components*: Allows initial dashboards and candidate tables to load data fast.
    -   *Routing*: Simple, clean file-based routing with support for dynamic detail segments (`/candidates/[id]`).
-   **Tailwind CSS**:
    -   Provides clean utility-first styling to support the **institutional luxury** theme (monochrome, slate tones, clean borders, custom status chips) without the bloat of large UI frameworks.
-   **Shadcn UI & Radix UI**:
    -   Provides access-compliant, unstyled primitive components (Modals, Dropdowns, Date Pickers, Accordions) that can be fully customized via Tailwind to fit the monochrome palette.
-   **Framer Motion**:
    -   Ensures clean transitions and list additions for list layouts, adding high-end institutional aesthetics.

---

## ⚙️ Backend Stack: FastAPI, SQLAlchemy 2.0, & Pydantic v2

-   **FastAPI**:
    -   *Async Execution*: Supports non-blocking operations for parallel resume uploads and rule evaluation stress runs.
    -   *Auto-Documentation*: Generates interactive OpenAPI/Swagger documentations (`/docs`) out of the box, making it simple to inspect database states and API endpoints.
-   **SQLAlchemy 2.0 (Async)**:
    -   Features modern type hints, async execution, and relationship loading (e.g., loading candidate qualifications and experiences in a single query via `selectinload`), preventing N+1 query bugs.
-   **Pydantic v2**:
    -   Handles validation for request payloads and JSON structures (used heavily by the rule engine condition traces). Pydantic v2 is compiled in Rust, which makes response serialization extremely fast.

---

## 💾 Database Selection: SQLite with WAL (Write-Ahead Logging)

For the initial institutional release (local-first testing), **SQLite** was selected over heavy database servers:
-   **Zero Configuration**: Requires no server setup, daemon processes, or cloud subscriptions, facilitating seamless offline usage.
-   **WAL Connection Hook**:
    ```python
    @event.listens_for(Engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()
    ```
    -   *WAL Mode*: Write-Ahead Logging allows concurrent async reads to execute even while write transactions are active.
    -   *Synchronous=NORMAL*: Optimizes write transactions to disk, resolving database locking errors under concurrent stress testing (500 candidate checks at 27 evaluations/sec).

---

## 🛡️ QA Resiliency: Nested Savepoints & Fallback Parsers

-   **Nested Transactions (`db.begin_nested()`)**:
    -   Protects multi-file upload batches. If file #3 of 5 fails parsing, SQLAlchemy rolls back *only* the database inserts for file #3, while successfully committing files 1, 2, 4, and 5.
-   **MIME Fallback & Signature Checks**:
    -   Ensures resume uploads are compatible across macOS, Windows, and Linux by using file header signature checks (`%PDF` / `PK\x03\x04`) when native OS `libmagic` databases are missing.
