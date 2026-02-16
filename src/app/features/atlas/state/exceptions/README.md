# Exception State Management

This module implements NgRx state management for ATLAS exception and waiver requests.

## Overview

The exception state management follows the standard NgRx pattern with:
- **State**: Normalized entity storage using NgRx Entity adapter
- **Actions**: Type-safe action creators for all operations
- **Reducer**: Pure, immutable state transitions
- **Effects**: Side effect handling for API calls
- **Selectors**: Memoized state queries

## State Structure

```typescript
interface ExceptionState {
  // Entity storage (normalized)
  ids: string[];
  entities: { [id: string]: ExceptionDto };
  
  // UI state
  selectedId: string | null;
  loading: LoadingState;
  error: ErrorState;
  
  // Data management
  pagination: PaginationMetadata | null;
  filters: ExceptionFilters;
  activeExceptions: ExceptionDto[];
  validationResult: ExceptionValidationResult | null;
  
  // Cache management
  lastLoaded: number | null;
}
```

## Usage Examples

### Loading Exceptions

```typescript
// In component
this.store.dispatch(loadExceptions({ 
  deploymentId: 'dep-123',
  page: 1,
  pageSize: 50
}));

// Subscribe to data
this.exceptions$ = this.store.select(selectAllExceptions);
this.loading$ = this.store.select(selectExceptionsLoading);
this.error$ = this.store.select(selectExceptionsError);
```

### Creating an Exception

```typescript
const request: CreateExceptionRequest = {
  exceptionType: 'MISSING_DOCUMENTATION',
  justification: 'Documentation will be completed post-deployment',
  requestedBy: 'user-123',
  supportingEvidence: ['ticket-456']
};

this.store.dispatch(createException({ 
  deploymentId: 'dep-123',
  request
}));
```

### Validating an Exception

```typescript
this.store.dispatch(validateException({ 
  deploymentId: 'dep-123',
  request
}));

// Check validation result
this.validationResult$ = this.store.select(selectExceptionValidationResult);
this.isApproved$ = this.store.select(selectExceptionValidationIsApproved);
this.validationErrors$ = this.store.select(selectExceptionValidationErrors);
```

### Approving/Denying Exceptions

```typescript
// Approve
this.store.dispatch(approveException({ 
  exceptionId: 'exc-456',
  request: {
    approverId: 'user-789',
    additionalRequirements: ['Complete documentation within 30 days']
  }
}));

// Deny
this.store.dispatch(denyException({ 
  exceptionId: 'exc-456',
  request: {
    approverId: 'user-789',
    denialReason: 'Insufficient justification'
  }
}));
```

### Filtering Exceptions

```typescript
// Set filters
this.store.dispatch(setExceptionFilters({ 
  filters: {
    status: ExceptionStatus.PENDING,
    exceptionType: 'MISSING_DOCUMENTATION'
  }
}));

// Get filtered results
this.filteredExceptions$ = this.store.select(selectFilteredExceptions);

// Clear filters
this.store.dispatch(clearExceptionFilters());
```

### Loading Active Exceptions

```typescript
this.store.dispatch(loadActiveExceptions({ deploymentId: 'dep-123' }));

this.activeExceptions$ = this.store.select(selectActiveExceptions);
this.hasActiveExceptions$ = this.store.select(selectHasActiveExceptions);
```

## Selectors

### Base Selectors
- `selectAllExceptions` - All exceptions as array
- `selectExceptionEntities` - Exceptions as dictionary
- `selectExceptionIds` - All exception IDs
- `selectExceptionTotal` - Total count

### Loading Selectors
- `selectExceptionsLoading` - List loading state
- `selectExceptionDetailLoading` - Detail loading state
- `selectExceptionCreating` - Creating state
- `selectExceptionValidating` - Validating state
- `selectExceptionApproving` - Approving state
- `selectExceptionDenying` - Denying state
- `selectExceptionAnyLoading` - Any operation in progress

### Error Selectors
- `selectExceptionsError` - List error
- `selectExceptionDetailError` - Detail error
- `selectExceptionCreatingError` - Creating error
- `selectExceptionValidatingError` - Validating error
- `selectExceptionApprovingError` - Approving error
- `selectExceptionDenyingError` - Denying error
- `selectExceptionAnyError` - Any error exists

### Derived Selectors
- `selectFilteredExceptions` - Exceptions filtered by current filters
- `selectPendingExceptions` - Only pending exceptions
- `selectApprovedExceptions` - Only approved exceptions
- `selectDeniedExceptions` - Only denied exceptions
- `selectExpiredExceptions` - Only expired exceptions
- `selectExceptionsExpiringSoon` - Exceptions expiring within 7 days
- `selectExceptionCountByStatus` - Count grouped by status
- `selectExceptionCountByType` - Count grouped by type

### Factory Selectors
- `selectExceptionById(id)` - Get specific exception by ID
- `selectExceptionsByStatus(status)` - Filter by status
- `selectExceptionsByType(type)` - Filter by type

## Effects

All effects follow the pattern:
1. Listen for action
2. Call service method
3. Dispatch success action with data
4. Dispatch failure action on error

### Automatic Reloads
- After creating an exception, the list is automatically reloaded
- Refresh action triggers a reload of the exception list

## Requirements Satisfied

- **3.1**: NgRx Store for state management
- **3.2**: Type-safe actions for all mutations
- **3.3**: Pure, immutable reducers
- **3.4**: Effects for async operations
- **3.5**: Loading actions dispatched
- **3.6**: Success actions with data
- **3.7**: Failure actions with errors
- **3.8**: Memoized selectors
- **3.9**: Separate state slices
- **11.3**: Memoization to prevent re-renders

## Testing

Unit tests should cover:
- Reducer state transitions
- Selector memoization
- Effect API call handling
- Error handling paths
- Filter logic
- Derived computations

## Integration

This state is registered in the ATLAS feature module:

```typescript
StoreModule.forFeature('exceptions', exceptionReducer)
EffectsModule.forFeature([ExceptionEffects])
```
