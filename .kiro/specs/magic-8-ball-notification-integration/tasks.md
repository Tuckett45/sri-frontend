# Implementation Plan: Magic 8 Ball Notification Integration

## Overview

This implementation plan breaks down the integration of Magic Eight Ball functionality with ARK's notification infrastructure into discrete, manageable tasks. The approach follows a phased strategy: first creating new services, then refactoring existing services, and finally updating UI components. Each task builds incrementally on previous work, with checkpoints to ensure quality and correctness.

## Tasks

- [x] 1. Create NotificationIntegratorService
  - Create new service file `src/app/services/notification-integrator.service.ts`
  - Implement core interfaces: `NotificationPayload`, `NotificationDeliveryOptions`, `NotificationDeliveryResult`
  - Implement `sendNotification()` method with feature flag checking
  - Implement `areNotificationsEnabled()` method
  - Implement `getNotificationConfig()` method
  - Implement `requestPermissions()` method
  - Inject dependencies: `FeatureFlagService`, `ConfigurationService`, `ToastrService`, `DeploymentPushNotificationService`
  - Add error handling with graceful degradation
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 8.1, 8.2, 8.3_

- [x] 1.1 Write property test for feature flag enforcement in NotificationIntegratorService

  - **Property 1: Feature Flag Enforcement**
  - **Validates: Requirements 1.1**

- [x] 1.2 Write unit tests for NotificationIntegratorService

  - Test notification delivery with feature flag enabled/disabled
  - Test configuration service integration
  - Test error handling for toast/push failures
  - Test graceful degradation when configuration unavailable
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 8.1, 8.2, 8.3_

- [x] 2. Create NotificationPreferencesService
  - Create new service file `src/app/services/notification-preferences.service.ts`
  - Implement interfaces: `NotificationPreferences`, `NotificationTypePreferences`
  - Implement `getPreferences()` method
  - Implement `updatePreferences()` method
  - Implement `resetPreferences()` method
  - Create `preferences$` observable
  - Implement localStorage persistence with key `sri-notification-preferences`
  - Define default preferences
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ]* 2.1 Write property test for preference persistence round trip
  - **Property 7: Preference Persistence Round Trip**
  - **Validates: Requirements 6.1, 6.2**

- [ ]* 2.2 Write property test for preference structure
  - **Property 8: Preference Structure**
  - **Validates: Requirements 6.3**

- [ ]* 2.3 Write unit tests for NotificationPreferencesService
  - Test preference loading from localStorage
  - Test preference saving to localStorage
  - Test default values when no preferences found
  - Test preference reset functionality
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Refactor Magic8BallService to use NotificationIntegratorService
  - Remove direct dependencies on `ToastrService` and `DeploymentPushNotificationService`
  - Inject `NotificationIntegratorService`
  - Update `askQuestion()` method to use NotificationIntegratorService
  - Remove private methods: `showToastNotification()`, `sendPushNotification()`
  - Update notification payload creation to use `NotificationPayload` interface
  - Ensure response is always returned regardless of notification delivery status
  - Updated unit tests to mock NotificationIntegratorService
  - All 11 tests passing
  - _Requirements: 1.1, 1.2, 3.5, 8.4_

- [ ]* 4.1 Write property test for response always returned
  - **Property 3: Response Always Returned**
  - **Validates: Requirements 3.5, 8.4**

- [ ]* 4.2 Write property test for notification content completeness
  - **Property 4: Notification Content Completeness**
  - **Validates: Requirements 4.2, 9.1, 9.2, 9.3, 9.4, 9.5**

- [ ]* 4.3 Write property test for preference respect
  - **Property 2: Preference Respect**
  - **Validates: Requirements 1.2, 3.2, 3.3**

- [ ]* 4.4 Update Magic8BallService unit tests
  - Update existing tests to work with NotificationIntegratorService
  - Add tests for notification delivery with various preference combinations
  - Add tests for error handling scenarios
  - _Requirements: 1.1, 1.2, 3.2, 3.3, 3.5, 8.4_

- [x] 5. Implement toast notification configuration
  - Update NotificationIntegratorService to apply category-based timeouts
  - Implement timeout logic: positive (6s), negative (8s), neutral (5s)
  - Configure toast options: progress bar, close button, position (toast-top-right)
  - _Requirements: 2.2, 5.2, 5.4, 5.5_

- [ ]* 5.1 Write property test for toast configuration
  - **Property 6: Toast Configuration**
  - **Validates: Requirements 2.2, 5.2, 5.4, 5.5**

- [ ]* 5.2 Write unit tests for toast configuration
  - Test each toast type (info, success, warning, error)
  - Test timeout values for each category
  - Test toast UI elements (progress bar, close button)
  - Test toast positioning
  - _Requirements: 2.2, 3.4, 5.2, 5.4, 5.5_

- [x] 6. Implement push notification structure
  - Update NotificationIntegratorService to create push notification payloads
  - Include icons and badges in push notifications
  - Add "Ask Again" action to Magic 8 Ball push notifications
  - Include all required metadata fields
  - _Requirements: 4.2, 4.4, 11.4_

- [ ]* 6.1 Write property test for push notification structure
  - **Property 5: Push Notification Structure**
  - **Validates: Requirements 4.4, 11.4**

- [ ]* 6.2 Write unit tests for push notification structure
  - Test push payload creation
  - Test icon and badge inclusion
  - Test "Ask Again" action
  - Test metadata fields
  - _Requirements: 4.2, 4.4, 11.4_

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Update UserNotificationsComponent with preference controls
  - Add form controls for Magic 8 Ball notification preferences
  - Inject `NotificationPreferencesService`
  - Load preferences on component initialization
  - Update Magic 8 Ball form to use loaded preferences
  - Add UI controls for: toast enabled, push enabled, default toast type
  - Implement preference save on user changes
  - _Requirements: 3.1, 6.1, 6.2_

- [ ]* 8.1 Write unit tests for UserNotificationsComponent preference integration
  - Test preference loading on initialization
  - Test preference saving on user changes
  - Test form controls reflect current preferences
  - _Requirements: 3.1, 6.1, 6.2_

- [x] 9. Implement notification history integration
  - Create notification history data model
  - Update NotificationIntegratorService to add notifications to history
  - Set type identifier to "magic-8-ball" for Magic 8 Ball notifications
  - Include all required metadata in history entries
  - Implement history size limit based on `maxNotificationHistory` from ConfigurationService
  - Implement FIFO removal when history limit reached
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ]* 9.1 Write property test for history storage
  - **Property 9: History Storage**
  - **Validates: Requirements 10.1, 10.2**

- [ ]* 9.2 Write property test for history size limit
  - **Property 10: History Size Limit**
  - **Validates: Requirements 10.4, 10.5**

- [ ]* 9.3 Write unit tests for notification history
  - Test history entry creation
  - Test type identifier assignment
  - Test metadata inclusion
  - Test history size limit enforcement
  - Test FIFO removal
  - Test history display in UI
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 10. Implement permission handling flow
  - Add permission request logic to NotificationIntegratorService
  - Implement educational message display when permission denied
  - Add automatic push subscription initialization after permission grant
  - Update UI to show permission status
  - _Requirements: 7.1, 7.2, 7.3_

- [ ]* 10.1 Write unit tests for permission handling
  - Test permission request flow
  - Test educational message display on denial
  - Test automatic subscription after grant
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 11. Add navigation handlers for notification clicks
  - Implement toast click handler to navigate to Magic 8 Ball interface
  - Implement push notification click handler to navigate to Magic 8 Ball interface
  - Update NotificationIntegratorService to configure navigation
  - _Requirements: 4.3, 5.3_

- [ ]* 11.1 Write unit tests for navigation handlers
  - Test toast click navigation
  - Test push notification click navigation
  - _Requirements: 4.3, 5.3_

- [x] 12. Checkpoint - Ensure all tests pass
  - All tests passing:
    - Magic8BallService: 11 tests ✓
    - NotificationIntegratorService: 24 tests ✓
    - NotificationIntegratorService property tests: 1 test (100 iterations) ✓
  - Total: 36 tests passing

- [-] 13. Integration testing and validation
  - Test complete flow: question → notification → history
  - Test with feature flag enabled and disabled
  - Test with various preference combinations
  - Test error scenarios (configuration unavailable, permission denied, etc.)
  - Test notification delivery across different browsers
  - Verify backward compatibility with existing Magic 8 Ball functionality
  - _Requirements: All_

- [ ]* 13.1 Write integration tests for complete notification flow
  - Test end-to-end flow from question to notification delivery
  - Test with different configuration states
  - Test error handling and recovery
  - _Requirements: All_

- [x] 14. Documentation and cleanup
  - Update service documentation with JSDoc comments
  - Add inline code comments for complex logic
  - Update README if necessary
  - Remove any unused code or imports
  - Verify all TypeScript types are properly defined

- [ ] 15. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation follows a phased approach: new services → refactor existing → update UI
- All notification delivery is non-blocking and should not prevent response delivery
- Feature flag checks are performed before all notification operations
- Preferences are persisted to localStorage for cross-session consistency
