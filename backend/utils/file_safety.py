"""File safety utilities — MIME validation, filename sanitization, hash computation."""

import hashlib
import re
import unicodedata
import uuid

import magic


ALLOWED_MIME_TYPES = {
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
}


def validate_mime_type(file_content: bytes) -> str | None:
    """Validate file MIME type via magic bytes. Returns MIME type or None if invalid."""
    detected = magic.from_buffer(file_content, mime=True)
    if detected in ALLOWED_MIME_TYPES:
        return detected
    return None


def get_extension_for_mime(mime_type: str) -> str:
    """Get file extension for a given MIME type."""
    return ALLOWED_MIME_TYPES.get(mime_type, ".bin")


def sanitize_filename(filename: str) -> str:
    """Sanitize a filename — strip path traversal, special chars, limit length."""
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


def generate_stored_filename(mime_type: str) -> str:
    """Generate a UUID-based filename for disk storage."""
    ext = get_extension_for_mime(mime_type)
    return f"{uuid.uuid4()}{ext}"


def compute_file_hash(content: bytes) -> str:
    """Compute SHA-256 hex digest of file content."""
    return hashlib.sha256(content).hexdigest()
