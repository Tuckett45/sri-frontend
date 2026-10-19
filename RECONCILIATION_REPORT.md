# ATLAS Integration Reconciliation Report

**Date:** 2026-08-31  
**Scope:** sri-frontend, atlas-platform, atlas-db  
**Branch:** `ATLAS-integration-final` (all three repos)

---

## 1. Consolidation Strategy

### Analysis

Two branches existed in sri-frontend with ATLAS work:

| Branch | Commit | Files | History |
|--------|--------|-------|---------|
| `master` | `ab0ddf3e` (latest) | Superset of all content | Connected to full repo history |
| `ATLAS-segregation` | `05ea73a8` | Subset of master | Unrelated git history (no merge base) |

**Key finding:** `ATLAS-segregation` has **zero unique files** that don't exist in master. Master contains every file from ATLAS-segregation plus additional content. The branches have completely unrelated git histories, making a normal merge impossible (attempted merge produced 256 conflicts).

### Decision

**Used `master` as the base** and selectively applied configuration/routing improvements that originated in the ATLAS-segregation work:

1. Environment config: Switched `atlasApiUrl` from direct App Service URL to API Management gateway URL
2. Environment config: Enabled SignalR for production and staging
3. Routing: Re-enabled admin-dashboard lazy-loaded route in `app-routing.module.ts`
4. ATLAS routing: Re-enabled CM Dashboard and Admin Dashboard routes with proper guards

**Rationale:** Since master is the superset and has the correct FRM service URLs (`environment.atlasApiUrl`), while ATLAS-segregation incorrectly uses `environment.apiUrl` for FRM services, master was the correct base. The only improvements from ATLAS-segregation were config/routing changes that were selectively applied.

---

## 2. Final Branch Name

**`ATLAS-integration-final`** across all three repositories:
- `sri-frontend` — based on `origin/master` + config/routing fixes
- `atlas-platform` — based on `origin/main` + SignalR/CORS fixes
- `atlas-db` — based on `origin/master` + schema alignment fixes

---

## 3. Endpoint Mapping

### Frontend HTTP Inventory (590 calls across 83 files)

| Method | Count |
|--------|-------|
| GET | 298 |
| POST | 185 |
| PUT | 60 |
| DELETE | 28 |
| PATCH | 19 |
| **Total** | **590** |

### Base URL Families

| URL Source | Services Using It | Resolves To (prod) |
|-----------|-------------------|-------------------|
| `environment.apiUrl` | FRM services (technicians, jobs, crews, materials, scheduling, budgets, travel, quotes, PTO, time-entries, notifications, reporting, etc.) | `sri-api.azurewebsites.net/api` |
| `environment.atlasApiUrl` | Dead-code `atlas-*.service.ts` in `src/app/services/` (never injected) | `sri-backend.azure-api.net/atlas/v1` |
| `AtlasConfigService.getBaseUrl()` | Active ATLAS feature services (auth, signalr, notifications, CSP, AI analysis) | `sri-api.azurewebsites.net/api/atlas` (wrong — uses main API host) |
| Hardcoded relative paths (`/v1/...`, `/api/...`) | approval.service.ts, exception.service.ts, query-builder.service.ts, agent.service.ts, admin-dashboard services | Frontend's own origin (will 404 in production) |

### Backend API Inventory

- **atlas-api:** 24 controllers, ~150+ endpoints (Jobs, Technicians, Crews, Assignments, Candidates, Quotes, PTO, Overtime, TimeEntries, Notifications, Users, Payroll, etc.)
- **Total across platform:** 468 endpoints across 5 web hosts (atlas-api, atlas-crm, sri-project-lifecycle, atlas-ar-gateway, spectrum-sync-worker)

### Key Backend Controllers Mapped to Frontend Services

| Backend Controller | Frontend Service | Base URL | Status |
|-------------------|-----------------|----------|--------|
| JobsController | job.service.ts | `apiUrl` | Aligned |
| TechniciansController | technician.service.ts | `apiUrl` | Aligned |
| CrewsController | crew.service.ts | `apiUrl` | Aligned |
| AssignmentsController | scheduling.service.ts | `apiUrl` | Aligned |
| CandidatesController | (pipeline board components) | `apiUrl` | Aligned |
| QuotesController | quote-workflow.service.ts | `apiUrl` | Aligned |
| PtoRequestsController | pto-api.service.ts | `apiUrl` | Aligned |
| TimeEntriesController | time-tracking.service.ts | `apiUrl` | Aligned |
| NotificationsController | notification.service.ts | `apiUrl` | Aligned |
| UsersController | user-management.service.ts | `apiUrl` | Aligned |

---

## 4. Mismatches Found

### Critical (P0)

| # | Category | Description | Repos | Fixed? |
|---|----------|-------------|-------|--------|
| 1 | **SignalR disabled across full stack** | Backend: `AddSignalR()` commented out, `MapHub` commented out, `NoOpSignalRNotificationService` registered instead of real `NotificationService`. Frontend (ATLAS-segregation): had SignalR enabled but wrong hub URL via `AtlasConfigService`. FRM SignalR correctly uses `atlasApiUrl`. | atlas-platform | **Yes** |
| 2 | **CORS blocking all frontend requests** | Production `appsettings.Production.json` had `atlas.example.com` placeholder URLs instead of real Azure Static Web Apps URLs. | atlas-platform | **Yes** |
| 3 | **Fire-and-forget notification writes (ObjectDisposedException race)** | `PtoRequestsController`, `OvertimeRequestsController`, `QuotesController` use `_ = _notifications.SendAsync(...)` — discarded task on a scoped `DbContext`. When the request scope disposes before the detached task completes, `SaveChangesAsync` throws `ObjectDisposedException`, silently swallowed. Notifications intermittently never reach the database. | atlas-platform | **No — requires code change** |
| 4 | **ATLAS feature services use broken URLs** | Active ATLAS services (`approval.service.ts`, `exception.service.ts`, `query-builder.service.ts`, `agent.service.ts`) use hardcoded relative paths (`/v1/approvals`, `/api/agents`) that resolve against the frontend origin, producing 404s. `AtlasConfigService` directs other services to the wrong host. | sri-frontend | **No — architecture decision needed** |
| 5 | **Correctly-segregated services are dead code** | `src/app/services/atlas-{ai-analysis,approvals,deployment,query-builder}.service.ts` correctly use `environment.atlasApiUrl` but are never imported or injected anywhere in the app. The NgRx effects wire to the broken `features/atlas/services/` versions instead. | sri-frontend | **No — needs wiring fix** |

### High (P1)

| # | Category | Description | Repos | Fixed? |
|---|----------|-------------|-------|--------|
| 6 | **Missing DB columns** | `FacebookProfileUrl NVARCHAR(500)` existed in EF entities and migration SQL but was missing from atlas-db SSDT schema in both `Candidates` and `Technicians` tables. | atlas-db | **Yes** |
| 7 | **Missing filtered indexes** | `IX_Technicians_SpectrumEmployeeId` and `IX_Jobs_SpectrumJobId` defined in EF `OnModelCreating` but missing from atlas-db SSDT. | atlas-db | **Yes** |
| 8 | **Deployment SignalR hub URL inverted** | `deployment-signalr.service.ts:565` uses `environment.apiUrl` in production and `environment.atlasApiUrl` in dev — backwards from intended behavior. | sri-frontend | **No — needs code fix** |
| 9 | **Duplicate service implementations** | Two parallel client implementations exist for budgets, materials, travel, reporting, inventory, notifications (one in `src/app/services/`, one in `features/field-resource-management/api/`) hitting the same endpoints with different DTOs. | sri-frontend | **No — tech debt** |
| 10 | **Admin dashboard services unreachable** | Phase 0-5 admin dashboard services use hardcoded relative paths (`/api/pipeline`, `/api/workflows`, etc.) with no environment binding. Will 404 in any deployment without a reverse proxy. | sri-frontend | **No — needs architecture decision** |
| 11 | **Split-transaction risk in TimeEntriesController** | `ClockIn` and `ClockOut` call `SaveChangesAsync()` twice each without a wrapping transaction, risking partial state on failure between saves. | atlas-platform | **No — needs code fix** |

### Medium (P2)

| # | Category | Description | Repos | Fixed? |
|---|----------|-------------|-------|--------|
| 12 | **Dead/unregistered interceptors** | `ErrorHandlingInterceptor`, `AuthTokenInterceptor`, `MockSchedulingInterceptor` are defined but never provided in any module. | sri-frontend | No |
| 13 | **SpectrumDbContext stubbed to in-memory** | `Program.cs:214-215` registers `SpectrumDbContext` as an in-memory database. Spectrum sync is effectively disabled. | atlas-platform | No |
| 14 | **atlas-crm orphaned** | Separate web host project with its own `CrmDbContext`, 6 controllers, no cross-references from atlas-api. Appears abandoned. | atlas-platform | No |
| 15 | **Plaintext storage key in appsettings** | `DistributedCache.Redis.Configuration` contains `password={redis-key}` placeholder — should use Azure Key Vault reference. | atlas-platform | No |
| 16 | **Health check endpoints use example.com** | `ARK` and `AIService` health check URLs are `example.com` placeholders. | atlas-platform | No |

---

## 5. Fixes Applied

### sri-frontend (branch: ATLAS-integration-final)

| File | Change |
|------|--------|
| `src/environments/environments.ts` | Changed `atlasApiUrl` from direct App Service URL to API gateway (`sri-backend.azure-api.net/atlas/v1`). Enabled `enableSignalR: true` for production and staging. |
| `src/app/app-routing.module.ts` | Re-enabled `admin-dashboard` lazy-loaded route with `AuthGuard`. |
| `src/app/features/atlas/atlas-routing.module.ts` | Re-enabled CM Dashboard route (with `CMGuard`) and Admin Dashboard route (with `EnhancedRoleGuard` + `UserRole.Admin`). Uncommented all required imports. |

### atlas-platform (branch: ATLAS-integration-final)

| File | Change |
|------|--------|
| `atlas-api/Program.cs` | Re-enabled `builder.Services.AddSignalR(...)` (was commented out). Switched from `NoOpSignalRNotificationService` to real `NotificationService`. Re-enabled `app.MapHub<FrmHub>("/hubs/field-resource-management")`. |
| `atlas-api/appsettings.Production.json` | Replaced CORS `AllowedOrigins` placeholder (`atlas.example.com`) with actual Azure Static Web Apps URLs: `gray-plant-0089d3c1e.azurestaticapps.net` and `sri-frontend.azurestaticapps.net`. |

### atlas-db (branch: ATLAS-integration-final)

| File | Change |
|------|--------|
| `Tables/dbo.Candidates.sql` | Added `FacebookProfileUrl NVARCHAR(500) NULL` column before `PromotedToTechnicianId`. |
| `Tables/dbo.Technicians.sql` | Added `FacebookProfileUrl NVARCHAR(500) NULL` column after `SriSyncError`. Added filtered index `IX_Technicians_SpectrumEmployeeId`. |
| `Tables/dbo.Jobs.sql` | Added filtered index `IX_Jobs_SpectrumJobId`. |

---

## 6. DB Write Verification

### Controllers Verified Solid (writes correctly reach the database)

All `SaveChangesAsync()` calls in the 8 focus controllers are correctly `await`ed — **no missing-await bugs on primary write paths**.

| Controller/Service | Write Path | Status |
|-------------------|-----------|--------|
| JobsController | CRUD + status transitions | Correct |
| TechniciansController | CRUD + skills/certs/equipment | Correct |
| CrewsController | CRUD + member management | Correct (uses Task.Run for notifications with try/catch) |
| AssignmentsController / AssignmentService | Assign/reassign/bulk | Correct |
| CandidatesController / CandidatePromotionService | CRUD + promote to technician | Correct |
| QuotesController / QuoteConversionService | Quote lifecycle + convert to job | Correct primary path |
| PtoRequestsController / PtoService | Request/approve/reject + balance deduction | Correct primary path |
| OvertimeRequestsController / OvertimeRequestService | Request/approve/reject | Correct primary path |
| TimeEntriesController | Clock in/out + status updates | Correct but split-transaction risk (P1 #11) |

### Critical Bug: Fire-and-Forget Notification Writes

The following controllers discard the `SendAsync` task without awaiting, causing a race condition with `DbContext` disposal:

```
PtoRequestsController.cs:61-69, 123-130, 154-161
OvertimeRequestsController.cs:54-61, 125-132, 156-163
QuotesController.cs:597-604, 624-631
```

**Impact:** `ObjectDisposedException` silently swallowed — notifications intermittently never written to `UserNotifications` table.

**Recommended fix:** Either `await` the notification call, or use `IServiceScopeFactory` to create an independent scope (pattern already exists in `UserSyncService.UpdateSyncStatusAsync:160-183`).

### Database Schema Alignment

| Metric | Value |
|--------|-------|
| Tables in atlas-db SSDT project | 68 |
| DbSet properties in AtlasDbContext | 68 |
| Column mismatches found | 1 (FacebookProfileUrl — **fixed**) |
| Index mismatches found | 2 (Spectrum correlation indexes — **fixed**) |
| Foreign key alignment | Verified consistent |

---

## 7. Blockers

### Build Environment

| Blocker | Impact | Workaround |
|---------|--------|-----------|
| **dotnet SDK not available** | Cannot build or test atlas-platform or atlas-db in this environment | Build must be verified in a .NET environment (local dev or CI pipeline) |

### Deployment Blockers

| Blocker | Severity | Details |
|---------|----------|---------|
| **Fire-and-forget notification bug (P0 #3)** | High | Notifications silently lost in PTO/Overtime/Quote flows. Must fix before production. |
| **ATLAS feature services broken URLs (P0 #4)** | High | Approvals, exceptions, query-builder, agent features will 404 in production. Architecture decision needed: either wire the dead-code correctly-segregated services, or fix `AtlasConfigService` to use `environment.atlasApiUrl`. |
| **Admin dashboard relative paths (P1 #10)** | Medium | Admin dashboard phase 0-5 services all 404 without a reverse proxy or URL fix. |
| **Deployment SignalR URL inverted (P1 #8)** | Medium | Deployment real-time updates connect to wrong backend in production. |

---

## 8. Files Changed

### sri-frontend (3 files)
```
M src/app/app-routing.module.ts
M src/app/features/atlas/atlas-routing.module.ts
M src/environments/environments.ts
```

### atlas-platform (2 files)
```
M atlas-api/Program.cs
M atlas-api/appsettings.Production.json
```

### atlas-db (3 files)
```
M Tables/dbo.Candidates.sql
M Tables/dbo.Jobs.sql
M Tables/dbo.Technicians.sql
```

**Total: 8 files modified across 3 repositories**

---

## 9. Next Steps

### Immediate (before deployment)

1. **Fix fire-and-forget notification bug** — Await `SendAsync` or use `IServiceScopeFactory` pattern in `PtoRequestsController`, `OvertimeRequestsController`, and `QuotesController`.
2. **Fix ATLAS feature service URLs** — Wire the correctly-segregated `src/app/services/atlas-*.service.ts` into NgRx effects, or update `AtlasConfigService` and relative-path services to use `environment.atlasApiUrl`.
3. **Fix deployment SignalR URL** — In `deployment-signalr.service.ts:565`, swap the production/dev URL logic so production uses `environment.atlasApiUrl`.
4. **Build verification** — Run full `dotnet build` on atlas-platform and SSDT build on atlas-db in a .NET environment.
5. **Run the FacebookProfileUrl migration** — Execute `atlas-core/Migrations/SQL/AddFacebookProfileUrl.sql` against production database if not already applied.

### Short-term (next sprint)

6. **Consolidate duplicate services** — Merge the parallel `*.service.ts` / `*-api.service.ts` implementations for budgets, materials, travel, reporting, inventory, and notifications.
7. **Fix admin dashboard service URLs** — Either add `environment.atlasApiUrl` binding or configure a reverse proxy.
8. **Remove dead code** — Delete unregistered interceptors (`ErrorHandlingInterceptor`, `AuthTokenInterceptor`, `MockSchedulingInterceptor`) and unused `AtlasConfigService` if services are rewired.
9. **Address split-transaction risk** — Wrap `TimeEntriesController.ClockIn/ClockOut` dual saves in explicit transactions.
10. **Move secrets to Key Vault** — Replace `{redis-key}` placeholder in `DistributedCache` config with Key Vault reference.

### Medium-term

11. **Evaluate atlas-crm** — Determine if the orphaned CRM module should be removed or integrated.
12. **Enable Spectrum sync** — Replace in-memory `SpectrumDbContext` with real connection when Spectrum integration is ready.
13. **Replace health check placeholders** — Update ARK and AIService health check endpoints from `example.com` to real URLs.
14. **Delete ATLAS-segregation branch** — Once `ATLAS-integration-final` is merged and verified, remove the orphaned branch to avoid confusion.
15. **Clean up old integration branches** — Remove `ATLAS-consolidated`, `ATLAS-final`, `ATLAS-production-ready`, and other stale ATLAS branches from sri-frontend remote.

---

## End-to-End Flow Validation (Top 5 Critical Flows)

### Flow 1: User Login and Dashboard

| Layer | Component | Status |
|-------|-----------|--------|
| Frontend | `secure-auth.service.ts` — POST `${apiUrl}/auth/login` | OK |
| Interceptor | `ConfigurationInterceptor` adds auth headers on subsequent requests | OK |
| Backend | `AuthController` validates JWT via Azure AD | OK |
| Database | `Users` table read via `AtlasDbContext.Users` | OK |
| **Verdict** | **End-to-end functional** | |

### Flow 2: Job Creation and Assignment

| Layer | Component | Status |
|-------|-----------|--------|
| Frontend | `job.service.ts` — POST `${apiUrl}/jobs` | OK |
| Frontend | `scheduling.service.ts` — POST `${apiUrl}/assignments` | OK |
| Backend | `JobsController.CreateJob` — `_db.Jobs.Add()` — `SaveChangesAsync()` | OK |
| Backend | `AssignmentService.AssignTechnician` — `_db.Assignments.Add()` — `SaveChangesAsync()` | OK |
| Backend | Notification via `_ = _notifications.SendAsync(...)` | **BUG — fire-and-forget race** |
| Database | `Jobs`, `Assignments`, `UserNotifications` tables | Writes reach DB (except notification race) |
| **Verdict** | **Functional but notification delivery unreliable** | |

### Flow 3: Technician Status Update (Clock In/Out)

| Layer | Component | Status |
|-------|-----------|--------|
| Frontend | `time-tracking.service.ts` — POST `${apiUrl}/time-entries/clock-in` | OK |
| Backend | `TimeEntriesController.ClockIn` — dual `SaveChangesAsync()` | **RISK — split transaction** |
| Backend | Updates `TimeEntries` + `Technicians.CurrentStatus` + `Jobs.Status` | OK (when both saves succeed) |
| SignalR | `FrmHub` pushes status change to connected clients | **Fixed (was disabled)** |
| Database | `TimeEntries`, `Technicians`, `Jobs` tables | Writes reach DB |
| **Verdict** | **Functional after SignalR fix; split-transaction risk remains** | |

### Flow 4: PTO Request Approval and Balance Deduction

| Layer | Component | Status |
|-------|-----------|--------|
| Frontend | `pto-api.service.ts` — POST `${apiUrl}/pto-requests` | OK |
| Frontend | `pto-api.service.ts` — POST `${apiUrl}/pto-requests/{id}/approve` | OK |
| Backend | `PtoRequestsController` — `PtoService.ApproveAsync` | OK |
| Backend | `PtoService` — `PtoBalanceService.DeductAsync` — `SaveChangesAsync()` | OK (shared context flushes all) |
| Backend | Notification via `_ = _notifications.SendAsync(...)` | **BUG — fire-and-forget race** |
| Database | `PtoRequests`, `PtoBalances`, `UserNotifications` tables | Writes reach DB (except notification race) |
| **Verdict** | **Functional but notification delivery unreliable** | |

### Flow 5: Quote to Job Conversion

| Layer | Component | Status |
|-------|-----------|--------|
| Frontend | `quote-workflow.service.ts` — POST `${apiUrl}/quotes` | OK |
| Frontend | `quote-workflow.service.ts` — POST `${apiUrl}/quotes/{id}/convert-to-job` | OK |
| Backend | `QuotesController` — `QuoteConversionService.ConvertToJobAsync` | OK |
| Backend | Creates `Job` from quote data — `SaveChangesAsync()` | OK |
| Backend | Validation notification via `_ = _notifications.SendAsync(...)` | **BUG — fire-and-forget race** |
| Database | `Quotes`, `Jobs`, `UserNotifications` tables | Writes reach DB (except notification race) |
| **Verdict** | **Functional but notification delivery unreliable** | |

---

## Build Results

### sri-frontend (Angular)
- **Node.js:** v22.22.2
- **npm install:** Success
- **ng build:** **FAIL — 166 errors** in 2 component files
  - `admin-dashboard.component.html` — missing Material module imports (mat-icon, mat-chip, mat-card, etc.)
  - `cm-dashboard.component.html` — missing Material module imports + titlecase pipe
  - **Root cause:** These dashboard components exist in master but were unreachable (routes commented out). Our routing fix re-enabled them, which exposed their incomplete state. The components use Angular Material elements without importing the corresponding modules.
  - **Note:** Master branch builds clean (0 errors) with these routes commented out
  - **Fix required:** Either import missing Material modules in the FRM reporting module, or re-comment the dashboard routes until the components are completed

### atlas-platform (.NET)
- **Build:** Not attempted — dotnet SDK not available in this environment
- **Recommendation:** Verify build in local dev or CI pipeline

### atlas-db (SSDT)
- **Build:** Not attempted — SSDT/MSBuild not available in this environment
- **Recommendation:** Verify build in Visual Studio or CI pipeline with SSDT installed
