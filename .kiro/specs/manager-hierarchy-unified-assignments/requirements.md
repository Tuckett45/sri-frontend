# Requirements Document: Manager Hierarchy & Unified Assignments

## Introduction

This feature establishes a manager/supervisor hierarchy across the SRI platform and delivers a unified "My Assignments" view where every user can see all work items requiring their attention. Currently, the system has a flat user model with no reporting structure, and assignments are scattered across disconnected subsystems (PTO approvals, job assignments, RFP/quotes, expenses, timecards, schedule changes, inventory requests). This spec bridges the three systems (sri-backend, atlas-platform, sri-frontend) into a cohesive workflow.

The work spans three repositories:
- **sri-backend** (.NET 8 / Dapper / Azure SQL) — User management, auth, legacy data
- **atlas-platform** (.NET 8 / EF Core / Azure SQL) — FRM features, PTO/Overtime, approvals
- **sri-frontend** (Angular 18 / NgRx) — Frontend application

## Glossary

- **Manager_Hierarchy**: A tree structure defining who reports to whom. Each employee has at most one direct manager. Managers can have multiple direct reports.
- **Direct_Report**: An employee who reports directly to a given manager.
- **Approval_Chain**: The ordered sequence of managers from an employee up to the top of the org tree.
- **Assignment**: Any work item that requires action from a specific user (approval needed, task assigned, review required, etc.)
- **Assignment_Inbox**: A unified view showing all pending assignments for the authenticated user across all subsystems.
- **Assignment_Type**: The category of work item (pto_approval, overtime_approval, job_assignment, rfp_assignment, expense_approval, timecard_approval, schedule_change, inventory_request, hr_approval)
- **User_Identity**: The cross-system identity linking a sri-backend User to an atlas-platform User/Technician.
- **Org_Admin**: A user with permission to manage the org hierarchy (typically Admin, HR, or CM roles).

---

## Requirement 1: Manager Hierarchy Data Model

**User Story:** As an organization, we need a defined reporting structure so that approval workflows can automatically route to the correct manager and managers can see their team.

### Acceptance Criteria

1. THE system SHALL store manager-employee relationships in a `ManagerHierarchy` table with fields: `Id`, `EmployeeUserId`, `ManagerUserId`, `Market`, `EffectiveDate`, `EndDate` (nullable, for history), `CreatedBy`, `CreatedAt`, `UpdatedAt`.
2. EACH employee SHALL have at most ONE active manager (where EndDate is null) at any point in time.
3. THE system SHALL support multi-level hierarchy (manager's manager, etc.) via recursive lookup.
4. THE system SHALL store this data in the atlas-platform database (AtlasDbContext) as the source of truth for approval routing.
5. THE system SHALL sync manager assignments from the sri-backend `Users` table when users are created/updated (using the existing `AtlasSyncService` pattern).
6. WHEN a manager relationship changes, THE system SHALL preserve history by setting `EndDate` on the old record and creating a new active record.
7. THE system SHALL support querying: "Who are my direct reports?", "Who is my manager?", "What is the full chain up to the top?", and "Who are all employees under a given manager (recursive)?".

---

## Requirement 2: Hierarchy Management UI

**User Story:** As an Org Admin (HR, Admin, CM), I want to view and manage the organizational hierarchy so that reporting relationships stay current.

### Acceptance Criteria

1. THE system SHALL provide an "Org Structure" page accessible to Admin, HR, and CM roles.
2. THE Org Structure page SHALL display a tree/list view showing all employees grouped under their managers.
3. THE system SHALL allow authorized users to assign/reassign a manager to an employee via a dropdown or search.
4. THE system SHALL allow authorized users to remove a manager assignment (making the employee a top-level/unassigned).
5. WHEN a manager is assigned, THE system SHALL validate that no circular dependency is created (A reports to B reports to A).
6. THE system SHALL display the employee's name, role, market, and current manager.
7. THE system SHALL allow filtering the hierarchy view by market.
8. THE system SHALL show a visual indicator for employees without a manager assigned.
9. WHEN a manager assignment changes, THE system SHALL immediately update approval routing for any pending PTO/OT requests from that employee.

---

## Requirement 3: Unified Assignment Types

**User Story:** As a platform architect, I need to define all assignment types so that they can be aggregated into a single inbox.

### Acceptance Criteria

1. THE system SHALL recognize the following assignment types:
   - `pto_approval` — PTO request pending approval from this user
   - `overtime_approval` — Overtime request pending approval from this user
   - `job_assignment` — Job/work order assigned to this user (technician)
   - `rfp_assignment` — RFP/Quote assigned to this user for action
   - `expense_approval` — Expense report pending approval from this user
   - `timecard_approval` — Timecard pending approval from this user
   - `schedule_change` — Schedule change requiring acknowledgment
   - `inventory_request` — Inventory/materials request pending fulfillment
   - `hr_approval` — HR action pending (onboarding, credential review, etc.)
2. EACH assignment SHALL have a common shape: `id`, `type`, `title`, `description`, `assignedToUserId`, `assignedByUserId`, `sourceId` (reference to the underlying entity), `sourceType`, `priority` (low/medium/high/urgent), `status` (pending/in_progress/completed/dismissed), `createdAt`, `updatedAt`, `dueDate` (optional), `link` (frontend route to the item).
3. THE system SHALL store assignments in a dedicated `Assignments` table in atlas-platform.
4. THE system SHALL automatically create assignment records when triggering events occur (e.g., PTO submitted → assignment created for manager).
5. THE system SHALL automatically mark assignments as completed when the underlying action is taken (e.g., PTO approved → assignment marked completed).

---

## Requirement 4: Assignment Creation Triggers

**User Story:** As the system, I need to automatically create assignments when relevant events occur so that users are notified of pending work.

### Acceptance Criteria

1. WHEN a PTO request is created, THE system SHALL create an assignment of type `pto_approval` for the employee's direct manager (from hierarchy).
2. WHEN an overtime request is created, THE system SHALL create an assignment of type `overtime_approval` for the employee's direct manager.
3. WHEN a PTO request is manager-approved, THE system SHALL create an assignment of type `pto_approval` for the backoffice/payroll user(s).
4. WHEN a job/work order is assigned to a technician, THE system SHALL create an assignment of type `job_assignment` for that technician.
5. WHEN an RFP/Quote is assigned to a user, THE system SHALL create an assignment of type `rfp_assignment` for that user.
6. WHEN an expense report is submitted, THE system SHALL create an assignment of type `expense_approval` for the submitter's manager.
7. WHEN a timecard is submitted for approval, THE system SHALL create an assignment of type `timecard_approval` for the approver.
8. WHEN a schedule change affects a user, THE system SHALL create an assignment of type `schedule_change` for the affected user.
9. WHEN an inventory/materials request is submitted, THE system SHALL create an assignment of type `inventory_request` for the materials manager.
10. WHEN the triggering action is completed (approved, rejected, acknowledged, fulfilled), THE system SHALL mark the corresponding assignment as `completed`.
11. WHEN a request is cancelled, THE system SHALL mark the corresponding assignment as `dismissed`.

---

## Requirement 5: Unified Assignment Inbox (Frontend)

**User Story:** As any user, I want a single "My Assignments" page showing all work items requiring my attention so I can prioritize and act on them efficiently.

### Acceptance Criteria

1. THE system SHALL provide a "My Assignments" page accessible to all authenticated users from the main navigation.
2. THE Assignment Inbox SHALL display assignments sorted by priority (urgent first), then by creation date (newest first).
3. THE Assignment Inbox SHALL show for each item: type icon/badge, title, description preview, priority indicator, due date (if set), time since creation, and a direct link/button to take action.
4. THE Assignment Inbox SHALL support filtering by: assignment type, priority, and status (pending vs completed).
5. THE Assignment Inbox SHALL show a count badge in the main navigation indicating total pending assignments.
6. WHEN the user clicks an assignment, THE system SHALL navigate to the relevant detail page (e.g., PTO approval page, job detail, RFP detail).
7. THE system SHALL allow the user to dismiss/snooze an assignment (does not take the underlying action, just removes from pending view).
8. THE system SHALL support a "Mark as Done" action for informational assignments (schedule_change, etc.) that don't have a separate approval action.
9. THE Assignment Inbox SHALL auto-refresh periodically (every 60 seconds) or when the user returns to the page.
10. THE system SHALL display an empty state with helpful messaging when no assignments are pending.

---

## Requirement 6: Assignment Inbox API

**User Story:** As the frontend, I need API endpoints to fetch, filter, and manage assignments for the authenticated user.

### Acceptance Criteria

1. THE Atlas API SHALL expose `GET /v1/assignments` — returns paginated assignments for the authenticated user, with optional filters (type, priority, status, dateFrom, dateTo).
2. THE Atlas API SHALL expose `GET /v1/assignments/count` — returns the count of pending assignments for the authenticated user (for the nav badge).
3. THE Atlas API SHALL expose `POST /v1/assignments/{id}/complete` — marks an assignment as completed.
4. THE Atlas API SHALL expose `POST /v1/assignments/{id}/dismiss` — marks an assignment as dismissed.
5. THE Atlas API SHALL expose `GET /v1/assignments/summary` — returns counts grouped by type (for dashboard widgets).
6. ALL assignment endpoints SHALL be scoped to the authenticated user (cannot view or modify another user's assignments).
7. THE list endpoint SHALL support sorting by `createdAt`, `priority`, `dueDate`.
8. THE count endpoint SHALL respond in under 200ms for use in navigation badge polling.

---

## Requirement 7: Cross-System User Identity Resolution

**User Story:** As the system, I need to reliably link users across sri-backend and atlas-platform so that assignments and hierarchy work regardless of which system created the user.

### Acceptance Criteria

1. THE atlas-platform SHALL maintain a `UserIdentityMapping` table with fields: `Id`, `AtlasUserId` (GUID), `SriBackendUserId` (string GUID), `Email`, `FullName`, `Role`, `Market`, `SyncedAt`.
2. WHEN a user registers or is approved in sri-backend, THE system SHALL sync their identity to atlas-platform via the existing `AtlasSyncService` (already done for technicians, extend to all roles).
3. WHEN the frontend authenticates via sri-backend, THE system SHALL use the same user ID when calling atlas-platform endpoints (the JWT includes the user ID).
4. THE hierarchy and assignment systems SHALL use the atlas-platform user ID (GUID) as the canonical identifier.
5. THE system SHALL provide a `GET /v1/users/resolve?email={email}` endpoint that returns the atlas user ID for a given email (for manual mapping if needed).
6. THE system SHALL handle the case where a user exists in sri-backend but not yet in atlas-platform by returning appropriate errors and suggesting a sync.

---

## Requirement 8: Manager Hierarchy API

**User Story:** As the frontend and approval services, I need API endpoints to query and manage the org hierarchy.

### Acceptance Criteria

1. THE Atlas API SHALL expose `GET /v1/hierarchy/my-manager` — returns the authenticated user's direct manager.
2. THE Atlas API SHALL expose `GET /v1/hierarchy/my-reports` — returns the authenticated user's direct reports.
3. THE Atlas API SHALL expose `GET /v1/hierarchy/reports/{userId}` — returns direct reports for a given user (admin/HR only).
4. THE Atlas API SHALL expose `GET /v1/hierarchy/chain/{userId}` — returns the full management chain from user to top.
5. THE Atlas API SHALL expose `GET /v1/hierarchy/tree` — returns the full org tree (admin/HR only, for the management UI).
6. THE Atlas API SHALL expose `POST /v1/hierarchy/assign` — assigns a manager to an employee (admin/HR only). Body: `{ employeeUserId, managerUserId }`.
7. THE Atlas API SHALL expose `DELETE /v1/hierarchy/{employeeUserId}` — removes the manager assignment for an employee (admin/HR only).
8. THE assign endpoint SHALL validate no circular dependency before saving.
9. THE assign endpoint SHALL update the `EmployeeManagers` table (existing) AND the new `ManagerHierarchy` table (with history).
10. WHEN a hierarchy change occurs, THE system SHALL re-route any pending assignments that were routed based on the old manager.

---

## Non-Functional Requirements

### Performance
- Assignment count endpoint SHALL respond in under 200ms.
- Assignment list endpoint SHALL respond in under 1 second for up to 100 items.
- Hierarchy tree endpoint SHALL respond in under 2 seconds for up to 500 employees.
- Assignment creation (event-driven) SHALL complete within 500ms of the triggering action.

### Security
- All endpoints require JWT authentication.
- Hierarchy management restricted to Admin, HR, CM roles.
- Users can only see their own assignments (no cross-user access except for admins).
- Manager can see assignment summary for their direct reports.

### Reliability
- Assignment creation failures SHALL NOT block the triggering action (fire-and-forget with retry).
- If the hierarchy lookup fails during PTO/OT submission, the request SHALL still be created but flagged for manual routing.

### Data Integrity
- Circular dependency detection is mandatory before saving hierarchy changes.
- Assignment status transitions are one-way: pending → completed/dismissed (no reversal).
- Historical hierarchy records are never deleted, only end-dated.
