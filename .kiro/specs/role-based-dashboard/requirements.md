# Requirements Document

## Introduction

The FRM (Field Resource Management) main dashboard currently shows the same layout for all users regardless of their role. This feature transforms the dashboard into a role-aware experience where Technicians, Admins, CMs, and HR/Payroll users each see a tailored set of widgets, quick actions, and summary cards relevant to their daily responsibilities. The existing `HomeDashboardComponent` at the `/field-resource-management/dashboard` route will be refactored to dynamically render role-specific dashboard views using the `AuthService` for role detection and `FrmPermissionService` for permission checks.

## Glossary

- **Dashboard_Host**: The top-level `HomeDashboardComponent` that detects the current user role and delegates rendering to the appropriate role-specific dashboard view.
- **Technician_Dashboard**: The dashboard view rendered for users with the `Technician` role (and related field roles such as `DeploymentEngineer` and `SRITech`).
- **Admin_Dashboard**: The dashboard view rendered for users with the `Admin` role.
- **CM_Dashboard**: The dashboard view rendered for users with the `CM` role.
- **HR_Payroll_Dashboard**: The dashboard view rendered for users with the `HR` or `Payroll` role.
- **Quick_Actions_Widget**: A card containing shortcut buttons that navigate to frequently used FRM features.
- **Assignments_Widget**: A card displaying the current user's active job assignments.
- **Timecard_Widget**: A card showing the current user's timecard summary and a link to the full timecard view.
- **Schedule_Widget**: A card showing the current user's upcoming schedule entries.
- **Current_Job_Status_Widget**: A card displaying the real-time status of the technician's currently active job.
- **Active_Jobs_Widget**: A card listing jobs that are currently in progress, filterable by market for CM users.
- **Available_Technicians_Widget**: A card showing the count and list of technicians currently available for assignment.
- **Recent_Jobs_Widget**: A card listing the most recently created or updated jobs.
- **Approvals_Widget**: A card summarizing pending approval items (timecards, expenses, travel requests, break requests).
- **Timecards_Widget**: A card showing timecard entries pending review or approval for HR/Payroll users.
- **Expenses_Widget**: A card showing expense reports pending review or approval.
- **Travel_Break_PTO_Widget**: A card summarizing travel requests, break requests, and PTO balances or requests.
- **Back_Office_Quick_Actions**: A Quick_Actions_Widget variant containing links to Back Office tabs (Payroll, Approvals, Reports).
- **FRM_Permission_Service**: The `FrmPermissionService` that provides role-based permission checks.
- **Auth_Service**: The `AuthService` that provides the current user's role and identity.
- **UserRole_Enum**: The `UserRole` enum defining all valid roles in the system.

## Requirements

### Requirement 1: Role Detection and Dashboard Routing

**User Story:** As a logged-in FRM user, I want the dashboard to automatically display the view matching my role, so that I see only the information relevant to my responsibilities.

#### Acceptance Criteria

1. WHEN a user navigates to the FRM dashboard route, THE Dashboard_Host SHALL retrieve the current user role from the Auth_Service.
2. WHEN the retrieved role is `Technician`, `DeploymentEngineer`, or `SRITech`, THE Dashboard_Host SHALL render the Technician_Dashboard.
3. WHEN the retrieved role is `Admin`, THE Dashboard_Host SHALL render the Admin_Dashboard.
4. WHEN the retrieved role is `CM`, THE Dashboard_Host SHALL render the CM_Dashboard.
5. WHEN the retrieved role is `HR` or `Payroll`, THE Dashboard_Host SHALL render the HR_Payroll_Dashboard.
6. WHEN the retrieved role does not match any of the defined dashboard views, THE Dashboard_Host SHALL render a default dashboard containing the Quick_Actions_Widget and a welcome message.
7. IF the Auth_Service returns a null or undefined role, THEN THE Dashboard_Host SHALL render the default dashboard and log a warning to the console.

### Requirement 2: Technician Dashboard View

**User Story:** As a Technician, I want my dashboard to show my assignments, timecard, schedule, current job status, and quick actions, so that I can manage my daily field work efficiently.

#### Acceptance Criteria

1. THE Technician_Dashboard SHALL display the Quick_Actions_Widget with navigation links to My Timecard, My Schedule, My Assignments, and Map View.
2. THE Technician_Dashboard SHALL display the Assignments_Widget showing the current user's active assignments retrieved from the application store.
3. THE Technician_Dashboard SHALL display the Timecard_Widget showing the current user's timecard summary for the current pay period.
4. THE Technician_Dashboard SHALL display the Schedule_Widget showing the current user's scheduled jobs for the current week.
5. THE Technician_Dashboard SHALL display the Current_Job_Status_Widget showing the status, site name, and client of the technician's currently active job.
6. WHEN the technician has no active job, THE Current_Job_Status_Widget SHALL display a message stating "No active job".
7. WHEN the technician has no assignments, THE Assignments_Widget SHALL display a message stating "No active assignments".

### Requirement 3: Admin Dashboard View

**User Story:** As an Admin, I want my dashboard to show active jobs, available technicians, quick actions, recent jobs, and operational summary widgets, so that I can oversee all field operations at a glance.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL display the Active_Jobs_Widget listing all jobs with a status of `EnRoute`, `OnSite`, or `NotStarted`.
2. THE Admin_Dashboard SHALL display the Available_Technicians_Widget showing the count and names of technicians not currently assigned to an active job.
3. THE Admin_Dashboard SHALL display the Quick_Actions_Widget with navigation links to Create New Job, View All Jobs, Manage Technicians, Open Schedule, View Map, View Reports, and Admin Panel.
4. THE Admin_Dashboard SHALL display the Recent_Jobs_Widget listing the 10 most recently updated jobs.
5. THE Admin_Dashboard SHALL display a summary KPI card showing the total count of active jobs, available technicians, and average technician utilization percentage.

### Requirement 4: CM Dashboard View

**User Story:** As a Construction Manager, I want my dashboard to show active jobs filtered to my market, quick actions, and recent jobs, so that I can manage my market's field operations.

#### Acceptance Criteria

1. THE CM_Dashboard SHALL display the Active_Jobs_Widget listing jobs filtered to the current CM user's assigned market.
2. THE CM_Dashboard SHALL NOT display the Available_Technicians_Widget.
3. THE CM_Dashboard SHALL display the Quick_Actions_Widget with navigation links to Create New Job, View All Jobs, Open Schedule, View Map, and My Timecard.
4. THE CM_Dashboard SHALL display the Recent_Jobs_Widget listing the 10 most recently updated jobs within the CM's assigned market.
5. WHEN the CM user's market value is null or empty, THE CM_Dashboard SHALL display all active jobs without market filtering and log a warning to the console.

### Requirement 5: HR/Payroll Dashboard View

**User Story:** As an HR or Payroll user, I want my dashboard to show pending approvals, timecards, expenses, travel/break/PTO information, and quick links to Back Office tabs, so that I can manage employee administrative tasks efficiently.

#### Acceptance Criteria

1. THE HR_Payroll_Dashboard SHALL display the Approvals_Widget showing the count of pending timecard approvals, pending expense approvals, pending travel request approvals, and pending break request approvals.
2. THE HR_Payroll_Dashboard SHALL display the Timecards_Widget showing a list of timecards pending review, sorted by submission date in descending order.
3. THE HR_Payroll_Dashboard SHALL display the Expenses_Widget showing a list of expense reports pending review, sorted by submission date in descending order.
4. THE HR_Payroll_Dashboard SHALL display the Back_Office_Quick_Actions with navigation links to Approvals, Payroll, Timecard Management, and Reports.
5. THE HR_Payroll_Dashboard SHALL display the Travel_Break_PTO_Widget showing a summary of pending travel requests, pending break requests, and PTO requests.
6. WHILE the user role is `HR`, THE HR_Payroll_Dashboard SHALL restrict widget data to approval-related information based on HR_GROUP_PERMISSIONS from the FRM_Permission_Service.
7. WHILE the user role is `Payroll`, THE HR_Payroll_Dashboard SHALL display full payroll management links in the Back_Office_Quick_Actions including Pay Stubs, W-2, Direct Deposit, and W-4 links.

### Requirement 6: Widget Loading and Error States

**User Story:** As any dashboard user, I want to see clear loading indicators and error messages when widget data is being fetched or fails to load, so that I understand the current state of the dashboard.

#### Acceptance Criteria

1. WHILE widget data is being loaded, THE Dashboard_Host SHALL display a loading spinner within each widget that is fetching data.
2. IF a widget data request fails, THEN THE Dashboard_Host SHALL display an error message within the affected widget stating "Unable to load data. Please try again."
3. IF a widget data request fails, THEN THE Dashboard_Host SHALL provide a retry button within the affected widget that re-triggers the data fetch.
4. THE Dashboard_Host SHALL load widget data independently so that a failure in one widget does not prevent other widgets from rendering.

### Requirement 7: Responsive Layout

**User Story:** As a user accessing the dashboard on different devices, I want the dashboard layout to adapt to my screen size, so that I can use the dashboard on both desktop and mobile devices.

#### Acceptance Criteria

1. WHILE the viewport width is 769 pixels or greater, THE Dashboard_Host SHALL render widgets in a multi-column grid layout.
2. WHILE the viewport width is 768 pixels or fewer, THE Dashboard_Host SHALL render widgets in a single-column stacked layout.
3. THE Dashboard_Host SHALL maintain readable font sizes and touch-friendly button sizes at all supported viewport widths.
