# Integration Tests: Cross-Phase Interactions

This directory contains integration tests that verify the interactions between different phases of the frontend enhancement strategy. These tests ensure that components, services, and state management work correctly across phase boundaries.

## Test Files

### Phase 0-1 Integration (`phase0-1.integration.spec.ts`)
Tests the integration between admin viewers/state visualization (Phase 0) and role enforcement/lifecycle management (Phase 1).

**Key Test Scenarios:**
- Admin viewer with role-based access control
- State visualization with permission filtering
- Lifecycle management with audit logging
- System health monitoring with role enforcement
- State transition controls with permission checks

**Requirements Validated:** 1.1-1.7, 2.1-2.7, 3.1-3.7, 4.1-4.7

### Phase 1-2 Integration (`phase1-2.integration.spec.ts`)
Tests the integration between role enforcement/lifecycle (Phase 1) and workflow wizard/job processing (Phase 2).

**Key Test Scenarios:**
- Workflow wizard with role-appropriate steps
- Step validation with permission checks
- Lifecycle transitions with validation engine
- Job processing pipeline with permission enforcement
- Business rule validation with role context

**Requirements Validated:** 3.1-3.7, 4.1-4.7, 5.1-5.8, 6.1-6.7, 7.1-7.6

### Phase 2-3 Integration (`phase2-3.integration.spec.ts`)
Tests the integration between workflow wizard/validation (Phase 2) and AI recommendations/insights (Phase 3).

**Key Test Scenarios:**
- Workflow wizard with AI recommendations
- Validation engine with AI insights
- Recommendation acceptance in workflows
- AI-enhanced validation feedback
- Workflow metadata tracking for AI usage

**Requirements Validated:** 5.1-5.8, 7.1-7.6, 8.1-8.7, 9.1-9.7

### Phase 2-4 Integration (`phase2-4.integration.spec.ts`)
Tests the integration between workflow wizard/validation (Phase 2) and template selection/customization (Phase 4).

**Key Test Scenarios:**
- Workflow wizard with template selection
- Template application with validation
- Customized templates in workflows
- Template requirement enforcement
- Template immutability during customization

**Requirements Validated:** 5.1-5.8, 7.1-7.6, 10.1-10.6, 11.1-11.7

### Phase 3-5 Integration (`phase3-5.integration.spec.ts`)
Tests the integration between AI recommendations/insights (Phase 3) and predictive forecasting/trend analysis (Phase 5).

**Key Test Scenarios:**
- AI recommendations based on forecast data
- Insights display with trend visualizations
- Forecast-based recommendation generation
- Trend analysis integration with insights
- Prediction-driven recommendations

**Requirements Validated:** 8.1-8.7, 9.1-9.7, 13.1-13.7, 14.1-14.7

### Phase 4-5 Integration (`phase4-5.integration.spec.ts`)
Tests the integration between template selection/configuration (Phase 4) and predictive analytics/forecasting (Phase 5).

**Key Test Scenarios:**
- Template selection with predictive analytics
- Configuration management with forecasts
- Template recommendations based on predictions
- Predicted template performance metrics
- Dynamic configuration adjustment based on trends

**Requirements Validated:** 10.1-10.6, 11.1-11.7, 12.1-12.6, 13.1-13.7

## Running the Tests

### Run All Integration Tests
```bash
npm test -- --include='**/integration-tests/**/*.spec.ts'
```

### Run Specific Phase Integration Tests
```bash
# Phase 0-1
npm test -- --include='**/phase0-1.integration.spec.ts'

# Phase 1-2
npm test -- --include='**/phase1-2.integration.spec.ts'

# Phase 2-3
npm test -- --include='**/phase2-3.integration.spec.ts'

# Phase 2-4
npm test -- --include='**/phase2-4.integration.spec.ts'

# Phase 3-5
npm test -- --include='**/phase3-5.integration.spec.ts'

# Phase 4-5
npm test -- --include='**/phase4-5.integration.spec.ts'
```

## Test Structure

Each integration test file follows a consistent structure:

1. **Component Setup**: Configure TestBed with necessary components, services, and mock store
2. **Mock Data**: Define realistic mock data representing cross-phase interactions
3. **Test Scenarios**: Verify specific integration points between phases
4. **Assertions**: Validate that data flows correctly between phases and components behave as expected

## Key Testing Patterns

### Mock Store Configuration
All tests use `provideMockStore` to simulate NgRx state across multiple phases:

```typescript
provideMockStore({
  initialState: {
    phase0State: { /* ... */ },
    phase1State: { /* ... */ },
    // ... other phase states
  }
})
```

### Service Mocking
Services are mocked using Jasmine spies to control behavior and verify interactions:

```typescript
const serviceSpy = jasmine.createSpyObj('ServiceName', ['method1', 'method2']);
serviceSpy.method1.and.returnValue(of(mockData));
```

### Async Testing
All async operations use `fakeAsync` and `tick()` for deterministic testing:

```typescript
it('should test async behavior', fakeAsync(() => {
  component.loadData();
  tick();
  
  expect(component.data).toBeDefined();
}));
```

## Coverage Goals

Integration tests aim to achieve:
- **Cross-phase data flow**: Verify data passes correctly between phases
- **Permission enforcement**: Ensure role-based access works across features
- **Validation consistency**: Confirm validation rules apply uniformly
- **State synchronization**: Validate NgRx state updates propagate correctly
- **Error handling**: Test error scenarios that span multiple phases

## Best Practices

1. **Realistic Mock Data**: Use data structures that match production scenarios
2. **Minimal Mocking**: Only mock external dependencies, not the components under test
3. **Clear Test Names**: Describe what is being tested and expected outcome
4. **Isolated Tests**: Each test should be independent and not rely on others
5. **Comprehensive Assertions**: Verify both positive and negative scenarios

## Maintenance

When adding new features or modifying existing phases:

1. Review affected integration tests
2. Update mock data to reflect new data structures
3. Add new test scenarios for new integration points
4. Ensure all tests pass before merging changes
5. Update this README with any new test files or patterns

## Troubleshooting

### Common Issues

**Issue**: Tests fail with "Cannot read property of undefined"
- **Solution**: Ensure all required services are provided in TestBed configuration

**Issue**: Async tests timeout
- **Solution**: Verify all observables complete and use `tick()` appropriately

**Issue**: Mock store state not updating
- **Solution**: Use `store.setState()` to update state during tests

**Issue**: Component not rendering expected elements
- **Solution**: Call `fixture.detectChanges()` after state changes

## Related Documentation

- [Phase 0 Components](../phase0/README.md)
- [Phase 1 Components](../phase1/README.md)
- [Phase 2 Components](../phase2/README.md)
- [Phase 3 Components](../phase3/README.md)
- [Phase 4 Components](../phase4/README.md)
- [Phase 5 Components](../phase5/README.md)
- [Testing Strategy](../../../../.kiro/specs/frontend-phase-enhancements/design.md#testing-strategy)

## Contributing

When adding new integration tests:

1. Follow the existing file naming convention: `phaseX-Y.integration.spec.ts`
2. Include comprehensive JSDoc comments explaining what is being tested
3. List all validated requirements in the file header
4. Group related tests using `describe` blocks
5. Update this README with the new test file information
