# Implementation Plan: Field Resources UAT Readiness

## Overview

The FRM Angular module's core components, services, NgRx state, guards, and error handling are already implemented. This plan focuses on verifying existing functionality, fixing any gaps found during verification, and writing property-based tests to provide formal correctness guarantees for UAT.

## Codebase Audit Summary

All major components are implemented and functional:
- **TimeTrackerComponent**: Clock-in/out, elapsed timer, geolocation, mileage, error/retry — ✅ complete
- **TimecardDashboardComponent**: Loading, error, empty states, daily/weekly views — ✅ complete
- **CalendarViewComponent / TechnicianScheduleComponent**: Multi-view calendar, date filtering, loading/empty/error — ✅ complete
- **JobSetupComponent**: 4-step wizard with validation, draft persistence, error handling — ✅ complete
- **JobListComponent**: Filtering, pagination, batch ops, loading/empty/error — ✅ complete
- **JobDetailComponent**: Status transitions, notes, attachments, budget — ✅ complete
- **TechnicianFormComponent**: Create/edit, validation (email, phone, required fields) — ✅ complete
- **TechnicianListComponent**: Filtering, pagination, role-based scoping — ✅ complete
- **CrewFormComponent**: Create/edit, validation, member management — ✅ complete
- **CrewListComponent**: Filtering, pagination, loading/empty/error — ✅ complete
- **CrewDetailComponent**: Member add/remove, location history — ✅ complete
- **CreateJobGuard + all role guards**: Role enforcement, redirect on denial — ✅ complete
- **ErrorInterceptor**: Status-specific handling (400–500), retry, PII masking — ✅ complete
- **NgRx state slices**: All reducers handle create/update success with EntityAdapter — ✅ complete

## Tasks

- [x] 1. Verify Time Tracking End-to-End Flow
  - [x] 1.1 Verify clock-in/clock-out flow in TimeTrackerComponent
    - Run existing unit tests for TimeTrackerComponent and TimeTrackingService
    - Manually verify: clock-in creates TimeEntry, elapsed timer runs, concurrent clock-in blocked
    - Manually verify: clock-out captures timestamp, calculates totalHours, optional mileage works
    - Verify geolocation fallback: clock-in/out proceeds without location on failure
    - Verify error display with retry on server failure
    - Fix any gaps found during verification
    - _Requirements: 1.1–1.5, 2.1–2.5_

  - [ ]* 1.2 Write property tests for time tracking (time-tracking.service.pbt.spec.ts)
    - **Property 1: Clock-in creates a valid TimeEntry**
    - **Property 2: Geolocation captured when available**
    - **Property 3: No concurrent clock-in**
    - **Property 4: Clock-out sets timestamp and calculates totalHours**
    - **Property 5: Mileage stored on clock-out when provided**
    - **Validates: Requirements 1.1, 1.2, 1.4, 2.1, 2.4**

- [x] 2. Verify Timecard Display
  - [x] 2.1 Verify TimecardDashboardComponent states and calculations
    - Run existing unit tests for TimecardDashboardComponent and TimecardService
    - Verify loading indicator displays while fetching time entries
    - Verify empty state message when no entries exist for the period
    - Verify error card with retry on load failure
    - Verify daily summary shows totalHours, regularHours, overtimeHours
    - Verify weekly view tab renders correctly
    - Fix any gaps found during verification
    - _Requirements: 3.1–3.5_

  - [ ]* 2.2 Write property tests for timecard calculations (timecard.service.pbt.spec.ts)
    - **Property 6: Time entries grouped by date correctly**
    - **Property 7: Hour calculation invariants (total = regular + overtime)**
    - **Validates: Requirements 3.1, 3.2**

- [x] 3. Verify Schedule Viewing
  - [x] 3.1 Verify CalendarViewComponent and TechnicianScheduleComponent
    - Run existing unit tests for scheduling components
    - Verify calendar loads assignments for selected date range
    - Verify job details display (jobId, client, siteName, address, start/end time)
    - Verify loading, empty, and error states
    - Verify date range selector (Today, This Week, This Month) works
    - Fix any gaps found during verification
    - _Requirements: 4.1–4.5_

  - [ ]* 3.2 Write property test for schedule filtering (scheduling.service.pbt.spec.ts)
    - **Property 8: Schedule filtering by date returns correct assignments**
    - **Validates: Requirements 4.2**

- [x] 4. Checkpoint — Time Tracking, Timecard, and Schedule
  - Run all existing tests for time tracking, timecard, and scheduling modules
  - Confirm no regressions from verification fixes

- [x] 5. Verify Job Creation Wizard
  - [x] 5.1 Verify JobSetupComponent wizard flow
    - Run existing unit tests for JobSetupComponent and step components
    - Verify wizard starts at step 1 (Customer Info)
    - Verify required field validation blocks step progression
    - Verify dateRange validator rejects scheduledEndDate before scheduledStartDate
    - Verify successful submission dispatches createJob and navigates to job list
    - Verify error handling retains form data on server failure
    - Fix any gaps found during verification
    - _Requirements: 5.1–5.5_

  - [ ]* 5.2 Write property tests for job wizard validation (job-form.pbt.spec.ts)
    - **Property 9: Job wizard required field validation**
    - **Property 10: Date range validation rejects end before start**
    - **Validates: Requirements 5.2, 5.5**

- [x] 6. Verify Job List and Detail
  - [x] 6.1 Verify JobListComponent filtering and states
    - Run existing unit tests for JobListComponent
    - Verify job list displays jobId, client, siteName, jobType, priority, status
    - Verify all filters work (status, priority, jobType, client, market, search)
    - Verify loading, empty, and error states
    - Fix any gaps found during verification
    - _Requirements: 6.1–6.5_

  - [x] 6.2 Verify JobDetailComponent status transitions and notes
    - Run existing unit tests for JobDetailComponent
    - Verify all job fields display including notes, attachments, status history
    - Verify valid status transitions (NotStarted→EnRoute→OnSite→Completed, any→Issue, any→Cancelled)
    - Verify invalid transitions show validation error
    - Verify add note persists with author and timestamp
    - Fix any gaps found during verification
    - _Requirements: 7.1–7.5_

  - [ ]* 6.3 Write property tests for job management (job-status.pbt.spec.ts, job-notes.pbt.spec.ts, job-list.filter.pbt.spec.ts)
    - **Property 12: Job list filtering**
    - **Property 13: Job status transition validity**
    - **Property 14: Job note includes author and timestamp**
    - **Validates: Requirements 6.2, 7.3, 7.4, 7.5**

- [x] 7. Verify CreateJobGuard
  - [x] 7.1 Verify CreateJobGuard role enforcement
    - Run existing unit tests for CreateJobGuard
    - Verify guard allows Dispatcher and Admin roles
    - Verify guard blocks other roles and redirects to dashboard
    - Fix any gaps found during verification
    - _Requirements: 5.6, 14.4_

  - [ ]* 7.2 Write property test for CreateJobGuard (create-job.guard.pbt.spec.ts)
    - **Property 11: CreateJobGuard role enforcement**
    - **Validates: Requirements 5.6, 14.4**

- [x] 8. Checkpoint — Job Management
  - Run all existing tests for job module
  - Confirm no regressions from verification fixes

- [x] 9. Verify Technician Management
  - [x] 9.1 Verify TechnicianFormComponent validation and submission
    - Run existing unit tests for TechnicianFormComponent
    - Verify form displays all fields (firstName, lastName, email, phone, role, etc.)
    - Verify required field validation (firstName, lastName, email, region)
    - Verify email and phone format validation
    - Verify create and edit modes work correctly
    - Verify error handling retains form data on server failure
    - Fix any gaps found during verification
    - _Requirements: 8.1–8.6_

  - [x] 9.2 Verify TechnicianListComponent filtering and states
    - Run existing unit tests for TechnicianListComponent
    - Verify list displays name, role, region, skills, active status
    - Verify all filters work (role, skills, region, availability, active, search)
    - Verify CM market-based filtering via RoleBasedDataService
    - Verify loading, empty, and error states
    - Fix any gaps found during verification
    - _Requirements: 9.1–9.6_

  - [ ]* 9.3 Write property tests for technician management (technician-form.pbt.spec.ts, technician-list.filter.pbt.spec.ts)
    - **Property 15: Technician form required field and email validation**
    - **Property 16: Phone number format validation**
    - **Property 17: Entity edit form pre-population** (technician portion)
    - **Property 18: Technician list filtering**
    - **Property 19: CM market-based technician filtering**
    - **Validates: Requirements 8.2, 8.5, 8.6, 9.2, 9.6**

- [x] 10. Checkpoint — Technician Management
  - Run all existing tests for technician module
  - Confirm no regressions from verification fixes

- [x] 11. Verify Crew Management
  - [x] 11.1 Verify CrewFormComponent validation and submission
    - Run existing unit tests for CrewFormComponent
    - Verify form displays all fields (name, leadTechnicianId, memberIds, market, company, status)
    - Verify required field validation (name, leadTechnicianId, market)
    - Verify create and edit modes work correctly
    - Verify error handling retains form data on server failure
    - Fix any gaps found during verification
    - _Requirements: 10.1–10.5_

  - [x] 11.2 Verify CrewListComponent filtering and states
    - Run existing unit tests for CrewListComponent
    - Verify list displays name, lead technician, member count, market, status, location
    - Verify all filters work (status, market, company, search)
    - Verify loading, empty, and error states
    - Fix any gaps found during verification
    - _Requirements: 11.1–11.5_

  - [x] 11.3 Verify CrewDetailComponent member management
    - Run existing unit tests for CrewDetailComponent
    - Verify add member calls CrewService.addCrewMember() and updates NgRx store
    - Verify remove member calls CrewService.removeCrewMember() and updates NgRx store
    - Verify error handling reverts UI on failure (optimistic update rollback)
    - Fix any gaps found during verification
    - _Requirements: 12.1–12.3_

  - [ ]* 11.4 Write property tests for crew management (crew-form.pbt.spec.ts, crew-list.filter.pbt.spec.ts, crew-members.pbt.spec.ts)
    - **Property 20: Crew form required field validation**
    - **Property 17: Entity edit form pre-population** (crew portion)
    - **Property 21: Crew list filtering**
    - **Property 22: Add crew member updates memberIds**
    - **Property 23: Remove crew member updates memberIds**
    - **Validates: Requirements 10.2, 10.5, 11.2, 12.1, 12.2**

- [x] 12. Checkpoint — Crew Management
  - Run all existing tests for crew module
  - Confirm no regressions from verification fixes

- [x] 13. Verify NgRx State Consistency
  - [x] 13.1 Verify NgRx reducers reflect entity mutations without page refresh
    - Run existing reducer and effect unit tests for all state slices
    - Verify Job, Technician, Crew, TimeEntry create success actions add entity to store
    - Verify job status update success action updates status in store
    - Verify loading flag resets to false after success/failure actions
    - Verify list components re-render from selectors after store mutations
    - Fix any gaps found during verification
    - _Requirements: 13.1–13.5_

  - [ ]* 13.2 Write property tests for NgRx state (ngrx-entity-creation.pbt.spec.ts, ngrx-job-status.pbt.spec.ts)
    - **Property 24: Entity creation reflected in NgRx store**
    - **Property 25: Job status update reflected in NgRx store**
    - **Validates: Requirements 5.3, 7.2, 8.3, 10.3, 13.1–13.5**

- [x] 14. Verify Role-Based Route Protection
  - [x] 14.1 Verify all route guards enforce correct role access
    - Run existing unit tests for all guards (AdminGuard, DispatcherGuard, TechnicianGuard, etc.)
    - Verify unauthenticated users redirect to login
    - Verify Technician role → mobile + timecard only
    - Verify Dispatcher role → technicians, jobs, crews, scheduling
    - Verify Admin role → all routes
    - Verify unauthorized access redirects to dashboard with notification
    - Fix any gaps found during verification
    - _Requirements: 14.1–14.5_

  - [ ]* 14.2 Write property test for role-based route access (route-guards.pbt.spec.ts)
    - **Property 26: Role-based route access matrix**
    - **Validates: Requirements 14.1–14.5**

- [x] 15. Verify Error Handling and User Feedback
  - [x] 15.1 Verify ErrorInterceptor status-specific handling
    - Run existing unit tests for ErrorInterceptor
    - Verify 400 → invalid input message
    - Verify 401 → redirect to login with returnUrl
    - Verify 403 → access-denied message
    - Verify 404 → resource-not-found message
    - Verify 409 → conflict-detected message with resolution guidance
    - Verify 500 → server error message with retry suggestion
    - Fix any gaps found during verification
    - _Requirements: 15.1–15.6_

  - [ ]* 15.2 Write property test for HTTP error handling (error-interceptor.pbt.spec.ts)
    - **Property 27: HTTP error status code handling**
    - **Validates: Requirements 15.1–15.6**

- [x] 16. Final Checkpoint — Full UAT Readiness
  - Run full test suite across all FRM modules
  - Confirm all verification tasks passed with no outstanding gaps
  - Confirm all property-based tests pass (if written)

## Notes

- Tasks marked with `*` are optional property-based tests — can be skipped for faster UAT readiness
- All core components, services, guards, and state management are already implemented
- Required tasks focus on verification, gap identification, and fixing any issues found
- Checkpoints ensure incremental validation across each feature area
- Property-based tests use fast-check and are placed in `*.pbt.spec.ts` files
