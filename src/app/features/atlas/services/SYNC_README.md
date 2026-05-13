# ATLAS Data Synchronization Service

## Overview

The `AtlasSyncService` manages data synchronization between the ARK Angular frontend and ATLAS backend services. It provides comprehensive synchronization capabilities including real-time updates, conflict resolution, offline operation queueing, consistency validation, and manual refresh.

## Features

### 1. Real-Time State Updates (Requirement 8.1)

The service automatically subscribes to SignalR events and updates local NgRx state when ATLAS data changes:

- **Deployment Events**: Created, Updated, Deleted, State Transitioned, Evidence Submitted
- **Approval Events**: Requested, Decision Recorded
- **Exception Events**: Created, Approved, Denied
- **AI Analysis Events**: Analysis Completed, Risk Assessment Completed
- **Agent Events**: Execution Completed

**Usage:**
```typescript
// The service automatically handles real-time updates
// No manual intervention required - state updates happen automatically
```

### 2. Conflict Resolution (Requirement 8.3)

When both client and server data change simultaneously, the service detects and resolves conflicts using configurable strategies:

**Conflict Resolution Strategies:**
- `ServerWins`: Server data takes precedence (default)
- `ClientWins`: Client data is re-submitted to server
- `MergeChanges`: Intelligent merge of client and server changes
- `PromptUser`: User manually resolves the conflict

**Usage:**
```typescript
// Conflicts are automatically detected and resolved
// Get current conflicts:
const conflicts = syncService.getConflicts();

// Conflicts are tracked in sync state:
syncService.syncState$.subscribe(state => {
  console.log(`Active conflicts: ${state.conflicts}`);
});
```

### 3. Offline Operation Queueing (Requirement 8.7)

Operations performed while offline are queued and automatically executed when connectivity is restored:

**Supported Operations:**
- Create, Update, Delete deployments
- State transitions
- Evidence submission
- Approval requests and decisions
- Exception requests
- Agent executions

**Usage:**
```typescript
// Queue an operation manually:
syncService.queueOperation({
  id: 'op_123',
  type: 'create',
  entityType: 'deployment',
  payload: { title: 'New Deployment', type: 'STANDARD' },
  timestamp: new Date(),
  retryCount: 0,
  maxRetries: 3
});

// Get pending operations:
const pending = syncService.getPendingOperations();

// Clear queue:
syncService.clearQueue();
```

**Automatic Processing:**
- Operations are automatically processed when online
- Failed operations are retried with exponential backoff
- Operations exceeding max retries are removed from queue
- Queue is persisted to localStorage across sessions

### 4. Data Consistency Validation (Requirements 8.8, 8.9)

Periodic validation ensures data consistency between ARK and ATLAS:

**Validation Features:**
- Runs every 5 minutes automatically
- Validates deployments, approvals, and exceptions
- Triggers reconciliation when inconsistencies detected
- Compares checksums/versions between local and server data

**Usage:**
```typescript
// Consistency validation runs automatically
// Monitor sync status:
syncService.syncState$.subscribe(state => {
  console.log(`Sync status: ${state.status}`);
  console.log(`Last sync: ${state.lastSyncTime}`);
});
```

### 5. Manual Refresh (Requirement 8.10)

Force synchronization of data from server:

**Usage:**
```typescript
// Refresh all entities:
await syncService.manualRefresh();

// Refresh specific entity type:
await syncService.manualRefresh('deployment');
await syncService.manualRefresh('approval');
await syncService.manualRefresh('exception');
await syncService.manualRefresh('agent');
await syncService.manualRefresh('ai-analysis');
```

## Synchronization State

The service exposes synchronization state through an observable:

```typescript
export interface SyncState {
  status: SyncStatus;           // Current sync status
  lastSyncTime: Date | null;    // Last successful sync
  pendingOperations: number;    // Queued operations count
  conflicts: number;            // Active conflicts count
  isOnline: boolean;           // Network connectivity status
}

export enum SyncStatus {
  Synced = 'Synced',           // All data synchronized
  Syncing = 'Syncing',         // Sync in progress
  OutOfSync = 'OutOfSync',     // Conflicts detected
  Offline = 'Offline',         // No network connectivity
  Error = 'Error'              // Sync error occurred
}
```

**Usage:**
```typescript
// Subscribe to sync state changes:
syncService.syncState$.subscribe(state => {
  if (state.status === SyncStatus.Offline) {
    console.log('Application is offline');
  }
  
  if (state.pendingOperations > 0) {
    console.log(`${state.pendingOperations} operations pending`);
  }
  
  if (state.conflicts > 0) {
    console.log(`${state.conflicts} conflicts need resolution`);
  }
});

// Get current state synchronously:
const currentState = syncService.syncState;
```

## Integration with Components

### Display Sync Status

```typescript
@Component({
  selector: 'app-sync-status',
  template: `
    <div class="sync-status" [ngClass]="syncStatus">
      <mat-icon>{{ getStatusIcon() }}</mat-icon>
      <span>{{ getStatusText() }}</span>
      <button mat-icon-button (click)="refresh()" *ngIf="canRefresh()">
        <mat-icon>refresh</mat-icon>
      </button>
    </div>
    
    <div *ngIf="pendingOperations > 0" class="pending-operations">
      {{ pendingOperations }} operations pending
    </div>
    
    <div *ngIf="conflicts > 0" class="conflicts-warning">
      {{ conflicts }} conflicts detected
    </div>
  `
})
export class SyncStatusComponent {
  syncState$ = this.syncService.syncState$;
  
  constructor(private syncService: AtlasSyncService) {}
  
  async refresh(): Promise<void> {
    await this.syncService.manualRefresh();
  }
}
```

### Handle Offline Operations

```typescript
@Component({
  selector: 'app-deployment-form',
  template: `...`
})
export class DeploymentFormComponent {
  constructor(
    private store: Store,
    private syncService: AtlasSyncService
  ) {}
  
  onSubmit(): void {
    if (navigator.onLine) {
      // Normal operation - dispatch to store
      this.store.dispatch(createDeployment({ request: this.form.value }));
    } else {
      // Offline - queue operation
      this.syncService.queueOperation({
        id: this.generateId(),
        type: 'create',
        entityType: 'deployment',
        payload: this.form.value,
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3
      });
      
      // Show user feedback
      this.showOfflineNotification();
    }
  }
}
```

## Architecture

### Service Dependencies

```
AtlasSyncService
├── AtlasSignalRService (real-time events)
├── AtlasConfigService (configuration)
└── NgRx Store (state management)
```

### Event Flow

```
1. SignalR Event Received
   ↓
2. AtlasSyncService Handler
   ↓
3. Conflict Detection
   ↓
4. Conflict Resolution (if needed)
   ↓
5. NgRx Action Dispatch
   ↓
6. State Update
   ↓
7. Component Re-render
```

### Offline Operation Flow

```
1. User Action (while offline)
   ↓
2. Operation Queued
   ↓
3. Saved to localStorage
   ↓
4. Network Restored
   ↓
5. Queue Processing
   ↓
6. NgRx Action Dispatch
   ↓
7. API Call
   ↓
8. Success: Remove from Queue
   Failure: Retry or Remove
```

## Configuration

### Queue Settings

```typescript
private readonly QUEUE_STORAGE_KEY = 'atlas_operation_queue';
private readonly MAX_QUEUE_SIZE = 100;
```

### Consistency Check Settings

```typescript
private readonly CONSISTENCY_CHECK_INTERVAL_MS = 300000; // 5 minutes
```

### Retry Settings

Operations have configurable retry settings:
```typescript
{
  retryCount: 0,
  maxRetries: 3  // Maximum retry attempts
}
```

## Best Practices

1. **Monitor Sync State**: Always display sync status to users
2. **Handle Offline Gracefully**: Queue operations when offline
3. **Provide Feedback**: Show users when operations are pending
4. **Resolve Conflicts**: Implement UI for manual conflict resolution when needed
5. **Test Offline Scenarios**: Thoroughly test offline/online transitions
6. **Limit Queue Size**: Monitor queue size to prevent memory issues
7. **Clear Queue on Logout**: Clear sensitive data from queue on logout

## Testing

The service includes comprehensive unit tests covering:
- Initialization and setup
- Real-time event handling
- Offline operation queueing
- Conflict resolution
- Manual refresh
- Sync state management
- Cleanup and resource management

Run tests:
```bash
ng test --include='**/atlas-sync.service.spec.ts'
```

## Troubleshooting

### Operations Not Processing

1. Check network connectivity
2. Verify ATLAS integration is enabled
3. Check browser console for errors
4. Inspect operation queue: `syncService.getPendingOperations()`

### Conflicts Not Resolving

1. Check conflict resolution strategy
2. Verify server data is accessible
3. Review conflict details: `syncService.getConflicts()`

### Sync State Stuck

1. Trigger manual refresh: `syncService.manualRefresh()`
2. Check SignalR connection status
3. Verify consistency validation is running

## Future Enhancements

- Advanced conflict resolution UI
- Configurable sync strategies per entity type
- Sync analytics and monitoring
- Batch operation optimization
- Delta sync for large datasets
- Compression for queued operations
- Encrypted queue storage
