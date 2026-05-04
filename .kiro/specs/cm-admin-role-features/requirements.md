# Requirements Document: CM and Admin Role-Based Features

## Introduction

This document specifies comprehensive role-based features for Construction Manager (CM) and Admin roles across the Field Operations system, encompassing both ATLAS CRM and Smart Dispatch modules. The system currently has basic role checking capabilities but requires enhanced role-specific features including dashboards, access control, workflow management, data management, and approval processes.

## Glossary

- **CM**: Construction Manager role responsible for project oversight within specific markets
- **Admin**: Administrator role with full system access across all markets
- **ATLAS_CRM**: Customer Relationship Management module handling customer management, ticket handling, appointment scheduling, and time & billing
- **Smart_Dispatch**: Module managing tech skills & certifications, real-time location, conflict detection, and availability management
- **Market**: Geographic or organizational boundary for filtering data and access
- **RG_Market**: Specific market designation (RG markets have different access rules)
- **Street_Sheet**: Document tracking field work and project progress
- **Punch_List**: List of items requiring completion or correction on a project
- **Daily_Report**: Daily summary of work completed, resources used, and project status
- **Technician**: Field worker assigned to jobs and projects
- **Approval_Process**: Multi-level workflow requiring authorization from designated roles
- **Role_Based_Access_Control**: System for restricting access based on user role
- **Dashboard**: Role-specific view displaying relevant data and metrics
- **System_Configuration**: Application settings and parameters
- **User_Management**: Administration of user accounts, roles, and permissions
- **Resource_Allocation**: Assignment of technicians and equipment to projects
- **Workflow**: Defined sequence of tasks and approvals

## Requirements

### Requirement 1: CM Dashboard and Data Visibility

**User Story:** As a Construction Manager, I want a dashboard showing my market's data, so that I can monitor projects and resources within my responsibility area.

#### Acceptance Criteria

1. WHEN a CM logs in, THE System SHALL display a dashboard filtered to their assigned market
2. WHEN a CM views street sheets, THE System SHALL return only street sheets from non-RG markets assigned to that CM
3. WHEN a CM views punch lists, THE System SHALL return only punch lists from their assigned market
4. WHEN a CM views daily reports, THE System SHALL return only daily reports from their assigned market
5. WHEN a CM attempts to access data from unassigned markets, THE System SHALL deny access and return an appropriate error message
6. THE Dashboard SHALL display key metrics including active projects, pending tasks, technician availability, and resource utilization for the CM's market

### Requirement 2: Admin Dashboard and System-Wide Visibility

**User Story:** As an Administrator, I want a dashboard showing system-wide data across all markets, so that I can monitor overall system health and performance.

#### Acceptance Criteria

1. WHEN an Admin logs in, THE System SHALL display a dashboard with data from all markets
2. WHEN an Admin views street sheets, THE System SHALL return street sheets from all markets including RG markets
3. WHEN an Admin views punch lists, THE System SHALL return punch lists from all markets
4. WHEN an Admin views daily reports, THE System SHALL return daily reports from all markets
5. THE Dashboard SHALL display system-wide metrics including total active projects, all pending tasks, overall technician availability, and cross-market resource utilization
6. THE Dashboard SHALL provide market-level drill-down capabilities for detailed analysis

### Requirement 3: Role-Based Access Control for ATLAS CRM

**User Story:** As a system architect, I want granular access control in ATLAS CRM based on user roles, so that users can only access features appropriate to their responsibilities.

#### Acceptance Criteria

1. WHEN a CM accesses customer management features, THE System SHALL allow viewing and editing customers within their assigned market
2. WHEN a CM accesses ticket handling features, THE System SHALL allow managing tickets for their assigned market
3. WHEN a CM accesses appointment scheduling, THE System SHALL allow scheduling appointments with technicians in their market
4. WHEN an Admin accesses customer management features, THE System SHALL allow viewing and editing all customers across all markets
5. WHEN an Admin accesses ticket handling features, THE System SHALL allow managing all tickets system-wide
6. WHEN an Admin accesses appointment scheduling, THE System SHALL allow scheduling appointments with any technician
7. WHEN a CM attempts to access admin-only endpoints, THE System SHALL deny access and return a 403 Forbidden response
8. THE System SHALL validate role permissions on both client-side and server-side for all protected operations

### Requirement 4: Role-Based Access Control for Smart Dispatch

**User Story:** As a system architect, I want granular access control in Smart Dispatch based on user roles, so that dispatch operations are properly authorized.

#### Acceptance Criteria

1. WHEN a CM accesses technician management, THE System SHALL allow viewing and managing technicians assigned to their market
2. WHEN a CM accesses real-time location tracking, THE System SHALL display only technicians from their assigned market
3. WHEN a CM manages availability, THE System SHALL allow modifying availability for technicians in their market
4. WHEN an Admin accesses technician management, THE System SHALL allow viewing and managing all technicians system-wide
5. WHEN an Admin accesses real-time location tracking, THE System SHALL display all technicians across all markets
6. WHEN an Admin manages availability, THE System SHALL allow modifying availability for any technician
7. WHEN a CM attempts to assign technicians from other markets, THE System SHALL prevent the assignment and display an error message

### Requirement 5: CM Workflow Management

**User Story:** As a Construction Manager, I want to manage workflows for my market, so that I can approve tasks, route work, and maintain project progress.

#### Acceptance Criteria

1. WHEN a CM receives a task requiring approval, THE System SHALL display the task in their approval queue
2. WHEN a CM approves a task, THE System SHALL update the task status and notify relevant parties
3. WHEN a CM rejects a task, THE System SHALL require a rejection reason and notify the task originator
4. WHEN a CM routes work to technicians, THE System SHALL validate that technicians are available and qualified
5. WHEN a CM views their approval queue, THE System SHALL display only tasks from their assigned market
6. THE System SHALL send notifications to the CM when new tasks require their approval
7. WHEN a task requires multi-level approval, THE System SHALL route the task to the next approver after CM approval

### Requirement 6: Admin Workflow Management

**User Story:** As an Administrator, I want to manage system-wide workflows, so that I can oversee all approval processes and intervene when necessary.

#### Acceptance Criteria

1. WHEN an Admin views approval queues, THE System SHALL display all pending approvals across all markets
2. WHEN an Admin approves a task, THE System SHALL update the task status and notify relevant parties
3. WHEN an Admin overrides a workflow, THE System SHALL log the override action with timestamp and reason
4. WHEN an Admin reassigns a task, THE System SHALL allow reassignment to any user regardless of market
5. THE System SHALL provide Admin with visibility into workflow bottlenecks and pending approval metrics
6. WHEN an Admin configures workflow rules, THE System SHALL validate the configuration and apply it system-wide

### Requirement 7: CM Data Management

**User Story:** As a Construction Manager, I want to create, read, update, and delete data within my market, so that I can maintain accurate project information.

#### Acceptance Criteria

1. WHEN a CM creates a street sheet, THE System SHALL associate it with the CM's assigned market
2. WHEN a CM updates a street sheet, THE System SHALL validate that the street sheet belongs to their market
3. WHEN a CM deletes a street sheet, THE System SHALL validate market ownership and require confirmation
4. WHEN a CM creates a punch list entry, THE System SHALL associate it with their assigned market
5. WHEN a CM updates a punch list entry, THE System SHALL validate market ownership before allowing the update
6. WHEN a CM creates a daily report, THE System SHALL associate it with their assigned market and user ID
7. WHEN a CM assigns a technician to a project, THE System SHALL validate that both the project and technician belong to their market

### Requirement 8: Admin Data Management

**User Story:** As an Administrator, I want full data management capabilities across all markets, so that I can maintain system integrity and correct data issues.

#### Acceptance Criteria

1. WHEN an Admin creates any data entity, THE System SHALL allow assignment to any market
2. WHEN an Admin updates any data entity, THE System SHALL allow modification regardless of market association
3. WHEN an Admin deletes any data entity, THE System SHALL require confirmation and log the deletion with reason
4. WHEN an Admin performs bulk operations, THE System SHALL validate the operation scope and require explicit confirmation
5. THE System SHALL provide Admin with data audit logs showing all create, update, and delete operations
6. WHEN an Admin corrects data, THE System SHALL maintain an audit trail of the original and modified values

### Requirement 9: CM Approval Processes

**User Story:** As a Construction Manager, I want to participate in approval processes for my market, so that I can ensure quality and compliance.

#### Acceptance Criteria

1. WHEN a street sheet is submitted for approval, THE System SHALL route it to the responsible CM based on market
2. WHEN a CM reviews a street sheet, THE System SHALL display all relevant project information and history
3. WHEN a CM approves a street sheet, THE System SHALL update the status to approved and notify the submitter
4. WHEN a CM requests changes to a street sheet, THE System SHALL return it to the submitter with comments
5. WHEN a daily report is submitted, THE System SHALL validate completeness and route to the CM for review
6. WHEN a CM approves a daily report, THE System SHALL mark it as approved and make it available for billing
7. THE System SHALL send notifications to the CM when items require their approval within 24 hours of submission

### Requirement 10: Admin Approval Processes

**User Story:** As an Administrator, I want to oversee and manage all approval processes, so that I can ensure system-wide compliance and resolve escalations.

#### Acceptance Criteria

1. WHEN an approval is escalated, THE System SHALL route it to an Admin for resolution
2. WHEN an Admin reviews an escalated approval, THE System SHALL display the complete approval history and comments
3. WHEN an Admin makes a final approval decision, THE System SHALL override any pending approvals and close the workflow
4. WHEN an Admin configures approval thresholds, THE System SHALL apply the thresholds to determine routing rules
5. THE System SHALL provide Admin with reports on approval cycle times and bottlenecks by market and approval type
6. WHEN an Admin delegates approval authority, THE System SHALL update routing rules and notify affected users

### Requirement 11: User Management for Admin

**User Story:** As an Administrator, I want to manage user accounts and roles, so that I can control system access and maintain security.

#### Acceptance Criteria

1. WHEN an Admin creates a user account, THE System SHALL require assignment of a role and market
2. WHEN an Admin updates a user's role, THE System SHALL immediately apply the new permissions
3. WHEN an Admin deactivates a user, THE System SHALL revoke all access and log the deactivation
4. WHEN an Admin resets a user's password, THE System SHALL generate a secure temporary password and notify the user
5. WHEN an Admin views pending user approvals, THE System SHALL display all users awaiting account approval
6. WHEN an Admin approves a user account, THE System SHALL activate the account and send credentials to the user
7. WHEN an Admin assigns a user to a different market, THE System SHALL update data visibility and access permissions accordingly

### Requirement 12: System Configuration for Admin

**User Story:** As an Administrator, I want to configure system settings, so that I can customize behavior and maintain operational parameters.

#### Acceptance Criteria

1. WHEN an Admin modifies system configuration, THE System SHALL validate the configuration values
2. WHEN an Admin saves configuration changes, THE System SHALL apply them immediately or schedule them based on configuration type
3. WHEN an Admin configures market definitions, THE System SHALL update market-based filtering rules
4. WHEN an Admin configures approval workflows, THE System SHALL validate the workflow logic and update routing rules
5. THE System SHALL maintain a configuration change history with timestamps and admin user identification
6. WHEN an Admin exports configuration, THE System SHALL generate a complete configuration file for backup purposes

### Requirement 13: CM Resource Allocation

**User Story:** As a Construction Manager, I want to allocate technicians and resources to projects in my market, so that I can optimize resource utilization.

#### Acceptance Criteria

1. WHEN a CM assigns a technician to a project, THE System SHALL validate technician availability and qualifications
2. WHEN a CM views technician availability, THE System SHALL display real-time availability for technicians in their market
3. WHEN a CM detects a scheduling conflict, THE System SHALL highlight the conflict and suggest alternatives
4. WHEN a CM allocates equipment to a project, THE System SHALL validate equipment availability and location
5. WHEN a CM views resource utilization reports, THE System SHALL display metrics for their assigned market
6. THE System SHALL prevent double-booking of technicians and alert the CM when attempting conflicting assignments

### Requirement 14: Admin Resource Allocation and Oversight

**User Story:** As an Administrator, I want to view and manage resource allocation across all markets, so that I can balance workload and resolve resource conflicts.

#### Acceptance Criteria

1. WHEN an Admin views resource allocation, THE System SHALL display allocation across all markets
2. WHEN an Admin identifies resource imbalances, THE System SHALL provide tools to reassign resources between markets
3. WHEN an Admin overrides a resource assignment, THE System SHALL log the override and notify affected CMs
4. WHEN an Admin views utilization reports, THE System SHALL display system-wide and per-market utilization metrics
5. THE System SHALL provide Admin with predictive analytics on resource needs based on project pipeline
6. WHEN an Admin configures resource allocation rules, THE System SHALL apply the rules to automated assignment suggestions

### Requirement 15: Role-Based UI Component Visibility

**User Story:** As a developer, I want UI components to show or hide based on user role, so that users only see features relevant to their role.

#### Acceptance Criteria

1. WHEN a CM views the navigation menu, THE System SHALL display only menu items accessible to the CM role
2. WHEN an Admin views the navigation menu, THE System SHALL display all menu items including admin-only sections
3. WHEN a CM views a data table, THE System SHALL hide action buttons for operations not permitted to CMs
4. WHEN an Admin views a data table, THE System SHALL display all action buttons including admin-only operations
5. THE System SHALL use role-checking methods (isCM, isAdmin) to determine component visibility
6. WHEN a user's role changes, THE System SHALL immediately update UI component visibility without requiring logout

### Requirement 16: API Authorization for Role-Based Endpoints

**User Story:** As a backend developer, I want API endpoints to enforce role-based authorization, so that unauthorized access is prevented at the server level.

#### Acceptance Criteria

1. WHEN a CM calls an admin-only endpoint, THE System SHALL return a 403 Forbidden response
2. WHEN an Admin calls any endpoint, THE System SHALL authorize the request if the endpoint exists
3. WHEN a CM calls a market-filtered endpoint, THE System SHALL automatically apply market filtering based on the CM's assigned market
4. WHEN an Admin calls a market-filtered endpoint, THE System SHALL return data from all markets unless a specific market filter is provided
5. THE System SHALL validate role authorization before processing any data modification request
6. WHEN an unauthorized request is made, THE System SHALL log the attempt with user ID, role, endpoint, and timestamp

### Requirement 17: CM Reporting and Analytics

**User Story:** As a Construction Manager, I want to generate reports and view analytics for my market, so that I can track performance and identify issues.

#### Acceptance Criteria

1. WHEN a CM generates a project status report, THE System SHALL include only projects from their assigned market
2. WHEN a CM views technician performance metrics, THE System SHALL display metrics for technicians in their market
3. WHEN a CM exports data, THE System SHALL include only data from their assigned market
4. WHEN a CM views time and billing reports, THE System SHALL display billable hours and expenses for their market
5. THE System SHALL provide CM with trend analysis showing performance over time for their market
6. WHEN a CM schedules a recurring report, THE System SHALL generate and deliver the report automatically based on the schedule

### Requirement 18: Admin Reporting and Analytics

**User Story:** As an Administrator, I want to generate system-wide reports and analytics, so that I can assess overall performance and make strategic decisions.

#### Acceptance Criteria

1. WHEN an Admin generates a system-wide report, THE System SHALL include data from all markets
2. WHEN an Admin views comparative analytics, THE System SHALL display market-by-market comparisons
3. WHEN an Admin exports data, THE System SHALL include all requested data regardless of market boundaries
4. WHEN an Admin views financial reports, THE System SHALL display revenue, costs, and profitability across all markets
5. THE System SHALL provide Admin with executive dashboards showing key performance indicators system-wide
6. WHEN an Admin creates custom reports, THE System SHALL allow selection of any data fields and filtering criteria without market restrictions

### Requirement 19: Notification Management for CM

**User Story:** As a Construction Manager, I want to receive notifications relevant to my market, so that I can respond promptly to important events.

#### Acceptance Criteria

1. WHEN a task requires CM approval, THE System SHALL send a notification to the responsible CM
2. WHEN a technician reports an issue in the CM's market, THE System SHALL notify the CM
3. WHEN a project milestone is reached, THE System SHALL notify the CM responsible for that market
4. WHEN a CM configures notification preferences, THE System SHALL respect those preferences for future notifications
5. THE System SHALL filter notifications to show only events from the CM's assigned market
6. WHEN a critical issue occurs, THE System SHALL send high-priority notifications to the CM via multiple channels

### Requirement 20: Notification Management for Admin

**User Story:** As an Administrator, I want to receive system-wide notifications and manage notification settings, so that I can stay informed and configure notification behavior.

#### Acceptance Criteria

1. WHEN a system-wide issue occurs, THE System SHALL notify all Admins
2. WHEN an escalation reaches Admin level, THE System SHALL send a notification to available Admins
3. WHEN an Admin configures system notification rules, THE System SHALL apply the rules to all users or specified user groups
4. WHEN an Admin views notification logs, THE System SHALL display all notifications sent system-wide with delivery status
5. THE System SHALL allow Admin to configure notification templates and delivery channels
6. WHEN an Admin broadcasts a message, THE System SHALL deliver it to all users or filtered user groups based on role or market
