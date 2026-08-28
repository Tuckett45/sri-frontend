# Implementation Plan: Timekeeping QR Frontend

## Overview

This plan implements the QR Code Timekeeping Frontend as a lazy-loaded child module of the existing Field Resource Management (FRM) Angular module. The implementation follows the established FRM patterns: lazy-loaded child modules, NgRx entity-adapter state slices, HTTP services behind the Atlas API interceptor, and role-based route guards. The build order starts with foundation (models, services, state) and progresses through technician components, admin components, routing integration, and testing.

## Tasks

- [ ] 1. Install dependencies and create module structure
  - [ ] 1.1 Install html5-qrcode dependency and create the QrTimekeepingModule with its routing configuration
    - Run `npm install html5-qrcode@^2.3.8` to add QR scanning capability
    - Create `src/app/features/field-resource-management/components/qr-timekeeping/qr-timekeeping.module.ts` with NgModule declaration importing CommonModule, ReactiveFormsModule, SharedMaterialModule, RouterModule.forChild, StoreModule.forFeature, EffectsModule.forFeature
    - Create `src/app/features/field-resource-management/components/qr-timekeeping/qr-timekeeping-routing.ts` with route definitions for scan, history, stations, stations/map/:jobId, attendance, reconciliation, and reconciliation/:reportId
    - Apply TechnicianGuard to technician routes (scan, history) and AdminGuard to admin routes (stations, attendance, reconciliation)
    - _Requirements: 12.1, 12.2, 12.3, 15.1_

  - [ ] 1.2 Create data model interfaces and type definitions
    - Create `src/app/features/field-resource-management/models/qr-timekeeping.model.ts`
    - Define all TypeScript interfaces: QrTimeCategory, QrCodeStation, ScanEvent, QrScanRequest, ScanResult, RegisterStationRequest, StationMapData, StationMapEntry, AttendanceRecord, AttendanceSummary, ReconciliationReport, ReconciliationDiscrepancy, ReconciliationSummary, GenerateReportRequest, ResolveDiscrepancyRequest, EscalateDiscrepancyRequest, AttendanceFilter
    - _Requirements: 2.1, 4.1, 5.1, 5.2, 6.1, 9.5, 10.5, 11.1_

- [ ] 2. Implement HTTP service layer
  - [ ] 2.1 Create QrScanService for scan submission
    - Create `src/app/features/field-resource-management/services/qr-scan.service.ts`
    - Implement `processScan(request: QrScanRequest): Observable<ScanResult>` with POST to `/v1/qr-scan`
    - Implement response mapping handling both camelCase and PascalCase API responses
    - Implement error handling for 409 (conflict), 400 (validation), and 404 (station not found) responses
    - _Requirements: 5.1, 5.2, 5.5, 5.6, 5.7, 5.8_

  - [ ] 2.2 Create StationService for station CRUD operations
    - Create `src/app/features/field-resource-management/services/station.service.ts`
    - Implement `getStationsForSite(siteId: string): Observable<QrCodeStation[]>` with GET to `/v1/qr-stations`
    - Implement `registerStation(request: RegisterStationRequest): Observable<QrCodeStation>` with POST to `/v1/qr-stations`
    - Implement `deactivateStation(stationId: string): Observable<void>` with PUT to `/v1/qr-stations/{id}/deactivate`
    - Implement `getStationMap(jobId: string, period?: number): Observable<StationMapData>` with GET to `/v1/qr-stations/site-map/{jobId}`
    - Implement `getScanHistory(stationId: string, limit?: number): Observable<ScanEvent[]>` with GET to `/v1/qr-stations/{id}/scan-history`
    - Handle `$values` array extraction pattern from .NET API responses
    - _Requirements: 6.2, 6.3, 7.2, 7.4, 8.1_

  - [ ] 2.3 Create AttendanceService for attendance data retrieval
    - Create `src/app/features/field-resource-management/services/attendance.service.ts`
    - Implement `getAttendance(filters: AttendanceFilter): Observable<AttendanceRecord[]>` with query params for date, siteId, startDate, endDate
    - Implement `getSummary(date: string): Observable<AttendanceSummary>` with GET to `/v1/attendance/summary`
    - _Requirements: 9.1, 9.2, 9.3_

  - [ ] 2.4 Create ReconciliationService for report management
    - Create `src/app/features/field-resource-management/services/reconciliation.service.ts`
    - Implement `generateReport(request: GenerateReportRequest): Observable<ReconciliationReport>` with POST to `/v1/reconciliation/generate`
    - Implement `getReport(reportId: string): Observable<ReconciliationReport>` with GET
    - Implement `getReportSummary(reportId: string): Observable<ReconciliationSummary>` with GET
    - Implement `resolveDiscrepancy(id: string, request: ResolveDiscrepancyRequest): Observable<void>` with PUT
    - Implement `escalateDiscrepancy(id: string, request: EscalateDiscrepancyRequest): Observable<void>` with PUT
    - _Requirements: 10.1, 10.5, 11.3, 11.5_

- [ ] 3. Checkpoint - Ensure module structure and services compile
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Implement NgRx state management
  - [ ] 4.1 Create NgRx actions for all QR timekeeping features
    - Create `src/app/features/field-resource-management/state/qr-timekeeping/qr-timekeeping.actions.ts`
    - Define QR Scan actions: processQrScan, processQrScanSuccess, processQrScanFailure, clearScanResult
    - Define Station actions: loadStations, loadStationsSuccess, loadStationsFailure, registerStation, registerStationSuccess, deactivateStation, deactivateStationSuccess, loadStationMap, loadStationMapSuccess
    - Define Attendance actions: loadAttendance, loadAttendanceSuccess, loadAttendanceFailure, loadAttendanceSummary, loadAttendanceSummarySuccess
    - Define Reconciliation actions: generateReport, generateReportSuccess, generateReportFailure, loadReport, loadReportSuccess, resolveDiscrepancy, resolveDiscrepancySuccess, escalateDiscrepancy, escalateDiscrepancySuccess
    - _Requirements: 5.5, 6.3, 7.2, 9.1, 10.1, 10.5, 11.6_

  - [ ] 4.2 Create NgRx reducers with entity adapters
    - Create `src/app/features/field-resource-management/state/qr-timekeeping/qr-timekeeping.reducer.ts`
    - Define QrTimekeepingState interface with sub-states: stations (EntityState), scanEvents, attendance, reconciliation (EntityState)
    - Implement station reducer using @ngrx/entity EntityAdapter for QrCodeStation
    - Implement scan events reducer managing lastScanResult, scanHistory, processing, and error
    - Implement attendance reducer managing records, summary, filters, loading, and error
    - Implement reconciliation reducer using EntityAdapter for ReconciliationReport managing selectedReportId, discrepancies, generating, loading, and error
    - _Requirements: 5.5, 6.3, 9.1, 10.5, 11.6_

  - [ ] 4.3 Create NgRx selectors for all state slices
    - Create `src/app/features/field-resource-management/state/qr-timekeeping/qr-timekeeping.selectors.ts`
    - Define feature selector for 'qrTimekeeping' state slice
    - Define station selectors: selectAllStations, selectStationsBySite, selectStationCount, selectStationMap, selectStationsLoading
    - Define scan selectors: selectLastScanResult, selectScanProcessing, selectScanHistory, selectActiveTimeEntry
    - Define attendance selectors: selectAttendanceRecords, selectAttendanceSummary, selectAttendanceLoading
    - Define reconciliation selectors: selectSelectedReport, selectDiscrepancies, selectReportSummary, selectGenerating
    - _Requirements: 5.5, 6.4, 9.1, 10.5, 11.1_

  - [ ] 4.4 Create NgRx effects for API integration
    - Create `src/app/features/field-resource-management/state/qr-timekeeping/qr-timekeeping.effects.ts`
    - Implement QrScanEffects: processQrScan$ effect calling QrScanService.processScan, handling success/failure/offline
    - Implement QrStationEffects: loadStations$, registerStation$, deactivateStation$, loadStationMap$ effects calling StationService methods
    - Implement AttendanceEffects: loadAttendance$, loadAttendanceSummary$ effects calling AttendanceService methods
    - Implement ReconciliationEffects: generateReport$, loadReport$, resolveDiscrepancy$, escalateDiscrepancy$ effects calling ReconciliationService methods
    - Integrate offline queueing: if scan request fails due to network, dispatch offline queue action
    - _Requirements: 5.5, 5.6, 5.7, 5.8, 6.3, 7.2, 9.1, 10.1, 11.5, 11.6, 13.1_

  - [ ] 4.5 Create state index file and integrate SignalR real-time updates
    - Create `src/app/features/field-resource-management/state/qr-timekeeping/index.ts` barrel export
    - Add SignalR event handlers in effects to listen for scan events and attendance updates from FrmSignalRService
    - Dispatch store updates when SignalR pushes new scan activity or attendance changes
    - _Requirements: 17.1, 17.2_

- [ ] 5. Checkpoint - Ensure NgRx state compiles and action/reducer tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Build technician components
  - [ ] 6.1 Create QrScannerComponent with camera initialization and QR decoding
    - Create `src/app/features/field-resource-management/components/qr-timekeeping/qr-scanner/qr-scanner.component.ts`
    - Create corresponding `.html` and `.scss` files
    - Implement OnInit: request camera permission, initialize html5-qrcode with rear-camera preference, 10 FPS, 250x250 scan area
    - Implement parallel GPS acquisition via GeolocationService with status tracking (acquiring/acquired/failed)
    - Implement onQrCodeScanned: validate against `/^[a-f0-9]+:\d{2}$/`, pause scanner on valid decode, trigger haptic feedback via navigator.vibrate(200)
    - Implement clock-in vs clock-out detection: check for Active_Entry in store, transition to category-select or processing accordingly
    - Implement OnDestroy: stop camera stream and release hardware resources
    - Implement GPS position caching for 60 seconds to avoid redundant hardware queries
    - Use ChangeDetectionStrategy.OnPush with async pipe for all observables
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 15.3, 15.4_

  - [ ] 6.2 Create TimeCategorySelectorComponent and ScanFeedbackComponent
    - Create `src/app/features/field-resource-management/components/qr-timekeeping/time-category-selector/time-category-selector.component.ts` with `.html`
    - Display categories: Regular, PTO, Training, Recharge, Excused_Absence as selectable options
    - Emit categorySelected event on selection
    - Support preselectedCategory input and disabled state
    - Present as bottom-sheet modal on mobile viewports (< 768px)
    - Create `src/app/features/field-resource-management/components/qr-timekeeping/scan-feedback/scan-feedback.component.ts` with `.html`
    - Display success/error feedback with scan result details (scan type, time entry info, error messages)
    - Handle 409, 404, 400 error display with appropriate user messages
    - Reset scanner after 3-second delay on 404 errors
    - _Requirements: 4.1, 4.2, 4.3, 5.5, 5.6, 5.7, 5.8, 14.3_

  - [ ] 6.3 Implement scan submission logic and offline queuing in QrScannerComponent
    - Implement submitScan(): build QrScanRequest with stationIdentifier, technicianId, scanTimestamp (ISO 8601), GPS coordinates, and timeCategory
    - Disable submit while GPS not acquired for clock-in scans
    - Disable submit while no category selected for clock-in scans
    - Prevent duplicate submissions while in processing state
    - Dispatch processQrScan action to NgRx store
    - Handle offline scenario: queue scan via OfflineQueueService, display "Scan queued — will submit when online."
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 13.1, 13.2_

  - [ ] 6.4 Create QrTimeHistoryComponent for scan history display
    - Create `src/app/features/field-resource-management/components/qr-timekeeping/qr-time-history/qr-time-history.component.ts` with `.html` and `.scss`
    - Load technician's recent scan events on init via NgRx selector
    - Display each scan event with: timestamp, station identifier, scan type (ClockIn/ClockOut/Rejected), success status
    - Use ChangeDetectionStrategy.OnPush
    - _Requirements: 16.1, 16.2_

- [ ] 7. Checkpoint - Ensure technician components compile and render
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Build admin components
  - [ ] 8.1 Create StationManagementComponent with registration and deactivation
    - Create `src/app/features/field-resource-management/components/qr-timekeeping/station-management/station-management.component.ts` with `.html` and `.scss`
    - Display stations in responsive table layout (desktop >1024px) or stacked cards (mobile <768px)
    - Implement job site selector dropdown to filter stations by site
    - Show activity status badges (Active, Low_Activity, Inactive_Flagged) for each station
    - Disable "Register Station" button when station count for selected site equals 6
    - Create StationRegistrationComponent as dialog: require locationDescription (non-empty, max 200 chars), submit POST via NgRx
    - Implement deactivation with confirmation dialog before proceeding
    - Use ChangeDetectionStrategy.OnPush
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3, 7.4, 14.4, 14.5_

  - [ ] 8.2 Create StationMapViewComponent with Leaflet integration
    - Create `src/app/features/field-resource-management/components/qr-timekeeping/station-map-view/station-map-view.component.ts` with `.html` and `.scss`
    - Initialize Leaflet map on component init using @asymmetrik/ngx-leaflet
    - Render markers for each station with visual differentiation by activity status (color-coded: green=Active, yellow=Low_Activity, red=Inactive_Flagged)
    - Implement marker click popup showing: station identifier, location description, total scans, last scan time, unique technician count
    - Clean up map on component destroy
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ] 8.3 Create AttendanceDashboardComponent with filters and export
    - Create `src/app/features/field-resource-management/components/qr-timekeeping/attendance-dashboard/attendance-dashboard.component.ts` with `.html` and `.scss`
    - Display summary cards: present count, absent count, incomplete count, still-active count
    - Implement date picker for single-day selection, reload attendance on date change
    - Implement date range picker with 90-day maximum validation (display error and prevent request if exceeded)
    - Implement site filter dropdown
    - Implement status filter tabs: All, Present, Absent, Incomplete
    - Display each record with: technician name, check-in time, check-out time, status, total hours, time category breakdown, entry count
    - Implement CSV export: generate and download CSV of currently displayed records
    - Show "Data may be stale" banner when offline
    - Use ChangeDetectionStrategy.OnPush
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 13.4_

  - [ ] 8.4 Create ReconciliationViewComponent with report generation and discrepancy management
    - Create `src/app/features/field-resource-management/components/qr-timekeeping/reconciliation-view/reconciliation-view.component.ts` with `.html` and `.scss`
    - Implement report generation form with date range picker: validate startDate < endDate and span <= 90 days, disable generate button on invalid
    - Display progress spinner while generating
    - Display report summary: total records, match count, discrepancy count, discrepancy percentage
    - Verify `matchCount + discrepancyCount === totalRecordsCompared` for loaded reports
    - Display discrepancies with: technician name, work date, Atlas hours, Celerity hours, hours variance, discrepancy type (Hours/Category/Both), status
    - Implement discrepancy type filter (All, Hours, Category, Both)
    - Implement resolve action with modal requiring resolution note (non-empty, max 500 chars)
    - Implement escalate action sending supervisorId to API
    - Hide/disable resolve and escalate buttons when discrepancy status is 'Resolved'
    - Refresh summary stats after resolve/escalate success
    - Use Angular CDK virtual scrolling for lists exceeding 1000 records
    - Show "Data may be stale" banner when offline
    - Use ChangeDetectionStrategy.OnPush
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 13.4, 15.2_

- [ ] 9. Checkpoint - Ensure admin components compile and render
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Integrate routing and lazy loading
  - [ ] 10.1 Add QR timekeeping lazy-loaded route to FRM routing module
    - Modify `src/app/features/field-resource-management/field-resource-management-routing.module.ts`
    - Add lazy-loaded child route: `{ path: 'qr-timekeeping', loadChildren: () => import('./components/qr-timekeeping/qr-timekeeping.module').then(m => m.QrTimekeepingModule) }`
    - Ensure the route adds zero bytes to the initial application bundle
    - _Requirements: 15.1, 12.1, 12.2, 12.3_

  - [ ] 10.2 Create shared sub-components and wire real-time updates
    - Create TimeCategoryBadgeComponent: displays a styled badge for any QrTimeCategory value
    - Create ScanStatusIndicatorComponent: displays GPS status and scan state indicators
    - Wire FrmSignalRService events to NgRx store for real-time station activity and attendance updates
    - Ensure unauthorized route access redirects user away from protected page
    - _Requirements: 12.3, 17.1, 17.2_

- [ ] 11. Mobile-first responsive styling
  - [ ] 11.1 Implement responsive layouts and mobile optimizations
    - QrScannerComponent: centered 250x250px scan area with semi-transparent overlay, 48px minimum touch targets, bottom-sheet modal for category selection on mobile
    - StationManagementComponent: full table layout (>1024px), stacked cards with collapsible filters (<768px)
    - AttendanceDashboardComponent: responsive summary cards and table with horizontal scroll on mobile
    - ReconciliationViewComponent: responsive discrepancy list with condensed mobile view
    - Apply TailwindCSS responsive utilities throughout all components
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [ ] 12. Checkpoint - Full integration test, routing works, lazy loading verified
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Write tests
  - [ ]* 13.1 Write property test for station identifier validation (Property 1)
    - **Property 1: Station Identifier Validation**
    - Test that for any string, the QR scanner accepts it iff it matches `/^[a-f0-9]+:\d{2}$/`
    - Use fast-check to generate arbitrary strings and hex-digit combinations
    - **Validates: Requirements 2.1, 2.2**

  - [ ]* 13.2 Write property test for scan state machine clock-in vs clock-out (Property 2)
    - **Property 2: Scan State Machine — Clock-In vs Clock-Out**
    - Test that with no Active_Entry the scanner transitions to category-select, and with Active_Entry it transitions to processing
    - Use fast-check to generate scan scenarios with/without active entries
    - **Validates: Requirements 3.1, 3.2**

  - [ ]* 13.3 Write property test for submit guard (Property 3)
    - **Property 3: Submit Guard — Category and GPS Required for Clock-In**
    - Test that submit is enabled iff both category is selected AND GPS is acquired for clock-in flows
    - Use fast-check to generate all combinations of category/GPS/scanType states
    - **Validates: Requirements 4.2, 4.3, 5.3**

  - [ ]* 13.4 Write property test for scan idempotency (Property 4)
    - **Property 4: Scan Idempotency**
    - Test that while scanState is 'processing', no additional scans can be dispatched
    - Use fast-check to simulate rapid scan sequences
    - **Validates: Requirement 5.4**

  - [ ]* 13.5 Write property test for station limit invariant (Property 7)
    - **Property 7: Station Limit Invariant**
    - Test that the register button is disabled when station count >= 6 for any site
    - Use fast-check to generate station arrays of varying lengths
    - **Validates: Requirement 6.4**

  - [ ]* 13.6 Write property test for date range validation (Property 11)
    - **Property 11: Date Range Validation**
    - Test that for any two dates, validation passes iff start < end and span <= 90 days
    - Use fast-check to generate arbitrary date pairs
    - **Validates: Requirements 9.6, 9.7, 10.2, 10.3**

  - [ ]* 13.7 Write property test for reconciliation arithmetic invariant (Property 12)
    - **Property 12: Reconciliation Report Arithmetic Invariant**
    - Test that `matchCount + discrepancyCount === totalRecordsCompared` for any report
    - Use fast-check to generate report objects with arbitrary counts
    - **Validates: Requirement 10.6**

  - [ ]* 13.8 Write property test for discrepancy resolution state machine (Property 14)
    - **Property 14: Discrepancy Resolution State Machine**
    - Test that resolve/escalate actions are available only when status is 'Pending' or 'Escalated', hidden when 'Resolved'
    - Use fast-check to generate discrepancies in all status states
    - **Validates: Requirement 11.4**

  - [ ]* 13.9 Write unit tests for NgRx reducers and selectors
    - Test station reducer: addOne, addMany, updateOne for all station actions
    - Test scan reducer: processing flag, lastScanResult, error handling
    - Test attendance reducer: records loading, summary updates, filter changes
    - Test reconciliation reducer: report entity management, discrepancy updates
    - Test all selectors with mocked state slices
    - _Requirements: 5.5, 6.3, 9.1, 10.5, 11.6_

  - [ ]* 13.10 Write unit tests for HTTP services
    - Test QrScanService: correct POST request formation, response mapping (camelCase + PascalCase), error handling for 409/400/404
    - Test StationService: getStationsForSite, registerStation, deactivateStation, getStationMap with HttpTestingModule
    - Test AttendanceService: correct query param formation for all filter combinations
    - Test ReconciliationService: generateReport, resolveDiscrepancy, escalateDiscrepancy request/response handling
    - _Requirements: 5.1, 5.6, 5.7, 5.8, 6.2, 10.1, 11.3, 11.5_

  - [ ]* 13.11 Write unit tests for QrScannerComponent
    - Test camera initialization success/failure paths
    - Test GPS acquisition status transitions
    - Test QR decode → validation → state transition flow
    - Test submit button enable/disable conditions
    - Test offline queueing behavior
    - Mock html5-qrcode and GeolocationService
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 5.3, 5.4, 13.1, 13.2_

- [ ] 14. Final checkpoint - All tests pass, feature complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The design uses TypeScript (Angular 18.2) throughout; no language selection was needed
- All components use ChangeDetectionStrategy.OnPush for performance
- The module is lazy-loaded to maintain zero impact on initial bundle size
- Existing infrastructure (GeolocationService, FrmSignalRService, OfflineQueueService, AuthService) is reused without modification

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.3", "2.4"] },
    { "id": 2, "tasks": ["4.1"] },
    { "id": 3, "tasks": ["4.2", "4.3"] },
    { "id": 4, "tasks": ["4.4", "4.5"] },
    { "id": 5, "tasks": ["6.1", "6.2", "6.4", "8.1", "8.2", "8.3", "8.4"] },
    { "id": 6, "tasks": ["6.3"] },
    { "id": 7, "tasks": ["10.1", "10.2", "11.1"] },
    { "id": 8, "tasks": ["13.1", "13.2", "13.3", "13.4", "13.5", "13.6", "13.7", "13.8"] },
    { "id": 9, "tasks": ["13.9", "13.10", "13.11"] }
  ]
}
```
