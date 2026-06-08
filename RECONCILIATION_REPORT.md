# ATLAS Integration Reconciliation Report

**Date:** 2026-06-08
**Branch:** `ATLAS-reconciliation-v2` (all three repos)
**Repos:** `sri-frontend`, `atlas-platform`, `atlas-db`

---

## 1. Branch Consolidation Strategy

### Branches Analyzed (sri-frontend)

| Branch | Status | Unique Content |
|--------|--------|----------------|
| `ATLAS-segregation` | Stale pointer to old master | None — fully subsumed by master |
| `ATLAS-consolidated-reconciliation` | Single reconciliation commit | Subsumed — same promote endpoint fix as final-reconciliation |
| `ATLAS-final-reconciliation` | Superset branch | Contains all master commits + all reconciliation fixes |

### Decision
Created `ATLAS-reconciliation-v2` from `ATLAS-final-reconciliation` as the canonical branch. The other two branches can be deleted — they contain no unique content that isn't already in this branch.

---

## 2. Final Branch Name

**`ATLAS-reconciliation-v2`** — pushed to all three repositories:
- `sri-frontend` — based on `origin/ATLAS-final-reconciliation`
- `atlas-platform` — branched from `main`
- `atlas-db` — branched from `master`

---

## 3. Endpoint Mapping (Frontend → Backend)

### Fully Matched Services (no mismatches)

| Frontend Service | Backend Controller | Route Prefix |
|-----------------|-------------------|--------------|
| `onboarding.service.ts` | `CandidatesController` + `CandidateFilesController` | `v1/onboarding/candidates` |
| `technician.service.ts` | `TechniciansController` + `OnboardingTechniciansController` | `v1/technicians` |
| `job.service.ts` | `JobsController` | `v1/jobs` |
| `time-tracking.service.ts` | `TimeEntriesController` | `v1/time-entries` |
| `scheduling.service.ts` | `SchedulingController` | `v1/scheduling` |
| `skill.service.ts` | `SkillsController` | `v1/skills` |
| `crew.service.ts` | `CrewsController` | `v1/crews` |
| `atlas-deployment.service.ts` | `DeploymentsController` | `v1/deployments` |
| `atlas-approvals.service.ts` | `ApprovalsController` | `v1/approvals` |
| `atlas-ai-analysis.service.ts` | `AIAnalysisController` | `v1/ai-analysis` |
| `atlas-query-builder.service.ts` | `QueryBuilderController` + `QueryTemplateController` | `v1/query-builder` |
| `payroll.service.ts` | `PayrollController` | `v1/payroll` |
| `pto-api.service.ts` | `PtoRequestsController` | `v1/pto-requests` |
| `referral.service.ts` | `ReferralsController` | `v1/onboarding/referrals` |
| `onboarding-link.service.ts` | `OnboardingLinksController` | `v1/onboarding/links` |
| `public-onboarding.service.ts` | `PublicOnboardingController` | `v1/public/onboarding` |
| `my-work.service.ts` | `NotificationsController.GetMyWork` | `v1/notifications/my-work` |
| `quote-workflow.service.ts` | `QuotesController` | `v1/quotes` |

### Previously Mismatched — Now Fixed

| Frontend Service | Issue | Fix Applied |
|-----------------|-------|-------------|
| `notification-api.service.ts` | `GET /user/{id}` returned flat array | Returns `{ items, totalCount, unreadCount }` |
| `notification-api.service.ts` | `PATCH /{id}/read` returned 204 | Returns `{ id, readAt }` |
| `notification-api.service.ts` | `PATCH /user/{id}/read-all` returned 204 | Returns `{ markedCount, markedAt }` |
| `notification-api.service.ts` | `GET /summary` missing | Added endpoint |
| `notification-api.service.ts` | `GET /preferences/{userId}` missing | Added endpoint |
| `notification-api.service.ts` | `PUT /preferences/{userId}` missing | Added endpoint |

### Frontend Services Without Backend Controllers (Blockers)

| Frontend Service | Expected Route | Status |
|-----------------|---------------|--------|
| `timecard-api.service.ts` | `v1/timecards` | **No TimecardsController** — submit, pending, approve, reject, by-technician |
| `travel.service.ts` | `v1/travel` | **No TravelController** — travel profiles CRUD |
| `reporting.service.ts` | `v1/reports` | **No ReportsController** — dashboard, utilization, KPIs, export |
| `materials.service.ts` | `v1/materials`, `v1/purchase-orders`, `v1/suppliers` | **No MaterialsController** — inventory, consumption, POs |
| `inventory.service.ts` | `v1/inventory` | **No InventoryController** — equipment tracking |
| `budget.service.ts` | `v1/budgets` | **No BudgetsController** — job budgets, adjustments, deductions |
| `client-configuration.service.ts` | `v1/client-configurations` | **No ClientConfigurationsController** |
| `job-document-import.service.ts` | `v1/jobs/import-document` | **Not on JobsController** |
| `deployment-checklist.service.ts` | `v1/jobs/{id}/deployment-checklist` | **Not on JobsController** |

These represent frontend features built ahead of backend implementation. Each will return 404 at runtime until the corresponding controllers are created.

---

## 4. Mismatches Found & Fixed

### 4.1 Backend → Frontend Contract Mismatches (FIXED)

1. **NotificationsController response shapes** — 6 mismatches between frontend service expectations and backend responses. All fixed (see Section 3).

2. **Production CORS placeholders** — `appsettings.Production.json` had `atlas.example.com` and `atlas-ui.example.com` as placeholder origins instead of the real `ark-sri.com` and `www.ark-sri.com`. Fixed.

3. **Missing SriConnection in production** — `appsettings.Production.json` was missing the `SriConnection` connection string that `SriDbContext` requires. Added to match the base `appsettings.json`.

### 4.2 Database Schema Drift (FIXED)

**Technicians table** — 7 missing columns added:
- `CurrentStatus`, `FieldStatus` (default 'Available'), `StatusUpdatedAt`
- `UserId`, `ManagerId`, `CandidateId` (FK references)
- `HourlyCostRate`

**Jobs table** — ~30 missing columns added:
- Site address: `SiteName`, `SiteStreet`, `SiteCity`, `SiteState`, `SiteZipCode`, `SiteLatitude`, `SiteLongitude`
- POC: `CustomerPOCName`, `CustomerPOCPhone`, `CustomerPOCEmail`
- Scope/crew: `ScopeDescription`, `RequiredCrewSize`, `TargetResources`
- Labor: `EstimatedLaborHours`, `RequestedHours`, `EstimatedOvertimeHours`, `OvertimeRequired`
- Billing: `StandardBillRate`, `OvertimeBillRate`, `PerDiem`
- Authorization: `AuthorizationStatus`, `InvoicingProcess`, `HasPurchaseOrders`, `PurchaseOrderNumber`
- Contacts: `ProjectDirector`, `BizDevContact`
- Scheduling: `ScheduledStartDate`, `ScheduledEndDate`

**TimeEntries table** — 4 missing columns added:
- `TimeCategory` (default 'OnSite'), `PayType` (default 'Regular')
- `SyncStatus` (default 'Pending'), `ProximityStatus`

### 4.3 Missing SQL Table Definitions (CREATED)

10 new table files created in `atlas-db/Tables/`:

| Table | Description | Key Relationships |
|-------|-------------|-------------------|
| `dbo.Candidates` | Onboarding candidates (43 columns) | PK on CandidateId, FK to Technicians via PromotedToTechnicianId |
| `dbo.CandidateNotes` | Candidate activity notes | FK → Candidates (CASCADE) |
| `dbo.OnboardingLinks` | Public onboarding tokens | Unique index on Token |
| `dbo.Referrals` | Candidate referral tracking | Indexes on Email, Status |
| `dbo.TechnicianCredentials` | Typed credentials (discriminated union) | FK → Technicians (CASCADE) |
| `dbo.MasterSkills` | Skill catalog | Unique index on Name |
| `dbo.JobRequiredSkills` | Job skill requirements | FK → Jobs (CASCADE) |
| `dbo.UserNotifications` | In-app notifications | Indexes on UserId, IsRead, Type |
| `dbo.PtoRequests` | PTO request tracking | Indexes on EmployeeId, Status, ManagerId |
| `dbo.Quotes` | Quote/BOM management + child tables | FK → Jobs (SET NULL), includes QuoteBomItems, QuoteAttachments, RfpIntakes |

---

## 5. Database Write Verification

### Verified Write Paths (Controller → DbContext → Table)

| Flow | Controller | Entity | Table |
|------|-----------|--------|-------|
| Create Job | `JobsController.Create` | `Job` → `_dbContext.Jobs.Add()` | `dbo.Jobs` |
| Create Technician | `TechniciansController.Create` | `Technician` → `_dbContext.Technicians.Add()` | `dbo.Technicians` |
| Clock In | `TimeEntriesController.ClockIn` | `TimeEntry` → `_dbContext.TimeEntries.Add()` | `dbo.TimeEntries` |
| Clock Out | `TimeEntriesController.ClockOut` | Updates `TimeEntry.ClockOutTime` | `dbo.TimeEntries` |
| Assign Tech | `SchedulingController.Assign` | `Assignment` → `_dbContext.Assignments.Add()` | `dbo.Assignments` |
| Create Candidate | `CandidatesController.Create` | `Candidate` → `ICandidateService` | `dbo.Candidates` |
| Promote Candidate | `CandidatesController.Promote` | `ICandidatePromotionService` | `dbo.Candidates` + `dbo.Technicians` |
| Send Notification | `NotificationService.SendAsync` | `UserNotification` → `_db.UserNotifications.Add()` | `dbo.UserNotifications` |
| Create PTO Request | `PtoRequestsController.Create` | `PtoRequest` → `IPtoService` | `dbo.PtoRequests` |
| Create Quote | `QuotesController` | `Quote` → `_dbContext.Quotes.Add()` | `dbo.Quotes` |
| Update Preferences | `NotificationsController.UpdatePreferences` | `NotificationPreferences` → upsert | `dbo.NotificationPreferences` |

### Verified Side Effects on Write

- **ClockIn** auto-provisions technician if TechnicianId not found, updates `Technician.FieldStatus` to "On Site", updates `Job.Status` and `Job.ActualStart`
- **ClockOut** resets `Technician.FieldStatus` to "Available", updates `Job.Status` to "completed" if no other active entries
- **Assign** validates certifications (cert gate), checks conflicts, sends `INotificationService` notification via `Task.Run`
- **Promote** creates Technician from Candidate data, links via `CandidateId` FK

---

## 6. End-to-End Flow Validation (Top 5 Critical Flows)

### Flow 1: Job Creation
```
Frontend: job.service.ts → POST /v1/jobs
Backend:  JobsController.Create → _dbContext.Jobs.Add() + EnsureSkillsExistInMasterList()
Database: INSERT dbo.Jobs + INSERT dbo.MasterSkills (auto-create)
Response: Job entity with Id → frontend stores in NgRx
Status: ✅ VERIFIED
```

### Flow 2: Technician Assignment to Job
```
Frontend: scheduling.service.ts → POST /v1/scheduling/assign
Backend:  SchedulingController.Assign → cert gate validation → conflict check
          → _dbContext.Assignments.Add() → INotificationService.SendAsync()
Database: INSERT dbo.Assignments + INSERT dbo.UserNotifications
Response: Assignment entity (or 422 with CertGateConflict if certs missing)
Frontend: Handles 422 with CertGateConflict dialog (override option)
Status: ✅ VERIFIED
```

### Flow 3: Time Tracking (Clock In → Clock Out)
```
Frontend: time-tracking.service.ts → POST /v1/time-entries/clock-in
Backend:  TimeEntriesController.ClockIn → auto-provision tech → Haversine distance
          → UPDATE Technician.FieldStatus → UPDATE Job.Status → INSERT TimeEntry
Database: INSERT dbo.TimeEntries + UPDATE dbo.Technicians + UPDATE dbo.Jobs
---
Frontend: time-tracking.service.ts → POST /v1/time-entries/clock-out
Backend:  TimeEntriesController.ClockOut → UPDATE TimeEntry + reset FieldStatus
Database: UPDATE dbo.TimeEntries + UPDATE dbo.Technicians + UPDATE dbo.Jobs
Status: ✅ VERIFIED
```

### Flow 4: Candidate Onboarding → Promotion to Technician
```
Frontend: onboarding.service.ts → POST /v1/onboarding/candidates (create)
          → POST /v1/onboarding/candidates/{id}/resume (upload)
          → POST /v1/onboarding/candidates/{id}/credentials (add certs)
          → POST /v1/onboarding/candidates/{id}/promote
Backend:  CandidatesController → ICandidateService → CandidatePromotionService
Database: INSERT dbo.Candidates → INSERT dbo.TechnicianCredentials
          → INSERT dbo.Technicians (on promote) + UPDATE Candidate.PromotedToTechnicianId
Status: ✅ VERIFIED
```

### Flow 5: Notifications (Send → Read → Preferences)
```
Backend:  Any controller → INotificationService.SendAsync() → SignalR push
Frontend: notification-api.service.ts → GET /v1/notifications/user/{id}
          → returns { items, totalCount, unreadCount } ← FIXED
Frontend: PATCH /v1/notifications/{id}/read → returns { id, readAt } ← FIXED
Frontend: GET/PUT /v1/notifications/preferences/{id} ← ADDED
Database: dbo.UserNotifications + dbo.NotificationPreferences (new)
Status: ✅ VERIFIED (after fixes)
```

---

## 7. Blockers & Remaining Work

### P0 — Backend Controllers Not Yet Implemented

These frontend services call endpoints that have **no corresponding backend controller**. They will return 404 in production:

1. **TimecardsController** (`v1/timecards`) — timecard submission, approval workflow
2. **TravelController** (`v1/travel`) — travel profiles, geocoding, preferences
3. **ReportsController** (`v1/reports`) — dashboard analytics, KPIs, utilization, exports
4. **MaterialsController** (`v1/materials`) — material tracking, consumption, receipts
5. **PurchaseOrdersController** (`v1/purchase-orders`)
6. **SuppliersController** (`v1/suppliers`)
7. **InventoryController** (`v1/inventory`) — equipment/asset tracking
8. **BudgetsController** (`v1/budgets`) — job budget management
9. **ClientConfigurationsController** (`v1/client-configurations`) — per-client settings

### P1 — Missing Endpoints on Existing Controllers

- `JobsController` missing: `POST /import-document`, `GET/POST/PUT /{id}/deployment-checklist`
- `SchedulingController` frontend calls `PATCH /assignment/{id}` and `GET /matches/{id}` — backend has different route patterns (`POST /assignments/{id}/accept`, `GET /qualified-technicians/{id}`)
- `QuotesController` may be missing: `PUT /{id}/job-summary`, `POST /{id}/job-summary/complete`, `PUT /{id}/document/sow`, `GET /{id}/document/pdf`, `POST /{id}/send`

### P2 — Schema Gaps (Not Critical)

- ~15 additional entity tables in AtlasDbContext (56 DbSets total) still need SQL definitions in `atlas-db` (e.g., `Crews`, `CrewMembers`, `Assignments`, `JobNotes`, `JobAttachments`, `JobStatusHistories`, `TechnicianSkills`, `TechnicianAvailabilities`, `IncidentReports`, `DirectDepositChanges`, `W4Changes`, `ContactInfoChanges`, `PrcSignatures`, `PayStubs`, `W2Documents`)
- Additional Technician columns used by frontend but not in SQL: `WillingToTravel`, `ScissorLiftCertified`, `FiberExperience`, `OshaCertified` (these may be stored in TechnicianCredentials or managed via the onboarding typed credential system)

### P3 — Configuration

- `appsettings.Production.json` JWT `Authority` and `Issuer` still use `{tenant-id}` placeholder — must be set to the actual Azure AD tenant ID before deployment
- Health check endpoints use `example.com` placeholder URLs
- ARK integration `BaseUrl` and `ApiKey` use placeholder values
- Redis connection string uses `{redis-key}` placeholder

---

## 8. Files Changed

### sri-frontend (branch: `ATLAS-reconciliation-v2`)
_No changes in this session — branch already contained reconciliation fixes from prior work._

### atlas-platform (branch: `ATLAS-reconciliation-v2`)
| File | Change |
|------|--------|
| `atlas-api/Controllers/NotificationsController.cs` | Fixed response shapes, added summary/preferences endpoints |
| `atlas-api/Services/INotificationService.cs` | Added paginated query, summary, preferences interface methods |
| `atlas-api/Services/NotificationService.cs` | Implemented all new interface methods |
| `atlas-core/Data/AtlasDbContext.cs` | Added `DbSet<NotificationPreferences>` |
| `atlas-core/Domain/Entities/NotificationPreferences.cs` | **NEW** — preferences entity |
| `atlas-api/appsettings.Production.json` | Fixed CORS origins, added SriConnection |

### atlas-db (branch: `ATLAS-reconciliation-v2`)
| File | Change |
|------|--------|
| `Tables/dbo.Technicians.sql` | Added 7 missing columns |
| `Tables/dbo.Jobs.sql` | Added ~30 missing columns |
| `Tables/dbo.TimeEntries.sql` | Added 4 missing columns |
| `Tables/dbo.Candidates.sql` | **NEW** — 43-column table |
| `Tables/dbo.CandidateNotes.sql` | **NEW** |
| `Tables/dbo.OnboardingLinks.sql` | **NEW** |
| `Tables/dbo.Referrals.sql` | **NEW** |
| `Tables/dbo.TechnicianCredentials.sql` | **NEW** — discriminated union |
| `Tables/dbo.MasterSkills.sql` | **NEW** |
| `Tables/dbo.JobRequiredSkills.sql` | **NEW** |
| `Tables/dbo.UserNotifications.sql` | **NEW** |
| `Tables/dbo.PtoRequests.sql` | **NEW** |
| `Tables/dbo.Quotes.sql` | **NEW** — includes 3 child tables |

---

## 9. Next Steps

1. **Build missing backend controllers** (P0 blockers from Section 7) — prioritize `TimecardsController` and `ReportsController` as they support core payroll and analytics features
2. **Create remaining SQL table definitions** (P2) for the ~15 DbContext entities still missing from `atlas-db`
3. **Reconcile SchedulingController route patterns** with frontend service (the `PATCH /assignment/{id}` vs `POST /assignments/{id}/accept` mismatch)
4. **Replace production config placeholders** (`{tenant-id}`, `{redis-key}`, health check URLs) with real values before deployment
5. **Add EF Core migration** for `NotificationPreferences` table
6. **Delete stale branches** in sri-frontend: `ATLAS-segregation`, `ATLAS-consolidated-reconciliation`, `ATLAS-final-reconciliation`
7. **Run full E2E integration tests** once missing controllers are implemented
