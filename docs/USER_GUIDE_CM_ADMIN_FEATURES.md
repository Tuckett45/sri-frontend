# User Guide: CM and Admin Role-Based Features

## Table of Contents

1. [Introduction](#introduction)
2. [Construction Manager (CM) Features](#construction-manager-cm-features)
3. [Administrator (Admin) Features](#administrator-admin-features)
4. [Approval Workflows](#approval-workflows)
5. [User Management](#user-management)
6. [System Configuration](#system-configuration)
7. [Notification Preferences](#notification-preferences)

---

## Introduction

This guide covers the role-based features available to Construction Managers (CM) and Administrators (Admin) in the Field Operations system. These features provide role-specific dashboards, workflow management, data access controls, and administrative capabilities.

### User Roles

- **Construction Manager (CM)**: Manages projects, resources, and workflows within assigned market(s)
- **Administrator (Admin)**: Has full system access across all markets with additional user and system management capabilities

---

## Construction Manager (CM) Features

### CM Dashboard

The CM Dashboard provides a comprehensive view of your market's operations and key metrics.

#### Accessing the Dashboard

1. Log in to the Field Operations system
2. Navigate to **Dashboard** from the main menu
3. The dashboard automatically filters to show only your assigned market data

#### Dashboard Metrics

The CM Dashboard displays the following key metrics:

- **Active Projects**: Number of ongoing projects in your market
- **Pending Tasks**: Tasks awaiting action or completion
- **Available Technicians**: Number of technicians currently available for assignment
- **Resource Utilization**: Percentage of resources currently allocated
- **Pending Approvals**: Items awaiting your approval
- **Overdue Items**: Tasks or deliverables past their due date

#### Dashboard Features

**Date Range Filtering**
- Use the date range selector at the top of the dashboard to filter metrics by time period
- Options include: Today, This Week, This Month, Custom Range

**Recent Street Sheets**
- View your most recent street sheets
- Click on any street sheet to view details
- Note: RG market street sheets are excluded from CM view

**Pending Approvals Section**
- Quick access to items requiring your approval
- Click "View All Approvals" to navigate to the full approval queue

**Technician Status Overview**
- Real-time view of technician availability in your market
- Color-coded status indicators (Available, On Job, Off Duty)

**Upcoming Deadlines**
- List of approaching project milestones and deadlines
- Sorted by urgency

**Auto-Refresh**
- Dashboard data refreshes automatically every 5 minutes
- Click the refresh icon to manually update data

### Data Access and Filtering

As a CM, your data access is automatically filtered to your assigned market:

**Street Sheets**
- View and manage street sheets from your assigned market
- RG market street sheets are excluded from your view
- Create new street sheets (automatically associated with your market)

**Punch Lists**
- Access punch lists for projects in your market
- Create and update punch list items
- Track completion status

**Daily Reports**
- View and create daily reports for your market
- Submit reports for approval
- Track report approval status

**Technicians**
- View technicians assigned to your market
- Manage technician assignments within your market
- Cannot assign technicians from other markets

### Resource Allocation

**Assigning Technicians to Projects**

1. Navigate to **Resource Allocation** or **Projects**
2. Select the project requiring technician assignment
3. Click **Assign Technician**
4. The system displays only technicians from your market
5. Select a technician and confirm assignment
6. The system validates:
   - Technician availability
   - Required qualifications
   - Scheduling conflicts

**Conflict Detection**
- The system automatically detects scheduling conflicts
- Conflicting assignments are highlighted in red
- Alternative technicians are suggested

**Equipment Allocation**
- Allocate equipment to projects in your market
- System validates equipment availability and location
- Prevents double-booking of equipment

### Approval Workflows

See the [Approval Workflows](#approval-workflows) section below for detailed information on managing approvals.

---

## Administrator (Admin) Features

### Admin Dashboard

The Admin Dashboard provides system-wide visibility and executive-level metrics.

#### Accessing the Dashboard

1. Log in with Admin credentials
2. Navigate to **Admin Dashboard** from the main menu
3. The dashboard displays data from all markets

#### Dashboard Metrics

The Admin Dashboard displays system-wide metrics:

- **Total Active Projects**: All ongoing projects across all markets
- **System-Wide Pending Tasks**: All pending tasks across the system
- **Total Technicians**: Total number of technicians in the system
- **Overall Resource Utilization**: System-wide resource allocation percentage
- **Pending User Approvals**: New user accounts awaiting approval
- **Escalated Approvals**: Workflow approvals escalated to Admin level

#### Market-by-Market Comparison

**Market Filter Dropdown**
- Select a specific market to view detailed metrics
- Compare performance across markets
- Identify resource imbalances

**Market Drill-Down**
- Click on any market in the comparison view
- View detailed metrics for that specific market
- Access market-specific reports and data

**Executive Dashboard Widgets**
- Key Performance Indicators (KPIs) across all markets
- Trend analysis and performance over time
- Resource utilization heatmaps

### System-Wide Data Access

As an Admin, you have unrestricted access to all data:

**All Markets Access**
- View street sheets from all markets including RG markets
- Access punch lists across all markets
- View daily reports system-wide
- Manage technicians across all markets

**Cross-Market Operations**
- Reassign resources between markets
- Override market-based restrictions
- Perform bulk operations across markets

### Resource Management

**Cross-Market Resource Reallocation**

1. Navigate to **Resource Allocation**
2. Select **Admin View** to see all markets
3. Identify resource imbalances
4. Click **Reallocate Resources**
5. Select source and destination markets
6. Choose resources to reallocate
7. Confirm reallocation
8. System notifies affected CMs

**System-Wide Utilization Reports**
- View utilization metrics across all markets
- Identify underutilized or overutilized markets
- Generate comparative reports

### User Management

See the [User Management](#user-management) section below for detailed procedures.

### System Configuration

See the [System Configuration](#system-configuration) section below for configuration options.

---

## Approval Workflows

### Overview

The approval workflow system manages multi-level approval processes for various entities including street sheets, daily reports, punch lists, and resource allocations.

### For Construction Managers

#### Viewing Your Approval Queue

1. Navigate to **Approvals** from the main menu
2. Your approval queue displays items requiring your approval
3. Items are filtered to your assigned market only

#### Approval Queue Features

**Filtering Options**
- Filter by type (Street Sheet, Daily Report, Punch List, Resource Allocation)
- Filter by submission date
- Filter by priority

**Sorting Options**
- Sort by submission date (oldest first, newest first)
- Sort by priority (high to low)

#### Approving an Item

1. Click on an item in your approval queue
2. Review the item details and history
3. Click **Approve**
4. (Optional) Add a comment
5. Click **Confirm Approval**
6. The system updates the status and notifies relevant parties

#### Rejecting an Item

1. Click on an item in your approval queue
2. Review the item details
3. Click **Reject**
4. **Enter a rejection reason** (required)
5. Click **Confirm Rejection**
6. The system returns the item to the submitter with your reason

#### Requesting Changes

1. Click on an item in your approval queue
2. Review the item details
3. Click **Request Changes**
4. Enter specific changes needed
5. Click **Submit**
6. The item returns to the submitter with your change requests

#### Approval Notifications

- You receive notifications when new items require your approval
- Reminder notifications are sent 24 hours after submission if not yet reviewed
- High-priority items trigger immediate notifications via multiple channels

### For Administrators

#### System-Wide Approval View

1. Navigate to **Admin Approvals** from the admin menu
2. View all pending approvals across all markets
3. Filter by market, type, or date range

#### Escalated Approvals

**Viewing Escalations**
- Escalated approvals appear in a dedicated section
- Shows complete approval history and comments
- Displays reason for escalation

**Resolving Escalations**
1. Click on an escalated approval
2. Review the complete approval history
3. Make a final decision (Approve or Reject)
4. Add comments explaining your decision
5. Click **Finalize**
6. Your decision overrides all pending approvals and closes the workflow

#### Approval Override

Admins can override any approval at any stage:

1. Navigate to the approval detail view
2. Click **Admin Override**
3. Select action (Approve or Reject)
4. Enter reason for override (required)
5. Confirm override
6. System logs the override with timestamp and reason

#### Workflow Configuration

See [System Configuration](#system-configuration) for configuring approval workflows.

---

## User Management

*Admin Only Feature*

### Accessing User Management

1. Log in with Admin credentials
2. Navigate to **User Management** from the admin menu

### User List

The user list displays all system users with the following information:
- Name
- Email
- Role
- Market
- Status (Active, Inactive, Pending Approval)
- Last Login Date

### Filtering and Search

**Search Users**
- Use the search box to find users by name or email
- Search is case-insensitive and matches partial strings

**Filter Options**
- Filter by Role (CM, Admin, Technician, etc.)
- Filter by Market
- Filter by Approval Status (Approved, Pending, Rejected)

### Creating a New User

1. Click **Create User** button
2. Fill in the user form:
   - **Name** (required)
   - **Email** (required)
   - **Role** (required) - Select from dropdown
   - **Market** (required) - Select from dropdown
   - **Company** (optional)
   - **Permissions** - Configure specific permissions
   - **Notification Preferences** - Set default notification settings
3. Click **Create User**
4. System generates credentials and sends them to the user's email

### Editing a User

1. Click the **Edit** icon next to a user
2. Modify user information as needed
3. Click **Save Changes**
4. System immediately applies new permissions if role or market changed

### Deactivating a User

1. Click the **Deactivate** icon next to a user
2. **Enter a reason for deactivation** (required)
3. Click **Confirm Deactivation**
4. System revokes all access and logs the deactivation

### Resetting User Password

1. Click the **Reset Password** icon next to a user
2. Confirm the password reset
3. System generates a secure temporary password
4. Temporary password is sent to the user's email
5. User must change password on next login

### Approving Pending Users

**Viewing Pending Approvals**
- Pending user approvals appear in a dedicated section
- Shows user details and registration date

**Approving a User Account**
1. Click on a pending user
2. Review user information
3. Click **Approve Account**
4. System activates the account and sends credentials to the user

**Rejecting a User Account**
1. Click on a pending user
2. Click **Reject Account**
3. Enter rejection reason
4. Confirm rejection
5. System notifies the user of rejection

### Bulk Operations

**Performing Bulk Operations**

1. Select multiple users using checkboxes
2. Click **Bulk Actions** dropdown
3. Select operation:
   - Activate Users
   - Deactivate Users
   - Change Role
   - Change Market
4. Enter required information (e.g., new role, new market)
5. Enter reason for bulk operation
6. Review confirmation dialog showing affected users
7. Click **Confirm**
8. System executes operation and logs all changes

### User Audit Log

**Viewing User Activity**

1. Click on a user to view details
2. Navigate to **Audit Log** tab
3. View complete history of user actions:
   - Login/logout events
   - Data modifications
   - Approval actions
   - Configuration changes
4. Filter by date range or action type

---

## System Configuration

*Admin Only Feature*

### Accessing System Configuration

1. Log in with Admin credentials
2. Navigate to **System Configuration** from the admin menu

### Configuration Categories

#### General Settings

**Application Settings**
- System name and branding
- Default timezone
- Date and time formats
- Session timeout duration

**Saving Configuration Changes**
1. Modify settings as needed
2. Click **Save Configuration**
3. System validates configuration values
4. Choose application timing:
   - **Apply Immediately**: Changes take effect right away
   - **Schedule**: Set a date/time for changes to apply
5. Confirm changes

#### Market Definitions

**Viewing Market Configuration**
- Navigate to **Market Definitions** tab
- View list of all configured markets
- See market-specific filtering rules

**Adding a New Market**
1. Click **Add Market**
2. Enter market details:
   - Market Code (unique identifier)
   - Market Name
   - Geographic Region
   - Filtering Rules
3. Click **Save Market**

**Updating Market Definitions**
1. Click **Edit** next to a market
2. Modify market information
3. Update filtering rules if needed
4. Click **Save Changes**
5. System updates market-based filtering rules immediately

#### Approval Workflows

**Viewing Workflow Configuration**
- Navigate to **Approval Workflows** tab
- View configured workflows by type

**Configuring Approval Workflows**

1. Select a workflow type (Street Sheet, Daily Report, Punch List, etc.)
2. Configure approval levels:
   - **Level Number**: Sequential approval order
   - **Required Role**: Role that must approve at this level
   - **Market Scoped**: Whether approval is market-specific
   - **Timeout Hours**: Optional timeout for approval action
3. Configure escalation rules:
   - Escalation trigger (timeout, rejection count)
   - Escalation target (Admin, specific user)
   - Notification settings
4. Configure notification settings:
   - Notification channels (email, in-app, SMS)
   - Reminder frequency
   - Escalation alerts
5. Click **Save Workflow**
6. System validates workflow logic and updates routing rules

**Workflow Validation**
- System validates that approval levels are sequential
- Ensures required roles exist
- Checks for circular dependencies
- Validates timeout values are reasonable

#### Notification Templates

**Managing Notification Templates**

1. Navigate to **Notification Templates** tab
2. View list of notification templates by type
3. Click **Edit** next to a template
4. Modify template content:
   - Subject line
   - Message body (supports variables)
   - Delivery channels
5. Preview template with sample data
6. Click **Save Template**

**Available Variables**
- `{{userName}}` - Recipient's name
- `{{taskType}}` - Type of task or item
- `{{submitterName}}` - Name of person who submitted
- `{{dueDate}}` - Due date for action
- `{{market}}` - Market name
- `{{projectName}}` - Associated project name

### Configuration History

**Viewing Configuration Changes**

1. Navigate to **Configuration History** tab
2. View complete history of configuration changes:
   - Timestamp
   - Admin user who made the change
   - Configuration category
   - Old and new values
   - Reason for change (if provided)
3. Filter by date range, admin user, or category

### Exporting Configuration

**Creating Configuration Backup**

1. Navigate to **System Configuration**
2. Click **Export Configuration**
3. Select configuration categories to export:
   - All Settings
   - Market Definitions Only
   - Workflow Configuration Only
   - Notification Settings Only
4. Click **Export**
5. System generates a JSON file for download
6. Save the file for backup purposes

---

## Approval Workflows

### Workflow Process Overview

The approval workflow system manages multi-level approval processes:

1. **Submission**: User submits an item for approval
2. **Routing**: System routes to appropriate approver based on market and workflow configuration
3. **Review**: Approver reviews and takes action (Approve, Reject, Request Changes)
4. **Notification**: System notifies relevant parties of the decision
5. **Next Level**: If multi-level approval, routes to next approver
6. **Completion**: Final approval completes the workflow

### Approval Actions

#### Approve
- Advances the item to the next approval level or marks as complete
- Optional comment can be added
- Submitter and next approver (if applicable) are notified

#### Reject
- Returns the item to the submitter
- **Rejection reason is required**
- Workflow is terminated
- Submitter is notified with rejection reason

#### Request Changes
- Returns the item to the submitter for modifications
- Specific changes must be described
- Workflow is paused until resubmission
- Submitter is notified with change requests

#### Escalate (Admin Only)
- Escalates the approval to Admin level
- Requires escalation reason
- Admins are notified of escalation
- Original approver is notified of escalation

### Approval Notifications

**Notification Timing**
- Immediate notification when item is submitted for your approval
- Reminder notification 24 hours after submission if not reviewed
- High-priority items trigger immediate multi-channel notifications

**Notification Channels**
- In-app notification badge
- Email notification
- SMS for high-priority items (if configured)

### Multi-Level Approvals

Some items require approval from multiple levels:

1. **Level 1**: Typically the responsible CM
2. **Level 2**: Senior CM or Admin (for high-value items)
3. **Level 3**: Executive approval (for critical items)

**Tracking Progress**
- Approval detail view shows workflow progress
- Completed levels are marked with checkmarks
- Current level is highlighted
- Pending levels are grayed out

---

## User Management

*This section applies to Administrators only*

### User Lifecycle Management

#### Creating Users

**Required Information**
- Name
- Email address
- Role (CM, Admin, Technician, etc.)
- Market assignment

**Optional Information**
- Company affiliation
- Specific permissions
- Notification preferences

**Process**
1. Navigate to **User Management**
2. Click **Create User**
3. Fill in user information
4. Configure permissions and preferences
5. Click **Create**
6. System generates credentials and emails the user

#### Updating Users

**Changing User Role**
1. Edit the user
2. Select new role from dropdown
3. Click **Save**
4. New permissions apply immediately
5. User is notified of role change

**Changing User Market**
1. Edit the user
2. Select new market from dropdown
3. Click **Save**
4. Data visibility updates immediately
5. User is notified of market change

**Important**: Role and market changes take effect immediately. The user does not need to log out and log back in.

#### Deactivating Users

**When to Deactivate**
- Employee leaves the company
- User no longer requires system access
- Security concerns

**Process**
1. Locate the user in the user list
2. Click **Deactivate**
3. **Enter reason for deactivation** (required for audit trail)
4. Confirm deactivation
5. System immediately revokes all access
6. Deactivation is logged with timestamp and reason

#### Password Reset

**When to Reset**
- User forgets password
- Security policy requires password change
- Suspected account compromise

**Process**
1. Locate the user in the user list
2. Click **Reset Password**
3. Confirm the reset
4. System generates a secure temporary password
5. Temporary password is emailed to the user
6. User must change password on next login

### Bulk User Operations

**Available Bulk Operations**
- Activate multiple users
- Deactivate multiple users
- Change role for multiple users
- Change market for multiple users

**Process**
1. Select users using checkboxes
2. Click **Bulk Actions**
3. Select operation type
4. Enter new value (if applicable)
5. **Enter reason for bulk operation** (required)
6. Review confirmation dialog
7. Confirm operation
8. System executes and logs all changes

**Safety Features**
- Confirmation dialog shows all affected users
- Reason is required for audit trail
- Operations are logged individually per user
- Failed operations are reported separately

---

## System Configuration

*This section applies to Administrators only*

### Configuration Management

#### Accessing Configuration

1. Log in with Admin credentials
2. Navigate to **System Configuration** from the admin menu
3. Select configuration category from tabs

### Market Configuration

**Purpose**: Define markets and their filtering rules

**Adding a Market**
1. Navigate to **Market Definitions** tab
2. Click **Add Market**
3. Enter:
   - Market Code (e.g., "NYC", "LA", "RG")
   - Market Name (e.g., "New York City")
   - Region
   - Special Rules (e.g., "Exclude from CM street sheets")
4. Click **Save**

**Editing Market Rules**
1. Click **Edit** next to a market
2. Modify filtering rules
3. Click **Save**
4. Rules apply immediately to all data queries

### Workflow Configuration

**Purpose**: Configure approval processes and routing rules

**Configuring a Workflow**
1. Navigate to **Approval Workflows** tab
2. Select workflow type
3. Configure approval levels:
   - Add or remove levels
   - Assign required roles
   - Set timeout periods
4. Configure escalation rules:
   - Define escalation triggers
   - Set escalation targets
5. Configure notifications:
   - Enable/disable notification channels
   - Set reminder frequency
6. Click **Save Workflow**
7. System validates and applies configuration

**Validation Rules**
- At least one approval level required
- Approval levels must be sequential
- Required roles must exist in the system
- Timeout values must be positive integers
- Escalation targets must be valid users or roles

### Notification Configuration

**Global Notification Settings**

1. Navigate to **Notification Settings** tab
2. Configure global settings:
   - Enable/disable notification channels system-wide
   - Set default reminder frequency
   - Configure high-priority notification rules
3. Click **Save Settings**

**Notification Templates**

See [Notification Templates](#notification-templates) section above.

### Configuration Backup and Restore

**Exporting Configuration**
1. Click **Export Configuration**
2. Select categories to export
3. Download JSON file
4. Store securely for backup

**Importing Configuration**
1. Click **Import Configuration**
2. Select JSON file
3. Review changes to be applied
4. Confirm import
5. System validates and applies configuration

**Important**: Configuration import overwrites existing settings. Always export current configuration before importing.

---

## Notification Preferences

### For All Users

#### Accessing Notification Preferences

1. Click on your profile icon
2. Select **Notification Preferences**

#### Configuring Preferences

**Notification Channels**
- **Email**: Receive notifications via email
- **In-App**: Show notification badge and in-app alerts
- **SMS**: Receive text messages for high-priority items (requires phone number)

**Notification Types**
- **Approval Reminders**: Reminders for pending approvals
- **Escalation Alerts**: Notifications when items are escalated
- **Daily Digest**: Summary email of daily activity
- **Task Assignments**: Notifications when assigned new tasks
- **Project Updates**: Notifications for project milestone changes

**Frequency Settings**
- **Immediate**: Receive notifications as events occur
- **Hourly Digest**: Batch notifications into hourly summaries
- **Daily Digest**: Single daily summary email

#### Saving Preferences

1. Configure your preferences
2. Click **Save Preferences**
3. Changes apply immediately to future notifications

### For Construction Managers

**Market-Specific Notifications**
- Notifications are automatically filtered to your assigned market
- You only receive notifications for events in your market
- Cannot configure cross-market notifications

**Approval Notifications**
- Enabled by default for all CMs
- Receive notifications when items require your approval
- 24-hour reminder if approval is pending

### For Administrators

**System-Wide Notifications**
- Receive notifications for system-wide events
- Escalation notifications for all markets
- Critical system alerts

**Broadcast Notifications**

Admins can send broadcast messages to users:

1. Navigate to **Notifications** in admin menu
2. Click **Send Broadcast**
3. Configure broadcast:
   - **Recipients**: All Users, Specific Role, Specific Market
   - **Priority**: Normal, High, Critical
   - **Channels**: Email, In-App, SMS
   - **Message**: Compose message content
4. Preview message
5. Click **Send Broadcast**
6. System delivers to all selected recipients

**Notification Logs**

View all sent notifications:

1. Navigate to **Notification Logs** in admin menu
2. View notification history:
   - Timestamp
   - Recipient(s)
   - Message content
   - Delivery status
   - Channels used
3. Filter by date range, recipient, or status

---

## Troubleshooting

### Common Issues

**Issue: Cannot see expected data**
- **CM Users**: Verify you are assigned to the correct market
- **All Users**: Check that date range filter is not too restrictive
- **Solution**: Contact your administrator to verify market assignment

**Issue: Cannot access a feature**
- **Cause**: Feature may be restricted to a different role
- **Solution**: Verify your role with your administrator

**Issue: Approval not appearing in queue**
- **CM Users**: Verify the item is from your assigned market
- **All Users**: Check approval queue filters
- **Solution**: Clear all filters and refresh the page

**Issue: Notification not received**
- **Cause**: Notification preferences may be disabled
- **Solution**: Check notification preferences and enable desired channels

### Getting Help

For additional assistance:
- Contact your system administrator
- Submit a support ticket through the Help menu
- Email support at [support@example.com]

---

## Appendix

### Keyboard Shortcuts

- **Ctrl+D**: Navigate to Dashboard
- **Ctrl+A**: Navigate to Approvals (CM/Admin)
- **Ctrl+U**: Navigate to User Management (Admin only)
- **Ctrl+R**: Refresh current view
- **Ctrl+F**: Focus search box

### Glossary

- **Market**: Geographic or organizational boundary for data filtering
- **RG Market**: Specific market designation with special access rules
- **Street Sheet**: Document tracking field work and project progress
- **Punch List**: List of items requiring completion or correction
- **Daily Report**: Daily summary of work completed and resources used
- **Escalation**: Routing an approval to a higher authority level
- **Bulk Operation**: Action performed on multiple users simultaneously

---

*Last Updated: February 2026*
*Version: 1.0*
