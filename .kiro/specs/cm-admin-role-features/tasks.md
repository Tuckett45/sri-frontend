# Implementation Plan: CM and Admin Role-Based Features

## Overview

This implementation plan covers the development of comprehensive role-based features for Construction Manager (CM) and Administrator (Admin) roles across the Field Operations system. The implementation builds upon existing `AuthService.isCM()` and `AuthService.isAdmin()` methods to add role-specific dashboards, enhanced access control, workflow management, and data filtering capabilities.

The implementation follows a layered approach:
1. Core services and infrastructure (role-based data filtering, interceptors)
2. Workflow and user management services
3. Guards and authorization
4. Dashboard components
5. UI directives and component integration
6. Testing and validation

## Tasks

- [x] 1. Set up core role-based infrastructure
  - [x] 1.1 Create RoleBasedDataService for market filtering
    - Implement `applyMarketFilter()` method for client-side data filtering
    - Implement `getRoleBasedQueryParams()` for API request filtering
    - Implement `canAccessMarket()` for market access validation
    - Implement `getAccessibleMarkets()` to retrieve user's accessible markets
    - Add logic to handle CM market restrictions (exclude RG markets for street sheets)
    - Add logic to handle Admin full access (all markets including RG)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 4.1, 4.2_
  
  - [ ]* 1.2 Write property tests for RoleBasedDataService
    - **Property 1: Market filtering for CM excludes unassigned markets**
    - **Validates: Requirements 1.2, 1.3, 1.4, 1.5**
    - **Property 2: Market filtering for Admin includes all markets**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
    - **Property 3: CM street sheet filtering excludes RG markets**
    - **Validates: Requirements 1.2**
  
  - [x] 1.3 Create MarketFilterInterceptor for automatic API filtering
    - Implement `intercept()` method to add market parameter to requests
    - Add logic to skip interception for Admin users
    - Add logic to skip interception when market is already specified
    - Define list of endpoints requiring market filtering (street-sheet, punch-list, daily-report, technician, assignment)
    - Register interceptor in app module providers
    - _Requirements: 1.1, 1.5, 3.8, 16.3, 16.4_
  
  - [ ]* 1.4 Write unit tests for MarketFilterInterceptor
    - Test CM requests get market parameter added
    - Test Admin requests are not modified
    - Test requests with existing market parameter are not modified
    - Test only specified endpoints are filtered
    - _Requirements: 1.5, 16.3, 16.4_

- [x] 2. Implement workflow management services
  - [x] 2.1 Create WorkflowService for approval processes
    - Implement `getMyApprovalTasks()` for current user's approval queue
    - Implement `getAllApprovalTasks()` for Admin system-wide view
    - Implement `submitForApproval()` to initiate approval workflows
    - Implement `approveTask()` for task approval with comments
    - Implement `rejectTask()` for task rejection with required reason
    - Implement `requestChanges()` for requesting modifications
    - Implement `escalateTask()` for Admin escalation
    - Implement `getWorkflowConfiguration()` for retrieving workflow rules
    - Implement `updateWorkflowConfiguration()` for Admin workflow management
    - Add role-based filtering to ensure CMs only see their market's tasks
    - Add notification triggers for approval events
    - _Requirements: 5.1, 5.2, 5.3, 5.5, 5.6, 5.7, 6.1, 6.2, 6.3, 6.4, 6.6, 9.1, 9.2, 9.3, 9.4, 9.7, 10.1, 10.2, 10.3, 10.6_
  
  - [ ]* 2.2 Write property tests for WorkflowService
    - **Property 4: CM approval tasks are filtered to assigned market**
    - **Validates: Requirements 5.5**
    - **Property 5: Admin approval tasks include all markets**
    - **Validates: Requirements 6.1**
    - **Property 6: Task approval updates status and notifies parties**
    - **Validates: Requirements 5.2, 9.3**
    - **Property 7: Task rejection requires reason**
    - **Validates: Requirements 5.3**
  
  - [ ]* 2.3 Write unit tests for WorkflowService
    - Test approval task retrieval for CM users
    - Test approval task retrieval for Admin users
    - Test task submission creates approval workflow
    - Test task approval flow with notifications
    - Test task rejection flow with reason requirement
    - Test request changes flow
    - Test escalation (Admin only)
    - Test multi-level approval routing
    - _Requirements: 5.1, 5.2, 5.3, 5.7, 6.1, 6.2, 6.3, 10.3_

- [x] 3. Implement user management services (Admin)
  - [x] 3.1 Create UserManagementService for Admin operations
    - Implement `getUsers()` with filtering by role, market, approval status, search term
    - Implement `createUser()` for new user creation with required role and market assignment
    - Implement `updateUser()` for user profile updates with audit logging
    - Implement `deactivateUser()` for user deactivation with required reason
    - Implement `resetUserPassword()` for password reset with secure temporary password generation
    - Implement `executeBulkOperation()` for bulk user operations with confirmation
    - Implement `getUserAuditLog()` for user activity history
    - Add Admin-only authorization checks for all methods
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_
  
  - [ ]* 3.2 Write property tests for UserManagementService
    - **Property 8: Only Admin can access user management operations**
    - **Validates: Requirements 11.1, 11.2, 11.3, 11.4**
    - **Property 9: User role changes immediately apply new permissions**
    - **Validates: Requirements 11.2**
    - **Property 10: User creation requires role and market assignment**
    - **Validates: Requirements 11.1**
  
  - [ ]* 3.3 Write unit tests for UserManagementService
    - Test user creation with role and market assignment
    - Test user updates with audit trail
    - Test user deactivation with reason
    - Test password reset generates secure temporary password
    - Test bulk operations with confirmation
    - Test user filtering by various criteria
    - Test authorization (Admin-only access)
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 4. Checkpoint - Ensure core services are functional
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement role-based guards
  - [x] 5.1 Create CMGuard for CM-specific routes
    - Implement `canActivate()` to check for CM or Admin role
    - Add redirect to unauthorized page on failure
    - Add return URL query parameter for post-login redirect
    - _Requirements: 3.7, 15.1, 15.2_
  
  - [x] 5.2 Create EnhancedRoleGuard with market validation
    - Implement `canActivate()` with configurable role requirements via route data
    - Add optional market matching validation using route parameters
    - Add support for route data configuration (allowedRoles, requireMarketMatch, marketParam)
    - Add integration with RoleBasedDataService for market access checks
    - _Requirements: 1.5, 3.7, 3.8, 16.1, 16.2_
  
  - [ ]* 5.3 Write unit tests for guards
    - Test CMGuard allows CM and Admin users
    - Test CMGuard blocks other roles
    - Test EnhancedRoleGuard role validation
    - Test EnhancedRoleGuard market validation
    - Test redirect behavior on authorization failure
    - Test return URL preservation
    - _Requirements: 3.7, 15.1, 15.2, 16.1_

- [-] 6. Implement dashboard components
  - [x] 6.1 Create CM Dashboard component
    - Create component with template and styles
    - Implement `loadDashboardData()` to fetch CM-specific metrics
    - Implement metrics display: active projects, pending tasks, available technicians, resource utilization, pending approvals, overdue items
    - Implement recent street sheets list with market filtering
    - Implement pending approvals section with navigation
    - Implement technician status overview
    - Implement upcoming deadlines widget
    - Add date range selector for time-based filtering
    - Add navigation methods to related features (approvals, street sheets)
    - Add auto-refresh capability for real-time updates
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6, 5.5, 17.1, 17.2_
  
  - [ ]* 6.2 Write unit tests for CM Dashboard
    - Test dashboard loads with CM user's market data only
    - Test metrics display correctly
    - Test navigation methods
    - Test date range filtering
    - Test data refresh
    - Test pending approvals section
    - _Requirements: 1.1, 1.6_
  
  - [x] 6.3 Create Admin Dashboard component
    - Create component with template and styles
    - Implement `loadDashboardData()` to fetch system-wide metrics
    - Implement system-wide metrics: total projects, all pending tasks, total technicians, overall utilization, pending user approvals, escalated approvals
    - Implement market-by-market comparison view with drill-down
    - Implement pending user approvals section
    - Implement escalated approvals section
    - Implement market drill-down functionality
    - Add market filter dropdown for focused analysis
    - Add navigation to user management and system configuration
    - Add executive dashboard widgets with KPIs
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 6.1, 6.5, 18.1, 18.2, 18.5_
  
  - [ ]* 6.4 Write unit tests for Admin Dashboard
    - Test dashboard loads with all markets data
    - Test system-wide metrics display
    - Test market filtering functionality
    - Test drill-down navigation
    - Test user management navigation
    - Test escalated approvals section
    - _Requirements: 2.1, 2.5, 2.6_

- [x] 7. Implement role-based UI directives
  - [x] 7.1 Create RoleBasedShowDirective for conditional rendering
    - Implement structural directive with role input (single or array)
    - Add optional market parameter for market-specific visibility
    - Implement view creation/destruction based on role and market access
    - Add support for role changes triggering view updates
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_
  
  - [x] 7.2 Create RoleBasedDisableDirective for conditional disabling
    - Implement attribute directive with role input
    - Add disabled state management based on role
    - Add visual styling for disabled state
    - Add tooltip explaining why element is disabled
    - _Requirements: 15.3, 15.4_
  
  - [ ]* 7.3 Write unit tests for directives
    - Test RoleBasedShowDirective shows content for authorized roles
    - Test RoleBasedShowDirective hides content for unauthorized roles
    - Test RoleBasedShowDirective market filtering
    - Test RoleBasedShowDirective handles role changes
    - Test RoleBasedDisableDirective enables for authorized roles
    - Test RoleBasedDisableDirective disables for unauthorized roles
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_

- [x] 8. Checkpoint - Ensure UI components and directives are functional
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Integrate role-based filtering into existing services
  - [x] 9.1 Enhance StreetSheetService with role-based filtering
    - Update `getStreetSheets()` to use RoleBasedDataService
    - Add market filtering for CM users (exclude RG markets)
    - Ensure Admin users get all markets including RG
    - Update create method to associate with CM's market
    - Update update methods to validate market ownership for CMs
    - Update delete methods to validate market ownership for CMs
    - _Requirements: 1.2, 2.2, 7.1, 7.2, 7.3_
  
  - [x] 9.2 Enhance PunchListService with role-based filtering
    - Update `getPunchLists()` to use RoleBasedDataService
    - Add market filtering for CM users
    - Ensure Admin users get all markets
    - Update create method to associate with CM's market
    - Update update methods to validate market ownership for CMs
    - _Requirements: 1.3, 2.3, 7.4, 7.5_
  
  - [x] 9.3 Enhance DailyReportService with role-based filtering
    - Update `getDailyReports()` to use RoleBasedDataService
    - Add market filtering for CM users
    - Ensure Admin users get all markets
    - Update create method to associate with CM's market and user ID
    - Update approval submission to route to CM based on market
    - _Requirements: 1.4, 2.4, 7.6, 9.5, 9.6_
  
  - [x] 9.4 Enhance TechnicianService with role-based filtering
    - Update `getTechnicians()` to use RoleBasedDataService
    - Add market filtering for CM users
    - Ensure Admin users get all technicians
    - Update assignment methods to validate market ownership
    - Prevent CM from assigning technicians from other markets
    - _Requirements: 4.1, 4.4, 4.7, 7.7, 13.1, 13.2_
  
  - [ ]* 9.5 Write integration tests for enhanced services
    - Test StreetSheetService filtering for CM and Admin
    - Test StreetSheetService RG market exclusion for CM
    - Test PunchListService filtering for CM and Admin
    - Test DailyReportService filtering for CM and Admin
    - Test TechnicianService filtering for CM and Admin
    - Test market validation on create/update operations
    - _Requirements: 1.2, 1.3, 1.4, 2.2, 2.3, 2.4_

- [x] 10. Implement resource allocation features
  - [x] 10.1 Create ResourceAllocationService
    - Implement `assignTechnicianToProject()` with availability and qualification validation
    - Implement `getTechnicianAvailability()` with real-time status
    - Implement `detectSchedulingConflicts()` for conflict detection
    - Implement `allocateEquipment()` with availability and location validation
    - Implement `getResourceUtilization()` with market-based filtering
    - Add double-booking prevention logic with conflict alerts
    - Add market-based filtering for CM users
    - Add system-wide access for Admin users
    - Add Admin resource reallocation between markets
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 14.1, 14.2, 14.3_
  
  - [ ]* 10.2 Write property tests for ResourceAllocationService
    - **Property 11: Technician assignment validates availability and qualifications**
    - **Validates: Requirements 13.1**
    - **Property 12: System prevents double-booking of technicians**
    - **Validates: Requirements 13.6**
    - **Property 13: CM resource allocation is limited to assigned market**
    - **Validates: Requirements 13.2, 13.5**
    - **Property 14: Admin can reallocate resources between markets**
    - **Validates: Requirements 14.2, 14.3**
  
  - [ ]* 10.3 Write unit tests for ResourceAllocationService
    - Test technician assignment with validation
    - Test availability checking
    - Test conflict detection and alerts
    - Test equipment allocation
    - Test utilization reporting
    - Test market filtering for CM vs Admin
    - Test Admin cross-market reallocation
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 14.1, 14.2_

- [x] 11. Implement reporting and analytics features
  - [x] 11.1 Create ReportingService with role-based data access
    - Implement `generateProjectStatusReport()` with market filtering
    - Implement `getTechnicianPerformanceMetrics()` with market filtering
    - Implement `exportData()` with role-based data inclusion
    - Implement `getTimeBillingReport()` with market filtering
    - Implement `getTrendAnalysis()` for performance over time
    - Implement `scheduleRecurringReport()` for automated report generation
    - Implement `getComparativeAnalytics()` for Admin market-by-market comparison
    - Add market filtering for CM users
    - Add system-wide access for Admin users
    - Add custom report builder for Admin
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 18.1, 18.2, 18.3, 18.4, 18.5, 18.6_
  
  - [x]* 11.2 Write unit tests for ReportingService
    - Test report generation for CM (market-filtered)
    - Test report generation for Admin (all markets)
    - Test data export with role-based filtering
    - Test trend analysis
    - Test recurring report scheduling
    - Test comparative analytics for Admin
    - _Requirements: 17.1, 17.2, 17.3, 18.1, 18.2, 18.3_

- [x] 12. Implement notification management
  - [x] 12.1 Create NotificationService with role-based filtering
    - Implement `sendNotification()` for individual notifications
    - Implement `getNotificationsForUser()` with market filtering
    - Implement `configureNotificationPreferences()` for user preferences
    - Implement `sendBroadcast()` for Admin system-wide messages
    - Implement `getNotificationLogs()` for Admin audit trail
    - Implement `configureNotificationTemplates()` for Admin template management
    - Add market-based filtering for CM notifications
    - Add multi-channel delivery (email, in-app, SMS)
    - Add high-priority notification handling for critical issues
    - Add 24-hour approval reminder notifications
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7, 20.1, 20.2, 20.3, 20.4, 20.5, 20.6_
  
  - [ ]* 12.2 Write unit tests for NotificationService
    - Test notification sending
    - Test market-based filtering for CM
    - Test system-wide notifications for Admin
    - Test notification preferences
    - Test broadcast functionality
    - Test notification logging
    - Test multi-channel delivery
    - Test approval reminders
    - _Requirements: 19.1, 19.2, 19.5, 19.7, 20.1, 20.2, 20.6_

- [x] 13. Checkpoint - Ensure all services are integrated and functional
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Implement system configuration features (Admin)
  - [x] 14.1 Create SystemConfigurationService
    - Implement `getConfiguration()` for retrieving system settings
    - Implement `updateConfiguration()` with validation and immediate/scheduled application
    - Implement `getMarketDefinitions()` for market configuration
    - Implement `updateMarketDefinitions()` with filtering rule updates
    - Implement `getApprovalWorkflows()` for workflow configuration
    - Implement `updateApprovalWorkflows()` with workflow logic validation
    - Implement `exportConfiguration()` for backup
    - Implement `getConfigurationHistory()` for audit trail with timestamps and admin identification
    - Add Admin-only authorization
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_
  
  - [ ]* 14.2 Write unit tests for SystemConfigurationService
    - Test configuration retrieval
    - Test configuration updates with validation
    - Test market definition management
    - Test workflow configuration with validation
    - Test configuration export
    - Test configuration history tracking
    - Test authorization (Admin-only)
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

- [x] 15. Update routing configuration with role-based guards
  - [x] 15.1 Add guards to ATLAS module routes
    - Apply CMGuard to CM dashboard route
    - Apply EnhancedRoleGuard to market-specific routes with market validation
    - Configure Admin dashboard route with Admin-only guard
    - Add route data for guard configuration (allowedRoles, requireMarketMatch)
    - _Requirements: 3.7, 15.1, 15.2_
  
  - [x] 15.2 Add guards to Field Resource Management routes
    - Apply CMGuard to CM-specific routes
    - Apply Admin guard to Admin-only routes (user management, system config)
    - Apply EnhancedRoleGuard to data management routes
    - Configure market validation for resource routes
    - _Requirements: 3.7, 4.7, 15.1, 15.2_
  
  - [ ]* 15.3 Write integration tests for routing
    - Test CM can access CM routes
    - Test Admin can access all routes
    - Test unauthorized users are redirected
    - Test market validation on routes
    - Test return URL preservation
    - _Requirements: 3.7, 15.1, 15.2, 16.1_

- [x] 16. Implement API authorization interceptor
  - [x] 16.1 Create AuthorizationInterceptor for role validation
    - Implement `intercept()` to add authorization headers with role information
    - Add error handling for 403 Forbidden responses
    - Add retry logic for token refresh
    - Add logging for authorization failures with user ID, role, endpoint, and timestamp
    - Add user-friendly error messages for authorization failures
    - _Requirements: 16.1, 16.2, 16.5, 16.6_
  
  - [ ]* 16.2 Write unit tests for AuthorizationInterceptor
    - Test authorization headers are added
    - Test 403 responses are handled
    - Test error logging
    - Test token refresh retry
    - Test user-friendly error messages
    - _Requirements: 16.1, 16.2, 16.6_

- [x] 17. Update existing components with role-based directives
  - [x] 17.1 Update navigation components
    - Apply *roleBasedShow to menu items
    - Hide CM-only items from non-CM users
    - Hide Admin-only items from non-Admin users
    - Update navigation service with role checks
    - Add user management menu item (Admin only)
    - Add system configuration menu item (Admin only)
    - _Requirements: 15.1, 15.2_
  
  - [x] 17.2 Update data table components
    - Apply *roleBasedShow to action buttons
    - Hide delete buttons from CM users where appropriate
    - Hide admin operations from CM users
    - Add role-based column visibility
    - Add market column visibility for Admin
    - _Requirements: 15.3, 15.4_
  
  - [x] 17.3 Update form components
    - Apply role-based field visibility
    - Apply role-based field disabling
    - Add market selection dropdown for Admin users
    - Restrict market selection for CM users (auto-populate with their market)
    - Add role selection for Admin in user forms
    - _Requirements: 7.1, 7.2, 8.1, 8.2, 11.1, 15.3, 15.4_

- [x] 18. Implement approval workflow UI components
  - [x] 18.1 Create ApprovalQueueComponent
    - Display pending approvals for current user
    - Implement filtering by type, date, market
    - Implement sorting by submission date, priority
    - Add approve/reject/request changes actions
    - Add comment input for approval actions
    - Add required reason input for rejection
    - Integrate with WorkflowService
    - Add notification badge for pending count
    - _Requirements: 5.1, 5.2, 5.3, 5.5, 9.1, 9.2_
  
  - [x] 18.2 Create ApprovalDetailComponent
    - Display full approval task details
    - Show approval history and comments
    - Show related entity information (street sheet, daily report, etc.)
    - Implement approval action buttons
    - Add comment/reason input with validation
    - Add escalation button (Admin only)
    - Show approval workflow progress
    - _Requirements: 5.2, 5.3, 5.7, 9.2, 9.4, 10.2_
  
  - [ ]* 18.3 Write unit tests for approval components
    - Test approval queue displays correctly
    - Test filtering and sorting
    - Test approval actions
    - Test comment submission
    - Test rejection reason requirement
    - Test detail view
    - Test escalation (Admin only)
    - _Requirements: 5.1, 5.2, 5.3, 9.1, 9.2, 10.3_

- [x] 19. Implement user management UI (Admin)
  - [x] 19.1 Create UserManagementComponent
    - Display user list with filtering
    - Implement search by name, email, role
    - Implement filtering by role, market, approval status
    - Add create user button and modal
    - Add edit user functionality
    - Add deactivate user functionality with reason input
    - Add password reset functionality
    - Add pending user approvals section
    - Integrate with UserManagementService
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_
  
  - [x] 19.2 Create UserFormComponent
    - Implement user creation form with validation
    - Implement user editing form
    - Add required role selection dropdown
    - Add required market selection dropdown
    - Add form validation
    - Add permission configuration
    - Add notification preferences configuration
    - _Requirements: 11.1, 11.2, 11.7_
  
  - [ ]* 19.3 Write unit tests for user management components
    - Test user list display
    - Test filtering and search
    - Test user creation with required fields
    - Test user editing
    - Test user deactivation with reason
    - Test password reset
    - Test pending approvals section
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

- [x] 20. Checkpoint - Ensure all UI components are integrated
  - Ensure all tests pass, ask the user if questions arise.

- [x] 21. Implement end-to-end role-based scenarios
  - [x]* 21.1 Write E2E tests for CM workflows
    - Test CM login and dashboard access
    - Test CM viewing market-filtered data
    - Test CM street sheet access excludes RG markets
    - Test CM approval workflow
    - Test CM resource allocation
    - Test CM cannot access other markets
    - Test CM cannot access admin features
    - Test CM receives market-specific notifications
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.1, 5.2, 13.1, 19.5_
  
  - [x]* 21.2 Write E2E tests for Admin workflows
    - Test Admin login and dashboard access
    - Test Admin viewing all markets data including RG
    - Test Admin user management
    - Test Admin system configuration
    - Test Admin approval override
    - Test Admin resource reallocation between markets
    - Test Admin broadcast notifications
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 6.1, 6.3, 11.1, 11.2, 12.1, 14.2, 20.6_

- [x] 22. Performance optimization and caching
  - [x] 22.1 Implement caching for role-based data
    - Add caching to RoleBasedDataService for accessible markets
    - Implement cache invalidation on role change
    - Add caching to dashboard data fetching with TTL
    - Implement cache TTL configuration
    - Add cache warming on login
    - _Requirements: 1.6, 2.5, 15.6_
  
  - [x] 22.2 Optimize dashboard queries
    - Implement lazy loading for dashboard widgets
    - Add pagination to data tables
    - Optimize API calls with batch requests
    - Add loading states and skeleton screens
    - Implement incremental data loading
    - _Requirements: 1.6, 2.5, 2.6_

- [x] 23. Documentation and deployment preparation
  - [x] 23.1 Create user documentation
    - Document CM dashboard features and metrics
    - Document Admin dashboard features and system-wide views
    - Document approval workflows and processes
    - Document user management procedures
    - Document system configuration options
    - Document notification preferences
  
  - [x] 23.2 Create developer documentation
    - Document RoleBasedDataService usage and integration
    - Document guard configuration and route protection
    - Document directive usage (*roleBasedShow, *roleBasedDisable)
    - Document service integration patterns
    - Document testing strategies for role-based features
    - Document market filtering rules
  
  - [x] 23.3 Update API documentation
    - Document role-based endpoints
    - Document authorization requirements
    - Document market filtering behavior
    - Document error responses (403, 401)
    - Document request/response formats

- [x] 24. Final checkpoint - Complete system validation
  - Ensure all tests pass, ask the user if questions arise.
  - Verify all requirements are implemented
  - Verify all role-based features are functional
  - Verify authorization is enforced at all layers (UI, guards, services, API)
  - Verify market filtering works correctly for CM and Admin
  - Verify RG market exclusion for CM street sheets

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Implementation follows layered architecture: services → guards → components → integration
- Role-based filtering is enforced at multiple layers for defense in depth
- Market filtering automatically applied for CM users, bypassed for Admin users
- CM users have special RG market exclusion for street sheets only
- All Admin-only operations include authorization checks
- Property tests validate universal correctness properties across all inputs
- Unit tests validate specific examples, edge cases, and error conditions
- Integration tests validate component interactions and data flow
- E2E tests validate complete user workflows
- Checkpoints ensure incremental validation and allow for user feedback
