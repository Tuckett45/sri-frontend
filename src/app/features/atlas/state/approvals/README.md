# Approval State Management

This directory contains the NgRx state management implementation for ATLAS approval workflows.

## Overview

The approval state management follows the same pattern as deployment and AI analysis state, providing:

- **State**: Normalized entity storage with loading states, errors, pagination, and filters
- **Actions**: Type-safe actions for all approval operations
- **Reducer**: Pure, immutable state transitions
- **Effects**: Side effects handling for API calls and state synchronization
- **Selectors**: Memoized selectors for efficient data access

## Architecture

```
approvals/
├── approval.state.ts      # State interface and initial state
├── approval.actions.ts    # Action definitions
├── approval.reducer.ts    # Reducer implementation
├── approval.effects.ts    # Effects for async operations
├── approval.selectors.ts  # Memoized selectors
├── index.ts              # Barrel export
└── README.md             # This file
```

## State Structure

```typescript
interface ApprovalState {
  // Entity storage (normalized)
  ids: string[];
  entities: { [id: string]: ApprovalDto };
  
  // Selection
  selectedId: string | null;
  
  // Loading states
  loading: {
    list: boolean;
    detail: boolean;
    requesting: boolean;
    recordingDecision: boolean;
    checkingAuthority: boolean;
    loadingPending: boolean;
    loadingUserApprovals: boolean;
  };
  
  // Error states
  error: {
    list: string | null;
    detail: string | null;
    requesting: string | null;
    recordingDecision: string | null;
    checkingAuthority: string | null;
    loadingPending: string | null;
    loadingUserApprovals: string | null;
  };
  
  // Pagination
  pagination: PaginationMetadata | null;
  
  // Filters
  filters: ApprovalFilters;
  
  // Pending approvals
  pendingApprovals: ApprovalDto[];
  
  // User approvals
  userApprovals: {
    items: ApprovalDto[];
    pagination: PaginationMetadata | null;
  };
  
  // Authority check result
  authority: {
    isAuthorized: boolean;
    authorityLevel?: string;
    roles?: string[];
    permissions?: string[];
    reason?: string;
  } | null;
  
  // Cache
  lastLoaded: number | null;
}
```

## Usage Examples

### Loading Approvals

```typescript
// In component
this.store.dispatch(loadApprovalsForDeployment({
  deploymentId: 'deployment-123',
  forState: LifecycleState.READY
}));

// Subscribe to approvals
this.approvals$ = this.store.select(selectAllApprovals);
this.loading$ = this.store.select(selectApprovalsLoading);
```

### Requesting Approval

```typescript
this.store.dispatch(requestApproval({
  request: {
    deploymentId: 'deployment-123',
    forState: LifecycleState.READY,
    justification: 'All requirements met'
  }
}));
```

### Recording Decision

```typescript
this.store.dispatch(recordDecision({
  approvalId: 'approval-456',
  decision: {
    decision: 'APPROVED',
    comments: 'Approved after review',
    approverRole: 'Manager'
  }
}));
```

### Checking Authority

```typescript
this.store.dispatch(checkAuthority({
  deploymentId: 'deployment-123',
  forState: LifecycleState.READY
}));

// Subscribe to authority result
this.isAuthorized$ = this.store.select(selectIsAuthorized);
```

### Using Selectors

```typescript
// Basic selectors
this.allApprovals$ = this.store.select(selectAllApprovals);
this.pendingApprovals$ = this.store.select(selectPendingApprovals);
this.userApprovals$ = this.store.select(selectUserApprovals);

// Filtered selectors
this.approvedApprovals$ = this.store.select(selectApprovedApprovals);
this.deniedApprovals$ = this.store.select(selectDeniedApprovals);

// Loading states
this.isLoading$ = this.store.select(selectApprovalAnyLoading);
this.isRequesting$ = this.store.select(selectApprovalRequesting);

// Error states
this.error$ = this.store.select(selectApprovalsError);
```

## Key Features

### Entity Management

Uses NgRx Entity adapter for:
- Normalized entity storage
- Efficient CRUD operations
- Automatic sorting (pending approvals first, then by date)

### Loading States

Separate loading flags for each operation:
- `list`: Loading approval list
- `requesting`: Requesting new approval
- `recordingDecision`: Recording approval decision
- `checkingAuthority`: Checking user authority
- `loadingPending`: Loading pending approvals
- `loadingUserApprovals`: Loading user's approvals

### Error Handling

Separate error states for each operation with user-friendly error messages.

### Memoization

All selectors are memoized using `createSelector` to prevent unnecessary re-renders and improve performance.

### Automatic Reloads

Effects automatically reload related data after state changes:
- After requesting approval → reload pending approvals
- After recording decision → update approval entity

## Integration with Deployment State

The approval state integrates with deployment state for:
- Loading approvals when viewing deployment details
- Updating deployment state after approval decisions
- Checking approval requirements before state transitions

## Requirements Satisfied

- **3.1**: NgRx Store for state management
- **3.2**: Type-safe actions for all operations
- **3.3**: Pure, immutable reducers
- **3.4**: Effects for async operations
- **3.5**: Loading state management
- **3.6**: Success action handling
- **3.7**: Error action handling
- **3.8**: Memoized selectors
- **3.9**: Separate state slices
- **11.3**: Performance optimization through memoization

## Testing

Each file should have corresponding unit tests:
- `approval.reducer.spec.ts`: Test state transitions
- `approval.effects.spec.ts`: Test side effects
- `approval.selectors.spec.ts`: Test selector logic

## Future Enhancements

- Add real-time updates via SignalR
- Implement approval workflow visualization
- Add approval delegation support
- Implement approval templates
- Add approval analytics and reporting
