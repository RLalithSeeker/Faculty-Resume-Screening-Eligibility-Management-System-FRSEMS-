"""Scanned document detection heuristic."""

from config import settings


def is_scanned_document(text: str, file_size: int) -> bool:
    """
    Detect if a document is likely a scanned image by comparing
    extracted text length to file size.

    A normal text PDF has a high text-to-size ratio.
    A scanned PDF has almost no extractable text relative to its size.
    """
    if file_size == 0:
        return True

    text_stripped = text.strip()
    if len(text_stripped) == 0:
        return True

    ratio = len(text_stripped) / file_size
    return ratio < settings.SCANNED_THRESHOLD
