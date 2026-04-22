# Implementation Plan: Backend Service Integration

## Overview

This implementation plan converts the backend service integration design into actionable coding tasks. The existing NgRx state management (actions, reducers, effects, selectors) is complete, but all service implementations use placeholder TODO comments. This plan replaces those placeholders with real HTTP-based API integrations.

The implementation follows an incremental approach: foundation setup → core services → feature flag services → file upload services → NgRx integration → comprehensive testing.

## Tasks

- [ ] 1. Set up foundation and shared infrastructure
  - [ ] 1.1 Create shared data models and DTOs
    - Create domain models (Job, Technician, TimeEntry, Assignment, Notification, etc.) in `src/app/features/field-resource-management/models/`
    - Create DTO interfaces for all API requests/responses
    - Create enums (JobStatus, JobPriority, TechnicianRole, SkillLevel, ConflictType, etc.)
    - Create shared interfaces (Location, GeoLocation, DateRange, Filters, etc.)
    - _Requirements: 1.10, 28.1, 28.2_

  - [ ] 1.2 Implement centralized error handling
    - Create base error handler function with status code mapping (400→"Invalid request", 401→"Unauthorized", 403→"Access denied", 404→resource-specific, 409→conflict-specific, 413→"File too large", 415→"Unsupported file type", 500→"Server error")
    - Implement error logging to console with stack trace preservation
    - Create error transformation utilities for Observable errors
    - _Requirements: 26.1, 26.2, 26.3, 26.4, 26.5, 26.6, 26.7, 26.8, 26.9, 26.10_

  - [ ] 1.3 Implement HTTP retry logic
    - Create retry operator for GET requests with 2 retry attempts
    - Implement exponential backoff between retries
    - Add conditional retry logic (skip 4xx errors, retry 5xx errors)
    - Ensure POST/PUT/PATCH/DELETE requests are not retried
    - _Requirements: 1.9, 29.1, 29.2, 29.3, 29.4, 29.5_

  - [ ] 1.4 Create response transformation utilities
    - Implement date parsing utility for ISO date strings to Date objects
    - Create null/undefined handling utilities with appropriate defaults
    - Implement field validation utilities for required fields
    - Create generic response transformer function
    - _Requirements: 28.2, 28.3, 28.4, 28.5_


- [ ] 2. Implement JobService with full CRUD operations
  - [ ] 2.1 Implement core Job CRUD methods
    - Implement `getJobs(filters?)` with GET /api/jobs
    - Implement `getJobById(id)` with GET /api/jobs/{id}
    - Implement `createJob(job)` with POST /api/jobs
    - Implement `updateJob(id, job)` with PUT /api/jobs/{id}
    - Implement `deleteJob(id)` with DELETE /api/jobs/{id}
    - Implement `deleteJobs(ids)` with DELETE /api/jobs (batch)
    - Include authentication headers from ApiHeadersService
    - Use Environment_Config.apiUrl as base URL
    - Transform API responses to Job model objects
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.7, 1.8, 1.10, 14.1_

  - [ ] 2.2 Implement Job status management methods
    - Implement `updateJobStatus(id, status, reason?)` with PATCH /api/jobs/{id}/status
    - Implement `getJobStatusHistory(id)` with GET /api/jobs/{id}/status-history
    - Require reason parameter when status is "Issue"
    - Include timestamp and user information in status updates
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ] 2.3 Implement Job notes methods
    - Implement `addJobNote(id, note)` with POST /api/jobs/{id}/notes
    - Implement `getJobNotes(id)` with GET /api/jobs/{id}/notes
    - Include author and timestamp in note creation
    - Support notes up to 2000 characters
    - Return notes in chronological order
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ] 2.4 Implement Job attachments methods
    - Implement `uploadJobAttachment(id, file)` with POST /api/jobs/{id}/attachments (multipart/form-data)
    - Implement `getJobAttachments(id)` with GET /api/jobs/{id}/attachments
    - Enable upload progress reporting with HttpRequest reportProgress
    - Validate file size (max 10 MB) before upload
    - Validate file formats (JPEG, PNG, HEIC, PDF, documents)
    - Handle 413 error with "File too large" message
    - Handle 415 error with "Unsupported file type" message
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

  - [ ]* 2.5 Write unit tests for JobService
    - Test all CRUD operations with mock HTTP responses
    - Test error handling for all status codes
    - Test retry logic for GET requests
    - Test batch delete operations
    - Test file upload validation and progress reporting
    - _Requirements: 1.1-1.10, 7.1-7.5, 8.1-8.5, 9.1-9.7_

- [ ] 3. Implement TechnicianService with profile and skills management
  - [ ] 3.1 Implement core Technician CRUD methods
    - Implement `getTechnicians(filters?)` with GET /api/technicians
    - Implement `getTechnicianById(id)` with GET /api/technicians/{id}
    - Implement `createTechnician(technician)` with POST /api/technicians
    - Implement `updateTechnician(id, technician)` with PUT /api/technicians/{id}
    - Implement `deleteTechnician(id)` with DELETE /api/technicians/{id}
    - Include authentication headers from ApiHeadersService
    - Transform API responses to Technician model objects
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ] 3.2 Implement role-based market filtering
    - Add market filtering for CM users in `getTechnicians()`
    - Skip market filtering for Admin users
    - Implement `validateTechnicianAssignment(technicianId, projectMarket)` for CM validation
    - _Requirements: 2.11, 2.12, 18.2, 18.3_

  - [ ] 3.3 Implement skills management methods
    - Implement `getTechnicianSkills(id)` with GET /api/technicians/{id}/skills
    - Implement `addTechnicianSkill(id, skill)` with POST /api/technicians/{id}/skills
    - Implement `removeTechnicianSkill(id, skillId)` with DELETE /api/technicians/{id}/skills/{skillId}
    - _Requirements: 2.6, 2.7, 2.8, 11.1, 11.2_

  - [ ] 3.4 Implement certifications management methods
    - Implement `getTechnicianCertifications(id)` with GET /api/technicians/{id}/certifications
    - Implement `getExpiringCertifications(daysThreshold)` with GET /api/technicians/certifications/expiring
    - Include certification name, issue date, and expiration date
    - _Requirements: 2.9, 2.10, 11.3, 11.4, 11.5, 11.6, 11.7_

  - [ ] 3.5 Implement availability management methods
    - Implement `getTechnicianAvailability(id, dateRange)` with GET /api/technicians/{id}/availability
    - Implement `updateTechnicianAvailability(id, availability)` with PUT /api/technicians/{id}/availability
    - Support marking specific dates as unavailable
    - Support marking date ranges as unavailable
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ]* 3.6 Write unit tests for TechnicianService
    - Test all CRUD operations with mock HTTP responses
    - Test role-based market filtering for CM and Admin users
    - Test skills and certifications management
    - Test availability management
    - Test error handling
    - _Requirements: 2.1-2.12, 10.1-10.5, 11.1-11.7_


- [ ] 4. Implement TimeTrackingService with geolocation support
  - [ ] 4.1 Implement clock in/out methods
    - Implement `clockIn(jobId, technicianId, captureLocation?)` with POST /api/time-entries/clock-in
    - Implement `clockOut(timeEntryId, captureLocation?, manualMileage?)` with POST /api/time-entries/clock-out
    - Capture geolocation (latitude, longitude, accuracy) when enabled
    - Proceed without location data if geolocation fails (graceful degradation)
    - _Requirements: 3.1, 3.2, 3.9, 3.10_

  - [ ] 4.2 Implement time entry retrieval methods
    - Implement `getTimeEntries(filters?)` with GET /api/time-entries
    - Implement `getActiveTimeEntry(technicianId)` with GET /api/time-entries/active
    - Implement `getTimeEntriesByJob(jobId)` with GET /api/time-entries/by-job/{jobId}
    - Implement `getTimeEntriesByTechnician(technicianId, dateRange)` with GET /api/time-entries/by-technician/{technicianId}
    - Transform API responses to TimeEntry model objects
    - _Requirements: 3.3, 3.4, 3.5, 3.6_

  - [ ] 4.3 Implement time entry management methods
    - Implement `updateTimeEntry(id, entry)` with PUT /api/time-entries/{id} (admin only)
    - Implement `calculateLaborHours(jobId)` with GET /api/time-entries/labor-summary/{jobId}
    - Include adjustment reason for manual time adjustments
    - _Requirements: 3.7, 3.8_

  - [ ]* 4.4 Write unit tests for TimeTrackingService
    - Test clock in/out with and without geolocation
    - Test geolocation failure graceful degradation
    - Test time entry retrieval with various filters
    - Test manual time adjustments (admin only)
    - Test labor hour calculations
    - Test error handling
    - _Requirements: 3.1-3.10_

- [ ] 5. Implement SchedulingService with conflict detection
  - [ ] 5.1 Implement assignment methods
    - Implement `assignTechnician(jobId, technicianId, overrideConflicts?, justification?)` with POST /api/scheduling/assign
    - Implement `unassignTechnician(assignmentId)` with DELETE /api/scheduling/assignments/{id}
    - Implement `reassignJob(jobId, fromTechnicianId, toTechnicianId, reason?)` with POST /api/scheduling/reassign
    - Require justification when overrideConflicts is true
    - _Requirements: 4.1, 4.2, 4.3, 4.10_

  - [ ] 5.2 Implement assignment retrieval methods
    - Implement `getAssignments(filters?)` with GET /api/scheduling/assignments
    - Implement `getTechnicianSchedule(technicianId, dateRange)` with GET /api/scheduling/schedule/{technicianId}
    - Transform API responses to Assignment and ScheduleItem model objects
    - _Requirements: 4.4, 4.8_

  - [ ] 5.3 Implement conflict detection methods
    - Implement `checkConflicts(technicianId, jobId)` with GET /api/scheduling/conflicts/check
    - Implement `detectAllConflicts(dateRange?)` with GET /api/scheduling/conflicts
    - Return conflict details including conflicting job IDs and time ranges
    - Support optional date range filtering
    - _Requirements: 4.5, 4.6, 12.1, 12.2, 12.3, 12.4, 12.5_

  - [ ] 5.4 Implement skill matching methods
    - Implement `getQualifiedTechnicians(jobId)` with GET /api/scheduling/qualified-technicians/{jobId}
    - Return technicians ranked by skill match percentage
    - Include availability status and current workload
    - Display technicians without required skills separately with missing skills indicated
    - _Requirements: 4.7, 13.1, 13.2, 13.3, 13.4, 13.5_

  - [ ] 5.5 Implement bulk assignment methods
    - Implement `bulkAssign(assignments)` with POST /api/scheduling/bulk-assign
    - Return individual success/failure results for each operation
    - Validate each operation independently
    - Continue processing remaining operations when individual operations fail
    - _Requirements: 4.9, 14.2, 14.3, 14.4, 14.5_

  - [ ]* 5.6 Write unit tests for SchedulingService
    - Test assignment, unassignment, and reassignment operations
    - Test conflict detection with various scenarios
    - Test skill matching and qualified technician ranking
    - Test bulk assignment with partial failures
    - Test conflict override with justification requirement
    - Test error handling
    - _Requirements: 4.1-4.10, 12.1-12.5, 13.1-13.5, 14.2-14.5_


- [ ] 6. Implement ReportingService with caching
  - [ ] 6.1 Implement report retrieval methods
    - Implement `getDashboardMetrics()` with GET /api/reports/dashboard
    - Implement `getUtilizationReport(dateRange)` with GET /api/reports/utilization
    - Implement `getPerformanceReport(dateRange)` with GET /api/reports/performance
    - Implement `getKPIs()` with GET /api/reports/kpis
    - Implement `getScheduleAdherence(dateRange)` with GET /api/reports/schedule-adherence
    - Transform API responses to report model objects
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ] 6.2 Implement report caching
    - Cache dashboard metrics for 5 minutes
    - Cache utilization report for 1 minute
    - Cache performance report for 1 minute
    - Cache KPI data for 5 minutes
    - Cache schedule adherence for 1 minute
    - Invalidate caches when underlying data changes
    - _Requirements: 5.7, 5.8, 5.9, 5.10_

  - [ ] 6.3 Implement report export methods
    - Implement `exportReport(reportType, format, filters?)` with GET /api/reports/export/{reportType}
    - Support CSV and PDF formats
    - Include filter parameters in export requests
    - Return Blob responses for exported files
    - Support exporting utilization, performance, dashboard, and schedule adherence reports
    - _Requirements: 5.6, 15.1, 15.2, 15.3, 15.4, 15.5_

  - [ ]* 6.4 Write unit tests for ReportingService
    - Test all report retrieval methods
    - Test caching behavior with TTL enforcement
    - Test cache invalidation on data mutations
    - Test report export with different formats
    - Test error handling
    - _Requirements: 5.1-5.10, 15.1-15.5_

- [ ] 7. Implement NotificationService with ARK integration
  - [ ] 7.1 Implement notification retrieval methods
    - Implement `getNotifications(filters?)` with GET /api/notifications
    - Implement `getUnreadCount()` with GET /api/notifications/unread-count
    - Transform API responses to Notification model objects
    - _Requirements: 6.1, 6.4_

  - [ ] 7.2 Implement notification management methods
    - Implement `markAsRead(id)` with PATCH /api/notifications/{id}/read
    - Implement `markAllAsRead()` with PATCH /api/notifications/read-all
    - Implement `deleteNotification(id)` with DELETE /api/notifications/{id}
    - _Requirements: 6.2, 6.3, 6.7_

  - [ ] 7.3 Implement notification preferences methods
    - Implement `getPreferences()` with GET /api/notifications/preferences
    - Implement `updatePreferences(preferences)` with PUT /api/notifications/preferences
    - Respect user notification preferences when sending notifications
    - _Requirements: 6.5, 6.6, 6.10_

  - [ ] 7.4 Integrate with FrmNotificationAdapterService
    - Delegate notification creation to FrmNotificationAdapterService for ARK integration
    - Support notification types: job assigned, job reassigned, job status changed, job cancelled, certification expiring, conflict detected
    - _Requirements: 6.8, 6.9_

  - [ ]* 7.5 Write unit tests for NotificationService
    - Test notification retrieval with filters
    - Test mark as read operations
    - Test notification preferences management
    - Test ARK integration via FrmNotificationAdapterService
    - Test error handling
    - _Requirements: 6.1-6.10_

- [ ] 8. Implement CacheService for response caching
  - [ ] 8.1 Implement cache storage and retrieval
    - Implement `get<T>(key)` to retrieve cached values
    - Implement `set<T>(key, value, ttlSeconds)` to store values with TTL
    - Use in-memory storage for cache data
    - _Requirements: 5.7, 5.8, 5.9_

  - [ ] 8.2 Implement cache invalidation
    - Implement `invalidate(key)` to remove specific cache entries
    - Implement `invalidatePattern(pattern)` to remove entries matching pattern
    - Implement `clear()` to remove all cache entries
    - _Requirements: 5.10_

  - [ ] 8.3 Implement TTL enforcement
    - Check TTL on cache retrieval
    - Return null if TTL has expired
    - Automatically remove expired entries
    - _Requirements: 5.7, 5.8, 5.9_

  - [ ]* 8.4 Write unit tests for CacheService
    - Test cache storage and retrieval
    - Test TTL enforcement
    - Test cache invalidation by key and pattern
    - Test cache clearing
    - _Requirements: 5.7-5.10_


- [ ] 9. Implement FrmSignalRService for real-time updates
  - [ ] 9.1 Implement SignalR connection management
    - Implement `connect()` to establish WebSocket connection
    - Implement `disconnect()` to close connection
    - Implement `isConnected()` to check connection status
    - Check liveUpdates feature flag before establishing connection
    - _Requirements: 16.1, 16.2, 16.3_

  - [ ] 9.2 Implement event listeners
    - Implement `onJobAssigned(callback)` to listen for job assignment events
    - Implement `onJobStatusChanged(callback)` to listen for job status change events
    - Implement `onNotificationReceived(callback)` to listen for notification events
    - _Requirements: 16.4_

  - [ ] 9.3 Implement NgRx action dispatch
    - Dispatch corresponding NgRx actions when real-time events are received
    - Update application state via NgRx store
    - _Requirements: 16.5_

  - [ ]* 9.4 Write unit tests for FrmSignalRService
    - Test connection establishment when liveUpdates flag is enabled
    - Test connection not attempted when liveUpdates flag is disabled
    - Test event listeners and callbacks
    - Test NgRx action dispatch on events
    - Test error handling
    - _Requirements: 16.1-16.5_

- [ ] 10. Implement OfflineQueueService for offline mode
  - [ ] 10.1 Implement request queuing
    - Implement `queueRequest(request)` to store failed API requests
    - Implement `getQueueSize()` to return number of queued requests
    - Implement `isOffline()` to check offline status
    - Check offlineMode feature flag before queuing
    - _Requirements: 17.1, 17.2_

  - [ ] 10.2 Implement queue replay
    - Implement `replayQueue()` to replay queued requests when connectivity restored
    - Return individual results for each replayed request
    - Remove successfully replayed requests from queue
    - _Requirements: 17.4_

  - [ ] 10.3 Implement offline notifications
    - Notify users when operating in offline mode
    - Notify users when connectivity is restored
    - _Requirements: 17.5_

  - [ ] 10.4 Implement queue management
    - Implement `clearQueue()` to remove all queued requests
    - Persist queue to localStorage for app restarts
    - _Requirements: 17.2_

  - [ ]* 10.5 Write unit tests for OfflineQueueService
    - Test request queuing when offlineMode flag is enabled
    - Test queue not used when offlineMode flag is disabled
    - Test queue replay on connectivity restore
    - Test offline notifications
    - Test queue persistence
    - _Requirements: 17.1-17.5_

- [ ] 11. Implement AzureBlobStorageService for photo uploads
  - [ ] 11.1 Implement photo upload
    - Implement `uploadPhoto(file, deploymentId)` with POST to Azure Blob Storage API
    - Generate unique blob names using timestamp and original filename
    - Use SAS tokens for authentication
    - Report upload progress
    - Return blob URL after successful upload
    - _Requirements: 24.1, 24.2, 24.3, 24.4, 24.7, 24.9_

  - [ ] 11.2 Implement file validation
    - Implement `validateFile(file)` to check file format (JPEG, PNG, HEIC)
    - Validate file size does not exceed 10 MB
    - Return validation errors before upload
    - _Requirements: 24.5, 24.6_

  - [ ] 11.3 Implement blob name generation
    - Implement `generateBlobName(originalFilename)` to create unique names
    - Use format: `{timestamp}_{originalFilename}`
    - _Requirements: 24.3_

  - [ ] 11.4 Store blob URLs in deployment records
    - Update deployment records with blob URLs after successful upload
    - _Requirements: 24.10_

  - [ ]* 11.5 Write unit tests for AzureBlobStorageService
    - Test photo upload with progress reporting
    - Test file validation for format and size
    - Test unique blob name generation
    - Test SAS token authentication
    - Test error handling
    - _Requirements: 24.1-24.10_


- [ ] 12. Implement FlukeUploadService for test file uploads
  - [ ] 12.1 Implement test file upload
    - Implement `uploadTestFile(file, deploymentId)` with POST to Fluke pipeline API
    - Report upload progress
    - Return processing status after upload
    - _Requirements: 25.1, 25.2, 25.5, 25.6_

  - [ ] 12.2 Implement batch upload
    - Implement `uploadBatch(files, deploymentId)` for multiple test files
    - Return individual results for each file
    - _Requirements: 25.9_

  - [ ] 12.3 Implement file validation
    - Implement `validateFile(file)` to check file format
    - Validate file size does not exceed 50 MB
    - Return validation errors before upload
    - _Requirements: 25.3, 25.4_

  - [ ] 12.4 Implement processing status tracking
    - Implement `getProcessingStatus(uploadId)` to check processing status
    - Notify users when processing is complete
    - _Requirements: 25.6, 25.10_

  - [ ] 12.5 Store file references in deployment records
    - Update deployment records with file references after successful upload
    - _Requirements: 25.8_

  - [ ]* 12.6 Write unit tests for FlukeUploadService
    - Test single file upload with progress reporting
    - Test batch upload with multiple files
    - Test file validation for format and size
    - Test processing status tracking
    - Test error handling
    - _Requirements: 25.1-25.10_

- [ ] 13. Update FeatureFlagService with new flags
  - [ ] 13.1 Add feature flags for FRM features
    - Add liveUpdates flag for SignalR real-time updates
    - Add offlineMode flag for offline queue functionality
    - Add roleBasedWorkflow flag for role-based filtering
    - Add deploymentNotifications flag for deployment SignalR
    - Add signOffRequired flag for deployment sign-off
    - Add deploymentAutoAssign flag for auto-assignment
    - Add deploymentStrictRoles flag for strict role enforcement
    - Add deploymentRoleColors flag for role color coding
    - _Requirements: 16.1, 17.1, 18.1, 19.1, 20.1, 21.1, 22.1, 23.1_

  - [ ] 13.2 Implement feature flag checking in services
    - Check liveUpdates flag in FrmSignalRService before connecting
    - Check offlineMode flag in OfflineQueueService before queuing
    - Check roleBasedWorkflow flag in TechnicianService for market filtering
    - _Requirements: 16.2, 16.3, 17.2, 17.3, 18.2, 18.3, 18.4_

  - [ ]* 13.3 Write unit tests for feature flag integration
    - Test each service with feature flags enabled and disabled
    - Test feature flag toggling behavior
    - _Requirements: 16.1-16.5, 17.1-17.5, 18.1-18.5, 19.1-19.5, 20.1-20.5, 21.1-21.5, 22.1-22.5, 23.1-23.5_

- [ ] 14. Checkpoint - Ensure all services are implemented
  - Verify all 11 services are implemented with correct HTTP methods and endpoints
  - Verify all services include authentication headers
  - Verify all services use Environment_Config.apiUrl
  - Verify all services implement error handling
  - Verify all services implement retry logic for GET requests
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 15. Update NgRx effects to use real services
  - [ ] 15.1 Update Job effects
    - Replace TODO comments in job.effects.ts with real JobService calls
    - Update loadJobs$, loadJobById$, createJob$, updateJob$, deleteJob$, deleteJobs$ effects
    - Update updateJobStatus$, loadJobStatusHistory$, addJobNote$, loadJobNotes$ effects
    - Update uploadJobAttachment$, loadJobAttachments$ effects
    - Ensure effects dispatch success/failure actions correctly
    - _Requirements: 1.1-1.10, 7.1-7.5, 8.1-8.5, 9.1-9.7_

  - [ ] 15.2 Update Technician effects
    - Replace TODO comments in technician.effects.ts with real TechnicianService calls
    - Update loadTechnicians$, loadTechnicianById$, createTechnician$, updateTechnician$, deleteTechnician$ effects
    - Update loadTechnicianSkills$, addTechnicianSkill$, removeTechnicianSkill$ effects
    - Update loadTechnicianCertifications$, loadExpiringCertifications$ effects
    - Update loadTechnicianAvailability$, updateTechnicianAvailability$ effects
    - Ensure effects dispatch success/failure actions correctly
    - _Requirements: 2.1-2.12, 10.1-10.5, 11.1-11.7_

  - [ ] 15.3 Update Time Tracking effects
    - Replace TODO comments in time-tracking.effects.ts with real TimeTrackingService calls
    - Update clockIn$, clockOut$, loadTimeEntries$, updateTimeEntry$ effects
    - Update loadActiveTimeEntry$, loadTimeEntriesByJob$, loadTimeEntriesByTechnician$ effects
    - Update calculateLaborHours$ effect
    - Ensure effects dispatch success/failure actions correctly
    - _Requirements: 3.1-3.10_

  - [ ] 15.4 Update Scheduling effects
    - Replace TODO comments in scheduling.effects.ts with real SchedulingService calls
    - Update assignTechnician$, unassignTechnician$, reassignJob$ effects
    - Update loadAssignments$, checkConflicts$, detectAllConflicts$ effects
    - Update loadQualifiedTechnicians$, loadTechnicianSchedule$, bulkAssign$ effects
    - Ensure effects dispatch success/failure actions correctly
    - _Requirements: 4.1-4.10, 12.1-12.5, 13.1-13.5, 14.2-14.5_

  - [ ] 15.5 Update Reporting effects
    - Replace TODO comments in reporting.effects.ts with real ReportingService calls
    - Update loadDashboardMetrics$, loadUtilizationReport$, loadPerformanceReport$ effects
    - Update loadKPIs$, loadScheduleAdherence$, exportReport$ effects
    - Ensure effects dispatch success/failure actions correctly
    - _Requirements: 5.1-5.10, 15.1-15.5_

  - [ ] 15.6 Update Notification effects
    - Replace TODO comments in notification.effects.ts with real NotificationService calls
    - Update loadNotifications$, markAsRead$, markAllAsRead$ effects
    - Update loadUnreadCount$, loadPreferences$, updatePreferences$, deleteNotification$ effects
    - Ensure effects dispatch success/failure actions correctly
    - _Requirements: 6.1-6.10_

  - [ ]* 15.7 Write integration tests for NgRx effects
    - Test each effect with real service calls (mocked HTTP)
    - Test success action dispatch
    - Test failure action dispatch on errors
    - Test effect error handling
    - _Requirements: All service requirements_

- [ ] 16. Checkpoint - Ensure NgRx integration is complete
  - Verify all TODO comments are removed from effects
  - Verify all effects use real service calls
  - Verify all effects dispatch correct success/failure actions
  - Verify error handling works end-to-end
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 17. Implement property-based tests for HTTP and authentication properties
  - [ ]* 17.1 Write property test for HTTP method and endpoint correctness
    - **Property 1: HTTP Method and Endpoint Correctness**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 2.1-2.12, 3.1-3.10, 4.1-4.10, 6.1-6.10, 7.1-7.5, 8.1-8.5, 9.1-9.2, 10.1-10.5, 11.1-11.7, 12.1-12.5, 13.1-13.5, 15.1-15.5**
    - Generate arbitrary service method calls with fast-check
    - Verify correct HTTP method (GET, POST, PUT, PATCH, DELETE) is used
    - Verify correct API endpoint path is targeted
    - Run 100 iterations

  - [ ]* 17.2 Write property test for authentication header inclusion
    - **Property 2: Authentication Header Inclusion**
    - **Validates: Requirements 1.7, 27.1, 27.2, 27.3**
    - Generate arbitrary HTTP requests across all services
    - Verify Authorization header is included
    - Verify X-Market header is included for CM users
    - Run 100 iterations

  - [ ]* 17.3 Write property test for base URL configuration
    - **Property 3: Base URL Configuration**
    - **Validates: Requirements 1.8, 30.1, 30.2, 30.3, 30.4**
    - Generate arbitrary API endpoint URLs
    - Verify all URLs start with Environment_Config.apiUrl
    - Run 100 iterations

  - [ ]* 17.4 Write property test for error status code transformation
    - **Property 4: Error Status Code Transformation**
    - **Validates: Requirements 1.6, 26.1, 26.2, 26.3, 26.4, 26.5, 26.6, 26.7, 26.8**
    - Generate arbitrary HTTP error responses with status codes
    - Verify correct error message transformation (400→"Invalid request", 401→"Unauthorized", etc.)
    - Run 100 iterations

  - [ ]* 17.5 Write property test for error logging and stack trace preservation
    - **Property 5: Error Logging and Stack Trace Preservation**
    - **Validates: Requirements 26.8, 26.9, 26.10**
    - Generate arbitrary HTTP errors
    - Verify errors are logged to console
    - Verify stack traces are preserved in Observable errors
    - Run 100 iterations

  - [ ]* 17.6 Write property test for GET request retry logic
    - **Property 6: GET Request Retry Logic**
    - **Validates: Requirements 1.9, 29.1**
    - Generate arbitrary GET requests that fail
    - Verify requests are retried up to 2 times
    - Run 100 iterations

  - [ ]* 17.7 Write property test for non-GET request no retry
    - **Property 7: Non-GET Request No Retry**
    - **Validates: Requirements 29.2**
    - Generate arbitrary POST/PUT/PATCH/DELETE requests that fail
    - Verify requests are NOT retried
    - Run 100 iterations

  - [ ]* 17.8 Write property test for 4xx error no retry
    - **Property 8: 4xx Error No Retry**
    - **Validates: Requirements 29.4**
    - Generate arbitrary requests that fail with 4xx status codes
    - Verify requests are NOT retried regardless of HTTP method
    - Run 100 iterations

  - [ ]* 17.9 Write property test for 5xx error retry for GET
    - **Property 9: 5xx Error Retry for GET**
    - **Validates: Requirements 29.5**
    - Generate arbitrary GET requests that fail with 5xx status codes
    - Verify requests are retried up to 2 times
    - Run 100 iterations


- [ ] 18. Implement property-based tests for response transformation
  - [ ]* 18.1 Write property test for response date parsing
    - **Property 10: Response Date Parsing**
    - **Validates: Requirements 1.10, 28.2**
    - Generate arbitrary API responses with ISO date string fields
    - Verify date strings are parsed into JavaScript Date objects
    - Run 100 iterations

  - [ ]* 18.2 Write property test for response null handling
    - **Property 11: Response Null Handling**
    - **Validates: Requirements 28.3**
    - Generate arbitrary API responses with null/undefined values
    - Verify responses are handled gracefully without errors
    - Verify appropriate defaults are applied
    - Run 100 iterations

  - [ ]* 18.3 Write property test for response field validation
    - **Property 12: Response Field Validation**
    - **Validates: Requirements 28.4, 28.5**
    - Generate arbitrary API responses with missing required fields
    - Verify validation errors are returned with descriptive messages
    - Run 100 iterations

- [ ] 19. Implement property-based tests for caching
  - [ ]* 19.1 Write property test for cache TTL enforcement
    - **Property 13: Cache TTL Enforcement**
    - **Validates: Requirements 5.7, 5.8, 5.9**
    - Generate arbitrary cached API responses with TTL values
    - Verify cached values are served within TTL period
    - Verify fresh data is fetched after TTL expiration
    - Run 100 iterations

  - [ ]* 19.2 Write property test for cache invalidation on mutation
    - **Property 14: Cache Invalidation on Mutation**
    - **Validates: Requirements 5.10**
    - Generate arbitrary data mutation operations (POST/PUT/PATCH/DELETE)
    - Verify related cache entries are invalidated
    - Verify subsequent reads return fresh data
    - Run 100 iterations

- [ ] 20. Implement property-based tests for batch operations
  - [ ]* 20.1 Write property test for batch operation isolation
    - **Property 15: Batch Operation Isolation**
    - **Validates: Requirements 14.3, 14.4, 14.5**
    - Generate arbitrary batch operations with some failures
    - Verify remaining operations continue processing
    - Verify individual success/failure results are returned
    - Run 100 iterations

- [ ] 21. Implement property-based tests for file uploads
  - [ ]* 21.1 Write property test for file size validation
    - **Property 16: File Size Validation**
    - **Validates: Requirements 9.4, 24.6, 25.4**
    - Generate arbitrary file upload operations with various file sizes
    - Verify files exceeding max size (10 MB for attachments/photos, 50 MB for Fluke) are rejected
    - Verify "File too large" error is returned
    - Run 100 iterations

  - [ ]* 21.2 Write property test for file format validation
    - **Property 17: File Format Validation**
    - **Validates: Requirements 9.5, 24.5**
    - Generate arbitrary file upload operations with various file formats
    - Verify unsupported formats are rejected
    - Verify "Unsupported file type" error is returned
    - Run 100 iterations

  - [ ]* 21.3 Write property test for upload progress reporting
    - **Property 18: Upload Progress Reporting**
    - **Validates: Requirements 9.3, 24.7, 25.5**
    - Generate arbitrary file upload operations
    - Verify upload progress is reported using HttpRequest with reportProgress
    - Verify progress percentage is tracked
    - Run 100 iterations


- [ ] 22. Implement property-based tests for feature flags
  - [ ]* 22.1 Write property test for feature flag enabled behavior
    - **Property 19: Feature Flag Enabled Behavior**
    - **Validates: Requirements 16.2, 17.2, 18.2, 19.2, 20.2, 21.2, 22.2, 23.2**
    - Generate arbitrary feature flag configurations with flags enabled
    - Verify associated service functionality is activated (SignalR connects, offline queue active, etc.)
    - Run 100 iterations

  - [ ]* 22.2 Write property test for feature flag disabled behavior
    - **Property 20: Feature Flag Disabled Behavior**
    - **Validates: Requirements 16.3, 17.4, 18.4, 19.4, 20.4, 21.5, 22.4, 23.4**
    - Generate arbitrary feature flag configurations with flags disabled
    - Verify associated service functionality is deactivated (SignalR not attempted, offline queue inactive, etc.)
    - Run 100 iterations

- [ ] 23. Implement property-based tests for role-based access
  - [ ]* 23.1 Write property test for role-based market filtering for CM users
    - **Property 21: Role-Based Market Filtering for CM Users**
    - **Validates: Requirements 2.11**
    - Generate arbitrary technician retrieval requests by CM users
    - Verify user's market is included in request parameters
    - Verify returned results only include technicians from that market
    - Run 100 iterations

  - [ ]* 23.2 Write property test for role-based no filtering for Admin users
    - **Property 22: Role-Based No Filtering for Admin Users**
    - **Validates: Requirements 2.12**
    - Generate arbitrary technician retrieval requests by Admin users
    - Verify market filtering parameters are NOT included
    - Verify returned results include all technicians regardless of market
    - Run 100 iterations

- [ ] 24. Implement property-based tests for geolocation
  - [ ]* 24.1 Write property test for geolocation capture on clock in/out
    - **Property 23: Geolocation Capture on Clock In/Out**
    - **Validates: Requirements 3.9**
    - Generate arbitrary clock in/out operations with geolocation enabled
    - Verify geolocation (latitude, longitude, accuracy) is captured
    - Run 100 iterations

  - [ ]* 24.2 Write property test for geolocation failure graceful degradation
    - **Property 24: Geolocation Failure Graceful Degradation**
    - **Validates: Requirements 3.10**
    - Generate arbitrary clock in/out operations where geolocation fails
    - Verify operations proceed without location data
    - Verify operations do not fail entirely
    - Run 100 iterations

- [ ] 25. Implement property-based tests for conflict management
  - [ ]* 25.1 Write property test for conflict override justification requirement
    - **Property 25: Conflict Override Justification Requirement**
    - **Validates: Requirements 4.10**
    - Generate arbitrary assignment operations with conflict override requested
    - Verify justification parameter is required
    - Verify error is returned if justification is missing
    - Run 100 iterations


- [ ] 26. Implement property-based tests for Azure Blob Storage
  - [ ]* 26.1 Write property test for unique blob name generation
    - **Property 26: Unique Blob Name Generation**
    - **Validates: Requirements 24.3**
    - Generate arbitrary photo uploads to Azure Blob Storage
    - Verify unique blob names are generated (timestamp + original filename)
    - Verify no naming collisions occur
    - Run 100 iterations

  - [ ]* 26.2 Write property test for blob URL return after upload
    - **Property 27: Blob URL Return After Upload**
    - **Validates: Requirements 24.4, 24.10**
    - Generate arbitrary successful file uploads to Azure Blob Storage
    - Verify blob URL is returned
    - Verify blob URL is stored in deployment record
    - Run 100 iterations

- [ ] 27. Implement property-based tests for offline queue
  - [ ]* 27.1 Write property test for offline queue replay on connectivity restore
    - **Property 28: Offline Queue Replay on Connectivity Restore**
    - **Validates: Requirements 17.4**
    - Generate arbitrary queued requests in offline queue
    - Simulate connectivity restoration
    - Verify queued requests are replayed in order
    - Verify results are returned for each request
    - Run 100 iterations

  - [ ]* 27.2 Write property test for offline mode user notification
    - **Property 29: Offline Mode User Notification**
    - **Validates: Requirements 17.5**
    - Generate arbitrary operations performed while in offline mode
    - Verify user is notified of offline mode
    - Run 100 iterations

- [ ] 28. Implement property-based tests for SignalR
  - [ ]* 28.1 Write property test for SignalR event dispatch to NgRx
    - **Property 30: SignalR Event Dispatch to NgRx**
    - **Validates: Requirements 16.5**
    - Generate arbitrary real-time events received via SignalR (job assignment, job status change, notification)
    - Verify corresponding NgRx action is dispatched
    - Verify application state is updated
    - Run 100 iterations

- [ ] 29. Checkpoint - Ensure all property-based tests pass
  - Verify all 30 property-based tests are implemented
  - Verify all tests run with minimum 100 iterations
  - Verify all tests are tagged with feature name and property number
  - Verify all tests pass
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 30. Final integration and validation
  - [ ] 30.1 Verify all TODO comments are removed
    - Search codebase for TODO comments related to backend service integration
    - Ensure all placeholders are replaced with real implementations
    - _Requirements: All_

  - [ ] 30.2 Verify environment configuration
    - Test with development environment (localhost URLs)
    - Test with staging environment
    - Test with production environment
    - Verify Azure Static Web Apps environment variables work correctly
    - _Requirements: 30.1, 30.2, 30.3, 30.4, 30.5_

  - [ ] 30.3 Verify authentication flow
    - Test authentication header inclusion in all requests
    - Test token refresh on expiration
    - Test redirect to login on 401 errors
    - Test X-Market header for CM users
    - _Requirements: 27.1, 27.2, 27.3, 27.4, 27.5_

  - [ ] 30.4 Verify error handling end-to-end
    - Test all error status codes (400, 401, 403, 404, 409, 413, 415, 500)
    - Verify user-friendly error messages are displayed
    - Verify errors are logged to console
    - Verify error stack traces are preserved
    - _Requirements: 26.1-26.10_

  - [ ] 30.5 Verify feature flag integration
    - Test all 8 feature flags (liveUpdates, offlineMode, roleBasedWorkflow, deploymentNotifications, signOffRequired, deploymentAutoAssign, deploymentStrictRoles, deploymentRoleColors)
    - Verify services behave correctly when flags are enabled
    - Verify services behave correctly when flags are disabled
    - _Requirements: 16.1-16.5, 17.1-17.5, 18.1-18.5, 19.1-19.5, 20.1-20.5, 21.1-21.5, 22.1-22.5, 23.1-23.5_

  - [ ] 30.6 Run full test suite
    - Run all unit tests and verify 80%+ code coverage
    - Run all property-based tests and verify all pass
    - Run all integration tests and verify NgRx effects work correctly
    - Fix any failing tests
    - _Requirements: All_

  - [ ]* 30.7 Performance testing (optional)
    - Test API response times under load
    - Test caching effectiveness
    - Test retry logic performance
    - Test file upload performance with large files
    - Optimize if necessary

- [ ] 31. Final checkpoint - Complete implementation
  - Verify all 11 services are fully implemented
  - Verify all NgRx effects use real service calls
  - Verify all 30 property-based tests pass
  - Verify all unit tests pass with 80%+ coverage
  - Verify all integration tests pass
  - Verify all TODO comments are removed
  - Verify all feature flags work correctly
  - Verify authentication and error handling work end-to-end
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property-based tests validate universal correctness properties across all inputs
- Unit tests validate specific examples and edge cases
- Integration tests verify NgRx effects work correctly with services
- All services follow consistent patterns: authentication headers, error handling, retry logic, response transformation
- Feature flags enable gradual rollout of functionality
- The implementation is incremental: foundation → core services → feature services → integration → testing
