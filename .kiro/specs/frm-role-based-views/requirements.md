# Requirements Document

## Introduction

This feature adds role-based views and permission controls to the existing `field-resource-management` Angular feature. The system must enforce that each user role sees only the UI sections, data, and actions appropriate to their responsibilities — from field technicians tracking time on mobile to payroll staff managing sensitive compensation documents. The implementation builds on the existing `UserRole` enum, guards (`AdminGuard`, `TechnicianGuard`, `ManagerGuard`, `DispatcherGuard`, `PMGuard`, `CMGuard`), `BudgetPermissionService`, and `DataScopeService`.

## Glossary

- **FRM**: Field Resource Management — the Angular feature module at `src/app/features/field-resource-management`.
- **Permission_Service**: The Angular service (`PermissionService`) that stores and evaluates role-permission mappings.
- **Role_Guard**: An Angular `CanActivate` guard that restricts route access by `UserRole`.
- **FRM_Permission_Service**: A new Angular service responsible for evaluating FRM-specific permissions across all role groups.
- **Permission_Directive**: An Angular structural directive (`*frmHasPermission`) that conditionally renders UI elements based on the current user's role permissions.
- **Data_Scope_Service**: The existing `DataScopeService` that filters data arrays to the subset visible to a given role (`all`, `market`, `company`, `self`).
- **Field_Group**: Roles with field/technician-level access: `Technician` (1), `DeploymentEngineer` (2), `CM` (4), `SRITech` (8).
- **Manager_Group**: Roles with management-level access: `PM` (3), `Admin` (5), `DCOps` (6), `OSPCoordinator` (11), `EngineeringFieldSupport` (13), `MaterialsManager` (14).
- **HR_Group**: Roles with HR approval access: `HR` (9).
- **Payroll_Group**: Roles with payroll and sensitive document access: `Payroll` (15).
- **ReadOnly_Group**: Roles with limited read-only access: `VendorRep` (7), `Client` (10), `Controller` (12).
- **Timecard**: A weekly record of hours worked by a field technician, subject to approval workflows.
- **PRC**: Personnel Record Change — a document requiring a signature for employment record updates.
- **UserRole**: The existing TypeScript enum at `src/app/models/role.enum.ts` defining all system roles.

---

## Requirements

### Requirement 1: Payroll Role Addition

**User Story:** As a system administrator, I want the `Payroll` role to exist in the `UserRole` enum, so that payroll staff can be assigned the correct role and access payroll-specific features.

#### Acceptance Criteria

1. THE `UserRole` enum SHALL include a `Payroll` member with string value `'Payroll'`.
2. WHEN the `UserRole` enum is updated, THE enum SHALL preserve all existing member values without modification.
3. THE `UserRole` enum SHALL define `Payroll` as a distinct role separate from `HR`.

---

### Requirement 2: FRM Permission Service

**User Story:** As a developer, I want a centralized `FRM_Permission_Service`, so that all role-permission checks in the FRM feature use a single, consistent source of truth.

#### Acceptance Criteria

1. THE `FRM_Permission_Service` SHALL define a permission map covering all 16 `UserRole` values plus `Payroll`.
2. WHEN `FRM_Permission_Service.hasPermission(role, permission)` is called with a valid role and permission key, THE `FRM_Permission_Service` SHALL return `true` if the role holds that permission and `false` otherwise.
3. WHEN `FRM_Permission_Service.hasPermission(role, permission)` is called with a `null` or `undefined` role, THE `FRM_Permission_Service` SHALL return `false`.
4. THE `FRM_Permission_Service` SHALL expose a `getPermissionsForRole(role)` method that returns the complete set of permissions for the given role.
5. WHEN `FRM_Permission_Service.getPermissionsForRole(role)` is called with an unrecognized role, THE `FRM_Permission_Service` SHALL return an empty permission set.
6. THE `FRM_Permission_Service` SHALL define permissions as named boolean flags covering: `canStartJob`, `canEditJob`, `canViewOwnSchedule`, `canViewAllSchedules`, `canEditSchedule`, `canAssignCrew`, `canTrackTime`, `canSubmitTimecard`, `canApproveTimecard`, `canApproveExpense`, `canApproveTravelRequest`, `canApproveBreakRequest`, `canViewBudget`, `canManageBudget`, `canViewReports`, `canViewManagementReports`, `canManageIncidentReports`, `canManageDirectDeposit`, `canManageW4`, `canManageContactInfo`, `canSignPRC`, `canViewPayStubs`, `canViewW2`, `canAccessAdminPanel`, `canViewReadOnly`.
7. FOR ALL roles in `Field_Group`, THE `FRM_Permission_Service` SHALL grant `canStartJob`, `canEditJob`, `canViewOwnSchedule`, `canTrackTime`, `canSubmitTimecard`.
8. FOR ALL roles in `Manager_Group`, THE `FRM_Permission_Service` SHALL grant all `Field_Group` permissions PLUS `canViewAllSchedules`, `canEditSchedule`, `canAssignCrew`, `canApproveTimecard`, `canApproveExpense`, `canApproveTravelRequest`, `canViewBudget`, `canViewReports`, `canViewManagementReports`.
9. FOR ALL roles in `HR_Group`, THE `FRM_Permission_Service` SHALL grant `canApproveExpense`, `canApproveTravelRequest`, `canApproveTimecard`, `canApproveBreakRequest`.
10. FOR ALL roles in `Payroll_Group`, THE `FRM_Permission_Service` SHALL grant all `HR_Group` permissions PLUS `canManageIncidentReports`, `canManageDirectDeposit`, `canManageW4`, `canManageContactInfo`, `canSignPRC`, `canViewPayStubs`, `canViewW2`.
11. FOR ALL roles in `ReadOnly_Group`, THE `FRM_Permission_Service` SHALL grant only `canViewReadOnly`.
12. THE `Admin` role SHALL be granted all defined permissions.

---

### Requirement 3: Permission Directive for Template-Level Access Control

**User Story:** As a developer, I want a structural directive that conditionally renders UI elements based on role permissions, so that templates stay clean and permission logic is not duplicated across components.

#### Acceptance Criteria

1. THE `Permission_Directive` SHALL accept a permission key string as its input (e.g., `*frmHasPermission="'canApproveTimecard'"`).
2. WHEN the current user holds the specified permission, THE `Permission_Directive` SHALL render the host element.
3. WHEN the current user does not hold the specified permission, THE `Permission_Directive` SHALL remove the host element from the DOM.
4. WHEN the authenticated user changes, THE `Permission_Directive` SHALL re-evaluate and update the DOM accordingly.
5. WHEN an invalid or unrecognized permission key is provided, THE `Permission_Directive` SHALL treat it as a denied permission and remove the host element.

---

### Requirement 4: Role-Based Route Guards

**User Story:** As a security engineer, I want route guards to enforce role-group access at the routing level, so that unauthorized users cannot navigate to restricted feature areas.

#### Acceptance Criteria

1. THE `FRM` routing module SHALL protect the `approvals` route so that only `HR_Group`, `Payroll_Group`, and `Manager_Group` roles can activate it.
2. THE `FRM` routing module SHALL protect the `admin` route so that only the `Admin` role can activate it.
3. THE `FRM` routing module SHALL protect the `mobile` route so that `Field_Group` and `Manager_Group` roles can activate it.
4. THE `FRM` routing module SHALL protect the `timecard-manager` route so that only `Manager_Group`, `HR_Group`, and `Payroll_Group` roles can activate it.
5. WHEN a user without the required role attempts to activate a protected route, THE `Role_Guard` SHALL redirect the user to `/field-resource-management/dashboard` with query params `error=insufficient_permissions`.
6. THE `FRM` routing module SHALL add an `HR_Guard` that allows access for `HR_Group` and `Payroll_Group` roles.
7. THE `FRM` routing module SHALL add a `Payroll_Guard` that allows access for `Payroll_Group` roles only.
8. WHEN a user in `ReadOnly_Group` navigates to any FRM route, THE `FRM` routing module SHALL allow access only to the `dashboard` and `reports` routes.

---

### Requirement 5: Field/Technician Group View

**User Story:** As a field technician, I want to see only the tools relevant to my work, so that the interface is focused and I can complete my tasks efficiently.

#### Acceptance Criteria

1. WHEN a user with a `Field_Group` role is authenticated, THE `FRM` navigation SHALL display links for: dashboard, my schedule, jobs, mobile, timecards.
2. WHEN a user with a `Field_Group` role views the jobs list, THE `Data_Scope_Service` SHALL filter jobs to only those assigned to that user (`scope: 'self'`).
3. WHEN a user with a `Field_Group` role views the schedule, THE `FRM` SHALL display only that user's own assignments.
4. WHEN a user with a `Field_Group` role submits a timecard, THE `FRM` SHALL allow submission and set the timecard status to `pending_approval`.
5. IF a user with a `Field_Group` role attempts to access an approval, budget management, or admin route, THEN THE `Role_Guard` SHALL deny access and redirect to the dashboard.
6. WHILE a `CM` role user is authenticated, THE `FRM` SHALL grant the same field-level permissions as `Technician` PLUS the ability to view crew assignments within their market scope.

---

### Requirement 6: Manager/Admin Group View

**User Story:** As a project manager, I want visibility into crew assignments, schedules, budgets, and team approvals, so that I can effectively manage field operations.

#### Acceptance Criteria

1. WHEN a user with a `Manager_Group` role is authenticated, THE `FRM` navigation SHALL display links for: dashboard, technicians, jobs, crews, schedule, approvals, reports, map, inventory, travel, materials.
2. WHEN a user with a `Manager_Group` role views the jobs list, THE `Data_Scope_Service` SHALL apply the appropriate scope: `all` for `Admin` and `DCOps`, `market` for `OSPCoordinator` and `EngineeringFieldSupport`, `company` for `PM`.
3. WHEN a user with a `Manager_Group` role accesses the approvals section, THE `FRM` SHALL display pending timecards, travel requests, and expense approvals for their team.
4. WHEN a user with a `Manager_Group` role views the reports section, THE `FRM` SHALL display management-level reports including budget summaries and project status.
5. WHEN a user with a `Manager_Group` role edits a schedule, THE `FRM` SHALL allow crew and technician assignment changes.
6. IF a user with a `Manager_Group` role attempts to access the payroll or HR-specific document routes, THEN THE `Role_Guard` SHALL deny access and redirect to the dashboard.

---

### Requirement 7: HR Group View

**User Story:** As an HR staff member, I want to approve timecards, expenses, travel requests, and break requests, so that I can fulfill my HR responsibilities within the field management system.

#### Acceptance Criteria

1. WHEN a user with an `HR_Group` role is authenticated, THE `FRM` navigation SHALL display links for: dashboard, approvals, timecards.
2. WHEN a user with an `HR_Group` role accesses the approvals section, THE `FRM` SHALL display pending timecards, expense reports, travel requests, and break requests across all employees.
3. WHEN a user with an `HR_Group` role approves a timecard, THE `FRM` SHALL update the timecard status to `approved` and record the approver's identity and timestamp.
4. WHEN a user with an `HR_Group` role approves an expense, THE `FRM` SHALL update the expense status to `approved` and record the approver's identity and timestamp.
5. IF a user with an `HR_Group` role attempts to access payroll-specific routes (`direct-deposit`, `w4`, `pay-stubs`, `w2`, `prc`), THEN THE `Role_Guard` SHALL deny access and redirect to the dashboard.
6. IF a user with an `HR_Group` role attempts to access admin, budget management, or crew assignment routes, THEN THE `Role_Guard` SHALL deny access and redirect to the dashboard.

---

### Requirement 8: Payroll Group View

**User Story:** As a payroll staff member, I want all HR approval capabilities plus access to sensitive payroll documents and employee record changes, so that I can manage compensation and compliance tasks.

#### Acceptance Criteria

1. WHEN a user with a `Payroll_Group` role is authenticated, THE `FRM` navigation SHALL display all `HR_Group` navigation links PLUS: incident reports, direct deposit, W-4, contact info, PRC signing, pay stubs, W-2.
2. WHEN a user with a `Payroll_Group` role accesses the incident reports section, THE `FRM` SHALL display auto accident reports, work injury reports, and other reportable incident records.
3. WHEN a user with a `Payroll_Group` role submits a direct deposit change, THE `FRM` SHALL record the change with the submitter's identity and a timestamp.
4. WHEN a user with a `Payroll_Group` role submits a W-4 change, THE `FRM` SHALL record the change with the submitter's identity and a timestamp.
5. WHEN a user with a `Payroll_Group` role updates contact information (address, phone, email), THE `FRM` SHALL validate that at least one contact field is changed before saving.
6. WHEN a user with a `Payroll_Group` role signs a PRC, THE `FRM` SHALL record the digital signature with the signer's identity and timestamp.
7. WHEN a user with a `Payroll_Group` role views pay stubs or W-2 documents, THE `FRM` SHALL display the documents filtered to the selected employee.
8. IF a user with a `Payroll_Group` role attempts to access admin or crew management routes, THEN THE `Role_Guard` SHALL deny access and redirect to the dashboard.

---

### Requirement 9: Read-Only Group View

**User Story:** As a vendor representative, client, or controller, I want limited read-only access to relevant FRM data, so that I can review project status without the ability to modify records.

#### Acceptance Criteria

1. WHEN a user with a `ReadOnly_Group` role is authenticated, THE `FRM` navigation SHALL display links for: dashboard, reports only.
2. WHEN a user with a `ReadOnly_Group` role views reports, THE `Data_Scope_Service` SHALL filter report data to the scope appropriate for their role: `company` scope for `VendorRep` and `Client`, `all` scope for `Controller`.
3. WHEN a user with a `ReadOnly_Group` role views any FRM page, THE `Permission_Directive` SHALL hide all create, edit, delete, and approve action buttons.
4. IF a user with a `ReadOnly_Group` role attempts to navigate to any route other than `dashboard` or `reports`, THEN THE `Role_Guard` SHALL deny access and redirect to the dashboard.

---

### Requirement 10: Navigation Menu Filtering

**User Story:** As any authenticated user, I want the navigation menu to show only the sections I have access to, so that I am not confused by links that would be denied.

#### Acceptance Criteria

1. THE `FRM` navigation component SHALL use the `FRM_Permission_Service` to determine which menu items to render for the current user's role.
2. WHEN the current user's role changes (e.g., after re-authentication), THE `FRM` navigation component SHALL re-evaluate and re-render the menu items.
3. WHEN a user has no recognized role, THE `FRM` navigation component SHALL display only the dashboard link.
4. THE `FRM` navigation component SHALL NOT render menu items for routes the current user's role cannot activate.

---

### Requirement 11: Data Scope Alignment

**User Story:** As a system architect, I want the `Data_Scope_Service` to be extended to cover all new role groups, so that data filtering is consistent with the permission model.

#### Acceptance Criteria

1. WHEN `Data_Scope_Service.getDataScopesForRole(role)` is called with a `Field_Group` role, THE `Data_Scope_Service` SHALL return `[{ scopeType: 'self' }]`.
2. WHEN `Data_Scope_Service.getDataScopesForRole(role)` is called with `Admin` or `DCOps`, THE `Data_Scope_Service` SHALL return `[{ scopeType: 'all' }]`.
3. WHEN `Data_Scope_Service.getDataScopesForRole(role)` is called with `PM` or `VendorRep` or `Client`, THE `Data_Scope_Service` SHALL return `[{ scopeType: 'company' }]`.
4. WHEN `Data_Scope_Service.getDataScopesForRole(role)` is called with `OSPCoordinator`, `EngineeringFieldSupport`, or `MaterialsManager`, THE `Data_Scope_Service` SHALL return `[{ scopeType: 'market' }]`.
5. WHEN `Data_Scope_Service.getDataScopesForRole(role)` is called with `Controller`, THE `Data_Scope_Service` SHALL return `[{ scopeType: 'all' }]`.
6. WHEN `Data_Scope_Service.getDataScopesForRole(role)` is called with `HR` or `Payroll`, THE `Data_Scope_Service` SHALL return `[{ scopeType: 'all' }]`.
