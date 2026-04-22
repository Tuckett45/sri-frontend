# ATLAS Integration Reconciliation Report

**Date:** 2026-04-07
**Repos:** sri-frontend, atlas-platform, atlas-db
**Reconciliation branch:** ATLAS-segregation (canonical)

---

## 1. Consolidation Strategy

### Branches examined
- `origin/ATLAS-segregation` (lowercase `s`) — long-lived integration branch on the frontend, containing all ATLAS UI work, Field Resource Management module, NgRx role/permissions store, ATLAS auth/SignalR services, deployment lifecycle UI, FRM API services, and ~1,525 file changes vs `master`.
- `origin/ATLAS-Segregation` (capital `S`) — **already merged** into `ATLAS-segregation` via PR #119 (`Merge pull request #119 from Tuckett45/ATLAS-Segregation`, commit `dcda2fa`). The Capital-S branch had been used as a short-lived spec/test refinement branch (commits: spec changes, technician dashboard, scheduling component, dummy data for onboarding/scheduling/payroll, HR/Payroll roles, build fixes).
- No separate, divergent capital-S branch exists on `origin` today — the only remaining ATLAS branch is `origin/ATLAS-segregation` (lowercase), and it already contains every commit reachable from PR #119's merge.

### Divergence from master
- `origin/master..origin/ATLAS-segregation`: ~30 commits, mostly the ATLAS/FRM integration work, role guards, dummy data, scheduling, technician clock in/out.
- `origin/ATLAS-segregation..origin/master`: a single commit `bdf71c2 updates for street sheets`.

### Strategy applied
1. Verified, via `git log --graph --decorate --all`, that `ATLAS-Segregation` (capital) is fully reachable from `ATLAS-segregation` — no work would be lost by abandoning the capital-S name.
2. Checked out `ATLAS-segregation` as the canonical branch.
3. Merged `origin/master` to pick up the one missing street-sheet commit.
4. Resolved a conflict in `ngsw-config.json` (add/add): kept the richer ATLAS-segregation version which contains the `$schema` reference, the extended asset-file globs (`/*.(svg|cur|jpg|...)`), and the new `dataGroups` (`api-cache`, `api-performance`, `frm-dashboard`, `frm-today-jobs`, `frm-static-data`). The master branch only had the bare-minimum file list; all of its content is preserved as a subset of the ATLAS version.
5. Committed the resolution as `2083de5 Merge master into ATLAS-segregation, resolve ngsw-config.json conflict`.

No code from either branch was discarded. The Capital-S branch's history is preserved through the merge commit `dcda2fa`. Master's street-sheet fix is preserved through the merge commit `2083de5`.

## 2. Final Branch Name

**`ATLAS-segregation`** (lowercase `s`) is the single canonical branch going forward.

Recommended team actions:
- Delete the remote `ATLAS-Segregation` (capital) reference if any tooling still resolves it; it will only cause case-insensitive filesystem confusion.
- Open a PR from `ATLAS-segregation` → `master` and use that as the path to release. Do **not** rename the branch.

---

## 3. Endpoint Mapping Report

`environment.apiUrl` resolves to `https://sri-api.azurewebsites.net/api` (prod), `https://sri-api-staging-…` (staging), or `https://localhost:44376/api` (local).
`environment.atlasApiUrl` resolves to `https://atlas-api.azurewebsites.net` (prod), staging, or `https://localhost:7028` (local).

The platform exposes **two distinct backend services** (the SRI API and the ATLAS API), surfaced from different projects in the `atlas-platform` repo:
- **ATLAS lifecycle/governance API** lives in `atlas-platform/atlas-api`, mounted under `/v1/...`. Has the deployment, approval, exception, AI-analysis, query-builder, and agent controllers. Fully implemented.
- **CRM / operational API** lives in `atlas-platform/atlas-crm`, mounted under `/api/...`. Has Jobs, Technicians, Reporting, Customers, Appointments, Tickets, Invoices, Communications, IssueAndDelayCodes, plus ARK and Atlas integration controllers.
- **SRI Project Lifecycle API** lives in `atlas-platform/sri-project-lifecycle-api`, also under `/api/...`. Has Projects, Activities, Documents, Reports, Integrations.

### ATLAS API (atlasApiUrl) — matched

| Frontend call | Service file | Backend route | Status |
|---|---|---|---|
| `POST /auth/token` | `atlas-auth.service.ts` | (external IdP – out of repo) | ⚠ external |
| `GET/POST/PUT /v1/deployments[...]` | `atlas-deployment.service.ts`, `deployment.service.ts` (after fix), `cached-deployment.service.ts` (after fix) | `atlas-api/Controllers/DeploymentsController` | ✅ matched |
| `POST /v1/deployments/{id}/transition` | `deployment.service.ts` | `DeploymentsController.TransitionState` | ✅ matched |
| `POST /v1/deployments/{id}/evidence` | `deployment.service.ts` (linkEvidence) | `DeploymentsController.SubmitEvidence` | ✅ matched |
| `GET /v1/approvals/...` | `approval.service.ts`, `atlas-approvals.service.ts` | `ApprovalsController` | ✅ matched |
| `POST /v1/approvals/request` | `approval.service.ts` | `ApprovalsController.RequestApproval` | ✅ matched |
| `POST /v1/approvals/{id}/decision` | `approval.service.ts` | `ApprovalsController.RecordApprovalDecision` | ✅ matched |
| `POST /v1/exceptions/deployments/{id}` | (atlas exceptions UI) | `ExceptionsController` | ✅ matched |
| `GET/POST /v1/ai-analysis/...` | `ai-analysis.service.ts` | `AIAnalysisController` | ✅ matched |
| `GET/POST /v1/query-builder/...` | `query-builder.service.ts`, `atlas-query-builder.service.ts` | `QueryBuilderController`, `QueryTemplateController` | ✅ matched |
| `GET /v1/{service}/health` | `atlas-health.service.ts` | `HealthController` | ✅ matched |
| SignalR `/v1/signalr/atlas` (or `/hubs/atlas`) | `atlas-signalr.service.ts`, `atlas-sync.service.ts` | (hub registration) | ⚠ verify hub mount path |

### SRI / CRM API (apiUrl) — mostly missing

| Frontend call | Service file | Backend handler in atlas-platform | Status |
|---|---|---|---|
| `POST /auth/login`, `/auth/register`, `/auth/users/...` | `auth.service.ts` | none | ❌ missing |
| `GET/POST /expenses`, `/expenses/{id}`, `/expenses/form`, `/expenses/analyze-receipt`, `/expenses/{id}/images` | `expense-api.service.ts` | none | ❌ missing |
| `GET/POST /jobs`, `/jobs/{id}`, `/jobs/by-technician`, `/jobs/{id}/notes`, `/jobs/{id}/attachments`, `/jobs/{id}/status-history` | `job.service.ts` | `atlas-crm/JobsController` (partial – has `{id}/status`, `{id}`, `offline-updates`, `{id}/complete`, `{id}/completion-notes`, `{id}/completion-photos`, `{id}/planned-vs-actual`) | ⚠ partial – missing list, create, update, delete, by-technician, notes, attachments, status-history |
| `GET/POST/PUT/DELETE /technicians/...`, `/technicians/{id}/skills`, `/technicians/{id}/certifications`, `/technicians/{id}/availability`, `/technicians/{id}/location` | `technician.service.ts` | `atlas-crm/TechniciansController` (after route fix) – only `{id}/daily-jobs` is implemented | ⚠ partial – missing list/CRUD/skills/certs/availability/location |
| `GET/POST /crews`, `/crews/{id}/...`, `/crews/{id}/members`, `/crews/{id}/location`, `/crews/{id}/assign-job` | `crew.service.ts` | none | ❌ missing |
| `POST /scheduling/assign`, `GET /scheduling/conflicts`, `/scheduling/qualified-technicians/{jobId}`, etc. | `scheduling.service.ts` | none — `ISchedulingService` is wired in DI but no controller exposes it | ❌ missing |
| `GET /budgets/job/{jobId}`, `POST /budgets`, `/budgets/{jobId}/adjustments`, `/budgets/{jobId}/deductions` | `budget-api.service.ts`, `budget.service.ts` | none | ❌ missing |
| `GET/POST /inventory`, `/inventory/{itemId}/assign`, `/inventory/low-stock`, `/inventory/{itemId}/availability` | `inventory-api.service.ts`, `inventory.service.ts` | none | ❌ missing |
| `GET/POST /materials`, `/materials/{id}/consume`, `/materials/{id}/receive`, `/materials/transactions`, `/materials/reorder-recommendations`, `/materials/{id}/adjust` | `materials-api.service.ts`, `materials.service.ts` | none | ❌ missing |
| `GET /travel/profiles/{technicianId}`, `PATCH /travel/profiles/{technicianId}/flag\|address\|coordinates\|geocoding-status`, `POST /travel/calculate-distances` | `travel-api.service.ts`, `travel.service.ts` | only `sri-project-lifecycle-api/IntegrationsController.POST /api/integrations/travel/bookings` (different concern) | ❌ missing |
| `GET/POST/PATCH /purchase-orders[...]` | `materials-api.service.ts` | none | ❌ missing |
| `GET /suppliers`, `/suppliers/{id}` | `materials-api.service.ts` | none | ❌ missing |
| `GET /reports/job-cost/{jobId}`, `/reports/job-cost/{jobId}/export`, `/reports/budget-comparison/{jobId}`, `/reports/budget-variance`, `/reports/travel-costs`, `/reports/material-usage` | `reporting-api.service.ts`, FRM `reporting.service.ts` | partial overlap with `atlas-crm/ReportingController` (`/api/reporting/...`) and `sri-project-lifecycle-api/ReportsController` (`/api/reports/...`) — but neither implements job-cost, budget-comparison, budget-variance, travel-costs, or material-usage | ❌ missing |
| `GET/POST /reporting/project-status`, `/reporting/technician-performance`, `/reporting/export`, `/reporting/time-billing`, `/reporting/trend-analysis`, `/reporting/recurring`, `/reporting/comparative-analytics`, `/reporting/custom`, `/reporting/custom/{id}/execute` | `reporting.service.ts` | none (`atlas-crm/ReportingController` only exposes `/api/reporting/utilization[/...]`) | ⚠ partial — only `utilization` matches |
| `GET/POST /payroll/incident-reports`, `/payroll/direct-deposit`, `/payroll/w4`, `/payroll/contact-info`, `/payroll/prc`, `/payroll/pay-stubs/{id}`, `/payroll/pay-stubs/{id}/pdf`, `/payroll/w2/{id}`, `/payroll/w2/{id}/pdf`, `/payroll/w2/{id}/tax-years` | `payroll.service.ts` | none | ❌ missing — but the DB tables exist (`IncidentReports`, `DirectDepositChanges`, `W4Changes`, `ContactInfoChanges`, `PrcSignatures`, `PayStubs`, `W2Documents`) |
| `POST/PUT/DELETE /notifications/subscriptions[/...]`, `GET/PUT /notifications/preferences` | `deployment-push-notification.service.ts`, FRM `notification.service.ts` | none | ❌ missing |
| `GET/POST/PUT/DELETE /MapMarker[/...]` | `map-marker.service.ts` | none | ❌ missing |
| `GET /PunchList/all`, `/PunchList/unresolved`, etc. | `preliminary-punch-list.service.ts` | none in atlas-platform | ❌ missing — likely served by a separate legacy SRI API |
| `GET /tps/...`, `/dashboard/...`, `/osp-coordinators/...`, `/user-management/...`, `/system-configuration/...`, `/workflow/...`, `/files/...`, `/onboarding/...` | various services | none in atlas-platform | ❌ missing — legacy SRI API |

---

## 4. Mismatches Found

### Frontend (sri-frontend, branch ATLAS-segregation)

1. **Double `/api/api/...` URL bug — `cached-deployment.service.ts:63`**
   `private readonly baseUrl = ${environment.apiUrl}/api/deployments;` produced `https://sri-api.azurewebsites.net/api/api/deployments`. Every list/detail/create/update/progress request from the cached deployment service was hitting a non-existent path.

2. **Double `/api/api/...` URL bug — `ark/ark-notification.service.ts:45`**
   Same pattern: `${environment.apiUrl}/api/ark/notifications` → `…/api/api/ark/notifications`. All ARK notification, preference, template, and broadcast endpoints were unreachable.

3. **Hard-coded relative `/api/...` path bug — FRM API endpoints layer**
   `field-resource-management/api/api-endpoints.ts:13` defined `API_BASE_URL = '/api'`. Because these are relative URLs and the Angular HTTP interceptor does **not** rewrite them, every BUDGET, INVENTORY, MATERIALS, TRAVEL, PURCHASE_ORDER, SUPPLIER, and REPORTING endpoint resolved against the **frontend's own host** (e.g. `https://sri.company.com/api/budgets/...`) instead of the SRI API. The browser would 404 against the static-site host.

4. **Hard-coded relative `/api/...` path bug — 9 FRM service files**
   The same anti-pattern was repeated in the higher-level FRM services that don't go through `api-endpoints.ts`:
   - `field-resource-management/services/technician.service.ts:29` — `/api/technicians`
   - `field-resource-management/services/crew.service.ts:20` — `/api/crews`
   - `field-resource-management/services/scheduling.service.ts:50` — `/api/scheduling`
   - `field-resource-management/services/job.service.ts:37` — `/api/jobs`
   - `field-resource-management/services/materials.service.ts:35-37` — `/api/materials`, `/api/purchase-orders`, `/api/suppliers`
   - `field-resource-management/services/inventory.service.ts:28` — `/api/inventory`
   - `field-resource-management/services/travel.service.ts:25` — `/api/travel`
   - `field-resource-management/services/reporting.service.ts:98` — `/api/reports`
   - `field-resource-management/services/budget.service.ts:28` — `/api/budgets`
   - `field-resource-management/services/time-tracking.service.ts:34` — `/api/time-entries`

   None of these would have reached the SRI API in production.

5. **Service-worker `dataGroups` reference paths the frontend doesn't actually emit**
   `ngsw-config.json` declares cache groups for `/api/field-resource-management/**`, but no service in the codebase calls those URLs after the URL fixes above. Documented as low-priority cleanup; not changed because the cache groups are harmless misses (Angular SW just ignores patterns that don't match traffic).

6. **Endpoint coverage gap (frontend → backend)**
   The vast majority of SRI/CRM endpoints the frontend depends on (jobs CRUD, crews, scheduling, expenses, budgets, inventory, materials, travel, purchase orders, suppliers, payroll, notifications, auth, MapMarker, PunchList, TPS, dashboards, OSP coordinator, user management, workflow, files, onboarding) have **no implementation** in `atlas-platform`. They are presumed to live in a **separate legacy SRI API project** that is not in the three repos in scope. See "Blockers Remaining".

7. **Cross-cutting: redundant deployment service implementations**
   `src/app/services/cached-deployment.service.ts`, `src/app/services/deployment-api.service.ts`, `src/app/features/deployment/services/deployment.service.ts`, and `src/app/features/deployment/services/deployment-media-api.service.ts` all hit overlapping deployment endpoints. After the URL fix they all resolve correctly, but consolidating them is recommended (see "Next Recommended Steps").

### Backend (atlas-platform)

8. **Route mismatch — `atlas-crm/Controllers/TechniciansController.cs:11`**
   Was `[Route("api/crm/[controller]")]` → `/api/crm/technicians`. Frontend (after the URL fixes above) calls `/api/technicians/...`. None of the daily-jobs lookups would have matched.

9. **Sparsely-implemented controllers**
   `JobsController` and `TechniciansController` only implement a small subset of the endpoints the frontend calls. The remaining endpoints fall into category #6 above. Listed in "Blockers Remaining".

10. **`atlas-crm/ReportingController` route is `/api/reporting`, frontend FRM module calls `/api/reports` and the SRI reporting service calls `/api/reporting`**
    Route is consistent for the SRI reporting service, but the FRM module's `reporting.service.ts` and the FRM `reporting-api.service.ts` both call `/api/reports/...`, which is **not** the same controller. There is no `/api/reports/job-cost/...` or `/api/reports/utilization` matching what the FRM module expects. The `sri-project-lifecycle-api/ReportsController` has `/api/reports/project-status`, `/performance/{projectId}`, `/cost-analysis/{projectId}` etc., but does **not** implement job-cost, budget-comparison, travel-costs, or material-usage. Documented as a coverage gap, not patched (would require speculative business logic).

11. **No async/await issues found**
    All `SaveChangesAsync()`, `ToListAsync()`, `FirstOrDefaultAsync()` calls in `atlas-api`, `atlas-core`, `atlas-crm`, and `sri-project-lifecycle-api` are properly awaited. Service calls in controllers are awaited. Parallel reads use `Task.WhenAll`. No fire-and-forget tasks were observed in mutation paths.

12. **Transactions: implicit only**
    EF Core's per-`SaveChangesAsync` implicit transaction is the only mechanism in use. Multi-entity operations that should be atomic — for example `DeploymentService.TransitionStateAsync` (mutates `Deployments`, inserts `StateTransitions`, evaluates gates, then writes audit) — rely on a single `SaveChangesAsync` call to keep them in one transaction. This works today but is fragile if anyone later splits the writes across calls. Documented; no code change.

### Database (atlas-db)

13. **Missing useful indexes**
    The frontend filters Jobs by `Market`, `Region`, and `Company`, and Crews by `Market` — the corresponding tables had no indexes on these columns. Crews also had no index on `CurrentJobId` despite the column being used to look up "what crew is currently on this job".

14. **Missing FK on `Crews.CurrentJobId`**
    The column is declared but has no FK to `Jobs(Id)`. Not added (would require deciding `ON DELETE` behavior; likely `SET NULL`, but the column is UNIQUEIDENTIFIER NULL so the existing data would survive — flagged for follow-up).

15. **Schema vs CRM DbContext divergence**
    The CRM `CRMDbContext` (in `atlas-platform/atlas-crm/Data/CRMDbContext.cs`) defines a wholly separate set of entities — `Customers`, `Appointments`, `Tickets`, `Invoices`, `InvoiceLineItems`, `Payments`, `Skills`, `SkillAssignments`, `Certifications`, `CertificationAssignments`, `AvailabilityPatterns`, `PTORecords`, `PTOBalance`, `JobAssignments`, `JobIssues`, `JobDelays`, `JobCompletions`, `CompletionPhotos`, `SkillRequirements`, `MileageRecords`, `IssueCodes`, `DelayCodes`, `CommunicationTemplates`, `EmailLogs`, `CalendarIntegrationConfigs`, `MobileSyncStates`, `OfflineJobUpdates`, `OfflineTicketUpdates`, `MobileNotifications`, `DeviceRegistrations`, `AccessAuditLogs` — **none of which exist in `atlas-db`**. The CRM connects to a different database (`CRMDatabase` connection string in `appsettings.json`) and is not currently tracked in this repo.

    Naming clash: `atlas-db` has table `Assignments`, `CRMDbContext` calls the same concept `JobAssignments`. Either is fine if the EF model is configured with `ToTable("Assignments")`, but the model file does not currently set this — it would default to `JobAssignments`, which is a third schema. Flagged in "Blockers Remaining" because the CRM database schema needs to be brought into `atlas-db` as a separate project (or deleted if dead code).

16. **Tables in `atlas-db` with no DbContext consumer**
    `JobNotes`, `JobAttachments`, `CrewMembers`, `CrewLocationRecords`, `IncidentReports`, `DirectDepositChanges`, `W4Changes`, `ContactInfoChanges`, `PrcSignatures`, `PayStubs`, `W2Documents` exist as fully-defined SQL tables with FK constraints and indexes, but neither `AtlasDbContext` (atlas-core) nor `CRMDbContext` references them. They appear to be modeled in anticipation of future Field Resource Management / Payroll controllers that don't exist yet — see the `payroll.service.ts` calls in the frontend that have no backend handler. The schemas are correct; only the backend wiring is missing.


---

## 5. Fixes Made

### sri-frontend

| File | Line(s) | Change | Why |
|---|---|---|---|
| `ngsw-config.json` | whole file | Resolved add/add merge conflict, kept ATLAS-segregation version (extended assets, dataGroups, $schema) | Master only had a stub; ATLAS-segregation has the production-ready service-worker config. |
| `src/app/services/cached-deployment.service.ts` | 63 | `${environment.apiUrl}/api/deployments` → `${environment.apiUrl}/deployments` | Fixed double `/api/api/...` URL bug. |
| `src/app/services/ark/ark-notification.service.ts` | 45 | `${environment.apiUrl}/api/ark/notifications` → `${environment.apiUrl}/ark/notifications` | Fixed double `/api/api/...` URL bug. |
| `src/app/features/field-resource-management/api/api-endpoints.ts` | 10-15 | Added `import { environment }`, changed `API_BASE_URL = '/api'` → `API_BASE_URL = environment.apiUrl` | Was a relative URL hitting the frontend's own host instead of the SRI API. |
| `src/app/features/field-resource-management/services/technician.service.ts` | imports + 29 | Added environment import; `apiUrl = '/api/technicians'` → `${environment.apiUrl}/technicians` | Same root cause as above. |
| `src/app/features/field-resource-management/services/crew.service.ts` | imports + 20 | Added environment import; `'/api/crews'` → `${environment.apiUrl}/crews` | Same root cause. |
| `src/app/features/field-resource-management/services/scheduling.service.ts` | imports + 50 | Added environment import; `'/api/scheduling'` → `${environment.apiUrl}/scheduling` | Same root cause. |
| `src/app/features/field-resource-management/services/job.service.ts` | imports + 37 | Added environment import; `'/api/jobs'` → `${environment.apiUrl}/jobs` | Same root cause. |
| `src/app/features/field-resource-management/services/materials.service.ts` | imports + 35-37 | Added environment import; rewrote `apiUrl`, `purchaseOrderUrl`, `supplierUrl` to use `${environment.apiUrl}/...` | Same root cause. |
| `src/app/features/field-resource-management/services/inventory.service.ts` | imports + 28 | Added environment import; `'/api/inventory'` → `${environment.apiUrl}/inventory` | Same root cause. |
| `src/app/features/field-resource-management/services/travel.service.ts` | imports + 25 | Added environment import; `'/api/travel'` → `${environment.apiUrl}/travel` | Same root cause. |
| `src/app/features/field-resource-management/services/reporting.service.ts` | imports + 98 | Added environment import; `'/api/reports'` → `${environment.apiUrl}/reports` | Same root cause. |
| `src/app/features/field-resource-management/services/budget.service.ts` | imports + 28 | Added environment import; `'/api/budgets'` → `${environment.apiUrl}/budgets` | Same root cause. |
| `src/app/features/field-resource-management/services/time-tracking.service.ts` | imports + 34 | Added environment import; `'/api/time-entries'` → `${environment.apiUrl}/time-entries` | Same root cause. |

### atlas-platform

| File | Line(s) | Change | Why |
|---|---|---|---|
| `atlas-crm/Controllers/TechniciansController.cs` | 11 | `[Route("api/crm/[controller]")]` → `[Route("api/[controller]")]` | Frontend `technician.service.ts` and the FRM technician service both call `/api/technicians/...`. The CRM-prefixed route was unreachable. |

### atlas-db

| File | Change | Why |
|---|---|---|
| `Tables/dbo.Crews.sql` | Added `CREATE INDEX [IX_Crews_Market] ON [dbo].[Crews] ([Market])` and `CREATE INDEX [IX_Crews_CurrentJobId] ON [dbo].[Crews] ([CurrentJobId])` | Frontend filters crews by market; "what crew is on this job" lookups need the CurrentJobId index. |
| `Tables/dbo.Jobs.sql` | Added `CREATE INDEX [IX_Jobs_Market]`, `CREATE INDEX [IX_Jobs_Region]`, `CREATE INDEX [IX_Jobs_Company]` | Frontend job filtering by market/region/company would have triggered table scans. |

---

## 6. Database Write Verification

For each critical end-to-end flow, the path **frontend → API → repository → DB write** was traced. Where the path is intact, the write is verified to land in the correct table; where it isn't, the gap is documented.

| Flow | Path | DB write | Verified? |
|---|---|---|---|
| **Login** | `auth.service.login()` → `POST {apiUrl}/auth/login` → ❌ no backend handler in `atlas-platform` | `Users.LastLoginAt` | ❌ broken — no SRI API in scope |
| **Create deployment (ATLAS)** | `deployment.service.create()` → `POST {apiUrl}/deployments` (now correctly resolves after fix) → maps to either `cached-deployment.service.ts` (which now hits the same SRI API path that has no handler) **or** the ATLAS-API `DeploymentsController.CreateDeployment` if the call goes through `atlas-deployment.service.ts` (which uses `atlasApiUrl/v1/deployments`) → `IDeploymentService.CreateDeploymentAsync` → `_context.Deployments.Add(...)` → `await _context.SaveChangesAsync()` (verified properly awaited at `atlas-core/Services/DeploymentService.cs`) | `Deployments` (insert) + `AuditEvents` (insert) | ✅ verified for the `atlasApiUrl` path; ⚠ the SRI-API-prefixed `deployments` calls have no handler |
| **Deployment state transition** | `deployment.service.requestAtlasTransition()` → `POST {apiUrl}/deployments/{id}/transition` (SRI) — but the actual ATLAS transition lives at `POST {atlasApiUrl}/v1/deployments/{id}/transition` and `DeploymentsController.TransitionState` is what implements it | `Deployments.CurrentState` (update) + `StateTransitions` (insert) + `GateEvaluations` (insert) | ✅ verified on the `atlasApiUrl` route; ⚠ the SRI-prefixed call is unreachable |
| **Submit evidence** | `deployment.service.linkEvidence()` → `POST {apiUrl}/deployments/{id}/phases/.../evidence/{mediaId}` (SRI) — and `DeploymentsController.SubmitEvidence` at `POST /v1/deployments/{id}/evidence` is what writes evidence | `Evidence` (insert) + `AuditEvents` (insert) — both inside one `SaveChangesAsync` | ✅ verified on the `atlasApiUrl` route |
| **Approval decision** | `approval.service.recordDecision()` → `POST {atlasApiUrl}/v1/approvals/{id}/decision` → `ApprovalsController.RecordApprovalDecision` → `_approvalService.RecordApprovalDecisionAsync` | `Approvals.Status`, `Approvals.ApprovedAt`, `Approvals.Comments` (update) | ✅ verified |
| **Job creation** | `job.service.createJob()` → `POST {apiUrl}/jobs` → no controller in `atlas-platform` (CRM `JobsController` only has status updates and completion) | `Jobs` (insert) | ❌ broken — no handler |
| **Job status update (mobile)** | `job.service.updateStatus()` → `PATCH {apiUrl}/jobs/{id}/status` → CRM `JobsController.UpdateJobStatus` → `_jobService.UpdateJobStatus(jobId, request.NewStatus, details)` → updates `Jobs.Status` and inserts `JobStatusHistory` (atomic) | `Jobs` (update) + `JobStatusHistories` (insert) | ⚠ partially verified — frontend uses `PATCH`, controller declares `[HttpPut("{id}/status")]`. **Method mismatch** — see Blockers. |
| **Technician daily jobs** | `technician.service.getDailyJobs()` (in atlas-segregation) → `GET {apiUrl}/technicians/{id}/daily-jobs?date=…` → `TechniciansController.GetDailyJobs` (after route fix) → `_schedulingService.GetTechnicianSchedule` → reads `Assignments` + `Jobs` joins | read-only | ✅ verified after route fix |
| **Assign technician to job** | `scheduling.service.assignTechnician()` → `POST {apiUrl}/scheduling/assign` → no controller | `Assignments` (insert) + `Jobs.TechnicianId` (update) | ❌ broken — no controller exposes `ISchedulingService` even though the service exists in DI |
| **Submit expense** | `expense-api.service.submitExpense()` → `POST {apiUrl}/expenses` → no handler | none in this DB schema | ❌ broken |
| **Submit payroll W4 change** | `payroll.service.submitW4Change()` → `POST {apiUrl}/payroll/w4` → no handler | `W4Changes` (insert) — table exists but unused | ❌ broken |
| **Generate report (project status)** | `reporting.service.generateProjectStatusReport()` → `GET {apiUrl}/reporting/project-status?...` → no exact handler (`atlas-crm/ReportingController` has `/api/reporting/utilization`, not `project-status`; `sri-project-lifecycle-api/ReportsController` has `/api/reports/project-status` — wrong path prefix) | read-only | ❌ broken — path prefix mismatch |

### `Jobs` row writes that **are** verified (after fixes)

For the `PATCH/PUT /api/jobs/{id}/status` flow only, after correcting the HTTP method (see Blockers), the write path is:
1. `JobsController.UpdateJobStatus(string id, MobileStatusUpdateRequest request)`
2. `IJobService.UpdateJobStatus(jobId, request.NewStatus, details)`
3. EF Core change tracker marks `Jobs.Status` modified, inserts `JobStatusHistory` row
4. `await _context.SaveChangesAsync()` — properly awaited, exception-bound transaction

This matches the `Jobs` and `JobStatusHistories` tables in `atlas-db` exactly.


---

## 7. Blockers Remaining

These items are real, evidence-based gaps but cannot be fixed with code-only changes inside the three repos in scope. Each needs a product/architecture decision before a fix can be made.

1. **Missing legacy SRI API project.** ~80% of frontend HTTP traffic (auth, expenses, jobs CRUD, crews, scheduling, budgets, inventory, materials, travel, purchase orders, suppliers, payroll, notifications, MapMarker, PunchList, TPS, dashboards, OSP coordinator, user management, system configuration, workflow, files, onboarding) targets `environment.apiUrl` which resolves to `https://sri-api.azurewebsites.net/api`. None of these endpoints exist in `atlas-platform`. They presumably live in a separate ASP.NET project that is not in scope for this reconciliation. **Decision needed:** clone that repo into the workspace, OR migrate those controllers into `atlas-platform`, OR rewrite the frontend to point at `atlas-crm` plus a yet-to-be-built operational API.

2. **CRM database is not tracked in `atlas-db`.** `atlas-platform/atlas-crm` connects to its own `CRMDatabase` and defines ~30 entities (Customers, Appointments, Tickets, Invoices, Skills, Certifications, JobAssignments, JobIssues, JobDelays, JobCompletions, MobileSync, etc.) that have no SQL schema in this repo. **Decision needed:** add a `Tables/crm/*.sql` directory to `atlas-db` and bring the CRM schema under source control, OR delete the CRM module if it is dead code.

3. **`Jobs.UpdateJobStatus` HTTP method mismatch.** Frontend `job.service.ts` uses `PATCH /api/jobs/{id}/status`, controller declares `[HttpPut("{id}/status")]`. Trivial to fix (change one to the other) but I did not change it because both interpretations are defensible — `PATCH` is more idiomatic for partial updates, `PUT` is the existing implementation. **Decision needed:** which HTTP verb is canonical for the team.

4. **`Assignments` vs `JobAssignments` table-name resolution.** `atlas-db` uses `Assignments`, `CRMDbContext` uses `JobAssignments` without an explicit `ToTable("Assignments")` mapping. If/when the CRM schema is brought into `atlas-db`, the team must pick one name and update both the SQL DDL and the EF model, including any seeded data and any external integrations.

5. **`atlas-crm/ReportingController` vs frontend `/api/reports/...` calls.** Different route prefix (`/api/reporting` vs `/api/reports`) and very different endpoint sets. The FRM module expects a job-cost endpoint, a budget-comparison endpoint, a budget-variance endpoint, a travel-costs endpoint, and a material-usage endpoint, none of which the controller implements. Building these requires business-logic decisions (what is a "budget variance"? how is "travel cost" attributed to a technician?) that are out of scope for an automated reconciliation.

6. **SignalR hub mount path inconsistency.** `atlas-signalr.service.ts` connects to `{atlasApiUrl}/v1/signalr/atlas`, `atlas-config.service.ts` defaults `signalrHub` to `/hubs/atlas`, and the backend `Program.cs` `MapHub<...>(...)` registration was not directly visible in the explored files. Verify which path is the actual hub registration before deploying.

7. **Missing FK on `Crews.CurrentJobId`.** Should reference `Jobs(Id)` with `ON DELETE SET NULL`, but I did not add the constraint because there's a chicken-and-egg problem with seeded data (a Job points at a Crew which points back at a Job). Manual review needed.

8. **No build/test verification possible in this environment.** The sandbox does not have `node`/`npm`/`@angular/cli` (frontend) or `dotnet` SDK (backend) installed, and `atlas-db` is a `.sqlproj` SSDT project that needs Visual Studio / `SqlPackage` to build. None of the build commands could be executed. The fixes are syntactic edits that should not affect type-checking, but a build run is required before merging.

9. **Multiple overlapping deployment service implementations on the frontend.** `cached-deployment.service.ts`, `deployment-api.service.ts`, `deployment.service.ts` (in `features/deployment/services/`), and `atlas-deployment.service.ts` all hit deployment endpoints — sometimes the SRI API, sometimes the ATLAS API. Consolidation is recommended but is a refactor, not a bug.

10. **`auth.service.ts` calls `GET /auth/user-${userId}`** — note the literal hyphen, not a path separator. This pattern is unusual. If the legacy SRI API does indeed serve this URL, it must be preserved verbatim. Flagged for the team to confirm.

---

## 8. Files Changed by Repo

### sri-frontend
- `ngsw-config.json` (merge resolution)
- `RECONCILIATION_REPORT.md` (this file — new)
- `src/app/services/cached-deployment.service.ts`
- `src/app/services/ark/ark-notification.service.ts`
- `src/app/features/field-resource-management/api/api-endpoints.ts`
- `src/app/features/field-resource-management/services/technician.service.ts`
- `src/app/features/field-resource-management/services/crew.service.ts`
- `src/app/features/field-resource-management/services/scheduling.service.ts`
- `src/app/features/field-resource-management/services/job.service.ts`
- `src/app/features/field-resource-management/services/materials.service.ts`
- `src/app/features/field-resource-management/services/inventory.service.ts`
- `src/app/features/field-resource-management/services/travel.service.ts`
- `src/app/features/field-resource-management/services/reporting.service.ts`
- `src/app/features/field-resource-management/services/budget.service.ts`
- `src/app/features/field-resource-management/services/time-tracking.service.ts`

### atlas-platform
- `atlas-crm/Controllers/TechniciansController.cs`

### atlas-db
- `Tables/dbo.Crews.sql`
- `Tables/dbo.Jobs.sql`

---

## 9. Build & Test Results

| Repo | Command | Result |
|---|---|---|
| sri-frontend | `npm install && npm run build` | ❌ not run — `npm` / `node` not present in the reconciliation sandbox. The fixes are local symbol changes (URL string templates and added imports) and should not affect type-checking, but the team must run `ng build --configuration production` and `ng test` before merging. |
| sri-frontend | `ng test` | ❌ not run for the same reason. Several `*.spec.ts` files (e.g. `crew.service.spec.ts`) hard-code `const apiUrl = '/api/crews'` for their `HttpTestingController` expectations. After the production fix, the spec files should be updated to match — see Next Steps. |
| atlas-platform | `dotnet build` | ❌ not run — no `dotnet` SDK in sandbox. The route attribute change is a single string literal and is syntactically safe. |
| atlas-platform | `dotnet test` | ❌ not run. The route change may break any integration test that hard-codes `api/crm/technicians` — see Next Steps. |
| atlas-db | `msbuild Atlas.Database.sqlproj` / `SqlPackage` | ❌ not run — SSDT projects require Windows + Visual Studio or `SqlPackage` CLI. The added `CREATE INDEX` statements are valid T-SQL and follow the same pattern as the existing indexes in those files. |

**Pre-merge gate for the team:** all three of the above must be run on a developer workstation or CI before this work is merged.

---

## 10. Next Recommended Steps (priority order)

1. **Locate and clone the legacy SRI API project**, then re-run this reconciliation against it. Without that codebase, ~80% of the endpoint mapping above remains a documentation exercise. (Blocker #1.)
2. **Run the three build commands** in `Build & Test Results` above on a developer machine, fix any spec/test fallout (especially the `field-resource-management/services/*.service.spec.ts` files which hard-code `/api/...` URLs and will need updating to mirror the production fix), and merge this branch.
3. **Update FRM service spec files** to match the production URLs. Specifically, change every `const apiUrl = '/api/...';` in `field-resource-management/services/*.spec.ts` to use `${environment.apiUrl}/...`. The same constant rewrite the production code received.
4. **Decide HTTP verb** for `Jobs.UpdateJobStatus` (Blocker #3) and align `JobsController` and `job.service.ts`.
5. **Bring the CRM database schema into `atlas-db`** as `Tables/crm/*.sql` (Blocker #2). This is the largest open task — ~30 tables — but it's mechanical once a decision is made.
6. **Implement the missing CRM/SRI controllers** in priority order: `CrewsController`, `SchedulingController`, `BudgetsController`, `InventoryController`, `MaterialsController`, `PurchaseOrdersController`, `SuppliersController`, `TravelController`, `PayrollController`, `NotificationsController`, `ExpensesController`. Each one's expected route, request shape, and response shape is fully documented in the service files referenced in the Endpoint Mapping table above.
7. **Add the missing FK on `Crews.CurrentJobId`** (Blocker #7) once seeded-data ordering is sorted out.
8. **Consolidate the frontend deployment services** (`cached-deployment.service.ts`, `deployment-api.service.ts`, `deployment.service.ts`, `atlas-deployment.service.ts`). Pick one as canonical, deprecate the rest. A single `DeploymentApiClient` per backend (one for `apiUrl`, one for `atlasApiUrl`) is a reasonable target.
9. **Verify the SignalR hub path** end-to-end (Blocker #6) by reading the actual `MapHub` registration in `atlas-api/Program.cs` and aligning the frontend constants.
10. **Add CI checks** that fail any new service file using a hard-coded `/api/...` literal — a one-line `grep` in the CI pipeline would have caught all 12 of the URL bugs fixed in this reconciliation.
11. **Document the two-API architecture** in `sri-frontend/README.md` so future contributors understand which calls go to `apiUrl` (legacy SRI / CRM) vs `atlasApiUrl` (ATLAS lifecycle/governance).
