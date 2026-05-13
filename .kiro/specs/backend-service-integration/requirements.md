# Requirements Document: Backend Service Integration

## Introduction

The SRI Frontend Angular application has complete NgRx state management for the Field Resource Management (FRM) feature, but all backend service integrations are using placeholder implementations with TODO comments. This specification defines the requirements for implementing fully functional backend service layers that connect the existing NgRx effects to real API endpoints, enabling complete CRUD operations, real-time updates, and file upload functionality.

## Glossary

- **FRM**: Field Resource Management feature module
- **NgRx_Effect**: Side effect handler in NgRx that responds to actions and performs asynchronous operations
- **API_Endpoint**: Backend REST API URL that handles HTTP requests
- **Service_Layer**: Angular services that encapsulate HTTP communication with backend APIs
- **DTO**: Data Transfer Object used for API request/response payloads
- **Feature_Flag**: Configuration toggle that enables/disables specific functionality
- **SignalR**: Real-time communication library for WebSocket connections
- **Azure_Blob_Storage**: Cloud storage service for file uploads
- **Fluke_Pipeline**: File processing pipeline for test result uploads
- **Environment_Config**: Configuration object containing environment-specific settings like API URLs

## Requirements

### Requirement 1: Job Service Backend Integration

**User Story:** As a dispatcher, I want job CRUD operations to persist to the backend, so that job data is stored reliably and accessible across sessions.

#### Acceptance Criteria

1. THE Job_Service SHALL send HTTP POST requests to `/api/jobs` when creating jobs
2. THE Job_Service SHALL send HTTP GET requests to `/api/jobs` when retrieving job lists
3. THE Job_Service SHALL send HTTP GET requests to `/api/jobs/{id}` when retrieving individual jobs
4. THE Job_Service SHALL send HTTP PUT requests to `/api/jobs/{id}` when updating jobs
5. THE Job_Service SHALL send HTTP DELETE requests to `/api/jobs/{id}` when deleting jobs
6. WHEN API requests fail, THE Job_Service SHALL return descriptive error messages based on HTTP status codes
7. THE Job_Service SHALL include authentication headers from ApiHeadersService in all requests
8. THE Job_Service SHALL use Environment_Config.apiUrl as the base URL for all API calls
9. THE Job_Service SHALL implement retry logic with 2 retry attempts for GET requests
10. THE Job_Service SHALL transform API responses into Job model objects

### Requirement 2: Technician Service Backend Integration

**User Story:** As an administrator, I want technician profile operations to persist to the backend, so that technician data is maintained centrally.

#### Acceptance Criteria

1. THE Technician_Service SHALL send HTTP POST requests to `/api/technicians` when creating technician profiles
2. THE Technician_Service SHALL send HTTP GET requests to `/api/technicians` when retrieving technician lists
3. THE Technician_Service SHALL send HTTP GET requests to `/api/technicians/{id}` when retrieving individual technicians
4. THE Technician_Service SHALL send HTTP PUT requests to `/api/technicians/{id}` when updating technician profiles
5. THE Technician_Service SHALL send HTTP DELETE requests to `/api/technicians/{id}` when deleting technicians
6. THE Technician_Service SHALL send HTTP GET requests to `/api/technicians/{id}/skills` when retrieving technician skills
7. THE Technician_Service SHALL send HTTP POST requests to `/api/technicians/{id}/skills` when adding skills
8. THE Technician_Service SHALL send HTTP DELETE requests to `/api/technicians/{id}/skills/{skillId}` when removing skills
9. THE Technician_Service SHALL send HTTP GET requests to `/api/technicians/{id}/certifications` when retrieving certifications
10. THE Technician_Service SHALL send HTTP GET requests to `/api/technicians/certifications/expiring` when checking expiring certifications
11. WHEN a CM user requests technicians, THE Technician_Service SHALL filter results by the user's market
12. WHEN an Admin user requests technicians, THE Technician_Service SHALL return all technicians without market filtering

### Requirement 3: Time Tracking Service Backend Integration

**User Story:** As a field technician, I want my clock in/out times to be recorded on the backend, so that my labor hours are tracked accurately.

#### Acceptance Criteria

1. THE Time_Tracking_Service SHALL send HTTP POST requests to `/api/time-entries/clock-in` when technicians clock in
2. THE Time_Tracking_Service SHALL send HTTP POST requests to `/api/time-entries/clock-out` when technicians clock out
3. THE Time_Tracking_Service SHALL send HTTP GET requests to `/api/time-entries` when retrieving time entry lists
4. THE Time_Tracking_Service SHALL send HTTP GET requests to `/api/time-entries/active` when checking active time entries
5. THE Time_Tracking_Service SHALL send HTTP GET requests to `/api/time-entries/by-job/{jobId}` when retrieving job time entries
6. THE Time_Tracking_Service SHALL send HTTP GET requests to `/api/time-entries/by-technician/{technicianId}` when retrieving technician time entries
7. THE Time_Tracking_Service SHALL send HTTP PUT requests to `/api/time-entries/{id}` when administrators manually adjust time entries
8. THE Time_Tracking_Service SHALL send HTTP GET requests to `/api/time-entries/labor-summary/{jobId}` when calculating labor hours
9. WHEN capturing geolocation, THE Time_Tracking_Service SHALL include latitude, longitude, and accuracy in clock in/out requests
10. WHEN geolocation fails, THE Time_Tracking_Service SHALL proceed with clock in/out without location data

### Requirement 4: Scheduling Service Backend Integration

**User Story:** As a dispatcher, I want job assignments to be stored on the backend, so that scheduling data is preserved and synchronized across users.

#### Acceptance Criteria

1. THE Scheduling_Service SHALL send HTTP POST requests to `/api/scheduling/assign` when assigning technicians to jobs
2. THE Scheduling_Service SHALL send HTTP DELETE requests to `/api/scheduling/assignments/{id}` when unassigning technicians
3. THE Scheduling_Service SHALL send HTTP POST requests to `/api/scheduling/reassign` when reassigning jobs
4. THE Scheduling_Service SHALL send HTTP GET requests to `/api/scheduling/assignments` when retrieving assignment lists
5. THE Scheduling_Service SHALL send HTTP GET requests to `/api/scheduling/conflicts/check` when checking for conflicts
6. THE Scheduling_Service SHALL send HTTP GET requests to `/api/scheduling/conflicts` when detecting all conflicts
7. THE Scheduling_Service SHALL send HTTP GET requests to `/api/scheduling/qualified-technicians/{jobId}` when finding qualified technicians
8. THE Scheduling_Service SHALL send HTTP GET requests to `/api/scheduling/schedule/{technicianId}` when retrieving technician schedules
9. THE Scheduling_Service SHALL send HTTP POST requests to `/api/scheduling/bulk-assign` when performing bulk assignments
10. WHEN conflict override is requested, THE Scheduling_Service SHALL include justification in the assignment request

### Requirement 5: Reporting Service Backend Integration

**User Story:** As an operations manager, I want reporting data to be generated from backend analytics, so that reports reflect accurate real-time data.

#### Acceptance Criteria

1. THE Reporting_Service SHALL send HTTP GET requests to `/api/reports/dashboard` when retrieving dashboard metrics
2. THE Reporting_Service SHALL send HTTP GET requests to `/api/reports/utilization` when generating utilization reports
3. THE Reporting_Service SHALL send HTTP GET requests to `/api/reports/performance` when generating performance reports
4. THE Reporting_Service SHALL send HTTP GET requests to `/api/reports/kpis` when retrieving key performance indicators
5. THE Reporting_Service SHALL send HTTP GET requests to `/api/reports/schedule-adherence` when calculating schedule adherence
6. THE Reporting_Service SHALL send HTTP GET requests to `/api/reports/export/{reportType}` when exporting reports
7. THE Reporting_Service SHALL cache dashboard metrics for 5 minutes to reduce server load
8. THE Reporting_Service SHALL cache report data for 1 minute to reduce server load
9. THE Reporting_Service SHALL cache KPI data for 5 minutes to reduce server load
10. THE Reporting_Service SHALL invalidate caches when underlying data changes

### Requirement 6: Notification Service Backend Integration

**User Story:** As a field technician, I want to receive notifications from the backend, so that I am informed of job assignments and updates in real-time.

#### Acceptance Criteria

1. THE Notification_Service SHALL send HTTP GET requests to `/api/notifications` when retrieving notification lists
2. THE Notification_Service SHALL send HTTP PATCH requests to `/api/notifications/{id}/read` when marking notifications as read
3. THE Notification_Service SHALL send HTTP PATCH requests to `/api/notifications/read-all` when marking all notifications as read
4. THE Notification_Service SHALL send HTTP GET requests to `/api/notifications/unread-count` when retrieving unread counts
5. THE Notification_Service SHALL send HTTP GET requests to `/api/notifications/preferences` when retrieving notification preferences
6. THE Notification_Service SHALL send HTTP PUT requests to `/api/notifications/preferences` when updating notification preferences
7. THE Notification_Service SHALL send HTTP DELETE requests to `/api/notifications/{id}` when deleting notifications
8. THE Notification_Service SHALL delegate notification creation to FrmNotificationAdapterService for ARK integration
9. THE Notification_Service SHALL support job assigned, job reassigned, job status changed, job cancelled, certification expiring, and conflict detected notification types
10. WHEN sending notifications, THE Notification_Service SHALL respect user notification preferences

### Requirement 7: Job Status Management Backend Integration

**User Story:** As a field technician, I want job status updates to be saved to the backend, so that dispatchers can track job progress in real-time.

#### Acceptance Criteria

1. THE Job_Service SHALL send HTTP PATCH requests to `/api/jobs/{id}/status` when updating job status
2. THE Job_Service SHALL send HTTP GET requests to `/api/jobs/{id}/status-history` when retrieving status history
3. WHEN status is changed to Issue, THE Job_Service SHALL require a reason parameter in the request
4. THE Job_Service SHALL include timestamp and user information in status update requests
5. THE Job_Service SHALL return updated job objects after status changes

### Requirement 8: Job Notes Backend Integration

**User Story:** As a dispatcher, I want job notes to be stored on the backend, so that communication history is preserved.

#### Acceptance Criteria

1. THE Job_Service SHALL send HTTP POST requests to `/api/jobs/{id}/notes` when adding notes
2. THE Job_Service SHALL send HTTP GET requests to `/api/jobs/{id}/notes` when retrieving notes
3. THE Job_Service SHALL include author and timestamp in note creation requests
4. THE Job_Service SHALL support notes up to 2000 characters in length
5. THE Job_Service SHALL return notes in chronological order

### Requirement 9: Job Attachments Backend Integration

**User Story:** As a dispatcher, I want to upload job attachments to the backend, so that technicians can access drawings and MOPs.

#### Acceptance Criteria

1. THE Job_Service SHALL send HTTP POST requests with multipart/form-data to `/api/jobs/{id}/attachments` when uploading files
2. THE Job_Service SHALL send HTTP GET requests to `/api/jobs/{id}/attachments` when retrieving attachment lists
3. THE Job_Service SHALL report upload progress using HttpRequest with reportProgress enabled
4. THE Job_Service SHALL validate file size does not exceed 10 MB before upload
5. THE Job_Service SHALL support JPEG, PNG, HEIC, PDF, and common document formats
6. WHEN upload fails with 413 status, THE Job_Service SHALL return "File too large" error message
7. WHEN upload fails with 415 status, THE Job_Service SHALL return "Unsupported file type" error message

### Requirement 10: Technician Availability Backend Integration

**User Story:** As an administrator, I want technician availability to be stored on the backend, so that scheduling considers PTO and unavailable dates.

#### Acceptance Criteria

1. THE Technician_Service SHALL send HTTP GET requests to `/api/technicians/{id}/availability` when retrieving availability
2. THE Technician_Service SHALL send HTTP PUT requests to `/api/technicians/{id}/availability` when updating availability
3. THE Technician_Service SHALL include date range parameters in availability requests
4. THE Technician_Service SHALL support marking specific dates as unavailable
5. THE Technician_Service SHALL support marking date ranges as unavailable

### Requirement 11: Skill and Certification Management Backend Integration

**User Story:** As an administrator, I want skill and certification data to be managed on the backend, so that technician qualifications are tracked centrally.

#### Acceptance Criteria

1. THE Technician_Service SHALL send HTTP POST requests to `/api/technicians/{id}/skills` when adding skills
2. THE Technician_Service SHALL send HTTP DELETE requests to `/api/technicians/{id}/skills/{skillId}` when removing skills
3. THE Technician_Service SHALL send HTTP GET requests to `/api/technicians/{id}/certifications` when retrieving certifications
4. THE Technician_Service SHALL send HTTP POST requests to `/api/technicians/{id}/certifications` when adding certifications
5. THE Technician_Service SHALL send HTTP PUT requests to `/api/technicians/{id}/certifications/{certId}` when updating certifications
6. THE Technician_Service SHALL send HTTP DELETE requests to `/api/technicians/{id}/certifications/{certId}` when removing certifications
7. THE Technician_Service SHALL include certification name, issue date, and expiration date in certification requests

### Requirement 12: Conflict Detection Backend Integration

**User Story:** As a dispatcher, I want conflict detection to be performed by the backend, so that scheduling conflicts are identified accurately.

#### Acceptance Criteria

1. THE Scheduling_Service SHALL send HTTP GET requests to `/api/scheduling/conflicts/check` when validating assignments
2. THE Scheduling_Service SHALL include technicianId and jobId parameters in conflict check requests
3. THE Scheduling_Service SHALL send HTTP GET requests to `/api/scheduling/conflicts` when detecting all conflicts
4. THE Scheduling_Service SHALL support optional date range filtering for conflict detection
5. THE Scheduling_Service SHALL return conflict details including conflicting job IDs and time ranges

### Requirement 13: Skill Matching Backend Integration

**User Story:** As a dispatcher, I want skill matching to be performed by the backend, so that I can find qualified technicians efficiently.

#### Acceptance Criteria

1. THE Scheduling_Service SHALL send HTTP GET requests to `/api/scheduling/qualified-technicians/{jobId}` when finding qualified technicians
2. THE Scheduling_Service SHALL receive technicians ranked by skill match percentage
3. THE Scheduling_Service SHALL receive technician availability status in match results
4. THE Scheduling_Service SHALL receive current workload information in match results
5. THE Scheduling_Service SHALL display technicians without required skills separately with missing skills indicated

### Requirement 14: Batch Operations Backend Integration

**User Story:** As a dispatcher, I want batch operations to be processed by the backend, so that I can perform bulk actions efficiently.

#### Acceptance Criteria

1. THE Job_Service SHALL send HTTP DELETE requests with body containing job IDs to `/api/jobs` when deleting multiple jobs
2. THE Scheduling_Service SHALL send HTTP POST requests to `/api/scheduling/bulk-assign` when assigning multiple jobs
3. THE Scheduling_Service SHALL receive individual success/failure results for each operation in batch
4. THE Scheduling_Service SHALL validate each operation in the batch independently
5. THE Scheduling_Service SHALL continue processing remaining operations when individual operations fail

### Requirement 15: Export Functionality Backend Integration

**User Story:** As an operations manager, I want to export data from the backend, so that I can perform external analysis.

#### Acceptance Criteria

1. THE Reporting_Service SHALL send HTTP GET requests to `/api/reports/export/{reportType}` when exporting reports
2. THE Reporting_Service SHALL include format parameter (csv or pdf) in export requests
3. THE Reporting_Service SHALL include filter parameters in export requests
4. THE Reporting_Service SHALL receive Blob responses for exported files
5. THE Reporting_Service SHALL support exporting utilization, performance, dashboard, and schedule adherence reports

### Requirement 16: Real-Time Updates Feature Flag Integration

**User Story:** As a system administrator, I want to enable real-time updates via feature flag, so that SignalR connections can be activated when backend support is ready.

#### Acceptance Criteria

1. THE Feature_Flag_Service SHALL support liveUpdates feature flag
2. WHEN liveUpdates flag is enabled, THE FRM_SignalR_Service SHALL establish WebSocket connections
3. WHEN liveUpdates flag is disabled, THE FRM_SignalR_Service SHALL not attempt connections
4. THE FRM_SignalR_Service SHALL listen for job assignment, job status change, and notification events
5. THE FRM_SignalR_Service SHALL dispatch NgRx actions when real-time events are received

### Requirement 17: Offline Mode Feature Flag Integration

**User Story:** As a field technician, I want offline mode to be enabled via feature flag, so that I can access limited functionality without internet connectivity.

#### Acceptance Criteria

1. THE Feature_Flag_Service SHALL support offlineMode feature flag
2. WHEN offlineMode flag is enabled, THE Offline_Queue_Service SHALL queue failed API requests
3. WHEN offlineMode flag is enabled, THE Cache_Service SHALL serve cached data when API requests fail
4. WHEN connectivity is restored, THE Offline_Queue_Service SHALL replay queued requests
5. THE Offline_Queue_Service SHALL notify users when operating in offline mode

### Requirement 18: Role-Based Workflow Feature Flag Integration

**User Story:** As a system administrator, I want to enable role-based workflow via feature flag, so that access control can be enforced when backend support is ready.

#### Acceptance Criteria

1. THE Feature_Flag_Service SHALL support roleBasedWorkflow feature flag
2. WHEN roleBasedWorkflow flag is enabled, THE Service_Layer SHALL enforce role-based filtering
3. WHEN roleBasedWorkflow flag is enabled, THE Service_Layer SHALL validate user permissions before API calls
4. WHEN roleBasedWorkflow flag is disabled, THE Service_Layer SHALL allow all operations without role checks
5. THE Service_Layer SHALL return 403 errors when users lack required permissions

### Requirement 19: Deployment Notifications Feature Flag Integration

**User Story:** As a deployment engineer, I want deployment notifications to be enabled via feature flag, so that real-time deployment updates can be activated.

#### Acceptance Criteria

1. THE Feature_Flag_Service SHALL support deploymentNotifications feature flag
2. WHEN deploymentNotifications flag is enabled, THE Deployment_SignalR_Service SHALL establish connections
3. WHEN deploymentNotifications flag is enabled, THE Deployment_SignalR_Service SHALL listen for deployment events
4. WHEN deploymentNotifications flag is disabled, THE Deployment_SignalR_Service SHALL not attempt connections
5. THE Deployment_SignalR_Service SHALL display toast notifications for deployment events

### Requirement 20: Sign-Off Required Feature Flag Integration

**User Story:** As a project manager, I want sign-off requirements to be enabled via feature flag, so that deployment phase completion requires explicit approval.

#### Acceptance Criteria

1. THE Feature_Flag_Service SHALL support signOffRequired feature flag
2. WHEN signOffRequired flag is enabled, THE Deployment_Service SHALL require sign-off before phase completion
3. WHEN signOffRequired flag is enabled, THE Deployment_Service SHALL validate sign-off permissions
4. WHEN signOffRequired flag is disabled, THE Deployment_Service SHALL allow phase completion without sign-off
5. THE Deployment_Service SHALL record sign-off user and timestamp

### Requirement 21: Deployment Auto-Assign Feature Flag Integration

**User Story:** As a dispatcher, I want auto-assignment to be enabled via feature flag, so that deployments can be automatically assigned based on availability and skills.

#### Acceptance Criteria

1. THE Feature_Flag_Service SHALL support deploymentAutoAssign feature flag
2. WHEN deploymentAutoAssign flag is enabled, THE Deployment_Service SHALL automatically assign technicians
3. WHEN deploymentAutoAssign flag is enabled, THE Deployment_Service SHALL consider technician availability
4. WHEN deploymentAutoAssign flag is enabled, THE Deployment_Service SHALL consider skill matching
5. WHEN deploymentAutoAssign flag is disabled, THE Deployment_Service SHALL require manual assignment

### Requirement 22: Deployment Strict Roles Feature Flag Integration

**User Story:** As a system administrator, I want strict role enforcement to be enabled via feature flag, so that deployment operations are restricted by role.

#### Acceptance Criteria

1. THE Feature_Flag_Service SHALL support deploymentStrictRoles feature flag
2. WHEN deploymentStrictRoles flag is enabled, THE Deployment_Service SHALL enforce role-based permissions
3. WHEN deploymentStrictRoles flag is enabled, THE Deployment_Service SHALL validate user roles before operations
4. WHEN deploymentStrictRoles flag is disabled, THE Deployment_Service SHALL allow operations without role checks
5. THE Deployment_Service SHALL return 403 errors when users lack required roles

### Requirement 23: Deployment Role Colors Feature Flag Integration

**User Story:** As a deployment engineer, I want role colors to be enabled via feature flag, so that different roles are visually distinguished.

#### Acceptance Criteria

1. THE Feature_Flag_Service SHALL support deploymentRoleColors feature flag
2. WHEN deploymentRoleColors flag is enabled, THE Deployment_UI SHALL display role-specific colors
3. WHEN deploymentRoleColors flag is enabled, THE Deployment_UI SHALL apply color coding to user badges
4. WHEN deploymentRoleColors flag is disabled, THE Deployment_UI SHALL use default styling
5. THE Deployment_UI SHALL maintain accessibility contrast ratios with role colors

### Requirement 24: Azure Blob Storage Integration for Photo Uploads

**User Story:** As a deployment engineer, I want to upload photos to Azure Blob Storage, so that deployment photos are stored reliably in the cloud.

#### Acceptance Criteria

1. THE Photo_Uploader_Component SHALL integrate with AzureBlobStorageService
2. THE AzureBlobStorageService SHALL send HTTP POST requests to Azure Blob Storage API when uploading photos
3. THE AzureBlobStorageService SHALL generate unique blob names using timestamp and original filename
4. THE AzureBlobStorageService SHALL return blob URLs after successful upload
5. THE AzureBlobStorageService SHALL validate image formats (JPEG, PNG, HEIC) before upload
6. THE AzureBlobStorageService SHALL validate file size does not exceed 10 MB before upload
7. THE AzureBlobStorageService SHALL report upload progress
8. WHEN upload fails, THE AzureBlobStorageService SHALL return descriptive error messages
9. THE AzureBlobStorageService SHALL use SAS tokens for authentication
10. THE AzureBlobStorageService SHALL store blob URLs in deployment records

### Requirement 25: Fluke Upload Pipeline Integration

**User Story:** As a deployment engineer, I want to upload Fluke test results to the processing pipeline, so that test data is validated and stored properly.

#### Acceptance Criteria

1. THE Tests_Uploader_Component SHALL integrate with Fluke upload pipeline
2. THE Fluke_Upload_Service SHALL send HTTP POST requests to Fluke pipeline API when uploading test files
3. THE Fluke_Upload_Service SHALL validate file formats before upload
4. THE Fluke_Upload_Service SHALL validate file size does not exceed 50 MB before upload
5. THE Fluke_Upload_Service SHALL report upload progress
6. THE Fluke_Upload_Service SHALL return processing status after upload
7. WHEN upload fails, THE Fluke_Upload_Service SHALL return descriptive error messages
8. THE Fluke_Upload_Service SHALL store file references in deployment records
9. THE Fluke_Upload_Service SHALL support batch uploads of multiple test files
10. THE Fluke_Upload_Service SHALL notify users when processing is complete

### Requirement 26: API Error Handling

**User Story:** As a developer, I want consistent error handling across all services, so that users receive meaningful error messages.

#### Acceptance Criteria

1. THE Service_Layer SHALL catch HTTP errors and transform them into user-friendly messages
2. WHEN API returns 400 status, THE Service_Layer SHALL display "Invalid request" message
3. WHEN API returns 401 status, THE Service_Layer SHALL display "Unauthorized" message and redirect to login
4. WHEN API returns 403 status, THE Service_Layer SHALL display "Access denied" message
5. WHEN API returns 404 status, THE Service_Layer SHALL display resource-specific "Not found" message
6. WHEN API returns 409 status, THE Service_Layer SHALL display conflict-specific message
7. WHEN API returns 500 status, THE Service_Layer SHALL display "Server error" message
8. THE Service_Layer SHALL log all errors to console for debugging
9. THE Service_Layer SHALL return Observable errors using throwError operator
10. THE Service_Layer SHALL preserve error stack traces for debugging

### Requirement 27: API Authentication

**User Story:** As a developer, I want all API requests to include authentication headers, so that backend can verify user identity.

#### Acceptance Criteria

1. THE Service_Layer SHALL use ApiHeadersService to obtain authentication headers
2. THE Service_Layer SHALL include Authorization header in all API requests
3. THE Service_Layer SHALL include X-Market header for CM users in all API requests
4. THE Service_Layer SHALL refresh authentication tokens when they expire
5. WHEN authentication fails, THE Service_Layer SHALL redirect users to login page

### Requirement 28: API Response Transformation

**User Story:** As a developer, I want API responses to be transformed into domain models, so that components work with strongly-typed objects.

#### Acceptance Criteria

1. THE Service_Layer SHALL transform API responses into model objects
2. THE Service_Layer SHALL parse ISO date strings into Date objects
3. THE Service_Layer SHALL handle null and undefined values in API responses
4. THE Service_Layer SHALL validate required fields in API responses
5. WHEN API response is invalid, THE Service_Layer SHALL return descriptive error

### Requirement 29: API Request Retry Logic

**User Story:** As a developer, I want failed API requests to be retried automatically, so that transient network errors are handled gracefully.

#### Acceptance Criteria

1. THE Service_Layer SHALL retry GET requests up to 2 times on failure
2. THE Service_Layer SHALL not retry POST, PUT, PATCH, or DELETE requests
3. THE Service_Layer SHALL use exponential backoff between retry attempts
4. THE Service_Layer SHALL not retry requests that fail with 4xx status codes
5. THE Service_Layer SHALL retry requests that fail with 5xx status codes

### Requirement 30: Environment Configuration

**User Story:** As a developer, I want API URLs to be configurable per environment, so that the application can connect to different backend instances.

#### Acceptance Criteria

1. THE Service_Layer SHALL read API base URL from Environment_Config.apiUrl
2. THE Environment_Config SHALL support development, staging, and production environments
3. THE Environment_Config SHALL support local development with localhost URLs
4. THE Environment_Config SHALL support Azure Static Web Apps environment variables
5. THE Service_Layer SHALL construct full API URLs by combining base URL with endpoint paths

