"""Regex-based data extraction from resume text."""

import re
from dataclasses import dataclass, field


# --- Degree pattern map ---
DEGREE_PATTERNS: dict[str, str] = {
    r'\b(B\.?\s*Tech\.?|Bachelor\s+of\s+Technology|Bachelor\s+of\s+Engineering)\b': 'B.Tech.',
    r'\b(M\.?\s*Tech\.?|Master\s+of\s+Technology|Master\s+of\s+Engineering)\b': 'M.Tech.',
    r'\b(B\.?\s*E\.?)\b': 'B.E.',
    r'\b(M\.?\s*E\.?)\b': 'M.E.',
    r'\b(B\.?\s*Sc\.?|Bachelor\s+of\s+Science)\b': 'B.Sc.',
    r'\b(M\.?\s*Sc\.?|Master\s+of\s+Science)\b': 'M.Sc.',
    r'\b(B\.?\s*A\.?|Bachelor\s+of\s+Arts)\b': 'B.A.',
    r'\b(M\.?\s*A\.?|Master\s+of\s+Arts)\b': 'M.A.',
    r'\b(MBA|M\.?\s*B\.?\s*A\.?)\b': 'MBA',
    r'\b(Ph\.?\s*D\.?|Doctor\s+of\s+Philosophy|Doctorate)\b': 'Ph.D.',
    r'\b(B\.?\s*Com\.?|Bachelor\s+of\s+Commerce)\b': 'B.Com.',
    r'\b(M\.?\s*Com\.?|Master\s+of\s+Commerce)\b': 'M.Com.',
    r'\b(BBA)\b': 'BBA',
    r'\b(BCA)\b': 'BCA',
    r'\b(MCA)\b': 'MCA',
}

# Degree level classification
UG_DEGREES = {'B.Tech.', 'B.E.', 'B.Sc.', 'B.A.', 'B.Com.', 'BBA', 'BCA'}
PG_DEGREES = {'M.Tech.', 'M.E.', 'M.Sc.', 'M.A.', 'M.Com.', 'MBA', 'MCA'}
PHD_DEGREES = {'Ph.D.'}

# Regex patterns
EMAIL_PATTERN = re.compile(r'[\w.+-]+@[\w-]+\.[\w.]+')
PHONE_PATTERN = re.compile(r'[\+]?\d[\d\s\-()]{8,15}\d')
YEAR_PATTERN = re.compile(r'\b(19[7-9]\d|20[0-3]\d)\b')
INSTITUTION_KEYWORDS = re.compile(
    r'\b(University|Institute|College|School|Academy|IIT|NIT|IIIT|BITS)\b',
    re.IGNORECASE
)
FIELD_PATTERN = re.compile(
    r'(?:in|of)\s+([A-Z][a-zA-Z\s&]+?)(?:\s*(?:\(|,|\.|from|at|$))',
    re.IGNORECASE
)

# Experience section headers
EXPERIENCE_HEADERS = re.compile(
    r'^(?:Work\s+)?Experience|Employment\s+History|Professional\s+Experience|Career\s+Summary',
    re.IGNORECASE | re.MULTILINE
)

# Teaching keywords
TEACHING_KEYWORDS = re.compile(
    r'\b(Professor|Lecturer|Teacher|Faculty|Teaching|Instructor|Assistant\s+Professor|Associate\s+Professor)\b',
    re.IGNORECASE
)


@dataclass
class ExtractedQualification:
    level: str  # ug, pg, phd
    degree_original: str
    degree_normalized: str
    field_original: str | None = None
    institution: str | None = None
    year_of_completion: int | None = None


@dataclass
class ExtractedExperience:
    designation: str
    institution: str
    start_year: int | None = None
    end_year: int | None = None
    is_teaching: bool = False


@dataclass
class ExtractedData:
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    qualifications: list[ExtractedQualification] = field(default_factory=list)
    experiences: list[ExtractedExperience] = field(default_factory=list)
    phd_status: str = "not_found"
    current_designation: str | None = None
    current_institution: str | None = None
    total_experience_years: float | None = None
    review_reasons: list[str] = field(default_factory=list)


def extract_data(text: str) -> ExtractedData:
    """Extract structured data from resume text using regex patterns."""
    result = ExtractedData()
    lines = text.strip().split('\n')
    lines = [line.strip() for line in lines if line.strip()]

    if not lines:
        result.review_reasons.append("No text content extracted")
        return result

    # 1. Extract email
    email_match = EMAIL_PATTERN.search(text)
    if email_match:
        result.email = email_match.group()

    # 2. Extract phone
    phone_match = PHONE_PATTERN.search(text)
    if phone_match:
        result.phone = phone_match.group().strip()

    # 3. Extract name — first non-empty line that isn't an email/phone
    for line in lines[:5]:
        if not EMAIL_PATTERN.search(line) and not PHONE_PATTERN.search(line):
            # Clean common prefixes
            name = re.sub(r'^(Dr\.?|Prof\.?|Mr\.?|Mrs\.?|Ms\.?)\s*', '', line, flags=re.IGNORECASE)
            name = name.strip()
            if name and len(name) < 100 and not any(kw in name.lower() for kw in ['resume', 'cv', 'curriculum']):
                result.name = name
                break

    if not result.name:
        result.review_reasons.append("Could not extract candidate name")

    # 4. Extract qualifications
    result.qualifications = _extract_qualifications(text)
    if not result.qualifications:
        result.review_reasons.append("No qualifications found in document")

    # 5. Determine PhD status
    phd_quals = [q for q in result.qualifications if q.level == "phd"]
    if phd_quals:
        # Check for "pursuing" keywords near PhD mention
        phd_context = text.lower()
        pursuing_keywords = ['pursuing', 'ongoing', 'enrolled', 'current', 'expected']
        if any(kw in phd_context for kw in pursuing_keywords):
            result.phd_status = "pursuing"
        else:
            result.phd_status = "completed"
    else:
        result.phd_status = "not_found"

    # 6. Extract experiences
    result.experiences = _extract_experiences(text)

    # 7. Compute total experience
    if result.experiences:
        total_years = 0.0
        for exp in result.experiences:
            if exp.start_year:
                end = exp.end_year or 2026
                total_years += max(0, end - exp.start_year)
        result.total_experience_years = total_years

        # Set current designation/institution from most recent
        latest = max(result.experiences, key=lambda e: e.end_year or 9999)
        result.current_designation = latest.designation
        result.current_institution = latest.institution

    return result


def _extract_qualifications(text: str) -> list[ExtractedQualification]:
    """Extract degree qualifications from text."""
    qualifications = []
    found_degrees = set()

    for pattern, normalized in DEGREE_PATTERNS.items():
        matches = re.finditer(pattern, text, re.IGNORECASE)
        for match in matches:
            if normalized in found_degrees:
                continue
            found_degrees.add(normalized)

            # Determine level
            if normalized in UG_DEGREES:
                level = "ug"
            elif normalized in PG_DEGREES:
                level = "pg"
            elif normalized in PHD_DEGREES:
                level = "phd"
            else:
                continue

            # Extract field — look for "in <field>" near the degree mention
            context = text[max(0, match.start() - 20):min(len(text), match.end() + 150)]
            field_match = FIELD_PATTERN.search(context[match.end() - max(0, match.start() - 20):])
            field_original = field_match.group(1).strip() if field_match else None

            # Extract institution — look for institution keywords nearby
            institution = None
            inst_context = text[max(0, match.start() - 50):min(len(text), match.end() + 300)]
            for line in inst_context.split('\n'):
                if INSTITUTION_KEYWORDS.search(line):
                    institution = line.strip()[:500]
                    break

            # Extract year — look for 4-digit year near degree
            year = None
            year_context = text[max(0, match.start() - 30):min(len(text), match.end() + 100)]
            year_matches = YEAR_PATTERN.findall(year_context)
            if year_matches:
                year = int(year_matches[-1])  # Take the last year (likely completion)

            qualifications.append(ExtractedQualification(
                level=level,
                degree_original=match.group(),
                degree_normalized=normalized,
                field_original=field_original,
                institution=institution,
                year_of_completion=year,
            ))

    return qualifications


def _extract_experiences(text: str) -> list[ExtractedExperience]:
    """Extract work experience entries from text."""
    experiences = []

    # Find experience section
    exp_section_match = EXPERIENCE_HEADERS.search(text)
    if not exp_section_match:
        return experiences

    # Get text from experience section onwards
    exp_text = text[exp_section_match.start():]

    # Split into potential entries using year ranges or dashes
    # Pattern: "2018 - 2022" or "2018 - Present"
    year_range_pattern = re.compile(
        r'(19[7-9]\d|20[0-3]\d)\s*[-–—to]+\s*(19[7-9]\d|20[0-3]\d|[Pp]resent|[Cc]urrent|[Tt]ill\s+[Dd]ate)',
        re.IGNORECASE
    )

    lines = exp_text.split('\n')
    current_entry_lines: list[str] = []
    entries: list[list[str]] = []

    for line in lines[1:]:  # Skip header
        stripped = line.strip()
        if not stripped:
            if current_entry_lines:
                entries.append(current_entry_lines)
                current_entry_lines = []
            continue
        current_entry_lines.append(stripped)

    if current_entry_lines:
        entries.append(current_entry_lines)

    for entry_lines in entries[:10]:  # Cap at 10 entries
        entry_text = ' '.join(entry_lines)

        # Extract year range
        year_match = year_range_pattern.search(entry_text)
        start_year = None
        end_year = None
        if year_match:
            start_year = int(year_match.group(1))
            end_str = year_match.group(2)
            if end_str.lower() in ('present', 'current', 'till date'):
                end_year = None
            else:
                end_year = int(end_str)

        # Extract designation — first line typically
        designation = entry_lines[0] if entry_lines else "Unknown"
        # Clean year info from designation
        designation = year_range_pattern.sub('', designation).strip().rstrip('-–—,')

        # Extract institution
        institution = "Unknown"
        for line in entry_lines:
            if INSTITUTION_KEYWORDS.search(line):
                institution = line.strip()
                break
            # Check second line if no institution keyword
            if len(entry_lines) > 1 and institution == "Unknown":
                institution = entry_lines[1] if not year_range_pattern.search(entry_lines[1]) else "Unknown"

        # Determine if teaching
        is_teaching = bool(TEACHING_KEYWORDS.search(entry_text))

        if designation and designation != "Unknown":
            experiences.append(ExtractedExperience(
                designation=designation[:255],
                institution=institution[:500],
                start_year=start_year,
                end_year=end_year,
                is_teaching=is_teaching,
            ))

    return experiences
