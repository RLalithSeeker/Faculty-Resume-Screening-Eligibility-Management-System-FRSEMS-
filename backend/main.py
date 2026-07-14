"""
FRSEMS Backend — FastAPI Application Entry Point
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import settings
from database import init_db
from routers import resumes, candidates, evaluation, rules, specializations, dashboard, export


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle."""
    await init_db()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

# CORS — allow frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded files for preview
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Register routers
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(resumes.router, prefix="/api/resumes", tags=["Resumes"])
app.include_router(candidates.router, prefix="/api/candidates", tags=["Candidates"])
app.include_router(evaluation.router, prefix="/api/candidates", tags=["Evaluation"])
app.include_router(rules.router, prefix="/api/rules", tags=["Rules"])
app.include_router(specializations.router, prefix="/api/specializations", tags=["Specializations"])
app.include_router(export.router, prefix="/api/export", tags=["Export"])


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "app": settings.APP_NAME, "version": settings.APP_VERSION}
