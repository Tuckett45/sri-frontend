# Implementation Plan: Notification System Separation

## Overview

This implementation plan separates notification systems between ARK (legacy) and ATLAS (new additions) by creating dedicated namespaces, services, and models for each domain. The approach maintains backward compatibility while establishing clear boundaries that allow independent evolution of both systems.

The implementation follows a phased approach:
1. Create domain-specific models and services
2. Integrate with existing systems (FRM, SignalR)
3. Implement domain separation and validation
4. Create migration scripts and update imports
5. Add comprehensive error handling
6. Write tests and documentation

## Tasks

- [x] 1. Create ARK notification namespace and models
  - Create directory structure `src/app/services/ark/` and `src/app/models/ark/`
  - Create `src/app/models/ark/notification.model.ts` with all ARK notification types, enums, and interfaces
  - Define ArkNotificationType enum with all ARK and FRM notification types
  - Define ArkNotificationChannel, ArkNotificationPriority, ArkNotificationStatus enums
  - Define ArkNotification, ArkNotificationPreferences, ArkNotificationTemplate, ArkNotificationLog, ArkBroadcastNotification interfaces
  - _Requirements: 1.1, 1.4, 8.1_

- [x] 2. Implement ARK notification service
  - [x] 2.1 Create ARK notification service file
    - Create `src/app/services/ark/ark-notification.service.ts`
    - Implement all notification management methods (sendNotification, getNotificationsForUser, markAsRead, etc.)
    - Implement preference management methods (configureNotificationPreferences, getNotificationPreferences)
    - Implement admin features (sendBroadcast, getNotificationLogs, configureNotificationTemplates)
    - Implement approval reminder and high-priority notification methods
    - Inject HttpClient, AuthService, and RoleBasedDataService
    - Apply market-based filtering for CM users
    - _Requirements: 1.2, 5.1, 5.3_
  
  - [ ]* 2.2 Write property test for ARK notification type validation
    - **Property 2: ARK Notification Type Validation**
    - **Validates: Requirements 8.3, 8.5**
  
  - [ ]* 2.3 Write property test for backward compatibility
    - **Property 11: Backward Compatibility for ARK Features**
    - **Validates: Requirements 5.1, 5.2, 5.3**
  
  - [ ]* 2.4 Write unit tests for ARK notification service
    - Test sendNotification with valid notification
    - Test getNotificationsForUser with market filtering for CM users
    - Test sendBroadcast for Admin users only
    - Test markAsRead and markAllAsRead
    - Test preference management
    - Test error conditions (unauthorized access, invalid types)
    - _Requirements: 10.1_

- [x] 3. Create ATLAS notification models
  - Create `src/app/features/atlas/models/atlas-notification.model.ts`
  - Define AtlasNotificationType enum (deployment_created, deployment_updated, deployment_status_changed, connectivity_alert, system_health_alert, evidence_submitted, approval_requested, etc.)
  - Define AtlasNotificationPriority, AtlasNotificationStatus, AtlasConnectivityAlertType, AtlasHealthSeverity enums
  - Define AtlasNotification, AtlasNotificationPreferences, AtlasNotificationFilters interfaces
  - _Requirements: 2.2, 8.2_

- [x] 4. Implement ATLAS notification service
  - [x] 4.1 Create ATLAS notification service file
    - Create `src/app/features/atlas/services/atlas-notification.service.ts`
    - Implement deployment notification methods (sendDeploymentCreatedNotification, sendDeploymentUpdatedNotification, sendDeploymentStatusChangedNotification)
    - Implement connectivity alert method (sendConnectivityAlert)
    - Implement system health alert method (sendSystemHealthAlert)
    - Implement evidence and approval notification methods (sendEvidenceSubmittedNotification, sendApprovalRequestedNotification)
    - Implement user notification query methods (getNotificationsForUser, markAsRead, markAllAsRead)
    - Implement preference management methods (getNotificationPreferences, updateNotificationPreferences)
    - Implement real-time subscription methods (subscribeToNotifications, unsubscribeFromNotifications)
    - Inject HttpClient, AtlasSignalRService, AtlasAuthService, and Store
    - _Requirements: 2.1, 2.5, 6.1, 6.2, 6.3_
  
  - [ ]* 4.2 Write property test for ATLAS notification type validation
    - **Property 1: ATLAS Notification Type Validation**
    - **Validates: Requirements 2.3, 8.3, 8.4**
  
  - [ ]* 4.3 Write property test for SignalR integration
    - **Property 3: SignalR Integration for ATLAS Notifications**
    - **Validates: Requirements 2.4, 6.4**
  
  - [ ]* 4.4 Write property test for SignalR fallback
    - **Property 17: SignalR Fallback to Polling**
    - **Validates: Requirements 6.5**
  
  - [ ]* 4.5 Write unit tests for ATLAS notification service
    - Test deployment notification methods
    - Test connectivity alert notifications
    - Test system health alert notifications
    - Test preference management
    - Test SignalR subscription and unsubscription
    - Test error conditions (deployment not found, subscription failure)
    - _Requirements: 10.2_

- [x] 5. Integrate ATLAS notifications with SignalR
  - [x] 5.1 Update ATLAS notification service to use SignalR
    - Add logic to check SignalR connection status before sending notifications
    - When SignalR is connected, send notifications via SignalR
    - When SignalR is disconnected, fall back to HTTP polling
    - Subscribe to SignalR connectivity events to update delivery mechanism
    - Implement exponential backoff for polling fallback (2s, 10s, 30s, 60s)
    - _Requirements: 2.4, 6.4, 6.5_
  
  - [ ]* 5.2 Write property test for deployment status notifications
    - **Property 14: Deployment Status Change Notifications**
    - **Validates: Requirements 6.1**
  
  - [ ]* 5.3 Write property test for connectivity alert notifications
    - **Property 15: Connectivity Alert Notifications**
    - **Validates: Requirements 6.2**
  
  - [ ]* 5.4 Write property test for system health alert notifications
    - **Property 16: System Health Alert Notifications**
    - **Validates: Requirements 6.3**

- [x] 6. Checkpoint - Ensure core services are implemented
  - Verify ARK notification service is fully implemented
  - Verify ATLAS notification service is fully implemented
  - Verify SignalR integration is working
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Create FRM notification adapter
  - [x] 7.1 Implement FRM notification adapter service
    - Create `src/app/features/field-resource-management/services/frm-notification-adapter.service.ts`
    - Inject ArkNotificationService and AuthService
    - Implement job notification methods (sendJobAssignedNotification, sendJobReassignedNotification, sendJobStatusChangedNotification, sendJobCancelledNotification)
    - Implement certification notification method (sendCertificationExpiringNotification)
    - Implement conflict notification method (sendConflictDetectedNotification)
    - Map FRM notification types to ARK notification types
    - Implement preference management methods (getFrmNotificationPreferences, updateFrmNotificationPreferences)
    - _Requirements: 3.1, 3.2, 3.3_
  
  - [ ]* 7.2 Write property test for FRM notification routing
    - **Property 4: FRM Notification Routing**
    - **Validates: Requirements 3.1**
  
  - [ ]* 7.3 Write property test for FRM preferences in ARK model
    - **Property 5: FRM Preferences in ARK Model**
    - **Validates: Requirements 3.2**
  
  - [ ]* 7.4 Write property test for market filtering for CM users
    - **Property 6: Market Filtering for CM Users**
    - **Validates: Requirements 3.4**
  
  - [ ]* 7.5 Write property test for Admin access to all FRM notifications
    - **Property 7: Admin Access to All FRM Notifications**
    - **Validates: Requirements 3.5**
  
  - [ ]* 7.6 Write unit tests for FRM notification adapter
    - Test all job notification methods
    - Test certification expiring notifications
    - Test conflict detected notifications
    - Test preference management
    - Test error conditions (job not found, technician not found)
    - _Requirements: 10.1_

- [x] 8. Update existing FRM notification service
  - [x] 8.1 Refactor FRM notification service to use adapter
    - Update `src/app/features/field-resource-management/services/notification.service.ts`
    - Inject FrmNotificationAdapterService
    - Delegate all notification sending to the adapter
    - Keep existing method signatures for backward compatibility
    - _Requirements: 3.1, 5.2_

- [x] 9. Implement domain separation validation
  - [x] 9.1 Add type validation to notification services
    - Add validateNotificationType method to ArkNotificationService
    - Add validateNotificationType method to AtlasNotificationService
    - Validate notification types before creating notifications
    - Throw error if type doesn't match domain (400 Bad Request)
    - _Requirements: 8.3, 8.4, 8.5_
  
  - [ ]* 9.2 Write property test for ARK and ATLAS model separation
    - **Property 8: ARK and ATLAS Model Separation**
    - **Validates: Requirements 4.1**
  
  - [ ]* 9.3 Write property test for preference separation
    - **Property 9: ARK and ATLAS Preference Separation**
    - **Validates: Requirements 4.3**
  
  - [ ]* 9.4 Write property test for domain isolation
    - **Property 10: Domain Isolation During Processing**
    - **Validates: Requirements 4.4, 4.5**
  
  - [ ]* 9.5 Write unit tests for type validation
    - Test ARK service rejects ATLAS notification types
    - Test ATLAS service rejects ARK notification types
    - Test error messages are descriptive
    - _Requirements: 8.3, 8.4, 8.5_

- [x] 10. Implement independent preference management
  - [x] 10.1 Create separate preference endpoints
    - Ensure ARK notification preferences use `/api/ark/notifications/preferences`
    - Ensure ATLAS notification preferences use `/api/atlas/notifications/preferences`
    - Update ArkNotificationService to use ARK preference endpoint
    - Update AtlasNotificationService to use ATLAS preference endpoint
    - _Requirements: 7.1, 7.2_
  
  - [ ]* 10.2 Write property test for preference update isolation
    - **Property 18: Preference Update Isolation**
    - **Validates: Requirements 7.3, 7.4**
  
  - [ ]* 10.3 Write property test for independent domain control
    - **Property 19: Independent Domain Control**
    - **Validates: Requirements 7.5**
  
  - [ ]* 10.4 Write unit tests for preference management
    - Test updating ARK preferences doesn't affect ATLAS preferences
    - Test updating ATLAS preferences doesn't affect ARK preferences
    - Test enabling/disabling notifications per domain
    - _Requirements: 7.3, 7.4, 7.5_

- [x] 11. Checkpoint - Ensure domain separation is complete
  - Verify type validation is working correctly
  - Verify preference management is independent
  - Verify no cross-domain dependencies exist
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Create migration scripts
  - [ ] 12.1 Implement import update script
    - Create `scripts/migrate-notification-imports.ts`
    - Scan all TypeScript files for notification service imports
    - Update imports from `src/app/services/notification.service` to `src/app/services/ark/ark-notification.service`
    - Update imports from `src/app/models/notification.model` to `src/app/models/ark/notification.model`
    - Create backup of each modified file before updating (`.backup` extension)
    - Log all changes made to console and migration log file
    - _Requirements: 9.1, 9.2, 9.4_
  
  - [ ] 12.2 Implement file move script
    - Create `scripts/migrate-notification-files.ts`
    - Move `src/app/services/notification.service.ts` to `src/app/services/ark/ark-notification.service.ts`
    - Move `src/app/models/notification.model.ts` to `src/app/models/ark/notification.model.ts`
    - Create backup of original files before moving
    - Validate file moves completed successfully
    - _Requirements: 9.2, 9.4_
  
  - [ ] 12.3 Implement validation script
    - Create `scripts/validate-notification-migration.ts`
    - Check that all imports resolve correctly (no broken imports)
    - Check that no references to old paths remain
    - Check that all services are properly injected in constructors
    - Report any issues found with file path and line number
    - _Requirements: 9.3_
  
  - [ ] 12.4 Implement rollback script
    - Create `scripts/rollback-notification-migration.ts`
    - Restore all files from backups (`.backup` files)
    - Revert all import changes
    - Validate rollback completed successfully
    - _Requirements: 9.5_
  
  - [ ]* 12.5 Write unit tests for migration scripts
    - Test import update script with sample files
    - Test file move script with sample files
    - Test validation script detects broken imports
    - Test rollback script restores original state
    - _Requirements: 9.1, 9.2, 9.3, 9.5_

- [ ] 13. Update all component imports
  - [ ] 13.1 Update ARK component imports
    - Update all components using notification service to import from ARK namespace
    - Update approval queue component (`src/app/features/field-resource-management/components/approvals/approval-queue/`)
    - Update approval detail component (`src/app/features/field-resource-management/components/approvals/approval-detail/`)
    - Update admin dashboard component (`src/app/features/field-resource-management/components/reporting/admin-dashboard/`)
    - Update CM dashboard component (`src/app/features/field-resource-management/components/reporting/cm-dashboard/`)
    - Update user management components (`src/app/features/field-resource-management/components/admin/`)
    - _Requirements: 1.3, 1.5_
  
  - [ ] 13.2 Update ATLAS component imports
    - Update ATLAS components to use ATLAS notification service
    - Update deployment components (`src/app/features/atlas/components/deployments/`)
    - Update agent components (`src/app/features/atlas/components/agents/`)
    - Update approval components (`src/app/features/atlas/components/approvals/`)
    - _Requirements: 2.1_
  
  - [ ]* 13.3 Write unit tests for updated components
    - Test ARK components use ArkNotificationService
    - Test ATLAS components use AtlasNotificationService
    - Test components handle notification errors gracefully
    - _Requirements: 1.3, 1.5, 2.1_

- [ ] 14. Implement data migration for user preferences
  - [ ] 14.1 Create preference migration script
    - Create `scripts/migrate-user-preferences.ts`
    - Read existing notification preferences from database
    - Create ARK notification preferences with same values
    - Create default ATLAS notification preferences (all enabled)
    - Validate all users have both ARK and ATLAS preferences
    - Log migration progress and any errors
    - _Requirements: 5.4_
  
  - [ ]* 14.2 Write property test for user preference preservation
    - **Property 12: User Preference Preservation**
    - **Validates: Requirements 5.4**
  
  - [ ]* 14.3 Write unit tests for preference migration
    - Test migration creates ARK preferences with correct values
    - Test migration creates default ATLAS preferences
    - Test migration handles missing preferences gracefully
    - Test migration is idempotent (can run multiple times safely)
    - _Requirements: 5.4_

- [ ] 15. Implement data migration for templates and logs
  - [ ] 15.1 Create template and log migration script
    - Create `scripts/migrate-templates-and-logs.ts`
    - Read existing notification templates from database
    - Update templates to use ARK notification types
    - Read existing notification logs from database
    - Ensure logs reference ARK notification types
    - Validate all templates and logs are accessible after migration
    - Log migration progress and any errors
    - _Requirements: 5.5_
  
  - [ ]* 15.2 Write property test for template and log compatibility
    - **Property 13: Template and Log Compatibility**
    - **Validates: Requirements 5.5**
  
  - [ ]* 15.3 Write unit tests for template and log migration
    - Test templates are updated to ARK types
    - Test logs are updated to ARK types
    - Test templates remain functional after migration
    - Test logs remain accessible after migration
    - _Requirements: 5.5_

- [ ] 16. Checkpoint - Ensure migration is complete
  - Verify all imports are updated correctly
  - Verify all components use correct notification services
  - Verify user preferences are migrated
  - Verify templates and logs are migrated
  - Run validation script to check for issues
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 17. Add comprehensive error handling
  - [ ] 17.1 Implement ARK notification error handling
    - Add error handling for invalid market access (403 Forbidden with message "Access denied to notification from different market")
    - Add error handling for unauthorized broadcast (403 Forbidden with message "Only Admin users can send broadcast notifications")
    - Add error handling for invalid notification type (400 Bad Request with message "Invalid ARK notification type")
    - Add error handling for template not found (404 Not Found with message "Notification template not found")
    - Add error handling for preference update failure (500 Internal Server Error with message "Failed to update notification preferences")
    - Log all errors with appropriate context (user ID, notification ID, error details)
    - _Requirements: 5.1_
  
  - [ ] 17.2 Implement ATLAS notification error handling
    - Add error handling for SignalR connection failure (log error, emit connectivity notification, fall back to polling)
    - Add error handling for invalid ATLAS notification type (400 Bad Request with message "Invalid ATLAS notification type")
    - Add error handling for deployment not found (404 Not Found with message "Deployment not found")
    - Add error handling for subscription failure (500 Internal Server Error with message "Failed to subscribe to notifications")
    - Add error handling for polling fallback failure (log error, retry with exponential backoff: 2s, 10s, 30s, 60s)
    - _Requirements: 6.5_
  
  - [ ] 17.3 Implement FRM adapter error handling
    - Add error handling for ARK service unavailable (503 Service Unavailable with message "Notification service temporarily unavailable")
    - Add error handling for invalid FRM notification type (400 Bad Request with message "Invalid FRM notification type")
    - Add error handling for job not found (404 Not Found with message "Job not found")
    - Add error handling for technician not found (404 Not Found with message "Technician not found")
    - _Requirements: 3.1_
  
  - [ ] 17.4 Implement cross-domain error prevention
    - Add type mismatch detection at service boundaries
    - Ensure errors in one domain don't cascade to other domain (isolate error handling)
    - Implement graceful degradation when one domain fails (other domain continues operating)
    - _Requirements: 4.4, 4.5_
  
  - [ ]* 17.5 Write unit tests for error handling
    - Test all ARK error scenarios
    - Test all ATLAS error scenarios
    - Test all FRM adapter error scenarios
    - Test cross-domain error isolation
    - Test graceful degradation
    - _Requirements: 4.4, 4.5, 5.1, 6.5_

- [ ]* 18. Write integration tests
  - [ ]* 18.1 Write end-to-end notification flow tests
    - Test ARK notification creation, delivery, and marking as read
    - Test ATLAS notification creation, SignalR delivery, and marking as read
    - Test FRM notification routing through ARK service
    - _Requirements: 10.3_
  
  - [ ]* 18.2 Write preference update integration tests
    - Test updating ARK preferences doesn't affect ATLAS preferences
    - Test updating ATLAS preferences doesn't affect ARK preferences
    - Test preference changes are persisted correctly
    - _Requirements: 10.3_
  
  - [ ]* 18.3 Write migration integration tests
    - Test running all migration scripts in sequence
    - Test validation script detects issues
    - Test rollback script restores original state
    - _Requirements: 10.3_
  
  - [ ]* 18.4 Write SignalR integration tests
    - Test ATLAS notifications delivered via SignalR when connected
    - Test fallback to polling when SignalR disconnected
    - Test reconnection restores SignalR delivery
    - _Requirements: 10.3_

- [ ] 19. Update documentation
  - [ ] 19.1 Create ARK notification service documentation
    - Create `docs/ARK_NOTIFICATION_SERVICE.md`
    - Document all ARK notification service methods with parameters and return types
    - Document ARK notification types and models with examples
    - Document market-based filtering for CM users with examples
    - Document Admin-only features (broadcast, templates, logs) with examples
    - Provide usage examples for common scenarios (sending notifications, managing preferences, creating templates)
    - _Requirements: 1.1, 5.1_
  
  - [ ] 19.2 Create ATLAS notification service documentation
    - Create `docs/ATLAS_NOTIFICATION_SERVICE.md`
    - Document all ATLAS notification service methods with parameters and return types
    - Document ATLAS notification types and models with examples
    - Document SignalR integration and fallback behavior with diagrams
    - Provide usage examples for common scenarios (deployment notifications, connectivity alerts, system health alerts)
    - _Requirements: 2.1, 6.4, 6.5_
  
  - [ ] 19.3 Create FRM adapter documentation
    - Create `docs/FRM_NOTIFICATION_ADAPTER.md`
    - Document FRM notification adapter methods with parameters and return types
    - Document how FRM notification types map to ARK notification types (table format)
    - Provide usage examples for common scenarios (job notifications, certification expiring, conflict detection)
    - _Requirements: 3.1_
  
  - [ ] 19.4 Create migration guide
    - Create `docs/NOTIFICATION_MIGRATION_GUIDE.md`
    - Document migration process step-by-step with commands
    - Document how to run migration scripts (import update, file move, validation)
    - Document how to validate migration (validation script, manual checks)
    - Document how to rollback if needed (rollback script, manual steps)
    - Include troubleshooting section for common issues
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - [ ] 19.5 Update main README
    - Update main README to reference new notification documentation
    - Add section on notification system architecture
    - Add links to ARK, ATLAS, and FRM documentation
    - Add link to migration guide
    - _Requirements: 1.1, 2.1, 3.1_

- [ ] 20. Final checkpoint - Ensure all tests pass
  - Run all unit tests and verify they pass
  - Run all property tests and verify they pass
  - Run all integration tests and verify they pass
  - Verify error handling works correctly
  - Verify documentation is complete and accurate
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties using fast-check library (minimum 100 iterations)
- Unit tests validate specific examples, edge cases, and error conditions
- Integration tests validate end-to-end flows and cross-component interactions
- Migration scripts include backup and rollback capabilities for safety
- Error handling ensures graceful degradation and domain isolation
- Documentation provides comprehensive guidance for developers and users
