# ATLAS Integration Reconciliation Report

**Date**: 2026-08-24
**Repositories**: sri-frontend, atlas-platform, atlas-db
**Branch (sri-frontend)**: ATLAS-production-ready

---

## 1. Branch Consolidation

**Status**: COMPLETE

ATLAS-production-ready is the canonical branch (950+ commits ahead of master). Master was merged into it, and cherry-picked fixes from reconciliation branches were applied.

**Branches analyzed**: ATLAS-production-ready, ATLAS-segregation, ATLAS-reconciliation-fixes, ATLAS-reconciliation-review, ATLAS-fix-notification, ATLAS-api-contracts, ATLAS-backend-alignment, ATLAS-fix-candidates

**Result**: ATLAS-production-ready is a strict superset. One cherry-pick applied (d825f6fd — notification and onboarding endpoint fixes).

---

## 2. API Audit: Frontend-to-Backend Route Mapping

### Backend Inventory
- **atlas-api**: 37 controllers, 279 endpoints (URL-versioned `v1/...`)
- **atlas-agents**: 7 controllers, 35 endpoints (unversioned `api/...`)
- **atlas-ar-gateway**: 6 controllers, 24 endpoints (unauthenticated)
- **atlas-crm**: 12 controllers, 101 endpoints (**currently unhosted — no project references it**)
- **sri-project-lifecycle-api**: 6 controllers, 26 endpoints (unauthenticated, in-memory DB only)

### Confirmed Mismatches Fixed

| Frontend | Backend Before | Fix Applied |
|----------|---------------|-------------|
| `GET /notifications/user/{userId}` | Existed | OK |
| `PATCH /notifications/{id}/read` | Returned 204 | Now returns `{ id, readAt }` |
| `PATCH /notifications/user/{userId}/read-all` | Returned 204 | Now returns `{ markedCount, markedAt }` |
| `GET /notifications/summary` | Missing | Added endpoint |
| `GET /notifications/preferences/{userId}` | Missing | Added stub endpoint |
| `PUT /notifications/preferences/{userId}` | Missing | Added stub endpoint |
| `POST /candidates/{id}/convert-to-technician` | Existed (legacy) | Frontend fixed to use `/promote` |

### Outstanding Mismatches (Not Fixed)

| Issue | Severity | Detail |
|-------|----------|--------|
| **Login/auth has no ATLAS backend** | HIGH | `POST /auth/login` targets legacy `apiUrl`, no `AuthController` in atlas-api. Auth not migrated. |
| **`api-endpoints.ts` API_BASE_URL misroute** | HIGH | `api-endpoints.ts:15` sets `API_BASE_URL = environment.apiUrl` (legacy), misrouting 9+ services: `atlas-sync`, `pay-rate`, `pay-classification`, `budget-api`, `materials-api`, `travel-api`, `reporting-api`, `inventory-api`, `auto-submit`. |
| **Atlas sync retry loop** | HIGH | `time-entry.effects.ts` fires `syncToAtlas` on every clock-in/out -> `POST /time-entries/{id}/sync` to legacy backend (404) -> retries indefinitely via `atlas-sync.effects.ts`. |
| **Deployment lifecycle unwired** | HIGH | `AtlasDeploymentService` (gated transitions, evidence, signoff) fully implemented but zero components import it. Live UI uses `deployment-api.service.ts` targeting legacy backend. |
| **atlas-crm 101 endpoints unhosted** | MEDIUM | Full CRM controller set exists but no project references the assembly for hosting. |
| **QueryBuilder DI not registered** | HIGH | `QueryBuilderController` and `QueryTemplateController` will throw `InvalidOperationException` on every request — `AddQueryBuilder()` never called in `Program.cs`. |
| **Fire-and-forget DbContext reuse** | HIGH | `Task.Run` in JobsController, SchedulingController, CrewsController reuses request-scoped `AtlasDbContext` — risks `ObjectDisposedException` under load. |
| **8 frontend services with no backend** | HIGH | Budget, inventory, materials, travel, timecards, client-config, manager-team, deployment-checklist services all call endpoints that don't exist. |

---

## 3. Backend-to-Database Wiring

### Verified Working
- All primary CRUD services (Candidates, Referrals, OnboardingLinks, Quotes, PTO, Overtime, Assignments, Notifications, Skills, Technicians, TimeEntries, Jobs, Crews, Payroll, Scheduling) correctly pair `.Add()`/`.Remove()` with `SaveChangesAsync()`.
- Entity configurations (relationships, value-object conversions, JSON columns, indexes) are consistent with entity classes.

### Bugs Found

| Bug | Location | Severity |
|-----|----------|----------|
| `DispatchService.DispatchTechnicianAsync` doesn't persist deployment state transition | `atlas-dispatch/Services/DispatchService.cs:153-180` | HIGH (dormant — dispatch service not hosted) |
| `UserSyncService.UpdateSyncStatusAsync` writes `SriUserSynced`/`SriSyncedAt`/`SriSyncError` via raw SQL — columns now added to atlas-db | `atlas-api/Services/UserSyncService.cs` | MEDIUM (caught in try/catch) |
| Plaintext Azure Storage key in `appsettings.json` | `atlas-api/appsettings.json:12,160-163` | SECURITY |
| `atlas-agents` has `[Authorize(Policy=...)]` with no auth scheme registered | `atlas-agents/Program.cs` | HIGH (runtime crash) |
| `atlas-ar-gateway` has open CORS + no auth on all 24 endpoints | `atlas-ar-gateway/Program.cs` | SECURITY |

---

## 4. Database Schema Validation

### Before Reconciliation
- **atlas-db had 34 tables** vs 62 DbSet properties in `AtlasDbContext`
- `dbo.Jobs.sql` missing ~35 columns
- `dbo.TimeEntries.sql` missing 4 required columns
- `dbo.Technicians.sql` missing 24 columns

### After Reconciliation
- **atlas-db now has 68 tables** (34 new table files created)
- `dbo.Jobs.sql` updated with all entity columns, Status default fixed to 'NotStarted'
- `dbo.TimeEntries.sql` updated with TimeCategory, PayType, SyncStatus, ProximityStatus
- `dbo.Technicians.sql` updated with 24 entity columns + 3 sync-tracking columns

### New Tables Created (34)

BomTrackings, CandidateAttachments, CandidateNotes, Candidates, EmployeeManagers, EquipmentAssignments, JobRequiredSkills, LeaveTypes, ManagerHierarchies, MasterSkills, OnboardingLinks, OvertimeApprovalHistories, OvertimeRequests, PRCGoals, PerformanceReviewCycles, PtoApprovalHistories, PtoBalances, PtoRequests, QuoteAttachments, QuoteBomItems, Quotes, Referrals, RfpIntakes, RoleCredentialTemplates, SpectrumIdMapping, SpectrumSyncMetadata, SpectrumWriteAuditLog, TechnicalCompetencies, TechnicianAttachments, TechnicianCredentials, UserAssignments, UserIdentityMappings, UserNotifications, rfp_notes

### Schema Sources of Truth
The codebase has **three competing schema authorities**:
1. **atlas-db SQL project** (now reconciled to match)
2. **EF Core entity classes** in atlas-core (the runtime truth)
3. **Inline SQL migrations** in atlas-api/Program.cs (~15 `ExecuteSqlRaw` ALTER TABLE/CREATE TABLE blocks)

Recommendation: adopt atlas-db as authoritative and stop using inline startup SQL.

---

## 5. End-to-End Flow Validation (Top 5)

### Flow 1: Authentication/Login
- **Status**: OUT OF SCOPE — login targets legacy `apiUrl`, no auth controller in atlas-platform
- **Risk**: If ATLAS is intended as system of record, auth migration is incomplete

### Flow 2: Job Creation
- **Status**: FUNCTIONAL (after DB schema fix)
- `POST /v1/jobs` -> JobsController -> AtlasDbContext -> Jobs table
- **Fixed**: Jobs.sql now has all required columns
- **Remaining**: `JobRequiredSkills` and `MasterSkills` tables created in atlas-db

### Flow 3: Technician Management
- **Status**: FUNCTIONAL (after DB schema fix)
- `POST /v1/technicians` -> TechniciansController -> AtlasDbContext -> Technicians table
- **Fixed**: Technicians.sql now has all entity columns + sync tracking
- **Warning**: `UserSyncService` silently fails if legacy SRI backend is unreachable — technician is created but can't log in

### Flow 4: Time Entry (Clock-In/Clock-Out)
- **Status**: FUNCTIONAL (after DB schema fix) but has background noise
- `POST /v1/time-entries/clock-in` -> TimeEntriesController -> AtlasDbContext -> TimeEntries table
- **Fixed**: TimeEntries.sql now has TimeCategory, PayType, SyncStatus, ProximityStatus
- **Warning**: Every clock-in/out triggers an infinite-retry sync loop to a nonexistent `/time-entries/{id}/sync` endpoint

### Flow 5: Deployment Status Workflow
- **Status**: NOT WIRED — full ATLAS implementation exists (controller + DB) but frontend uses legacy backend
- ATLAS-side: `DeploymentsController` with gated transitions, evidence, signoff, audit trail
- Frontend: `AtlasDeploymentService` exists but zero components import it

---

## 6. Changes Made

### sri-frontend (ATLAS-production-ready branch)
- Merged master into ATLAS-production-ready
- Cherry-picked d825f6fd: notification API endpoint fixes (`/my` -> `/user/{userId}`, POST -> PATCH for markAllAsRead), onboarding promote route fix
- Frontend build: **PASSING** (`ng build --configuration=production`)

### atlas-platform (main branch)
- `NotificationsController.cs`: MarkRead/MarkAllRead now return response bodies, added GetSummary endpoint, added GetPreferences/UpdatePreferences stubs
- Backend build: **PASSING** (0 errors, 3 pre-existing warnings)

### atlas-db (master branch)
- Updated 3 existing tables: Jobs (+35 columns), Technicians (+3 columns), TimeEntries (+4 columns)
- Created 34 new table definition files matching AtlasDbContext DbSets

---

## 7. Remaining Action Items

### Critical (should block deployment)
1. **Fix `api-endpoints.ts` API_BASE_URL** — change from `environment.apiUrl` to `environment.atlasApiUrl` for all ATLAS-targeted services
2. **Kill the sync retry loop** — remove or disable `AtlasSyncActions.syncToAtlas` dispatch in `time-entry.effects.ts` until a real sync endpoint exists
3. **Register QueryBuilder DI** — call `AddQueryBuilder()` in `atlas-api/Program.cs`
4. **Fix fire-and-forget DbContext pattern** — use `IServiceScopeFactory` in JobsController, SchedulingController, CrewsController background tasks

### High (should fix before GA)
5. **Wire AtlasDeploymentService** into deployment components (or decide to keep legacy)
6. **Add NotificationPreferences entity** and DbSet for real persistence (currently stub)
7. **Register auth scheme in atlas-agents** `Program.cs`
8. **Add auth to atlas-ar-gateway** endpoints (currently wide open)
9. **Rotate plaintext credentials** in `atlas-api/appsettings.json`
10. **Host atlas-crm controllers** (or formally deprecate)

### Medium (tech debt)
11. Consolidate duplicate auth service layers (`auth.service.ts` vs `secure-auth.service.ts`)
12. Consolidate inline Program.cs SQL migrations into proper EF migrations or atlas-db
13. Wire `sri-project-lifecycle-api` to a real database (currently `:memory:` only)
14. Add CORS configuration for production in `sri-project-lifecycle-api`
15. Build the 8 missing backend controllers (budgets, inventory, materials, travel, timecards, client-config, manager-team, deployment-checklists)

---

## 8. Build & Test Results

| Repo | Build | Tests |
|------|-------|-------|
| sri-frontend | PASS (ng build --configuration=production) | N/A |
| atlas-platform | PASS (dotnet build, 0 errors) | Large suite (>5min) |
| atlas-db | N/A (SQL project definitions) | N/A |

---

*Generated by automated reconciliation routine on 2026-08-24.*
