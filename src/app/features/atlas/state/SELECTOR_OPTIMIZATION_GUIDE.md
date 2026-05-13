# Selector Optimization Guide

This document provides guidelines for creating and optimizing NgRx selectors in the ATLAS feature module to ensure optimal performance and prevent unnecessary re-renders.

## Memoization Best Practices (Requirement 11.3)

### What is Memoization?

Memoization is a performance optimization technique where selector results are cached. NgRx's `createSelector` automatically memoizes selector results, meaning:
- The selector function only runs when input values change
- If inputs are the same (by reference), the cached result is returned
- This prevents unnecessary component re-renders

### Selector Creation Guidelines

#### 1. Always Use `createSelector`

✅ **GOOD:**
```typescript
export const selectFilteredDeployments = createSelector(
  selectAllDeployments,
  selectDeploymentFilters,
  (deployments, filters) => {
    return deployments.filter(d => d.state === filters.state);
  }
);
```

❌ **BAD:**
```typescript
// This will run on every change detection cycle
export const selectFilteredDeployments = (state: AppState) => {
  const deployments = state.deployments.entities;
  const filters = state.deployments.filters;
  return deployments.filter(d => d.state === filters.state);
};
```

#### 2. Compose Selectors

Build complex selectors from simpler ones to maximize memoization benefits:

```typescript
// Base selectors
export const selectDeploymentState = createFeatureSelector<DeploymentState>('deployments');
export const selectAllDeployments = createSelector(selectDeploymentState, state => state.entities);
export const selectFilters = createSelector(selectDeploymentState, state => state.filters);

// Composed selector - only recalculates when deployments or filters change
export const selectFilteredDeployments = createSelector(
  selectAllDeployments,
  selectFilters,
  (deployments, filters) => applyFilters(deployments, filters)
);
```

#### 3. Use Factory Selectors for Dynamic Parameters

When you need to pass parameters to selectors:

```typescript
// Factory selector
export const selectDeploymentById = (id: string) =>
  createSelector(
    selectDeploymentEntities,
    (entities) => entities[id]
  );

// Usage in component
this.deployment$ = this.store.select(selectDeploymentById(this.deploymentId));
```

#### 4. Avoid Complex Computations in Selectors

Keep selector logic simple. For expensive operations, consider:
- Breaking into multiple smaller selectors
- Using entity adapters for normalized data
- Implementing server-side filtering/sorting

✅ **GOOD:**
```typescript
export const selectActiveDeployments = createSelector(
  selectAllDeployments,
  (deployments) => deployments.filter(d => d.isActive)
);
```

❌ **BAD:**
```typescript
export const selectDeploymentStatistics = createSelector(
  selectAllDeployments,
  (deployments) => {
    // Expensive nested loops and calculations
    return deployments.map(d => ({
      ...d,
      complexMetric: expensiveCalculation(d, deployments)
    }));
  }
);
```

#### 5. Use Entity Adapters

NgRx Entity provides optimized selectors out of the box:

```typescript
import { createEntityAdapter } from '@ngrx/entity';

export const deploymentAdapter = createEntityAdapter<DeploymentDto>({
  selectId: (deployment) => deployment.id
});

// Get optimized selectors
const {
  selectIds,
  selectEntities,
  selectAll,
  selectTotal
} = deploymentAdapter.getSelectors(selectDeploymentState);
```

#### 6. Avoid Creating New Objects/Arrays

Selectors should return the same reference if data hasn't changed:

✅ **GOOD:**
```typescript
export const selectDeploymentIds = createSelector(
  selectDeploymentState,
  (state) => state.ids // Returns same array reference if unchanged
);
```

❌ **BAD:**
```typescript
export const selectDeploymentIds = createSelector(
  selectDeploymentState,
  (state) => [...state.ids] // Creates new array every time!
);
```

#### 7. Use Projector Functions for Reusability

Extract filtering/transformation logic into reusable functions:

```typescript
// Reusable projector function
const filterByState = (deployments: DeploymentDto[], state: LifecycleState) =>
  deployments.filter(d => d.currentState === state);

// Multiple selectors can use the same logic
export const selectDraftDeployments = createSelector(
  selectAllDeployments,
  (deployments) => filterByState(deployments, LifecycleState.DRAFT)
);

export const selectReadyDeployments = createSelector(
  selectAllDeployments,
  (deployments) => filterByState(deployments, LifecycleState.READY)
);
```

## Performance Monitoring

### Check Selector Performance

Use Redux DevTools to monitor selector execution:

1. Install Redux DevTools browser extension
2. Enable in your app module
3. Monitor "Selectors" tab to see execution counts

### Identify Performance Issues

Signs of selector performance problems:
- Selector runs on every change detection cycle
- Component re-renders unnecessarily
- Slow UI interactions
- High CPU usage in DevTools profiler

### Optimization Checklist

- [ ] All selectors use `createSelector`
- [ ] Complex selectors are composed from simpler ones
- [ ] Factory selectors are used for dynamic parameters
- [ ] Entity adapters are used for normalized data
- [ ] Selectors don't create new objects/arrays unnecessarily
- [ ] Expensive computations are avoided or cached
- [ ] Selector results are properly typed

## ATLAS Selector Examples

### Deployment Selectors

All deployment selectors in `deployment.selectors.ts` follow these best practices:
- Base selectors for state access
- Entity adapter selectors for efficient lookups
- Derived selectors for filtered/computed data
- Factory selectors for parameterized queries

### AI Analysis Selectors

AI analysis selectors in `ai-analysis.selectors.ts` demonstrate:
- Grouping data by category/priority/severity
- Filtering critical items
- Computing derived metrics
- Staleness checks for cache invalidation

### Approval Selectors

Approval selectors show:
- Authority checking
- Pending approval queries
- Sufficient approval validation

## Testing Selectors

Always test that selectors:
1. Return correct data
2. Are properly memoized
3. Handle edge cases (null, empty arrays)

```typescript
describe('selectFilteredDeployments', () => {
  it('should return filtered deployments', () => {
    const state = {
      deployments: [/* ... */],
      filters: { state: LifecycleState.DRAFT }
    };
    const result = selectFilteredDeployments.projector(
      state.deployments,
      state.filters
    );
    expect(result).toEqual(/* expected filtered result */);
  });

  it('should be memoized', () => {
    const deployments = [/* ... */];
    const filters = { state: LifecycleState.DRAFT };
    
    const result1 = selectFilteredDeployments.projector(deployments, filters);
    const result2 = selectFilteredDeployments.projector(deployments, filters);
    
    expect(result1).toBe(result2); // Same reference
  });
});
```

## Additional Resources

- [NgRx Selectors Documentation](https://ngrx.io/guide/store/selectors)
- [NgRx Entity Documentation](https://ngrx.io/guide/entity)
- [Redux DevTools](https://github.com/reduxjs/redux-devtools)
