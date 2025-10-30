# Push Notifications Frontend Implementation

## Overview

This document describes the frontend push notification system for the ARK deployment platform. The system integrates Web Push API with SignalR real-time events to provide comprehensive notification support.

## Architecture

### Components

1. **DeploymentPushNotificationService** (`deployment-push-notification.service.ts`)
   - Manages Web Push subscriptions
   - Handles browser push notification registration
   - Syncs subscriptions with backend API
   - Detects device type and browser

2. **DeploymentNotificationIntegratorService** (`deployment-notification-integrator.service.ts`)
   - Connects SignalR events to notifications
   - Shows toastr notifications for deployment events
   - Integrates with feature flag service
   - Routes users to relevant pages on notification click

3. **NotificationSettingsComponent** (`notification-settings.component.ts`)
   - Standalone component for managing notification preferences
   - Displays push subscription status
   - Shows active devices
   - Provides test notification functionality

### Integration Points

- **SignalR Events**: Real-time deployment updates
- **Feature Flags**: Toggle notifications on/off
- **ToastrService**: In-app toast notifications
- **Router**: Navigate on notification click
- **Backend API**: `/api/push-subscriptions` endpoints

## Setup Instructions

### 1. Install Dependencies

The project already has the required dependencies:
- `@angular/common/http` - HTTP client
- `@microsoft/signalr` - SignalR client
- `ngx-toastr` - Toast notifications
- `rxjs` - Reactive programming

### 2. Configure VAPID Public Key

Update `src/environments/environments.ts` with the VAPID public key from backend:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://sri-api.azurewebsites.net/api',
  apiSubscriptionKey: 'ffd675634ab645d7845640bb88d672d8',
  vapidPublicKey: 'BEl62iUVgU...' // Replace with actual key
};
```

**Get VAPID Public Key:**
- Backend generates keys with: `npx web-push generate-vapid-keys`
- Copy the public key from backend configuration
- **Important**: Only the PUBLIC key goes in frontend config (private key stays on backend)

### 3. Service Worker Setup

The service uses Angular's built-in service worker (`ngsw-worker.js`). Ensure your `angular.json` has service worker enabled:

```json
{
  "projects": {
    "sri-frontend": {
      "architect": {
        "build": {
          "options": {
            "serviceWorker": true,
            "ngswConfigPath": "ngsw-config.json"
          }
        }
      }
    }
  }
}
```

### 4. Initialize on App Start

The notification integrator is automatically initialized in `app.component.ts` when user logs in:

```typescript
ngOnInit(): void {
  this.authService.getLoginStatus().subscribe(status => {
    this.isUserLoggedIn = status;
    
    if (status) {
      this.notificationIntegrator.initialize();
    }
  });
}
```

### 5. Add Notification Settings to UI

Import the standalone component wherever you want users to manage notifications:

```typescript
import { NotificationSettingsComponent } from './features/deployment/components/deployment-settings/notification-settings.component';

@Component({
  // ...
  imports: [
    NotificationSettingsComponent,
    // other imports
  ]
})
```

In your template:

```html
<app-notification-settings></app-notification-settings>
```

## Usage

### For Users

1. **Enable Notifications**:
   - Toggle "Enable Notifications" switch
   - Click "Enable Push" button
   - Grant browser permission when prompted

2. **Receive Notifications**:
   - 📋 **Deployment Assigned**: Info toast, navigates to deployment
   - ✍️ **Sign-Off Required**: Warning toast (sticky), navigates to handoff
   - ⚠️ **Issue Created**: Error/Warning toast, navigates to issues
   - 🎉 **Deployment Completed**: Success toast, navigates to deployment

3. **Manage Subscriptions**:
   - View active devices in settings
   - Disable push on specific devices
   - Test notifications

### For Developers

#### Subscribe to Push Notifications

```typescript
import { DeploymentPushNotificationService } from './services/deployment-push-notification.service';

constructor(private pushService: DeploymentPushNotificationService) {}

async enableNotifications() {
  await this.pushService.initialize();
  // User is now subscribed
}
```

#### Listen to Subscription State

```typescript
this.pushService.subscribed$.subscribe(isSubscribed => {
  console.log('Subscribed:', isSubscribed);
});

this.pushService.error$.subscribe(error => {
  if (error) {
    console.error('Push error:', error);
  }
});
```

#### Send Test Notification

```typescript
await this.pushService.sendTestNotification();
```

#### Get User's Subscriptions

```typescript
this.pushService.getMySubscriptions().subscribe(subscriptions => {
  console.log('Active devices:', subscriptions);
});
```

## Notification Event Mapping

| SignalR Event | Notification Type | Auto-Dismiss | Navigation |
|---------------|-------------------|--------------|------------|
| DeploymentAssigned | Info toast | 5s | `/deployments/:id` |
| DeploymentReadyForSignoff | Warning toast | Never | `/deployments/:id/handoff` |
| DeploymentIssueCreated | Error/Warning toast | Critical: Never<br>Other: 8s | `/deployments/:id/issues` |
| DeploymentCompleted | Success toast | 7s | `/deployments/:id` |
| PhaseAdvanced | Info toast | 4s | None |
| HandoffSigned | Success toast | 5s | None |

## Feature Flag Integration

The system respects the `notifications` feature flag:

```typescript
// Toggle notifications on/off
this.featureFlags.toggleFlag('notifications');

// Check if enabled
const enabled = this.featureFlags.flagEnabled('notifications')();
```

When disabled:
- ❌ Push notifications not initialized
- ❌ SignalR events not subscribed
- ❌ Toastr notifications not shown

## Browser Support

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | ✅ Full | Desktop & Mobile |
| Firefox | ✅ Full | Desktop & Mobile |
| Edge | ✅ Full | Desktop |
| Safari | ⚠️ Limited | iOS 16.4+, requires Add to Home Screen |
| Opera | ✅ Full | Desktop & Mobile |

## Troubleshooting

### Push Notifications Not Working

1. **Check Feature Flag**:
   ```typescript
   console.log(this.featureFlags.flagEnabled('notifications')());
   ```

2. **Check Browser Support**:
   ```typescript
   console.log('Notification' in window); // true
   console.log('serviceWorker' in navigator); // true
   ```

3. **Check Permission**:
   ```typescript
   console.log(Notification.permission); // "granted"
   ```

4. **Check Service Worker**:
   ```typescript
   navigator.serviceWorker.getRegistration().then(reg => {
     console.log('Service worker:', reg);
   });
   ```

5. **Check Backend Connection**:
   - Open browser DevTools > Network tab
   - Look for POST to `/api/push-subscriptions`
   - Should return 200 OK with subscription data

### Notifications Not Appearing

1. **Check Browser Notification Settings**:
   - Chrome: `chrome://settings/content/notifications`
   - Firefox: `about:preferences#privacy` > Permissions > Notifications
   - Edge: `edge://settings/content/notifications`

2. **Check System Notification Settings**:
   - Windows: Settings > Notifications & actions
   - macOS: System Preferences > Notifications
   - Linux: Varies by distribution

3. **Verify SignalR Connection**:
   ```typescript
   // In browser console
   console.log(this.socket.hub?.state);
   // Should be "Connected"
   ```

### Subscription Errors

**"Service worker registration failed"**
- Ensure service worker is enabled in `angular.json`
- Check that app is served over HTTPS (required for service workers)
- Verify `ngsw-worker.js` exists in build output

**"Notification permission denied"**
- User must grant permission manually
- Permission can't be requested again after denial
- User must clear site settings and refresh

**"Failed to sync subscription with backend"**
- Check backend API is running
- Verify VAPID keys match between frontend/backend
- Check network connectivity
- Review backend logs for errors

## Security Considerations

1. **VAPID Keys**:
   - Public key is safe to expose in frontend code
   - Private key must NEVER be in frontend (stays on backend)
   - Generate new keys if private key is exposed

2. **User Authentication**:
   - All API calls require authentication
   - Subscriptions tied to authenticated user
   - JWT token sent with all requests

3. **Data Privacy**:
   - Subscription data stored securely on backend
   - Device info (browser, type) used for UX only
   - No sensitive data in push notification payloads

## Testing

### Manual Testing

1. **Enable Notifications**:
   - Navigate to notification settings
   - Enable notifications toggle
   - Click "Enable Push"
   - Grant browser permission
   - Verify "✅ Enabled" status

2. **Test Notification**:
   - Click "🧪 Test" button
   - Should receive browser notification
   - Should see success toast

3. **Test SignalR Events**:
   - Trigger deployment events from backend
   - Verify toastr appears
   - Verify click navigation works

4. **Test Feature Flag**:
   - Disable notifications toggle
   - Trigger events - should not receive notifications
   - Re-enable - notifications work again

5. **Test Multiple Devices**:
   - Subscribe on desktop browser
   - Subscribe on mobile browser
   - Verify both listed in settings
   - Test notification on both

### Automated Testing

```typescript
import { TestBed } from '@angular/core/testing';
import { DeploymentPushNotificationService } from './deployment-push-notification.service';

describe('DeploymentPushNotificationService', () => {
  let service: DeploymentPushNotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DeploymentPushNotificationService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('should check browser support', () => {
    expect('Notification' in window).toBeTruthy();
  });

  // Add more tests...
});
```

## Performance Considerations

- Service worker runs in background, minimal performance impact
- Push subscriptions cached in BehaviorSubjects for instant access
- Notifications debounced to prevent spam
- Automatic cleanup of expired subscriptions on backend

## Future Enhancements

- [ ] Notification sound customization
- [ ] Do Not Disturb schedule
- [ ] Notification history/inbox
- [ ] Rich notifications with images
- [ ] Action buttons on notifications
- [ ] Notification grouping/batching
- [ ] Email fallback for failed push
- [ ] Push notification analytics

## Related Documentation

- [Backend Push Notifications README](../sri-backend/PUSH_NOTIFICATIONS_BACKEND_README.md)
- [Web Push API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Service Worker Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [VAPID Specification](https://datatracker.ietf.org/doc/html/rfc8292)

