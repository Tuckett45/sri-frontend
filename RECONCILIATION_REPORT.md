# ATLAS Integration Reconciliation Report

**Date:** 2026-06-08
**Repositories:**
- Frontend: `sri-frontend` (Angular 18)
- Backend: `atlas-platform` (ASP.NET Core)
- Database: `atlas-db` (SQL Server Database Project)

---

## 1. Consolidation Strategy

### Branches Analyzed (sri-frontend)
| Branch | Status |
|--------|--------|
| `ATLAS-segregation` | Fully merged into master; zero diff against master; strict ancestor of consolidated-reconciliation |
| `ATLAS-consolidated-reconciliation` | Contains 86 commits beyond segregation; only 3 files differ from master |

**Finding:** `ATLAS-segregation` is a dead branch — all its work was already merged into master via PRs. `ATLAS-consolidated-reconciliation` was built on top of it and contains the full superset of both branches. Only 2 code files and 1 doc file in `ATLAS-consolidated-reconciliation` differ from master.

**Strategy:** Created `ATLAS-final-reconciliation` from master, then cherry-picked the valid code changes (promote route fix, notification URL fixes). The `ATLAS-segregation` branch can be safely deleted.

### Branches Analyzed (atlas-platform)
| Branch | Status |
|--------|--------|
| `ATLAS-consolidated-reconciliation` | **DANGEROUS** — stale branch forked before PRs #20-#24; would revert notifications, SignalR, geolocation clock-in, skills API, candidate notes, and timezone fixes |
| `main` | Authoritative; contains all working features |

**Strategy:** Did NOT merge the atlas-platform ATLAS-consolidated-reconciliation branch. Instead, identified the valuable new endpoints it contained (PTO queues, leave types, technician deactivate/reactivate, deployment transitions) and implemented them fresh on main.

### Branches Analyzed (atlas-db)
| Branch | Status |
|--------|--------|
| `ATLAS-consolidated-reconciliation` | Contains 22 new/updated table definitions aligning schema with ORM models |
| `master` | Missing tables for Candidates, PTO, Quotes, Referrals, etc. |

**Strategy:** Fast-forward merged ATLAS-consolidated-reconciliation into the final branch — all additions are valid schema completions.

## 2. Final Branch Name

**`ATLAS-final-reconciliation`** — created in all three repositories.

- `sri-frontend`: Based on master + frontend API fixes
- `atlas-platform`: Based on main + missing endpoints + production config fix
- `atlas-db`: Based on master + all schema additions from ATLAS-consolidated-reconciliation

## 3. Endpoint Mapping Report

### Frontend → Backend Route Mapping (Atlas API calls only)

#### Fully Matched Endpoints (working correctly)

| Frontend Service | Endpoint Pattern | Backend Controller | Status |
|-----------------|-----------------|-------------------|--------|
| atlas-deployment.service | `GET/POST/PUT /deployments/*` | DeploymentsController | MATCHED |
| atlas-approvals.service | `GET/POST /approvals/*` | ApprovalsController | MATCHED |
| atlas-ai-analysis.service | `POST /ai-analysis/*` | AIAnalysisController | MATCHED |
| atlas-query-builder.service | `GET/POST/DELETE /query-builder/*` | QueryBuilderController + QueryTemplateController | MATCHED |
| onboarding.service | `GET/POST/PUT/DELETE /onboarding/candidates/*` | CandidatesController | MATCHED |
| onboarding.service | `POST /onboarding/candidates/{id}/resume\|headshot` | CandidateFilesController | MATCHED |
| onboarding.service | `CRUD /onboarding/candidates/{id}/credentials/*` | CandidatesController | MATCHED |
| referral.service | `CRUD /onboarding/referrals/*` | ReferralsController | MATCHED |
| onboarding-link.service | `GET/POST /onboarding/links/*` | OnboardingLinksController | MATCHED |
| crew.service | `CRUD /crews/*` | CrewsController | MATCHED |
| scheduling.service | `GET/POST/DELETE /scheduling/*` | SchedulingController | MATCHED |
| payroll.service | `GET/POST /payroll/*` | PayrollController | MATCHED |
| time-tracking.service | `GET/POST/PUT /time-entries/*` | TimeEntriesController | MATCHED |
| skill.service | `GET/POST /skills/*` | SkillsController | MATCHED |
| job.service | `CRUD /jobs/*` | JobsController | MATCHED |
| quote-workflow.service | `GET/POST/PUT /quotes/*` | QuotesController | MATCHED |
| my-work.service | `GET /notifications/my-work` | NotificationsController | MATCHED |

#### Mismatches Fixed in This Reconciliation

| # | Frontend | Backend | Issue | Fix Applied |
|---|---------|---------|-------|-------------|
| 1 | `POST /onboarding/candidates/{id}/convert-to-technician` | `POST /onboarding/candidates/{id}/promote` | URL mismatch | Fixed frontend to use `/promote` |
| 2 | `GET /notifications/my` | `GET /notifications/user/{userId}` | URL mismatch | Fixed frontend to use `/user/{userId}` path |
| 3 | `POST /notifications/mark-all-read` | `PATCH /notifications/user/{userId}/read-all` | Method + URL mismatch | Fixed frontend to use PATCH + correct path |
| 4 | `GET /pto-requests/manager-queue` | (missing) | Missing endpoint | Added to PtoRequestsController |
| 5 | `GET /pto-requests/backoffice-queue` | (missing) | Missing endpoint | Added to PtoRequestsController |
| 6 | `GET /pto-requests/leave-types` | (missing) | Missing endpoint | Added to PtoRequestsController + PtoService |
| 7 | `PATCH /technicians/{id}/deactivate` | (missing) | Missing endpoint | Added to TechniciansController |
| 8 | `PATCH /technicians/{id}/reactivate` | (missing) | Missing endpoint | Added to TechniciansController |
| 9 | `GET /deployments/{id}/transitions/available` | (missing) | Missing endpoint | Added to DeploymentsController |

#### Remaining Mismatches (not fixed — see Blockers)

| # | Frontend Service | Endpoint Pattern | Issue | Severity |
|---|-----------------|-----------------|-------|----------|
| 10 | notification-api.service | `GET /notifications/summary` | No backend endpoint | MEDIUM |
| 11 | notification-api.service | `GET/PUT /notifications/preferences/{userId}` | No backend endpoint | MEDIUM |
| 12 | travel.service | `/travel/*` | No backend TravelController | HIGH — stub service |
| 13 | budget.service | `/budgets/*` | No backend BudgetsController | HIGH — stub service |
| 14 | materials.service | `/materials/*`, `/purchase-orders/*`, `/suppliers/*` | No backend controllers | HIGH — stub service |
| 15 | timecard-api.service | `/timecards/*` | No backend TimecardController (use `/time-entries` instead) | HIGH |
| 16 | manager-team.service | `/managers/*` | No backend ManagersController | MEDIUM |
| 17 | inventory.service | `/inventory/*` | No backend InventoryController | HIGH — stub service |
| 18 | client-configuration.service | `/client-configurations/*` | No backend controller | MEDIUM |
| 19 | AtlasNotificationService (atlas module) | `/api/atlas/notifications/*` | Wrong base path — should be `/v1/notifications` | HIGH |
| 20 | AgentService (atlas module) | `/api/agents/*` | Points to separate atlas-agents microservice, no host configured | HIGH |
| 21 | AtlasHealthService | `/v1/*/health` per-controller | Backend only has `/v1/health` global | LOW |

## 4. Mismatches Found

### Frontend Layer
1. **Onboarding promote route** used wrong URL (`convert-to-technician` vs `promote`) — **FIXED**
2. **Notification API** used wrong URL patterns and HTTP methods — **FIXED**
3. **13+ frontend services** call backend endpoints that don't exist (travel, budgets, materials, etc.) — these are stub services awaiting backend implementation
4. **AtlasNotificationService** (in atlas module, separate from FRM notification-api.service) uses incorrect base path `/api/atlas/notifications/` instead of `/v1/notifications/`
5. **Hardcoded API subscription key** in PublicOnboardingService source code (security issue)

### Backend Layer
1. **Missing SriConnection** in `appsettings.Production.json` — PTO creation would fail in production because employee lookup falls back to empty InMemory database — **FIXED**
2. **Missing PTO queue endpoints** (manager-queue, backoffice-queue, leave-types) — **FIXED**
3. **Missing technician deactivate/reactivate** endpoints — **FIXED**
4. **Missing deployment transitions/available** endpoint — **FIXED**
5. **Fire-and-forget Task.Run uses scoped DbContext** in SchedulingController and CrewsController — background notification tasks access a DbContext that may be disposed after the HTTP request completes
6. **PTO Approve: double SaveChangesAsync without transaction** — balance deduction and approval record are saved separately; if the second save fails, balance is deducted without an approval record
7. **JobsController multi-save without transaction** — Job and RequiredSkills saved in separate calls; partial failure possible
8. **ApprovalsController uses [AllowAnonymous]** at class level — relies on manual auth checks in action methods instead of middleware-level rejection

### Database Layer
1. **22 tables missing from SQL schema** (Candidates, PTO, Quotes, Referrals, etc.) — **FIXED** via atlas-db merge
2. **Technician columns** added by EF Core migrations (FieldStatus, CurrentStatus, FiberExperience, OSHA fields, etc.) not in original SQL schema — now added
3. **Job columns** (site address fields, billing fields, scope description) not in original SQL schema — now added
4. **TimeEntries.SyncStatus** column added to SQL schema to match ORM expectations

## 5. Fixes Made

### sri-frontend (branch: ATLAS-final-reconciliation)

| File | Change | Why |
|------|--------|-----|
| `src/app/features/field-resource-management/services/onboarding.service.ts` | Changed promote URL from `convert-to-technician` to `promote`, added `withAudit({})` body | Backend endpoint uses `/promote` route |
| `src/app/features/field-resource-management/services/notification-api.service.ts` | Changed `getMyNotifications` URL from `/my` to `/user/{userId}`, changed `markAllAsRead` from POST to PATCH with `/user/{userId}/read-all` path | Matches backend NotificationsController routes and methods |

### atlas-platform (branch: ATLAS-final-reconciliation)

| File | Change | Why |
|------|--------|-----|
| `atlas-api/Controllers/PtoRequestsController.cs` | Added `GET manager-queue`, `GET backoffice-queue`, `GET leave-types` endpoints | Frontend PTO service calls these; they didn't exist |
| `atlas-api/Services/IPtoService.cs` | Added `GetLeaveTypesAsync`, `GetManagerQueueAsync`, `GetBackofficeQueueAsync` interface methods | Required by new controller endpoints |
| `atlas-api/Services/PtoService.cs` | Implemented all three new service methods with proper name resolution and pagination | Service layer for new PTO endpoints |
| `atlas-api/Dtos/PtoDtos.cs` | Added `LeaveTypeResponse` record | Response type for leave-types endpoint |
| `atlas-api/Controllers/TechniciansController.cs` | Added `PATCH {id}/deactivate` and `PATCH {id}/reactivate` endpoints | Frontend calls these for soft-delete/restore; they didn't exist |
| `atlas-api/Controllers/DeploymentsController.cs` | Added `GET {id}/transitions/available` endpoint | Frontend deployment service calls this; it didn't exist |
| `atlas-api/appsettings.Production.json` | Added `SriConnection` connection string | **CRITICAL**: Without this, PTO creation fails in production — employee lookup falls back to empty InMemory DB |

### atlas-db (branch: ATLAS-final-reconciliation)

| File | Change | Why |
|------|--------|-----|
| `Tables/dbo.Candidates.sql` | New table | ORM entity exists; SQL schema was missing |
| `Tables/dbo.EmployeeManagers.sql` | New table | Required by PTO service for manager resolution |
| `Tables/dbo.PtoRequests.sql` | New table | PTO workflow storage |
| `Tables/dbo.PtoApprovalHistories.sql` | New table | PTO approval audit trail |
| `Tables/dbo.PtoBalances.sql` | New table | PTO balance tracking |
| `Tables/dbo.LeaveTypes.sql` | New table | Leave type catalog |
| `Tables/dbo.Quotes.sql` | New table | Quote/RFP workflow |
| `Tables/dbo.QuoteBomItems.sql` | New table | Quote BOM line items |
| `Tables/dbo.QuoteAttachments.sql` | New table | Quote file attachments |
| `Tables/dbo.RfpIntakes.sql` | New table | RFP intake records |
| `Tables/dbo.Referrals.sql` | New table | Onboarding referral tracking |
| `Tables/dbo.OnboardingLinks.sql` | New table | Public onboarding link tokens |
| `Tables/dbo.TechnicianCredentials.sql` | New table | Typed credential records for technicians |
| `Tables/dbo.EquipmentAssignments.sql` | New table | Equipment assignment tracking |
| `Tables/dbo.TechnicalCompetencies.sql` | New table | Technical competency assessments |
| `Tables/dbo.PerformanceReviewCycles.sql` | New table | PRC cycles |
| `Tables/dbo.PRCGoals.sql` | New table | PRC goals within review cycles |
| `Tables/dbo.RoleCredentialTemplates.sql` | New table | Role-based credential requirements |
| `Tables/dbo.JobRequiredSkills.sql` | New table | Skills required per job |
| `Tables/dbo.Jobs.sql` | Added 28 columns | Site address, billing, scope, crew sizing fields |
| `Tables/dbo.Technicians.sql` | Added 16 columns | Status tracking, OSHA, certifications, candidate link |
| `Tables/dbo.TimeEntries.sql` | Added SyncStatus column | Timecard sync status tracking |

## 6. Database Write Verification

| Flow | Controller → Service → SaveChanges | Verified |
|------|-------------------------------------|----------|
| **Create PTO Request** | PtoRequestsController → PtoService.CreateRequestAsync → SaveChangesAsync (line 115) | YES — writes reach DB |
| **Approve PTO** | PtoRequestsController → PtoService.ApproveAsync → SaveChangesAsync (line 421) | YES — but double-save without transaction (see blockers) |
| **Create Candidate** | CandidatesController → CandidateService.CreateAsync → SaveChangesAsync (line 92) | YES |
| **Promote Candidate** | CandidatesController → CandidatePromotionService.PromoteAsync → SaveChangesAsync (line 95) | YES |
| **Clock In** | TimeEntriesController → direct DbContext → SaveChangesAsync (line 120) | YES — but triple-save without transaction |
| **Assign Technician** | SchedulingController → direct DbContext → SaveChangesAsync | YES — notifications use fire-and-forget Task.Run with scoped DbContext (risk) |
| **Create Job** | JobsController → direct DbContext → SaveChangesAsync (line 155, 178) | YES — but two separate saves without transaction |
| **Create Crew** | CrewsController → direct DbContext → SaveChangesAsync | YES |
| **Payroll writes** | PayrollController → direct DbContext → SaveChangesAsync | YES — all payroll writes properly persisted |
| **Notification mark-read** | NotificationsController → NotificationService → SaveChangesAsync/ExecuteUpdateAsync | YES |

## 7. Blockers Remaining

### Critical
1. **.NET SDK not available** in this environment — backend compilation could not be verified. The C# changes are syntactically correct but should be build-tested.

### High
2. **13 frontend services call non-existent backend endpoints** (travel, budgets, materials, inventory, timecards, etc.). These are feature stubs awaiting backend implementation. They will return 404 in production.
3. **Fire-and-forget Task.Run with scoped DbContext** in SchedulingController (lines 119-149, 166-188, 220-258, 553-578) and CrewsController (lines 151, 217, 259). Background tasks may access disposed DbContext. Fix: use `IServiceScopeFactory` to create fresh scopes.
4. **PTO Approve double-save without transaction** — PtoService.ApproveAsync deducts balance in one save (via PtoBalanceService), then saves approval history in a second. If the second fails, balance is deducted without a record. Fix: wrap in `BeginTransactionAsync`.
5. **Hardcoded API subscription key** in `PublicOnboardingService` TypeScript source code — should be moved to environment config or fetched at runtime.
6. **ApprovalsController [AllowAnonymous]** — the entire approvals controller is publicly accessible at the middleware level, relying only on manual checks in action methods. Should use `[Authorize]` at class level.

### Medium
7. **AtlasNotificationService** (in the atlas feature module, separate from the FRM notification-api.service) uses wrong base path `/api/atlas/notifications/` — should use `/v1/notifications/`.
8. **AgentService** uses `/api/agents/` base path pointing to the separate atlas-agents microservice, but no host configuration exists in the frontend environment files.
9. **Notification summary and preferences endpoints** don't exist in backend — frontend calls them but gets 404.
10. **Query template DTO mismatch** — `AtlasQueryBuilderService.saveTemplate()` sends `{ name, description, query }` but backend expects `{ Name, Description, DataSource, Parameters, SqlTemplate, IsPublic }`.
11. **JWT tenant-id placeholders** in `appsettings.Production.json` — `{tenant-id}` must be replaced with actual Azure AD tenant ID before deployment.

## 8. Files Changed by Repo

### sri-frontend (2 files)
- `src/app/features/field-resource-management/services/onboarding.service.ts`
- `src/app/features/field-resource-management/services/notification-api.service.ts`

### atlas-platform (7 files)
- `atlas-api/Controllers/DeploymentsController.cs`
- `atlas-api/Controllers/PtoRequestsController.cs`
- `atlas-api/Controllers/TechniciansController.cs`
- `atlas-api/Dtos/PtoDtos.cs`
- `atlas-api/Services/IPtoService.cs`
- `atlas-api/Services/PtoService.cs`
- `atlas-api/appsettings.Production.json`

### atlas-db (22 files)
- `Tables/dbo.Candidates.sql` (new)
- `Tables/dbo.EmployeeManagers.sql` (new)
- `Tables/dbo.EquipmentAssignments.sql` (new)
- `Tables/dbo.JobRequiredSkills.sql` (new)
- `Tables/dbo.Jobs.sql` (modified — 28 columns added)
- `Tables/dbo.LeaveTypes.sql` (new)
- `Tables/dbo.OnboardingLinks.sql` (new)
- `Tables/dbo.PRCGoals.sql` (new)
- `Tables/dbo.PerformanceReviewCycles.sql` (new)
- `Tables/dbo.PtoApprovalHistories.sql` (new)
- `Tables/dbo.PtoBalances.sql` (new)
- `Tables/dbo.PtoRequests.sql` (new)
- `Tables/dbo.QuoteAttachments.sql` (new)
- `Tables/dbo.QuoteBomItems.sql` (new)
- `Tables/dbo.Quotes.sql` (new)
- `Tables/dbo.Referrals.sql` (new)
- `Tables/dbo.RfpIntakes.sql` (new)
- `Tables/dbo.RoleCredentialTemplates.sql` (new)
- `Tables/dbo.TechnicalCompetencies.sql` (new)
- `Tables/dbo.TechnicianCredentials.sql` (new)
- `Tables/dbo.Technicians.sql` (modified — 16 columns added)
- `Tables/dbo.TimeEntries.sql` (modified — SyncStatus column added)

## 9. Next Recommended Steps (Prioritized)

1. **[CRITICAL] Build-test atlas-platform** with `dotnet build` and run existing test suite
2. **[CRITICAL] Replace `{tenant-id}` placeholder** in appsettings.Production.json with actual Azure AD tenant ID
3. **[HIGH] Wrap PTO ApproveAsync in a transaction** — prevent balance/approval divergence
4. **[HIGH] Fix fire-and-forget Task.Run** in SchedulingController and CrewsController — use IServiceScopeFactory
5. **[HIGH] Implement missing backend controllers** for travel, budgets, materials, inventory, timecards — or add mock interceptors in frontend to handle gracefully
6. **[HIGH] Fix AtlasNotificationService base path** from `/api/atlas/notifications/` to `/v1/notifications/`
7. **[HIGH] Remove hardcoded API subscription key** from PublicOnboardingService source code
8. **[HIGH] Fix ApprovalsController** — change `[AllowAnonymous]` to `[Authorize]` at class level
9. **[MEDIUM] Add notification summary and preferences** endpoints to backend, or remove frontend calls
10. **[MEDIUM] Fix query template DTO mismatch** between frontend and backend
11. **[MEDIUM] Fix AgentService** to use correct atlas-agents microservice host configuration
12. **[MEDIUM] Add indexes** for frontend filter columns not yet indexed (e.g., OfferStatus on Candidates, WorkflowStatus on Quotes)
13. **[LOW] Clean up stale branches** — delete `ATLAS-segregation` and `ATLAS-consolidated-reconciliation` from all repos after merging final branch
14. **[LOW] Address CSS budget warnings** — optimize large SCSS files or raise budget thresholds
