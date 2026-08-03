# Implementation Plan: Manager Hierarchy & Unified Assignments

## Overview

This plan implements the manager hierarchy and unified assignments system across three repositories. Work is ordered by dependency: data models first, then APIs, then frontend integration, then wiring triggers.

## Tasks

- [ ] 1. Data Models (atlas-platform)
  - [ ] 1.1 Create ManagerHierarchy entity (Id, EmployeeUserId, ManagerUserId, Market, EffectiveDate, EndDate, CreatedBy, CreatedAt, UpdatedAt). Add DbSet + indexes. Req: 1.1, 1.2, 1.6
  - [ ] 1.2 Create Assignment entity (Id, Type, Title, Description, AssignedToUserId, AssignedByUserId, AssignedByName, SourceId, SourceType, Priority, Status, Link, DueDate, CreatedAt, UpdatedAt, CompletedAt). Add DbSet + indexes. Req: 3.2, 3.3
  - [ ] 1.3 Create UserIdentityMapping entity (Id, AtlasUserId, SriBackendUserId, Email, FullName, Role, Market, SyncedAt). Add DbSet + unique index on Email. Req: 7.1
  - [ ] 1.4 Write SQL migration script for all three tables + seed from existing EmployeeManagers. Req: 1.1, 1.4, 3.3, 7.1

- [ ] 2. Hierarchy API (atlas-platform)
  - [ ] 2.1 Create IHierarchyService/HierarchyService (GetManager, GetReports, GetChain, GetTree, AssignManager with circular detection, RemoveManager with history). Req: 1.2, 1.3, 1.6, 1.7, 2.5
  - [ ] 2.2 Create HierarchyController (7 endpoints: my-manager, my-reports, reports/{id}, chain/{id}, tree, POST assign, DELETE). Req: 8.1-8.10
  - [ ] 2.3 Create DTOs (ManagerInfoDto, DirectReportDto, ChainNodeDto, OrgTreeNodeDto, AssignManagerDto). Req: 8.1-8.7
  - [ ] 2.4 Register in DI + update EmployeeManagers on assign for backward compat. Req: 2.9, 8.9

- [ ] 3. Assignments API (atlas-platform)
  - [ ] 3.1 Create IAssignmentService/AssignmentService (GetMyAssignments, GetPendingCount, GetSummary, CreateAssignment, Complete, Dismiss, CompleteBySource). Req: 3.4, 3.5, 4.10, 4.11
  - [ ] 3.2 Create AssignmentsController (GET /, GET /count, GET /summary, POST /{id}/complete, POST /{id}/dismiss). Req: 6.1-6.8
  - [ ] 3.3 Create DTOs (AssignmentFilterDto, AssignmentResponse, CountResponse, SummaryResponse, CreateAssignmentDto). Req: 6.1, 6.5
  - [ ] 3.4 Register in DI. Req: 6.1

- [ ] 4. Assignment Triggers (atlas-platform)
  - [ ] 4.1 PTO submit → create pto_approval assignment for manager. Req: 4.1
  - [ ] 4.2 PTO manager approve → complete manager assignment, create backoffice assignment. Req: 4.3, 4.10
  - [ ] 4.3 Overtime submit → create overtime_approval assignment for manager. Req: 4.2
  - [ ] 4.4 Approve/reject → mark assignment completed. Req: 4.10
  - [ ] 4.5 Cancel → mark assignment dismissed. Req: 4.11
  - [ ] 4.6 Job assignment → create job_assignment for technician. Req: 4.4
  - [ ] 4.7 RFP/Quote assignment → create rfp_assignment for user. Req: 4.5

- [ ] 5. User Identity Sync (sri-backend + atlas-platform)
  - [ ] 5.1 Extend AtlasSyncService to sync ALL user roles (not just technicians). Req: 7.2, 7.3
  - [ ] 5.2 Create UserIdentityController (GET /resolve?email, POST /sync). Req: 7.5, 7.6
  - [ ] 5.3 Create bulk sync job (admin-triggered + periodic Hangfire reconciliation). Req: 7.2
  - [ ] 5.4 Add identity resolution in hierarchy/assignment services. Req: 7.4

- [ ] 6. Frontend — Org Structure (sri-frontend)
  - [ ] 6.1 Create OrgStructureComponent (tree view, expand/collapse, unassigned section). Req: 2.1, 2.2
  - [ ] 6.2 Create manager assignment dialog (search+select manager, validation). Req: 2.3, 2.4, 2.5
  - [ ] 6.3 Add market filter and employee search. Req: 2.7
  - [ ] 6.4 Add visual indicators (no-manager badge, role chips, market label). Req: 2.6, 2.8
  - [ ] 6.5 Create HierarchyApiService (frontend). Req: 8.1-8.7
  - [ ] 6.6 Add route /org-structure with Admin/HR/CM guard. Req: 2.1

- [ ] 7. Frontend — Assignments Inbox (sri-frontend)
  - [ ] 7.1 Create AssignmentsApiService (getMyAssignments, getPendingCount, getSummary, complete, dismiss). Req: 6.1-6.5
  - [ ] 7.2 Create AssignmentsInboxComponent (card list, filter chips, priority sort, empty state). Req: 5.1-5.4, 5.6-5.10
  - [ ] 7.3 Create AssignmentCardComponent (priority border, view/dismiss/done buttons). Req: 5.3, 5.6-5.8
  - [ ] 7.4 Add nav badge with polling (60s interval, optimistic updates). Req: 5.5, 5.9
  - [ ] 7.5 Add route /assignments accessible to all users. Req: 5.1
  - [ ] 7.6 Add assignments summary widget to Home Dashboard. Req: 5.5

- [ ] 8. Integration & Polish
  - [ ] 8.1 Update PTO approval dashboard to show hierarchy context. Req: 2.9
  - [ ] 8.2 Re-enable "My Team" route wired to hierarchy API. Req: 1.7
  - [ ] 8.3 Seed initial hierarchy data (import from org chart/spreadsheet). Req: 1.4
  - [ ] 8.4 Add assignment archival Hangfire job (90-day cleanup). Req: 3.5

## Notes

- Task 1 blocks everything else
- Tasks 2-4 can be parallelized after Task 1
- Task 5 should happen early to populate identity mappings
- Tasks 6-7 depend on Tasks 2-3 being deployed
- Assignment triggers (Task 4) can be rolled out incrementally
- Nav badge polling should use a lightweight optimized endpoint
