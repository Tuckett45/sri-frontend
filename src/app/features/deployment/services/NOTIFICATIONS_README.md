# ARK Deployment Notification System

Complete notification system for deployment workflows with **Toastr** toast notifications and **Web Push** notifications.

## 🎯 Features

### 1. **Toast Notifications (Toastr)**
- ✅ Real-time in-app notifications
- ✅ Priority-based display times
- ✅ Visual notifications for all ARK events
- ✅ Already integrated and working

### 2. **Push Notifications (Web Push API)**
- 📱 Desktop and mobile browser notifications
- 🔔 Works even when app is in background/closed
- 🎨 Rich notifications with actions
- 🔐 Permission-based (user must grant)

### 3. **SignalR Real-Time Events**
- ⚡ Instant notifications via WebSocket connection
- 🔄 Automatic reconnection with exponential backoff
- 👥 User-specific notification groups
- 📡 Comprehensive event coverage

## 📋 Supported Events

### Role-Based Workflow (Run Book v7)
- `DeploymentAssigned` - User assigned to deployment
- `RoleAssigned` - Role updated for deployment
- `ReadyForSignOff` - Deployment ready for sign-off
- `SignOffRecorded` - Sign-off has been recorded
- `DeploymentCompleted` - All sign-offs complete

### Phase & Progress
- `PhaseAdvanced` - Deployment moved to next phase
- `SubPhaseCompleted` - Sub-phase marked complete
- `EvidenceAdded` - Media/evidence uploaded

### Issue Reporting
- `IssueCreated` - New issue reported
- `IssueUpdated` - Issue status changed
- `IssueAssigned` - Issue assigned to user
- `IssueResolved` - Issue marked resolved

### Handoff
- `HandoffSigned` - Vendor/DE signed handoff
- `HandoffArchived` - Deployment package archived

## 🚀 Setup Instructions

### Step 1: Install Dependencies (Already Done ✅)
```bash
npm install ngx-toastr @microsoft/signalr
```

### Step 2: Generate VAPID Keys for Push Notifications
```bash
# Install web-push globally
npm install -g web-push

# Generate VAPID keys
npx web-push generate-vapid-keys

# Output:
# Public Key: BEl62iU... (put in environment.ts)
# Private Key: bdSiC8... (store securely on backend)
```

### Step 3: Configure Environment Variables
Update `src/environments/environments.ts`:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://sri-api.azurewebsites.net/api',
  vapidPublicKey: 'YOUR_VAPID_PUBLIC_KEY_HERE' // ← Add this
};
```

### Step 4: Register Service Worker
Ensure `src/sw.js` is accessible at `/sw.js` in production build.

Update `angular.json` assets:
```json
{
  "assets": [
    "src/favicon.ico",
    "src/assets",
    "src/sw.js"  // ← Add this
  ]
}
```

### Step 5: Initialize in App Component
```typescript
import { DeploymentSignalRService } from './features/deployment/services/deployment-signalr.service';
import { DeploymentPushNotificationService } from './features/deployment/services/deployment-push-notification.service';

export class AppComponent implements OnInit {
  constructor(
    private signalR: DeploymentSignalRService,
    private pushNotifications: DeploymentPushNotificationService
  ) {}

  async ngOnInit() {
    const userId = this.authService.getCurrentUserId();
    
    // Connect to SignalR
    await this.signalR.connect(userId);
    
    // Initialize push notifications (optional)
    if (this.pushNotifications.isSupported()) {
      await this.pushNotifications.initialize();
    }
  }

  ngOnDestroy() {
    this.signalR.disconnect();
  }
}
```

## 📱 Usage Examples

### Enable/Disable Notifications
```typescript
// Toggle notifications via feature flags
featureFlags.setNotificationsEnabled(true);

// Check if enabled
const enabled = featureFlags.areNotificationsEnabled();
```

### Manually Send Test Notification
```typescript
// Test toast notification
toastr.success('Test message', 'Test Title');

// Test push notification
await pushNotifications.testNotification();
```

### Check Push Notification Permission
```typescript
if (pushNotifications.permission === 'default') {
  // Not asked yet - can request permission
  await pushNotifications.requestPermission();
} else if (pushNotifications.permission === 'denied') {
  // User denied - show instructions to enable in browser settings
  console.warn('Push notifications blocked');
} else {
  // Permission granted
  console.log('Push notifications enabled');
}
```

## 🎨 Notification Priority Levels

| Priority | Toast Duration | Push? | Use Case |
|----------|---------------|-------|----------|
| `low` | 6 seconds | No | Progress updates, evidence added |
| `medium` | 8 seconds | No | Sign-offs recorded, issues updated |
| `high` | 10 seconds | Yes | Deployment assigned, issues created |
| `critical` | 15 seconds | Yes + Sticky | Ready for sign-off, critical issues |

## 🔔 Push Notification Behavior

### When Push Notifications Are Sent
1. **High/Critical Priority** - Always sent
2. **App in Background** - Sent for medium+ priority
3. **Permission Granted** - User must grant browser permission

### Push Notification Features
- **Title & Body** - Clear, actionable message
- **Icon & Badge** - ARK branding
- **Data Payload** - Deployment ID, type, URL to open
- **Actions** - "View" or "Dismiss" buttons
- **Vibration** - Mobile device vibration pattern
- **Require Interaction** - Critical notifications stay until dismissed

## 🖥️ Backend Requirements

### 1. SignalR Hub (`DeploymentsHub.cs`)
Already implemented ✅
- User group management
- Event broadcasting

### 2. Push Notification Endpoints (TODO)

Create these API endpoints:

```csharp
// POST /api/push-subscriptions
[HttpPost("push-subscriptions")]
public async Task<IActionResult> Subscribe([FromBody] PushSubscription subscription)
{
    // Store subscription in database
    await _db.SavePushSubscriptionAsync(subscription);
    return Ok();
}

// DELETE /api/push-subscriptions
[HttpDelete("push-subscriptions")]
public async Task<IActionResult> Unsubscribe([FromBody] PushSubscription subscription)
{
    // Remove subscription from database
    await _db.DeletePushSubscriptionAsync(subscription);
    return Ok();
}
```

### 3. Send Push Notifications (Backend)

When events occur, send push notifications to subscribed users:

```csharp
using WebPush;

public class PushNotificationService
{
    private readonly string vapidSubject = "mailto:support@sri.com";
    private readonly string vapidPublicKey = Environment.GetEnvironmentVariable("VAPID_PUBLIC_KEY");
    private readonly string vapidPrivateKey = Environment.GetEnvironmentVariable("VAPID_PRIVATE_KEY");

    public async Task SendPushNotificationAsync(string userId, object payload)
    {
        // Get user's push subscriptions
        var subscriptions = await _db.GetPushSubscriptionsForUser(userId);

        var webPushClient = new WebPushClient();
        
        foreach (var sub in subscriptions)
        {
            try
            {
                var pushSubscription = new PushSubscription(
                    sub.Endpoint, 
                    sub.P256dh, 
                    sub.Auth
                );

                var vapidDetails = new VapidDetails(
                    vapidSubject, 
                    vapidPublicKey, 
                    vapidPrivateKey
                );

                await webPushClient.SendNotificationAsync(
                    pushSubscription, 
                    JsonSerializer.Serialize(payload), 
                    vapidDetails
                );
            }
            catch (WebPushException ex)
            {
                if (ex.StatusCode == HttpStatusCode.Gone)
                {
                    // Subscription expired - remove it
                    await _db.DeletePushSubscriptionAsync(sub);
                }
            }
        }
    }
}
```

## 🧪 Testing

### Test Toastr Notifications
1. Navigate to deployments
2. Trigger any action (assign, sign-off, etc.)
3. See toast appear in top-right

### Test Push Notifications
1. Grant notification permission when prompted
2. Open browser DevTools → Application → Service Workers
3. Verify service worker is registered
4. Close the app/put in background
5. Trigger deployment event
6. See system notification appear

### Test in Different Browsers
- ✅ Chrome/Edge - Full support
- ✅ Firefox - Full support
- ✅ Safari - Limited support (iOS 16.4+)
- ❌ IE11 - Not supported

## 🛠️ Troubleshooting

### Push Notifications Not Working

**Check 1: Permission**
```typescript
console.log('Permission:', Notification.permission);
// Should be 'granted'
```

**Check 2: Service Worker**
```typescript
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('SW registered:', !!reg);
});
```

**Check 3: VAPID Keys**
```typescript
console.log('VAPID key configured:', !!environment.vapidPublicKey);
```

**Check 4: HTTPS**
Push notifications require HTTPS (except localhost).

### Toast Notifications Not Showing

**Check 1: Feature Flag**
```typescript
console.log('Notifications enabled:', featureFlags.areNotificationsEnabled());
```

**Check 2: Toastr Import**
Ensure `ToastrModule` imported in `app.module.ts`.

**Check 3: SignalR Connection**
```typescript
console.log('SignalR state:', signalR.getConnectionState());
// Should be 'Connected'
```

## 📚 Additional Resources

- [Web Push API Docs](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [ngx-toastr Documentation](https://www.npmjs.com/package/ngx-toastr)
- [SignalR for JavaScript](https://docs.microsoft.com/en-us/aspnet/core/signalr/javascript-client)

## 🔐 Security Considerations

1. **VAPID Keys** - Store private key securely (Azure Key Vault, env vars)
2. **Subscription Storage** - Associate subscriptions with authenticated users
3. **HTTPS Required** - Push notifications require secure context
4. **User Privacy** - Respect notification preferences and unsubscribe requests
5. **Rate Limiting** - Prevent notification spam from backend

## 🎯 Future Enhancements

- [ ] Notification history/archive
- [ ] Custom notification sounds
- [ ] Notification preferences per event type
- [ ] Email fallback for critical notifications
- [ ] SMS notifications (Twilio integration)
- [ ] Notification analytics dashboard
- [ ] Bulk notification management

