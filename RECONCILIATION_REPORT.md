# ATLAS Integration Reconciliation Report

**Date:** 2026-08-03  
**Scope:** sri-frontend, atlas-platform, atlas-db  
**Branch:** `ATLAS-segregation` (sri-frontend)  
**Automated audit run**

---

## 1. Branch Consolidation

### Finding

- `ATLAS-segregation` (lowercase 's') exists and is checked out.
- `ATLAS-Segregation` (capital 'S') does **not** exist — confirmed via `git branch -a`.
- `ATLAS-segregation` has **0 unique commits** — it is fully contained within `master`. The tip of `ATLAS-segregation` (`1a684fc6`, "Latest for PTo Requests", 2026-05-12) is the merge base; `master` was built directly on top of it.
- **`master` has 278 commits beyond `ATLAS-segregation`**, adding: RFP Dashboard, PTO/Overtime Phase 2, Construction Integration, candidate management, public onboarding, dashboard widgets, document parsing, geofencing, and more.
- The diff is **419 files changed** with 48,306 lines in `master` that `ATLAS-segregation` doesn't have.
- Five prior reconciliation branches exist: `ATLAS-consolidated`, `ATLAS-consolidated-reconciliation`, `ATLAS-final-reconciliation`, `ATLAS-reconciliation-final`, `ATLAS-reconciliation-v2` — all subsets of `master` with only 1-3 unique tip commits each.
- Two small API fixes in the consolidation branches remain unmerged into `master`: onboarding promote route (`convert-to-technician` → `promote`) and notification API URL patterns.

### Recommendation

**`master` is the canonical branch.** Cherry-pick the two API fixes from the consolidation branches (`5ead6364` and `d825f6fd`), then archive all `ATLAS-*` branches. The `local_environment` fixes from this audit are applied to `ATLAS-segregation` and should be applied to `master` instead, since that is the active branch.

---

## 2. Frontend-to-Backend API Mapping

### 2.1 Frontend Architecture

- **Framework:** Angular 18
- **HTTP Interceptors:** 5 total (ConfigurationInterceptor, AuthorizationInterceptor, MarketFilterInterceptor, ErrorHandlingInterceptor, FRM AuthTokenInterceptor)
- **API Base URLs:** `apiUrl` (SRI legacy: `https://sri-api.azurewebsites.net/api`) and `atlasApiUrl` (ATLAS: `https://sri-backend.azure-api.net/atlas/v1`)
- **Total HTTP call sites:** ~490+ across ~55 service/effect files
- **Real-time:** 4 SignalR hubs (deployment events, ATLAS events, FRM events)

### 2.2 FRM Services API Mapping

| Frontend Service | API Base Path | Backend Controller | Status |
|-----------------|---------------|-------------------|--------|
| `job.service.ts` | `/jobs` | `JobsController` | OK |
| `technician.service.ts` | `/technicians` | `TechniciansController` | OK |
| `crew.service.ts` | `/crews` | `CrewsController` | OK |
| `time-tracking.service.ts` | `/time-entries` | `TimeEntriesController` | OK |
| `scheduling.service.ts` | `/scheduling` | `SchedulingController` | OK |
| `notification.service.ts` | `/notifications` | `NotificationsController` | OK |
| `payroll.service.ts` | `/payroll` | `PayrollController` | OK |
| `onboarding.service.ts` | `/onboarding/candidates` | `CandidatesController` | OK |
| `pto-api.service.ts` | `/pto-requests` | `PtoRequestsController` | OK |
| `reporting.service.ts` | `/reports` | `ReportsController` | OK |
| `referral.service.ts` | `/onboarding/referrals` | `ReferralsController` | OK |
| `quote-workflow.service.ts` | `/quotes` | `QuotesController` | OK |
| `quote-assembly.service.ts` | `/quotes` | `QuotesController` | OK |
| `bom-validation.service.ts` | `/quotes` | `QuotesController` | OK |
| `bom.service.ts` | `/quotes` | `QuotesController` | OK |
| `job-summary.service.ts` | `/quotes` | `QuotesController` | OK |
| `deployment-checklist.service.ts` | `/jobs/{jobId}/deployment-checklist` | **MISSING** | **GAP** |
| `materials.service.ts` | `/materials`, `/purchase-orders`, `/suppliers` | **MISSING** | **GAP** |
| `budget.service.ts` | `/budgets` | **MISSING** | **GAP** |
| `inventory.service.ts` | `/inventory` | **MISSING** | **GAP** |
| `client-configuration.service.ts` | `/client-configurations` | **MISSING** | **GAP** |
| `travel.service.ts` | `/travel` | **MISSING** | **GAP** |

### 2.3 Missing Backend Controllers — 6 Services With No Backend

These frontend services call API endpoints with **no corresponding backend controller** — all produce HTTP 404 in production:

1. **Deployment Checklists** → `/jobs/{jobId}/deployment-checklist/*` (7 endpoints)
2. **Materials** → `/materials/*`, `/purchase-orders/*`, `/suppliers/*` (17 endpoints)
3. **Budgets** → `/budgets/*` (4 endpoints)
4. **Inventory** → `/inventory/*` (6 endpoints)
5. **Client Configurations** → `/client-configurations/*` (2 endpoints)
6. **Travel** → `/travel/profiles/*` (7 endpoints)

### 2.4 Backend Controllers With No FRM Frontend Consumer

| Controller | Route | Purpose |
|-----------|-------|---------|
| `AIAnalysisController` | `v1/ai-analysis` | Internal AI tooling |
| `ARKIntegrationController` | `v1/integrations/ark` | External ARK integration |
| `AdminTechnicianSyncController` | `v1/admin/technicians` | Admin sync tool |
| `ApprovalsController` | `v1/approvals` | Deployment module |
| `DeploymentsController` | `v1/deployments` | Deployment module |
| `ExceptionsController` | `v1/exceptions` | Deployment module |
| `HealthController` | `v1/health` | Infrastructure |
| `MetricsController` | `api/Metrics` | Internal metrics |
| `PublicOnboardingController` | `v1/public/onboarding` | Public-facing |
| `QueryBuilderController` | `v1/query-builder` | Admin tool |
| `SpectrumSyncAdminController` | `v1/admin/spectrum-sync` | Admin integration |

---

## 3. Backend Architecture & Wiring

### 3.1 Solution Structure

The atlas-platform solution contains **5 API projects** and **65+ controllers** across ~180+ endpoints:
- `atlas-api` — Main ATLAS API (34 controllers)
- `atlas-agents` — AI agent endpoints
- `atlas-ar-gateway` — AR gateway
- `atlas-crm` — CRM integration
- `sri-project-lifecycle-api` — Legacy project lifecycle

### 3.2 Database Contexts

| Context | Database | Connection | Purpose |
|---------|----------|------------|---------|
| `AtlasDbContext` | `atlas-prod` (Azure SQL) | `DefaultConnection` | Main application (~65 DbSets) |
| `SriDbContext` | `sri-prod` (Azure SQL) | `SriConnection` | Read-only legacy user validation |

### 3.3 Backend Critical Findings

| Severity | Finding | Location |
|----------|---------|----------|
| **CRITICAL** | Hardcoded Azure Blob Storage account key | `appsettings.json` → `BlobStorage.ConnectionString` |
| **CRITICAL** | Hardcoded KeyVault password (`Ch3dd@r#21`) | `appsettings.json` → `KeyVault.SecretNames.Password` |
| **CRITICAL** | Fire-and-forget `Task.Run` using scoped `DbContext` (8+ locations) | Multiple controllers — risks `ObjectDisposedException` and silent data loss |
| **HIGH** | Route conflict: `TechniciansController` and `OnboardingTechniciansController` both map to `v1/technicians` | Controllers directory |
| **HIGH** | `ApprovalsController` marked `[AllowAnonymous]` at class level | `ApprovalsController.cs` |
| **HIGH** | `MetricsController` uses legacy route `api/[controller]` with no auth | `MetricsController.cs` |
| **HIGH** | Empty CRM database connection string | `atlas-crm/appsettings.json` |
| **MEDIUM** | In-memory pagination after full data load | Multiple controllers |
| **MEDIUM** | Raw SQL bypassing EF model | Specific endpoints |
| **MEDIUM** | No transaction wrapping on multi-step operations | Multiple locations |
| **MEDIUM** | ~500 lines of raw SQL migrations in `Program.cs` startup | `atlas-api/Program.cs` |

---

## 4. Database Schema Validation

### 4.1 Schema Inventory

**34 tables** defined in `atlas-db/Tables/`:
ApiKeys, Approvals, Assignments, AuditEvents, ContactInfoChanges, CrewLocationRecords, CrewMembers, Crews, Deployments, DirectDepositChanges, Evidence, Exceptions, GateEvaluations, IncidentReports, JobAttachments, JobNotes, JobStatusHistories, Jobs, Permissions, PrcSignatures, PayStubs, Roles, RolePermissions, StateTransitions, TechnicianAvailabilities, TechnicianCertifications, TechnicianSkills, Technicians, TimeEntries, UserPermissions, UserRoles, Users, W2Documents, W4Changes

### 4.2 Missing Tables — 31 Tables in EF Core but NOT in atlas-db

| Entity | Mapped Table | Feature Area |
|--------|-------------|-------------|
| `PtoRequest` | PtoRequests | PTO/Leave |
| `PtoApprovalHistory` | PtoApprovalHistories | PTO/Leave |
| `PtoBalance` | PtoBalances | PTO/Leave |
| `LeaveType` | LeaveTypes | PTO/Leave |
| `OvertimeRequest` | OvertimeRequests | Overtime |
| `OvertimeApprovalHistory` | OvertimeApprovalHistories | Overtime |
| `Candidate` | Candidates | Onboarding |
| `CandidateNote` | CandidateNotes | Onboarding |
| `CandidateAttachment` | CandidateAttachments | Onboarding |
| `TechnicianAttachment` | TechnicianAttachments | Onboarding |
| `OnboardingLink` | OnboardingLinks | Onboarding |
| `Referral` | Referrals | Onboarding |
| `TypedCredential` | TechnicianCredentials | Credentials |
| `EquipmentAssignment` | EquipmentAssignments | Equipment |
| `TechnicalCompetency` | TechnicalCompetencies | Competencies |
| `PerformanceReviewCycle` | PerformanceReviewCycles | Performance |
| `PrcGoal` | PRCGoals | Performance |
| `RoleCredentialTemplate` | RoleCredentialTemplates | Credentials |
| `EmployeeManager` | EmployeeManagers | Org Structure |
| `Quote` | Quotes | Quoting |
| `QuoteBomItem` | QuoteBomItems | Quoting |
| `QuoteAttachment` | QuoteAttachments | Quoting |
| `QuoteNote` | rfp_notes | Quoting |
| `BomTracking` | BomTrackings | Quoting |
| `RfpIntake` | RfpIntakes | Quoting |
| `UserNotification` | UserNotifications | Notifications |
| `SpectrumSyncMetadata` | SpectrumSyncMetadata | Spectrum Sync |
| `SpectrumIdMapping` | SpectrumIdMapping | Spectrum Sync |
| `SpectrumWriteAuditLog` | SpectrumWriteAuditLog | Spectrum Sync |
| `JobRequiredSkill` | JobRequiredSkills | Jobs |
| `MasterSkill` | MasterSkills | Skills |

### 4.3 Missing Columns on Existing Tables

**Technicians** — SQL has 14 columns; C# entity has ~35 (21 missing):
`FieldStatus`, `UserId`, `ManagerId`, `CandidateId`, `WillingToTravel`, `ScissorLiftCertified`, `CurrentStatus`, `StatusUpdatedAt`, `FiberExperience`, `OshaCertified`, `OshaCertNumber`, `OshaCertExpiration`, `LiftCertifications`, `ShiftAvailability`, `BackgroundCheckStatus`, `DrugScreenStatus`, `IsVeteran`, `MilitaryBranch`, `SpectrumEmployeeId`, `SpectrumEmployeeNumber`, `LastSpectrumSync`

**Jobs** — SQL has 19 columns; C# entity has ~52 (33 missing):
`SiteName`, `SiteStreet`, `SiteCity`, `SiteState`, `SiteZipCode`, `SiteLatitude`, `SiteLongitude`, `ScopeDescription`, `CustomerPOCName`, `CustomerPOCPhone`, `CustomerPOCEmail`, `RequiredCrewSize`, `TargetResources`, `EstimatedLaborHours`, `RequestedHours`, `EstimatedOvertimeHours`, `OvertimeRequired`, `StandardBillRate`, `OvertimeBillRate`, `PerDiem`, `AuthorizationStatus`, `InvoicingProcess`, `HasPurchaseOrders`, `PurchaseOrderNumber`, `ProjectDirector`, `BizDevContact`, `ScheduledStartDate`, `ScheduledEndDate`, `JobReadiness`, `CustomerReady`, `SpectrumJobId`, `SpectrumJobNumber`, `LastSpectrumSync`

**TimeEntries** — SQL has 15 columns; C# entity has 19 (4 missing):
`TimeCategory`, `PayType`, `SyncStatus`, `ProximityStatus`

### 4.4 Default Value Mismatch

| Table | Column | SQL Default | C# Default | Impact |
|-------|--------|-------------|------------|--------|
| Jobs | Status | `'pending'` | `"NotStarted"` | Inconsistent status for SQL-inserted vs EF-inserted rows |

### 4.5 Missing Indexes (13+)

Columns used in WHERE clauses with no index in the SQL project:
- `Technicians`: CurrentStatus, FieldStatus, UserId, CandidateId, SpectrumEmployeeId
- `Jobs`: SpectrumJobId
- `TimeEntries`: SyncStatus
- `CrewMembers`: CrewId
- `JobAttachments`, `JobNotes`, `JobStatusHistories`: JobId
- `CrewLocationRecords`: CrewId
- `Assignments`: composite (TechnicianId, IsActive)

---

## 5. End-to-End Flow Validation

### 5.1 Job Management Flow
`job.service.ts` → `POST/GET/PUT /jobs` → `JobsController` → `AtlasDbContext.Jobs`  
**Status:** FUNCTIONAL. 10 endpoints mapped. Response mapping handles PascalCase→camelCase and `$values` wrapper. 33 Job columns missing from SQL project but exist via EF migrations.

### 5.2 Technician Management Flow
`technician.service.ts` → `GET/PUT /technicians` → `TechniciansController` → `AtlasDbContext.Technicians`  
**Status:** FUNCTIONAL with schema drift. 19 endpoints mapped. Route conflict with `OnboardingTechniciansController`. 21 columns missing from SQL project.

### 5.3 Time Tracking Flow
`time-tracking.service.ts` → `POST/GET /time-entries` → `TimeEntriesController` → `AtlasDbContext.TimeEntries`  
**Status:** FUNCTIONAL. 5 endpoints mapped. 4 missing columns in SQL project.

### 5.4 Quote Workflow Flow
`quote-workflow.service.ts` + `bom*.service.ts` + `quote-assembly.service.ts` + `job-summary.service.ts` → `/quotes/*` → `QuotesController` → `AtlasDbContext.Quotes`  
**Status:** FUNCTIONAL via EF migrations. 15 endpoints mapped. All 6 quote tables missing from SQL project.

### 5.5 PTO Request Flow
`pto-api.service.ts` → `POST/GET /pto-requests` → `PtoRequestsController` → `AtlasDbContext.PtoRequests`  
**Status:** FUNCTIONAL via EF migrations. 8 endpoints mapped. All 4 PTO tables missing from SQL project.

---

## 6. Fixes Applied

### 6.1 Environment Configuration Fix (CRITICAL — 24 files)

**Problem:** 24 frontend services used `local_environment.apiUrl` (pointing to `https://localhost:44350/v1`) instead of `environment.apiUrl` (pointing to production API `https://sri-api.azurewebsites.net/api`). This made all FRM API calls fail in production — requests would go to localhost and be blocked.

**Fix:** Changed import and usage from `local_environment` to `environment` in all 24 files:

`bom-validation.service.ts`, `bom.service.ts`, `budget.service.ts`, `client-configuration.service.ts`, `crew.service.ts`, `deployment-checklist.service.ts`, `frm-signalr.service.ts` (2 occurrences of `enableSignalR`), `inventory.service.ts`, `job-summary.service.ts`, `job.service.ts`, `materials.service.ts` (3 occurrences), `notification.service.ts`, `onboarding.service.ts`, `payroll.service.ts`, `pto-api.service.ts`, `quote-assembly.service.ts`, `quote-workflow.service.ts`, `referral.service.ts`, `reporting.service.ts`, `scheduling.service.ts`, `technician.service.ts`, `time-tracking.service.ts`, `time-tracking.service.spec.ts`, `travel.service.ts`

**Not modified:** `atlas-config.service.ts` — legitimately uses `local_environment` for environment detection.

---

## 7. Build & Test Results

### 7.1 Frontend Build

Angular production build: **PASSED** (exit code 0).

Pre-existing warnings only (not introduced by this fix):
- CommonJS dependency warnings (canvg, leaflet-search, jspdf-autotable)
- 6 SCSS files exceed 16.38 kB component style budget
- Initial bundle exceeds 4.72 MB budget by 185.91 kB (total 4.90 MB)

### 7.2 Backend

No backend changes made. Existing state preserved.

### 7.3 Database

No SQL project changes made. Schema drift is documented but requires design decisions.

---

## 8. Remaining Issues (Unfixed — Require Design Decisions)

### Priority 1 — Production Impact

| # | Issue | Impact | Recommendation |
|---|-------|--------|----------------|
| 1 | 6 frontend services call endpoints with no backend controller | HTTP 404 on 43 endpoints | Create controllers or disable UI features |
| 2 | Hardcoded secrets in `appsettings.json` | Security: credentials in source control | Move to Azure Key Vault / env vars |
| 3 | Fire-and-forget `Task.Run` with scoped `DbContext` (8+ locations) | Silent data loss, `ObjectDisposedException` | Use background service / `IServiceScopeFactory` |
| 4 | `ApprovalsController` has `[AllowAnonymous]` at class level | Unauthenticated access to approvals | Add proper auth |

### Priority 2 — Architecture

| # | Issue | Impact | Recommendation |
|---|-------|--------|----------------|
| 5 | SQL Database Project missing 31 tables | Schema reference is stale | Sync with EF Core migrations |
| 6 | 58+ columns missing from existing SQL table definitions | Schema documentation inaccurate | Update SQL definitions |
| 7 | `Jobs.Status` default value mismatch (`pending` vs `NotStarted`) | Data inconsistency | Align SQL default with C# |
| 8 | Route conflict: `TechniciansController` + `OnboardingTechniciansController` | Potential routing ambiguity | Separate route prefixes |
| 9 | `ATLAS-segregation` is 278 commits behind `master` | Stale branch | Apply fixes to `master` instead |

### Priority 3 — Cleanup

| # | Issue | Impact | Recommendation |
|---|-------|--------|----------------|
| 10 | 12 services outside FRM import `local_environment` | Unused imports / potential confusion | Audit and clean up |
| 11 | 13+ missing database indexes | Query performance | Add indexes |
| 12 | 5 stale `ATLAS-*` reconciliation branches | Branch clutter | Archive after cherry-picking fixes |
| 13 | ~500 lines raw SQL in `Program.cs` startup | Maintenance burden | Move to proper migration files |

---

## 9. Detailed Audit Artifacts

Full audit data is available in the session scratchpad:
- `scratchpad/branch_analysis.md` — Complete branch consolidation analysis
- `scratchpad/frontend_api_calls.md` — Full catalog of ~490 HTTP call sites
- `scratchpad/backend_audit.md` — Backend route inventory and DB wiring audit (1,122 lines)
- `scratchpad/database_audit.md` — Complete schema cross-reference with column-level detail

---

*Report generated by automated reconciliation audit on 2026-08-03.*
