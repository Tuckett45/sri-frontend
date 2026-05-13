# Admin Dashboard Navigation Guide

## Overview

The Admin Dashboard Phase Enhancements are now fully wired up and accessible in the application. All completed components from Phases 0-3 are available through the routing system.

## How to Access

### Via Navigation Bar

For Admin users, a new "Phase Dashboard" link appears in the navigation bar that takes you to `/admin-dashboard/overview`.

### Direct URLs

You can navigate directly to any of these URLs (requires authentication and Admin role):

| URL | Component | Description | Status |
|-----|-----------|-------------|--------|
| `/admin-dashboard/overview` | AdminViewerComponent | System metrics, audit logs, active users, health monitoring | ✅ Complete |
| `/admin-dashboard/state-visualization/job/12345` | StateVisualizationComponent | D3.js state machine diagram for jobs | ✅ Complete |
| `/admin-dashboard/state-visualization/deployment/67890` | StateVisualizationComponent | D3.js state machine diagram for deployments | ✅ Complete |
| `/admin-dashboard/lifecycle/job/12345` | LifecycleManagementComponent | Lifecycle state transitions and approvals | ✅ Complete |
| `/admin-dashboard/lifecycle/deployment/67890` | LifecycleManagementComponent | Lifecycle management for deployments | ✅ Complete |
| `/admin-dashboard/workflow-wizard` | WorkflowWizardComponent | Multi-step workflow creation wizard | ✅ Complete |
| `/admin-dashboard/workflow-wizard/job` | WorkflowWizardComponent | Job-specific workflow wizard | ✅ Complete |
| `/admin-dashboard/workflow-wizard/deployment` | WorkflowWizardComponent | Deployment-specific workflow wizard | ✅ Complete |
| `/admin-dashboard/pipeline/12345` | JobProcessingPipelineComponent | Job processing pipeline with stage execution | ✅ Complete |

## What's Implemented

### Phase 0: Foundation ✅
- **AdminViewerComponent**: Displays system metrics, audit logs, user activities, and system health
- **StateVisualizationComponent**: Interactive D3.js state machine diagrams with transition highlighting
- **StateTimelineComponent**: Chronological timeline of state transitions
- **NgRx State**: Complete state management for admin viewer and state history
- **Services**: AdminMetricsService with 30-second caching, StateVisualizationService

### Phase 1: Role Enforcement ✅
- **LifecycleManagementComponent**: Current state display, available transitions, approval workflows
- **StateTransitionControlsComponent**: Reusable transition control panel with validation
- **RoleEnforcementDirective**: Hide/disable enforcement with AND/OR role logic (available globally)
- **PermissionService**: checkPermission with condition evaluation
- **NgRx State**: Complete lifecycle transitions state management
- **Services**: LifecycleService with validation and audit logging

### Phase 2: Workflow UI ✅
- **WorkflowWizardComponent**: Multi-step wizard with navigation, validation, draft save/load
- **JobProcessingPipelineComponent**: Pipeline visualization with stage execution, retry, skip
- **ValidationEngineService**: Schema validation, business rules, custom validators
- **PipelineExecutionService**: Stage execution with dependency checking
- **NgRx State**: Complete workflow wizard state management

### Phase 3: AI Advisory ✅
- **RecommendationEngineService**: AI recommendations with 5-minute caching, feedback tracking
- **NgRx State**: Complete AI recommendations state management
- **Note**: UI components (AIAdvisoryPanelComponent, InsightsDisplayComponent) are partially complete

### Phase 4: Templates 🚧
- Services and state management are implemented
- UI components are partially complete

### Phase 5: Predictive Dashboards 🚧
- Services and state management are implemented
- UI components are partially complete

## Module Configuration

The admin dashboard is configured as a lazy-loaded feature module:

```typescript
// In app-routing.module.ts
{ 
  path: 'admin-dashboard', 
  loadChildren: () => import('./features/admin-dashboard/admin-dashboard.module')
    .then(m => m.AdminDashboardModule), 
  canActivate: [AuthGuard],
  data: { preload: false }
}
```

All components are declared in `AdminDashboardModule` with their respective:
- NgRx state slices (reducers, effects, actions, selectors)
- Services (with HTTP integration ready for backend)
- Models and interfaces

## Testing the Components

### 1. Admin Viewer
Navigate to `/admin-dashboard/overview` to see:
- System metrics dashboard
- Active users list
- System health indicators
- Audit log with filtering
- Auto-refresh functionality

### 2. State Visualization
Navigate to `/admin-dashboard/state-visualization/job/123` to see:
- Interactive state machine diagram (D3.js)
- Current state highlighting
- Transition arrows
- State timeline below the diagram

### 3. Lifecycle Management
Navigate to `/admin-dashboard/lifecycle/job/123` to see:
- Current state display
- Available transitions
- Transition controls with reason input
- Approval workflow UI
- Transition history

### 4. Workflow Wizard
Navigate to `/admin-dashboard/workflow-wizard/job` to see:
- Multi-step wizard interface
- Step navigation (next, previous, jump to step)
- Progress indicator
- Step validation
- Draft save/load functionality

### 5. Job Processing Pipeline
Navigate to `/admin-dashboard/pipeline/123` to see:
- Pipeline stage visualization
- Stage execution controls
- Stage results and errors
- Retry and skip functionality

## Known Limitations

### Backend Integration
All services are implemented with proper HTTP methods and endpoints, but they currently use mock data or placeholder responses. The backend API endpoints need to be implemented to provide real data.

### Testing
- Unit tests are partially complete
- Property-based tests are not yet implemented
- Integration tests are not yet implemented

### Phase 3-5 UI
While the services and state management are complete for Phases 3-5, some UI components are only partially implemented:
- AIAdvisoryPanelComponent (Phase 3)
- InsightsDisplayComponent (Phase 3)
- TemplateSelectorComponent (Phase 4)
- ConfigurationManagerComponent (Phase 4)
- PredictiveDashboardComponent (Phase 5)
- TrendAnalysisComponent (Phase 5)

## Next Steps

1. **Backend Integration**: Connect services to real API endpoints
2. **Complete Phase 3-5 UI**: Finish implementing remaining UI components
3. **Testing**: Write comprehensive unit, property-based, and integration tests
4. **Real Data**: Replace mock data with actual backend responses
5. **Error Handling**: Test and refine error handling with real API errors
6. **Performance**: Optimize caching and rendering for production use

## Troubleshooting

### "Cannot access route"
- Ensure you're logged in as an Admin user
- Check that the AuthGuard is allowing access
- Verify the route path is correct

### "Component not displaying"
- Check browser console for errors
- Verify NgRx state is initialized
- Check that services are provided in the module

### "No data showing"
- Services are using mock data until backend is connected
- Check NgRx DevTools to see if state is being populated
- Verify effects are dispatching success actions

## Resources

- [Requirements](.kiro/specs/frontend-phase-enhancements/requirements.md)
- [Design](.kiro/specs/frontend-phase-enhancements/design.md)
- [Tasks](.kiro/specs/frontend-phase-enhancements/tasks.md)
- [Module README](../src/app/features/admin-dashboard/README.md)
