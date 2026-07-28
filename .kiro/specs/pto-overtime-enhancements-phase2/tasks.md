# Implementation Plan: PTO & Overtime Enhancements — Phase 2

## Overview

This plan implements the six follow-up tasks to complete the PTO/Overtime system. Work spans both the atlas-platform (.NET backend) and sri-frontend (Angular frontend) repositories. Tasks are ordered by dependency: backend endpoints first, then data model alignment, then frontend integration work.

## Tasks

- [ ] 1. Backend API — Overtime Request Endpoints (atlas-platform)
  - [ ] 1.1 Create OvertimeRequest entity and EF Core configuration
    - Create `Models/OvertimeRequest.cs` entity class
    - Create `Models/OvertimeApprovalEntry.cs` entity class
    - Add DbSet to the application DbContext
    - Create EF Core migration for the overtime_requests table
    - _Requirements: 1.1, 1.9_


  - [ ] 1.2 Create IOvertimeRequestService and implementation
    - Create `Services/IOvertimeRequestService.cs` interface
    - Create `Services/OvertimeRequestService.cs` implementation
    - Implement: CreateAsync, GetByIdAsync, GetMyRequestsAsync, CancelAsync, ApproveAsync, RejectAsync, GetManagerQueueAsync
    - Add validation logic (required fields, status transitions)
    - Add approval history tracking on every transition
    - _Requirements: 1.1, 1.4, 1.5, 1.6, 1.8, 1.9_

  - [ ] 1.3 Create IOvertimeRequestRepository and implementation
    - Create `Repositories/IOvertimeRequestRepository.cs` interface
    - Create `Repositories/OvertimeRequestRepository.cs` (EF Core)
    - Implement CRUD operations with pagination support
    - Implement manager queue query (filter by manager's reports)
    - _Requirements: 1.2, 1.7_

  - [ ] 1.4 Create OvertimeRequestsController
    - Create `Controllers/OvertimeRequestsController.cs`
    - Implement all 7 endpoints (POST create, GET list, GET by id, POST cancel, POST approve, POST reject, GET manager-queue)
    - Add [Authorize] attribute to all endpoints
    - Add [Authorize(Roles = "Manager,Admin")] to approve/reject/manager-queue
    - Add request validation with ModelState
    - Return paginated responses for list endpoints
    - _Requirements: 1.1–1.9_

  - [ ] 1.5 Create DTOs for overtime requests
    - Create `DTOs/CreateOvertimeRequestDto.cs`
    - Create `DTOs/OvertimeRequestResponseDto.cs`
    - Create `DTOs/RejectOvertimeRequestDto.cs`
    - Add data annotations for validation
    - _Requirements: 1.1, 1.6, 1.8_

  - [ ] 1.6 Register services in DI container
    - Register IOvertimeRequestService, IOvertimeRequestRepository in Startup/Program.cs
    - _Requirements: 1.1_


- [ ] 2. PTO Data Model Alignment (atlas-platform + sri-frontend)
  - [ ] 2.1 Extend PtoRequest entity with new fields (backend)
    - Add CoveragePerson, EmailedSriLead, IsApprovedByLead, Market, OutOfOfficeCalendar, OutOfOfficeChat, OutOfOfficeEmail to PtoRequest entity
    - All new fields nullable for backward compatibility
    - _Requirements: 2.1, 2.2_

  - [ ] 2.2 Create database migration for new PTO columns
    - Generate EF Core migration adding nullable columns
    - Verify migration is reversible
    - Test migration against existing data (no data loss)
    - _Requirements: 2.5_

  - [ ] 2.3 Update CreatePtoRequest DTO (backend)
    - Add optional new fields to the API DTO
    - Update controller to map new fields to entity
    - Update response DTO to include new fields
    - _Requirements: 2.1, 2.4_

  - [ ] 2.4 Update frontend CreatePtoRequestDto (sri-frontend)
    - Extend `CreatePtoRequestDto` in `models/pto.models.ts` with new optional fields
    - Update `PtoRequestFormComponent.onSubmit()` to include new fields in the DTO
    - Update `PtoApiService.createRequest()` if needed
    - _Requirements: 2.3_

  - [ ] 2.5 Update PtoRequest interface to include new fields (frontend)
    - Add new fields to `PtoRequest` interface in `pto.models.ts`
    - Update request detail component to display new fields
    - Update request list to show market/coverage columns
    - _Requirements: 2.2, 2.3_


- [ ] 3. Navigation & UX Integration (sri-frontend)
  - [ ] 3.1 Create PTO sub-navigation component
    - Create `components/pto/pto-sub-nav/pto-sub-nav.component.ts` (+ html/scss)
    - Implement tab links: My Requests, Overtime, Timeline, Approvals, Reports
    - Use `routerLinkActive` for active state highlighting
    - Add pending count badge on Approvals tab (from NgRx selector)
    - Conditionally show Approvals/Reports based on user role
    - _Requirements: 3.2, 3.3, 3.4, 3.5_

  - [ ] 3.2 Create PTO layout wrapper component
    - Create `components/pto/pto-layout/pto-layout.component.ts`
    - Renders sub-nav at top + `<router-outlet>` below
    - Update PTO module routes to use layout as parent
    - _Requirements: 3.2, 3.6_

  - [ ] 3.3 Add quick-action cards to Home Dashboard
    - Update `HomeDashboardComponent` template
    - Add cards: "Request Time Off", "Request Overtime", "View Availability", "Review Approvals" (manager-only)
    - Each card navigates to the appropriate PTO module route
    - Style cards consistent with existing dashboard design
    - _Requirements: 3.1, 3.5_

  - [ ] 3.4 Add responsive styles for sub-navigation
    - Mobile: horizontal scroll or hamburger collapse
    - Tablet: full tab bar
    - Desktop: full tab bar with badge
    - _Requirements: 3.6_


- [ ] 4. Team-Wide Availability Endpoint & Timeline Integration
  - [ ] 4.1 Create team-availability endpoint (backend)
    - Add `GetTeamAvailability` action to `PtoRequestsController`
    - Accept query params: startDate, endDate (required), market (optional)
    - Validate date range <= 365 days, return 400 if exceeded
    - Query approved PTO requests overlapping the date range
    - Return lightweight projection (id, employeeName, startDate, endDate, market, requestType)
    - No pagination (bounded by 365 days)
    - _Requirements: 4.1, 4.2, 4.3, 4.6, 4.7_

  - [ ] 4.2 Add team-availability API call to PtoApiService (frontend)
    - Add `getTeamAvailability(startDate, endDate, market?)` method to `PtoApiService`
    - Returns `Observable<TeamAvailabilityEntry[]>`
    - _Requirements: 4.5_

  - [ ] 4.3 Update TeamTimelineComponent to use API data
    - Replace NgRx store dependency with direct API call
    - Call API on init and when year/market filter changes
    - Add loading spinner during API call
    - Add error state with retry button
    - Map API response to timeline entries
    - _Requirements: 4.4, 4.5_

  - [ ] 4.4 Add TeamAvailabilityEntry interface (frontend)
    - Create interface in `pto.models.ts` or a shared models file
    - Fields: id, employeeName, startDate, endDate, market, requestType
    - _Requirements: 4.3_


- [ ] 5. Notification & Email Integration
  - [ ] 5.1 Create OvertimeNotificationEffects (frontend)
    - Create `state/overtime/overtime-notification.effects.ts`
    - On `createOvertimeRequestSuccess`: dispatch in-app notification to manager
    - On `approveOvertimeRequestSuccess`: dispatch notification to employee
    - On `rejectOvertimeRequestSuccess`: dispatch notification to employee with reason
    - Use existing `NotificationService` patterns from PtoNotificationEffects
    - Register in PTO module EffectsModule
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ] 5.2 Add email dispatch to overtime service (backend)
    - On approval: send email to employee (approved template)
    - On rejection: send email to employee (rejected template with reason)
    - Use existing email service/infrastructure
    - Log failures without blocking the approval operation
    - _Requirements: 5.2, 5.3, 5.8_

  - [ ] 5.3 Create email templates for overtime notifications
    - Create approval email template (HTML)
    - Create rejection email template (HTML, includes reason)
    - Include: employee name, request type, dates, status, link to view
    - _Requirements: 5.6_

  - [ ] 5.4 Verify existing PTO notification wiring
    - Confirm PtoNotificationEffects dispatches notifications on all terminal statuses
    - Add email dispatch for PTO approval/rejection if not present
    - _Requirements: 5.4, 5.5_

  - [ ] 5.5 Add email dispatch to PTO service (backend)
    - On final approval (backoffice approve): send email to employee
    - On rejection (manager or backoffice): send email to employee with reason
    - _Requirements: 5.5, 5.6, 5.8_


- [ ] 6. Reporting & Export View
  - [ ] 6.1 Create Reports API endpoint (backend)
    - Add `ReportsController.cs` with `GET /v1/reports/time-off`
    - Accept query params: startDate, endDate, market, status, type (pto/overtime), page, pageSize, sortBy, sortDir
    - Return paginated response combining PTO and overtime requests
    - Authorize: Manager, Admin, Payroll roles only
    - _Requirements: 6.8_

  - [ ] 6.2 Create CSV export endpoint (backend)
    - Add `GET /v1/reports/time-off/export` to ReportsController
    - Accept same filter params as the list endpoint
    - Generate CSV with columns: Timestamp, Employee Name, Emailed Lead, Approved, Start Date, End Date, Market, OOO Notifications, Coverage Person, Type
    - Return file with `Content-Type: text/csv` and `Content-Disposition: attachment`
    - _Requirements: 6.9_

  - [ ] 6.3 Create PtoReportsComponent (frontend)
    - Create `components/pto/reports/pto-reports.component.ts` (+ html/scss)
    - Implement data table with columns matching Google Sheets reference
    - Add pagination controls (25 rows default)
    - Add column sort (click header to toggle asc/desc)
    - _Requirements: 6.1, 6.2, 6.4, 6.7_

  - [ ] 6.4 Add filter controls to reports view
    - Date range picker (start/end)
    - Market dropdown filter
    - Status dropdown filter (All, Pending, Approved, Rejected, Cancelled)
    - Type toggle (All, PTO Only, Overtime Only)
    - Filters trigger API re-fetch with updated params
    - _Requirements: 6.3_

  - [ ] 6.5 Implement CSV export button (frontend)
    - "Export CSV" button in reports toolbar
    - Calls export endpoint with current filters
    - Triggers browser file download
    - Show loading state during export
    - Handle errors with toast notification
    - _Requirements: 6.5, 6.6_

  - [ ] 6.6 Add reports API service methods (frontend)
    - Add `getTimeOffReport(filters)` method to PtoApiService (or new ReportsApiService)
    - Add `exportTimeOffReport(filters)` method returning blob
    - _Requirements: 6.8, 6.9_

  - [ ] 6.7 Add reports route to PTO module
    - Add route: `reports` → PtoReportsComponent
    - Protect with ManagerGuard or PayrollGuard
    - Add to sub-navigation
    - _Requirements: 6.1_

## Notes

- Tasks 1 and 2 require work in the atlas-platform repository
- Tasks 3–6 are primarily in sri-frontend but Task 4, 5, 6 also have backend components
- Backend tasks should be completed first as frontend depends on API availability
- Each task group is independently deployable
- Email integration depends on existing Azure email service configuration
- CSV export should be tested with datasets of 1000+ rows to verify performance
