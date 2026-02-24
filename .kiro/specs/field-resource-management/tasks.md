# Implementation Plan: Field Resource Management Tool - Angular Frontend

## Overview

This implementation plan focuses exclusively on the Angular frontend for the Field Resource Management Tool. The backend API is assumed to already exist and be functional. This plan covers Angular components, NgRx state management, services for API integration, routing, mobile-responsive UI, PWA configuration, and testing.

The implementation follows a layered approach: module setup → state management → services → shared components → feature components → routing → integration → optimization → testing.

## Tasks

- [x] 1. Angular Frontend Setup and Module Structure
  - [x] 1.1 Create field-resource-management feature module
    - Generate feature module: `ng generate module features/field-resource-management`
    - Set up module imports (CommonModule, FormsModule, ReactiveFormsModule, Angular Material modules)
    - Configure routing module with lazy loading
    - Create folder structure: components/, state/, services/, models/, guards/
    - _Requirements: 15.1-15.5_

  - [x] 1.2 Set up Angular Material theme and styles
    - Configure custom Material theme with ATLAS branding colors
    - Create responsive layout styles with mobile-first approach
    - Add CSS breakpoints for mobile (320px-767px), tablet (768px-1023px), desktop (1024px+)
    - Create utility classes for spacing, typography, and common patterns
    - Add styles file: `_field-resource-management.scss`
    - _Requirements: 15.1-15.5_

  - [x] 1.3 Configure Progressive Web App (PWA) support
    - Add @angular/pwa package: `ng add @angular/pwa`
    - Configure service worker for offline caching
    - Define caching strategies: cache-first for static assets, network-first for API calls
    - Add app manifest with icons and theme colors
    - Configure offline fallback page
    - _Requirements: 15.1-15.5_


- [x] 2. TypeScript Models and Interfaces
  - [x] 2.1 Create core data models
    - Create `models/technician.model.ts` with Technician, Skill, Certification, Availability interfaces
    - Create `models/job.model.ts` with Job, Address, ContactInfo, Attachment, JobNote interfaces
    - Create `models/assignment.model.ts` with Assignment, TechnicianMatch, Conflict interfaces
    - Create `models/time-entry.model.ts` with TimeEntry, GeoLocation interfaces
    - Create `models/reporting.model.ts` with DashboardMetrics, UtilizationReport, PerformanceReport, KPI interfaces
    - Add enums: TechnicianRole, EmploymentType, JobType, Priority, JobStatus, CertificationStatus, ConflictSeverity
    - _Requirements: 2.1-2.7, 3.1-3.8, 7.1-7.7, 10.1-10.6, 11.1-11.6_

  - [x] 2.2 Create DTO models for API requests
    - Create `models/dtos/technician.dto.ts` with CreateTechnicianDto, UpdateTechnicianDto
    - Create `models/dtos/job.dto.ts` with CreateJobDto, UpdateJobDto
    - Create `models/dtos/assignment.dto.ts` with AssignmentDto, BulkAssignmentDto
    - Create `models/dtos/time-entry.dto.ts` with ClockInDto, ClockOutDto, UpdateTimeEntryDto
    - Create `models/dtos/filters.dto.ts` with TechnicianFilters, JobFilters, AssignmentFilters, TimeEntryFilters
    - _Requirements: 2.1-2.7, 3.1-3.8, 16.1-16.6_

- [x] 3. NgRx State Management Setup
  - [x] 3.1 Create technician state management
    - Create `state/technicians/technician.state.ts` with TechnicianState interface
    - Create `state/technicians/technician.actions.ts` with actions: loadTechnicians, loadTechniciansSuccess, loadTechniciansFailure, createTechnician, updateTechnician, deleteTechnician, selectTechnician
    - Create `state/technicians/technician.reducer.ts` using EntityAdapter for normalized state
    - Create `state/technicians/technician.selectors.ts` with selectors: selectAll, selectById, selectFiltered, selectLoading, selectError
    - Create `state/technicians/technician.effects.ts` for API call side effects
    - _Requirements: 2.1-2.7, 16.2, 16.4_


  - [x] 3.2 Create job state management
    - Create `state/jobs/job.state.ts` with JobState interface
    - Create `state/jobs/job.actions.ts` with actions: loadJobs, loadJobsSuccess, loadJobsFailure, createJob, updateJob, deleteJob, updateJobStatus, selectJob, addJobNote, uploadAttachment
    - Create `state/jobs/job.reducer.ts` using EntityAdapter
    - Create `state/jobs/job.selectors.ts` with selectors: selectAll, selectById, selectFiltered, selectByTechnician, selectByStatus
    - Create `state/jobs/job.effects.ts` for API call side effects
    - _Requirements: 3.1-3.8, 6.1-6.6, 16.1, 16.3_

  - [x] 3.3 Create assignment state management
    - Create `state/assignments/assignment.state.ts` with AssignmentState interface
    - Create `state/assignments/assignment.actions.ts` with actions: assignTechnician, unassignTechnician, reassignJob, loadConflicts, checkConflicts, loadQualifiedTechnicians
    - Create `state/assignments/assignment.reducer.ts`
    - Create `state/assignments/assignment.selectors.ts` with selectors: selectByJob, selectByTechnician, selectConflicts, selectQualifiedTechnicians
    - Create `state/assignments/assignment.effects.ts` for API call side effects
    - _Requirements: 4.1-4.9, 18.1-18.5, 19.1-19.5_

  - [x] 3.4 Create time entry state management
    - Create `state/time-entries/time-entry.state.ts` with TimeEntryState interface
    - Create `state/time-entries/time-entry.actions.ts` with actions: clockIn, clockOut, loadTimeEntries, updateTimeEntry, loadActiveEntry
    - Create `state/time-entries/time-entry.reducer.ts`
    - Create `state/time-entries/time-entry.selectors.ts` with selectors: selectByJob, selectByTechnician, selectActive, selectTotalHours
    - Create `state/time-entries/time-entry.effects.ts` for API call side effects
    - _Requirements: 7.1-7.7, 8.1-8.6_


  - [x] 3.5 Create notification state management
    - Create `state/notifications/notification.state.ts` with NotificationState interface
    - Create `state/notifications/notification.actions.ts` with actions: loadNotifications, markAsRead, markAllAsRead, addNotification
    - Create `state/notifications/notification.reducer.ts`
    - Create `state/notifications/notification.selectors.ts` with selectors: selectAll, selectUnread, selectUnreadCount
    - Create `state/notifications/notification.effects.ts` for API call side effects
    - _Requirements: 12.1-12.6_

  - [x] 3.6 Create UI state management
    - Create `state/ui/ui.state.ts` with UIState interface (calendarView, selectedDate, sidebarOpen, mobileMenuOpen)
    - Create `state/ui/ui.actions.ts` with actions: setCalendarView, setSelectedDate, toggleSidebar, toggleMobileMenu
    - Create `state/ui/ui.reducer.ts`
    - Create `state/ui/ui.selectors.ts` with selectors for UI preferences
    - _Requirements: 4.1-4.2_

  - [x] 3.7 Create reporting state management
    - Create `state/reporting/reporting.state.ts` with ReportingState interface
    - Create `state/reporting/reporting.actions.ts` with actions: loadDashboard, loadUtilization, loadJobPerformance, loadKPIs
    - Create `state/reporting/reporting.reducer.ts`
    - Create `state/reporting/reporting.selectors.ts` with selectors for dashboard and reports
    - Create `state/reporting/reporting.effects.ts` for API call side effects
    - _Requirements: 10.1-10.6, 11.1-11.6, 22.1-22.7_

  - [x] 3.8 Register all state modules in feature module
    - Import StoreModule.forFeature for each state slice
    - Import EffectsModule.forFeature for each effects class
    - Configure state in field-resource-management.module.ts
    - _Requirements: All state management requirements_


- [x] 4. Angular Services Layer
  - [x] 4.1 Create TechnicianService
    - Create `services/technician.service.ts`
    - Implement HTTP methods: getTechnicians(), getTechnicianById(), createTechnician(), updateTechnician(), deleteTechnician()
    - Implement skill methods: getTechnicianSkills(), addTechnicianSkill(), removeTechnicianSkill()
    - Implement certification methods: getTechnicianCertifications(), getExpiringCertifications()
    - Implement availability methods: getTechnicianAvailability(), updateTechnicianAvailability()
    - Add error handling with catchError and retry logic
    - Add TypeScript type safety for all requests/responses
    - _Requirements: 2.1-2.7, 26.1-26.6_

  - [x] 4.2 Create JobService
    - Create `services/job.service.ts`
    - Implement HTTP methods: getJobs(), getJobById(), createJob(), updateJob(), deleteJob(), deleteJobs()
    - Implement status methods: updateJobStatus(), getJobStatusHistory()
    - Implement note methods: addJobNote(), getJobNotes()
    - Implement attachment methods: uploadJobAttachment(), getJobAttachments()
    - Implement template methods: createJobFromTemplate()
    - Add file upload handling with progress tracking
    - Add error handling and retry logic
    - _Requirements: 3.1-3.8, 6.1-6.6, 9.1-9.7, 21.1-21.6, 25.1-25.6, 27.1-27.6_

  - [x] 4.3 Create SchedulingService
    - Create `services/scheduling.service.ts`
    - Implement assignment methods: assignTechnician(), unassignTechnician(), reassignJob(), getAssignments()
    - Implement conflict methods: checkConflicts(), detectAllConflicts()
    - Implement matching methods: getQualifiedTechnicians()
    - Implement schedule methods: getTechnicianSchedule()
    - Implement batch methods: bulkAssign()
    - Add error handling
    - _Requirements: 4.1-4.9, 18.1-18.5, 19.1-19.5, 20.1-20.5, 21.1-21.6_


  - [x] 4.4 Create TimeTrackingService
    - Create `services/time-tracking.service.ts`
    - Implement clock methods: clockIn(), clockOut()
    - Implement geolocation capture with browser Geolocation API
    - Implement time entry methods: getTimeEntries(), updateTimeEntry(), getActiveTimeEntry()
    - Implement query methods: getTimeEntriesByJob(), getTimeEntriesByTechnician()
    - Implement calculation methods: calculateLaborHours()
    - Add error handling for location permission errors
    - _Requirements: 7.1-7.7, 8.1-8.6_

  - [x] 4.5 Create ReportingService
    - Create `services/reporting.service.ts`
    - Implement dashboard methods: getDashboardMetrics()
    - Implement report methods: getTechnicianUtilization(), getJobPerformance(), getKPIs()
    - Implement export methods: exportReport() with format parameter (CSV, PDF)
    - Implement schedule adherence methods: getScheduleAdherence()
    - Add error handling
    - _Requirements: 10.1-10.6, 11.1-11.6, 22.1-22.7, 23.1-23.6, 29.1-29.7_

  - [x] 4.6 Create FrmSignalRService
    - Create `services/frm-signalr.service.ts`
    - Implement SignalR connection management: connect(), disconnect()
    - Implement event subscription methods: onJobAssigned(), onJobStatusChanged(), onJobReassigned(), onNotification()
    - Implement technician-specific subscriptions: subscribeToTechnicianUpdates(), unsubscribeFromTechnicianUpdates()
    - Add automatic reconnection logic with exponential backoff
    - Integrate with NgRx store to dispatch actions on SignalR events
    - Add connection status monitoring (connected, disconnected, reconnecting)
    - _Requirements: 12.1-12.6_


  - [x] 4.7 Create NotificationService
    - Create `services/notification.service.ts`
    - Implement HTTP methods: getNotifications(), markAsRead(), markAllAsRead(), getUnreadCount()
    - Implement preference methods: updateNotificationPreferences()
    - Add error handling
    - _Requirements: 12.1-12.6_

  - [x] 4.8 Create GeolocationService
    - Create `services/geolocation.service.ts`
    - Implement getCurrentPosition() using browser Geolocation API
    - Add permission request handling
    - Add error handling for denied permissions, timeout, unavailable
    - Add fallback for manual location entry
    - _Requirements: 8.1-8.6_

  - [x] 4.9 Create ExportService
    - Create `services/export.service.ts`
    - Implement CSV export: generateCSV() with data and headers
    - Implement PDF export: generatePDF() using library (e.g., jsPDF)
    - Implement file download: downloadFile()
    - Add formatting utilities for dates, numbers
    - _Requirements: 23.1-23.6_

- [x] 5. Shared Components
  - [x] 5.1 Create SkillSelectorComponent
    - Create `components/shared/skill-selector/skill-selector.component.ts`
    - Implement multi-select dropdown using Angular Material mat-select with multiple
    - Add autocomplete functionality with mat-autocomplete
    - Display selected skills as chips using mat-chip-list
    - Add/remove skill actions
    - Support form control integration (ControlValueAccessor)
    - _Requirements: 2.2, 3.3, 19.1-19.5_


  - [x] 5.2 Create StatusBadgeComponent
    - Create `components/shared/status-badge/status-badge.component.ts`
    - Display job status with color coding: NotStarted (gray), EnRoute (blue), OnSite (orange), Completed (green), Issue (red), Cancelled (gray)
    - Add icon indicators using Material icons
    - Support different sizes: small, medium, large
    - Make responsive for mobile
    - _Requirements: 6.1-6.6_

  - [x] 5.3 Create FileUploadComponent
    - Create `components/shared/file-upload/file-upload.component.ts`
    - Implement drag-and-drop file upload area
    - Add file type validation (JPEG, PNG, HEIC)
    - Add file size validation (10 MB limit)
    - Display upload progress indicator using mat-progress-bar
    - Show image preview for uploaded images
    - Display error messages for validation failures
    - Support multiple file uploads
    - _Requirements: 3.7, 9.3-9.7_

  - [x] 5.4 Create DateRangePickerComponent
    - Create `components/shared/date-range-picker/date-range-picker.component.ts`
    - Integrate Material date range picker (mat-date-range-picker)
    - Add preset ranges: Today, This Week, This Month, Last 30 Days
    - Support custom range selection
    - Add validation for valid date ranges (start <= end)
    - Support form control integration
    - _Requirements: 10.2, 11.5_

  - [x] 5.5 Create ConfirmDialogComponent
    - Create `components/shared/confirm-dialog/confirm-dialog.component.ts`
    - Reusable confirmation dialog using mat-dialog
    - Customizable title, message, and action buttons
    - Support variants: info, warning, danger
    - Add keyboard navigation support (Enter to confirm, Escape to cancel)
    - _Requirements: 21.6_


  - [x] 5.6 Create LoadingSpinnerComponent
    - Create `components/shared/loading-spinner/loading-spinner.component.ts`
    - Display Material spinner (mat-spinner)
    - Support different sizes and colors
    - Add optional loading message
    - _Requirements: All loading states_

  - [x] 5.7 Create EmptyStateComponent
    - Create `components/shared/empty-state/empty-state.component.ts`
    - Display when lists are empty
    - Show icon, message, and optional action button
    - Customizable content via inputs
    - _Requirements: All list views_

- [x] 6. Checkpoint - Foundation Complete
  - Verify module structure is set up correctly
  - Verify all state slices are registered
  - Verify all services are created and injectable
  - Verify shared components render correctly
  - Run `ng build` to check for compilation errors
  - Ask the user if questions arise

- [x] 7. Technician Management Components
  - [x] 7.1 Create TechnicianListComponent
    - Create `components/technicians/technician-list/technician-list.component.ts`
    - Display paginated technician list using mat-table
    - Implement search input with debounce (300ms) for name and ID
    - Add filter panel: role dropdown, skills multi-select, availability toggle
    - Show columns: name, role, skills (chips), current status, actions
    - Add action buttons: view (eye icon), edit (pencil icon), deactivate (toggle)
    - Integrate with technician state (dispatch loadTechnicians, subscribe to selectAll)
    - Add pagination using mat-paginator (50 items per page)
    - _Requirements: 2.1-2.7, 16.2, 16.4_


  - [x] 7.2 Create TechnicianDetailComponent
    - Create `components/technicians/technician-detail/technician-detail.component.ts`
    - Display comprehensive technician profile using mat-card
    - Show basic info: name, role, employment type, home base, region
    - Display skills as mat-chips with categories
    - Display certifications table with expiration status badges (Active, Expiring Soon, Expired)
    - Show availability calendar using mat-calendar with marked unavailable dates
    - Display assignment history table with recent jobs
    - Show performance metrics: utilization rate, jobs completed
    - Add action buttons: edit (admin only), delete (admin only)
    - Integrate with technician state (subscribe to selectById)
    - _Requirements: 2.1-2.7, 26.5_

  - [x] 7.3 Create TechnicianFormComponent
    - Create `components/technicians/technician-form/technician-form.component.ts`
    - Implement multi-step form using mat-stepper: Basic Info, Skills, Certifications, Availability
    - Step 1 - Basic Info: name, email, phone, role, employment type, home base, region fields
    - Step 2 - Skills: integrate SkillSelectorComponent
    - Step 3 - Certifications: dynamic form array with name, issue date, expiration date
    - Step 4 - Availability: calendar with date selection for unavailable dates
    - Implement reactive forms with FormBuilder
    - Add validators: required fields, email format, phone format
    - Display validation errors inline
    - Add save and cancel buttons
    - Support create and edit modes (check route params)
    - Dispatch createTechnician or updateTechnician actions on submit
    - Navigate back to list on success
    - _Requirements: 2.1-2.7_


- [x] 8. Job Management Components
  - [x] 8.1 Create JobListComponent
    - Create `components/jobs/job-list/job-list.component.ts`
    - Display paginated job list using mat-table
    - Implement search input with debounce for job ID, client, site name
    - Add filter panel: status dropdown, priority dropdown, job type dropdown, date range picker
    - Show columns: job ID, client, site name, status badge, priority, scheduled date, assigned technicians, actions
    - Support batch selection with checkboxes (mat-checkbox in first column)
    - Add "Select All" checkbox in header
    - Display selected count and batch action toolbar when items selected
    - Add action buttons: view, edit, assign, delete
    - Integrate with job state (dispatch loadJobs, subscribe to selectAll)
    - Add pagination using mat-paginator (50 items per page)
    - _Requirements: 3.1-3.8, 16.1, 16.3, 21.1-21.2_

  - [x] 8.2 Create JobDetailComponent
    - Create `components/jobs/job-detail/job-detail.component.ts`
    - Display complete job information using mat-card sections
    - Section 1 - Job Info: job ID, client, site name, address, job type, priority, status
    - Section 2 - Scope: description, required skills (chips), crew size, estimated hours
    - Section 3 - Schedule: scheduled start/end dates, actual start/end dates
    - Section 4 - Assigned Technicians: list with contact info, quick call/email actions
    - Section 5 - Time Entries: table with clock in/out times, total hours, mileage
    - Section 6 - Status History: timeline component showing status changes with timestamps
    - Section 7 - Attachments: list with download links, preview for images
    - Section 8 - Notes: chronological list with author, timestamp, edit option (within 1 hour)
    - Section 9 - Customer POC: name, phone, email with quick actions
    - Add action buttons: edit, reassign, add note, upload attachment
    - Integrate with job state (subscribe to selectById)
    - _Requirements: 3.1-3.8, 7.7, 9.1-9.7, 24.1-24.6, 25.1-25.6_


  - [x] 8.3 Create JobFormComponent
    - Create `components/jobs/job-form/job-form.component.ts`
    - Implement reactive form with FormBuilder
    - Add fields: client, site name, site address (street, city, state, zip), job type, priority
    - Add scope description textarea
    - Integrate SkillSelectorComponent for required skills
    - Add crew size number input
    - Add estimated labor hours number input
    - Add scheduled start/end date pickers
    - Add customer POC fields: name, phone, email
    - Integrate FileUploadComponent for attachments
    - Add validators: required fields, email format, phone format, date range validation
    - Display validation errors inline
    - Add save and cancel buttons
    - Support create and edit modes
    - Support template-based creation (pre-populate from template)
    - Dispatch createJob or updateJob actions on submit
    - Navigate to job detail on success
    - _Requirements: 3.1-3.8, 27.4-27.5_

  - [x] 8.4 Create JobNotesComponent
    - Create `components/jobs/job-notes/job-notes.component.ts`
    - Display notes in chronological order (newest first)
    - Show author, timestamp, note text for each note
    - Add "Add Note" button that opens textarea
    - Implement note submission
    - Allow editing within 1 hour of creation (show edit button conditionally)
    - Integrate with job state (dispatch addJobNote)
    - _Requirements: 25.1-25.6_

  - [x] 8.5 Create JobStatusTimelineComponent
    - Create `components/jobs/job-status-timeline/job-status-timeline.component.ts`
    - Display status changes as vertical timeline
    - Show status, timestamp, user who made change
    - Use color coding for different statuses
    - Add icons for each status
    - _Requirements: 6.6_


- [x] 9. Scheduling Components
  - [x] 9.1 Create CalendarViewComponent
    - Create `components/scheduling/calendar-view/calendar-view.component.ts`
    - Implement view toggle: day view and week view (mat-button-toggle-group)
    - Display technician schedules in grid format (rows = technicians, columns = time slots)
    - Use color-coded job status indicators: NotStarted (gray), EnRoute (blue), OnSite (orange), Completed (green), Issue (red)
    - Implement drag-and-drop job assignment using Angular CDK drag-drop
    - Highlight scheduling conflicts in red
    - Add click handlers to open job detail dialog
    - Add right-click context menu for quick actions: view, edit, reassign, delete
    - Integrate with assignment state and UI state
    - Add date navigation: previous/next buttons, today button
    - _Requirements: 4.1-4.9_

  - [x] 9.2 Create AssignmentDialogComponent
    - Create `components/scheduling/assignment-dialog/assignment-dialog.component.ts`
    - Modal dialog using mat-dialog
    - Display job details at top: job ID, client, site, required skills
    - List qualified technicians with skill match percentage
    - Show technician availability status (available, partially available, unavailable)
    - Display current workload (number of assigned jobs)
    - Highlight conflicts with warning icon and message
    - Show skill mismatch warnings with missing skills listed
    - Add override checkbox with justification textarea (required if conflicts exist)
    - Add assign button (disabled if no technician selected)
    - Dispatch assignTechnician action on confirm
    - Close dialog on success
    - _Requirements: 4.4-4.5, 18.4-18.5, 19.1-19.5_


  - [x] 9.3 Create ConflictResolverComponent
    - Create `components/scheduling/conflict-resolver/conflict-resolver.component.ts`
    - Display list of all scheduling conflicts using mat-table
    - Show columns: technician, conflicting jobs, time range, severity
    - Add resolution options for each conflict: reassign, reschedule, override
    - Implement reassign action: open technician selector dialog
    - Implement reschedule action: open date picker dialog
    - Implement override action: require justification textarea
    - Support batch conflict resolution with checkboxes
    - Integrate with assignment state (subscribe to selectConflicts)
    - Dispatch appropriate actions based on resolution choice
    - _Requirements: 18.1-18.5_

  - [x] 9.4 Create TechnicianScheduleComponent
    - Create `components/scheduling/technician-schedule/technician-schedule.component.ts`
    - Display individual technician's schedule
    - Show jobs in chronological order
    - Display job cards with key info: job ID, client, site, time
    - Add status indicators
    - Show total hours for selected date range
    - Add date range selector
    - _Requirements: 4.1-4.9_

- [x] 10. Mobile Components for Field Technicians
  - [x] 10.1 Create DailyViewComponent
    - Create `components/mobile/daily-view/daily-view.component.ts`
    - Mobile-optimized layout with large touch targets
    - Display today's date prominently
    - Show job count summary at top
    - Display jobs as cards in chronological order
    - Implement swipe gestures for status updates (swipe right = next status)
    - Add pull-to-refresh functionality
    - Implement offline data caching using service worker
    - Show sync status indicator
    - Add floating action button for quick actions
    - Integrate with job state (filter by current user and today's date)
    - _Requirements: 5.1-5.6, 15.1-15.5_


  - [x] 10.2 Create JobCardComponent
    - Create `components/mobile/job-card/job-card.component.ts`
    - Compact card layout optimized for mobile
    - Display job ID, client, site name, address
    - Show current status with StatusBadgeComponent
    - Add status update buttons: En Route, On Site, Completed, Issue (large touch targets)
    - Add clock in/out buttons with prominent styling
    - Show elapsed time if clocked in
    - Add navigation button to full job details
    - Add customer contact quick actions: call button (tel: link), email button (mailto: link)
    - Add photo upload shortcut button
    - Integrate with job state and time entry state
    - Dispatch updateJobStatus and clockIn/clockOut actions
    - _Requirements: 5.1-5.6, 6.1-6.6, 24.4-24.6_

  - [x] 10.3 Create TimeTrackerComponent
    - Create `components/mobile/time-tracker/time-tracker.component.ts`
    - Display active job information
    - Show timer with elapsed time (update every second)
    - Display large clock in/out button
    - Capture geolocation automatically on clock in/out using GeolocationService
    - Display calculated mileage
    - Show location capture status (success, pending, failed)
    - Handle location permission errors with user-friendly messages
    - Add manual time adjustment option (admin override only)
    - Add manual mileage entry option (if location unavailable)
    - Integrate with time entry state
    - Dispatch clockIn and clockOut actions
    - _Requirements: 7.1-7.7, 8.1-8.6_

  - [x] 10.4 Create JobCompletionFormComponent
    - Create `components/mobile/job-completion-form/job-completion-form.component.ts`
    - Display when technician marks job as Completed
    - Add completion notes textarea
    - Integrate FileUploadComponent for photos
    - Add delay reason dropdown (if job not completed)
    - Add submit button
    - Dispatch updateJobStatus and uploadAttachment actions
    - _Requirements: 9.1-9.7_


- [x] 11. Reporting Components
  - [x] 11.1 Create DashboardComponent
    - Create `components/reporting/dashboard/dashboard.component.ts`
    - Display KPI summary cards in grid layout: total active jobs, available technicians, average utilization
    - Show jobs by status chart using chart library (e.g., Chart.js, ngx-charts): bar chart or pie chart
    - Display technician utilization gauge chart
    - Show recent activity feed: list of recent job assignments, status changes, completions
    - Add alerts and notifications panel: jobs requiring attention (overdue, issues, conflicts)
    - Implement auto-refresh every 5 minutes using interval
    - Add manual refresh button
    - Provide quick links to detailed reports
    - Integrate with reporting state (dispatch loadDashboard, subscribe to dashboard metrics)
    - _Requirements: 22.1-22.7, 29.1-29.7_

  - [x] 11.2 Create UtilizationReportComponent
    - Create `components/reporting/utilization-report/utilization-report.component.ts`
    - Display technician utilization table using mat-table
    - Show columns: technician name, available hours, worked hours, utilization rate, jobs completed
    - Add utilization charts: bar chart (utilization by technician), trend line (utilization over time)
    - Implement date range selector using DateRangePickerComponent
    - Add filters: technician dropdown, role dropdown, region dropdown
    - Show average utilization across all technicians
    - Add export buttons: CSV and PDF
    - Implement drill-down: click technician row to view detailed breakdown
    - Integrate with reporting state (dispatch loadUtilization)
    - _Requirements: 10.1-10.6, 23.1-23.6_


  - [x] 11.3 Create JobPerformanceReportComponent
    - Create `components/reporting/job-performance-report/job-performance-report.component.ts`
    - Display jobs completed metrics: total completed, total open, completion rate
    - Show planned vs actual hours comparison chart: grouped bar chart
    - Display schedule adherence percentage with gauge chart
    - Add filters: job type dropdown, priority dropdown, client dropdown, date range picker
    - Show top performers list: table with technician name, jobs completed, average hours
    - Add export buttons: CSV and PDF
    - Display graphical trend analysis: line chart showing completions over time
    - Integrate with reporting state (dispatch loadJobPerformance)
    - _Requirements: 11.1-11.6, 23.1-23.6_

  - [x] 11.4 Create KPICardComponent
    - Create `components/reporting/kpi-card/kpi-card.component.ts`
    - Display single KPI metric in card format
    - Show KPI name, current value, target value, unit
    - Display trend indicator: up arrow (green), down arrow (red), stable (gray)
    - Show status: on track (green), at risk (yellow), below target (red)
    - Add optional sparkline chart for trend visualization
    - _Requirements: 29.1-29.7_

- [x] 12. Additional Feature Components
  - [x] 12.1 Create NotificationPanelComponent
    - Create `components/notifications/notification-panel/notification-panel.component.ts`
    - Display notification list in dropdown panel (mat-menu)
    - Show unread count badge on notification icon
    - Display notifications with icon, message, timestamp
    - Mark notifications as read on click
    - Add "Mark all as read" action button
    - Group notifications by date (Today, Yesterday, Earlier)
    - Add link to notification preferences
    - Integrate with notification state (subscribe to selectAll, selectUnreadCount)
    - Dispatch markAsRead and markAllAsRead actions
    - _Requirements: 12.1-12.6_


  - [x] 12.2 Create JobTemplateManagerComponent
    - Create `components/admin/job-template-manager/job-template-manager.component.ts`
    - List job templates using mat-table
    - Show columns: template name, job type, required skills, estimated hours, crew size, actions
    - Add create template button (opens dialog)
    - Add edit and delete actions for each template
    - Implement template preview dialog
    - Add "Create Job from Template" action
    - Restrict access to admin role using route guard
    - Integrate with job state
    - _Requirements: 27.1-27.6_

  - [x] 12.3 Create RegionManagerComponent
    - Create `components/admin/region-manager/region-manager.component.ts`
    - List geographic regions using mat-table
    - Show columns: region name, technician count, job count, actions
    - Add create region button (opens dialog)
    - Add edit and delete actions for each region
    - Display region boundaries (optional: integrate map view using Leaflet or Google Maps)
    - Show technicians and jobs per region
    - Restrict access to admin role using route guard
    - _Requirements: 28.1-28.6_

  - [x] 12.4 Create AuditLogViewerComponent
    - Create `components/admin/audit-log-viewer/audit-log-viewer.component.ts`
    - Display audit log entries using mat-table
    - Show columns: timestamp, user, action type, entity, details
    - Add filters: date range picker, user dropdown, action type dropdown
    - Implement pagination (50 items per page)
    - Show detailed action information in expandable row
    - Add export to CSV button
    - Restrict access to admin role using route guard
    - _Requirements: 17.1-17.7_


  - [x] 12.5 Create SystemConfigurationComponent
    - Create `components/admin/system-configuration/system-configuration.component.ts`
    - Display configuration settings in form using mat-form-field
    - Group settings by category: Session, Notifications, Backup, KPIs, Job Status
    - Show current and default values for each setting
    - Add validators for configuration changes
    - Add save button (validates and submits)
    - Add reset to defaults button
    - Restrict access to admin role using route guard
    - _Requirements: 30.1-30.7_

  - [x] 12.6 Create BatchOperationsToolbarComponent
    - Create `components/shared/batch-operations-toolbar/batch-operations-toolbar.component.ts`
    - Display when items are selected in job list
    - Show selected count
    - Add batch action buttons: update status, reassign, delete
    - Add clear selection button
    - Implement confirmation dialogs for destructive actions
    - Dispatch batch actions
    - _Requirements: 21.1-21.6_

- [x] 13. Checkpoint - Components Complete
  - Verify all components render correctly
  - Test responsive design on mobile (320px), tablet (768px), desktop (1024px+)
  - Verify state management integration (actions dispatched, selectors subscribed)
  - Test navigation between components
  - Run `ng build` to check for compilation errors
  - Ask the user if questions arise

- [x] 14. Routing and Navigation
  - [x] 14.1 Configure feature routing module
    - Create `field-resource-management-routing.module.ts`
    - Define routes for all components with path and component mapping
    - Add route guards for role-based access (AdminGuard, DispatcherGuard, TechnicianGuard)
    - Implement lazy loading for feature module in app-routing.module.ts
    - Add route parameters for detail views (:id)
    - Configure default redirects (empty path → dashboard)
    - _Requirements: 1.3-1.4_


  - [x] 14.2 Create route guards
    - Create `guards/admin.guard.ts` - check if user has Admin role
    - Create `guards/dispatcher.guard.ts` - check if user has Dispatcher or Admin role
    - Create `guards/technician.guard.ts` - check if user has Technician role
    - Implement CanActivate interface
    - Redirect to unauthorized page if access denied
    - _Requirements: 1.3-1.4_

  - [x] 14.3 Create navigation menu integration
    - Add field resource management menu items to ATLAS main navigation
    - Organize menu by role: Admin (all items), Dispatcher (scheduling, jobs, technicians, reports), Technician (daily view, my schedule)
    - Add Material icons for each menu item
    - Highlight active route using routerLinkActive
    - Add mobile menu toggle for responsive navigation
    - _Requirements: 1.3-1.4_

  - [x] 14.4 Create breadcrumb navigation
    - Create `components/shared/breadcrumb/breadcrumb.component.ts`
    - Display breadcrumb trail based on current route
    - Make breadcrumb items clickable for navigation
    - Update breadcrumb on route changes
    - _Requirements: Navigation usability_

- [x] 15. Integration and Real-Time Features
  - [x] 15.1 Integrate SignalR real-time updates
    - Connect SignalR service on app initialization (in app.component.ts or feature module)
    - Subscribe to job assignment notifications in assignment effects
    - Subscribe to job status change notifications in job effects
    - Subscribe to job reassignment notifications in assignment effects
    - Update NgRx store on SignalR events (dispatch actions)
    - Display toast notifications for real-time updates using MatSnackBar
    - Handle reconnection on connection loss with retry logic
    - _Requirements: 12.1-12.6_


  - [x] 15.2 Implement notification system integration
    - Display in-app notifications in header using NotificationPanelComponent
    - Show unread count badge on notification bell icon
    - Play notification sound on new notification (optional, with user preference)
    - Link notifications to relevant views (click notification → navigate to job/technician)
    - Mark notifications as read on view
    - Integrate with notification state
    - _Requirements: 12.1-12.6_

  - [x] 15.3 Implement offline support with service worker
    - Configure service worker caching strategies in ngsw-config.json
    - Cache critical API responses (dashboard, today's jobs for technicians)
    - Queue actions when offline (store in IndexedDB)
    - Sync queued actions when online (background sync)
    - Display offline indicator in header (mat-toolbar with offline icon)
    - Handle offline errors gracefully with user-friendly messages
    - Test offline functionality in Chrome DevTools
    - _Requirements: 15.1-15.5_

- [x] 16. Search, Filter, and Export Features
  - [x] 16.1 Implement advanced search functionality
    - Add search components to list views (technician list, job list)
    - Implement debounced search input (300ms delay) using RxJS debounceTime
    - Search jobs by ID, client, site name, address
    - Search technicians by name, ID, skill tag
    - Display search results with highlighting (use innerHTML with sanitization)
    - Ensure results return within 2 seconds (optimize API calls)
    - _Requirements: 16.1-16.6_

  - [x] 16.2 Implement filter functionality
    - Add filter panels to list views using mat-expansion-panel
    - Filter jobs by status, priority, job type, date range
    - Filter technicians by role, skill tag, availability
    - Apply multiple filters simultaneously (combine filter criteria)
    - Show active filter chips using mat-chip-list
    - Add clear filters action button
    - Persist filters in URL query params for bookmarking
    - _Requirements: 16.3-16.4_


  - [x] 16.3 Implement data export functionality
    - Add export buttons to reports and lists (CSV and PDF options)
    - Export to CSV format for tabular data using ExportService
    - Export to PDF format for reports using jsPDF library
    - Include applied filters in export (add filter summary to export)
    - Generate exports within 10 seconds for datasets under 1000 records
    - Download file automatically using browser download API
    - Show progress indicator during export generation
    - _Requirements: 23.1-23.6_

- [x] 17. Batch Operations Implementation
  - [x] 17.1 Implement batch selection in job list
    - Add checkboxes to job list items (first column)
    - Add "Select All" checkbox in table header
    - Display selected count in BatchOperationsToolbarComponent
    - Show batch action toolbar when items selected (slide in from top)
    - Clear selection after batch operation completes
    - _Requirements: 21.1_

  - [x] 17.2 Implement batch operations
    - Batch status update: open status selector dialog, apply to all selected jobs
    - Batch reassignment: open technician selector dialog, assign all selected jobs to chosen technician
    - Batch deletion: open confirmation dialog, delete all selected jobs
    - Validate each operation individually (check permissions, conflicts)
    - Display success/failure results in snackbar with summary (e.g., "5 jobs updated, 2 failed")
    - Show progress indicator for long operations (mat-progress-bar)
    - Dispatch batch actions to state
    - _Requirements: 21.2-21.6_

- [x] 18. Performance Optimizations
  - [x] 18.1 Implement pagination for large lists
    - Add mat-paginator to list components (technician list, job list, audit log)
    - Limit page size to 50 items (configurable with page size selector: 25, 50, 100)
    - Implement server-side pagination (send page and pageSize params to API)
    - Preserve pagination state in URL query params
    - Reset to page 1 when filters change
    - _Requirements: 14.5_


  - [x] 18.2 Implement lazy loading and code splitting
    - Configure lazy loading for feature module in app-routing.module.ts
    - Split large components into separate chunks (use dynamic imports)
    - Preload critical routes using PreloadAllModules strategy
    - Optimize bundle size by analyzing with webpack-bundle-analyzer
    - Remove unused imports and dependencies
    - _Requirements: 14.3, 15.5_

  - [x] 18.3 Implement virtual scrolling for long lists
    - Use Angular CDK virtual scrolling (cdk-virtual-scroll-viewport) for lists with 100+ items
    - Configure item size for consistent rendering
    - Test performance with large datasets
    - _Requirements: 14.3_

  - [x] 18.4 Implement response caching in services
    - Add caching for dashboard metrics (5 minute TTL) using RxJS shareReplay
    - Cache technician and job lists (1 minute TTL)
    - Implement cache invalidation on updates (clear cache when data changes)
    - Use HTTP interceptor for cache headers
    - _Requirements: 14.3, 22.6_

  - [x] 18.5 Optimize change detection
    - Use OnPush change detection strategy for presentational components
    - Use trackBy functions in *ngFor loops
    - Avoid unnecessary subscriptions (use async pipe where possible)
    - Detach change detector for components with frequent updates
    - _Requirements: 14.3_

- [x] 19. Error Handling and Validation
  - [x] 19.1 Implement global error handler
    - Create `services/global-error-handler.service.ts` extending ErrorHandler
    - Log errors to console in development
    - Log errors to Application Insights in production (if available)
    - Display user-friendly error messages using MatSnackBar
    - Handle HTTP errors with appropriate messages (401 → "Unauthorized", 404 → "Not Found", 500 → "Server Error")
    - Add retry logic for transient failures (use RxJS retry operator)
    - _Requirements: 1.4_


  - [x] 19.2 Implement form validation
    - Add validators to all reactive forms (Validators.required, Validators.email, Validators.pattern)
    - Display validation errors inline using mat-error
    - Prevent form submission with invalid data (disable submit button)
    - Validate email format using Validators.email
    - Validate phone number format using custom validator or Validators.pattern
    - Validate date ranges (start date <= end date)
    - Validate business rules (e.g., crew size > 0, estimated hours > 0)
    - _Requirements: 2.7, 3.8, 24.5_

  - [x] 19.3 Implement HTTP error interceptor
    - Create `interceptors/error.interceptor.ts` implementing HttpInterceptor
    - Intercept HTTP errors globally
    - Handle 401 errors: redirect to login
    - Handle 403 errors: show "Access Denied" message
    - Handle 404 errors: show "Resource Not Found" message
    - Handle 500 errors: show "Server Error" message
    - Add retry logic for network errors (use RxJS retry with delay)
    - _Requirements: 1.4_

- [x] 20. Security Enhancements
  - [x] 20.1 Implement input sanitization
    - Sanitize user inputs to prevent XSS using DomSanitizer
    - Escape HTML in user-generated content (notes, descriptions)
    - Validate file uploads for malicious content (check file types and sizes)
    - Use Angular's built-in sanitization for innerHTML bindings
    - _Requirements: 9.2, 25.2_

  - [x] 20.2 Implement secure file handling
    - Validate file types before upload (check MIME type and extension)
    - Validate file sizes before upload (10 MB limit)
    - Display file upload errors clearly
    - Use secure URLs for file downloads (SAS tokens from backend)
    - _Requirements: 3.7, 9.3-9.7_


  - [x] 20.3 Implement authentication token handling
    - Store JWT tokens securely (use HttpOnly cookies if possible, or sessionStorage)
    - Add authentication token to HTTP requests using HTTP interceptor
    - Handle token expiration: refresh token or redirect to login
    - Clear tokens on logout
    - _Requirements: 1.1-1.5_

- [ ] 21. Checkpoint - Integration Complete
  - Verify SignalR real-time updates work correctly
  - Test offline functionality (disconnect network, verify caching and sync)
  - Verify search and filter functionality
  - Test export functionality (CSV and PDF)
  - Test batch operations
  - Verify error handling displays appropriate messages
  - Run `ng build --prod` to check for production build errors
  - Ask the user if questions arise

- [ ] 22. Testing - Unit Tests
  - [ ]* 22.1 Write unit tests for Angular services
    - Test TechnicianService HTTP methods with HttpClientTestingModule
    - Test JobService HTTP methods and file upload
    - Test SchedulingService methods
    - Test TimeTrackingService methods and geolocation
    - Test ReportingService methods
    - Test FrmSignalRService connection and event handling
    - Mock HttpClient and verify API calls
    - Test error handling and retry logic
    - _Requirements: All service requirements_

  - [ ]* 22.2 Write unit tests for NgRx state
    - Test technician reducer with all actions
    - Test job reducer with all actions
    - Test assignment reducer with all actions
    - Test time entry reducer with all actions
    - Test notification reducer with all actions
    - Test all selectors return correct data
    - Test effects with mocked services (use provideMockActions)
    - Verify state immutability
    - _Requirements: All state management requirements_


  - [ ]* 22.3 Write unit tests for shared components
    - Test SkillSelectorComponent selection and removal
    - Test StatusBadgeComponent displays correct colors
    - Test FileUploadComponent validation and upload
    - Test DateRangePickerComponent date selection
    - Test ConfirmDialogComponent actions
    - Use ComponentFixture and TestBed
    - Mock dependencies and inputs
    - _Requirements: All shared component requirements_

  - [ ]* 22.4 Write unit tests for feature components
    - Test TechnicianListComponent displays data and handles actions
    - Test TechnicianDetailComponent displays profile correctly
    - Test TechnicianFormComponent validation and submission
    - Test JobListComponent displays data and batch selection
    - Test JobDetailComponent displays all sections
    - Test JobFormComponent validation and submission
    - Test CalendarViewComponent displays schedule
    - Test DailyViewComponent displays today's jobs
    - Test DashboardComponent displays metrics
    - Mock store selectors and dispatch
    - Test user interactions (click, input, form submission)
    - _Requirements: All component requirements_

- [ ] 23. Testing - Integration Tests
  - [ ]* 23.1 Write integration tests for complete workflows
    - Test dispatcher workflow: navigate to job list → create job → assign technician → verify assignment
    - Test technician workflow: navigate to daily view → clock in → update status → clock out
    - Test admin workflow: navigate to technician list → create technician → add skills → verify profile
    - Test reporting workflow: navigate to dashboard → view utilization report → export to CSV
    - Use TestBed for component integration
    - Test navigation between views
    - Test state persistence across navigation
    - _Requirements: All workflow requirements_


  - [ ]* 23.2 Write integration tests for real-time updates
    - Test SignalR connection establishment
    - Test job assignment notification updates state
    - Test job status change notification updates UI
    - Test notification panel displays new notifications
    - Mock SignalR hub for testing
    - _Requirements: 12.1-12.6_

- [ ] 24. Testing - End-to-End Tests
  - [ ]* 24.1 Write E2E tests for critical user journeys
    - Test dispatcher journey: login → create job → assign technician → monitor status → view completion
    - Test technician journey: login → view daily schedule → clock in → update status → add notes → clock out
    - Test admin journey: login → manage technicians → view reports → configure system
    - Use Cypress or Playwright for E2E testing
    - Test on multiple browsers (Chrome, Firefox, Safari)
    - Test on mobile viewports (375px, 768px)
    - Test offline functionality (service worker caching)
    - _Requirements: All requirements_

- [x] 25. Accessibility Compliance
  - [x] 25.1 Implement ARIA labels and roles
    - Add aria-label to interactive elements without visible text (icon buttons)
    - Define proper ARIA roles for custom components (role="navigation", role="main")
    - Add aria-live regions for dynamic content (notifications, status updates)
    - Add aria-describedby for form field errors
    - Test with screen readers (NVDA on Windows, VoiceOver on Mac)
    - _Requirements: 15.1-15.5_

  - [x] 25.2 Implement keyboard navigation
    - Ensure all interactive elements are keyboard accessible (tab navigation)
    - Add visible focus indicators (outline or border on focus)
    - Implement logical tab order (use tabindex if needed)
    - Add keyboard shortcuts for common actions (e.g., Ctrl+S to save, Escape to close dialogs)
    - Test keyboard-only navigation (no mouse)
    - _Requirements: 15.2_


  - [x] 25.3 Ensure color contrast compliance
    - Verify color contrast ratios meet WCAG AA standards (4.5:1 for normal text, 3:1 for large text)
    - Test with color contrast checker tools (e.g., WebAIM Contrast Checker)
    - Test with color blindness simulators
    - Provide alternative indicators beyond color (icons, patterns, text labels)
    - _Requirements: 15.1-15.5_

  - [x] 25.4 Add skip navigation links
    - Add "Skip to main content" link at top of page
    - Add "Skip to navigation" link
    - Make skip links visible on focus
    - _Requirements: 15.1-15.5_

- [ ] 26. Documentation
  - [ ] 26.1 Write component documentation
    - Add JSDoc comments to all components with @description, @input, @output
    - Document component purpose and usage
    - Document inputs and outputs with types
    - Document public methods
    - Generate documentation using Compodoc
    - _Requirements: All component requirements_

  - [ ] 26.2 Write service documentation
    - Add JSDoc comments to all services
    - Document service purpose and methods
    - Document method parameters and return types
    - Include usage examples
    - _Requirements: All service requirements_

  - [ ] 26.3 Write state management documentation
    - Document state structure and shape
    - Document actions and their payloads
    - Document selectors and their purpose
    - Document effects and side effects
    - Create state diagram showing data flow
    - _Requirements: All state management requirements_


  - [ ] 26.4 Write user guide
    - Create dispatcher user guide: how to create jobs, assign technicians, monitor progress
    - Create technician user guide: how to view schedule, clock in/out, update status, add notes
    - Create admin user guide: how to manage technicians, configure system, view reports
    - Include screenshots and step-by-step instructions
    - Create troubleshooting section
    - _Requirements: All requirements_

  - [ ] 26.5 Write developer guide
    - Document project structure and architecture
    - Document state management patterns
    - Document component communication patterns
    - Document API integration approach
    - Create setup and development guide
    - Document build and deployment process
    - _Requirements: All requirements_

- [ ] 27. Final Integration and Testing
  - [ ] 27.1 Perform end-to-end system testing
    - Test all user workflows in development environment
    - Verify real-time updates work correctly across multiple browser tabs
    - Test with realistic data volumes (100+ technicians, 1000+ jobs)
    - Verify performance meets requirements (<2 second response times)
    - Test mobile responsiveness on actual devices (iOS and Android)
    - Test PWA installation and offline functionality
    - _Requirements: All requirements_

  - [ ] 27.2 Perform cross-browser testing
    - Test on Chrome (latest version)
    - Test on Firefox (latest version)
    - Test on Safari (latest version)
    - Test on Edge (latest version)
    - Test on mobile browsers (Chrome Mobile, Safari Mobile)
    - Document and fix browser-specific issues
    - _Requirements: 15.4_


  - [ ] 27.3 Perform accessibility testing
    - Run automated accessibility tests using axe DevTools
    - Test with screen readers (NVDA, JAWS, VoiceOver)
    - Test keyboard-only navigation
    - Verify color contrast compliance
    - Test with browser zoom (up to 200%)
    - Document and fix accessibility issues
    - _Requirements: 15.1-15.5_

  - [ ] 27.4 Perform performance testing
    - Test page load times (target: <3 seconds on 4G)
    - Test API response times (target: <2 seconds)
    - Test with large datasets (1000+ jobs, 100+ technicians)
    - Identify and optimize performance bottlenecks
    - Run Lighthouse audits and address issues
    - _Requirements: 14.3, 15.5_

  - [ ] 27.5 Perform security testing
    - Test authentication and authorization (verify role-based access)
    - Test input validation (try XSS attacks, SQL injection)
    - Test file upload security (try malicious files)
    - Verify secure token handling
    - Run security scan using OWASP ZAP or similar tool
    - _Requirements: 1.1-1.5_

- [ ] 28. Production Build and Optimization
  - [ ] 28.1 Configure production build settings
    - Enable production mode in environment.prod.ts
    - Configure AOT compilation
    - Enable build optimizer
    - Configure source maps for debugging (separate files)
    - Set up environment-specific API URLs
    - _Requirements: All requirements_

  - [ ] 28.2 Optimize bundle size
    - Analyze bundle size with webpack-bundle-analyzer
    - Remove unused dependencies
    - Implement lazy loading for all feature modules
    - Use tree-shaking to remove unused code
    - Optimize images and assets
    - Target bundle size: <500 KB initial, <200 KB per lazy-loaded module
    - _Requirements: 14.3, 15.5_


  - [ ] 28.3 Configure service worker for production
    - Update ngsw-config.json with production caching strategies
    - Configure cache expiration policies
    - Test service worker updates (new version deployment)
    - Verify offline functionality in production build
    - _Requirements: 15.1-15.5_

  - [ ] 28.4 Build production bundle
    - Run `ng build --prod`
    - Verify no build errors or warnings
    - Test production build locally
    - Verify all features work in production mode
    - _Requirements: All requirements_

- [ ] 29. Deployment Preparation
  - [ ] 29.1 Create deployment documentation
    - Document deployment steps
    - Document environment configuration
    - Document required environment variables
    - Document API endpoint configuration
    - Create rollback procedure
    - _Requirements: All requirements_

  - [ ] 29.2 Configure CI/CD pipeline for frontend
    - Create build pipeline (GitHub Actions, Azure DevOps, or similar)
    - Add build step: `ng build --prod`
    - Add test step: `ng test --watch=false --code-coverage`
    - Add lint step: `ng lint`
    - Add deployment step to staging environment
    - Add approval gate for production deployment
    - _Requirements: All requirements_

  - [ ] 29.3 Set up monitoring and error tracking
    - Integrate Application Insights or similar monitoring tool
    - Configure error tracking for production
    - Set up performance monitoring
    - Configure custom events for key user actions
    - Set up alerts for critical errors
    - _Requirements: All requirements_


- [ ] 30. Final Checkpoint - Production Readiness
  - Verify all features are implemented and tested
  - Verify all unit tests pass with >80% code coverage
  - Verify all E2E tests pass
  - Verify accessibility compliance (WCAG AA)
  - Verify performance meets requirements (<2s response, <3s load)
  - Verify security testing complete
  - Verify documentation is complete
  - Verify production build is successful
  - Confirm deployment configuration is correct
  - Obtain stakeholder approval for production deployment
  - Ask the user if questions arise

## Notes

- Tasks marked with `*` are optional testing tasks that can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at major milestones
- The implementation follows a layered approach: setup → state → services → components → integration → optimization
- Mobile-first design ensures field technicians have optimal experience on smartphones
- Real-time updates via SignalR provide immediate visibility into operations
- Progressive Web App capabilities enable offline functionality for field use
- All components use Angular Material for consistent UI/UX
- NgRx provides centralized state management with predictable data flow
- The frontend assumes the backend API already exists and is functional

## Technology Stack Summary

**Frontend Framework:** Angular 15+
**State Management:** NgRx (Store, Effects, Entity)
**UI Components:** Angular Material
**Real-Time:** SignalR Client (@microsoft/signalr)
**Forms:** Reactive Forms
**HTTP:** HttpClient with Interceptors
**Routing:** Angular Router with Guards
**PWA:** @angular/pwa with Service Worker
**Charts:** Chart.js or ngx-charts
**Testing:** Jasmine, Karma, Cypress/Playwright
**Build:** Angular CLI

