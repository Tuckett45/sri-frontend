# Design Document: Notification System Separation

## Overview

This design document outlines the architecture for separating notification systems between ARK (legacy) and ATLAS (new additions). The separation creates clear domain boundaries, prevents conflicts, and allows independent evolution of both systems while maintaining backward compatibility.

The design introduces:
- Dedicated ARK notification namespace with preserved functionality
- New ATLAS notification service integrated with SignalR
- Clear separation of notification models, services, and preferences
- Migration strategy for transitioning existing code
- Independent configuration for each domain

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────┐      ┌──────────────────────┐    │
│  │   ARK Domain         │      │   ATLAS Domain       │    │
│  │                      │      │                      │    │
│  │  ┌────────────────┐  │      │  ┌────────────────┐  │    │
│  │  │ ARK            │  │      │  │ ATLAS          │  │    │
│  │  │ Notification   │  │      │  │ Notification   │  │    │
│  │  │ Service        │  │      │  │ Service        │  │    │
│  │  └────────────────┘  │      │  └────────────────┘  │    │
│  │         │            │      │         │            │    │
│  │         ▼            │      │         ▼            │    │
│  │  ┌────────────────┐  │      │  ┌────────────────┐  │    │
│  │  │ ARK            │  │      │  │ ATLAS          │  │    │
│  │  │ Notification   │  │      │  │ SignalR        │  │    │
│  │  │ Models         │  │      │  │ Service        │  │    │
│  │  └────────────────┘  │      │  └────────────────┘  │    │
│  │         │            │      │         │            │    │
│  │  ┌──────┴──────┐     │      │  ┌──────┴──────┐     │    │
│  │  │ FRM         │     │      │  │ ATLAS       │     │    │
│  │  │ Integration │     │      │  │ Models      │     │    │
│  │  └─────────────┘     │      │  └─────────────┘     │    │
│  └──────────────────────┘      └──────────────────────┘    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Domain Separation Principles

1. **Namespace Isolation**: Each domain has its own namespace preventing naming conflicts
2. **Service Independence**: Services operate independently without cross-domain dependencies
3. **Model Separation**: Each domain defines its own notification models and types
4. **Configuration Independence**: Users can configure preferences for each domain separately
5. **Backward Compatibility**: Existing ARK functionality remains unchanged

## Components and Interfaces

### ARK Notification Service

**Location**: `src/app/services/ark/ark-notification.service.ts`

**Purpose**: Manages role-based notifications with market filtering for ARK domain

**Key Methods**:
```typescript
class ArkNotificationService {
  // Individual notification sending
  sendNotification(notification: Partial<ArkNotification>): Observable<ArkNotification>
  
  // User notifications with market filtering
  getNotificationsForUser(filters?: ArkNotificationFilters): Observable<ArkNotification[]>
  
  // Notification management
  getNotificationById(notificationId: string): Observable<ArkNotification>
  markAsRead(notificationId: string): Observable<ArkNotification>
  markAllAsRead(): Observable<{ count: number }>
  deleteNotification(notificationId: string): Observable<void>
  
  // Summary and preferences
  getNotificationSummary(): Observable<ArkNotificationSummary>
  configureNotificationPreferences(preferences: ArkNotificationPreferences): Observable<ArkNotificationPreferences>
  getNotificationPreferences(userId?: string): Observable<ArkNotificationPreferences>
  
  // Admin features
  sendBroadcast(broadcast: Partial<ArkBroadcastNotification>): Observable<ArkBroadcastNotification>
  getNotificationLogs(filters?: ArkNotificationFilters): Observable<ArkNotificationLog[]>
  configureNotificationTemplates(template: ArkNotificationTemplate): Observable<ArkNotificationTemplate>
  getNotificationTemplates(activeOnly?: boolean): Observable<ArkNotificationTemplate[]>
  deleteNotificationTemplate(templateId: string): Observable<void>
  
  // Approval reminders
  sendApprovalReminders(): Observable<{ count: number }>
  
  // High-priority notifications
  sendHighPriorityNotification(notification: Partial<ArkNotification>, channels?: ArkNotificationChannel[]): Observable<ArkNotification>
  sendCriticalIssueNotification(title: string, message: string, market?: string, metadata?: Record<string, any>): Observable<ArkNotification>
}
```

**Dependencies**:
- `HttpClient` for API communication
- `AuthService` for role-based access control
- `RoleBasedDataService` for market filtering

### ATLAS Notification Service

**Location**: `src/app/features/atlas/services/atlas-notification.service.ts`

**Purpose**: Manages ATLAS-specific notifications with real-time delivery via SignalR

**Key Methods**:
```typescript
class AtlasNotificationService {
  // Deployment notifications
  sendDeploymentCreatedNotification(deployment: AtlasDeployment): Observable<AtlasNotification>
  sendDeploymentUpdatedNotification(deployment: AtlasDeployment): Observable<AtlasNotification>
  sendDeploymentStatusChangedNotification(deploymentId: string, oldStatus: string, newStatus: string): Observable<AtlasNotification>
  
  // Connectivity notifications
  sendConnectivityAlert(alertType: AtlasConnectivityAlertType, message: string): Observable<AtlasNotification>
  
  // System health notifications
  sendSystemHealthAlert(severity: AtlasHealthSeverity, message: string, metadata?: Record<string, any>): Observable<AtlasNotification>
  
  // Evidence and approval notifications
  sendEvidenceSubmittedNotification(deploymentId: string, evidenceType: string): Observable<AtlasNotification>
  sendApprovalRequestedNotification(deploymentId: string, approverIds: string[]): Observable<AtlasNotification>
  
  // User notifications
  getNotificationsForUser(filters?: AtlasNotificationFilters): Observable<AtlasNotification[]>
  markAsRead(notificationId: string): Observable<AtlasNotification>
  markAllAsRead(): Observable<{ count: number }>
  
  // Preferences
  getNotificationPreferences(userId?: string): Observable<AtlasNotificationPreferences>
  updateNotificationPreferences(preferences: AtlasNotificationPreferences): Observable<AtlasNotificationPreferences>
  
  // Real-time subscription
  subscribeToNotifications(userId: string): string
  unsubscribeFromNotifications(subscriptionId: string): void
}
```

**Dependencies**:
- `HttpClient` for API communication
- `AtlasSignalRService` for real-time delivery
- `AtlasAuthService` for authentication
- `Store` for NgRx state management

### FRM Notification Integration

**Location**: `src/app/features/field-resource-management/services/frm-notification-adapter.service.ts`

**Purpose**: Adapts FRM notifications to use ARK notification service

**Key Methods**:
```typescript
class FrmNotificationAdapterService {
  // Job notifications
  sendJobAssignedNotification(jobId: string, technicianId: string): Observable<ArkNotification>
  sendJobReassignedNotification(jobId: string, oldTechnicianId: string, newTechnicianId: string): Observable<ArkNotification>
  sendJobStatusChangedNotification(jobId: string, oldStatus: string, newStatus: string): Observable<ArkNotification>
  sendJobCancelledNotification(jobId: string, reason: string): Observable<ArkNotification>
  
  // Certification notifications
  sendCertificationExpiringNotification(technicianId: string, certificationName: string, expiryDate: Date): Observable<ArkNotification>
  
  // Conflict notifications
  sendConflictDetectedNotification(conflictType: string, details: string): Observable<ArkNotification>
  
  // Preference management
  getFrmNotificationPreferences(userId: string): Observable<FrmNotificationPreferences>
  updateFrmNotificationPreferences(preferences: FrmNotificationPreferences): Observable<FrmNotificationPreferences>
}
```

**Dependencies**:
- `ArkNotificationService` for notification delivery
- `AuthService` for user context

## Data Models

### ARK Notification Models

**Location**: `src/app/models/ark/notification.model.ts`

```typescript
export enum ArkNotificationChannel {
  Email = 'email',
  InApp = 'in-app',
  SMS = 'sms'
}

export enum ArkNotificationPriority {
  Low = 'low',
  Normal = 'normal',
  High = 'high',
  Critical = 'critical'
}

export enum ArkNotificationStatus {
  Pending = 'pending',
  Sent = 'sent',
  Delivered = 'delivered',
  Failed = 'failed',
  Read = 'read'
}

export enum ArkNotificationType {
  ApprovalReminder = 'approval_reminder',
  CriticalIssue = 'critical_issue',
  Broadcast = 'broadcast',
  WorkflowUpdate = 'workflow_update',
  UserManagement = 'user_management',
  ResourceAllocation = 'resource_allocation',
  Reporting = 'reporting',
  // FRM types
  JobAssigned = 'job_assigned',
  JobReassigned = 'job_reassigned',
  JobStatusChanged = 'job_status_changed',
  JobCancelled = 'job_cancelled',
  CertificationExpiring = 'certification_expiring',
  ConflictDetected = 'conflict_detected'
}

export interface ArkNotification {
  id: string;
  userId: string;
  market?: string;
  title: string;
  message: string;
  type: ArkNotificationType;
  priority: ArkNotificationPriority;
  channels: ArkNotificationChannel[];
  status: ArkNotificationStatus;
  createdAt: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  metadata?: Record<string, any>;
  relatedEntityId?: string;
  relatedEntityType?: string;
}

export interface ArkNotificationPreferences {
  userId: string;
  email: boolean;
  inApp: boolean;
  sms: boolean;
  approvalReminders: boolean;
  escalationAlerts: boolean;
  dailyDigest: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  notificationTypes?: Record<ArkNotificationType, boolean>;
}

export interface ArkNotificationTemplate {
  id: string;
  name: string;
  type: ArkNotificationType;
  subject: string;
  bodyTemplate: string;
  channels: ArkNotificationChannel[];
  priority: ArkNotificationPriority;
  variables: string[];
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ArkNotificationLog {
  id: string;
  notificationId: string;
  userId: string;
  market?: string;
  channel: ArkNotificationChannel;
  status: ArkNotificationStatus;
  sentAt: Date;
  deliveredAt?: Date;
  failureReason?: string;
  metadata?: Record<string, any>;
}

export interface ArkBroadcastNotification {
  id: string;
  title: string;
  message: string;
  type: ArkNotificationType;
  priority: ArkNotificationPriority;
  channels: ArkNotificationChannel[];
  targetRoles?: string[];
  targetMarkets?: string[];
  targetUserIds?: string[];
  createdBy: string;
  createdAt: Date;
  scheduledFor?: Date;
  sentAt?: Date;
  recipientCount?: number;
}

export interface ArkNotificationFilters {
  userId?: string;
  market?: string;
  type?: ArkNotificationType;
  priority?: ArkNotificationPriority;
  status?: ArkNotificationStatus;
  startDate?: Date;
  endDate?: Date;
  unreadOnly?: boolean;
}

export interface ArkNotificationSummary {
  totalCount: number;
  unreadCount: number;
  byPriority: Record<ArkNotificationPriority, number>;
  byType: Record<ArkNotificationType, number>;
  byStatus: Record<ArkNotificationStatus, number>;
}
```

### ATLAS Notification Models

**Location**: `src/app/features/atlas/models/atlas-notification.model.ts`

```typescript
export enum AtlasNotificationType {
  DeploymentCreated = 'deployment_created',
  DeploymentUpdated = 'deployment_updated',
  DeploymentStatusChanged = 'deployment_status_changed',
  ConnectivityAlert = 'connectivity_alert',
  SystemHealthAlert = 'system_health_alert',
  EvidenceSubmitted = 'evidence_submitted',
  ApprovalRequested = 'approval_requested',
  ApprovalDecisionRecorded = 'approval_decision_recorded',
  ExceptionCreated = 'exception_created',
  AnalysisCompleted = 'analysis_completed',
  RiskAssessmentCompleted = 'risk_assessment_completed'
}

export enum AtlasNotificationPriority {
  Low = 'low',
  Normal = 'normal',
  High = 'high',
  Critical = 'critical'
}

export enum AtlasNotificationStatus {
  Pending = 'pending',
  Delivered = 'delivered',
  Read = 'read',
  Failed = 'failed'
}

export enum AtlasConnectivityAlertType {
  ConnectionLost = 'connection_lost',
  ConnectionRestored = 'connection_restored',
  ConnectionDegraded = 'connection_degraded',
  ReconnectionFailed = 'reconnection_failed'
}

export enum AtlasHealthSeverity {
  Info = 'info',
  Warning = 'warning',
  Error = 'error',
  Critical = 'critical'
}

export interface AtlasNotification {
  id: string;
  userId: string;
  type: AtlasNotificationType;
  title: string;
  message: string;
  priority: AtlasNotificationPriority;
  status: AtlasNotificationStatus;
  createdAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
  metadata?: Record<string, any>;
  deploymentId?: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
}

export interface AtlasNotificationPreferences {
  userId: string;
  enabled: boolean;
  deploymentNotifications: boolean;
  connectivityAlerts: boolean;
  systemHealthAlerts: boolean;
  evidenceNotifications: boolean;
  approvalNotifications: boolean;
  analysisNotifications: boolean;
  minimumPriority: AtlasNotificationPriority;
}

export interface AtlasNotificationFilters {
  userId?: string;
  type?: AtlasNotificationType;
  priority?: AtlasNotificationPriority;
  status?: AtlasNotificationStatus;
  deploymentId?: string;
  startDate?: Date;
  endDate?: Date;
  unreadOnly?: boolean;
}
```

### FRM Notification Preferences

**Location**: `src/app/features/field-resource-management/models/frm-notification-preferences.model.ts`

```typescript
export interface FrmNotificationPreferences {
  userId: string;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  jobAssignedEnabled: boolean;
  jobReassignedEnabled: boolean;
  jobStatusChangedEnabled: boolean;
  jobCancelledEnabled: boolean;
  certificationExpiringEnabled: boolean;
  conflictDetectedEnabled: boolean;
}
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: ATLAS Notification Type Validation

*For any* ATLAS notification, the notification type must be a valid ATLAS notification type (deployment_created, deployment_updated, deployment_status_changed, connectivity_alert, system_health_alert, evidence_submitted, approval_requested, approval_decision_recorded, exception_created, analysis_completed, risk_assessment_completed) and must not be an ARK notification type.

**Validates: Requirements 2.3, 8.3, 8.4**

### Property 2: ARK Notification Type Validation

*For any* ARK notification, the notification type must be a valid ARK notification type (approval_reminder, critical_issue, broadcast, workflow_update, user_management, resource_allocation, reporting, job_assigned, job_reassigned, job_status_changed, job_cancelled, certification_expiring, conflict_detected) and must not be an ATLAS notification type.

**Validates: Requirements 8.3, 8.5**

### Property 3: SignalR Integration for ATLAS Notifications

*For any* ATLAS notification that is sent, if the SignalR connection is available, the notification must be delivered through the SignalR service.

**Validates: Requirements 2.4, 6.4**

### Property 4: FRM Notification Routing

*For any* FRM notification (job_assigned, job_reassigned, job_status_changed, job_cancelled, certification_expiring, conflict_detected), the notification must be sent through the ARK notification service.

**Validates: Requirements 3.1**

### Property 5: FRM Preferences in ARK Model

*For any* FRM notification preference, the preference must be stored within the ARK notification preferences model and must include fields for all FRM notification types.

**Validates: Requirements 3.2**

### Property 6: Market Filtering for CM Users

*For any* FRM notification and any CM user, when the CM user queries notifications, the returned notifications must only include notifications where the market matches the CM user's market or the notification has no market specified.

**Validates: Requirements 3.4**

### Property 7: Admin Access to All FRM Notifications

*For any* set of FRM notifications across different markets and any Admin user, when the Admin user queries notifications, all FRM notifications must be returned regardless of market.

**Validates: Requirements 3.5**

### Property 8: ARK and ATLAS Model Separation

*For any* ARK notification model and any ATLAS notification model, the two models must be distinct types with no shared type hierarchy beyond basic TypeScript interfaces.

**Validates: Requirements 4.1**

### Property 9: ARK and ATLAS Preference Separation

*For any* user, ARK notification preferences and ATLAS notification preferences must be stored in separate data structures with independent fields.

**Validates: Requirements 4.3**

### Property 10: Domain Isolation During Processing

*For any* notification processing operation, if the notification is an ARK notification, no ATLAS service methods must be invoked, and if the notification is an ATLAS notification, no ARK service methods must be invoked.

**Validates: Requirements 4.4, 4.5**

### Property 11: Backward Compatibility for ARK Features

*For any* ARK notification service method that existed before the separation, the method must still exist with the same signature and produce the same behavior for the same inputs.

**Validates: Requirements 5.1, 5.2, 5.3**

### Property 12: User Preference Preservation

*For any* user with existing notification preferences before migration, after migration the user's ARK notification preferences must contain the same values as their original preferences.

**Validates: Requirements 5.4**

### Property 13: Template and Log Compatibility

*For any* notification template or notification log that existed before the separation, the template or log must still be accessible and readable after the separation with all original fields preserved.

**Validates: Requirements 5.5**

### Property 14: Deployment Status Change Notifications

*For any* deployment status change event, an ATLAS notification of type deployment_status_changed must be sent via SignalR to all users subscribed to that deployment.

**Validates: Requirements 6.1**

### Property 15: Connectivity Alert Notifications

*For any* connectivity issue event (connection_lost, connection_restored, connection_degraded, reconnection_failed), an ATLAS notification of type connectivity_alert must be sent to all active ATLAS users.

**Validates: Requirements 6.2**

### Property 16: System Health Alert Notifications

*For any* system health alert event with severity (info, warning, error, critical), an ATLAS notification of type system_health_alert must be sent to all users with ATLAS system health alerts enabled.

**Validates: Requirements 6.3**

### Property 17: SignalR Fallback to Polling

*For any* ATLAS notification, if the SignalR connection is unavailable or disconnected, the system must fall back to polling for notification delivery.

**Validates: Requirements 6.5**

### Property 18: Preference Update Isolation

*For any* user and any preference update, updating ARK notification preferences must not modify ATLAS notification preferences, and updating ATLAS notification preferences must not modify ARK notification preferences.

**Validates: Requirements 7.3, 7.4**

### Property 19: Independent Domain Control

*For any* user, enabling or disabling notifications for the ARK domain must not affect the enabled/disabled state of notifications for the ATLAS domain, and vice versa.

**Validates: Requirements 7.5**

## Error Handling

### ARK Notification Service Error Handling

1. **Invalid Market Access**: When a CM user attempts to access notifications from a different market, return 403 Forbidden with message "Access denied to notification from different market"

2. **Unauthorized Broadcast**: When a non-Admin user attempts to send broadcast notifications, return 403 Forbidden with message "Only Admin users can send broadcast notifications"

3. **Invalid Notification Type**: When a notification is created with an invalid ARK notification type, return 400 Bad Request with message "Invalid ARK notification type"

4. **Template Not Found**: When attempting to use a non-existent template, return 404 Not Found with message "Notification template not found"

5. **Preference Update Failure**: When preference update fails, return 500 Internal Server Error with message "Failed to update notification preferences" and log the error

### ATLAS Notification Service Error Handling

1. **SignalR Connection Failure**: When SignalR connection fails, log the error, emit a connectivity notification, and automatically fall back to polling

2. **Invalid ATLAS Notification Type**: When a notification is created with an invalid ATLAS notification type, return 400 Bad Request with message "Invalid ATLAS notification type"

3. **Deployment Not Found**: When attempting to send a deployment notification for a non-existent deployment, return 404 Not Found with message "Deployment not found"

4. **Subscription Failure**: When notification subscription fails, log the error and return 500 Internal Server Error with message "Failed to subscribe to notifications"

5. **Polling Fallback Failure**: When polling fallback fails, log the error and retry with exponential backoff (2s, 10s, 30s, 60s)

### FRM Notification Adapter Error Handling

1. **ARK Service Unavailable**: When ARK notification service is unavailable, log the error and return 503 Service Unavailable with message "Notification service temporarily unavailable"

2. **Invalid FRM Notification Type**: When an invalid FRM notification type is provided, return 400 Bad Request with message "Invalid FRM notification type"

3. **Job Not Found**: When attempting to send a job notification for a non-existent job, return 404 Not Found with message "Job not found"

4. **Technician Not Found**: When attempting to send a notification for a non-existent technician, return 404 Not Found with message "Technician not found"

### Cross-Domain Error Prevention

1. **Type Mismatch Detection**: Validate notification types at service boundaries to prevent ARK types in ATLAS notifications and vice versa

2. **Service Isolation**: Ensure error in one domain (ARK or ATLAS) does not cascade to the other domain

3. **Graceful Degradation**: If one notification domain fails, the other domain continues to operate normally

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests to ensure comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, and error conditions for each service
- **Property tests**: Verify universal properties across all inputs to ensure domain separation and backward compatibility

Together, these approaches provide comprehensive coverage where unit tests catch concrete bugs and property tests verify general correctness.

### Property-Based Testing

We will use **fast-check** (TypeScript property-based testing library) for property-based tests. Each property test will:
- Run a minimum of 100 iterations to ensure comprehensive input coverage
- Reference its corresponding design document property
- Use the tag format: **Feature: notification-system-separation, Property {number}: {property_text}**

### Unit Testing Focus

Unit tests will focus on:
- Specific examples of notification creation and delivery
- Edge cases (empty markets, missing users, invalid types)
- Error conditions (unauthorized access, service failures)
- Integration points between services (FRM adapter, SignalR integration)
- Migration script validation

### Property Testing Focus

Property tests will focus on:
- Type validation across all notification types
- Domain isolation across all operations
- Preference independence across all updates
- Backward compatibility across all ARK methods
- Market filtering across all CM user queries
- SignalR fallback behavior across all connection states

### Test Configuration

Each property-based test will:
1. Generate random valid inputs using fast-check arbitraries
2. Execute the operation under test
3. Assert the property holds for all generated inputs
4. Run for minimum 100 iterations
5. Include a comment tag referencing the design property

Example property test structure:
```typescript
// Feature: notification-system-separation, Property 1: ATLAS Notification Type Validation
it('should only accept valid ATLAS notification types', () => {
  fc.assert(
    fc.property(
      fc.record({
        type: fc.constantFrom(...Object.values(AtlasNotificationType)),
        // ... other fields
      }),
      (notification) => {
        const result = atlasNotificationService.validateNotificationType(notification.type);
        expect(result.isValid).toBe(true);
        expect(result.domain).toBe('ATLAS');
      }
    ),
    { numRuns: 100 }
  );
});
```

### Integration Testing

Integration tests will verify:
- End-to-end notification flow from creation to delivery
- FRM notifications routing through ARK service
- ATLAS notifications routing through SignalR
- Preference updates affecting only the target domain
- Migration script execution and validation

### Test Coverage Goals

- Unit test coverage: 90%+ for all services
- Property test coverage: All 19 correctness properties
- Integration test coverage: All critical user flows
- Error handling coverage: All error scenarios documented above
