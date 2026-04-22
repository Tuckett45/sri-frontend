# Requirements Document

## Introduction

This specification covers making the Field Resources Management module UAT-ready. The focus areas are: technician timesheets and clock-in/clock-out functionality, technician schedule viewing, job entry management, and the ability to create and display Technicians, Crews, and Jobs. UAT readiness means these workflows must function end-to-end with proper data validation, error handling, loading/empty states, and role-based access so that QA testers can exercise all primary paths and edge cases.

## Glossary

- **FRM_Application**: The Field Resource Management Angular module, including all lazy-loaded sub-modules, NgRx state, services, and UI components.
- **Time_Tracker**: The mobile time-tracking component and associated TimeTrackingService responsible for clock-in, clock-out, and active time entry management.
- **Timecard_View**: The timecard dashboard and entry components that display aggregated time entries, weekly summaries, and timecard period status.
- **Schedule_View**: The CalendarViewComponent and TechnicianScheduleComponent that display technician assignments on a calendar or per-technician timeline.
- **Job_Manager**: The set of components (JobListComponent, JobDetailComponent, JobFormComponent, JobSetupComponent) and JobService responsible for creating, editing, viewing, and managing jobs.
- **Technician_Manager**: The set of components (TechnicianListComponent, TechnicianDetailComponent, TechnicianFormComponent) and TechnicianService responsible for creating, editing, viewing, and managing technician profiles.
- **Crew_Manager**: The set of components (CrewListComponent, CrewDetailComponent, CrewFormComponent) and CrewService responsible for creating, editing, viewing, and managing crews.
- **NgRx_Store**: The centralized state management layer using NgRx Store and Effects for technicians, jobs, crews, assignments, and time entries.
- **Technician**: A field worker with skills, certifications, availability, and a role (Installer, Lead, Level1–Level4).
- **Crew**: A named group of technicians with a lead, assigned to a market and company, with a status (Available, OnJob, Unavailable).
- **Job**: A work order with client, site, type (Install, Decom, SiteSurvey, PM), priority (P1, P2, Normal), status lifecycle, required skills, and scheduling dates.
- **TimeEntry**: A record of a technician's clock-in and clock-out for a specific job, including geolocation, hours, and mileage.
- **UAT_Tester**: A QA team member who exercises the application through the UI to validate business workflows.

## Requirements

### Requirement 1: Technician Clock-In to a Job

**User Story:** As a Technician, I want to clock into my assigned job, so that my work hours are tracked accurately.

#### Acceptance Criteria

1. WHEN a Technician taps the clock-in button for an assigned job, THE Time_Tracker SHALL create a TimeEntry with the current timestamp and the associated job ID.
2. WHEN a Technician clocks in and the browser supports geolocation, THE Time_Tracker SHALL capture the clock-in GPS coordinates and store them on the TimeEntry.
3. IF geolocation capture fails during clock-in, THEN THE Time_Tracker SHALL proceed with clock-in without location data and log a warning.
4. WHILE a Technician has an active TimeEntry (clocked in), THE Time_Tracker SHALL display the elapsed time and prevent a second concurrent clock-in.
5. WHEN a clock-in request fails due to a server error, THE Time_Tracker SHALL display a descriptive error message to the Technician and retain the ability to retry.

### Requirement 2: Technician Clock-Out from a Job

**User Story:** As a Technician, I want to clock out of my current job, so that my total hours are calculated and recorded.

#### Acceptance Criteria

1. WHEN a Technician taps the clock-out button, THE Time_Tracker SHALL update the active TimeEntry with the clock-out timestamp and calculate totalHours.
2. WHEN a Technician clocks out and the browser supports geolocation, THE Time_Tracker SHALL capture the clock-out GPS coordinates and store them on the TimeEntry.
3. IF geolocation capture fails during clock-out, THEN THE Time_Tracker SHALL proceed with clock-out without location data and log a warning.
4. WHEN a Technician clocks out, THE Time_Tracker SHALL allow optional mileage entry before finalizing the clock-out.
5. WHEN a clock-out request fails due to a server error, THE Time_Tracker SHALL display a descriptive error message and keep the TimeEntry in its active state.

### Requirement 3: Timecard Display and Weekly Summary

**User Story:** As a Technician, I want to view my timecard with daily and weekly summaries, so that I can verify my logged hours before submission.

#### Acceptance Criteria

1. WHEN a Technician navigates to the Timecard_View, THE Timecard_View SHALL load and display all TimeEntries for the current timecard period grouped by day.
2. THE Timecard_View SHALL display totalHours, regularHours, and overtimeHours for each day and for the weekly summary.
3. WHEN the Timecard_View has no TimeEntries for the selected period, THE Timecard_View SHALL display an empty state message indicating no time has been logged.
4. WHEN the Timecard_View is loading data, THE Timecard_View SHALL display a loading indicator.
5. IF the Timecard_View fails to load TimeEntries, THEN THE Timecard_View SHALL display an error message with a retry option.

### Requirement 4: Technician Schedule Viewing

**User Story:** As a Technician, I want to view my upcoming schedule of assigned jobs, so that I can plan my workday.

#### Acceptance Criteria

1. WHEN a Technician navigates to the Schedule_View, THE Schedule_View SHALL display all assignments for the selected date range on a calendar or timeline.
2. WHEN a Technician selects a specific date, THE Schedule_View SHALL display the job details (job ID, client, site name, site address, scheduled start time, scheduled end time) for each assignment on that date.
3. WHEN the Schedule_View has no assignments for the selected date range, THE Schedule_View SHALL display an empty state message.
4. WHEN the Schedule_View is loading assignment data, THE Schedule_View SHALL display a loading indicator.
5. IF the Schedule_View fails to load assignments, THEN THE Schedule_View SHALL display an error message with a retry option.

### Requirement 5: Job Creation via Multi-Step Wizard

**User Story:** As a Dispatcher, I want to create a new job using the multi-step setup wizard, so that all required job information is captured systematically.

#### Acceptance Criteria

1. WHEN a Dispatcher navigates to the new job route, THE Job_Manager SHALL display the JobSetupComponent multi-step wizard starting at the first step (Customer Info).
2. THE Job_Manager SHALL validate required fields (client, siteName, siteAddress, jobType, priority, scheduledStartDate, scheduledEndDate) before allowing progression to the next wizard step.
3. WHEN a Dispatcher submits the completed wizard, THE Job_Manager SHALL create the Job via the JobService and persist it to the NgRx_Store.
4. IF job creation fails due to a server error, THEN THE Job_Manager SHALL display a descriptive error message and retain the form data so the Dispatcher can retry.
5. WHEN a Dispatcher provides a scheduledEndDate that is before the scheduledStartDate, THE Job_Manager SHALL display a validation error and prevent form submission.
6. THE Job_Manager SHALL enforce the CreateJobGuard so that only users with the Dispatcher or Admin role can access the job creation route.

### Requirement 6: Job List Display with Filtering

**User Story:** As a Dispatcher, I want to view a list of all jobs with filtering options, so that I can find and manage jobs efficiently.

#### Acceptance Criteria

1. WHEN a Dispatcher navigates to the jobs list, THE Job_Manager SHALL load and display all jobs with their jobId, client, siteName, jobType, priority, and status.
2. WHEN a Dispatcher applies a filter (by status, priority, jobType, client, market, or search term), THE Job_Manager SHALL update the displayed job list to show only matching jobs.
3. WHEN the job list has no jobs matching the applied filters, THE Job_Manager SHALL display an empty state message.
4. WHEN the job list is loading, THE Job_Manager SHALL display a loading indicator.
5. IF the job list fails to load, THEN THE Job_Manager SHALL display an error message with a retry option.

### Requirement 7: Job Detail View and Status Transitions

**User Story:** As a Dispatcher, I want to view job details and update job status, so that I can track job progress through its lifecycle.

#### Acceptance Criteria

1. WHEN a Dispatcher selects a job from the list, THE Job_Manager SHALL navigate to the JobDetailComponent and display all job fields including notes, attachments, and status history.
2. WHEN a Dispatcher changes the job status, THE Job_Manager SHALL call the JobService updateJobStatus method and update the NgRx_Store with the new status.
3. THE Job_Manager SHALL enforce valid status transitions (NotStarted → EnRoute → OnSite → Completed, or any status → Issue, or any status → Cancelled).
4. IF a status transition is invalid, THEN THE Job_Manager SHALL display a validation error and prevent the transition.
5. WHEN a Dispatcher adds a note to a job, THE Job_Manager SHALL persist the note via JobService and display it in the notes section with author and timestamp.

### Requirement 8: Technician Creation and Editing

**User Story:** As an Admin or Dispatcher, I want to create and edit technician profiles, so that the technician roster is accurate and up to date.

#### Acceptance Criteria

1. WHEN an Admin navigates to the new technician form, THE Technician_Manager SHALL display the TechnicianFormComponent with fields for firstName, lastName, email, phone, role, employmentType, homeBase, region, skills, and certifications.
2. THE Technician_Manager SHALL validate required fields (firstName, lastName, email, region) and email format before allowing form submission.
3. WHEN an Admin submits a valid technician form, THE Technician_Manager SHALL create the Technician via TechnicianService and persist it to the NgRx_Store.
4. IF technician creation fails due to a server error, THEN THE Technician_Manager SHALL display a descriptive error message and retain the form data.
5. WHEN an Admin edits an existing technician, THE Technician_Manager SHALL pre-populate the form with the current technician data and submit updates via TechnicianService.
6. THE Technician_Manager SHALL validate phone number format when a phone number is provided.

### Requirement 9: Technician List Display with Filtering

**User Story:** As a Dispatcher, I want to view a list of all technicians with filtering options, so that I can find technicians by skill, role, or availability.

#### Acceptance Criteria

1. WHEN a Dispatcher navigates to the technicians list, THE Technician_Manager SHALL load and display all technicians with their name, role, region, skills, and active status.
2. WHEN a Dispatcher applies a filter (by role, skills, region, availability, active status, or search term), THE Technician_Manager SHALL update the displayed list to show only matching technicians.
3. WHEN the technician list has no technicians matching the applied filters, THE Technician_Manager SHALL display an empty state message.
4. WHEN the technician list is loading, THE Technician_Manager SHALL display a loading indicator.
5. IF the technician list fails to load, THEN THE Technician_Manager SHALL display an error message with a retry option.
6. WHILE a user has the CM role, THE Technician_Manager SHALL apply market-based filtering to display only technicians within the CM user's market.

### Requirement 10: Crew Creation and Editing

**User Story:** As a Dispatcher, I want to create and edit crews, so that I can organize technicians into working groups for job assignments.

#### Acceptance Criteria

1. WHEN a Dispatcher navigates to the new crew form, THE Crew_Manager SHALL display the CrewFormComponent with fields for name, leadTechnicianId, memberIds, market, company, and status.
2. THE Crew_Manager SHALL validate required fields (name, leadTechnicianId, market) before allowing form submission.
3. WHEN a Dispatcher submits a valid crew form, THE Crew_Manager SHALL create the Crew via CrewService and persist it to the NgRx_Store.
4. IF crew creation fails due to a server error, THEN THE Crew_Manager SHALL display a descriptive error message and retain the form data.
5. WHEN a Dispatcher edits an existing crew, THE Crew_Manager SHALL pre-populate the form with the current crew data and submit updates via CrewService.

### Requirement 11: Crew List Display

**User Story:** As a Dispatcher, I want to view a list of all crews with their status and members, so that I can manage crew assignments.

#### Acceptance Criteria

1. WHEN a Dispatcher navigates to the crews list, THE Crew_Manager SHALL load and display all crews with their name, lead technician, member count, market, status, and current location.
2. WHEN a Dispatcher applies a filter (by status, market, company, or search term), THE Crew_Manager SHALL update the displayed list to show only matching crews.
3. WHEN the crew list has no crews matching the applied filters, THE Crew_Manager SHALL display an empty state message.
4. WHEN the crew list is loading, THE Crew_Manager SHALL display a loading indicator.
5. IF the crew list fails to load, THEN THE Crew_Manager SHALL display an error message with a retry option.

### Requirement 12: Crew Member Management

**User Story:** As a Dispatcher, I want to add and remove technicians from a crew, so that crew composition reflects current staffing needs.

#### Acceptance Criteria

1. WHEN a Dispatcher adds a technician to a crew via the CrewDetailComponent, THE Crew_Manager SHALL call CrewService addCrewMember and update the crew's memberIds in the NgRx_Store.
2. WHEN a Dispatcher removes a technician from a crew, THE Crew_Manager SHALL call CrewService removeCrewMember and update the crew's memberIds in the NgRx_Store.
3. IF adding or removing a crew member fails due to a server error, THEN THE Crew_Manager SHALL display a descriptive error message and revert the UI to the previous state.

### Requirement 13: NgRx State Consistency for UAT Flows

**User Story:** As a UAT_Tester, I want the application state to remain consistent across navigation and operations, so that data displayed is always accurate.

#### Acceptance Criteria

1. WHEN a Job is created via the Job_Manager, THE NgRx_Store SHALL reflect the new Job in the jobs state slice and the job list SHALL display the new Job without requiring a page refresh.
2. WHEN a Technician is created via the Technician_Manager, THE NgRx_Store SHALL reflect the new Technician in the technicians state slice and the technician list SHALL display the new Technician without requiring a page refresh.
3. WHEN a Crew is created via the Crew_Manager, THE NgRx_Store SHALL reflect the new Crew in the crews state slice and the crew list SHALL display the new Crew without requiring a page refresh.
4. WHEN a TimeEntry is created via clock-in, THE NgRx_Store SHALL reflect the new TimeEntry in the timeEntries state slice and the Timecard_View SHALL include the new entry.
5. WHEN a Job status is updated, THE NgRx_Store SHALL reflect the updated status and all views displaying that Job SHALL show the current status.

### Requirement 14: Role-Based Route Protection

**User Story:** As a UAT_Tester, I want role-based access controls to be enforced on all FRM routes, so that unauthorized users cannot access restricted functionality.

#### Acceptance Criteria

1. WHEN an unauthenticated user attempts to access any FRM route, THE FRM_Application SHALL redirect the user to the login page.
2. WHILE a user has the Technician role, THE FRM_Application SHALL allow access to the mobile routes and timecard route and restrict access to the technicians, jobs, crews, and scheduling management routes.
3. WHILE a user has the Dispatcher role, THE FRM_Application SHALL allow access to the technicians, jobs, crews, and scheduling management routes.
4. THE FRM_Application SHALL enforce the CreateJobGuard on the job creation route so that only Dispatcher and Admin roles can create jobs.
5. IF a user attempts to navigate to a route they lack permission for, THEN THE FRM_Application SHALL redirect the user to the dashboard and display an access-denied notification.

### Requirement 15: Error Handling and User Feedback

**User Story:** As a UAT_Tester, I want all API errors to produce clear, user-facing feedback, so that testers can distinguish between application bugs and expected error states.

#### Acceptance Criteria

1. WHEN any HTTP request returns a 400 status, THE FRM_Application SHALL display a message indicating invalid input.
2. WHEN any HTTP request returns a 401 status, THE FRM_Application SHALL redirect the user to the login page.
3. WHEN any HTTP request returns a 403 status, THE FRM_Application SHALL display an access-denied message.
4. WHEN any HTTP request returns a 404 status, THE FRM_Application SHALL display a resource-not-found message.
5. WHEN any HTTP request returns a 500 status, THE FRM_Application SHALL display a server error message with a suggestion to retry.
6. WHEN any HTTP request returns a 409 status on a scheduling operation, THE FRM_Application SHALL display a conflict-detected message with guidance to resolve the conflict.
