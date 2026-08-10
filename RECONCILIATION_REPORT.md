# ATLAS Integration Reconciliation Report

**Generated:** 2026-08-10  
**Scope:** sri-frontend / atlas-platform / atlas-db  
**Branch:** ATLAS-final (sri-frontend)

---

## 1. Branch Consolidation

| Branch | Status | Unique Commits |
|--------|--------|----------------|
| `ATLAS-segregation` | Merged into `ATLAS-final` | 2 |
| `ATLAS-consolidated` | Merged into `ATLAS-final` | ~90 |
| `ATLAS-Segregation` (capital S) | Does not exist | — |
| `ATLAS-final` | **Active** — contains all consolidated work | — |

**Actions taken:**
- Created `ATLAS-final` from `ATLAS-consolidated` (the most complete branch).
- Merged `ATLAS-segregation` into `ATLAS-final` (resolved one merge conflict in the report file).
- Resolved merge conflict markers left in `admin-dashboard.component.html` from the merge.
- Added missing `MyWorkWidgetComponent` import and declaration to `field-resource-management.module.ts`.

**Build result:** Production build passes (warnings only — CSS budget overages and CommonJS dependency notices).

---

## 2. Endpoint Mapping Report (Frontend → Backend)

### Architecture

The frontend uses **two API base URLs** configured in `src/environments/environments.ts`:

| Key | Production URL | Purpose |
|-----|---------------|---------|
| `apiUrl` | `https://sri-api.azurewebsites.net/api` | Legacy SRI API + APIM gateway to atlas-api |
| `atlasApiUrl` | `https://sri-backend.azure-api.net/atlas/v1` | Direct ATLAS platform API (deployments, AI, exceptions) |

Azure API Management rewrites requests from `apiUrl` to atlas-api's versioned routes (`v1/...`). The backend's `ApiVersionRedirectMiddleware` also rewrites `/api/*` to `/v1/*`.

### Endpoint Coverage Summary

| Frontend Domain | Service File(s) | API Base | Backend Controller | Status |
|----------------|-----------------|----------|-------------------|--------|
| **Jobs** | `job.service.ts` | apiUrl | `JobsController` (16 endpoints) | MATCHED |
| **Technicians** | `technician.service.ts` | apiUrl | `TechniciansController` (13 endpoints) | MATCHED |
| **Crews** | `crew.service.ts` | apiUrl | `CrewsController` (8 endpoints) | MATCHED |
| **Time Entries** | `time-tracking.service.ts` | apiUrl | `TimeEntriesController` (8 endpoints) | MATCHED |
| **Assignments** | `assignment.service.ts` | apiUrl | `AssignmentsController` (5 endpoints) | MATCHED |
| **PTO Requests** | `pto-api.service.ts` | apiUrl | `PtoRequestsController` (8 endpoints) | MATCHED |
| **Overtime** | `overtime-api.service.ts` | apiUrl | `OvertimeRequestsController` (6 endpoints) | MATCHED |
| **Quotes/RFP** | `quote-workflow.service.ts` | apiUrl | `QuotesController` (13 endpoints) | MATCHED |
| **Candidates** | `onboarding.service.ts` | apiUrl | `CandidatesController` (6 endpoints) | MATCHED |
| **Notifications** | `notification.service.ts` | apiUrl | `NotificationsController` (4 endpoints) | MATCHED |
| **Scheduling** | `scheduling.service.ts` | apiUrl | `SchedulingController` (4 endpoints) | MATCHED |
| **Payroll** | `payroll.service.ts` | apiUrl | `PayrollController` (7 endpoints) | MATCHED |
| **Deployments** | ATLAS services | atlasApiUrl | `DeploymentsController` (8 endpoints) | MATCHED |
| **AI Analysis** | ATLAS services | atlasApiUrl | `AIAnalysisController` (3 endpoints) | MATCHED |
| **Approvals** | ATLAS services | atlasApiUrl | `ApprovalsController` (4 endpoints) | MATCHED |
| **Exceptions** | ATLAS services | atlasApiUrl | `ExceptionsController` (7 endpoints) | MATCHED |
| **Public Onboarding** | `public-onboarding.service.ts` | atlasApiUrl | `PublicOnboardingController` (2 endpoints) | MATCHED |
| **Auth (login)** | `secure-auth.service.ts` | apiUrl | **Legacy SRI API** (not in atlas-platform) | LEGACY |
| **Expenses** | `expense-api.service.ts` | apiUrl | **Legacy SRI API** (not in atlas-platform) | LEGACY |
| **Punch Lists** | `preliminary-punch-list.service.ts` | apiUrl | **Legacy SRI API** (not in atlas-platform) | LEGACY |
| **Role Permissions** | `role-permissions.effects.ts` | apiUrl | `PermissionsController` (implied) | MATCHED (after fix) |

### Flagged Issues

| # | Issue | Severity | Details |
|---|-------|----------|---------|
| 1 | **Hardcoded API URL** | HIGH | `role-permissions.effects.ts` hardcoded `https://sri-api.azurewebsites.net/api` instead of `environment.apiUrl`. **FIXED** — now uses environment import. |
| 2 | **Hardcoded APIM subscription key** | HIGH | `SecureAuthService.getAuthHeaders()` and `PublicOnboardingService` both hardcode `Ocp-Apim-Subscription-Key: ffd675634ab645d7845640bb88d672d8`. Should be fetched from runtime config or backend. |
| 3 | **Legacy flows not in atlas-platform** | MEDIUM | Auth login, Expenses, and Punch Lists route to the legacy SRI API. No corresponding controllers exist in atlas-platform. Migration path undefined. |
| 4 | **ATLAS Config Service third URL path** | LOW | `atlas-config.service.ts` resolves a third set of URLs for deployments/AI features separate from `environment.atlasApiUrl`, adding routing complexity. |

---

## 3. Backend → DB Wiring

### Write-Path Verification

All critical write paths were traced from controller to `SaveChangesAsync()`:

| Flow | Controller | DB Write | Verified |
|------|-----------|----------|----------|
| Create Job | `JobsController.CreateJob()` | `_dbContext.Jobs.Add()` → `SaveChangesAsync()` | YES |
| Assign Technician | `JobsController.AssignTechnician()` | `_dbContext.Assignments.Add()` → `SaveChangesAsync()` | YES |
| Clock In | `TimeEntriesController.ClockIn()` | `_dbContext.TimeEntries.Add()` → `SaveChangesAsync()` (x2) | YES |
| Clock Out | `TimeEntriesController.ClockOut()` | Update entry → `SaveChangesAsync()` (x2) | YES |
| Create Crew | `CrewsController.CreateCrew()` | `_dbContext.Crews.Add()` → `SaveChangesAsync()` | YES |
| Create PTO Request | `PtoRequestsController.CreateRequest()` | via `IPtoService` → `SaveChangesAsync()` | YES |
| Create Quote | `QuotesController` POST | `_dbContext.Quotes.Add()` → `SaveChangesAsync()` | YES |
| Create Candidate | `CandidatesController.Create()` | via `ICandidateService` → `SaveChangesAsync()` | YES |
| Submit Approval | `ApprovalsController` POST | `_dbContext.Approvals.Add()` → `SaveChangesAsync()` | YES |
| Create Deployment | `DeploymentsController` POST | `_dbContext.Deployments.Add()` → `SaveChangesAsync()` | YES |

### Bugs Found

| # | Bug | Severity | Location |
|---|-----|----------|----------|
| 1 | **Fire-and-forget with scoped DbContext** | HIGH | `CrewsController.AssignJob()`, `AddCrewMember()`, `RemoveCrewMember()` use `_ = Task.Run(async () => { ... _dbContext.FindAsync(...) ... })`. The request-scoped `DbContext` may be disposed before the background task completes, causing `ObjectDisposedException`. Fix: inject `IServiceScopeFactory` and create a new scope in the background task. |
| 2 | **Double SaveChanges in ClockIn** | MEDIUM | `TimeEntriesController.ClockIn()` calls `SaveChangesAsync()` twice — once for the time entry, once for geolocation-based status updates. If the second fails, the entry exists without correct status/geo data. Should wrap in a transaction. |
| 3 | **Fire-and-forget Spectrum write-back** | MEDIUM | `JobsController.UpdateJobStatus` uses `_ = Task.Run(async () => { await _spectrumWriteService.UpdateJobStatusAsync(...) })` — failures are silently swallowed with no retry mechanism. |
| 4 | **Fire-and-forget PTO notifications** | LOW | `PtoRequestsController` approve/deny uses `_ = _notifications.SendAsync(...)` — notification failures are silently swallowed. The approval itself succeeds but the user may never be notified. |
| 5 | **Auto-provisioning technician on ClockIn** | LOW | If `TechnicianId` is not found during clock-in, the controller auto-creates a Technician record. Could create orphan records if the ID was simply wrong. |

---

## 4. DB Schema Validation

### Summary

| Metric | Count |
|--------|-------|
| Tables in atlas-db SQL project | 35 |
| Tables in AtlasDbContext (EF) | 69 |
| **Tables missing from atlas-db** | **34** |
| Extra columns on Technicians (EF vs SQL) | 23 |
| Extra columns on Jobs (EF vs SQL) | 32 |

### 34 Missing Tables (exist in EF migrations only)

These tables are created by EF Core migrations but have no `.sql` definition in the atlas-db DACPAC project:

| # | Table | Domain |
|---|-------|--------|
| 1 | JobRequiredSkills | FRM - Jobs |
| 2 | MasterSkills | FRM - Skills |
| 3 | PtoRequests | PTO Workflow |
| 4 | PtoApprovalHistories | PTO Workflow |
| 5 | PtoBalances | PTO Workflow |
| 6 | LeaveTypes | PTO Workflow |
| 7 | OvertimeRequests | Overtime |
| 8 | OvertimeApprovalHistories | Overtime |
| 9 | EmployeeManagers | Hierarchy |
| 10 | ManagerHierarchies | Hierarchy |
| 11 | UserAssignments | Assignments |
| 12 | UserIdentityMappings | Identity |
| 13 | Candidates | Onboarding |
| 14 | CandidateNotes | Onboarding |
| 15 | CandidateAttachments | Onboarding |
| 16 | TechnicianAttachments | Onboarding |
| 17 | TechnicianCredentials | Onboarding |
| 18 | EquipmentAssignments | Onboarding |
| 19 | TechnicalCompetencies | Onboarding |
| 20 | PerformanceReviewCycles | Onboarding |
| 21 | PRCGoals | Onboarding |
| 22 | RoleCredentialTemplates | Onboarding |
| 23 | OnboardingLinks | Onboarding |
| 24 | Referrals | Referrals |
| 25 | Quotes | Quotes/RFP |
| 26 | QuoteBomItems | Quotes/RFP |
| 27 | QuoteAttachments | Quotes/RFP |
| 28 | rfp_notes | Quotes/RFP |
| 29 | BomTrackings | Quotes/RFP |
| 30 | RfpIntakes | Quotes/RFP |
| 31 | UserNotifications | Notifications |
| 32 | SpectrumSyncMetadata | Spectrum Sync |
| 33 | SpectrumIdMapping | Spectrum Sync |
| 34 | SpectrumWriteAuditLog | Spectrum Sync |

### Column Mismatches on Existing Tables

**Technicians** — 23 columns in EF entity but missing from SQL definition:
`FieldStatus`, `UserId`, `ManagerId`, `CandidateId`, `ReferredBy`, `WillingToTravel`, `ScissorLiftCertified`, `CurrentStatus`, `StatusUpdatedAt`, `FiberExperience`, `OshaCertified`, `OshaCertNumber`, `OshaCertExpiration`, `LiftCertifications`, `ShiftAvailability`, `BackgroundCheckStatus`, `DrugScreenStatus`, `IsVeteran`, `MilitaryBranch`, `SpectrumEmployeeId`, `SpectrumEmployeeNumber`, `LastSpectrumSync`

**Jobs** — 32 columns in EF entity but missing from SQL definition:
`SiteName`, `SiteStreet`, `SiteCity`, `SiteState`, `SiteZipCode`, `SiteLatitude`, `SiteLongitude`, `ScopeDescription`, `CustomerPOCName`, `CustomerPOCPhone`, `CustomerPOCEmail`, `RequiredCrewSize`, `TargetResources`, `EstimatedLaborHours`, `RequestedHours`, `EstimatedOvertimeHours`, `OvertimeRequired`, `StandardBillRate`, `OvertimeBillRate`, `PerDiem`, `AuthorizationStatus`, `InvoicingProcess`, `HasPurchaseOrders`, `PurchaseOrderNumber`, `ProjectDirector`, `BizDevContact`, `ScheduledStartDate`, `ScheduledEndDate`, `JobReadiness`, `CustomerReady`, `SpectrumJobId`, `SpectrumJobNumber`, `LastSpectrumSync`

### Impact

The atlas-db DACPAC project cannot be used for clean deployments without EF migrations applied first. If the database were recreated from the SQL project alone, 34 tables and 55+ columns would be missing, breaking all PTO, overtime, onboarding, quote, notification, and Spectrum sync functionality.

---

## 5. E2E Flow Validation

### Fully Wired Flows (Frontend → Backend → DB)

| # | Flow | Result |
|---|------|--------|
| 1 | Job Creation | COMPLETE — `JobService` → `JobsController` → `Jobs` table |
| 2 | Technician Assignment | COMPLETE — `JobService` → `JobsController.AssignTechnician()` → `Assignments` table |
| 3 | Clock In/Out | COMPLETE — `ClockInWidget` → `TimeEntriesController` → `TimeEntries` table |
| 4 | Crew Management | COMPLETE — `CrewService` → `CrewsController` → `Crews`/`CrewMembers` tables |
| 5 | PTO Request Workflow | COMPLETE — `PtoApiService` → `PtoRequestsController` → `PtoRequests` table |
| 6 | Quote/RFP Workflow | COMPLETE — `QuoteWorkflowService` → `QuotesController` → `Quotes` table |
| 7 | Candidate Onboarding | COMPLETE — `OnboardingService` → `CandidatesController` → `Candidates` table |
| 8 | Public Self-Service Onboarding | COMPLETE — `PublicOnboardingService` → `PublicOnboardingController` → `OnboardingLinks`/`Candidates` |
| 9 | Deployment Governance | COMPLETE — ATLAS services → `DeploymentsController` → `Deployments` table |
| 10 | Notifications | COMPLETE — `NotificationService` → `NotificationsController` → `UserNotifications` table |

### Legacy-Only Flows (not in atlas-platform)

| # | Flow | Frontend Service | API Target |
|---|------|-----------------|------------|
| 1 | User Login | `SecureAuthService` | Legacy SRI API (`/api/auth/login`) |
| 2 | Expense Reports | `ExpenseApiService` | Legacy SRI API (`/api/expenses`) |
| 3 | Punch Lists | `PreliminaryPunchListService` | Legacy SRI API (`/api/PunchList`) |

### Risks in Wired Flows

1. **Two-phase clock-in writes** — If the second `SaveChangesAsync` fails after geolocation processing, the time entry exists but with incorrect status data.
2. **Background DbContext use** — Crew notification tasks use the request-scoped DbContext after the HTTP response may have completed.
3. **Proxy dependency** — All FRM frontend services use `environment.apiUrl` (legacy SRI URL). If APIM gateway routing fails, all FRM flows break silently.
4. **Draft persistence** — Quote drafts are stored in `sessionStorage` only; lost on browser clear or device switch.

---

## 6. Security Findings

| # | Finding | Severity | Location |
|---|---------|----------|----------|
| 1 | **Hardcoded APIM subscription key** | CRITICAL | `SecureAuthService.getAuthHeaders()` and `PublicOnboardingService` hardcode `Ocp-Apim-Subscription-Key`. This key is visible in client-side JavaScript bundles. |
| 2 | **Hardcoded production API URL** | HIGH | `role-permissions.effects.ts` — **FIXED** in this reconciliation. |
| 3 | **Connection string with password** | HIGH | `atlas-api/appsettings.json` contains `BlobStorage` connection string with plain-text account key. Should use Azure Key Vault or Managed Identity. |
| 4 | **KeyVault secret in config** | HIGH | `atlas-api/appsettings.json` has `KeyVault.VaultUri` and a `Secret` value in plain text. |
| 5 | **Open API endpoints** | MEDIUM | `atlas-ar-gateway` controllers have no `[Authorize]` attribute. `sri-project-lifecycle-api` also has no auth. Both are presumably internal-only. |
| 6 | **CORS allows localhost** | LOW | Production `appsettings.json` CORS origins include localhost URLs; `appsettings.Production.json` does not override them, so they may be active in production. |

---

## 7. Fixes Applied

| # | Fix | File | Description |
|---|-----|------|-------------|
| 1 | Resolved merge conflict markers | `admin-dashboard.component.html` | Removed `<<<<<<< HEAD`, `=======`, `>>>>>>> origin/ATLAS-segregation` markers; kept `<app-my-work-widget>` element. |
| 2 | Added missing component import | `field-resource-management.module.ts` | Added `MyWorkWidgetComponent` import and declaration — was causing build failure (`app-my-work-widget is not a known element`). |
| 3 | Fixed hardcoded API URL | `role-permissions.effects.ts` | Replaced `'https://sri-api.azurewebsites.net/api'` with `environment.apiUrl` import. |

---

## 8. Recommendations

### Critical (blocking production reliability)

1. **Fix fire-and-forget DbContext usage in CrewsController.** Replace `_ = Task.Run(async () => { ... _dbContext... })` with `IServiceScopeFactory`-based background tasks. This is a latent `ObjectDisposedException` bug.

2. **Move APIM subscription key to runtime config.** The hardcoded key in frontend JavaScript is visible to anyone who inspects the bundle. Fetch it from a secure backend endpoint or use a backend-for-frontend proxy pattern.

3. **Wrap ClockIn double-SaveChanges in a transaction.** Use `IDbContextTransaction` or `ExecutionStrategy.ExecuteInTransaction()` to make the time entry creation + geolocation update atomic.

### High Priority (deployment and operational)

4. **Sync atlas-db DACPAC with EF model.** Add SQL definitions for all 34 missing tables and 55+ missing columns. Until this is done, the DACPAC cannot be used for clean deployments or schema comparison tooling. Recommended approach: generate SQL from the EF migration snapshot and add corresponding `.sql` files.

5. **Remove secrets from appsettings.json.** Move `BlobStorage` connection string and `KeyVault.Secret` to Azure Key Vault references or environment variables. These are currently committed to source control.

6. **Add retry/outbox for Spectrum write-back.** The fire-and-forget pattern for Spectrum sync means job status updates can be silently lost. Implement a transactional outbox or at minimum a retry queue.

### Medium Priority

7. **Plan legacy SRI API migration.** Auth, Expenses, and Punch Lists still depend on the legacy SRI API. Document the migration path or ensure the legacy API remains supported.

8. **Add auth to AR Gateway and Project Lifecycle APIs.** Both are currently open (no `[Authorize]`). If they're internal-only, add network-level restrictions. If they're externally accessible, add authentication.

9. **Consolidate frontend URL configuration.** The three URL resolution paths (`environment.apiUrl`, `environment.atlasApiUrl`, `AtlasConfigService`) create unnecessary complexity. Consider unifying under a single configuration service.

### Low Priority

10. **Address CSS budget warnings.** Six component stylesheets exceed the 16KB budget. Consider extracting shared styles or lazy-loading heavy components.

11. **Replace fire-and-forget notifications with a reliable mechanism.** PTO approval/denial notifications are silently swallowed on failure. Consider a notification outbox pattern.

---

## 9. Overall Architecture Summary

```
+-------------------------------------------------------------+
|                      Angular 18 Frontend                     |
|  (sri-frontend)                                              |
|                                                              |
|  environment.apiUrl ----------+                              |
|  environment.atlasApiUrl -----+                              |
|  AtlasConfigService ----------+                              |
+-------------------------------+------------------------------+
                                |
                +---------------+---------------+
                v               v               v
    +------------------+ +--------------+ +----------------+
    | Azure API Mgmt   | | Direct ATLAS | | Legacy SRI API |
    | (rewrites to v1) | | API Gateway  | | (auth, expense,|
    |                  | |              | |  punch list)   |
    +--------+---------+ +------+-------+ +----------------+
             |                  |
             v                  v
    +---------------------------------------------------------+
    |                 atlas-platform (.NET 10)                  |
    |                                                          |
    |  atlas-api (37 controllers, ~180 endpoints)              |
    |  atlas-agents (7 controllers, AI/ML)                     |
    |  atlas-ar-gateway (6 controllers, AR/CV)                 |
    |  atlas-crm (12 controllers, CRM)                         |
    |  sri-project-lifecycle (6 controllers)                    |
    +------------------------+--------------------------------+
                             |
                             v
    +---------------------------------------------------------+
    |                    Azure SQL Database                     |
    |                                                          |
    |  atlas-db DACPAC: 35 tables (core schema)                |
    |  EF Migrations:   34 additional tables                   |
    |  Total:           69 tables in AtlasDbContext             |
    |                                                          |
    |  + DispatchDbContext, CRMDbContext, ARGatewayDbContext    |
    |    (separate databases)                                   |
    +---------------------------------------------------------+
```

### Key Statistics

| Metric | Value |
|--------|-------|
| Frontend HTTP call sites | ~530+ across ~70 service files |
| Backend controllers | 68 across 5 API projects |
| Backend endpoints | ~322 total |
| Database tables (DACPAC) | 35 |
| Database tables (actual via EF) | 69 |
| Schema drift (missing tables) | 34 |
| Schema drift (missing columns) | 55+ |
| Seeded roles | 6 |
| Seeded permissions | 32 |
| Fixes applied this run | 3 |
| Critical bugs found | 5 |
| Security findings | 6 |
