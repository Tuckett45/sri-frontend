# ATLAS Integration Reconciliation Report

**Date:** 2026-07-27  
**Branch:** `ATLAS-consolidated`  
**Repositories:** `sri-frontend`, `atlas-platform`, `atlas-db`

---

## 1. Consolidation Strategy

Two divergent ATLAS branches existed in `sri-frontend`:

| Branch | Root Commit | Content Focus |
|--------|------------|---------------|
| `ATLAS-segregation` | `b9704eb2` (orphan, unrelated history) | Core ATLAS platform: FRM services, deployment lifecycle, onboarding, scheduling, crews, timecards, skills, PTO |
| `ATLAS-reconciliation-final` | Descends from `master` | Vendor dashboard additions, environment config with deployed URLs |

**Merge approach:** Created `ATLAS-consolidated` from `ATLAS-reconciliation-final`, then merged `ATLAS-segregation` with `--allow-unrelated-histories`. Resolved 175 add/add conflicts:

- **123 FRM conflicts** → accepted `ATLAS-segregation` (core platform features)
- **Non-FRM/non-dashboard conflicts** → accepted `ATLAS-segregation`
- **5 dashboard + model conflicts** → accepted `ATLAS-reconciliation-final` (vendor dashboard additions)
- **environments.ts** → manually resolved keeping deployed URLs from reconciliation-final

**Consolidation commit:** `75401f21`

---

## 2. Final Branch Name

**`ATLAS-consolidated`** — single canonical branch containing all ATLAS platform work from both source branches.

---

## 3. Endpoint Mapping (Frontend → Backend)

### Services using `atlasApiUrl` (ATLAS backend)

| Frontend Service | Base URL | HTTP Calls | Backend Controller | Backend Route | Match? |
|-----------------|----------|------------|-------------------|---------------|--------|
| `atlas-deployment.service.ts` | `atlasApiUrl/deployments` | GET, POST, PUT (list, detail, create, update, transition, evidence, audit, signoff) | `DeploymentsController` | `v1/deployments` | YES |
| `atlas-approvals.service.ts` | `atlasApiUrl/approvals` | GET, POST (authority, request, decision, pending, sufficient, critical-gate, user/approvals) | `ApprovalsController` | `v1/approvals` | YES |
| `atlas-ai-analysis.service.ts` | `atlasApiUrl/ai-analysis` | POST, GET (analyze, risk-assessment, recommendations, agents, validate-operation) | `AIAnalysisController` | `v1/ai-analysis` | YES |
| `atlas-query-builder.service.ts` | `atlasApiUrl/query-builder` | GET, POST, DELETE (data-sources, fields, execute, export, templates) | `QueryBuilderController` + `QueryTemplateController` | `v1/query-builder` + `v1/query-builder/templates` | YES |
| `skill.service.ts` | `atlasApiUrl/skills` | GET, POST, PUT, DELETE (list, detail, create, update, delete, categories) | `SkillsController` | `v1/skills` | YES |
| `onboarding-link.service.ts` | `atlasApiUrl/onboarding/links` | POST, GET (generate, list, revoke) | `OnboardingLinksController` | `v1/onboarding/links` | YES |
| `public-onboarding.service.ts` | `atlasApiUrl/public/onboarding` | GET, POST (validate, submit, start, resume, headshot) | `PublicOnboardingController` | `v1/public/onboarding` | YES |
| `notification-api.service.ts` | `atlasApiUrl/notifications` | GET, PATCH, DELETE (user, unread-count, read, read-all, delete) | `NotificationsController` | `v1/notifications` | YES |
| `my-work.service.ts` | `atlasApiUrl/notifications/my-work` | GET | `NotificationsController` | `v1/notifications/my-work` | YES |
| `location-broadcast.service.ts` | `atlasApiUrl/technicians/{id}/location` | PUT | `TechniciansController` | `v1/technicians/{id}/location` | YES |
| `frm-signalr.service.ts` | `atlasApiUrl/hubs/field-resource-management` | WebSocket (SignalR) | SignalR Hub | `/hubs/field-resource-management` | YES |
| `deployment-signalr.service.ts` | `atlasApiUrl` (conditional) | WebSocket (SignalR) | SignalR Hub | Hub path | YES |
| **`timecard-api.service.ts`** | **`atlasApiUrl/timecards`** | POST, GET (submit, pending, approve, reject, request-correction, history, detail) | **NO CONTROLLER** | — | **NO — missing controller** |
| **`manager-team.service.ts`** | **`atlasApiUrl/managers`** | GET (direct-reports, team-summary) | **NO CONTROLLER** | — | **NO — missing controller** |
| **`job-document-import.service.ts`** | **`atlasApiUrl/jobs/import-document`** | POST | **NO ENDPOINT** | — | **NO — no import-document route on JobsController** |

### Services using `local_environment.apiUrl` (BUG — always hits localhost)

| Frontend Service | Base URL Used | Problem |
|-----------------|--------------|---------|
| `deployment-checklist.service.ts` | `local_environment.apiUrl/jobs` | Calls `https://localhost:44350/v1/jobs` in production |
| `job.service.ts` (FRM) | `local_environment.apiUrl/jobs` | Same — always localhost |
| `notification.service.ts` (FRM) | `local_environment.apiUrl/notifications` | Always localhost |
| `bom-validation.service.ts` | `local_environment.apiUrl/quotes` | Always localhost |
| `budget.service.ts` | `local_environment.apiUrl/budgets` | Always localhost + no BudgetController exists |
| `client-configuration.service.ts` | `local_environment.apiUrl/client-configurations` | Always localhost + no ClientConfigurationController exists |

### Services using `environment.apiUrl` (SRI legacy backend)

| Frontend Service | Base URL | Backend Target |
|-----------------|----------|---------------|
| `cached-deployment.service.ts` | `apiUrl/deployments` | SRI legacy API (not atlas-platform) |
| `daily-report.service.ts` | `apiUrl` based | SRI legacy API |
| `notification.service.ts` (main) | `apiUrl/notifications` | SRI legacy API |
| `workflow.service.ts` | `apiUrl` based | SRI legacy API |
| `reporting.service.ts` | `apiUrl` based | SRI legacy API |
| `ark-notification.service.ts` | `apiUrl/ark/notifications` | SRI legacy API |

---

## 4. Mismatches Found

### CRITICAL — Missing Backend Controllers (Frontend calls with no backend)

| # | Frontend Service | Endpoint Called | Impact |
|---|-----------------|----------------|--------|
| 1 | `timecard-api.service.ts` | `POST /v1/timecards/submit`, `GET /v1/timecards/pending`, etc. | **Entire timecard approval workflow is non-functional.** TimeEntriesController exists at `/v1/time-entries` but with clock-in/clock-out semantics, not timecard submission/approval. |
| 2 | `manager-team.service.ts` | `GET /v1/managers/{id}/direct-reports` | **Manager team view broken.** No ManagersController exists. |
| 3 | `job-document-import.service.ts` | `POST /v1/jobs/import-document` | **Document import non-functional.** JobsController has no import-document endpoint. |
| 4 | `budget.service.ts` | `GET /v1/budgets/job/{jobId}`, `POST /v1/budgets`, etc. | **Budget tracking non-functional.** No BudgetController exists. |
| 5 | `client-configuration.service.ts` | `GET /v1/client-configurations` | **Client configuration non-functional.** No ClientConfigurationController exists. |

### CRITICAL — `local_environment` Bug

6 frontend services import `local_environment` and use its `apiUrl` to construct API base URLs. Since `local_environment.apiUrl` is `https://localhost:44350/v1`, **these services will always fail in production** — the requests go to localhost, not the deployed backend. This is likely accidental (should be `environment.apiUrl` or `environment.atlasApiUrl`).

### HIGH — Missing SQL Tables (28 EF entities not in atlas-db)

| Category | Missing Tables |
|----------|---------------|
| PTO | PtoRequests, PtoApprovalHistories, PtoBalances, LeaveTypes |
| Candidates/Onboarding | Candidates, CandidateNotes, CandidateAttachments, TechnicianAttachments, OnboardingLinks, Referrals, TechnicianCredentials, EquipmentAssignments, TechnicalCompetencies, PerformanceReviewCycles, PrcGoals, RoleCredentialTemplates |
| HR | EmployeeManagers |
| Quotes/RFP | Quotes, QuoteBomItems, QuoteAttachments, QuoteNotes (rfp_notes), RfpIntakes |
| Notifications | UserNotifications |
| Spectrum Sync | SpectrumSyncMetadata, SpectrumIdMappings, SpectrumWriteAuditLogs |
| Skills | MasterSkills, JobRequiredSkills |

These tables are created at runtime by EF migrations or raw SQL in `Program.cs`, not tracked in the `atlas-db` SQL project. The SQL project is **out of sync** with the actual production schema.

### HIGH — Missing Columns in Existing SQL Tables

**Technicians** — 21+ columns missing from SQL definition vs EF model:
`UserId`, `ManagerId`, `CandidateId`, `CurrentStatus`, `FieldStatus`, `StatusUpdatedAt`, `SriUserSynced`, `SriUserId`, `SriSyncError`, `LastClockIn`, `LastClockOut`, `IsCurrentlyClockedIn`, `ActiveJobId`, `SpectrumEmployeeId`, `SpectrumSyncedAt`, `SpectrumSyncStatus`, `HomeState`, `ClockInLatitude`, `ClockInLongitude`, and more.

**Jobs** — 33+ columns missing:
`SiteName`, `SiteStreet`, `SiteCity`, `SiteState`, `SiteZip`, `SiteLatitude`, `SiteLongitude`, `SpectrumJobId`, `SpectrumSyncedAt`, `SpectrumSyncStatus`, `SourceQuoteId`, `ReadinessScore`, `ReadinessStatus`, `ReadinessEvaluatedAt`, and more.

**TimeEntries** — 4+ columns missing:
`TimeCategory`, `IsBillable`, `BillingRate`, `IsApproved`.

### MEDIUM — Security Issues

| # | File | Issue |
|---|------|-------|
| 1 | `atlas-api/appsettings.json` line 12 | Azure Blob Storage account key in plaintext: `AccountKey=IVMQLs...` |
| 2 | `atlas-api/appsettings.json` line 162 | Spectrum DB password in plaintext: `Ch3dd@r#21` (in KeyVault.SecretNames — defeating the purpose of Key Vault) |

### MEDIUM — Production CORS Configuration

Backend `appsettings.json` allows: `https://ark-sri.com`, `https://www.ark-sri.com`, `https://atlas-api-fqfhc6dfgdeboqan.centralus-01.azurewebsites.net`, `http://localhost:4200`.

The frontend `atlasApiUrl` goes through Azure API Management (`https://sri-backend.azure-api.net/atlas/v1`), which handles CORS at the gateway level — so this is likely fine, but the direct App Service URL in CORS is notable.

### LOW — Route Collision

Both `TechniciansController` and `OnboardingTechniciansController` share route prefix `v1/technicians`. They differentiate by sub-route segments but this could cause confusion.

### LOW — MetricsController Route Anomaly

`MetricsController` uses `api/[controller]` pattern instead of versioned `v{version:apiVersion}/` used by all 30 other controllers.

---

## 5. Fixes Applied

### During Branch Consolidation

1. **Resolved 175 merge conflicts** between `ATLAS-segregation` and `ATLAS-reconciliation-final` using strategy described in Section 1.
2. **environments.ts** — manually merged keeping production `atlasApiUrl` pointing to deployed backend with `/v1` suffix.

### Not Applied (Require Owner Decision)

The following fixes were identified but **not applied** because they require architectural decisions:

1. **`local_environment` bug** — 6 services need to switch from `local_environment.apiUrl` to either `environment.apiUrl` (SRI backend) or `environment.atlasApiUrl` (ATLAS backend). The correct target depends on whether these features were intended to run against the legacy SRI API or the new ATLAS API. The owner must decide for each service.

2. **Missing controllers** — 5 frontend services call endpoints that don't exist. These require backend implementation, not frontend fixes.

3. **Missing SQL tables** — 28 tables need to be added to `atlas-db`. These are currently created at runtime via EF migrations and raw SQL in Program.cs. Adding them to the SQL project requires reconciling with the existing migration history.

4. **Security credentials** — Moving plaintext secrets to Azure Key Vault requires infrastructure changes outside the codebase.

---

## 6. DB Write Verification

### SaveChanges Audit

- **385 total SaveChanges calls** across the platform (383 async + 2 sync in startup)
- **All 383 SaveChangesAsync calls are properly awaited** — no missing awaits found
- **2 synchronous SaveChanges calls** in `Program.cs` (lines 748, 778) for startup seeding — acceptable

### Transaction Usage

Only **2 explicit transactions** found across 385 write operations:

| Location | Pattern | Assessment |
|----------|---------|------------|
| `DataPurgingService.cs:48` | `BeginTransactionAsync` + `CommitAsync` + `RollbackAsync` in try/catch with using block | Correct |
| `ProjectCreationService.cs:57` | `BeginTransactionAsync` (null for InMemory) + `CommitAsync` + `RollbackAsync` | Correct |

Multi-entity writes in controllers like `JobsController`, `QuotesController`, `SchedulingController` rely on EF Core's implicit transaction within a single `SaveChanges` call. This is safe for single-SaveChanges operations but **risky when controllers perform multiple sequential SaveChanges calls**.

### Error Swallowing

**13 silent catches** (no logging AND no rethrow) near SaveChanges:
- `atlas-dispatch/Services/AssignmentService.cs` — 4 locations (create, update concurrency, cancel)
- `atlas-dispatch/Services/TechnicianService.cs` — 5 locations (update, add/remove skill, availability, time-off)
- `atlas-crm/Services/MobileSyncService.cs` — 3 locations (offline updates, job sync, retry)
- `atlas-crm/Services/TimeTrackingService.cs` — 1 location (ARK sync)

**Safety-critical swallows** (logged but not rethrown):
- `SafetyAlertService.cs:130,491` — safety alert persistence and acknowledgment
- `RemoteWipeService.cs` — 5 locations where remote wipe commands may silently fail
- `AuthenticationService.cs:156` — returns `false` on DB error, potentially blocking legitimate users

### Raw SQL

18 total raw SQL calls: 16 startup DDL migrations (all idempotent with `IF NOT EXISTS`), 1 parameterized update, 1 hardcoded query. **No SQL injection vectors found.**

---

## 7. Blockers

### Must-Fix Before Production

| # | Blocker | Severity | Effort |
|---|---------|----------|--------|
| 1 | **`local_environment` bug**: 6 services hardcoded to localhost in production | CRITICAL | Low (config change, needs target decision) |
| 2 | **Missing TimecardController**: Timecard approval workflow entirely non-functional | CRITICAL | Medium (new controller + service layer) |
| 3 | **Missing ManagersController**: Manager team view broken | CRITICAL | Medium (new controller) |
| 4 | **Missing BudgetController**: Budget tracking non-functional | HIGH | Medium (new controller) |
| 5 | **Missing ClientConfigurationController**: Config management broken | HIGH | Medium (new controller) |
| 6 | **Missing import-document endpoint**: Document import broken | HIGH | Low (add endpoint to JobsController) |

### Should-Fix

| # | Item | Severity | Effort |
|---|------|----------|--------|
| 7 | SQL project missing 28 tables | HIGH | High (SQL definitions + reconcile with EF) |
| 8 | Existing SQL tables missing columns (Technicians: 21, Jobs: 33, TimeEntries: 4) | HIGH | Medium (ALTER TABLE scripts) |
| 9 | Plaintext credentials in appsettings.json | MEDIUM | Low (move to Key Vault, update deployment) |
| 10 | 13 silent exception catches in dispatch/CRM services | MEDIUM | Low (add logging) |

---

## 8. Files Changed

### In This Reconciliation (ATLAS-consolidated branch)

All changes are in the merge commit `75401f21`:

- **175 files** resolved from merge conflicts between `ATLAS-segregation` and `ATLAS-reconciliation-final`
- `src/environments/environments.ts` — manually resolved environment URLs
- All FRM feature files (services, components, models) from `ATLAS-segregation`
- All vendor dashboard files from `ATLAS-reconciliation-final`

### Key Files by Category

**Frontend Services (ATLAS API):**
- `src/app/services/atlas-deployment.service.ts`
- `src/app/services/atlas-approvals.service.ts`
- `src/app/services/atlas-ai-analysis.service.ts`
- `src/app/services/atlas-query-builder.service.ts`
- `src/app/features/field-resource-management/services/` (16 service files)
- `src/app/features/public-onboarding/public-onboarding.service.ts`
- `src/app/features/deployment/services/deployment-signalr.service.ts`

**Backend Controllers (atlas-api):**
- `atlas-api/Controllers/` — 31 controllers, 234 total endpoints

**Backend Configuration:**
- `atlas-api/appsettings.json` (contains credentials — flagged)
- `atlas-api/appsettings.Development.json`

**Database Schema:**
- `atlas-db/Tables/` — 34 SQL table definitions (28 additional tables needed)

**Entity Framework:**
- 8 DbContext classes across 6 projects
- 150+ entity models
- 27 migrations (atlas-core) + 2 (dispatch) + 2 (ar-gateway)

---

## 9. Next Steps

### Immediate (Sprint Priority)

1. **Fix `local_environment` bug** — For each of the 6 affected services, determine the correct API target (`environment.apiUrl` for SRI backend or `environment.atlasApiUrl` for ATLAS backend) and update the import.

2. **Implement missing controllers** — Create backend controllers for:
   - `TimecardController` at `/v1/timecards` with submit/approve/reject/request-correction workflow
   - `ManagersController` at `/v1/managers` with direct-reports and team-summary
   - `BudgetController` at `/v1/budgets` with job budget CRUD
   - `ClientConfigurationController` at `/v1/client-configurations`
   - Add `import-document` endpoint to `JobsController`

3. **Push `ATLAS-consolidated` branch** to remote and create PR for review.

### Near-Term

4. **Update SQL project** — Add 28 missing table definitions to `atlas-db/Tables/` and update existing tables with missing columns to match EF models.

5. **Rotate exposed credentials** — Change the Blob Storage account key and Spectrum DB password, then move both to Azure Key Vault. Remove from `appsettings.json`.

6. **Add logging to silent catches** — The 13 silent exception catches in `atlas-dispatch` and `atlas-crm` services should at minimum log the exception before returning failure results.

### Longer-Term

7. **Reconcile EF migrations with SQL project** — Establish a process to keep `atlas-db` in sync with EF model changes. Consider generating SQL from EF migrations or vice versa.

8. **Cherry-pick from other ATLAS branches** — `ATLAS-reconciliation-v2` has geolocation/SignalR fixes; `ATLAS-consolidated-reconciliation` has onboarding link and frontend-backend integration fixes that may apply.

9. **Add integration tests** — End-to-end tests for the top critical flows (job creation → assignment → clock-in/out → timecard submission → approval).

10. **Standardize MetricsController route** — Align to `v{version:apiVersion}/metrics` pattern used by all other controllers.

---

## Appendix: Backend Controller Inventory

### atlas-api (31 controllers, 234 endpoints)

| Controller | Route | Endpoints | Auth |
|-----------|-------|-----------|------|
| AIAnalysisController | `v1/ai-analysis` | 5 | Authorize + strict rate limit |
| AdminTechnicianSyncController | `v1/admin/technicians` | 1 | Admin role |
| ApprovalsController | `v1/approvals` | 8 | AllowAnonymous (class) |
| ARKIntegrationController | `v1/integrations/ark` | 5 | Authorize |
| CandidateAttachmentsController | `v1/onboarding/candidates/{id}/attachments` | 4 | Authorize |
| CandidateFilesController | `v1/onboarding/candidates/{id}` | 4 | Authorize |
| CandidateNotesController | `v1/onboarding/candidates/{id}/notes` | 4 | Policy |
| CandidatesController | `v1/onboarding/candidates` | 11 | Authorize |
| CrewsController | `v1/crews` | 11 | Authorize |
| DeploymentsController | `v1/deployments` | 13 | Authorize |
| ExceptionsController | `v1/exceptions` | 7 | Policy |
| HealthController | `v1/health` | 5 | Mixed |
| JobsController | `v1/jobs` | 17 | Authorize |
| MetricsController | `api/Metrics` | 2 | None |
| NotificationsController | `v1/notifications` | 7 | Authorize |
| OnboardingLinksController | `v1/onboarding/links` | 3 | Authorize |
| OnboardingTechniciansController | `v1/technicians` | 19 | Authorize |
| PayrollController | `v1/payroll` | 16 | Authorize |
| PtoRequestsController | `v1/pto-requests` | 8 | Authorize |
| PublicOnboardingController | `v1/public/onboarding` | 5 | AllowAnonymous |
| QueryBuilderController | `v1/query-builder` | 4 | Authorize |
| QueryTemplateController | `v1/query-builder/templates` | 5 | Authorize |
| QuoteNotesController | `v1/quotes/{id}/notes` | 5 | Authorize |
| QuotesController | `v1/quotes` | 20 | Authorize |
| ReferralsController | `v1/onboarding/referrals` | 6 | Authorize |
| SchedulingController | `v1/scheduling` | 12 | Authorize |
| SkillsController | `v1/skills` | 6 | Authorize |
| SpectrumSyncAdminController | `v1/admin/spectrum-sync` | 3 | Admin role |
| TechnicianAttachmentsController | `v1/technicians/{id}/attachments` | 4 | Authorize |
| TechniciansController | `v1/technicians` | 13 | Authorize |
| TimeEntriesController | `v1/time-entries` | 8 | Authorize |

### Other API Projects

- **atlas-crm**: 12 controllers, 101 endpoints (CRM-specific, separate database)
- **atlas-ar-gateway**: 6 controllers, 23 endpoints (AR/remote session management)
- **atlas-agents**: 7 controllers, 33 endpoints (AI agent orchestration)
- **sri-project-lifecycle-api**: 6 controllers, 26 endpoints (project lifecycle management)

### DbContext Summary

| Context | Project | Database | Entities | Provider |
|---------|---------|----------|----------|----------|
| AtlasDbContext | atlas-core | atlas-prod | 68 | Azure SQL |
| SriDbContext | atlas-core | sri-prod | 1 | Azure SQL (read-only) |
| CRMDbContext | atlas-crm | CRMDatabase | 34 | SQL Server / InMemory |
| DispatchDbContext | atlas-dispatch | dispatch.db | 5 | SQLite |
| ARGatewayDbContext | atlas-ar-gateway | AtlasARGateway | 17 | SQL Server |
| QueryBuilderDbContext | atlas-query-builder | DefaultConnection | 2 | SQL Server |
| SpectrumDbContext | atlas-api | Spectrum (dynamic) | 4 | SQL Server (stubbed) |
| SRIProjectLifecycleDbContext | sri-project-lifecycle | SRIProjectLifecycleDb | 15 | SQL Server |
