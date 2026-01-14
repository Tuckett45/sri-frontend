# Design Document: Magic 8 Ball Notification Integration

## Overview

This design document describes the integration of Magic Eight Ball functionality with ARK's existing notification infrastructure. The integration will ensure that Magic 8 Ball responses leverage the same feature flags, configuration service, and notification delivery mechanisms (toast and push) as deployment notifications, providing a unified and consistent notification experience.

The design focuses on minimal changes to existing services while maximizing code reuse and maintaining architectural consistency. Magic 8 Ball notifications will respect the same user preferences, feature flags, and configuration settings as all other notification types in the system.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface Layer                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  UserNotificationsComponent / Magic8BallComponent    │  │
│  └────────────────────┬─────────────────────────────────┘  │
└───────────────────────┼─────────────────────────────────────┘
                        │
┌───────────────────────┼─────────────────────────────────────┐
│                Service Layer                                 │
│  ┌────────────────────▼──────────────────────────────────┐ │
│  │          Magic8BallService (Enhanced)                 │ │
│  │  - askQuestion()                                      │ │
│  │  - Uses NotificationOptions                           │ │
│  └──┬────────────────┬────────────────┬──────────────────┘ │
│     │                │                │                     │
│  ┌──▼──────────┐  ┌──▼──────────┐  ┌─▼──────────────────┐ │
│  │FeatureFlag  │  │Configuration│  │NotificationIntegrator│ │
│  │Service      │  │Service      │  │Service (New)        │ │
│  └─────────────┘  └─────────────┘  └──┬──────────────────┘ │
│                                        │                     │
│                        ┌───────────────┴──────────────┐     │
│                        │                              │     │
│                   ┌────▼────────┐            ┌────────▼───┐ │
│                   │ToastrService│            │PushService │ │
│                   └─────────────┘            └────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

1. **Centralized Notification Handling**: Create a new `NotificationIntegratorService` that handles notification delivery logic for both deployment and Magic 8 Ball notifications
2. **Configuration-Driven**: All notification behavior (timeouts, permissions, etc.) driven by `ConfigurationService`
3. **Feature Flag Controlled**: All notifications respect the `notifications` feature flag
4. **Graceful Degradation**: System continues to function even if notification delivery fails
5. **Preference Persistence**: User notification preferences stored in localStorage

## Components and Interfaces

### 1. Enhanced Magic8BallService

The existing `Magic8BallService` will be refactored to use the new notification integrator.

**Current Interface** (to be enhanced):
```typescript
interface Magic8BallNotificationOptions {
  showToast?: boolean;
  sendPush?: boolean;
  toastType?: 'info' | 'success' | 'warning' | 'error';
  pushTitle?: string;
}

class Magic8BallService {
  askQuestion(
    question: string, 
    options?: Magic8BallNotificationOptions
  ): Observable<Magic8BallResponse>
}
```

**Enhanced Implementation**:
- Remove direct dependencies on `ToastrService` and `DeploymentPushNotificationService`
- Inject new `NotificationIntegratorService` instead
- Delegate all notification logic to the integrator
- Focus solely on generating Magic 8 Ball responses

### 2. NotificationIntegratorService (New)

A new service that centralizes notification delivery logic for all notification types.

**Interface**:
```typescript
interface NotificationPayload {
  type: 'deployment' | 'magic-8-ball' | 'system';
  title: string;
  message: string;
  category?: 'positive' | 'negative' | 'neutral' | 'info' | 'warning' | 'error';
  metadata?: Record<string, any>;
  actions?: NotificationAction[];
}

interface NotificationDeliveryOptions {
  showToast: boolean;
  sendPush: boolean;
  toastType?: 'info' | 'success' | 'warning' | 'error';
  toastTimeout?: number;
  navigateOnClick?: string[];
}

class NotificationIntegratorService {
  // Send notification through configured channels
  sendNotification(
    payload: NotificationPayload,
    options: NotificationDeliveryOptions
  ): Promise<NotificationDeliveryResult>
  
  // Check if notifications are enabled
  areNotificationsEnabled(): boolean
  
  // Get notification configuration
  getNotificationConfig(): Observable<NotificationConfig>
  
  // Request notification permissions
  requestPermissions(): Promise<NotificationPermission>
}
```

**Responsibilities**:
- Check feature flag status before sending notifications
- Retrieve configuration from `ConfigurationService`
- Coordinate delivery via `ToastrService` and `DeploymentPushNotificationService`
- Handle errors gracefully with fallback behavior
- Log notification delivery status

### 3. NotificationPreferencesService (New)

A new service to manage user notification preferences.

**Interface**:
```typescript
interface NotificationPreferences {
  magic8Ball: {
    toastEnabled: boolean;
    pushEnabled: boolean;
    defaultToastType: 'info' | 'success' | 'warning' | 'error';
  };
  deployment: {
    toastEnabled: boolean;
    pushEnabled: boolean;
  };
}

class NotificationPreferencesService {
  // Get preferences for a notification type
  getPreferences(type: 'magic-8-ball' | 'deployment'): NotificationTypePreferences
  
  // Update preferences
  updatePreferences(
    type: 'magic-8-ball' | 'deployment', 
    preferences: Partial<NotificationTypePreferences>
  ): void
  
  // Reset to defaults
  resetPreferences(type?: 'magic-8-ball' | 'deployment'): void
  
  // Observable of current preferences
  preferences$: Observable<NotificationPreferences>
}
```

**Storage**:
- Preferences stored in localStorage with key `sri-notification-preferences`
- Defaults: `{ toastEnabled: true, pushEnabled: false, defaultToastType: 'info' }`

### 4. Enhanced UserNotificationsComponent

The existing component will be updated to use the new preference service.

**Changes**:
- Add notification preference controls to the UI
- Use `NotificationPreferencesService` to load/save preferences
- Apply preferences when asking Magic 8 Ball questions
- Display preference status in the UI

## Data Models

### NotificationPayload

```typescript
interface NotificationPayload {
  // Type identifier for routing and filtering
  type: 'deployment' | 'magic-8-ball' | 'system';
  
  // Display content
  title: string;
  message: string;
  
  // Optional category for styling/filtering
  category?: 'positive' | 'negative' | 'neutral' | 'info' | 'warning' | 'error';
  
  // Additional data for notification handlers
  metadata?: {
    deploymentId?: string;
    question?: string;
    answer?: string;
    timestamp?: string;
    [key: string]: any;
  };
  
  // Actions available in push notifications
  actions?: NotificationAction[];
}
```

### NotificationDeliveryOptions

```typescript
interface NotificationDeliveryOptions {
  // Channel controls
  showToast: boolean;
  sendPush: boolean;
  
  // Toast configuration
  toastType?: 'info' | 'success' | 'warning' | 'error';
  toastTimeout?: number;  // milliseconds, 0 = no auto-dismiss
  
  // Navigation on click
  navigateOnClick?: string[];  // Router commands
  
  // Push notification configuration
  pushTitle?: string;
  pushIcon?: string;
  pushBadge?: string;
  pushTag?: string;
  requireInteraction?: boolean;
}
```

### NotificationDeliveryResult

```typescript
interface NotificationDeliveryResult {
  success: boolean;
  toastDelivered: boolean;
  pushDelivered: boolean;
  errors: NotificationError[];
}

interface NotificationError {
  channel: 'toast' | 'push';
  error: Error;
  recoverable: boolean;
}
```

### NotificationPreferences

```typescript
interface NotificationPreferences {
  magic8Ball: NotificationTypePreferences;
  deployment: NotificationTypePreferences;
}

interface NotificationTypePreferences {
  toastEnabled: boolean;
  pushEnabled: boolean;
  defaultToastType: 'info' | 'success' | 'warning' | 'error';
}

// Default preferences
const DEFAULT_PREFERENCES: NotificationPreferences = {
  magic8Ball: {
    toastEnabled: true,
    pushEnabled: false,
    defaultToastType: 'info'
  },
  deployment: {
    toastEnabled: true,
    pushEnabled: false
  }
};
```

### Magic8BallNotificationMetadata

```typescript
interface Magic8BallNotificationMetadata {
  type: 'magic-8-ball';
  question: string;
  answer: string;
  category: 'positive' | 'negative' | 'neutral';
  timestamp: string;  // ISO 8601 format
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Feature Flag Enforcement
*For any* Magic 8 Ball question asked when the 'notifications' feature flag is disabled, no toast or push notifications should be sent regardless of user preferences.
**Validates: Requirements 1.1**

### Property 2: Preference Respect
*For any* Magic 8 Ball question asked when the 'notifications' feature flag is enabled, notifications should be sent only through the channels enabled in user preferences (toast and/or push).
**Validates: Requirements 1.2, 3.2, 3.3**

### Property 3: Response Always Returned
*For any* Magic 8 Ball question, a response should always be returned to the caller regardless of notification delivery success or failure.
**Validates: Requirements 3.5, 8.4**

### Property 4: Notification Content Completeness
*For any* Magic 8 Ball notification (toast or push), the notification content should include both the question and answer, formatted as "Q: [question]\nA: [answer]", with the emoji "🎱" in the title, and the response category in metadata.
**Validates: Requirements 4.2, 9.1, 9.2, 9.3, 9.4, 9.5**

### Property 5: Push Notification Structure
*For any* Magic 8 Ball push notification, the payload should include appropriate icons, badges, the "Ask Again" action, and all required metadata fields.
**Validates: Requirements 4.4, 11.4**

### Property 6: Toast Configuration
*For any* Magic 8 Ball toast notification, the timeout should match the response category (positive: 6s, negative: 8s, neutral: 5s), include progress bar and close button, and be positioned at toast-top-right.
**Validates: Requirements 2.2, 5.2, 5.4, 5.5**

### Property 7: Preference Persistence Round Trip
*For any* Magic 8 Ball notification preferences, saving them to storage and then loading them should produce equivalent preferences.
**Validates: Requirements 6.1, 6.2**

### Property 8: Preference Structure
*For any* saved Magic 8 Ball notification preferences, they should contain the fields: toastEnabled, pushEnabled, and defaultToastType.
**Validates: Requirements 6.3**

### Property 9: History Storage
*For any* Magic 8 Ball response delivered, it should be added to the notification history with type identifier "magic-8-ball" and all required metadata.
**Validates: Requirements 10.1, 10.2**

### Property 10: History Size Limit
*For any* notification history that has reached maxNotificationHistory limit, adding a new Magic 8 Ball notification should remove the oldest notification (FIFO).
**Validates: Requirements 10.4, 10.5**

## Error Handling

### Error Categories

1. **Feature Flag Disabled**
   - Behavior: Skip all notification delivery, return response normally
   - User Impact: No notifications shown
   - Logging: Debug level

2. **Configuration Service Unavailable**
   - Behavior: Use fallback configuration (toast-only with default timeouts)
   - User Impact: Push notifications unavailable, toast notifications work
   - Logging: Warning level
   - Recovery: Retry on next request

3. **Toast Notification Failure**
   - Behavior: Log error, continue with push notification if enabled
   - User Impact: No toast shown, push may still work
   - Logging: Error level
   - Recovery: None (transient failure)

4. **Push Notification Failure**
   - Behavior: Log error, continue with toast notification if enabled
   - User Impact: No push shown, toast may still work
   - Logging: Error level
   - Recovery: None (transient failure)

5. **Permission Denied**
   - Behavior: Disable push notifications, show educational message
   - User Impact: Push notifications unavailable
   - Logging: Info level
   - Recovery: User must manually grant permission

6. **Service Worker Registration Failure**
   - Behavior: Disable push notifications, fall back to toast only
   - User Impact: Push notifications unavailable
   - Logging: Error level
   - Recovery: Retry on page reload

7. **Preference Storage Failure**
   - Behavior: Use in-memory preferences for session
   - User Impact: Preferences not persisted across sessions
   - Logging: Warning level
   - Recovery: Retry on next preference change

### Error Handling Principles

1. **Never Block Response Delivery**: Notification failures should never prevent the Magic 8 Ball response from being returned
2. **Graceful Degradation**: If one notification channel fails, try others
3. **User-Friendly Messages**: Display clear, actionable error messages to users
4. **Comprehensive Logging**: Log all errors with context for debugging
5. **Automatic Recovery**: Retry transient failures on subsequent requests

### Error Response Format

```typescript
interface NotificationError {
  channel: 'toast' | 'push' | 'config' | 'storage';
  error: Error;
  recoverable: boolean;
  timestamp: Date;
  context?: Record<string, any>;
}

interface NotificationDeliveryResult {
  success: boolean;
  toastDelivered: boolean;
  pushDelivered: boolean;
  errors: NotificationError[];
}
```

## Testing Strategy

### Dual Testing Approach

This feature will use both unit tests and property-based tests to ensure comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property tests**: Verify universal properties across all inputs
- Both are complementary and necessary for comprehensive coverage

### Unit Testing

Unit tests will focus on:

1. **Specific Examples**
   - Configuration service integration with valid VAPID keys
   - UI preference controls displaying correct options
   - Toast notification with each type (info, success, warning, error)
   - Push notification click navigation to Magic 8 Ball interface
   - Permission request flow when enabling push notifications
   - Notification history display with mixed notification types

2. **Edge Cases**
   - Configuration service unavailable (fallback behavior)
   - Permission denied (educational message display)
   - Empty notification history (default state)
   - Preference storage not found (default values)
   - Toast notification delivery failure
   - Push notification delivery failure
   - Service worker registration failure

3. **Integration Points**
   - NotificationIntegratorService coordination with ToastrService
   - NotificationIntegratorService coordination with PushNotificationService
   - NotificationPreferencesService localStorage integration
   - Magic8BallService integration with NotificationIntegratorService

### Property-Based Testing

Property tests will verify universal correctness properties using **fast-check** (TypeScript property testing library). Each test will run a minimum of 100 iterations to ensure comprehensive input coverage.

#### Property Test Configuration

```typescript
import * as fc from 'fast-check';

// Minimum 100 iterations per property test
const propertyTestConfig = { numRuns: 100 };

// Example property test structure
it('Property 1: Feature Flag Enforcement', () => {
  fc.assert(
    fc.property(
      fc.string({ minLength: 3 }), // question
      fc.record({
        showToast: fc.boolean(),
        sendPush: fc.boolean(),
        toastType: fc.constantFrom('info', 'success', 'warning', 'error')
      }), // options
      async (question, options) => {
        // Test implementation
      }
    ),
    propertyTestConfig
  );
}, 30000); // 30 second timeout for property tests
```

#### Property Test Mapping

Each correctness property will be implemented as a property-based test:

1. **Property 1: Feature Flag Enforcement**
   - **Feature: magic-8-ball-notification-integration, Property 1: Feature Flag Enforcement**
   - Generators: random questions, random notification options
   - Test: Disable feature flag, verify no notifications sent

2. **Property 2: Preference Respect**
   - **Feature: magic-8-ball-notification-integration, Property 2: Preference Respect**
   - Generators: random questions, random preferences
   - Test: Enable feature flag, verify notifications match preferences

3. **Property 3: Response Always Returned**
   - **Feature: magic-8-ball-notification-integration, Property 3: Response Always Returned**
   - Generators: random questions, random failure scenarios
   - Test: Inject failures, verify response still returned

4. **Property 4: Notification Content Completeness**
   - **Feature: magic-8-ball-notification-integration, Property 4: Notification Content Completeness**
   - Generators: random questions, random answers, random categories
   - Test: Verify notification content contains all required elements

5. **Property 5: Push Notification Structure**
   - **Feature: magic-8-ball-notification-integration, Property 5: Push Notification Structure**
   - Generators: random Magic 8 Ball responses
   - Test: Verify push payload structure and required fields

6. **Property 6: Toast Configuration**
   - **Feature: magic-8-ball-notification-integration, Property 6: Toast Configuration**
   - Generators: random responses with different categories
   - Test: Verify toast timeout, position, and UI elements

7. **Property 7: Preference Persistence Round Trip**
   - **Feature: magic-8-ball-notification-integration, Property 7: Preference Persistence Round Trip**
   - Generators: random preference objects
   - Test: Save, load, verify equivalence

8. **Property 8: Preference Structure**
   - **Feature: magic-8-ball-notification-integration, Property 8: Preference Structure**
   - Generators: random preference objects
   - Test: Verify saved preferences contain required fields

9. **Property 9: History Storage**
   - **Feature: magic-8-ball-notification-integration, Property 9: History Storage**
   - Generators: random Magic 8 Ball responses
   - Test: Verify history entry has correct type and metadata

10. **Property 10: History Size Limit**
    - **Feature: magic-8-ball-notification-integration, Property 10: History Size Limit**
    - Generators: random notification histories at capacity
    - Test: Add notification, verify oldest removed (FIFO)

### Test Organization

```
src/app/services/
├── notification-integrator.service.ts
├── notification-integrator.service.spec.ts (unit tests)
├── notification-integrator.service.properties.spec.ts (property tests)
├── notification-preferences.service.ts
├── notification-preferences.service.spec.ts (unit tests)
├── notification-preferences.service.properties.spec.ts (property tests)
└── magic-8-ball.service.spec.ts (updated with integration tests)
```

### Testing Best Practices

1. **Smart Generators**: Create generators that produce valid input spaces
   - Questions: non-empty strings with minimum length
   - Preferences: valid combinations of boolean flags and toast types
   - Responses: valid Magic 8 Ball response objects

2. **Mocking Strategy**: Mock external dependencies but test real logic
   - Mock: ToastrService, DeploymentPushNotificationService, localStorage
   - Real: NotificationIntegratorService, NotificationPreferencesService logic

3. **Assertion Clarity**: Use descriptive assertions that explain what's being tested
   - Good: `expect(result.toastDelivered).toBe(false, 'Toast should not be delivered when feature flag is disabled')`
   - Bad: `expect(result.toastDelivered).toBe(false)`

4. **Test Independence**: Each test should be independent and not rely on others
   - Reset mocks between tests
   - Clear localStorage between tests
   - Use fresh service instances

5. **Coverage Goals**:
   - Line coverage: > 90%
   - Branch coverage: > 85%
   - Property test iterations: 100 per property

## Implementation Notes

### Migration Strategy

1. **Phase 1: Create New Services**
   - Implement `NotificationIntegratorService`
   - Implement `NotificationPreferencesService`
   - Add comprehensive tests

2. **Phase 2: Refactor Magic8BallService**
   - Remove direct ToastrService and PushNotificationService dependencies
   - Inject NotificationIntegratorService
   - Update notification delivery logic
   - Update tests

3. **Phase 3: Update UI Components**
   - Add preference controls to UserNotificationsComponent
   - Integrate NotificationPreferencesService
   - Update Magic 8 Ball form to use preferences

4. **Phase 4: Testing and Validation**
   - Run full test suite
   - Manual testing of all notification scenarios
   - Verify feature flag behavior
   - Test error handling and fallback scenarios

### Backward Compatibility

- Existing Magic8BallService API remains unchanged
- Existing notification behavior preserved
- New preference system is additive (doesn't break existing functionality)
- Fallback to defaults if preferences not found

### Performance Considerations

- Preference loading: Synchronous from localStorage (fast)
- Notification delivery: Asynchronous, non-blocking
- Configuration retrieval: Cached by ConfigurationService
- Feature flag checks: Synchronous signal reads (fast)

### Security Considerations

- VAPID keys retrieved securely from ConfigurationService
- Push notification subscriptions managed by existing secure infrastructure
- No sensitive data in notification content
- Preferences stored in localStorage (client-side only)

## Future Enhancements

Potential improvements for future iterations:

1. **Notification Analytics**: Track notification delivery success rates and user engagement
2. **Custom Notification Sounds**: Allow users to configure notification sounds
3. **Notification Grouping**: Group related Magic 8 Ball notifications
4. **Rich Notifications**: Add images or animations to notifications
5. **Notification Scheduling**: Allow users to schedule quiet hours
6. **Cross-Device Sync**: Sync preferences across devices via backend
7. **A/B Testing**: Test different notification strategies for engagement
8. **Notification Templates**: Predefined templates for common notification types
