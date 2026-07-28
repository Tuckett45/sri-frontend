# Requirements Document: PTO & Overtime Enhancements — Phase 2

## Introduction

This spec covers the six follow-up tasks required to complete the PTO & Overtime management system. Phase 1 delivered the frontend components (overtime request form/list, approval dashboard, team timeline, enhanced PTO form). Phase 2 delivers the backend API endpoints, data model alignment, navigation/UX integration, team-wide data endpoints for the timeline, notification/email wiring, and a reporting/export view.

The work spans two repositories:
- **sri-frontend** (Angular 18 / NgRx) — Frontend application
- **atlas-platform** (.NET / C# / Azure) — Backend API

## Glossary

- **Overtime_Request**: A formal request submitted by an employee to work overtime hours, requiring pre-approval
- **SRI_Lead**: The employee's direct supervisor/team lead at SRI
- **Team_Availability**: A read-only calendar/timeline view showing which team members are off and when
- **Market**: A geographic region the employee supports (Utah, Texas, Arizona, Nevada, etc.)
- **Coverage_Person**: The team member designated to handle business commitments while an employee is out
- **Export**: The ability to download request data as a file (CSV/Excel) for offline analysis
- **Notification**: An in-app and/or email alert about a status change on a request

---

## Requirement 1: Backend API Endpoints for Overtime Requests

**User Story:** As the system, I need backend API endpoints for overtime requests so that the frontend can persist, retrieve, and manage overtime data.

### Acceptance Criteria

1. THE Atlas API SHALL expose a `POST /v1/overtime-requests` endpoint that creates a new overtime request with fields: employeeFullName, department, market, emailedSriLead, sriLeadName, isPreApproved, submissionDate, overtimeStartDate, estimatedDuration (hours, minutes), justification.
2. THE Atlas API SHALL expose a `GET /v1/overtime-requests` endpoint that returns a paginated list of the authenticated user's overtime requests, sorted by overtimeStartDate descending.
3. THE Atlas API SHALL expose a `GET /v1/overtime-requests/{id}` endpoint that returns a single overtime request by ID. WHEN the request does not exist, it SHALL return 404.
4. THE Atlas API SHALL expose a `POST /v1/overtime-requests/{id}/cancel` endpoint that transitions the request status to Cancelled. WHEN the request is not in Pending_Manager_Approval status, it SHALL return 409.
5. THE Atlas API SHALL expose a `POST /v1/overtime-requests/{id}/approve` endpoint that transitions the request status to Approved. WHEN the authenticated user is not a Manager/Admin, it SHALL return 403. WHEN the request is not in Pending_Manager_Approval status, it SHALL return 409.
6. THE Atlas API SHALL expose a `POST /v1/overtime-requests/{id}/reject` endpoint that transitions the request status to Rejected with a required reason field. WHEN reason is empty, it SHALL return 400.
7. THE Atlas API SHALL expose a `GET /v1/overtime-requests/manager-queue` endpoint that returns all overtime requests in Pending_Manager_Approval status for the authenticated manager's reports.
8. THE Atlas API SHALL validate all required fields on creation and return 400 with field-level error details for invalid submissions.
9. THE Atlas API SHALL record a timestamped approval history entry for every status transition on an overtime request.

---

## Requirement 2: PTO Data Model Alignment (Backend + Frontend DTO)

**User Story:** As a developer, I need the PTO data model to support the new form fields (coveragePerson, emailedLead, market, outOfOffice notifications) so that the full SRI form data is captured end-to-end.

### Acceptance Criteria

1. THE Atlas API `CreatePtoRequest` DTO SHALL accept additional optional fields: `employeeName` (string), `coveragePerson` (string), `emailedSriLead` (boolean), `isApproved` (string enum: yes/no/pending), `market` (string), `outOfOfficeCalendar` (boolean), `outOfOfficeChat` (boolean), `outOfOfficeEmail` (boolean).
2. THE `PtoRequest` entity in the Atlas API SHALL store and return these new fields alongside existing fields.
3. THE frontend `CreatePtoRequestDto` in `pto.models.ts` SHALL be extended with the same new fields to match the backend contract.
4. WHEN new fields are not provided, THE Atlas API SHALL accept the request with null/default values for backward compatibility.
5. THE Atlas API SHALL include a database migration to add the new columns to the PTO requests table without breaking existing data.

---

## Requirement 3: Navigation & UX Integration

**User Story:** As a user, I want clear navigation links to PTO, Overtime, Timeline, and Approvals so I can easily find and switch between these features.

### Acceptance Criteria

1. THE Home Dashboard component SHALL display quick-action cards/links for: "Request Time Off", "Request Overtime", "View Team Timeline", and (for managers) "Approval Dashboard".
2. THE PTO module SHALL display a persistent sub-navigation bar/tabs with links: "My Requests", "Overtime", "Timeline", and (for managers) "Approvals".
3. THE sub-navigation SHALL highlight the currently active route.
4. THE Approval Dashboard tab SHALL display a badge showing the count of total pending requests (PTO + Overtime).
5. THE navigation links SHALL be conditionally displayed based on the user's role (only managers/admins see Approval Dashboard).
6. THE navigation SHALL be responsive and collapse to a mobile-friendly format on small screens.

---

## Requirement 4: Team-Wide Data Endpoint for Timeline

**User Story:** As a manager or team member, I want the timeline to show all approved time-off across the team (not just my own) so I can see team availability.

### Acceptance Criteria

1. THE Atlas API SHALL expose a `GET /v1/pto-requests/team-availability` endpoint that returns all approved PTO requests within a date range, with optional market filter.
2. THE endpoint SHALL accept query parameters: `startDate` (ISO date, required), `endDate` (ISO date, required), `market` (string, optional).
3. THE endpoint SHALL return an array of objects with fields: `id`, `employeeName`, `startDate`, `endDate`, `market`, `requestType`.
4. THE endpoint SHALL be accessible to all authenticated users (any role).
5. THE frontend TeamTimelineComponent SHALL call this endpoint instead of relying solely on the user's own requests from the NgRx store.
6. WHEN the market filter is applied, THE endpoint SHALL return only requests matching that market.
7. THE endpoint SHALL support date ranges up to 1 year (365 days). WHEN the range exceeds 1 year, it SHALL return 400.

---

## Requirement 5: Notification & Email Integration

**User Story:** As an employee, manager, or backoffice user, I want to receive in-app and email notifications about overtime request status changes so I can take timely action.

### Acceptance Criteria

1. WHEN an overtime request is submitted, THE system SHALL send an in-app notification to the employee's SRI Lead (manager).
2. WHEN an overtime request is approved, THE system SHALL send an in-app notification and email to the requesting employee.
3. WHEN an overtime request is rejected, THE system SHALL send an in-app notification and email to the requesting employee, including the rejection reason.
4. WHEN a PTO request is submitted, THE system SHALL send an in-app notification to the employee's manager (same as existing, verify wiring).
5. WHEN a PTO request reaches a terminal status (Approved, Rejected, Cancelled), THE system SHALL send an in-app notification and email to the employee.
6. THE notification emails SHALL include: employee name, request type (PTO/Overtime), dates, status, and a link to view the request in the application.
7. THE in-app notifications SHALL appear in the existing application notification area/bell icon.
8. WHEN the email service is unavailable, THE system SHALL log the failure and still deliver the in-app notification.

---

## Requirement 6: Reporting & Export View

**User Story:** As a manager or backoffice user, I want to view all PTO and overtime submissions in a data table and export them as CSV, so I can perform offline analysis and record-keeping.

### Acceptance Criteria

1. THE system SHALL provide a "Reports" tab/page within the PTO module accessible to managers and backoffice users.
2. THE Reports view SHALL display a data table with columns matching the Google Sheets reference: Timestamp, Employee Name, Emailed SRI Lead, Approved, Start Date, End Date, Market, Out-of-Office Notifications, Coverage Person.
3. THE Reports view SHALL support filtering by: date range, market, status, and request type (PTO vs Overtime).
4. THE Reports view SHALL support sorting by any column (ascending/descending).
5. THE system SHALL provide an "Export CSV" button that downloads the currently filtered data as a CSV file.
6. THE export SHALL include all visible columns plus any additional metadata (request ID, submission timestamp).
7. THE data table SHALL support pagination (default 25 rows per page) with page navigation controls.
8. THE Atlas API SHALL expose a `GET /v1/reports/time-off` endpoint that returns filtered, paginated time-off data for authorized users. WHEN the user is not a Manager or Backoffice_User, it SHALL return 403.
9. THE Atlas API SHALL expose a `GET /v1/reports/time-off/export` endpoint that returns a CSV file download for the filtered data.

---

## Non-Functional Requirements

### Performance
- Team availability endpoint SHALL respond within 2 seconds for up to 500 requests in a year range.
- Reports data table SHALL render initial page within 1 second for datasets up to 1000 rows.
- CSV export SHALL complete within 5 seconds for datasets up to 5000 rows.

### Security
- All new endpoints SHALL require authentication (JWT Bearer token).
- Manager-only endpoints SHALL validate role claims before processing.
- Email notifications SHALL not include sensitive PII beyond what is necessary (employee name, dates).

### Compatibility
- All new frontend components SHALL support the existing responsive breakpoints (desktop, tablet, mobile).
- Backend migrations SHALL be backward-compatible with existing PTO requests (no data loss, nullable new fields).
