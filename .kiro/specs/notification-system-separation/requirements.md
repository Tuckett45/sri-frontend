# Requirements Document

## Introduction

This document specifies the requirements for separating notification systems between ARK (legacy) and ATLAS (new additions) within the application. The current implementation has three notification services that need proper domain separation: ARK Legacy Notifications (role-based with market filtering), FRM Notifications (job-related), and ATLAS Notifications (real-time connectivity). This separation will ensure clear boundaries, prevent conflicts, and allow both systems to operate independently while maintaining backward compatibility.

## Glossary

- **ARK**: The legacy application system containing role-based notification management with Admin/CM roles and market-based filtering
- **ATLAS**: The new application system for deployment management with real-time connectivity notifications
- **FRM**: Field Resource Management module within ARK that handles job-related notifications
- **Notification_Service**: The service responsible for managing notification delivery, preferences, and templates
- **SignalR_Service**: The real-time communication service used by ATLAS for connectivity notifications
- **Market**: A geographic or organizational boundary used for filtering notifications in ARK
- **Notification_Channel**: The delivery mechanism for notifications (Email, InApp, SMS)
- **Notification_Domain**: A logical separation boundary for notification systems (ARK vs ATLAS)

## Requirements

### Requirement 1: ARK Notification Namespace

**User Story:** As a developer, I want ARK notifications to have a dedicated namespace, so that they are clearly separated from ATLAS notifications and avoid naming conflicts.

#### Acceptance Criteria

1. THE System SHALL create a dedicated ARK notification namespace at `src/app/services/ark/`
2. THE System SHALL move the existing notification service to `src/app/services/ark/ark-notification.service.ts`
3. THE System SHALL update all imports referencing the legacy notification service to use the new ARK namespace
4. THE System SHALL maintain the existing notification model at `src/app/models/ark/notification.model.ts`
5. WHEN ARK notification services are imported, THE System SHALL use the ARK namespace path

### Requirement 2: ATLAS Notification Service

**User Story:** As a developer, I want a dedicated ATLAS notification service, so that ATLAS-specific notifications are handled independently from ARK notifications.

#### Acceptance Criteria

1. THE System SHALL create an ATLAS notification service at `src/app/features/atlas/services/atlas-notification.service.ts`
2. THE System SHALL define ATLAS notification models at `src/app/features/atlas/models/atlas-notification.model.ts`
3. WHEN ATLAS notifications are created, THE System SHALL use ATLAS-specific notification types (connectivity, deployment status, system health)
4. THE System SHALL integrate the ATLAS notification service with the existing SignalR service for real-time delivery
5. THE System SHALL provide methods for sending deployment status notifications, connectivity alerts, and system health notifications

### Requirement 3: FRM Notification Integration

**User Story:** As a developer, I want FRM notifications to be properly integrated with the ARK notification system, so that job-related notifications follow the same patterns as other ARK notifications.

#### Acceptance Criteria

1. WHEN FRM notifications are sent, THE System SHALL use the ARK notification service
2. THE System SHALL maintain FRM-specific notification preferences within the ARK notification preferences model
3. THE System SHALL support FRM notification types (job assigned, job reassigned, job status changed, job cancelled, certification expiring, conflict detected)
4. THE System SHALL apply market-based filtering to FRM notifications for CM users
5. THE System SHALL allow Admin users to access all FRM notifications system-wide

### Requirement 4: Notification Domain Separation

**User Story:** As a system architect, I want clear separation between ARK and ATLAS notification domains, so that the two systems can evolve independently without conflicts.

#### Acceptance Criteria

1. THE System SHALL maintain separate notification models for ARK and ATLAS domains
2. THE System SHALL maintain separate notification services for ARK and ATLAS domains
3. THE System SHALL maintain separate notification preferences for ARK and ATLAS domains
4. WHEN ARK notifications are processed, THE System SHALL not interact with ATLAS notification components
5. WHEN ATLAS notifications are processed, THE System SHALL not interact with ARK notification components

### Requirement 5: Backward Compatibility

**User Story:** As a developer, I want existing ARK notification functionality to remain unchanged, so that current features continue to work without regression.

#### Acceptance Criteria

1. THE System SHALL preserve all existing ARK notification features (role-based management, market filtering, multi-channel delivery, broadcast notifications, templates, preferences, approval reminders, audit logs)
2. WHEN existing ARK components use notifications, THE System SHALL continue to function without modification to business logic
3. THE System SHALL maintain the same API contracts for ARK notification methods
4. THE System SHALL preserve existing notification preferences for all users
5. THE System SHALL maintain backward compatibility for notification templates and logs

### Requirement 6: ATLAS Real-Time Notifications

**User Story:** As an ATLAS user, I want to receive real-time notifications about deployment status and system health, so that I can respond quickly to important events.

#### Acceptance Criteria

1. WHEN a deployment status changes, THE System SHALL send an ATLAS notification via SignalR
2. WHEN connectivity issues occur, THE System SHALL send an ATLAS connectivity notification
3. WHEN system health alerts are triggered, THE System SHALL send an ATLAS system health notification
4. THE System SHALL deliver ATLAS notifications through the SignalR connection when available
5. WHEN SignalR is unavailable, THE System SHALL fall back to polling for ATLAS notifications

### Requirement 7: Independent Configuration

**User Story:** As a user, I want to configure ARK and ATLAS notification preferences independently, so that I can control each system's notifications separately.

#### Acceptance Criteria

1. THE System SHALL provide separate preference management for ARK notifications
2. THE System SHALL provide separate preference management for ATLAS notifications
3. WHEN a user updates ARK notification preferences, THE System SHALL not affect ATLAS notification preferences
4. WHEN a user updates ATLAS notification preferences, THE System SHALL not affect ARK notification preferences
5. THE System SHALL allow users to enable or disable notifications for each domain independently

### Requirement 8: Notification Type Separation

**User Story:** As a developer, I want notification types to be clearly separated by domain, so that it's obvious which system a notification belongs to.

#### Acceptance Criteria

1. THE System SHALL define ARK notification types (approval_reminder, critical_issue, broadcast, workflow_update, user_management, resource_allocation, reporting)
2. THE System SHALL define ATLAS notification types (deployment_created, deployment_updated, deployment_status_changed, connectivity_alert, system_health_alert, evidence_submitted, approval_requested)
3. WHEN a notification is created, THE System SHALL validate that the notification type matches the domain
4. THE System SHALL prevent ARK notification types from being used in ATLAS notifications
5. THE System SHALL prevent ATLAS notification types from being used in ARK notifications

### Requirement 9: Migration Path

**User Story:** As a developer, I want a clear migration path for moving from the old notification structure to the new separated structure, so that the transition is smooth and safe.

#### Acceptance Criteria

1. THE System SHALL provide a migration script that updates all notification service imports
2. THE System SHALL provide a migration script that moves notification files to the new namespace structure
3. WHEN the migration runs, THE System SHALL validate that all imports are updated correctly
4. WHEN the migration runs, THE System SHALL create backup copies of modified files
5. THE System SHALL provide rollback capability if the migration fails

### Requirement 10: Testing and Validation

**User Story:** As a developer, I want comprehensive tests for the separated notification systems, so that I can verify both systems work correctly and independently.

#### Acceptance Criteria

1. THE System SHALL provide unit tests for ARK notification service covering all existing functionality
2. THE System SHALL provide unit tests for ATLAS notification service covering all ATLAS-specific functionality
3. THE System SHALL provide integration tests verifying ARK and ATLAS notifications operate independently
4. WHEN tests run, THE System SHALL verify that ARK notifications do not interfere with ATLAS notifications
5. WHEN tests run, THE System SHALL verify that ATLAS notifications do not interfere with ARK notifications
