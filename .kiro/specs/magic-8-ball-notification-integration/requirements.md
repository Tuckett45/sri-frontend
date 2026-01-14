# Requirements Document

## Introduction

This document specifies the requirements for integrating Magic Eight Ball functionality with ARK's existing notification feature flags and services. The integration will ensure that Magic 8 Ball responses respect the same notification controls, feature flags, and infrastructure used by deployment notifications, providing a consistent user experience across all notification types.

## Glossary

- **Magic_8_Ball_Service**: Service that generates mystical responses to user questions
- **Notification_System**: ARK's existing notification infrastructure including toast and push notifications
- **Feature_Flag_Service**: Service that manages feature toggles for the application
- **Toast_Notification**: In-app visual notification displayed using Toastr library
- **Push_Notification**: Browser/system notification delivered via Web Push API
- **Configuration_Service**: Service that provides runtime configuration including VAPID keys and notification settings
- **Notification_Integrator**: Service that coordinates notification delivery across different channels
- **User**: Any authenticated user of the ARK application

## Requirements

### Requirement 1: Feature Flag Integration

**User Story:** As a system administrator, I want Magic 8 Ball notifications to respect the existing 'notifications' feature flag, so that I can control all notification types from a single setting.

#### Acceptance Criteria

1. WHEN the 'notifications' feature flag is disabled, THE Magic_8_Ball_Service SHALL NOT send any toast or push notifications
2. WHEN the 'notifications' feature flag is enabled, THE Magic_8_Ball_Service SHALL send notifications according to user preferences
3. WHEN a user queries the Magic 8 Ball, THE Magic_8_Ball_Service SHALL check the feature flag state before sending notifications
4. THE Magic_8_Ball_Service SHALL use the same FeatureFlagService.flagEnabled() method as deployment notifications

### Requirement 2: Configuration Service Integration

**User Story:** As a developer, I want Magic 8 Ball notifications to use the centralized configuration service, so that notification settings are consistent across the application.

#### Acceptance Criteria

1. WHEN Magic 8 Ball sends push notifications, THE Magic_8_Ball_Service SHALL retrieve VAPID keys from the Configuration_Service
2. WHEN Magic 8 Ball sends toast notifications, THE Magic_8_Ball_Service SHALL use timeout values from the Configuration_Service notification settings
3. IF the Configuration_Service is unavailable, THE Magic_8_Ball_Service SHALL gracefully degrade to toast-only notifications
4. THE Magic_8_Ball_Service SHALL respect the Configuration_Service's notification permission education settings

### Requirement 3: Unified Notification Options

**User Story:** As a user, I want consistent notification options across all features, so that I can control how I receive information.

#### Acceptance Criteria

1. WHEN a user configures Magic 8 Ball notifications, THE System SHALL provide the same options as deployment notifications (toast type, push enabled)
2. WHEN a user disables toast notifications, THE Magic_8_Ball_Service SHALL only send push notifications if enabled
3. WHEN a user disables push notifications, THE Magic_8_Ball_Service SHALL only send toast notifications if enabled
4. THE Magic_8_Ball_Service SHALL support all toast types: info, success, warning, error
5. WHEN both toast and push are disabled, THE Magic_8_Ball_Service SHALL still return the response without notifications

### Requirement 4: Push Notification Service Integration

**User Story:** As a user, I want Magic 8 Ball responses delivered via push notifications, so that I can receive guidance even when not actively viewing the application.

#### Acceptance Criteria

1. WHEN push notifications are enabled, THE Magic_8_Ball_Service SHALL use the DeploymentPushNotificationService to send notifications
2. WHEN sending push notifications, THE Magic_8_Ball_Service SHALL include the question and answer in the notification payload
3. WHEN a push notification is clicked, THE System SHALL navigate the user to the Magic 8 Ball interface
4. THE Magic_8_Ball_Service SHALL include appropriate icons and badges in push notifications
5. IF push notification delivery fails, THE Magic_8_Ball_Service SHALL log the error but still return the response

### Requirement 5: Toast Notification Consistency

**User Story:** As a user, I want Magic 8 Ball toast notifications to look and behave like other application notifications, so that the interface feels cohesive.

#### Acceptance Criteria

1. WHEN displaying toast notifications, THE Magic_8_Ball_Service SHALL use the same ToastrService instance as deployment notifications
2. WHEN showing a toast, THE Magic_8_Ball_Service SHALL use timeout values based on response category (positive: 6s, negative: 8s, neutral: 5s)
3. WHEN a toast is clicked, THE System SHALL navigate to the Magic 8 Ball interface
4. THE Magic_8_Ball_Service SHALL include progress bars and close buttons in toast notifications
5. THE Magic_8_Ball_Service SHALL position toasts in the same location as deployment notifications (toast-top-right)

### Requirement 6: Notification Preference Persistence

**User Story:** As a user, I want my Magic 8 Ball notification preferences saved, so that I don't have to reconfigure them each session.

#### Acceptance Criteria

1. WHEN a user changes Magic 8 Ball notification preferences, THE System SHALL persist these settings to local storage
2. WHEN a user returns to the application, THE System SHALL restore their previous notification preferences
3. THE System SHALL store preferences for: toast enabled, push enabled, and default toast type
4. WHEN preferences are not found, THE System SHALL use default values (toast: true, push: false, type: info)

### Requirement 7: Notification Permission Handling

**User Story:** As a user, I want clear guidance when notification permissions are required, so that I understand why and how to enable them.

#### Acceptance Criteria

1. WHEN a user enables push notifications without browser permission, THE System SHALL request notification permission
2. IF notification permission is denied, THE System SHALL display an educational message explaining how to enable permissions
3. WHEN notification permission is granted, THE System SHALL automatically initialize push notification subscription
4. THE System SHALL use the same permission education flow as deployment notifications

### Requirement 8: Error Handling and Fallback

**User Story:** As a user, I want the Magic 8 Ball to work even if notifications fail, so that I can still get responses to my questions.

#### Acceptance Criteria

1. IF toast notification delivery fails, THE Magic_8_Ball_Service SHALL log the error and continue
2. IF push notification delivery fails, THE Magic_8_Ball_Service SHALL log the error and continue
3. IF the Configuration_Service is unavailable, THE Magic_8_Ball_Service SHALL use fallback notification settings
4. THE Magic_8_Ball_Service SHALL always return the response to the caller, regardless of notification delivery status
5. WHEN notification errors occur, THE System SHALL display user-friendly error messages

### Requirement 9: Notification Content Standards

**User Story:** As a user, I want Magic 8 Ball notifications to be clear and informative, so that I can understand the response without opening the app.

#### Acceptance Criteria

1. WHEN sending a toast notification, THE Magic_8_Ball_Service SHALL include both the question and answer in the message
2. WHEN sending a push notification, THE Magic_8_Ball_Service SHALL include the question and answer in the notification body
3. THE Magic_8_Ball_Service SHALL use the emoji "🎱" in notification titles to identify Magic 8 Ball notifications
4. WHEN displaying notifications, THE System SHALL format the content as "Q: [question]\nA: [answer]"
5. THE Magic_8_Ball_Service SHALL include the response category (positive/negative/neutral) in notification metadata

### Requirement 10: Integration with Notification History

**User Story:** As a user, I want Magic 8 Ball notifications to appear in my notification history, so that I can review past responses.

#### Acceptance Criteria

1. WHEN a Magic 8 Ball response is delivered, THE System SHALL add it to the notification history
2. THE System SHALL store Magic 8 Ball notifications with type identifier "magic-8-ball"
3. WHEN viewing notification history, THE User SHALL see Magic 8 Ball notifications alongside deployment notifications
4. THE System SHALL respect the maxNotificationHistory setting from Configuration_Service
5. WHEN the history limit is reached, THE System SHALL remove the oldest Magic 8 Ball notifications first (FIFO)

### Requirement 11: Service Worker Integration

**User Story:** As a developer, I want Magic 8 Ball push notifications to use the existing service worker, so that we maintain a single notification infrastructure.

#### Acceptance Criteria

1. WHEN sending push notifications, THE Magic_8_Ball_Service SHALL use the service worker registered by DeploymentPushNotificationService
2. THE Magic_8_Ball_Service SHALL NOT register a separate service worker
3. WHEN a Magic 8 Ball push notification is received, THE service worker SHALL display it using the same notification handler as deployment notifications
4. THE service worker SHALL support "Ask Again" action in Magic 8 Ball push notifications

### Requirement 12: Testing and Validation

**User Story:** As a developer, I want comprehensive tests for notification integration, so that I can ensure reliability across different scenarios.

#### Acceptance Criteria

1. THE System SHALL include unit tests for Magic 8 Ball notification delivery with feature flags enabled and disabled
2. THE System SHALL include tests for notification delivery with various configuration states
3. THE System SHALL include tests for error handling when notification services are unavailable
4. THE System SHALL include tests for notification preference persistence and retrieval
5. THE System SHALL include integration tests for the complete notification flow from question to delivery
