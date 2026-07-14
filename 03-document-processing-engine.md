# 03 — Document Processing Engine

---

## Pipeline Overview

```
File Upload
    │
    ▼
┌──────────────────┐
│ 1. MIME Validate  │ ← Magic bytes check (PDF/DOCX only)
│ 2. Sanitize Name  │ ← Strip path traversal, special chars
│ 3. SHA-256 Hash    │ ← Compute before saving
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 4. Dedup Check    │ ← If hash exists → return existing candidate link
└────────┬─────────┘
         │ (new file)
         ▼
┌──────────────────┐
│ 5. Save to Disk   │ ← UUID-based filename in uploads/
│    Status: uploading → extracting_text
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 6. Extract Text   │ ← PyMuPDF (PDF) or python-docx (DOCX)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 7. Scanned Check  │ ← len(text) / file_size < 0.01?
│                    │   YES → flag is_scanned, status: manual_review
│                    │   NO  → continue
└────────┬─────────┘
         │
         ▼
┌──────────────────────────┐
│ 8. Extract Fields         │ ← Regex patterns for structured data
│    Status: extracting_data │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────┐
│ 9. Normalize      │ ← Map to canonical tokens via alias table
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 10. Create Records│ ← Candidate + Qualifications + Experience
│     Status: completed (or manual_review if uncertain)
└──────────────────┘
```

---

## Step Details

### 1. MIME Type Validation

Use `python-magic-bin` to read the first bytes and verify:
- PDF: magic bytes `%PDF`
- DOCX: magic bytes `PK` (ZIP container with `[Content_Types].xml`)

**Reject** any file that doesn't match `application/pdf` or `application/vnd.openxmlformats-officedocument.wordprocessingml.document`.

### 2. Filename Sanitization

```python
import re
import unicodedata

def sanitize_filename(filename: str) -> str:
    # Normalize unicode
    filename = unicodedata.normalize("NFKD", filename)
    # Remove path components
    filename = filename.replace("\\", "/").split("/")[-1]
    # Keep only safe characters
    filename = re.sub(r'[^\w\s\-.]', '', filename)
    # Collapse whitespace
    filename = re.sub(r'\s+', '_', filename.strip())
    # Limit length
    return filename[:200] if filename else "unnamed"
```

### 3. SHA-256 Hash

Compute hash from raw file bytes **before** writing to disk:
```python
import hashlib

def compute_file_hash(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()
```

### 4. Duplicate Detection

Query `resumes` table for matching `file_hash`:
- If found → return HTTP 409 with existing `candidate_id`
- If not found → proceed

### 5. Text Extraction

**PDF (PyMuPDF):**
```python
import fitz  # PyMuPDF

def extract_pdf_text(file_path: str) -> str:
    doc = fitz.open(file_path)
    text = ""
    for page in doc:
        text += page.get_text()
    doc.close()
    return text
```

**DOCX (python-docx):**
```python
from docx import Document

def extract_docx_text(file_path: str) -> str:
    doc = Document(file_path)
    return "\n".join([para.text for para in doc.paragraphs])
```

### 6. Scanned Document Detection

Heuristic: if extracted text is disproportionately short relative to file size, it's likely a scanned image.

```python
SCANNED_THRESHOLD = 0.01  # characters per byte

def is_scanned_document(text: str, file_size: int) -> bool:
    if file_size == 0:
        return True
    ratio = len(text.strip()) / file_size
    return ratio < SCANNED_THRESHOLD
```

If scanned:
- Set `resume.is_scanned = True`
- Set `candidate.eligibility_status = 'manual_review'`
- Set `candidate.review_reason = 'Scanned document detected — text extraction unreliable'`

### 7. Regex-Based Field Extraction

| Field | Pattern Strategy |
|---|---|
| **Name** | First non-empty line, or line before first email/phone |
| **Email** | `r'[\w.+-]+@[\w-]+\.[\w.]+'` |
| **Phone** | `r'[\+]?\d[\d\s\-()]{8,15}'` |
| **Degrees** | Match patterns like "B.Tech", "M.Tech", "Ph.D", "Bachelor of", "Master of" |
| **Fields/Specializations** | Text following degree keywords: "in Computer Science", "in CSE" |
| **Institutions** | Lines containing "University", "Institute", "College", "School" |
| **Years** | 4-digit numbers (1970-2030) near degree/institution context |
| **Experience** | Sections with "Experience", "Employment", "Work History" headers |

**Degree Pattern Map:**
```python
DEGREE_PATTERNS = {
    r'\b(B\.?\s*Tech|B\.?\s*E\.?|Bachelor\s+of\s+Technology|Bachelor\s+of\s+Engineering)\b': 'B.Tech.',
    r'\b(M\.?\s*Tech|M\.?\s*E\.?|Master\s+of\s+Technology|Master\s+of\s+Engineering)\b': 'M.Tech.',
    r'\b(B\.?\s*Sc|Bachelor\s+of\s+Science)\b': 'B.Sc.',
    r'\b(M\.?\s*Sc|Master\s+of\s+Science)\b': 'M.Sc.',
    r'\b(B\.?\s*A\.?|Bachelor\s+of\s+Arts)\b': 'B.A.',
    r'\b(M\.?\s*A\.?|Master\s+of\s+Arts)\b': 'M.A.',
    r'\b(MBA|M\.?\s*B\.?\s*A\.?)\b': 'MBA',
    r'\b(Ph\.?\s*D\.?|Doctor\s+of\s+Philosophy|Doctorate)\b': 'Ph.D.',
    r'\b(B\.?\s*Com|Bachelor\s+of\s+Commerce)\b': 'B.Com.',
    r'\b(M\.?\s*Com|Master\s+of\s+Commerce)\b': 'M.Com.',
    r'\b(BBA|B\.?\s*B\.?\s*A\.?)\b': 'BBA',
    r'\b(BCA)\b': 'BCA',
    r'\b(MCA)\b': 'MCA',
}
```

### 8. Normalization

After extraction, normalize field names using the `specialization_aliases` table:
1. Take `field_original` (e.g., "Info Security")
2. Query `specialization_aliases` for matching alias (case-insensitive)
3. If found → set `field_normalized` to the canonical `specialization.name`
4. Also set `is_allied` from the specialization record
5. If not found → keep `field_original`, set `field_normalized = NULL`, flag for review

### 9. Confidence & Manual Review Triggers

Flag for `manual_review` if ANY of these are true:
- Name could not be extracted
- No degree found at any level
- Scanned document detected
- Field normalization failed (no alias match)
- Ph.D. status ambiguous (text mentions "pursuing" and "completed" both)

---

## File Storage

- All uploads stored in `backend/uploads/` directory
- Stored with UUID-based filenames: `{uuid4}.{extension}`
- Original filename preserved in `resumes.original_filename`
- Directory is gitignored
