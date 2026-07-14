# FRSEMS Production Roadmap

This document outlines the transition of the local Faculty Resume Screening & Eligibility Management System (FRSEMS) to a secure, cloud-native production architecture with Authentication (JWT), Managed Database (PostgreSQL), and Cloud Storage (S3/R2).

---

## 🏛️ Proposed Production Stack

- **Authentication**: Custom JWT/OAuth2 flow built directly into the FastAPI backend (with a secure `User` database table) to keep it decoupled and avoid third-party pricing plans (like Clerk/Auth0).
- **Database**: Serverless PostgreSQL (such as Neon or Railway Postgres) replacing the local SQLite `frsems.db`.
- **Storage**: Cloudflare R2 or AWS S3 (using the `boto3` library) to store resume files, replacing the local `backend/uploads` directory.
- **Hosting**:
  - Frontend: Next.js hosted on Vercel.
  - Backend: FastAPI hosted on Railway, Render, or self-hosted via Coolify on a VPS.

---

## 🛠️ Step-by-Step Transition

### Phase 1: Authentication Layer (JWT)
1.  **Backend User Table**: Define a `User` model with `email`, `hashed_password`, and `role` (Admin, Reviewer).
2.  **Token Generation**: Set up JWT authentication endpoints `/api/auth/register` and `/api/auth/login` using `pyjwt` and `passlib[bcrypt]` for password hashing.
3.  **Role Guards**: Secure API routers (Candidates, Rules, Resumes) by adding a `get_current_user` dependency guard to block unauthorized actions.
4.  **Frontend Authentication**: Build a dark-mode monochrome login card at `/login` and configure Axios interceptors in `frontend/src/lib/api.ts` to automatically attach the JWT token from `localStorage` to all request headers.

### Phase 2: PostgreSQL Database Integration
1.  Add `asyncpg` to the backend dependencies.
2.  Update `backend/database.py` connection URL to load a PostgreSQL string (`postgresql+asyncpg://...`) from the environment.
3.  Enable database migrations using Alembic for schema versioning in production.

### Phase 3: Cloud Storage Integration (S3 / Cloudflare R2)
1.  Add `boto3` to the backend dependencies.
2.  Create `backend/services/storage.py` to handle cloud storage operations.
3.  Modify `backend/routers/resumes.py` to stream uploads directly to the S3 bucket rather than writing to disk.
4.  Modify candidate detail views to retrieve secure, temporary presigned preview URLs for PDFs instead of loading static local paths.
