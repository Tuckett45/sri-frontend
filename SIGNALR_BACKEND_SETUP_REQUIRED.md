# SignalR Backend Setup Required

## Current Issue

The frontend is attempting to connect to the SignalR hub at `/hubs/deployments/negotiate` but receiving a **405 Method Not Allowed** error. This indicates the SignalR hub is not properly configured or deployed on the backend.

## Error Details

```
Failed to load resource: the server responded with a status of 405 ()
Error: Failed to complete negotiation with the server: Error: : Status code '405'
Error: Failed to start the connection: Error: Failed to complete negotiation with the server
```

## What This Means

- ❌ **SignalR Hub Not Deployed**: The backend SignalR hub endpoint is not available
- ✅ **Frontend Code Ready**: All frontend notification code is implemented and ready
- ✅ **Graceful Degradation**: The app continues to work without real-time notifications
- ⚠️ **Limited Functionality**: Users won't receive real-time push notifications until backend is configured

## Frontend Status

### ✅ Implemented and Ready

1. **SignalR Client Service** (`deployment-signalr.service.ts`)
   - Connection management with automatic reconnection
   - Event handlers for all deployment notification types
   - Graceful error handling for missing backend

2. **Push Notification Service** (`deployment-push-notification.service.ts`)
   - Web Push API integration
   - Service worker registration
   - Browser notification support
   - VAPID key configuration ready

3. **Notification UI** (`user-notifications.component.ts`)
   - Notification display and management
   - Read/unread tracking
   - Toast notifications (working without SignalR)
   - Push notification permission handling

4. **Error Handling**
   - Fails silently if SignalR hub unavailable
   - Logs warnings instead of errors
   - App continues to function normally
   - No user-facing error messages

### 🔄 What Works Now (Without SignalR)

- ✅ Toast notifications (triggered manually)
- ✅ Browser push notifications (if manually triggered)
- ✅ Notification UI and management
- ✅ Permission handling
- ✅ Service worker registration
- ✅ All FRM features (deployments, street sheets, punch lists, expenses, timesheets)

### ❌ What Doesn't Work (Requires SignalR Backend)

- ❌ Real-time deployment notifications
- ❌ Automatic notification delivery when events occur
- ❌ Live updates across multiple devices
- ❌ Instant alerts for critical events

## Backend Requirements

### 1. SignalR Hub Implementation

The backend needs to implement a SignalR hub at `/hubs/deployments` with the following:

**Hub Class** (C# example):
```csharp
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;

[Authorize]
public class DeploymentNotificationHub : Hub
{
    public async Task JoinUserGroup(string userId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"user-{userId}");
    }

    public async Task LeaveUserGroup(string userId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"user-{userId}");
    }

    // Called by backend services to send notifications
    public async Task SendDeploymentNotification(DeploymentNotification notification)
    {
        if (!string.IsNullOrEmpty(notification.UserId))
        {
            await Clients.Group($"user-{notification.UserId}")
                .SendAsync(notification.Type, notification);
        }
    }

    public override async Task OnConnectedAsync()
    {
        var userId = Context.User?.FindFirst("sub")?.Value;
        if (!string.IsNullOrEmpty(userId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user-{userId}");
        }
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.User?.FindFirst("sub")?.Value;
        if (!string.IsNullOrEmpty(userId))
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"user-{userId}");
        }
        await base.OnDisconnectedAsync(exception);
    }
}
```

**Startup Configuration** (Program.cs or Startup.cs):
```csharp
// Add SignalR services
builder.Services.AddSignalR();

// Configure CORS for SignalR
builder.Services.AddCors(options =>
{
    options.AddPolicy("SignalRPolicy", policy =>
    {
        policy.WithOrigins("https://sri-frontend.azurewebsites.net", "http://localhost:4200")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Map SignalR hub
app.MapHub<DeploymentNotificationHub>("/hubs/deployments");
```

### 2. Event Notification Types

The hub should support these event types (already handled by frontend):

**Role-Based Workflow Events:**
- `DeploymentAssigned` - User assigned to deployment
- `RoleAssigned` - User role updated
- `ReadyForSignOff` - Deployment ready for sign-off
- `SignOffRecorded` - Sign-off completed
- `DeploymentCompleted` - All sign-offs complete

**Phase & Progress Events:**
- `PhaseAdvanced` - Deployment phase changed
- `SubPhaseCompleted` - Sub-phase completed
- `EvidenceAdded` - Evidence uploaded
- `ChecklistSaved` - Checklist updated (silent)

**Issue Reporting Events:**
- `IssueCreated` - New issue reported
- `IssueUpdated` - Issue status changed
- `IssueAssigned` - Issue assigned to user
- `IssueResolved` - Issue resolved

**Punch List Events:**
- `PunchUpdated` - Punch list item updated

**Handoff Events:**
- `HandoffSigned` - Handoff signed
- `HandoffArchived` - Package archived

### 3. Notification Payload Structure

```typescript
interface DeploymentNotification {
  type: string;                    // Event type (e.g., "assigned", "ready_for_signoff")
  deploymentId: string;            // Deployment identifier
  deploymentName: string;          // Deployment name for display
  message: string;                 // Human-readable message
  timestamp: Date;                 // Event timestamp
  userId?: string;                 // Target user ID
  role?: string;                   // User role (if applicable)
  priority?: 'low' | 'medium' | 'high' | 'critical';
  data?: any;                      // Additional context data
}
```

### 4. Authentication

The hub requires JWT authentication:
- Frontend sends JWT token via `accessTokenFactory`
- Backend validates token and extracts user ID
- User automatically joins their notification group

### 5. Azure Deployment Configuration

If deploying to Azure App Service:

**App Service Configuration:**
```json
{
  "webSocketsEnabled": true,
  "alwaysOn": true,
  "http20Enabled": true
}
```

**Application Settings:**
```
ASPNETCORE_ENVIRONMENT=Production
WEBSITE_WEBDEPLOY_USE_SCM=true
```

## Testing Backend Setup

### 1. Verify Hub Endpoint

```bash
# Test negotiate endpoint
curl -X POST https://sri-api.azurewebsites.net/hubs/deployments/negotiate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# Should return 200 OK with connection info
```

### 2. Test SignalR Connection

Use SignalR test client or browser console:
```javascript
const connection = new signalR.HubConnectionBuilder()
  .withUrl("https://sri-api.azurewebsites.net/hubs/deployments", {
    accessTokenFactory: () => "YOUR_JWT_TOKEN"
  })
  .build();

await connection.start();
console.log("Connected!");
```

### 3. Test Notification Delivery

From backend, trigger a test notification:
```csharp
await _hubContext.Clients.Group($"user-{userId}")
  .SendAsync("DeploymentAssigned", new {
    type = "assigned",
    deploymentId = "test-123",
    deploymentName = "Test Deployment",
    message = "Test notification",
    timestamp = DateTime.UtcNow,
    userId = userId,
    priority = "high"
  });
```

## Integration with FRM Features

Once SignalR is working, notifications will automatically trigger for:

### Deployments
- Assignment notifications
- Phase changes
- Sign-off requests
- Issue alerts
- Completion notifications

### Street Sheets
- Creation notifications
- Update alerts
- Approval/rejection notifications

### Punch Lists
- Item creation
- Assignment notifications
- Completion alerts
- Rejection notifications

### Expenses
- Submission notifications
- Approval alerts
- Rejection notifications
- Clarification requests

### Time Sheets
- Submission notifications
- Approval alerts
- Rejection notifications
- Overtime warnings
- Missing entry reminders

## Temporary Workaround

Until SignalR backend is deployed, you can:

1. **Use Polling**: Implement periodic API calls to check for new notifications
2. **Manual Refresh**: Users refresh page to see new notifications
3. **Email Notifications**: Send email alerts for critical events
4. **Toast Only**: Use manual toast notifications for in-app events

## Next Steps

1. **Backend Team**: Implement SignalR hub as described above
2. **DevOps**: Configure Azure App Service for WebSockets
3. **Testing**: Verify hub endpoint returns 200 instead of 405
4. **Frontend**: No changes needed - will automatically connect once backend is ready
5. **Monitoring**: Add logging and monitoring for SignalR connections

## Support

For questions or assistance:
- Review `PUSH_NOTIFICATIONS_FRONTEND_README.md` for frontend details
- Check SignalR documentation: https://docs.microsoft.com/en-us/aspnet/core/signalr
- Contact backend development team for hub implementation

---

**Status**: ⚠️ Waiting for backend SignalR hub deployment
**Priority**: Medium (app works without it, but notifications are limited)
**Impact**: Real-time notifications unavailable until backend is configured
