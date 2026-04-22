# Query Builder Components

This directory contains the query builder components for the ATLAS feature module. These components provide a comprehensive interface for building, executing, and managing database queries.

## Components

### QueryBuilderComponent

**Purpose**: Dynamic query builder UI with field selection, operator selection, value input, filter groups with logical operators, and sort criteria configuration.

**Features**:
- Data source selection
- Dynamic filter creation with field, operator, and value inputs
- Logical operators (AND/OR) for combining filters
- Sort criteria configuration
- Query execution
- Form validation

**Requirements**: 7.1, 7.2, 7.5

**Usage**:
```typescript
import { QueryBuilderComponent } from './query-builder.component';

// In template
<app-query-builder></app-query-builder>
```

### QueryResultsComponent

**Purpose**: Display query results in a table with virtual scrolling and export functionality.

**Features**:
- Virtual scrolling for large datasets
- Export to CSV, JSON, and Excel formats
- Results metadata display (row count, execution time, cache status)
- Sortable columns
- Responsive table design

**Requirements**: 7.1, 7.2, 11.6

**Usage**:
```typescript
import { QueryResultsComponent } from './query-results.component';

// In template
<app-query-results></app-query-results>
```

### QueryTemplateComponent

**Purpose**: Display saved query templates, template execution with parameter input, and template management (create, delete).

**Features**:
- Template list with pagination
- Create new templates
- Execute templates with parameter input
- Delete templates with confirmation
- Public/private template visibility
- Template detail view

**Requirements**: 7.1, 7.2, 7.5

**Usage**:
```typescript
import { QueryTemplateComponent } from './query-template.component';

// In template
<app-query-template></app-query-template>
```

### QueryBuilderPageComponent

**Purpose**: Main page component that combines all query builder components into a cohesive interface with tabbed navigation.

**Features**:
- Tabbed interface for query building, results, and templates
- Responsive layout
- Consistent ATLAS branding

**Requirements**: 3.11

**Usage**:
```typescript
import { QueryBuilderPageComponent } from './query-builder-page.component';

// In template
<app-query-builder-page></app-query-builder-page>
```

## State Management

All components are connected to the NgRx store for state management:

### Actions Dispatched
- `loadDataSources` - Load available data sources
- `loadFields` - Load fields for selected data source
- `executeQuery` - Execute user-defined query
- `exportResults` - Export query results
- `loadTemplates` - Load query templates
- `createTemplate` - Create new template
- `deleteTemplate` - Delete template
- `executeTemplate` - Execute template with parameters
- `selectDataSource` - Select data source
- `selectTemplate` - Select template
- `clearQueryResult` - Clear query results

### Selectors Used
- `selectDataSources` - Get available data sources
- `selectFields` - Get fields for current data source
- `selectFilterableFields` - Get filterable fields
- `selectSortableFields` - Get sortable fields
- `selectQueryResult` - Get query execution results
- `selectAllTemplates` - Get all templates
- `selectPublicTemplates` - Get public templates
- `selectPrivateTemplates` - Get private templates
- Loading and error selectors for each operation

## Styling

All components follow the ATLAS design system:
- Primary color: #1E5A8E (ATLAS Blue)
- Responsive design with mobile breakpoints
- Consistent spacing and typography
- PrimeNG component styling

## Testing

Each component has comprehensive unit tests:
- Component creation
- Form validation
- Action dispatching
- State subscriptions
- User interactions
- Edge cases

Run tests:
```bash
npm test -- query-builder
```

## Dependencies

### Angular
- @angular/common
- @angular/forms (ReactiveFormsModule)

### NgRx
- @ngrx/store
- @ngrx/effects

### PrimeNG
- p-dropdown
- p-table
- p-button
- p-card
- p-dialog
- p-checkbox
- p-inputtext
- p-inputtextarea
- p-tabview
- p-tag
- p-menu
- p-confirmDialog
- p-progressSpinner
- p-tooltip

## File Structure

```
query-builder/
├── query-builder.component.ts          # Query builder form
├── query-builder.component.html
├── query-builder.component.scss
├── query-builder.component.spec.ts
├── query-results.component.ts          # Results display
├── query-results.component.html
├── query-results.component.scss
├── query-results.component.spec.ts
├── query-template.component.ts         # Template management
├── query-template.component.html
├── query-template.component.scss
├── query-template.component.spec.ts
├── query-builder-page.component.ts     # Main page
├── query-builder-page.component.html
├── query-builder-page.component.scss
├── query-builder-page.component.spec.ts
├── index.ts                            # Barrel export
└── README.md                           # This file
```

## Integration

To integrate the query builder into the ATLAS module:

1. Import the page component in your routing module:
```typescript
import { QueryBuilderPageComponent } from './components/query-builder';

const routes: Routes = [
  {
    path: 'query-builder',
    component: QueryBuilderPageComponent
  }
];
```

2. Ensure the query builder state is registered in the ATLAS module:
```typescript
StoreModule.forFeature('queryBuilder', queryBuilderReducer),
EffectsModule.forFeature([QueryBuilderEffects])
```

3. Add navigation link:
```html
<a routerLink="/atlas/query-builder">Query Builder</a>
```

## Future Enhancements

Potential improvements for future iterations:
- Query history tracking
- Saved query favorites
- Query sharing between users
- Advanced filter grouping
- Query validation before execution
- Query performance metrics
- Template versioning
- Template import/export
- Custom field formatters
- Query result visualization (charts/graphs)
