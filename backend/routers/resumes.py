"""Resume upload router — multi-file upload with MIME validation, SHA-256 dedup, and processing pipeline."""

import os
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, Form
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import get_db
from models.resume import Resume, ResumeStatus
from models.candidate import Candidate, EligibilityStatus, Qualification, Experience
from schemas.resume import ResumeResponse, ResumeUploadResponse
from services.document_processor import extract_text
from services.data_extractor import extract_data
from services.normalizer import normalize_field
from services.duplicate_detector import check_duplicate
from utils.file_safety import (
    validate_mime_type,
    sanitize_filename,
    generate_stored_filename,
    compute_file_hash,
)
from utils.scanned_detector import is_scanned_document

router = APIRouter()


@router.post("/upload", response_model=ResumeUploadResponse)
async def upload_resumes(
    files: list[UploadFile] = File(...),
    batch_name: str | None = Form(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload one or more resume files (PDF/DOCX).
    Pipeline: validate → dedup → save → extract → normalize → create candidate.
    """
    processed_resumes = []
    duplicates = []

    for file in files:
        try:
            # 1. Read file content
            content = await file.read()

            if len(content) > settings.MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=413,
                    detail=f"File {file.filename} exceeds maximum size of {settings.MAX_FILE_SIZE // (1024*1024)}MB"
                )

            # 2. Validate MIME type via magic bytes
            mime_type = validate_mime_type(content)
            if not mime_type:
                raise HTTPException(
                    status_code=415,
                    detail=f"File {file.filename} has unsupported format. Only PDF and DOCX are accepted."
                )

            # 3. Compute SHA-256 hash
            file_hash = compute_file_hash(content)

            # 4. Check for duplicates
            existing = await check_duplicate(file_hash, db)
            if existing:
                duplicates.append({
                    "filename": file.filename,
                    "existing_candidate_id": existing.candidate_id,
                    "file_hash": file_hash,
                })
                continue

            # 5. Sanitize filename and generate storage name
            safe_name = sanitize_filename(file.filename or "unnamed")
            stored_name = generate_stored_filename(mime_type)
            file_path = os.path.join(settings.UPLOAD_DIR, stored_name)

            # 6. Save file to disk
            with open(file_path, "wb") as f:
                f.write(content)

            # 7. Create resume record
            resume = Resume(
                original_filename=safe_name,
                stored_filename=stored_name,
                file_hash=file_hash,
                file_size=len(content),
                mime_type=mime_type,
                status=ResumeStatus.EXTRACTING_TEXT,
                batch_name=batch_name,
            )
            db.add(resume)
            await db.flush()

            # 8. Extract text
            try:
                text = extract_text(file_path, mime_type)
                resume.raw_text = text
            except Exception as e:
                resume.status = ResumeStatus.FAILED
                resume.error_message = f"Text extraction failed: {str(e)}"
                processed_resumes.append(resume)
                continue

            # 9. Check if scanned
            if is_scanned_document(text, len(content)):
                resume.is_scanned = True
                # Still try to create a candidate with what we have

            # 10. Extract structured data
            resume.status = ResumeStatus.EXTRACTING_DATA
            extracted = extract_data(text)

            # 11. Create candidate
            candidate = Candidate(
                name=extracted.name or f"Unknown ({safe_name})",
                email=extracted.email,
                phone=extracted.phone,
                current_designation=extracted.current_designation,
                current_institution=extracted.current_institution,
                total_experience_years=extracted.total_experience_years,
                phd_status=extracted.phd_status,
            )

            # If scanned or has review reasons → manual review
            if resume.is_scanned:
                candidate.eligibility_status = EligibilityStatus.MANUAL_REVIEW
                candidate.review_reason = "Scanned document detected — text extraction unreliable"
            elif extracted.review_reasons:
                candidate.eligibility_status = EligibilityStatus.MANUAL_REVIEW
                candidate.review_reason = "; ".join(extracted.review_reasons)
            else:
                candidate.eligibility_status = EligibilityStatus.PENDING

            db.add(candidate)
            await db.flush()

            # 12. Create qualifications
            for qual in extracted.qualifications:
                # Normalize field
                field_normalized, is_allied = await normalize_field(qual.field_original, db)

                q = Qualification(
                    candidate_id=candidate.id,
                    level=qual.level,
                    degree_original=qual.degree_original,
                    degree_normalized=qual.degree_normalized,
                    field_original=qual.field_original,
                    field_normalized=field_normalized,
                    institution=qual.institution,
                    year_of_completion=qual.year_of_completion,
                    is_allied=is_allied,
                )
                db.add(q)

            # 13. Create experiences
            for exp in extracted.experiences:
                e = Experience(
                    candidate_id=candidate.id,
                    designation=exp.designation,
                    institution=exp.institution,
                    start_year=exp.start_year,
                    end_year=exp.end_year,
                    is_teaching=exp.is_teaching,
                )
                db.add(e)

            # 14. Link resume to candidate
            resume.candidate_id = candidate.id
            resume.status = ResumeStatus.COMPLETED

            processed_resumes.append(resume)

        except HTTPException:
            raise
        except Exception as e:
            # If we created a resume record, mark it as failed
            if 'resume' in locals() and resume:
                resume.status = ResumeStatus.FAILED
                resume.error_message = str(e)
                processed_resumes.append(resume)

    await db.flush()

    return ResumeUploadResponse(
        message=f"Processed {len(processed_resumes)} file(s), {len(duplicates)} duplicate(s) skipped",
        resumes=[ResumeResponse.model_validate(r) for r in processed_resumes],
        duplicates=duplicates,
    )


@router.get("", response_model=list[ResumeResponse])
async def list_resumes(
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """List all uploaded resumes, optionally filtered by status."""
    from sqlalchemy import select

    stmt = select(Resume).order_by(Resume.created_at.desc())
    if status:
        stmt = stmt.where(Resume.status == status)

    result = await db.execute(stmt)
    resumes = result.scalars().all()
    return [ResumeResponse.model_validate(r) for r in resumes]
