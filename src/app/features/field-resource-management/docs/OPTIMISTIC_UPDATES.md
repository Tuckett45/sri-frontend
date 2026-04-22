# Optimistic Updates with Rollback

This document describes the optimistic update pattern implemented in the Field Resource Management system.

## Overview

Optimistic updates improve user experience by immediately reflecting changes in the UI before the server confirms them. If the server request fails, the changes are automatically rolled back to the previous state.

## Architecture

The optimistic update pattern consists of:

1. **Optimistic Actions**: Immediately update the UI state
2. **API Call**: Execute the actual server request
3. **Success Actions**: Confirm the update (may replace temp IDs with real ones)
4. **Rollback Actions**: Revert to original state on failure

## Available Optimistic Actions

### Technician State

```typescript
// Update technician optimistically
updateTechnicianOptimistic({ id, changes, originalData })
rollbackTechnicianUpdate({ id, originalData })

// Create technician optimistically
createTechnicianOptimistic({ technician, tempId })
rollbackTechnicianCreate({ tempId })

// Delete technician optimistically
deleteTechnicianOptimistic({ id, originalData })
rollbackTechnicianDelete({ originalData })
```

### Assignment State

```typescript
// Create assignment optimistically
createAssignmentOptimistic({ assignment, tempId })
rollbackAssignmentCreate({ tempId })

// Update assignment optimistically
updateAssignmentOptimistic({ id, changes, originalData })
rollbackAssignmentUpdate({ id, originalData })

// Accept assignment optimistically
acceptAssignmentOptimistic({ id, originalData })
rollbackAssignmentAccept({ id, originalData })

// Reject assignment optimistically
rejectAssignmentOptimistic({ id, reason, originalData })
rollbackAssignmentReject({ id, originalData })
```

### Job State

```typescript
// Update job optimistically
updateJobOptimistic({ id, changes, originalData })
rollbackJobUpdate({ id, originalData })

// Update job status optimistically
updateJobStatusOptimistic({ id, status, reason, originalData })
rollbackJobStatusUpdate({ id, originalData })

// Delete job optimistically
deleteJobOptimistic({ id, originalData })
rollbackJobDelete({ originalData })
```

## Usage Examples

### Example 1: Optimistic Update with OptimisticUpdateService

```typescript
import { Component } from '@angular/core';
import { Store } from '@ngrx/store';
import { OptimisticUpdateService } from '../services/optimistic-update.service';
import { TechnicianService } from '../services/technician.service';
import * as TechnicianActions from '../state/technicians/technician.actions';

@Component({
  selector: 'app-technician-edit',
  template: '...'
})
export class TechnicianEditComponent {
  constructor(
    private store: Store,
    private optimisticUpdateService: OptimisticUpdateService,
    private technicianService: TechnicianService
  ) {}

  updateTechnician(technician: Technician, changes: Partial<Technician>) {
    const originalData = this.optimisticUpdateService.cloneEntity(technician);

    const config = {
      entity: technician,
      changes,
      optimisticAction: TechnicianActions.updateTechnicianOptimistic({
        id: technician.id,
        changes,
        originalData
      }),
      successAction: TechnicianActions.updateTechnicianSuccess,
      rollbackAction: TechnicianActions.rollbackTechnicianUpdate({
        id: technician.id,
        originalData
      }),
      onSuccess: () => {
        console.log('Update successful');
      },
      onFailure: (error) => {
        console.error('Update failed:', error);
      }
    };

    this.optimisticUpdateService
      .executeOptimisticUpdate(config, this.technicianService.updateTechnician(technician.id, changes))
      .subscribe();
  }
}
```

### Example 2: Direct Dispatch Pattern

```typescript
import { Component } from '@angular/core';
import { Store, select } from '@ngrx/store';
import * as TechnicianActions from '../state/technicians/technician.actions';
import { selectTechnicianById } from '../state/technicians/technician.selectors';

@Component({
  selector: 'app-technician-status',
  template: '...'
})
export class TechnicianStatusComponent {
  constructor(private store: Store) {}

  updateStatus(technicianId: string, newStatus: string) {
    // Get current technician data
    this.store.pipe(
      select(selectTechnicianById(technicianId)),
      take(1)
    ).subscribe(technician => {
      if (!technician) return;

      // Clone for rollback
      const originalData = JSON.parse(JSON.stringify(technician));

      // Dispatch optimistic action
      this.store.dispatch(
        TechnicianActions.updateTechnicianOptimistic({
          id: technicianId,
          changes: { status: newStatus },
          originalData
        })
      );

      // The effect will handle the API call and rollback if needed
    });
  }
}
```

### Example 3: Optimistic Create with Temporary ID

```typescript
import { Component } from '@angular/core';
import { Store } from '@ngrx/store';
import { OptimisticUpdateService } from '../services/optimistic-update.service';
import * as TechnicianActions from '../state/technicians/technician.actions';

@Component({
  selector: 'app-technician-create',
  template: '...'
})
export class TechnicianCreateComponent {
  constructor(
    private store: Store,
    private optimisticUpdateService: OptimisticUpdateService
  ) {}

  createTechnician(technicianData: any) {
    // Generate temporary ID
    const tempId = this.optimisticUpdateService.generateTempId();

    // Create technician with temp ID
    const technician = {
      ...technicianData,
      id: tempId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Dispatch optimistic create
    this.store.dispatch(
      TechnicianActions.createTechnicianOptimistic({
        technician,
        tempId
      })
    );

    // The effect will replace the temp entity with the real one from the server
  }
}
```

### Example 4: Optimistic Delete

```typescript
import { Component } from '@angular/core';
import { Store, select } from '@ngrx/store';
import * as JobActions from '../state/jobs/job.actions';
import { selectJobById } from '../state/jobs/job.selectors';

@Component({
  selector: 'app-job-list',
  template: '...'
})
export class JobListComponent {
  constructor(private store: Store) {}

  deleteJob(jobId: string) {
    // Get current job data for rollback
    this.store.pipe(
      select(selectJobById(jobId)),
      take(1)
    ).subscribe(job => {
      if (!job) return;

      // Clone for rollback
      const originalData = JSON.parse(JSON.stringify(job));

      // Dispatch optimistic delete
      this.store.dispatch(
        JobActions.deleteJobOptimistic({
          id: jobId,
          originalData
        })
      );

      // The effect will handle the API call and rollback if needed
    });
  }
}
```

### Example 5: Assignment Accept/Reject

```typescript
import { Component } from '@angular/core';
import { Store, select } from '@ngrx/store';
import * as AssignmentActions from '../state/assignments/assignment.actions';
import { selectAssignmentById } from '../state/assignments/assignment.selectors';

@Component({
  selector: 'app-assignment-card',
  template: '...'
})
export class AssignmentCardComponent {
  constructor(private store: Store) {}

  acceptAssignment(assignmentId: string) {
    this.store.pipe(
      select(selectAssignmentById(assignmentId)),
      take(1)
    ).subscribe(assignment => {
      if (!assignment) return;

      const originalData = JSON.parse(JSON.stringify(assignment));

      this.store.dispatch(
        AssignmentActions.acceptAssignmentOptimistic({
          id: assignmentId,
          originalData
        })
      );
    });
  }

  rejectAssignment(assignmentId: string, reason: string) {
    this.store.pipe(
      select(selectAssignmentById(assignmentId)),
      take(1)
    ).subscribe(assignment => {
      if (!assignment) return;

      const originalData = JSON.parse(JSON.stringify(assignment));

      this.store.dispatch(
        AssignmentActions.rejectAssignmentOptimistic({
          id: assignmentId,
          reason,
          originalData
        })
      );
    });
  }
}
```

## Best Practices

### 1. Always Clone Original Data

Before dispatching an optimistic action, always create a deep copy of the original entity:

```typescript
const originalData = JSON.parse(JSON.stringify(entity));
// OR
const originalData = this.optimisticUpdateService.cloneEntity(entity);
```

### 2. Use Temporary IDs for Creates

When creating entities optimistically, use the `generateTempId()` method:

```typescript
const tempId = this.optimisticUpdateService.generateTempId();
```

### 3. Handle Rollback Gracefully

Show user-friendly messages when rollbacks occur:

```typescript
onFailure: (error) => {
  this.snackBar.open(
    'Update failed. Changes have been reverted.',
    'Close',
    { duration: 5000 }
  );
}
```

### 4. Consider Network Conditions

For critical operations, you may want to disable optimistic updates on slow connections:

```typescript
if (navigator.connection && navigator.connection.effectiveType === '2g') {
  // Use regular update instead of optimistic
  this.store.dispatch(TechnicianActions.updateTechnician({ id, changes }));
} else {
  // Use optimistic update
  this.store.dispatch(TechnicianActions.updateTechnicianOptimistic({ id, changes, originalData }));
}
```

### 5. Test Rollback Scenarios

Always test that rollbacks work correctly:

```typescript
it('should rollback on API failure', (done) => {
  // Mock API to fail
  spyOn(service, 'updateTechnician').and.returnValue(throwError(() => new Error('API Error')));

  // Dispatch optimistic action
  store.dispatch(updateTechnicianOptimistic({ id, changes, originalData }));

  // Verify rollback action was dispatched
  actions$.pipe(
    ofType(rollbackTechnicianUpdate),
    take(1)
  ).subscribe(action => {
    expect(action.originalData).toEqual(originalData);
    done();
  });
});
```

## Error Handling

The optimistic update pattern includes automatic error handling:

1. **Network Errors**: Automatically rolled back with error message
2. **Validation Errors**: Rolled back with validation details
3. **Permission Errors**: Rolled back with permission error message
4. **Conflict Errors**: Rolled back with conflict details

## Performance Considerations

- Optimistic updates reduce perceived latency by 200-500ms
- Rollbacks are rare (< 1% of operations in normal conditions)
- Cloning entities has minimal performance impact for typical entity sizes
- Consider disabling for batch operations (use regular actions instead)

## Monitoring

Track optimistic update metrics:

```typescript
// In effects
tap(() => {
  analytics.track('optimistic_update_success', {
    entity: 'technician',
    operation: 'update'
  });
})

// In rollback
tap(() => {
  analytics.track('optimistic_update_rollback', {
    entity: 'technician',
    operation: 'update',
    error: error.message
  });
})
```

## Related Documentation

- [NgRx State Management](./STATE_MANAGEMENT.md)
- [Real-time Updates](./REAL_TIME_UPDATES.md)
- [Error Handling](./ERROR_HANDLING.md)
