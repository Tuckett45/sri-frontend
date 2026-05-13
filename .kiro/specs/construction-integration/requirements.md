# Requirements Document

## Introduction

The Construction Integration module provides telecom construction deployment tracking and resource forecasting within the ARK/ATLAS application. It enables project managers and field coordinators to track hyperscale construction projects (fiber deployments, bulk labor support, backbone builds) across multiple clients and geographies. The module tracks monthly headcount/resource allocation, deployment progress, and issue reporting for telecom construction engagements. It is architecturally isolated as a lazy-loaded Angular feature module under `src/app/features/construction-integration/`, following the same patterns as existing features (deployment, atlas, field-resource-management) while remaining loosely coupled from the main application code.

## Glossary

- **Construction_Module**: The Angular lazy-loaded feature module that encapsulates all construction integration functionality, routed under `/construction`.
- **Forecast_Dashboard**: The primary view displaying the annual resource forecast grid with monthly headcount allocations per project.
- **Project**: A named telecom construction engagement tied to a specific client and location (e.g., "Faith - Pryor, OK" or "Google Deployments - National").
- **Project_Category**: A classification grouping for projects. Two categories exist: "Bulk Labor Support" and "Hyperscale Deployment".
- **Resource_Allocation**: A monthly headcount value representing the number of personnel assigned to a given Project for a specific month.
- **Forecast_Year**: The calendar year for which the resource forecast is displayed (e.g., 2026).
- **Issue**: A tracked problem or blocker associated with a Project, containing a description, severity, status, and assignment.
- **Issue_Severity**: A classification of issue impact: LOW, MEDIUM, HIGH, or CRITICAL.
- **Issue_Status**: The lifecycle state of an Issue: OPEN, IN_PROGRESS, RESOLVED, or CLOSED.
- **Construction_Service**: The Angular service responsible for API communication for all construction-related data operations.
- **CSV_Exporter**: A utility that exports forecast or issue data to CSV format for offline use.
- **User**: An authenticated ARK/ATLAS application user with a valid session.
- **Admin_User**: A User with the `Admin` role as defined in the `UserRole` enum (`src/app/models/role.enum.ts`). Admin_Users have full read-write access to the Construction_Module.
- **Non_Admin_User**: A User who is authenticated but does not hold the `Admin` role. Non_Admin_Users have read-only access to the Construction_Module.
- **RoleGuard**: The existing Angular route guard (`src/role.guard.ts`) that checks the authenticated User's role against `expectedRoles` defined in route data to permit or deny route activation.

## Requirements

### Requirement 1: Module Lazy Loading and Route Registration

**User Story:** As a developer, I want the Construction Integration module to be lazy-loaded and registered in the app routing, so that it does not impact initial load performance and follows existing architectural patterns.

#### Acceptance Criteria

1. THE Construction_Module SHALL be registered in `app-routing.module.ts` using the `loadChildren` pattern with the path `construction`.
2. WHEN a User navigates to `/construction`, THE Construction_Module SHALL be loaded on demand by the Angular router.
3. THE Construction_Module SHALL be protected by the AuthGuard to prevent unauthenticated access.
4. THE Construction_Module SHALL use the existing RoleGuard with `expectedRoles: [UserRole.Admin]` on child routes that perform create or edit operations.
5. THE Construction_Module SHALL contain its own routing module defining child routes for Forecast_Dashboard, project detail, and issue management views.

### Requirement 2: Forecast Dashboard Display

**User Story:** As a project manager, I want to view a yearly resource forecast grid showing monthly headcount allocations per project, so that I can plan staffing across all telecom construction engagements.

#### Acceptance Criteria

1. WHEN a User navigates to the Forecast_Dashboard, THE Construction_Module SHALL display a tabular grid with projects as rows and months (JAN through DEC) as columns.
2. THE Forecast_Dashboard SHALL group projects by Project_Category, displaying "Bulk Labor Support" and "Hyperscale Deployment" as distinct sections.
3. THE Forecast_Dashboard SHALL display the Forecast_Year in the view header.
4. WHEN a Resource_Allocation value exists for a Project and month, THE Forecast_Dashboard SHALL display the numeric headcount in the corresponding cell.
5. WHEN no Resource_Allocation value exists for a Project and month, THE Forecast_Dashboard SHALL display the cell as empty or zero.
6. THE Forecast_Dashboard SHALL display a row total for each Project summing all monthly Resource_Allocation values.
7. THE Forecast_Dashboard SHALL display a column total for each month summing all Resource_Allocation values across projects in that category.

### Requirement 3: Project Management

**User Story:** As a project manager, I want to create, view, and edit construction projects with their associated client and location details, so that I can maintain an accurate project registry.

#### Acceptance Criteria

1. WHEN an Admin_User accesses the project creation view, THE Construction_Module SHALL provide a form to create a new Project with the following fields: name, client name, location, and Project_Category.
2. WHEN an Admin_User submits a valid Project creation form, THE Construction_Service SHALL persist the Project and return the created record.
3. IF a User submits a Project creation form with missing required fields, THEN THE Construction_Module SHALL display validation errors indicating which fields are required.
4. WHEN a User selects a Project from the Forecast_Dashboard, THE Construction_Module SHALL navigate to a project detail view displaying the Project name, client, location, category, and associated Resource_Allocation data.
5. WHEN an Admin_User accesses the project edit view, THE Construction_Module SHALL allow the Admin_User to edit an existing Project's name, client, location, and Project_Category.
6. WHILE a Non_Admin_User is viewing the project detail view, THE Construction_Module SHALL hide or disable the create and edit controls for Projects.
7. IF a Non_Admin_User attempts to navigate to a project create or edit route, THEN THE RoleGuard SHALL deny access and redirect the Non_Admin_User to an unauthorized page.

### Requirement 4: Resource Allocation Editing

**User Story:** As an admin, I want to edit monthly headcount allocations directly in the forecast grid, so that I can quickly update staffing plans without navigating away from the dashboard.

#### Acceptance Criteria

1. WHEN an Admin_User clicks on a Resource_Allocation cell in the Forecast_Dashboard, THE Forecast_Dashboard SHALL make the cell editable with a numeric input.
2. WHEN an Admin_User enters a valid numeric value and confirms the edit, THE Construction_Service SHALL persist the updated Resource_Allocation.
3. IF an Admin_User enters a non-numeric value in a Resource_Allocation cell, THEN THE Forecast_Dashboard SHALL reject the input and display a validation message.
4. WHEN a Resource_Allocation is updated, THE Forecast_Dashboard SHALL recalculate the row total and column total without requiring a full page reload.
5. IF the Construction_Service fails to persist a Resource_Allocation update, THEN THE Forecast_Dashboard SHALL display an error notification and revert the cell to its previous value.
6. WHILE a Non_Admin_User is viewing the Forecast_Dashboard, THE Forecast_Dashboard SHALL display all Resource_Allocation cells as read-only text without edit affordances.

### Requirement 5: Issue Tracking

**User Story:** As an admin, I want to log and track issues related to construction projects, so that blockers and problems are visible and can be resolved in a timely manner.

#### Acceptance Criteria

1. THE Construction_Module SHALL provide an issue list view displaying all Issues with columns for: Project name, description, Issue_Severity, Issue_Status, assigned user, and created date.
2. WHEN an Admin_User creates a new Issue, THE Construction_Module SHALL require the following fields: associated Project, description, and Issue_Severity.
3. WHEN an Admin_User submits a valid Issue creation form, THE Construction_Service SHALL persist the Issue with an initial Issue_Status of OPEN.
4. THE Construction_Module SHALL allow an Admin_User to transition an Issue's Issue_Status from OPEN to IN_PROGRESS, from IN_PROGRESS to RESOLVED, and from RESOLVED to CLOSED.
5. IF a User attempts to transition an Issue to an invalid Issue_Status, THEN THE Construction_Module SHALL prevent the transition and display a message indicating the allowed transitions.
6. WHEN a User views the project detail view, THE Construction_Module SHALL display a filtered list of Issues associated with that Project.
7. WHILE a Non_Admin_User is viewing the issue list or project detail view, THE Construction_Module SHALL hide or disable the issue create, edit, and status transition controls.

### Requirement 6: Issue Severity and Filtering

**User Story:** As a project manager, I want to filter and sort issues by severity and status, so that I can prioritize resolution of critical blockers.

#### Acceptance Criteria

1. THE Construction_Module SHALL allow a User to filter the issue list by Issue_Severity (LOW, MEDIUM, HIGH, CRITICAL).
2. THE Construction_Module SHALL allow a User to filter the issue list by Issue_Status (OPEN, IN_PROGRESS, RESOLVED, CLOSED).
3. THE Construction_Module SHALL allow a User to filter the issue list by associated Project.
4. WHEN multiple filters are applied, THE Construction_Module SHALL display only Issues matching all selected filter criteria.
5. THE Construction_Module SHALL allow a User to sort the issue list by Issue_Severity, Issue_Status, or created date.

### Requirement 7: Data Export

**User Story:** As a project manager, I want to export the forecast grid and issue list to CSV, so that I can share data with stakeholders who do not have application access.

#### Acceptance Criteria

1. WHEN a User requests a forecast export, THE CSV_Exporter SHALL generate a CSV file containing all projects, monthly Resource_Allocation values, and row totals for the selected Forecast_Year.
2. WHEN a User requests an issue list export, THE CSV_Exporter SHALL generate a CSV file containing all currently filtered Issues with their Project name, description, Issue_Severity, Issue_Status, assigned user, and created date.
3. THE CSV_Exporter SHALL trigger a browser file download with a filename containing the export type and current date.

### Requirement 8: Forecast Year Navigation

**User Story:** As a project manager, I want to switch between forecast years, so that I can review historical allocations and plan future staffing.

#### Acceptance Criteria

1. THE Forecast_Dashboard SHALL display a year selector allowing the User to choose a Forecast_Year.
2. WHEN a User selects a different Forecast_Year, THE Forecast_Dashboard SHALL reload the Resource_Allocation data for the selected year.
3. THE Forecast_Dashboard SHALL default to the current calendar year on initial load.

### Requirement 9: Construction Module Data Models

**User Story:** As a developer, I want well-defined TypeScript interfaces and enums for all construction data entities, so that the module has type-safe data contracts.

#### Acceptance Criteria

1. THE Construction_Module SHALL define a `Project` interface containing: id, name, clientName, location, category (Project_Category), createdDate, and updatedDate.
2. THE Construction_Module SHALL define a `ResourceAllocation` interface containing: id, projectId, year, month (1-12), headcount (number).
3. THE Construction_Module SHALL define an `Issue` interface containing: id, projectId, description, severity (Issue_Severity), status (Issue_Status), assignedUserId, createdDate, and updatedDate.
4. THE Construction_Module SHALL define `ProjectCategory` as an enum with values BULK_LABOR_SUPPORT and HYPERSCALE_DEPLOYMENT.
5. THE Construction_Module SHALL define `IssueSeverity` as an enum with values LOW, MEDIUM, HIGH, and CRITICAL.
6. THE Construction_Module SHALL define `IssueStatus` as an enum with values OPEN, IN_PROGRESS, RESOLVED, and CLOSED.
7. THE Construction_Module SHALL store all model definitions in `src/app/features/construction-integration/models/`.

### Requirement 10: API Service Layer

**User Story:** As a developer, I want a dedicated service for all construction API calls, so that data access is centralized and testable.

#### Acceptance Criteria

1. THE Construction_Service SHALL provide methods to perform CRUD operations on Project entities.
2. THE Construction_Service SHALL provide methods to read and update Resource_Allocation entities by project and year.
3. THE Construction_Service SHALL provide methods to perform CRUD operations on Issue entities.
4. THE Construction_Service SHALL provide a method to retrieve Issues filtered by Project, Issue_Severity, and Issue_Status.
5. IF an API call fails, THEN THE Construction_Service SHALL return an Observable error with a descriptive error message.
6. THE Construction_Service SHALL be provided at the module level within the Construction_Module.

### Requirement 11: Role-Based Access Control

**User Story:** As an admin, I want only Admin users to be able to edit and add to the Hyperscale Construction dashboards, so that data integrity is maintained and unauthorized modifications are prevented.

#### Acceptance Criteria

1. THE Construction_Module SHALL use the existing RoleGuard from `src/role.guard.ts` to enforce role-based access on edit and create routes.
2. THE Construction_Module SHALL configure edit and create child routes with `canActivate: [AuthGuard, RoleGuard]` and `data: { expectedRoles: [UserRole.Admin] }`.
3. WHEN an Admin_User accesses the Construction_Module, THE Construction_Module SHALL display all create, edit, and delete controls for Projects, Resource_Allocations, and Issues.
4. WHEN a Non_Admin_User accesses the Construction_Module, THE Construction_Module SHALL display the Forecast_Dashboard, project details, and issue lists in read-only mode.
5. WHILE a Non_Admin_User is viewing any Construction_Module view, THE Construction_Module SHALL hide all action buttons and form controls for creating, editing, or deleting data.
6. IF a Non_Admin_User attempts to directly navigate to an admin-only route within the Construction_Module, THEN THE RoleGuard SHALL deny access and redirect the Non_Admin_User to an unauthorized page.
7. THE Construction_Module SHALL use the existing `UserRole` enum from `src/app/models/role.enum.ts` to determine the current User's role.
