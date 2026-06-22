# ATLAS Integration Reconciliation Report

**Date:** 2026-06-22
**Repositories:**
- `sri-frontend` (Angular 19 frontend)
- `atlas-platform` (ASP.NET 8 backend)
- `atlas-db` (SQL Server database project)

---

## 1. Consolidation Strategy

Three branches were evaluated in `sri-frontend`:

| Branch | Status | Unique Commits vs master |
|---|---|---|
| `ATLAS-Segregation` | Merged to master via PR #119 (`dcda2fa`), then deleted | 0 (fully merged) |
| `ATLAS-segregation` | Exists, fully contained in master | 0 |
| `ATLAS-reconciliation-v2` | Exists, regressed features (removed 2251 lines) | Diverged/behind |

**Decision:** `master` is the canonical superset branch containing all ATLAS-Segregation work. A new branch `ATLAS-reconciliation-final` was created from `origin/master` for this reconciliation work.

## 2. Final Branch Name

`ATLAS-reconciliation-final` (branched from master at HEAD)

## 3. Endpoint Mapping Report

### 3.1 Frontend Services to Backend Controllers (ATLAS API)

| Frontend Service | Route Prefix | Backend Controller | Status |
|---|---|---|---|
| technician.service.ts | `/v1/technicians` | TechniciansController + OnboardingTechniciansController | MATCH |
| job.service.ts | `/v1/jobs` | JobsController | MATCH |
| crew.service.ts | `/v1/crews` | CrewsController | MATCH |
| scheduling.service.ts | `/v1/scheduling` | SchedulingController | MATCH |
| time-tracking.service.ts | `/v1/time-entries` | TimeEntriesController | MATCH |
| onboarding.service.ts | `/v1/onboarding/candidates` | CandidatesController | MATCH |
| onboarding-link.service.ts | `/v1/onboarding/links` | OnboardingLinksController | MATCH |
| notification-api.service.ts | `/v1/notifications` | NotificationsController | MATCH |
| pto-api.service.ts | `/v1/pto-requests` | PtoRequestsController | MATCH |
| payroll.service.ts | `/v1/payroll` | PayrollController | MATCH |
| referral.service.ts | `/v1/onboarding/referrals` | ReferralsController | MATCH |
| skill.service.ts | `/v1/skills` | SkillsController | MATCH |
| quote-workflow.service.ts | `/v1/quotes` | QuotesController | MATCH |
| public-onboarding.service.ts | `/v1/public/onboarding` | PublicOnboardingController | MATCH |
| exception.service.ts | `/v1/exceptions` | ExceptionsController | MATCH |
| approval.service.ts | `/v1/approvals` | ApprovalsController | MATCH |
| deployment.service.ts | `/v1/deployments` | DeploymentsController | MATCH |
| ai-analysis.service.ts | `/v1/ai-analysis` | AIAnalysisController | MATCH |
| **timecard-api.service.ts** | **`/v1/timecards`** | **None** | **MISSING** |

### 3.2 SignalR Hub Mapping

| Frontend Service | Hub Path | Backend Hub | Status |
|---|---|---|---|
| frm-signalr.service.ts | `/hubs/field-resource-management` | FrmHub | MATCH |
| atlas-signalr.service.ts | `/hubs/atlas` | None | MISSING |
| deployments-socket.service.ts | `/hubs/deployments` | None | MISSING |

### 3.3 FrmHub Method Mapping (After Fix)

| Frontend Invoke | Backend Method | Status |
|---|---|---|
| SubscribeToTechnicianUpdates | SubscribeToTechnicianUpdates | MATCH |
| UnsubscribeFromTechnicianUpdates | UnsubscribeFromTechnicianUpdates | MATCH |
| UpdateLocation | UpdateLocation | MATCH |
| JoinMarketGroup | JoinMarketGroup | MATCH |
| LeaveMarketGroup | LeaveMarketGroup | MATCH |
| RequestEventSync | RequestEventSync | MATCH |
| AcceptAssignment | AcceptAssignment | FIXED (was missing) |
| RejectAssignment | RejectAssignment | FIXED (was missing) |
| UpdateJobStatus | UpdateJobStatus | FIXED (was missing) |
| StartJob | StartJob | FIXED (was missing) |
| CompleteJob | CompleteJob | FIXED (was missing) |
| SendNotification | SendNotification | FIXED (was missing) |
| BroadcastToMarket | BroadcastToMarket | FIXED (was missing) |
| UpdateCrewLocation | UpdateCrewLocation | FIXED (was missing) |
| BroadcastChecklistUpdate | BroadcastChecklistUpdate | FIXED (was missing) |
| BroadcastQuoteUpdate | BroadcastQuoteUpdate | FIXED (was missing) |

### 3.4 Legacy SRI Backend Endpoints (Out of Scope)

These frontend services target `environment.apiUrl` (legacy SRI backend), not the ATLAS backend:
- `deployment-api.service.ts` -> `/deployments/*`
- `BUDGET_ENDPOINTS` -> `/budgets/*`
- `TRAVEL_ENDPOINTS` -> `/travel/*`
- `TIMECARD_ENDPOINTS` -> `/holidays/*`, `/auto-submit/*`, `/pay-rates/*`

## 4. Mismatches Found

### 4.1 FIXED - FrmHub Missing 10 Methods (atlas-platform)
The frontend's `frm-signalr.service.ts` invoked 16 SignalR hub methods, but only 6 existed in `FrmHub.cs`. Added implementations for: AcceptAssignment, RejectAssignment, UpdateJobStatus, StartJob, CompleteJob, SendNotification, BroadcastToMarket, UpdateCrewLocation, BroadcastChecklistUpdate, BroadcastQuoteUpdate.

### 4.2 FIXED - Database Schema Drift (atlas-db)
25 tables existed in the EF model but were completely missing from `atlas-db/Tables/`. 3 existing tables (Jobs, Technicians, TimeEntries) were missing columns that the backend actively writes to.

### 4.3 NOT FIXED - Missing TimecardController
Frontend `timecard-api.service.ts` calls `/v1/timecards/*` (submit, pending, approve, reject, request-correction, by-technician, current). No controller exists. This is a feature gap requiring a new controller, Timecard entity, and database table.

### 4.4 NOT FIXED - Missing `/hubs/atlas` Hub
The `atlas-signalr.service.ts` connects to `/hubs/atlas` for deployment lifecycle events (DeploymentCreated, DeploymentUpdated, etc.). No backend hub exists. Falls back to polling.

### 4.5 NOT FIXED - Missing `/hubs/deployments` Hub
The `deployments-socket.service.ts` connects to `/hubs/deployments`. No hub exists. May be intended for the legacy SRI backend.

## 5. Fixes Made

### atlas-platform (1 file changed)
| File | Change |
|---|---|
| `atlas-api/Hubs/FrmHub.cs` | Added 10 missing SignalR hub methods that the frontend actively invokes |

### atlas-db (28 files changed: 25 new, 3 modified)

**New table definitions (25):**

| File | Entity |
|---|---|
| `dbo.Candidates.sql` | Candidate pipeline with 37 columns |
| `dbo.CandidateNotes.sql` | Notes per candidate |
| `dbo.OnboardingLinks.sql` | Token-based onboarding links |
| `dbo.UserNotifications.sql` | In-app notifications |
| `dbo.MasterSkills.sql` | Skills catalog |
| `dbo.TechnicianCredentials.sql` | Polymorphic credential records |
| `dbo.EquipmentAssignments.sql` | Equipment tracking |
| `dbo.TechnicalCompetencies.sql` | Competency records |
| `dbo.PerformanceReviewCycles.sql` | PRC tracking |
| `dbo.PRCGoals.sql` | Goals per PRC |
| `dbo.RoleCredentialTemplates.sql` | Role-based credential requirements |
| `dbo.EmployeeManagers.sql` | Employee-manager PTO routing |
| `dbo.Quotes.sql` | Full quote/RFP workflow |
| `dbo.QuoteBomItems.sql` | BOM line items |
| `dbo.QuoteAttachments.sql` | Quote file attachments |
| `dbo.RfpIntakes.sql` | RFP intake records |
| `dbo.PtoRequests.sql` | PTO requests with ROWVERSION |
| `dbo.PtoApprovalHistories.sql` | PTO approval audit trail |
| `dbo.PtoBalances.sql` | PTO balances with ROWVERSION |
| `dbo.LeaveTypes.sql` | Leave type lookup |
| `dbo.Referrals.sql` | Referral tracking |
| `dbo.JobRequiredSkills.sql` | Required skills per job |
| `dbo.SpectrumSyncMetadata.sql` | Spectrum sync state tracking |
| `dbo.SpectrumIdMapping.sql` | Spectrum-to-Atlas ID mapping |
| `dbo.SpectrumWriteAuditLog.sql` | Spectrum write-back audit |

**Updated table definitions (3):**

| File | Columns Added |
|---|---|
| `dbo.Technicians.sql` | 19 columns: UserId (FK to Users), CandidateId, ManagerId, CurrentStatus, FieldStatus, StatusUpdatedAt, WillingToTravel, ScissorLiftCertified, FiberExperience, OshaCertified, OshaCertNumber, OshaCertExpiration, LiftCertifications, ShiftAvailability, BackgroundCheckStatus, DrugScreenStatus, IsVeteran, MilitaryBranch, SpectrumEmployeeId, SpectrumEmployeeNumber, LastSpectrumSync + 3 indexes |
| `dbo.Jobs.sql` | 28 columns: site address fields, scope, customer POC, financial/billing fields, authorization, Spectrum sync fields + filtered index on SpectrumJobId |
| `dbo.TimeEntries.sql` | 4 columns: TimeCategory, PayType, SyncStatus, ProximityStatus |

## 6. Database Write Verification

| Service | Write Method | Awaits SaveChanges | Concurrency | Status |
|---|---|---|---|---|
| CandidateService | CRUD operations | Yes | Single context | OK |
| CandidateNoteService | Add/Update/Delete | Yes | Single context | OK |
| OnboardingService | Create/Update candidate | Yes | Single context | OK |
| OnboardingLinkService | Generate/Revoke | Yes | ConcurrencyCheck on UsedAt | OK |
| CandidatePromotionService | Convert to Technician | Yes | Single context | OK |
| PtoService | Create/Cancel/Approve/Reject | Yes | Single context | CAUTION |
| PtoBalanceService | Deduct/Credit | Yes | ROWVERSION concurrency | OK |
| NotificationService | Create notification | Yes | Graceful SignalR failure | OK |
| TimeEntriesController | Clock-in/Clock-out/Update | Yes | Single context | OK |
| FrmHub | UpdateLocation + 10 new methods | Yes | Single context | OK |
| CandidateFileService | Upload resume/headshot | N/A (Blob only) | No DB write | OK |
| SchedulingController | Assign/Reassign/BulkAssign | Yes | Single context | OK |
| PayrollController | All payroll operations | Yes | Single context | OK |

**Caution:** PtoService calls PtoBalanceService.DeductAsync() after approving a PTO request without wrapping both operations in an explicit transaction. If DeductAsync fails, the request is approved but the balance is not deducted.

## 7. Blockers Remaining

### P0 - Missing Backend Feature
1. **TimecardController not implemented.** Frontend expects `/v1/timecards/*` endpoints for weekly timecard submit/approve/reject workflow. Needs new controller, Timecard entity, and database table. Blocks the timecard review/approval UI.

### P1 - Missing SignalR Hubs
2. **`/hubs/atlas` hub does not exist.** Deployment lifecycle events hub needed for real-time updates. Currently falls back to polling.
3. **`/hubs/deployments` hub does not exist.** May be intended for legacy SRI backend.

### P2 - Schema Deployment
4. **25 new SQL table definitions need deployment.** SQL files created in atlas-db but must be deployed to the production database. Backend currently creates some of these via EF inline migrations in Program.cs.

### P3 - Security
5. **appsettings.json contains plaintext secrets.** BlobStorage AccountKey and KeyVault SpectrumDbPassword are committed in clear text. Should be rotated and moved to Azure Key Vault.

## 8. Files Changed by Repo

### sri-frontend
| File | Type |
|---|---|
| `RECONCILIATION_REPORT.md` | New |

### atlas-platform
| File | Type |
|---|---|
| `atlas-api/Hubs/FrmHub.cs` | Modified |

### atlas-db (28 files)
| File | Type |
|---|---|
| `Tables/dbo.Candidates.sql` | New |
| `Tables/dbo.CandidateNotes.sql` | New |
| `Tables/dbo.OnboardingLinks.sql` | New |
| `Tables/dbo.UserNotifications.sql` | New |
| `Tables/dbo.MasterSkills.sql` | New |
| `Tables/dbo.TechnicianCredentials.sql` | New |
| `Tables/dbo.EquipmentAssignments.sql` | New |
| `Tables/dbo.TechnicalCompetencies.sql` | New |
| `Tables/dbo.PerformanceReviewCycles.sql` | New |
| `Tables/dbo.PRCGoals.sql` | New |
| `Tables/dbo.RoleCredentialTemplates.sql` | New |
| `Tables/dbo.EmployeeManagers.sql` | New |
| `Tables/dbo.Quotes.sql` | New |
| `Tables/dbo.QuoteBomItems.sql` | New |
| `Tables/dbo.QuoteAttachments.sql` | New |
| `Tables/dbo.RfpIntakes.sql` | New |
| `Tables/dbo.PtoRequests.sql` | New |
| `Tables/dbo.PtoApprovalHistories.sql` | New |
| `Tables/dbo.PtoBalances.sql` | New |
| `Tables/dbo.LeaveTypes.sql` | New |
| `Tables/dbo.Referrals.sql` | New |
| `Tables/dbo.JobRequiredSkills.sql` | New |
| `Tables/dbo.SpectrumSyncMetadata.sql` | New |
| `Tables/dbo.SpectrumIdMapping.sql` | New |
| `Tables/dbo.SpectrumWriteAuditLog.sql` | New |
| `Tables/dbo.Technicians.sql` | Modified |
| `Tables/dbo.Jobs.sql` | Modified |
| `Tables/dbo.TimeEntries.sql` | Modified |

## 9. Next Recommended Steps

1. **Implement TimecardController** - Create the `/v1/timecards` controller with submit/approve/reject workflows. Add Timecards table that aggregates TimeEntries into approval-ready weekly periods.

2. **Deploy atlas-db schema** - Run the 25 new CREATE TABLE scripts against the Atlas database. Reconcile with EF inline migrations in Program.cs to avoid conflicts.

3. **Implement `/hubs/atlas` hub** - Create a deployment-events hub broadcasting DeploymentCreated, DeploymentUpdated, StateTransitioned, EvidenceSubmitted, ApprovalRequested events. Wire into DeploymentsController and ApprovalsController.

4. **Rotate exposed secrets** - BlobStorage AccountKey and SpectrumDbPassword in appsettings.json should be rotated and moved to Azure Key Vault references.

5. **Add PTO transaction scope** - Wrap PtoService.ApproveAsync + PtoBalanceService.DeductAsync in an explicit transaction.

6. **Clean up branches** - Delete `ATLAS-segregation` (fully merged to master). Delete `ATLAS-reconciliation-v2` (regresses features).

7. **Add atlas-db CI/CD** - Add GitHub Actions workflow to validate SQL syntax and deploy schema changes on merge.
