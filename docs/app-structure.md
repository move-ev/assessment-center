# Application Structure

This document defines the route hierarchy, module layout, and tRPC router
structure for the Assessment Center tool. It is the authoritative reference
for how the application is organised.

---

## User Roles

| Role | Who | Access |
|---|---|---|
| **Admin** | Any system user with `role = "admin"` (managed via better-auth) | Full access to all ACs: setup, live overview, results |
| **Reviewer** | A system User assigned as reviewer within a specific AC | Review workspace only |

Admin is a **global role** granted via the better-auth admin plugin (`User.role = "admin"`).
Admins have access to every Assessment Center in the system.

Reviewer access is **contextual per AC**: a user is a reviewer for AC #1 if a `Reviewer`
record links their `User` to that AC.

---

## Assessment Center Lifecycle

```
DRAFT ──► ACTIVE ──► COMPLETED ──► ANONYMIZED
             ▲           │
             └───────────┘ reopen
```

| Status | Meaning | What is available |
|---|---|---|
| `DRAFT` | Being set up | Setup flow (admin only) |
| `ACTIVE` | AC is running, participants are on-site | Reviewer workspace; live overview (admin) |
| `COMPLETED` | AC has ended | Results/evaluation (admin); reviewers can still edit ratings |
| `ANONYMIZED` | Personal data removed after the AC (irreversible) | Read-only results (admin only); hidden from reviewers |

Anonymizing replaces participant and group names with pseudonyms, clears
contact fields and rating notes, deletes free-text ratings, group
observations and soft-deleted participants. Quantitative ratings and the AC structure stay for
cohort comparisons. Admins can also delete an AC completely in any status
(e.g. demos); `isDemo` marks ACs to leave out of comparisons.

Status is stored on `AssessmentCenter` and gates access within each section.

Scores are percentages, as in the assessment matrix
(`src/modules/evaluation/server/scoring.ts`): per reviewer and task,
100 × Σ(stars × weight) ÷ Σ(scale maximum × weight) over the criteria that
reviewer rated; per task, the mean of the reviewers' percentages; overall, the
mean of the task percentages weighted by `scoreWeight`. The app shows whole
percent, except the criteria tab (star averages per criterion); the export
shows one decimal.

Sonderfall 1 (`deviation.ts`): if at least two reviewers have each rated a
scored criterion of a task and their percentages differ by more than 7
percentage points (highest minus lowest), the person
is marked in the ranking; the detail page shows the spread per task and which
task triggers the mark.

Sonderfall 2 (`ranking.ts`, `rankParticipants`): the ranking orders by the
whole percent shown; on equal whole percent the person without Sonderfall 1
comes first, then the exact value decides and is shown with one decimal for
those people. Results identical in exact value and Sonderfall-1 status share
a rank (1, 2, 2, 4) and the 15 % mark of the better position. Ranking, detail page, export, distribution and heat
map all show this rank.

Result charts are server-rendered HTML/CSS on the tokens `--series-*`
(categorical) and `--heat-*` (sequential) in `globals.css`; only the task
scatter is a client-side SVG, since the viewer picks its tasks. The results page
shows the distribution of overall scores, a heat map (fixed 10-point bands from
50 %), each overall score split into weighted task shares (`comparison.ts`) and
a task scatter. The detail page compares the person with the AC (range, mean,
position; per task, ties share a position; overall, the ranking's rank), shows reviewers as dots per task and every
reviewer's stars per criterion with the written feedback. The calibration tab
(`calibration.ts`) compares each reviewer only with others who rated the same
person in the same task, and ranks criteria by the mean star distance between
two reviewers; it is a calibration aid, not an assessment of reviewers.

---

## Route Hierarchy

```
/auth                                             Login page

/ (protected layout — auth guard)
│
├── /dashboard                                    Role-sensitive landing page
│
├── /ressorts                                     Admin: ressorts shared by all ACs
│
└── /assessment-centers
    ├── /new                                      Create a new AC
    │
    └── /[id]                                     AC root (loads AC context)
        │
        ├── /setup                                Admin: setup hub
        │   ├── /details                          Name, description, dates, status
        │   ├── /participants                     Add / edit / remove participants
        │   ├── /groups                           Create groups, assign participants
        │   ├── /tasks                            Manage tasks
        │   │   └── /[taskId]                     Task detail: name, type, criteria editor
        │   ├── /schedule                         Assign groups to days + tasks (with order)
        │   ├── /reviewers                        Add reviewers (assign User as Reviewer)
        │   └── /assignments                      Assign reviewers to participants per task
        │
        ├── /overview                             Admin: live completion matrix (ACTIVE only)
        │
        ├── /results                              Admin (COMPLETED, ANONYMIZED), reviewers of the AC read-only (COMPLETED)
        │   ├── /[participantId]                  One participant in detail (same access)
        │   │                                     Tab "Ressorts": planned numbers per ressort (admins edit)
        │   └── /compare?ids=a,b,c                2–3 participants side by side (same access)
        │
        └── /review                               Reviewer: workspace root
            └── /[taskId]                         Reviewer: participant list for this task
                └── /[participantId]              Reviewer: criteria entry form
```

### Route notes

- `/assessment-centers/[id]` redirects based on role and AC status:
  - Admin + DRAFT → `/setup/details`
  - Admin + ACTIVE → `/overview`
  - Admin + COMPLETED or ANONYMIZED → `/results`
  - Reviewer → `/review`; for an ANONYMIZED AC → `/dashboard` (hidden from reviewers)
- `/setup` redirects to `/setup/details`
- Access to `/setup` is blocked for non-admins and non-DRAFT status (with a
  guard in the layout that allows read-only viewing once ACTIVE/COMPLETED).
- Access to `/overview` is blocked for non-admins and redirects to `/results`
  once the AC is ANONYMIZED.
- `/results` (ranking, detail pages, comparison) follows `getResultsAccess`
  (`src/lib/results-access.ts`): admins once COMPLETED or ANONYMIZED; the AC's
  reviewers read-only once COMPLETED (not while rating runs, not after
  anonymizing). Export and every change stay with admins. Layout and every
  page call `requireResultsAccess` (`src/server/ac-role.ts`), since Next.js
  renders layouts and pages in parallel.
- `/ressorts` redirects non-admins to `/dashboard`. Ressorts are shared by all
  ACs; one is deleted only while no AC has numbers for it. How many people a
  ressort has (registered, active) and should admit is kept per AC in the
  results tab "Ressorts", including after anonymizing.
- Removing a reviewer, a task or an assignment is refused while submitted
  ratings exist (deleting assignments would cascade to the ratings).
- Access to `/review` is blocked for users who are not assigned as a
  Reviewer within that AC.

---

## Setup Step Ordering & Prerequisites

The setup hub (`/setup`) displays a checklist. Steps can be navigated freely
but the UI reflects prerequisites via disabled states and warning indicators.

```
1. Details          → always available
2. Participants     → always available
3. Groups           → requires: at least 1 participant
4. Tasks            → always available
5. Schedule         → requires: at least 1 group, 1 task, 1 day (from Details)
6. Reviewers        → always available
7. Assignments      → requires: at least 1 participant, 1 task, 1 reviewer
```

The AC can only be set to `ACTIVE` once all required steps are complete.
"Complete" means non-empty: at least one item saved in each step.

---

## Module Structure

Each module owns the UI and component logic for one feature area. Pages in
`src/app/` are thin — they import from modules and render. No business logic
lives in page files.

```
src/modules/
│
├── auth/                          (existing)
│   ├── components/
│   │   ├── auth-content.tsx
│   │   ├── auth-layout.tsx
│   │   ├── auth-microsoft-login.tsx
│   │   └── index.ts
│   └── index.ts
│
├── dashboard/
│   ├── components/
│   │   ├── dashboard-layout.tsx       Sidebar/header shell for all protected pages
│   │   ├── dashboard-ac-list.tsx      Role-sensitive list of ACs
│   │   ├── dashboard-ac-card.tsx      Single AC card with status badge
│   │   └── index.ts
│   └── index.ts
│
├── assessment-center/
│   ├── components/
│   │   ├── ac-create-form.tsx         Multi-step creation form (/new)
│   │   ├── ac-header.tsx              AC name, status badge, breadcrumb
│   │   ├── ac-nav.tsx                 Tab/sidebar nav within an AC
│   │   ├── ac-status-gate.tsx         Renders children only for allowed statuses
│   │   ├── ac-setup-hub.tsx           Setup overview with step checklist
│   │   ├── ac-details-form.tsx        Name, description, dates, status transition
│   │   ├── ac-participants-table.tsx  Add/edit/remove participants
│   │   ├── ac-groups-editor.tsx       Group list with drag-assign participants
│   │   ├── ac-tasks-table.tsx         Task list with isTeamTask indicator
│   │   ├── ac-task-detail.tsx         Task form + criteria list
│   │   ├── ac-criteria-editor.tsx     Add/edit criteria rows (type + weight)
│   │   ├── ac-schedule-builder.tsx    Matrix: groups × days, drag tasks into slots
│   │   ├── ac-reviewers-table.tsx     Add/remove reviewers (user search)
│   │   ├── ac-assignments-matrix.tsx  Reviewer ↔ participant ↔ task assignment grid
│   │   └── index.ts
│   └── index.ts
│
├── review/
│   ├── components/
│   │   ├── review-layout.tsx          Reviewer shell with progress indicator
│   │   ├── review-task-list.tsx       List of tasks assigned to this reviewer
│   │   ├── review-participant-list.tsx  Participants for a task, with per-row status
│   │   ├── review-rating-form.tsx     Criteria entry form (optimistic, auto-save)
│   │   ├── review-quantitative-field.tsx  0–5 scale input + optional notes
│   │   ├── review-qualitative-field.tsx   Optional free text, autosaved; clearing deletes it
│   │   ├── review-team-observation.tsx    Optional team dynamics note field
│   │   └── index.ts
│   └── index.ts
│
├── evaluation/
│   ├── components/
│   │   ├── evaluation-overview.tsx    Participant × task matrix (admin)
│   │   ├── evaluation-participant.tsx Per-participant weighted score breakdown
│   │   ├── evaluation-task.tsx        Per-task average scores across participants
│   │   ├── evaluation-criteria.tsx    Per-criteria breakdown with weights
│   │   ├── evaluation-export.tsx      Export trigger (CSV / PDF)
│   │   ├── evaluation-calibration.tsx Reviewer leniency, criterion disagreement
│   │   ├── score-distribution.tsx     Overall scores as dots on 0–100 %
│   │   ├── results-heatmap.tsx        Participants × tasks heat map
│   │   ├── score-composition.tsx      Overall score split into task shares
│   │   ├── task-scatter.tsx           Two tasks against each other (client)
│   │   ├── participant-profile.tsx    Person against the AC per task
│   │   ├── criteria-drilldown.tsx     Stars per reviewer and criterion, texts
│   │   ├── score-strip.tsx            Shared 0–100 % axis, marks and legend
│   │   ├── evaluation-comparison.tsx  2–3 participants side by side
│   │   ├── comparison-selection.tsx   Pick 2–3 people in the ranking (client)
│   │   ├── comparison-picker.tsx      Swap, add, remove people on the page (client)
│   │   └── index.ts
│   ├── server/                        Data loaders and pure scoring logic
│   │   ├── scoring.ts, ranking.ts, deviation.ts
│   │   ├── comparison.ts              Summaries, positions, task shares, correlation
│   │   ├── calibration.ts             Leniency and disagreement
│   │   ├── criteria-breakdown.ts      Rows per criterion for one person
│   │   └── participant-comparison.ts  Who leads per task, gap to the best, URL ids
│   └── index.ts
│
└── ressort/
    ├── components/
    │   ├── ressort-manager-page.tsx   Admin list: add, rename, delete (client)
    │   ├── ressort-capacity-table.tsx Results tab: numbers per ressort, inputs for admins
    │   └── index.ts
    ├── server/
    │   └── get-ressort-capacities.ts  Every ressort with its numbers in one AC
    └── index.ts
```

---

## App Directory (Next.js App Router)

```
src/app/
│
├── layout.tsx                         Root layout (fonts, providers, Toaster)
│
├── auth/
│   ├── layout.tsx                     Redirects to / if session exists
│   └── page.tsx                       → <AuthContent />
│
└── (protected)/                       Route group — shared auth guard layout
    ├── layout.tsx                     Redirects to /auth if no session
    │
    ├── page.tsx                       Redirects to /dashboard
    │
    ├── dashboard/
    │   └── page.tsx                   → <DashboardAcList />
    │
    ├── ressorts/
    │   └── page.tsx                   Admin guard → <RessortManagerPage />
    │
    └── assessment-centers/
        ├── new/
        │   └── page.tsx               → <AcCreateForm />
        │
        └── [id]/
            ├── layout.tsx             Loads AC by id, provides AC context, renders <AcHeader /> + <AcNav />
            ├── page.tsx               Redirects based on role + status
            │
            ├── setup/
            │   ├── layout.tsx         Admin guard + <AcSetupHub /> shell
            │   ├── page.tsx           Redirects to /setup/details
            │   ├── details/
            │   │   └── page.tsx       → <AcDetailsForm />
            │   ├── participants/
            │   │   └── page.tsx       → <AcParticipantsTable />
            │   ├── groups/
            │   │   └── page.tsx       → <AcGroupsEditor />
            │   ├── tasks/
            │   │   ├── page.tsx       → <AcTasksTable />
            │   │   └── [taskId]/
            │   │       └── page.tsx   → <AcTaskDetail /> + <AcCriteriaEditor />
            │   ├── schedule/
            │   │   └── page.tsx       → <AcScheduleBuilder />
            │   ├── reviewers/
            │   │   └── page.tsx       → <AcReviewersTable />
            │   └── assignments/
            │       └── page.tsx       → <AcAssignmentsMatrix />
            │
            ├── overview/
            │   ├── layout.tsx         Admin guard + ACTIVE/COMPLETED guard
            │   └── page.tsx           → <EvaluationOverview /> (live)
            │
            ├── results/
            │   ├── layout.tsx         requireResultsAccess + anonymized banner
            │   ├── page.tsx           → <EvaluationParticipant /> + <EvaluationExport />
            │   ├── [participantId]/page.tsx → <EvaluationParticipantDetail />
            │   └── compare/page.tsx   → <EvaluationComparison /> (?ids=a,b,c)
            │
            └── review/
                ├── layout.tsx         Reviewer guard + <ReviewLayout />
                ├── page.tsx           → <ReviewTaskList />
                └── [taskId]/
                    ├── page.tsx       → <ReviewParticipantList />
                    └── [participantId]/
                        └── page.tsx   → <ReviewRatingForm /> + <ReviewTeamObservation />
```

---

## tRPC Router Structure

```
src/server/api/routers/
│
├── assessment-center.ts    CRUD for AssessmentCenter; status transitions
├── participant.ts          Add/edit/delete participants within an AC
├── group.ts                Create groups; assign/remove participants
├── task.ts                 CRUD for tasks; CRUD for criteria within a task
├── schedule.ts             Create/delete ScheduleEntry records; reorder
├── reviewer.ts             Add/remove Reviewer records; list reviewers for AC
├── assignment.ts           Create/delete ReviewerAssignment (reviewer × participant × task)
├── rating.ts               Upsert QuantitativeRating, QualitativeRating (blank deletes), TeamTaskObservation
├── evaluation.ts           Read-only: aggregate scores, completion status
└── ressort.ts              Admin: create/rename/delete ressorts; numbers per AC
```

All routers are registered in `src/server/api/root.ts`.

Access: everything that reads or changes an AC's setup and participant data
uses `adminProcedure` (admin role required). Reviewers load their data through
the review module's server loaders, scoped to their own assignments, and write
only through `rating.ts`, which checks their assignment. `listForUser` returns
only the ACs a reviewer is assigned to.

---

## Routes Constants

All route strings are defined in `src/lib/routes/index.ts` as typed builder
functions, not raw strings. Pages import route builders rather than
constructing paths manually.

```ts
// example shape — not yet implemented
export const ROUTES = {
  auth: () => "/auth",
  dashboard: () => "/dashboard",
  ressorts: () => "/ressorts",
  acNew: () => "/assessment-centers/new",
  ac: (id: string) => `/assessment-centers/${id}`,
  acSetup: (id: string) => `/assessment-centers/${id}/setup`,
  acSetupDetails: (id: string) => `/assessment-centers/${id}/setup/details`,
  acSetupParticipants: (id: string) => `/assessment-centers/${id}/setup/participants`,
  acSetupGroups: (id: string) => `/assessment-centers/${id}/setup/groups`,
  acSetupTasks: (id: string) => `/assessment-centers/${id}/setup/tasks`,
  acSetupTask: (id: string, taskId: string) => `/assessment-centers/${id}/setup/tasks/${taskId}`,
  acSetupSchedule: (id: string) => `/assessment-centers/${id}/setup/schedule`,
  acSetupReviewers: (id: string) => `/assessment-centers/${id}/setup/reviewers`,
  acSetupAssignments: (id: string) => `/assessment-centers/${id}/setup/assignments`,
  acOverview: (id: string) => `/assessment-centers/${id}/overview`,
  acResults: (id: string) => `/assessment-centers/${id}/results`,
  acResultsParticipant: (id: string, participantId: string) =>
    `/assessment-centers/${id}/results/${participantId}`,
  acResultsCompare: (id: string, participantIds: string[]) =>
    `/assessment-centers/${id}/results/compare?ids=${participantIds.join(",")}`,
  acReview: (id: string) => `/assessment-centers/${id}/review`,
  acReviewTask: (id: string, taskId: string) => `/assessment-centers/${id}/review/${taskId}`,
  acReviewRating: (id: string, taskId: string, participantId: string) =>
    `/assessment-centers/${id}/review/${taskId}/${participantId}`,
} as const;
```

---

## Shared Domain Rules

Pure domain rules that more than one module needs live in `src/lib/`, not in
either module. A module must not import another module's internals, so a rule
shared by `review` and `evaluation` cannot live in one of them.

Code here is framework-free: no database access, no `server-only`, no React.
That keeps it usable on the server and in client components alike, and
testable with `bun run test` without any setup.

- `src/lib/review-completion.ts`: when a rating sheet counts as complete.
  Required criteria are quantitative and not marked optional; free-text
  criteria never block completion. Used by the review lists, the rating form's
  live progress, the live overview and the results.
- `src/lib/qualitative-write.ts`: whether a free-text save stores the text
  or deletes the entry (blank text). Used by the rating router.
- `src/lib/ac-status.ts`: AC status type and labels, and which statuses lock
  setup changes (`COMPLETED`, `ANONYMIZED`). Used by the routers (via
  `assertAcEditable`), the setup layout and the details form.
- `src/lib/rating-scale.ts`: rating scales per AC (1–5 for older ACs, 1–6
  from the assessment matrix), valid values and which values need a
  confirmation. Used by the assessment-center and rating routers, the
  rating form loader, the rating view and the details page.
- `src/lib/format-percent.ts`: how scores are shown, whole percent in the app
  and one decimal in the export.
- `src/lib/pseudonyms.ts`: pseudonyms "Bewerbende n" / "Gruppe n" for
  anonymizing an AC, shuffled for participants.
- `src/lib/ressort-capacity.ts`: valid ressort numbers per AC (whole numbers
  from 0 to 9999, active at most registered) and free slots (negative = more assigned
  than should be admitted). Used by the ressort router and the results tab.
- `src/lib/rating-anchors.ts`: labels and maximum length of the 2- and
  4-star anchor texts, shared by the criteria editor, the rating view and the
  task router.

---

## UX Notes

### Reviewer rating form
- Ratings are saved **per field on blur** (optimistic update via tRPC mutation).
  No explicit "Submit" button for individual fields — the form reflects
  in-flight and saved state via subtle indicators.
- A per-task **completion badge** shows how many criteria have been filled.
- Navigating away mid-form is safe: in-flight saves are resolved before
  unmount via a `beforeunload` guard.
- The form is **mobile-first**: scale inputs render as large tap targets;
  text areas expand on focus.

### Setup assignments matrix
- The assignments matrix (`reviewer × participant × task`) can become large.
- Default view shows all participants with their currently assigned reviewer
  per task. Reviewers can be bulk-assigned (e.g. "assign reviewer A to all
  participants for task 2").

### Live overview matrix
- The overview grid shows `participants × tasks` as cells.
- Each cell displays a completion fraction (e.g. `2/3 reviewers submitted`).
- Cells update in near real-time via tRPC polling or server-sent events. 

### Schedule builder
- A drag-and-drop grid: rows are participant groups, columns are days.
- Tasks are placed as chips within a cell and can be reordered vertically
  within the cell (sets `orderIndex`).
