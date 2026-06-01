# ATLAS Integration Reconciliation Report

**Date:** 2026-06-01
**Repositories:** sri-frontend, atlas-platform, atlas-db
**Working Branch:** ATLAS-consolidated-reconciliation

---

## 1. Consolidation Strategy

Both `ATLAS-segregation` and `ATLAS-Segregation` branches in sri-frontend were analyzed against `master`.

- **ATLAS-Segregation** was merged into master via PR #119 (spec test changes).
- **ATLAS-segregation** has zero unmerged commits — all changes are already in master.

**Decision:** No consolidation work needed. Master is the canonical branch containing all work from both branches. The working branch `ATLAS-consolidated-reconciliation` was created from master for this reconciliation effort.

## 2. Final Branch Name

`master` (canonical). Reconciliation fixes applied on branch `ATLAS-consolidated-reconciliation` in each repository.

## 3. Endpoint Mapping Report

### Frontend to Backend Route Audit (110 endpoints across 11 services)

| Frontend Service | Base Path | Backend Controller | Endpoints | Match Rate |
|---|---|---|---|---|
| technician.service.ts | /technicians | TechniciansController | 12 | 12/12 (after fix) |
| job.service.ts | /jobs | JobsController | 18 | 18/18 (after fix) |
| crew.service.ts | /crews | CrewsController | 11 | 11/11 |
| scheduling.service.ts | /scheduling | SchedulingController | 12 | 12/12 |
| onboarding.service.ts | /onboarding | CandidatesController + CandidateFilesController | 8 | 8/8 (after fix) |
| payroll.service.ts | /payroll | PayrollController | 16 | 16/16 |
| pto-api.service.ts | /pto-requests | PtoRequestsController | 9 | 9/9 (after fix) |
| onboarding-link.service.ts | /onboarding/links | OnboardingLinksController | 3 | 3/3 |
| public-onboarding.service.ts | /public/onboarding | PublicOnboardingController | 2 | 2/2 |
| atlas-deployment.service.ts | /deployments | DeploymentsController | 11 | 11/11 (after fix) |
| atlas-approvals.service.ts | /approvals | ApprovalsController | 8 | 8/8 |

**Overall: 110/110 endpoints matched after fixes (100%).**

### Environment URL Configuration

All frontend services use `environment.atlasApiUrl` which resolves to:
- **Production:** `https://atlas-api-fqf5e6dfgdebepan.centralus-01.azurewebsites.net/v1`
- **Staging:** `https://atlas-api-staging.azurewebsites.net/v1`
- **Local:** `https://localhost:7028/v1` (fixed — was missing `/v1` prefix)

Backend controllers use `[Route("v{version:apiVersion}/...")]` with `[ApiVersion("1.0")]`, resulting in `/v1/...` prefixed routes. URLs now align across all environments.

## 4. Mismatches Found

### 4.1 Environment URL Missing Version Prefix (FIXED)
- **File:** `sri-frontend/src/environments/environments.ts`
- **Issue:** Local dev `atlasApiUrl` was `https://localhost:7028` — missing the `/v1` version prefix that all backend controllers require.
- **Impact:** All local API calls would 404.

### 4.2 Onboarding Promote Route Mismatch (FIXED)
- **File:** `sri-frontend/.../onboarding.service.ts`
- **Issue:** Frontend called `candidates/{id}/convert-to-technician` but backend route is `candidates/{id}/promote`.
- **Impact:** Candidate-to-Technician conversion would 404.

### 4.3 Promote Endpoint Missing Body (FIXED)
- **File:** `sri-frontend/.../onboarding.service.ts`
- **Issue:** Frontend sent empty body `{}` to promote endpoint, but backend `PromoteCandidateDto` expects `UserName` and `Timestamp` fields.
- **Impact:** Promote calls would fail with 400 Bad Request.
- **Fix:** Used existing `withAudit({})` helper to send audit metadata.

### 4.4 Missing Technician Endpoints (FIXED)
- **File:** `atlas-platform/.../TechniciansController.cs`
- **Issue:** Frontend calls `PATCH /technicians/{id}/deactivate` and `PATCH /technicians/{id}/reactivate` — no backend handlers existed.
- **Impact:** Deactivate/reactivate actions would 404.

### 4.5 Missing Technician UserId on Create (FIXED)
- **File:** `atlas-platform/.../TechniciansController.cs`
- **Issue:** `CreateTechnicianRequest` DTO lacked `UserId` property that frontend sends.
- **Impact:** New technicians would not be linked to their user accounts.

### 4.6 Missing PTO Endpoints (FIXED)
- **File:** `atlas-platform/.../PtoRequestsController.cs`
- **Issue:** Frontend calls `GET /pto-requests/manager-queue`, `GET /pto-requests/backoffice-queue`, and `GET /pto-requests/leave-types` — none existed in the controller.
- **Impact:** Manager/backoffice PTO approval queues and leave type dropdown would fail.

### 4.7 PTO Filter DTO Shape Mismatch (FIXED)
- **File:** `atlas-platform/.../PtoDtos.cs`
- **Issue:** `PtoRequestFilterDto` was a positional record with `PtoRequestStatus?` enum for Status, but queue endpoints need string-based filtering and `ManagerId` field.
- **Impact:** Queue filtering would fail at runtime.

### 4.8 Missing Deployment Available Transitions Endpoint (FIXED)
- **File:** `atlas-platform/.../DeploymentsController.cs`
- **Issue:** Frontend calls `GET /deployments/{id}/transitions/available` — no handler existed.
- **Impact:** UI cannot display which state transitions are possible for a deployment.

### 4.9 Missing Job Attachment Download Endpoint (FIXED)
- **File:** `atlas-platform/.../JobsController.cs`
- **Issue:** Frontend calls `GET /jobs/{id}/attachments/{attachmentId}/download` — only upload and list endpoints existed.
- **Impact:** Downloaded attachments would 404.

### 4.10 Swallowed JSON Deserialization Errors (FIXED)
- **File:** `atlas-platform/.../QuotesController.cs`
- **Issue:** Three `catch` blocks in `DeserializeStatusHistory()`, `GetValidationSteps()`, and `DeserializeLaborItems()` silently swallowed `JsonException` without logging.
- **Impact:** Corrupt JSON data would be invisible in production logs.

### 4.11 Database Schema Gaps (FIXED)
- 19 tables existed in the EF Core DbContext but had no SQL table definitions in atlas-db.
- 3 existing tables (Technicians, Jobs, TimeEntries) were missing columns that the backend adds via startup migrations.

### 4.12 Security Flag: Hardcoded API Key
- **File:** `sri-frontend/.../public-onboarding.service.ts`
- **Issue:** Contains a hardcoded `Ocp-Apim-Subscription-Key` header value. This should be moved to environment configuration.
- **Status:** Flagged only — not changed (requires coordination with API Management).

## 5. Fixes Made

### sri-frontend (2 files changed)
| File | Change |
|---|---|
| `src/environments/environments.ts` | Added `/v1` suffix to local `atlasApiUrl` |
| `src/app/.../onboarding.service.ts` | Changed promote route from `convert-to-technician` to `promote`; added `withAudit({})` body |

### atlas-platform (8 files changed)
| File | Change |
|---|---|
| `atlas-api/Controllers/TechniciansController.cs` | Added `deactivate` and `reactivate` endpoints; added `UserId` to create DTO and mapping |
| `atlas-api/Controllers/PtoRequestsController.cs` | Added `manager-queue`, `backoffice-queue`, and `leave-types` endpoints |
| `atlas-api/Controllers/DeploymentsController.cs` | Added `GET /{id}/transitions/available` endpoint using `DeploymentTransitions.GetValidNextStates()` |
| `atlas-api/Controllers/JobsController.cs` | Added `GET /{id}/attachments/{attachmentId}/download` endpoint |
| `atlas-api/Controllers/QuotesController.cs` | Added `JsonException` logging to 3 catch blocks |
| `atlas-api/Dtos/PtoDtos.cs` | Refactored `PtoRequestFilterDto` to class with init props; added `LeaveTypeResponse` record |
| `atlas-api/Services/IPtoService.cs` | Added `GetLeaveTypesAsync()` to interface |
| `atlas-api/Services/PtoService.cs` | Implemented `GetLeaveTypesAsync()`; added `ManagerId` filtering; changed Status filter to string-based |

### atlas-db (22 files: 3 modified, 19 created)
| File | Change |
|---|---|
| `Tables/dbo.Technicians.sql` | Added 17 columns (UserId, CandidateId, ManagerId, certifications, etc.) + FK + indexes |
| `Tables/dbo.Jobs.sql` | Added 22 extended columns matching backend migration (site address, contact, etc.) |
| `Tables/dbo.TimeEntries.sql` | Added TimeCategory, PayType, SyncStatus columns |
| `Tables/dbo.Candidates.sql` | **NEW** — 30+ columns for onboarding candidates |
| `Tables/dbo.PtoRequests.sql` | **NEW** — PTO request lifecycle |
| `Tables/dbo.PtoBalances.sql` | **NEW** — Annual PTO balance tracking |
| `Tables/dbo.PtoApprovalHistories.sql` | **NEW** — PTO approval audit trail |
| `Tables/dbo.LeaveTypes.sql` | **NEW** — Leave type reference data |
| `Tables/dbo.Referrals.sql` | **NEW** — Employee referral program |
| `Tables/dbo.TechnicianCredentials.sql` | **NEW** — Typed credentials (licenses, certs) |
| `Tables/dbo.EquipmentAssignments.sql` | **NEW** — Equipment tracking |
| `Tables/dbo.TechnicalCompetencies.sql` | **NEW** — Skill assessments |
| `Tables/dbo.PerformanceReviewCycles.sql` | **NEW** — PRC management |
| `Tables/dbo.PRCGoals.sql` | **NEW** — PRC goals |
| `Tables/dbo.RoleCredentialTemplates.sql` | **NEW** — Role-based required credentials |
| `Tables/dbo.EmployeeManagers.sql` | **NEW** — Employee-manager relationships |
| `Tables/dbo.JobRequiredSkills.sql` | **NEW** — Job skill requirements |
| `Tables/dbo.OnboardingLinks.sql` | **NEW** — Public onboarding link tokens |
| `Tables/dbo.Quotes.sql` | **NEW** — Quote workflow (50+ columns) |
| `Tables/dbo.QuoteBomItems.sql` | **NEW** — Quote bill of materials |
| `Tables/dbo.QuoteAttachments.sql` | **NEW** — Quote file attachments |
| `Tables/dbo.RfpIntakes.sql` | **NEW** — RFP intake tracking |

## 6. Database Write Verification

### Entity Coverage: 53/53 DbSet entities have corresponding SQL table definitions

Entity-to-table mappings verified against `AtlasDbContext`:
- `TypedCredential` maps to `TechnicianCredentials` (custom table name)
- `PrcGoal` maps to `PRCGoals` (custom table name)
- `DeploymentException` maps to `Exceptions` (custom table name)
- All other entities map to standard pluralized table names.

### Backend Write Safety Audit

| Category | Finding |
|---|---|
| Missing `await` on `SaveChangesAsync()` | None found — all async DB writes properly awaited |
| Swallowed exceptions | 3 in QuotesController (FIXED — added logging) |
| Missing `SaveChangesAsync()` after mutation | None found |
| Unreachable code | None found |
| Transaction concerns | `OnboardingService.CompletePrcAsync()` does multi-entity update in single SaveChanges — acceptable but could benefit from explicit transaction |

### Startup Migrations vs SQL Project

The backend `Program.cs` contains raw SQL `ALTER TABLE` statements that run at startup for schema evolution. These columns are now present in the atlas-db SQL project files:
- `Jobs`: 22 site/contact/material columns
- `TimeEntries`: TimeCategory, PayType, SyncStatus
- `Technicians`: 17 extended profile columns
- `Candidates`, `TechnicianCredentials`, `RoleCredentialTemplates`, `OnboardingLinks`: full table creates

## 7. Blockers Remaining

1. **No .NET SDK in build environment** — `atlas-platform` could not be compiled in this session. Must verify the build succeeds in CI before merging.
2. **Job attachment download** — The new endpoint returns storage path metadata, but actual file streaming from blob storage is not implemented. This mirrors the existing upload pattern (which stores a path but does not persist to blob storage in the controller). Full blob integration is a separate task.
3. **Hardcoded API subscription key** in `public-onboarding.service.ts` — should be moved to environment config. Requires API Management coordination.
4. **`OnboardingTechniciansController` line 317** — `KeyNotFoundException` caught without logging. Low priority.
5. **Additional frontend services** — Several services (quote-workflow, quote-assembly, bom, budget, materials, inventory, etc.) were not individually audited for parameter-level mismatches. Route-level checks passed.
6. **SignalR services** — `deployment-signalr.service.ts` and `frm-signalr.service.ts` use WebSocket connections, not REST endpoints. These need separate verification against the backend SignalR hubs.

## 8. Files Changed by Repo

### sri-frontend
```
RECONCILIATION_REPORT.md (new)
src/environments/environments.ts
src/app/features/field-resource-management/services/onboarding.service.ts
```

### atlas-platform
```
atlas-api/Controllers/TechniciansController.cs
atlas-api/Controllers/PtoRequestsController.cs
atlas-api/Controllers/DeploymentsController.cs
atlas-api/Controllers/JobsController.cs
atlas-api/Controllers/QuotesController.cs
atlas-api/Dtos/PtoDtos.cs
atlas-api/Services/IPtoService.cs
atlas-api/Services/PtoService.cs
```

### atlas-db
```
Tables/dbo.Technicians.sql (modified)
Tables/dbo.Jobs.sql (modified)
Tables/dbo.TimeEntries.sql (modified)
Tables/dbo.Candidates.sql (new)
Tables/dbo.PtoRequests.sql (new)
Tables/dbo.PtoBalances.sql (new)
Tables/dbo.PtoApprovalHistories.sql (new)
Tables/dbo.LeaveTypes.sql (new)
Tables/dbo.Referrals.sql (new)
Tables/dbo.TechnicianCredentials.sql (new)
Tables/dbo.EquipmentAssignments.sql (new)
Tables/dbo.TechnicalCompetencies.sql (new)
Tables/dbo.PerformanceReviewCycles.sql (new)
Tables/dbo.PRCGoals.sql (new)
Tables/dbo.RoleCredentialTemplates.sql (new)
Tables/dbo.EmployeeManagers.sql (new)
Tables/dbo.JobRequiredSkills.sql (new)
Tables/dbo.OnboardingLinks.sql (new)
Tables/dbo.Quotes.sql (new)
Tables/dbo.QuoteBomItems.sql (new)
Tables/dbo.QuoteAttachments.sql (new)
Tables/dbo.RfpIntakes.sql (new)
```

## 9. Next Recommended Steps

1. **Run the .NET build and tests** in a proper CI environment to verify atlas-platform compiles cleanly with all changes.
2. **Merge `ATLAS-consolidated-reconciliation` branches** into master/main across all three repos via PRs.
3. **Move hardcoded API subscription key** from `public-onboarding.service.ts` into environment configuration.
4. **Implement blob storage integration** for job attachment download (currently returns metadata only).
5. **Audit remaining frontend services** (quote-workflow, bom, budget, materials, inventory, reporting) at the parameter/body level for shape mismatches.
6. **Verify SignalR hub configuration** matches frontend WebSocket connection setup.
7. **Add integration tests** covering the top 5 critical flows:
   - Candidate onboarding to promote to technician
   - PTO request to manager approval to backoffice approval
   - Job creation to crew assignment to scheduling
   - Deployment lifecycle state transitions
   - Quote to RFP to Job conversion
8. **Clean up dead branches** — delete `ATLAS-segregation` and `ATLAS-Segregation` from remote since both are fully merged.
9. **Review EF Core startup migrations** — the raw SQL in `Program.cs` should be replaced with proper EF Core migrations for maintainability.
