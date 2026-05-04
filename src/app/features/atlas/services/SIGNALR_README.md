# ATLAS SignalR Service

## Overview

The `AtlasSignalRService` provides real-time communication between the ARK Angular frontend and ATLAS backend services using SignalR WebSocket protocol. It manages persistent connections, automatic reconnection, event subscriptions, and falls back to polling when SignalR is unavailable.

## Features

- **Persistent Connection**: Establishes and maintains a WebSocket connection to ATLAS SignalR hub
- **Authentication**: Automatically includes ATLAS access tokens for secure communication
- **Automatic Reconnection**: Reconnects automatically with exponential backoff when connection is lost
- **Event Subscription**: Subscribe to multiple ATLAS event channels simultaneously
- **NgRx Integration**: Dispatches received events to NgRx store for state management
- **Polling Fallback**: Falls back to HTTP polling when SignalR is unavailable
- **Connection Lifecycle**: Manages connection state and notifies users of connectivity issues
- **Missed Events**: Requests missed events after reconnection

## Requirements Satisfied

- **6.1**: Establish persistent connection to ATLAS SignalR hub at startup
- **6.2**: Subscribe to relevant ATLAS event channels
- **6.3**: Dispatch events to NgRx store when received
- **6.4**: Automatically reconnect when connection is lost
- **6.5**: Request missed events since last connection
- **6.6**: Support authentication using ATLAS access tokens
- **6.7**: Disconnect and unsubscribe on logout
- **6.8**: Handle connection errors gracefully and notify users
- **6.9**: Support multiple concurrent event subscriptions
- **6.10**: Fall back to polling when SignalR unavailable

## Usage

### Basic Setup

```typescript
import { Component, OnInit, OnDestroy } from '@angular/core';
import { AtlasSignalRService, AtlasEventType } from './services/atlas-signalr.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit, OnDestroy {
  constructor(private signalRService: AtlasSignalRService) {}

  async ngOnInit() {
    // Connect to SignalR hub
    try {
      await this.signalRService.connect();
      console.log('Connected to ATLAS SignalR hub');
    } catch (error) {
      console.error('Failed to connect to SignalR:', error);
    }
  }

  ngOnDestroy() {
    // Disconnect when component is destroyed
    this.signalRService.disconnect();
  }
}
```

### Subscribing to Events

```typescript
import { Component, OnInit } from '@angular/core';
import { AtlasSignalRService, AtlasEventType } from './services/atlas-signalr.service';

@Component({
  selector: 'app-deployments',
  templateUrl: './deployments.component.html'
})
export class DeploymentsComponent implements OnInit {
  private subscriptionIds: string[] = [];

  constructor(private signalRService: AtlasSignalRService) {}

  ngOnInit() {
    // Subscribe to deployment events
    const deploymentCreatedId = this.signalRService.subscribe(
      AtlasEventType.DeploymentCreated,
      (data) => {
        console.log('New deployment created:', data);
        // Handle the event (data is automatically dispatched to NgRx store)
      }
    );

    const deploymentUpdatedId = this.signalRService.subscribe(
      AtlasEventType.DeploymentUpdated,
      (data) => {
        console.log('Deployment updated:', data);
      }
    );

    // Store subscription IDs for cleanup
    this.subscriptionIds.push(deploymentCreatedId, deploymentUpdatedId);
  }

  ngOnDestroy() {
    // Unsubscribe from events
    this.subscriptionIds.forEach(id => {
      this.signalRService.unsubscribe(id);
    });
  }
}
```

### Monitoring Connection Status

```typescript
import { Component, OnInit } from '@angular/core';
import { AtlasSignalRService, SignalRConnectionState } from './services/atlas-signalr.service';

@Component({
  selector: 'app-connection-status',
  template: `
    <div class="connection-status" [class.connected]="isConnected">
      <span>{{ connectionStatus }}</span>
    </div>
  `
})
export class ConnectionStatusComponent implements OnInit {
  connectionStatus = 'Disconnected';
  isConnected = false;

  constructor(private signalRService: AtlasSignalRService) {}

  ngOnInit() {
    // Monitor connection status
    this.signalRService.status$.subscribe(status => {
      this.connectionStatus = status.state;
      this.isConnected = status.isConnected;

      if (status.error) {
        console.error('SignalR error:', status.error);
      }
    });

    // Monitor connectivity notifications
    this.signalRService.connectivityNotifications$.subscribe(notification => {
      // Show toast notification to user
      console.log(`[${notification.type}] ${notification.message}`);
    });
  }
}
```

## Event Types

The service supports the following ATLAS event types:

### Deployment Events
- `DeploymentCreated`: New deployment created
- `DeploymentUpdated`: Deployment updated
- `DeploymentDeleted`: Deployment deleted
- `DeploymentStateTransitioned`: Deployment state changed
- `EvidenceSubmitted`: Evidence submitted for deployment

### Approval Events
- `ApprovalRequested`: Approval requested
- `ApprovalDecisionRecorded`: Approval decision recorded

### Exception Events
- `ExceptionCreated`: Exception created
- `ExceptionApproved`: Exception approved
- `ExceptionDenied`: Exception denied

### AI Analysis Events
- `AnalysisCompleted`: AI analysis completed
- `RiskAssessmentCompleted`: Risk assessment completed

### Agent Events
- `AgentExecutionCompleted`: Agent execution completed

## Connection States

The service tracks the following connection states:

- `Disconnected`: Not connected to SignalR hub
- `Connecting`: Attempting to establish connection
- `Connected`: Successfully connected
- `Reconnecting`: Connection lost, attempting to reconnect
- `Disconnecting`: Disconnecting from hub

## Automatic Reconnection

The service uses exponential backoff for reconnection attempts:

1. First retry: Immediate (0s)
2. Second retry: 2 seconds
3. Third retry: 10 seconds
4. Fourth retry: 30 seconds
5. Subsequent retries: 60 seconds

## Polling Fallback

When SignalR is unavailable, the service automatically falls back to HTTP polling:

- **Polling Interval**: 30 seconds
- **Automatic Activation**: Starts when SignalR connection fails or closes
- **Automatic Deactivation**: Stops when SignalR connection is restored

The polling mechanism dispatches refresh actions to NgRx store to fetch latest data.

## NgRx Integration

Events received via SignalR are automatically dispatched to the appropriate NgRx store slices:

- **Deployment events** → Deployment state
- **Approval events** → Approval state
- **Exception events** → Exception state
- **AI Analysis events** → AI Analysis state
- **Agent events** → Agent state

This ensures the application state stays synchronized with backend changes in real-time.

## Configuration

The service uses `AtlasConfigService` for configuration:

```typescript
{
  baseUrl: 'https://api.example.com',
  endpoints: {
    signalR: '/hubs/atlas'  // SignalR hub endpoint
  },
  features: {
    enabled: true  // Must be true for SignalR to connect
  }
}
```

## Authentication

The service uses `AtlasAuthService` to obtain access tokens:

- Tokens are automatically included in SignalR connection
- Tokens are refreshed automatically when needed
- Connection fails if no valid token is available

## Error Handling

The service handles errors gracefully:

- **Connection Errors**: Logged and trigger automatic reconnection
- **Event Handler Errors**: Logged but don't affect other handlers
- **Import Errors**: Logged when dynamic imports fail

## Best Practices

1. **Connect Early**: Connect to SignalR in your root component's `ngOnInit`
2. **Clean Up**: Always unsubscribe from events in `ngOnDestroy`
3. **Monitor Status**: Subscribe to `status$` to track connection health
4. **Handle Notifications**: Subscribe to `connectivityNotifications$` to inform users
5. **Test Fallback**: Ensure your application works with polling fallback

## Testing

The service includes comprehensive unit tests covering:

- Service creation and initialization
- Connection state management
- Event subscription and unsubscription
- Status observables
- Cleanup on destroy

Run tests with:

```bash
npm test -- --include="**/atlas-signalr.service.spec.ts" --no-watch
```

## Troubleshooting

### Connection Fails

1. Check ATLAS integration is enabled in configuration
2. Verify authentication token is valid
3. Check SignalR hub URL is correct
4. Verify network connectivity

### Events Not Received

1. Verify subscription was successful
2. Check connection status is "Connected"
3. Verify event name matches backend event names
4. Check browser console for errors

### Polling Not Working

1. Verify NgRx store is properly configured
2. Check that state actions are imported correctly
3. Verify services are injected properly

## Related Services

- `AtlasConfigService`: Provides configuration including SignalR endpoint
- `AtlasAuthService`: Provides authentication tokens for SignalR
- `AtlasErrorHandlerService`: Handles errors from SignalR operations

## Future Enhancements

- Add support for custom reconnection strategies
- Implement message queuing for offline scenarios
- Add support for SignalR groups and channels
- Implement connection health monitoring
- Add support for binary message formats
