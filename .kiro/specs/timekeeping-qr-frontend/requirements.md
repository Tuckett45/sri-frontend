# Requirements Document

## Introduction

The Timekeeping QR Frontend provides a complete user interface for the QR Code Timekeeping System within the existing Field Resource Management (FRM) Angular module of the sri-frontend application. The feature delivers a mobile-first technician experience for camera-based QR scanning clock-in/out and a desktop-optimized admin dashboard for station management, attendance monitoring, and Celerity reconciliation. It integrates with the existing NgRx state management, GeolocationService, and FrmSignalRService infrastructure.

## Glossary

- **QR_Scanner_Component**: The mobile-first Angular component responsible for camera initialization, QR code decoding, GPS acquisition, time category selection, and scan submission for clock-in/out operations.
- **Station_Management_Component**: The admin Angular component for registering, deactivating, and monitoring QR stations across job sites.
- **Attendance_Dashboard_Component**: The admin Angular component displaying daily attendance records with filtering, summary statistics, and export capability.
- **Reconciliation_View_Component**: The admin Angular component for generating and reviewing Atlas vs Celerity comparison reports and managing discrepancies.
- **QR_Timekeeping_Module**: The lazy-loaded Angular module containing all QR timekeeping components, services, NgRx state, and routing.
- **QrScanService**: The Angular HTTP service responsible for submitting QR scan requests to the Atlas API.
- **StationService**: The Angular HTTP service managing QR station CRUD operations against the Atlas API.
- **AttendanceService**: The Angular HTTP service for retrieving attendance records and summaries.
- **ReconciliationService**: The Angular HTTP service for generating reconciliation reports and managing discrepancies.
- **NgRx_Store**: The centralized Redux-inspired state management layer for the QR Timekeeping feature.
- **GeolocationService**: The existing Angular service that provides GPS coordinate acquisition with fallback behavior.
- **Station_Identifier**: A string in the format `{hex}:{digits}` (e.g., "a3f2b1:03") encoded in QR codes and used to identify registered stations.
- **Time_Category**: One of the valid QR time categories: Regular, PTO, Training, Recharge, or Excused_Absence.
- **Scan_State**: The finite set of UI states for the scanner: idle, scanning, category-select, processing, success, or error.
- **Active_Entry**: An existing time entry that has a clock-in but no corresponding clock-out for the current technician.
- **Discrepancy**: A mismatch between Atlas-recorded hours/categories and Celerity-recorded hours/pay-types for a technician on a given work date.

## Requirements

### Requirement 1: QR Scanner Camera Initialization

**User Story:** As a technician, I want the QR scanner to initialize the camera and acquire GPS coordinates, so that I can scan station QR codes to clock in or out.

#### Acceptance Criteria

1. WHEN the technician navigates to the QR scan page, THE QR_Scanner_Component SHALL request camera permission and initialize the camera stream via the html5-qrcode library.
2. WHEN the camera initializes successfully, THE QR_Scanner_Component SHALL prefer the rear-facing camera and begin scanning at 10 frames per second with a 250x250 pixel scan area.
3. WHEN camera permission is denied, THE QR_Scanner_Component SHALL display an informational banner with instructions to enable camera in browser settings and provide a fallback navigation option to the manual clock-in flow.
4. WHEN the scanner page loads, THE QR_Scanner_Component SHALL begin GPS acquisition in parallel with camera initialization via the GeolocationService.
5. WHEN the GPS acquisition succeeds, THE QR_Scanner_Component SHALL store the coordinates and display an "acquired" status indicator.
6. IF GPS acquisition fails, THEN THE QR_Scanner_Component SHALL display a "Location unavailable" warning indicator.
7. WHEN the technician leaves the scan page or the component is destroyed, THE QR_Scanner_Component SHALL stop the camera stream and release hardware resources.

### Requirement 2: QR Code Scanning and Validation

**User Story:** As a technician, I want to scan a QR code and have it validated, so that only registered station codes are accepted for timekeeping.

#### Acceptance Criteria

1. WHEN the camera decodes a QR code, THE QR_Scanner_Component SHALL validate the decoded text against the station identifier pattern `/^[a-f0-9]+:\d{2}$/`.
2. IF the decoded QR code does not match the station identifier pattern, THEN THE QR_Scanner_Component SHALL display a temporary error message "Invalid QR code. Please scan a registered station code." and continue scanning.
3. WHEN a valid station identifier is decoded, THE QR_Scanner_Component SHALL pause the camera scanner to prevent duplicate scans.
4. WHEN a valid station identifier is decoded, THE QR_Scanner_Component SHALL trigger haptic feedback via `navigator.vibrate(200)` for tactile confirmation.

### Requirement 3: Clock-In vs Clock-Out Detection

**User Story:** As a technician, I want the system to automatically determine whether my scan is a clock-in or clock-out, so that I do not have to manually specify the action.

#### Acceptance Criteria

1. WHEN a valid QR code is scanned AND no Active_Entry exists for the technician, THE QR_Scanner_Component SHALL transition to the category-select state and display the Time_Category selector.
2. WHEN a valid QR code is scanned AND an Active_Entry exists for the technician, THE QR_Scanner_Component SHALL skip category selection and immediately process the scan as a clock-out.

### Requirement 4: Time Category Selection

**User Story:** As a technician, I want to select a time category when clocking in, so that my hours are correctly categorized.

#### Acceptance Criteria

1. THE Time_Category_Selector_Component SHALL display the categories: Regular, PTO, Training, Recharge, and Excused_Absence.
2. WHILE the scanner is in category-select state AND no category has been selected, THE QR_Scanner_Component SHALL disable the submit button.
3. WHEN the technician selects a time category, THE QR_Scanner_Component SHALL enable the submit action.

### Requirement 5: QR Scan Submission

**User Story:** As a technician, I want to submit my QR scan with GPS and category data, so that my time entry is recorded in the system.

#### Acceptance Criteria

1. WHEN the technician submits a clock-in scan, THE QR_Scanner_Component SHALL include the station identifier, technician ID, scan timestamp (ISO 8601), GPS coordinates (latitude, longitude, accuracy), and selected time category in the scan request.
2. WHEN the technician submits a clock-out scan, THE QR_Scanner_Component SHALL include the station identifier, technician ID, and scan timestamp in the scan request.
3. WHILE GPS has not been acquired AND the scan is a clock-in, THE QR_Scanner_Component SHALL disable the submit button.
4. WHILE a scan is in the processing state, THE QR_Scanner_Component SHALL prevent additional scan submissions until the current one completes or fails.
5. WHEN the API returns a successful scan result, THE NgRx_Store SHALL update with the new time entry and THE QR_Scanner_Component SHALL display success feedback with entry details.
6. IF the API returns a 409 conflict, THEN THE QR_Scanner_Component SHALL display "Already clocked in. Scan again to clock out." and transition to handle the next scan as a clock-out.
7. IF the API returns a 404, THEN THE QR_Scanner_Component SHALL display "This station is not active. Please scan a different station or contact your supervisor." and reset the scanner after a 3-second delay.
8. IF the API returns a 400 validation error, THEN THE QR_Scanner_Component SHALL display the validation error message from the response.

### Requirement 6: Station Registration

**User Story:** As an admin, I want to register new QR stations for a job site, so that technicians can scan QR codes at designated locations.

#### Acceptance Criteria

1. WHEN an admin opens the station registration dialog, THE Station_Management_Component SHALL require a location description (non-empty, maximum 200 characters).
2. WHEN an admin submits the registration form, THE StationService SHALL send a POST request to the API with the job site ID and location description.
3. WHEN registration succeeds, THE NgRx_Store SHALL add the new station to the station list and THE Station_Management_Component SHALL display the updated list.
4. WHILE the station count for the selected site equals 6, THE Station_Management_Component SHALL disable the "Register Station" button.

### Requirement 7: Station Deactivation and Monitoring

**User Story:** As an admin, I want to deactivate stations and monitor their activity, so that I can manage the station lifecycle effectively.

#### Acceptance Criteria

1. WHEN an admin clicks deactivate on a station, THE Station_Management_Component SHALL display a confirmation dialog before proceeding.
2. WHEN deactivation is confirmed, THE StationService SHALL send a deactivation request to the API and THE NgRx_Store SHALL update the station's status.
3. THE Station_Management_Component SHALL display an activity status badge (Active, Low_Activity, or Inactive_Flagged) for each station.
4. WHEN an admin selects a job site, THE Station_Management_Component SHALL load and display all stations for that site.

### Requirement 8: Station Map View

**User Story:** As an admin, I want to view stations on a map with activity indicators, so that I can visualize station placement and usage patterns at a site.

#### Acceptance Criteria

1. WHEN an admin navigates to the station map for a job site, THE Station_Map_View_Component SHALL render a Leaflet map with markers for each station.
2. THE Station_Map_View_Component SHALL display each marker with visual differentiation based on activity status (Active, Low_Activity, Inactive_Flagged).
3. WHEN an admin clicks a station marker, THE Station_Map_View_Component SHALL display station details including identifier, location description, total scans, last scan time, and unique technician count.

### Requirement 9: Attendance Dashboard

**User Story:** As an admin, I want to view daily attendance records with filters and summaries, so that I can monitor workforce presence across sites.

#### Acceptance Criteria

1. WHEN the admin navigates to the attendance dashboard, THE Attendance_Dashboard_Component SHALL load and display attendance summary cards showing present, absent, incomplete, and still-active counts.
2. WHEN the admin selects a date, THE Attendance_Dashboard_Component SHALL reload attendance records for that date.
3. WHEN the admin selects a site filter, THE Attendance_Dashboard_Component SHALL display only records for that site.
4. WHEN the admin selects a status filter (All, Present, Absent, or Incomplete), THE Attendance_Dashboard_Component SHALL display only records matching that status.
5. THE Attendance_Dashboard_Component SHALL display each record with technician name, check-in time, check-out time, status, total hours, time category breakdown, and entry count.
6. WHEN the admin selects a date range, THE Attendance_Dashboard_Component SHALL validate that the span does not exceed 90 days.
7. IF the date range exceeds 90 days, THEN THE Attendance_Dashboard_Component SHALL display an error message and prevent the request.
8. WHEN the admin clicks "Export to CSV", THE Attendance_Dashboard_Component SHALL generate and download a CSV file containing the currently displayed attendance records.

### Requirement 10: Reconciliation Report Generation

**User Story:** As an admin, I want to generate reconciliation reports comparing Atlas and Celerity data, so that I can identify and resolve discrepancies in recorded hours.

#### Acceptance Criteria

1. WHEN the admin specifies a date range and clicks "Generate Report", THE Reconciliation_View_Component SHALL dispatch a report generation request to the API.
2. THE Reconciliation_View_Component SHALL validate that the start date is before the end date and the range does not exceed 90 days.
3. IF the date range validation fails, THEN THE Reconciliation_View_Component SHALL disable the generate button and display a validation message.
4. WHILE the report is generating, THE Reconciliation_View_Component SHALL display a progress spinner with informational text.
5. WHEN report generation succeeds, THE NgRx_Store SHALL store the report and THE Reconciliation_View_Component SHALL display the report summary including total records, match count, discrepancy count, and discrepancy percentage.
6. THE Reconciliation_View_Component SHALL verify that `matchCount + discrepancyCount` equals `totalRecordsCompared` for any loaded report.

### Requirement 11: Discrepancy Management

**User Story:** As an admin, I want to view, resolve, and escalate discrepancies, so that mismatches between Atlas and Celerity records are addressed.

#### Acceptance Criteria

1. THE Reconciliation_View_Component SHALL display discrepancies with technician name, work date, Atlas hours, Celerity hours, hours variance, discrepancy type (Hours, Category, or Both), and status.
2. WHEN the admin filters discrepancies by type, THE Reconciliation_View_Component SHALL display only discrepancies matching the selected type.
3. WHEN the admin resolves a discrepancy, THE Reconciliation_View_Component SHALL require a resolution note (non-empty, maximum 500 characters) before submission.
4. WHILE a discrepancy status is "Resolved", THE Reconciliation_View_Component SHALL hide or disable the resolve and escalate actions for that item.
5. WHEN the admin escalates a discrepancy, THE ReconciliationService SHALL send the escalation request with the specified supervisor ID to the API.
6. WHEN a discrepancy is successfully resolved or escalated, THE NgRx_Store SHALL update the discrepancy status and THE Reconciliation_View_Component SHALL refresh the summary statistics.

### Requirement 12: Role-Based Access Control

**User Story:** As the system, I want to enforce role-based access to QR timekeeping features, so that only authorized users can access admin and technician functions.

#### Acceptance Criteria

1. THE QR_Timekeeping_Module SHALL protect technician routes (scan, history) with the TechnicianGuard.
2. THE QR_Timekeeping_Module SHALL protect admin routes (stations, attendance, reconciliation) with the AdminGuard.
3. WHEN an unauthorized user attempts to access a protected route, THE QR_Timekeeping_Module SHALL redirect the user away from the protected page.

### Requirement 13: Offline Scan Queuing

**User Story:** As a technician, I want my QR scans to be queued when offline, so that I do not lose my clock-in/out data during network outages.

#### Acceptance Criteria

1. IF a QR scan submission fails due to network connectivity loss, THEN THE QR_Scanner_Component SHALL queue the scan request via the existing OfflineQueueService.
2. WHEN a scan is queued for offline submission, THE QR_Scanner_Component SHALL display "Scan queued — will submit when online."
3. WHEN network connectivity is restored, THE OfflineQueueService SHALL automatically submit queued scan requests via background sync.
4. WHILE the application is offline, THE Attendance_Dashboard_Component and Reconciliation_View_Component SHALL display a "Data may be stale" banner.

### Requirement 14: Mobile-First Responsive Design

**User Story:** As a technician, I want the scanning interface to be optimized for mobile devices, so that I can easily clock in/out on my phone.

#### Acceptance Criteria

1. THE QR_Scanner_Component SHALL render a centered 250x250 pixel QR scanning area with a semi-transparent overlay optimized for mobile viewports.
2. THE QR_Scanner_Component SHALL provide touch targets of at least 48 pixels for all interactive elements.
3. THE QR_Scanner_Component SHALL use a bottom-sheet modal for time category selection on mobile devices.
4. WHEN viewed on screens wider than 1024 pixels, THE Station_Management_Component SHALL display stations in a full table layout with inline actions.
5. WHEN viewed on screens narrower than 768 pixels, THE Station_Management_Component SHALL display stations as stacked cards with collapsible filters.

### Requirement 15: Lazy Loading and Performance

**User Story:** As a user, I want the QR timekeeping module to load efficiently, so that it does not impact the initial application load time.

#### Acceptance Criteria

1. THE QR_Timekeeping_Module SHALL be lazy-loaded from the FRM routing module, adding zero bytes to the initial application bundle.
2. THE Reconciliation_View_Component SHALL use Angular CDK virtual scrolling for report lists exceeding 1000 records.
3. THE QR_Timekeeping_Module SHALL use ChangeDetectionStrategy.OnPush for all components with async pipe for NgRx observables.
4. WHEN GPS is acquired, THE QR_Scanner_Component SHALL cache the position for 60 seconds to avoid redundant hardware queries during successive scans.

### Requirement 16: QR Time History

**User Story:** As a technician, I want to view my recent QR scan history, so that I can verify my clock-in/out records.

#### Acceptance Criteria

1. WHEN a technician navigates to the history page, THE QR_Time_History_Component SHALL load and display the technician's recent scan events.
2. THE QR_Time_History_Component SHALL display each scan event with timestamp, station identifier, scan type (ClockIn, ClockOut, or Rejected), and success status.

### Requirement 17: Real-Time Updates

**User Story:** As an admin, I want station activity and attendance data to update in real time, so that I see current information without manual refreshes.

#### Acceptance Criteria

1. WHEN a new scan event occurs, THE FrmSignalRService SHALL push the update to the NgRx_Store and THE Station_Management_Component SHALL reflect the updated activity status.
2. WHEN attendance data changes, THE FrmSignalRService SHALL push the update and THE Attendance_Dashboard_Component SHALL reflect the updated records.
