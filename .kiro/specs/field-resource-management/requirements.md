# Requirements Document: Field Resource Management Tool

## Introduction

The Field Resource Management Tool is an internal CRM system designed to schedule, manage, and track installer technicians working in the field for the ATLAS system. This tool replaces spreadsheet-based and ad-hoc scheduling with a centralized, scalable platform that efficiently assigns work to field installers, provides clear visibility into day-to-day operations, reduces scheduling conflicts, tracks labor hours, and improves operational control.

## Glossary

- **System**: The Field Resource Management Tool
- **Technician**: Field installer or deployment engineer who performs on-site work
- **Job**: A work order or task assigned to one or more technicians
- **Dispatcher**: Operations manager responsible for creating and assigning jobs
- **Admin**: System administrator with full access to all features and settings
- **Time_Entry**: Record of clock-in and clock-out times for a technician on a specific job
- **Skill_Tag**: A specific competency or certification (e.g., Cat6, Fiber Splicing, OSHA10)
- **Assignment**: The linking of a technician to a job for a specific time period
- **Utilization_Rate**: Percentage of available work hours that a technician spends on assigned jobs

## Requirements

### Requirement 1: User Authentication and Authorization

**User Story:** As a system administrator, I want role-based access control, so that users can only access features appropriate to their role.

#### Acceptance Criteria

1. WHEN a user logs in, THE System SHALL authenticate their credentials against the user database
2. WHEN authentication succeeds, THE System SHALL assign the user their designated role (Admin, Dispatcher, or Technician)
3. WHEN a user attempts to access a feature, THE System SHALL verify the user has the required permissions for that feature
4. WHEN a user lacks required permissions, THE System SHALL deny access and display an appropriate error message
5. THE System SHALL maintain secure session management with automatic timeout after 30 minutes of inactivity

### Requirement 2: Technician Profile Management

**User Story:** As an administrator, I want to maintain comprehensive technician profiles, so that I can track skills, certifications, and availability for proper job assignment.

#### Acceptance Criteria

1. WHEN creating a technician profile, THE System SHALL require Technician ID, Name, Role, and Home Base fields
2. THE System SHALL allow administrators to add multiple Skill_Tags to each technician profile
3. THE System SHALL store certification information including certification name, issue date, and expiration date
4. THE System SHALL allow administrators to mark specific dates as unavailable for each technician (PTO, sick days)
5. WHEN storing hourly cost rates, THE System SHALL restrict visibility to Admin role only
6. THE System SHALL support both W2 and 1099 employment type designations
7. THE System SHALL validate that all required fields are populated before saving a technician profile

### Requirement 3: Job and Work Order Management

**User Story:** As a dispatcher, I want to create and manage work orders with detailed specifications, so that technicians have all necessary information to complete their assignments.

#### Acceptance Criteria

1. WHEN creating a job, THE System SHALL generate a unique Job ID automatically
2. THE System SHALL require Client, Site Name, Site Address, Job Type, and Scheduled Start Date fields
3. THE System SHALL allow dispatchers to specify required Skill_Tags for each job
4. THE System SHALL allow dispatchers to specify required crew size (number of technicians needed)
5. THE System SHALL support job types: Install, Decom, Site Survey, and PM (Preventive Maintenance)
6. THE System SHALL support priority levels: P1 (Critical), P2 (High), and Normal
7. THE System SHALL allow file attachments (drawings, MOPs) to be associated with jobs
8. WHEN a job is saved, THE System SHALL validate that all required fields contain valid data

### Requirement 4: Scheduling and Assignment

**User Story:** As a dispatcher, I want to assign technicians to jobs using a visual calendar interface, so that I can efficiently manage field resources and avoid conflicts.

#### Acceptance Criteria

1. THE System SHALL display a calendar view with day and week viewing options
2. WHEN a dispatcher assigns a technician to a job, THE System SHALL check for scheduling conflicts (double booking)
3. IF a scheduling conflict exists, THEN THE System SHALL display a warning message and prevent the assignment
4. WHEN assigning a technician to a job, THE System SHALL verify the technician possesses required Skill_Tags
5. IF a technician lacks required skills, THEN THE System SHALL display a skill mismatch warning
6. THE System SHALL support drag-and-drop functionality for job assignments in calendar view
7. THE System SHALL allow jobs to span multiple consecutive days
8. WHEN a job requires multiple technicians, THE System SHALL allow assignment of multiple technicians to the same job
9. THE System SHALL display technician availability status in the calendar view

### Requirement 5: Technician Daily View

**User Story:** As a field technician, I want to view my assigned jobs on a mobile device, so that I can see my schedule and job details while in the field.

#### Acceptance Criteria

1. WHEN a technician logs in, THE System SHALL display today's assigned jobs by default
2. THE System SHALL display job details including Site Address, Scope Description, Customer POC, and Notes
3. THE System SHALL provide a mobile-responsive interface optimized for smartphone screens
4. THE System SHALL allow technicians to view jobs for the current week
5. THE System SHALL display jobs in chronological order by scheduled start time
6. WHEN a technician selects a job, THE System SHALL display full job details including attachments

### Requirement 6: Job Status Management

**User Story:** As a field technician, I want to update job status throughout the workday, so that dispatchers have real-time visibility into job progress.

#### Acceptance Criteria

1. THE System SHALL support job status values: Not Started, En Route, On Site, Completed, and Issue
2. WHEN a technician updates job status, THE System SHALL record the status change with timestamp
3. THE System SHALL allow technicians to update status for their assigned jobs only
4. WHEN a job status changes to "Issue", THE System SHALL require the technician to provide a reason code
5. THE System SHALL display current job status to dispatchers in real-time
6. THE System SHALL maintain a complete history of all status changes for each job

### Requirement 7: Time and Activity Tracking

**User Story:** As a dispatcher, I want to capture actual labor hours for each job, so that I can track costs and compare planned versus actual effort.

#### Acceptance Criteria

1. WHEN a technician clocks in to a job, THE System SHALL record the start time automatically
2. WHEN a technician clocks out of a job, THE System SHALL record the stop time automatically
3. THE System SHALL calculate total labor hours as the difference between clock-in and clock-out times
4. THE System SHALL allow technicians to clock in to only one job at a time
5. WHERE a technician forgets to clock in or out, THE System SHALL allow administrators to manually adjust time entries
6. THE System SHALL store all time entries with associated Job ID and Technician ID
7. THE System SHALL display planned hours versus actual hours for each job

### Requirement 8: Mileage Tracking

**User Story:** As a field technician, I want the system to automatically log my mileage, so that I can be reimbursed accurately without manual tracking.

#### Acceptance Criteria

1. WHEN a technician clocks in to a job, THE System SHALL record the starting location
2. WHEN a technician clocks out of a job, THE System SHALL record the ending location
3. THE System SHALL calculate mileage between starting location and job site address
4. THE System SHALL calculate mileage between job site address and ending location
5. THE System SHALL store total mileage for each Time_Entry
6. WHERE location services are unavailable, THE System SHALL allow manual mileage entry

### Requirement 9: Job Completion and Field Reporting

**User Story:** As a field technician, I want to document job completion with notes and photos, so that there is a record of work performed.

#### Acceptance Criteria

1. WHEN a technician marks a job as Completed, THE System SHALL require job completion confirmation
2. THE System SHALL allow technicians to add text notes to completed jobs
3. THE System SHALL allow technicians to upload photos associated with completed jobs
4. THE System SHALL support common image formats (JPEG, PNG, HEIC)
5. WHEN a job cannot be completed, THE System SHALL require selection of a delay reason code
6. THE System SHALL store all completion documentation with the associated Job ID
7. THE System SHALL limit photo uploads to 10 MB per image

### Requirement 10: Technician Utilization Reporting

**User Story:** As an operations manager, I want to view technician utilization rates, so that I can identify underutilized resources and optimize scheduling.

#### Acceptance Criteria

1. THE System SHALL calculate Utilization_Rate as (actual labor hours / available hours) × 100
2. THE System SHALL display utilization rates per technician for selectable date ranges
3. THE System SHALL allow filtering utilization reports by technician, role, or region
4. THE System SHALL display utilization data in both tabular and graphical formats
5. THE System SHALL exclude PTO and unavailable dates from available hours calculations
6. THE System SHALL update utilization calculations daily

### Requirement 11: Job Performance Reporting

**User Story:** As an operations manager, I want to view job completion metrics, so that I can track productivity and identify bottlenecks.

#### Acceptance Criteria

1. THE System SHALL display total jobs completed per technician for selectable date ranges
2. THE System SHALL display labor hours per job with comparison to estimated hours
3. THE System SHALL display open jobs versus completed jobs counts
4. THE System SHALL calculate schedule adherence as percentage of jobs completed on scheduled date
5. THE System SHALL allow filtering reports by job type, priority, client, or date range
6. THE System SHALL allow exporting report data to CSV format

### Requirement 12: Notification System

**User Story:** As a field technician, I want to receive notifications when jobs are assigned to me, so that I am immediately aware of new work.

#### Acceptance Criteria

1. WHEN a job is assigned to a technician, THE System SHALL send a notification to that technician
2. WHEN a job assignment is changed, THE System SHALL notify affected technicians
3. WHEN a job is cancelled, THE System SHALL notify assigned technicians
4. THE System SHALL support in-app notifications visible upon login
5. WHERE a technician has provided contact information, THE System SHALL support email notifications
6. THE System SHALL allow technicians to configure notification preferences

### Requirement 13: Data Backup and Recovery

**User Story:** As a system administrator, I want automated daily backups, so that data can be recovered in case of system failure.

#### Acceptance Criteria

1. THE System SHALL perform automated backups of all data daily
2. THE System SHALL retain backup copies for a minimum of 30 days
3. THE System SHALL verify backup integrity after each backup operation
4. IF a backup fails, THEN THE System SHALL alert administrators immediately
5. THE System SHALL provide a restore function accessible to administrators only
6. THE System SHALL log all backup and restore operations with timestamps

### Requirement 14: System Scalability

**User Story:** As a system administrator, I want the system to support growth, so that it can handle increasing numbers of technicians and jobs.

#### Acceptance Criteria

1. THE System SHALL support a minimum of 100 concurrent technician users
2. THE System SHALL support a minimum of 1000 active jobs simultaneously
3. WHEN the number of users or jobs increases, THE System SHALL maintain response times under 2 seconds for standard operations
4. THE System SHALL support database indexing for performance optimization
5. THE System SHALL implement pagination for lists exceeding 50 items

### Requirement 15: Mobile Responsiveness

**User Story:** As a field technician, I want to access the system on my smartphone, so that I can manage my work while mobile.

#### Acceptance Criteria

1. THE System SHALL render correctly on screen sizes from 320px to 1920px width
2. THE System SHALL support touch gestures for mobile interactions (tap, swipe, pinch-to-zoom)
3. WHEN accessed on mobile devices, THE System SHALL prioritize essential information and actions
4. THE System SHALL maintain functionality on iOS and Android mobile browsers
5. THE System SHALL load pages within 3 seconds on 4G mobile connections

### Requirement 16: Search and Filter Functionality

**User Story:** As a dispatcher, I want to search and filter jobs and technicians, so that I can quickly find specific information.

#### Acceptance Criteria

1. THE System SHALL provide search functionality for jobs by Job ID, Client, Site Name, or Address
2. THE System SHALL provide search functionality for technicians by Name, Technician ID, or Skill_Tag
3. THE System SHALL allow filtering jobs by Status, Priority, Job Type, or Date Range
4. THE System SHALL allow filtering technicians by Role, Skill_Tag, or Availability
5. WHEN search or filter criteria are applied, THE System SHALL return results within 2 seconds
6. THE System SHALL display search results with relevant summary information

### Requirement 17: Audit Logging

**User Story:** As a system administrator, I want to track all system changes, so that I can maintain accountability and troubleshoot issues.

#### Acceptance Criteria

1. THE System SHALL log all job creation, modification, and deletion actions
2. THE System SHALL log all technician profile changes
3. THE System SHALL log all job assignments and reassignments
4. THE System SHALL log all time entry modifications
5. THE System SHALL record the user ID, timestamp, and action type for each logged event
6. THE System SHALL allow administrators to view audit logs filtered by date range, user, or action type
7. THE System SHALL retain audit logs for a minimum of 1 year

### Requirement 18: Conflict Resolution

**User Story:** As a dispatcher, I want to be alerted to scheduling conflicts, so that I can resolve them before they impact operations.

#### Acceptance Criteria

1. WHEN a technician is assigned to overlapping jobs, THE System SHALL detect the conflict
2. THE System SHALL display conflict details including conflicting job IDs and time ranges
3. THE System SHALL prevent saving assignments that create conflicts unless explicitly overridden
4. WHERE a dispatcher overrides a conflict warning, THE System SHALL require a justification note
5. THE System SHALL log all conflict overrides in the audit log

### Requirement 19: Skill Matching

**User Story:** As a dispatcher, I want to see which technicians are qualified for a job, so that I can assign the right person efficiently.

#### Acceptance Criteria

1. WHEN viewing a job's assignment options, THE System SHALL display all technicians with matching Skill_Tags
2. THE System SHALL rank technicians by skill match percentage (number of matching skills / total required skills)
3. THE System SHALL display technicians without required skills in a separate section with missing skills indicated
4. THE System SHALL consider technician availability when displaying assignment options
5. THE System SHALL display current workload for each technician in assignment options

### Requirement 20: Job Reassignment

**User Story:** As a dispatcher, I want to reassign jobs between technicians, so that I can adapt to changing circumstances.

#### Acceptance Criteria

1. THE System SHALL allow dispatchers to reassign jobs from one technician to another
2. WHEN a job is reassigned, THE System SHALL notify both the original and new technician
3. THE System SHALL preserve all existing time entries when reassigning a job
4. THE System SHALL maintain a history of all assignments for each job
5. WHEN reassigning a job, THE System SHALL perform the same conflict and skill checks as initial assignment

### Requirement 21: Batch Operations

**User Story:** As a dispatcher, I want to perform actions on multiple jobs at once, so that I can work more efficiently.

#### Acceptance Criteria

1. THE System SHALL allow selection of multiple jobs via checkboxes
2. THE System SHALL support batch status updates for selected jobs
3. THE System SHALL support batch reassignment of selected jobs to a single technician
4. THE System SHALL support batch deletion of selected jobs
5. WHEN performing batch operations, THE System SHALL validate each operation and report any failures
6. THE System SHALL require confirmation before executing batch operations

### Requirement 22: Dashboard Overview

**User Story:** As an operations manager, I want a dashboard with key metrics, so that I can quickly assess operational status.

#### Acceptance Criteria

1. THE System SHALL display total active jobs count on the dashboard
2. THE System SHALL display total available technicians count on the dashboard
3. THE System SHALL display jobs by status (Not Started, En Route, On Site, Completed, Issue) with counts
4. THE System SHALL display average utilization rate across all technicians
5. THE System SHALL display jobs requiring attention (overdue, issues, conflicts)
6. THE System SHALL refresh dashboard data automatically every 5 minutes
7. THE System SHALL allow users to manually refresh dashboard data

### Requirement 23: Data Export

**User Story:** As an operations manager, I want to export data to external formats, so that I can perform additional analysis or share with stakeholders.

#### Acceptance Criteria

1. THE System SHALL allow exporting job lists to CSV format
2. THE System SHALL allow exporting technician lists to CSV format
3. THE System SHALL allow exporting time entries to CSV format
4. THE System SHALL allow exporting reports to PDF format
5. WHEN exporting data, THE System SHALL include all visible columns and applied filters
6. THE System SHALL generate export files within 10 seconds for datasets under 1000 records

### Requirement 24: Customer Point of Contact Management

**User Story:** As a field technician, I want to see customer contact information for each job, so that I can communicate with the site contact if needed.

#### Acceptance Criteria

1. THE System SHALL allow dispatchers to add customer POC name to jobs
2. THE System SHALL allow dispatchers to add customer POC phone number to jobs
3. THE System SHALL allow dispatchers to add customer POC email to jobs
4. THE System SHALL display customer POC information in the technician's job detail view
5. THE System SHALL validate phone number and email formats before saving
6. WHERE customer POC information is provided, THE System SHALL display it prominently in mobile view

### Requirement 25: Job Notes and Communication

**User Story:** As a dispatcher, I want to add notes to jobs that technicians can see, so that I can communicate special instructions or updates.

#### Acceptance Criteria

1. THE System SHALL allow dispatchers to add notes to jobs at any time
2. THE System SHALL allow technicians to add notes to their assigned jobs
3. THE System SHALL display all notes in chronological order with author and timestamp
4. THE System SHALL support notes up to 2000 characters in length
5. THE System SHALL notify assigned technicians when a dispatcher adds a note to their job
6. THE System SHALL allow editing of notes by the original author within 1 hour of creation

### Requirement 26: Certification Expiration Tracking

**User Story:** As an administrator, I want to be alerted when technician certifications are expiring, so that I can ensure compliance and avoid assignment issues.

#### Acceptance Criteria

1. THE System SHALL check certification expiration dates daily
2. WHEN a certification will expire within 30 days, THE System SHALL flag the technician profile
3. WHEN a certification will expire within 30 days, THE System SHALL notify administrators
4. WHEN a certification has expired, THE System SHALL remove the associated Skill_Tag from the technician profile
5. THE System SHALL display certification status (Active, Expiring Soon, Expired) in technician profiles
6. THE System SHALL generate a monthly report of expiring and expired certifications

### Requirement 27: Job Template Management

**User Story:** As a dispatcher, I want to create job templates for common work types, so that I can create new jobs more quickly.

#### Acceptance Criteria

1. THE System SHALL allow dispatchers to save jobs as templates
2. THE System SHALL store template name, job type, required skills, estimated hours, and crew size
3. THE System SHALL allow dispatchers to create new jobs from templates
4. WHEN creating a job from a template, THE System SHALL pre-populate all template fields
5. THE System SHALL allow editing of template-created jobs before saving
6. THE System SHALL allow administrators to manage (create, edit, delete) job templates

### Requirement 28: Geographic Region Management

**User Story:** As an administrator, I want to organize technicians and jobs by geographic region, so that I can optimize local resource allocation.

#### Acceptance Criteria

1. THE System SHALL allow administrators to define geographic regions with names and boundaries
2. THE System SHALL allow assignment of technicians to home regions
3. THE System SHALL allow assignment of jobs to regions based on site address
4. THE System SHALL allow filtering of technicians and jobs by region
5. THE System SHALL display region information in calendar and list views
6. THE System SHALL calculate cross-region assignments and flag them for dispatcher review

### Requirement 29: Performance Metrics

**User Story:** As an operations manager, I want to track key performance indicators, so that I can measure success against business objectives.

#### Acceptance Criteria

1. THE System SHALL calculate percentage of jobs assigned through the system (target: 95%+)
2. THE System SHALL track scheduling conflicts per week (target: near zero)
3. THE System SHALL calculate percentage of jobs with complete time entries (target: 100%)
4. THE System SHALL calculate average technician utilization rate (target: configurable)
5. THE System SHALL display KPIs on the dashboard with trend indicators (up, down, stable)
6. THE System SHALL allow administrators to set target values for each KPI
7. THE System SHALL highlight KPIs that fall below target thresholds

### Requirement 30: System Configuration

**User Story:** As a system administrator, I want to configure system settings, so that the system can be customized to organizational needs.

#### Acceptance Criteria

1. THE System SHALL allow administrators to configure session timeout duration
2. THE System SHALL allow administrators to configure notification preferences (enabled/disabled)
3. THE System SHALL allow administrators to configure backup retention period
4. THE System SHALL allow administrators to configure KPI target values
5. THE System SHALL allow administrators to configure job status values and reason codes
6. THE System SHALL validate all configuration changes before saving
7. THE System SHALL log all configuration changes in the audit log
