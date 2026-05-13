# Admin Dashboard Feature Module

This feature module implements a comprehensive 6-phase frontend enhancement strategy for the SRI Frontend Angular application, progressively building capabilities from admin viewers and state visualization through AI-powered advisory panels, workflow template switching, and predictive dashboards.

## Overview

The Admin Dashboard is organized into phases, with each phase building upon the previous one:

- **Phase 0**: Admin Viewers and State Visualization (Foundation)
- **Phase 1**: Role Enforcement and Lifecycle UI
- **Phase 2**: Full Vertical Slice Workflow UI
- **Phase 3**: AI Advisory Panels
- **Phase 4**: Workflow Template Switching
- **Phase 5**: Predictive Dashboards

## Phase 0: Foundation (Current Implementation)

Phase 0 establishes the foundational infrastructure for all subsequent phases.

### Directory Structure

```
admin-dashboard/
├── phase0/
│   ├── components/          # Phase 0 UI components
│   ├── models/              # Phase 0 data models
│   ├── services/            # Phase 0 services
│   └── state/               # Phase 0 NgRx state management
│       ├── admin-viewer/    # Admin viewer state slice
│       └── state-history/   # State history state slice
├── shared/
│   ├── components/          # Shared components across phases
│   ├── models/              # Shared data models
│   └── services/            # Shared services
├── admin-dashboard-routing.module.ts
├── admin-dashboard.module.ts
└── README.md
```

### NgRx State Slices

#### Admin Viewer State
Manages system metrics, user activities, system health, and audit logs.

**State Shape:**
```typescript
{
  metrics: AdminMetrics | null;
  activeUsers: UserActivity[];
  systemHealth: SystemHealth | null;
  auditLog: AuditLogEntry[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  filters: { userId?, actionType?, startDate?, endDate? };
}
```

**Actions:**
- `loadAdminMetrics` - Load system metrics with optional time range
- `loadAuditLog` - Load audit log entries with filters
- `filterAuditLog` - Apply filters to audit log
- `exportAuditLog` - Export audit log in CSV or PDF format
- `refreshMetrics` - Refresh metrics data

**Selectors:**
- `selectAdminMetrics` - Get current admin metrics
- `selectActiveUsers` - Get active users list
- `selectSystemHealth` - Get system health status
- `selectFilteredAuditLog` - Get filtered audit log entries

#### State History State
Manages entity state histories, transitions, and current states.

**State Shape:**
```typescript
{
  histories: { [entityId: string]: StateHistory };
  currentState: StateNode | null;
  transitions: StateTransition[];
  loading: boolean;
  error: string | null;
  selectedEntityId: string | null;
  selectedEntityType: string | null;
}
```

**Actions:**
- `loadStateHistory` - Load complete state history for an entity
- `loadStateTransitions` - Load state transitions for an entity
- `selectEntity` - Select an entity for visualization
- `clearSelection` - Clear current entity selection

**Selectors:**
- `selectCurrentState` - Get current state of selected entity
- `selectStateTransitions` - Get state transitions
- `selectSortedTransitions` - Get transitions sorted by timestamp

### Services

#### AdminMetricsService
Handles API calls for admin metrics, audit logs, and exports.

**Features:**
- 30-second cache TTL for metrics (Requirement 16.1)
- Audit log filtering with AND logic (Requirement 1.3, 1.4)
- Export functionality for CSV and PDF formats (Requirement 1.5)

**Methods:**
- `loadAdminMetrics(timeRange?)` - Load admin metrics with caching
- `filterAuditLog(filters?)` - Filter audit log entries
- `exportAuditLog(format)` - Export audit log
- `clearCache()` - Clear cached data

#### StateVisualizationService
Handles API calls for state histories, transitions, and diagram exports.

**Methods:**
- `getStateHistory(entityId, entityType)` - Get complete state history
- `getStateTransitions(entityId, entityType, filters?)` - Get state transitions
- `exportStateDiagram(entityId, entityType, format)` - Export state diagram

### Routing

The admin dashboard is lazy-loaded at the `/admin-dashboard` route with authentication guard.

**Available Routes:**

| Route | Component | Description | Phase |
|-------|-----------|-------------|-------|
| `/admin-dashboard/overview` | AdminViewerComponent | Admin dashboard overview with metrics and audit logs | Phase 0 |
| `/admin-dashboard/state-visualization/:entityType/:entityId` | StateVisualizationComponent | State machine visualization for entities | Phase 0 |
| `/admin-dashboard/lifecycle/:entityType/:entityId` | LifecycleManagementComponent | Lifecycle management and state transitions | Phase 1 |
| `/admin-dashboard/workflow-wizard` | WorkflowWizardComponent | Multi-step workflow creation wizard | Phase 2 |
| `/admin-dashboard/workflow-wizard/:workflowType` | WorkflowWizardComponent | Workflow wizard for specific type (job/deployment/custom) | Phase 2 |
| `/admin-dashboard/pipeline/:jobId` | JobProcessingPipelineComponent | Job processing pipeline visualization | Phase 2 |

**Example URLs:**
- Admin Overview: `http://localhost:4200/admin-dashboard/overview`
- State Visualization: `http://localhost:4200/admin-dashboard/state-visualization/job/12345`
- Lifecycle Management: `http://localhost:4200/admin-dashboard/lifecycle/deployment/67890`
- Workflow Wizard: `http://localhost:4200/admin-dashboard/workflow-wizard/job`
- Pipeline View: `http://localhost:4200/admin-dashboard/pipeline/12345`

**Main Route Configuration:**
```typescript
{
  path: 'admin-dashboard',
  loadChildren: () => import('./features/admin-dashboard/admin-dashboard.module')
    .then(m => m.AdminDashboardModule),
  canActivate: [AuthGuard],
  data: { preload: false }
}
```

### Data Models

#### Admin Viewer Models
- `AdminMetrics` - System-wide metrics and statistics
- `SystemHealth` - System health status and service health
- `UserActivity` - User activity tracking
- `AuditLogEntry` - Audit log entry with metadata
- `ResourceUtilization` - CPU, memory, storage, network utilization

#### State Visualization Models
- `StateNode` - Represents a state in the state machine
- `StateTransition` - Represents a transition between states
- `StateHistory` - Complete history of state changes for an entity
- `StateMachineConfig` - Configuration for state machine visualization

## Requirements Mapping

### Phase 0 Requirements

**Requirement 1.1**: Admin viewer displays real-time system metrics
- Implemented via `AdminViewerState` and `AdminMetricsService`

**Requirement 1.2**: Admin viewer retrieves audit log entries
- Implemented via `loadAuditLog` action and `filterAuditLog` service method

**Requirement 2.1**: State visualization renders state machine diagrams
- Infrastructure ready via `StateHistoryState` and `StateVisualizationService`

**Requirement 16.1**: Admin metrics caching with 30-second TTL
- Implemented in `AdminMetricsService` with cache management

## Next Steps

### Phase 0 Remaining Tasks
1. Implement `AdminViewerComponent` (Task 2.1)
2. Implement `StateVisualizationComponent` (Task 3.1)
3. Implement `StateTimelineComponent` (Task 3.2)
4. Write property-based tests for caching and state history ordering
5. Write unit tests for all components and services

### Future Phases
- Phase 1: Role enforcement directives and lifecycle management UI
- Phase 2: Workflow wizard and job processing pipeline
- Phase 3: AI advisory panels and recommendation engine
- Phase 4: Template selector and template engine
- Phase 5: Predictive dashboards and forecasting

## Testing Strategy

### Property-Based Tests
- Property 1: Admin Metrics Caching (Requirement 16.1)
- Property 18: State History Chronological Order (Requirements 2.6, 17.4)

### Unit Tests
- Component tests for user interactions and display logic
- Service tests for API calls and caching behavior
- Reducer tests for state transitions
- Selector tests for data transformations
- Effect tests for side effects and error handling

## Usage

### Importing the Module

The module is lazy-loaded automatically via the routing configuration. No manual imports are required in the main app module.

### Using State in Components

```typescript
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import * as AdminViewerActions from './phase0/state/admin-viewer/admin-viewer.actions';
import * as AdminViewerSelectors from './phase0/state/admin-viewer/admin-viewer.selectors';

export class MyComponent {
  metrics$: Observable<AdminMetrics>;
  
  constructor(private store: Store) {
    this.metrics$ = this.store.select(AdminViewerSelectors.selectAdminMetrics);
  }
  
  ngOnInit() {
    this.store.dispatch(AdminViewerActions.loadAdminMetrics({ timeRange: 'last24hours' }));
  }
}
```

## Architecture Decisions

1. **Feature Module Organization**: Each phase has its own directory structure to maintain clear separation of concerns and enable incremental development.

2. **NgRx State Management**: Using NgRx for centralized state management ensures predictable state updates and enables time-travel debugging.

3. **Lazy Loading**: The admin dashboard is lazy-loaded to reduce initial bundle size and improve application startup performance.

4. **Service Caching**: Implementing caching at the service layer (not NgRx) to maintain cache across component lifecycles while keeping state pure.

5. **Shared Resources**: Common models, services, and components are placed in the `shared` directory to promote reusability across phases.

## Contributing

When adding new features:
1. Follow the established directory structure
2. Create appropriate NgRx state slices with actions, reducers, effects, and selectors
3. Implement services with proper error handling and caching where appropriate
4. Write comprehensive tests (unit and property-based)
5. Update this README with new features and requirements mapping
6. Follow Angular and NgRx best practices

## References

- [Requirements Document](.kiro/specs/frontend-phase-enhancements/requirements.md)
- [Design Document](.kiro/specs/frontend-phase-enhancements/design.md)
- [Tasks Document](.kiro/specs/frontend-phase-enhancements/tasks.md)
