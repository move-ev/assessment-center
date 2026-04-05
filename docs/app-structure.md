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
DRAFT ──► ACTIVE ──► COMPLETED
```

| Status | Meaning | What is available |
|---|---|---|
| `DRAFT` | Being set up | Setup flow (admin only) |
| `ACTIVE` | AC is running, participants are on-site | Reviewer workspace; live overview (admin) |
| `COMPLETED` | AC has ended | Results/evaluation (admin); reviewers can still edit ratings |

Status is stored on `AssessmentCenter` and gates access within each section.

---

## Route Hierarchy

```
/auth                                             Login page

/ (protected layout — auth guard)
│
├── /dashboard                                    Role-sensitive landing page
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
        ├── /results                              Admin: aggregated evaluation (COMPLETED)
        │
        └── /review                               Reviewer: workspace root
            └── /[taskId]                         Reviewer: participant list for this task
                └── /[participantId]              Reviewer: criteria entry form
```

### Route notes

- `/assessment-centers/[id]` redirects based on role and AC status:
  - Admin + DRAFT → `/setup/details`
  - Admin + ACTIVE → `/overview`
  - Admin + COMPLETED → `/results`
  - Reviewer → `/review`
- `/setup` redirects to `/setup/details`
- Access to `/setup` is blocked for non-admins and non-DRAFT status (with a
  guard in the layout that allows read-only viewing once ACTIVE/COMPLETED).
- Access to `/overview` and `/results` is blocked for non-admins.
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
│   │   ├── review-qualitative-field.tsx   Required text area
│   │   ├── review-team-observation.tsx    Optional team dynamics note field
│   │   └── index.ts
│   └── index.ts
│
└── evaluation/
    ├── components/
    │   ├── evaluation-overview.tsx    Participant × task matrix (admin)
    │   ├── evaluation-participant.tsx Per-participant weighted score breakdown
    │   ├── evaluation-task.tsx        Per-task average scores across participants
    │   ├── evaluation-criteria.tsx    Per-criteria breakdown with weights
    │   ├── evaluation-export.tsx      Export trigger (CSV / PDF)
    │   └── index.ts
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
            │   ├── layout.tsx         Admin guard + COMPLETED guard
            │   └── page.tsx           → <EvaluationParticipant /> + <EvaluationExport />
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
├── participant.ts          Add/edit/soft-delete participants within an AC
├── group.ts                Create groups; assign/remove participants
├── task.ts                 CRUD for tasks; CRUD for criteria within a task
├── schedule.ts             Create/delete ScheduleEntry records; reorder
├── reviewer.ts             Add/remove Reviewer records; list reviewers for AC
├── assignment.ts           Create/delete ReviewerAssignment (reviewer × participant × task)
├── rating.ts               Upsert QuantitativeRating, QualitativeRating, TeamTaskObservation
└── evaluation.ts           Read-only: aggregate scores, completion status
```

All routers are registered in `src/server/api/root.ts`.

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
  acReview: (id: string) => `/assessment-centers/${id}/review`,
  acReviewTask: (id: string, taskId: string) => `/assessment-centers/${id}/review/${taskId}`,
  acReviewRating: (id: string, taskId: string, participantId: string) =>
    `/assessment-centers/${id}/review/${taskId}/${participantId}`,
} as const;
```

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
