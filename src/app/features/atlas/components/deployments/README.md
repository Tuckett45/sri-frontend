# Deployment Components

This directory contains Angular components for managing ATLAS deployments.

## Components

### DeploymentListComponent

**Purpose**: Displays a paginated, filterable, sortable table of deployments.

**Features**:
- Paginated table using PrimeNG p-table
- Filtering by state and type
- Search by title or ID
- Sorting by creation date, updated date, title
- Navigation to detail view on row click
- Create new deployment button
- Loading spinner during data fetch
- Error message with retry option
- Empty state when no deployments found
- Responsive design for mobile devices

**Usage**:
```typescript
import { DeploymentListComponent } from './components/deployments/deployment-list.component';

// In your routing module
{
  path: 'deployments',
  component: DeploymentListComponent
}
```

**NgRx Integration**:
- Subscribes to: `selectAllDeployments`, `selectDeploymentsLoading`, `selectDeploymentsError`, `selectDeploymentPagination`, `selectDeploymentFilters`
- Dispatches: `loadDeployments`, `setDeploymentFilters`, `clearDeploymentFilters`, `selectDeployment`

**Requirements Satisfied**:
- 7.1: UI components follow ARK design patterns
- 7.2: Display data in responsive tables with sorting and filtering
- 7.3: Display loading spinner when loading
- 7.4: Display error message with retry option
- 7.9: Support pagination for large datasets
- 3.11: Connect to NgRx store

## File Structure

```
deployments/
├── deployment-list.component.ts       # Component logic
├── deployment-list.component.html     # Component template
├── deployment-list.component.scss     # Component styles
├── deployment-list.component.spec.ts  # Unit tests
└── README.md                          # This file
```

## Styling

The component uses ATLAS design system variables and follows ARK styling patterns:
- Uses CSS custom properties for theming
- Responsive breakpoints at 768px
- Print-friendly styles
- Consistent spacing and typography

## Testing

Run tests with:
```bash
npm test -- --include='**/deployment-list.component.spec.ts'
```

## Future Components

Additional deployment components to be implemented:
- `DeploymentDetailComponent` - Display detailed deployment information
- `DeploymentFormComponent` - Create/edit deployment form
- `DeploymentTimelineComponent` - State transition timeline
- `DeploymentEvidenceComponent` - Evidence management
