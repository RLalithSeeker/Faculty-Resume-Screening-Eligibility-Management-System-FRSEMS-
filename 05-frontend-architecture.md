# 05 — Frontend Architecture

---

## Technology Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5.x |
| Styling | Tailwind CSS v4 |
| Components | Shadcn UI (Radix primitives) |
| Animation | Framer Motion ≥11 |
| Data Table | TanStack React Table v8 |
| HTTP | Axios ≥1.7 |
| Charts | Recharts ≥2.12 |
| Icons | Lucide React |
| Font | Inter (Google Fonts) |

---

## Design System

### Color Palette (Slate/Monochrome + Accent)

```css
:root {
    /* Core */
    --background: 0 0% 98%;          /* Near-white page bg */
    --foreground: 222 47% 11%;       /* Slate 950 — primary text */
    --card: 0 0% 100%;               /* White card surfaces */
    --card-foreground: 222 47% 11%;

    /* Muted */
    --muted: 210 40% 96%;            /* Slate 100 */
    --muted-foreground: 215 16% 47%; /* Slate 500 */

    /* Accent */
    --primary: 217 91% 60%;          /* Blue 500 — CTAs */
    --primary-foreground: 0 0% 100%;

    /* Semantic */
    --success: 142 71% 45%;          /* Emerald 500 */
    --warning: 38 92% 50%;           /* Amber 500 */
    --destructive: 0 84% 60%;        /* Red 500 */

    /* Border & Ring */
    --border: 214 32% 91%;           /* Slate 200 */
    --ring: 217 91% 60%;

    /* Radius */
    --radius: 0.75rem;
}
```

### Typography

- **Font Family**: Inter (variable weight)
- **Headings**: `font-semibold tracking-tight`
- **Body**: `font-normal text-sm` (14px base)
- **Mono**: `font-mono text-xs` for code/traces

### Status Chips

| Status | Color | Icon |
|---|---|---|
| `eligible` | Green (success) | CheckCircle |
| `not_eligible` | Red (destructive) | XCircle |
| `manual_review` | Amber (warning) | AlertTriangle |
| `pending` | Slate (muted) | Clock |
| `pursuing` | Blue (primary) | Loader |
| `completed` | Green (success) | GraduationCap |

---

## Page Routing

```
/                       → Dashboard (Screen 1)
/upload                 → Upload Resumes (Screen 2)
/candidates             → Candidates List (Screen 3)
/candidates/[id]        → Candidate Detail (Screen 4)
/evaluations            → Eligibility Evaluation (Screen 5)
/review                 → Manual Review Queue (Screen 6)
/rules                  → Rules Management (Screen 7)
/rules/new              → Create Rule Wizard (Screen 8)
/rules/[id]/edit        → Edit Rule Wizard (Screen 8 variant)
/specializations        → Specialization Management (Screen 9)
```

---

## Layout Structure

```
┌────────────────────────────────────────────────┐
│ ┌──────────┐ ┌───────────────────────────────┐ │
│ │          │ │  Header (page title + actions) │ │
│ │          │ ├───────────────────────────────┤ │
│ │ Sidebar  │ │                               │ │
│ │  (240px) │ │    <PageTransition>           │ │
│ │          │ │      {children}               │ │
│ │  • Logo  │ │    </PageTransition>          │ │
│ │  • Nav   │ │                               │ │
│ │  • Links │ │                               │ │
│ │          │ │                               │ │
│ └──────────┘ └───────────────────────────────┘ │
└────────────────────────────────────────────────┘
```

### Sidebar Navigation Items

| Label | Icon | Route |
|---|---|---|
| Dashboard | LayoutDashboard | `/` |
| Upload | Upload | `/upload` |
| Candidates | Users | `/candidates` |
| Evaluations | ClipboardCheck | `/evaluations` |
| Review Queue | AlertTriangle | `/review` |
| Rules | Scale | `/rules` |
| Specializations | BookOpen | `/specializations` |

---

## Framer Motion Configuration

### Page Transition Wrapper

Every page is wrapped in `<PageTransition>`:

```typescript
const pageVariants = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -12 },
};

const pageTransition = {
    duration: 0.25,
    ease: [0.25, 0.1, 0.25, 1],
};
```

### Micro-Animations

| Element | Animation |
|---|---|
| Metric Cards | `scale(0.95) → scale(1)` on mount, staggered 50ms |
| Table Rows | `opacity: 0 → 1` staggered 30ms |
| Status Chips | `scale(0) → scale(1)` spring animation |
| Sidebar hover | `x: 0 → x: 4` translateX nudge |
| Upload progress | `width: 0% → width: N%` spring |
| Donut chart | Arc draw animation on mount |

---

## Screen Component Breakdown

### Screen 1 — Dashboard (`/`)
- `MetricCard` × 4: Total Resumes, Eligible, Not Eligible, Manual Review
- `DonutChart`: PhD Status distribution (Recharts PieChart)
- `RecentActivity`: Latest upload/evaluation feed

### Screen 2 — Upload (`/upload`)
- `Dropzone`: react-dropzone styled with dashed border, accepts PDF/DOCX
- `UploadProgress`: Per-file card showing status: `Uploading → Extracting Text → Completed/Failed`

### Screen 3 — Candidates List (`/candidates`)
- `CandidatesTable`: TanStack React Table with:
    - Global search bar
    - Column filters (status, PhD status, department)
    - Sticky header
    - Sortable columns
    - Pagination
- `StatusChip`: Colored badge for eligibility status

### Screen 4 — Candidate Detail (`/candidates/[id]`)
- Two-column layout:
    - **Left (60%)**: `ResumePreview` — iframe rendering the uploaded PDF
    - **Right (40%)**: Stacked sections:
        - `PersonalSection` — name, email, phone, designation (editable)
        - `QualificationSection` — UG/PG/PhD cards with original + normalized values
        - `ExperienceSection` — work history timeline
- `EditDialog` — Modal with form fields + required `reviewer_comment` textarea
- `EvaluateButton` — Triggers re-evaluation

### Screen 5 — Eligibility Evaluation (`/evaluations`)
- `EvaluationMatrix`: Grid/table showing candidates × rules
    - Each cell shows pass/fail with expandable trace
- `TraceViewer`: Accordion showing each condition's expected vs actual

### Screen 6 — Manual Review Queue (`/review`)
- Filtered CandidatesTable where `eligibility_status = 'manual_review'`
- Shows `review_reason` column
- Action buttons: View Detail, Override Status

### Screen 7 — Rules Management (`/rules`)
- `RuleCard` list: name, department, priority, active/inactive toggle
- Create New Rule button → navigates to `/rules/new`

### Screen 8 — Create/Edit Rule (`/rules/new`)
- `RuleWizard`: 3-step form:
    1. `StepDetails` — Name, description, department, priority, logic operator
    2. `StepConditions` — Add/remove conditions (field, operator, value)
    3. `StepReview` — Summary of all fields + submit

### Screen 9 — Specialization Management (`/specializations`)
- `SpecTable`: List of specializations with department, allied flag
- `AliasManager`: Inline list of aliases per specialization, add/remove

---

## Data Fetching Strategy

All data fetching via custom hooks using Axios:
- `useDashboard()` — GET `/api/dashboard/summary`
- `useCandidates(filters)` — GET `/api/candidates`
- `useCandidate(id)` — GET `/api/candidates/{id}`
- `useRules()` — GET `/api/rules`
- `useSpecializations()` — GET `/api/specializations`
- `useUpload()` — POST `/api/resumes/upload` with progress tracking

Hooks use `useState` + `useEffect` for simplicity (no React Query needed for MVP).

---

## Responsive Breakpoints

| Breakpoint | Layout |
|---|---|
| `≥1024px` | Sidebar + main content |
| `768-1023px` | Collapsed sidebar (icons only) + main content |
| `<768px` | Hamburger menu + full-width content |

Candidate detail two-column layout stacks vertically below 1024px.
