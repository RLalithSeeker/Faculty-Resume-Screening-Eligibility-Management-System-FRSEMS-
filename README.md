# Faculty Resume Screening & Eligibility Management System (FRSEMS)

A full-stack, production-grade web application for university faculty hiring, resume screening, and dynamic eligibility rules evaluation. Custom-tailored for institutional environments like **Woxsen University**.

FRSEMS replaces clunky enterprise applicant tracking systems with a high-end, luxury-style institutional portal featuring smooth transitions, clean typography, an explainable rule engine, and system audit logs.

---

## 🏛️ System Architecture

The application is fully decoupled:
```
                                     ┌────────────────────────┐
                                     │   Next.js 15 Client    │
                                     │      (Port 3000)       │
                                     └───────────┬────────────┘
                                                 │ HTTP Requests
                                                 ▼
                                     ┌────────────────────────┐
                                     │  FastAPI Backend API   │
                                     │      (Port 8000)       │
                                     └───────────┬────────────┘
                                                 │ SQLAlchemy Async
                                                 ▼
                                     ┌────────────────────────┐
                                     │  SQLite DB (WAL Mode)  │
                                     │      (frsems.db)       │
                                     └────────────────────────┘
```

---

## 🌟 Key Features

1.  **Dashboard Screen (Screen 1)**:
    - 6 metrics cards: Total Resumes, Eligible Candidates, Not Eligible Candidates, Manual Review Required, Successfully Processed, Failed Documents.
    - Donut chart depicting candidates by matched rules.
    - Distribution stat grid tracking Ph.D. status (Completed, Pursuing, Not Mentioned, Not Found).
    - Batch upload log summary showing recent runs.
2.  **Upload Resumes (Screen 2)**:
    - Drag & drop zone supporting PDF and DOCX files.
    - Configurable **Batch Name** (stores upload run meta).
    - Multi-file progress bars displaying real-time text extraction and data extraction stages.
3.  **Candidates List Grid (Screen 3)**:
    - TanStack React Table with global search and multi-filtering (Eligibility, Ph.D. status, Matched criteria).
    - **+ Add Candidate** modal form to manually create candidate profiles.
    - CSV and Excel export options.
4.  **Candidate Detail View (Screen 4)**:
    - Two-column view: Iframe PDF viewer / raw extracted text preview.
    - Modular tabs: Personal Info, Qualifications (original vs. normalized), Experience timeline, Extracted Data, Eligibility Result, Review & Comments, Audit Trail.
    - **Smart Comment Requirement**: Reviewers must enter remarks for any edit or status override.
5.  **Explainable Eligibility Evaluation (Screen 5)**:
    - Accordion matrix showcasing condition-by-condition results (UG degree, PG field, PhD completed) side-by-side.
6.  **Manual Review Queue (Screen 6)**:
    - Dedicated queue table for flagged candidate profiles with reasons.
7.  **Create / Edit Rules Wizard (Screen 8)**:
    - 3-step form wizard (Details, Conditions, Review) with Position selector, date pickers (Effective From/To), and logical logic operators (AND/OR).
8.  **Specialization Management (Screen 9)**:
    - Manage canonical terms (e.g. "Computer Science and Engineering") and aliases (e.g. "CSE", "CS") with allied flags and active toggles.
9.  **Audit Logs**:
    - Global audit logs showing all system changes, modified fields, old/new values, and reviewer comments.

---

## 🚀 Installation & Setup

### 1. Backend Setup (FastAPI)
Navigate to `/backend`:
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```
Run the backend:
```bash
python -m uvicorn main:app --reload --port 8000
```
Swagger docs will be served at `http://localhost:8000/docs`.

### 2. Frontend Setup (Next.js 15)
Navigate to `/frontend`:
```bash
cd frontend
npm install
```
Run the frontend:
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## ⚡ Concurrency & Stress Testing
We configured **WAL (Write-Ahead Logging)** mode on SQLite database connection in `backend/database.py` to allow concurrent async read operations.

We wrote and executed a stress test simulating **500 candidate evaluations** running concurrently across **20 async worker tasks**:
- **Total Evaluations**: 500 candidates
- **Average Latency**: 36.69 ms
- **Throughput**: 27.15 candidates/second
- **Errors/Lockouts**: 0 (WAL connection pool resolved locking)

Run stress tests:
```bash
cd backend
python tests/stress_test.py
```

---

## 📤 Push to GitHub

To push this project to your GitHub account:

1. Create a new empty repository on [GitHub](https://github.com).
2. Open your terminal in the root project folder `WORK(1)` and run:
```bash
# Link the local repo to your GitHub remote
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git

# Set default branch to main/master
git branch -M master

# Push all files
git push -u origin master
```
