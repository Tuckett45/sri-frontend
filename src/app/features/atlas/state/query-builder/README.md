# Query Builder State Management

This directory contains the NgRx state management implementation for the ATLAS Query Builder feature.

## Overview

The Query Builder state manages:
- Available data sources and their fields
- Current query being built
- Query execution results
- Query templates (saved queries)
- Export operations
- Loading and error states

## Architecture

### State Structure

```typescript
interface QueryBuilderState {
  // Data sources and fields
  dataSources: DataSourceInfo[];
  fields: FieldConfig[];
  selectedDataSource: string | null;
  
  // Query building
  currentQuery: UserQuery | null;
  queryResult: QueryResult | null;
  
  // Templates (managed by Entity adapter)
  entities: { [id: string]: QueryTemplate };
  ids: string[];
  selectedTemplateId: string | null;
  selectedTemplateDetail: QueryTemplate | null;
  
  // Loading and error states
  loading: LoadingState;
  error: ErrorState;
  
  // Timestamps
  lastExecuted: number | null;
  lastTemplatesLoaded: number | null;
}
```

### Actions

**Data Sources:**
- `loadDataSources` - Load available data sources
- `loadDataSourcesSuccess` - Data sources loaded
- `loadDataSourcesFailure` - Failed to load data sources

**Fields:**
- `loadFields` - Load fields for a data source
- `loadFieldsSuccess` - Fields loaded
- `loadFieldsFailure` - Failed to load fields

**Query Execution:**
- `setCurrentQuery` - Set the query being built
- `clearCurrentQuery` - Clear current query
- `executeQuery` - Execute a query
- `executeQuerySuccess` - Query executed successfully
- `executeQueryFailure` - Query execution failed
- `clearQueryResult` - Clear query results

**Export:**
- `exportResults` - Export query results
- `exportResultsSuccess` - Export completed
- `exportResultsFailure` - Export failed

**Templates:**
- `loadTemplates` - Load all templates
- `loadTemplatesSuccess` - Templates loaded
- `loadTemplatesFailure` - Failed to load templates
- `loadTemplateDetail` - Load specific template
- `loadTemplateDetailSuccess` - Template detail loaded
- `loadTemplateDetailFailure` - Failed to load template detail
- `createTemplate` - Create new template
- `createTemplateSuccess` - Template created
- `createTemplateFailure` - Failed to create template
- `deleteTemplate` - Delete template
- `deleteTemplateSuccess` - Template deleted
- `deleteTemplateFailure` - Failed to delete template
- `executeTemplate` - Execute template with parameters
- `executeTemplateSuccess` - Template executed
- `executeTemplateFailure` - Template execution failed

**Selection:**
- `selectTemplate` - Select a template
- `selectDataSource` - Select a data source

### Effects

All effects follow the pattern:
1. Listen for action
2. Call service method
3. Dispatch success/failure action
4. Handle errors gracefully

Special handling:
- **Export effect**: Triggers browser download after successful export
- **Template execution**: Updates query result like regular query execution

### Selectors

**Data Sources:**
- `selectDataSources` - All data sources
- `selectDataSourcesLoading` - Loading state
- `selectDataSourcesError` - Error state
- `selectSelectedDataSource` - Selected data source ID
- `selectSelectedDataSourceDetails` - Selected data source details

**Fields:**
- `selectFields` - All fields for current data source
- `selectFieldsLoading` - Loading state
- `selectFieldsError` - Error state
- `selectFilterableFields` - Fields that can be filtered
- `selectSortableFields` - Fields that can be sorted

**Query Execution:**
- `selectCurrentQuery` - Current query being built
- `selectQueryResult` - Query execution result
- `selectQueryExecuting` - Executing state
- `selectQueryExecutionError` - Execution error
- `selectLastExecuted` - Last execution timestamp
- `selectHasQueryResults` - Whether results exist
- `selectQueryResultRowCount` - Number of result rows
- `selectResultsFromCache` - Whether results are cached
- `selectQueryExecutionTime` - Execution time in ms

**Export:**
- `selectExporting` - Export in progress
- `selectExportError` - Export error

**Templates:**
- `selectAllTemplates` - All templates
- `selectTemplateIds` - Template IDs
- `selectTemplateEntities` - Template entities map
- `selectTotalTemplates` - Total template count
- `selectTemplatesLoading` - Loading state
- `selectTemplatesError` - Error state
- `selectPublicTemplates` - Public templates only
- `selectPrivateTemplates` - Private templates only
- `selectTemplatesByDataSource(id)` - Templates for specific data source
- `selectSelectedTemplateId` - Selected template ID
- `selectSelectedTemplateDetail` - Selected template details
- `selectTemplateDetailLoading` - Detail loading state
- `selectTemplateDetailError` - Detail error state

**Overall State:**
- `selectIsLoading` - Any operation in progress
- `selectHasError` - Any error exists

## Usage Examples

### Component Usage

```typescript
import { Component, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import * as QueryBuilderActions from './state/query-builder/query-builder.actions';
import * as QueryBuilderSelectors from './state/query-builder/query-builder.selectors';

@Component({
  selector: 'app-query-builder',
  template: `
    <div *ngIf="dataSources$ | async as dataSources">
      <select (change)="onDataSourceChange($event)">
        <option *ngFor="let ds of dataSources" [value]="ds.id">
          {{ ds.name }}
        </option>
      </select>
    </div>
    
    <div *ngIf="fields$ | async as fields">
      <!-- Query builder UI -->
    </div>
    
    <button (click)="executeQuery()" [disabled]="executing$ | async">
      Execute Query
    </button>
    
    <div *ngIf="result$ | async as result">
      <table>
        <!-- Display results -->
      </table>
      <button (click)="exportResults('CSV')">Export CSV</button>
    </div>
  `
})
export class QueryBuilderComponent implements OnInit {
  dataSources$ = this.store.select(QueryBuilderSelectors.selectDataSources);
  fields$ = this.store.select(QueryBuilderSelectors.selectFields);
  result$ = this.store.select(QueryBuilderSelectors.selectQueryResult);
  executing$ = this.store.select(QueryBuilderSelectors.selectQueryExecuting);
  
  constructor(private store: Store) {}
  
  ngOnInit() {
    this.store.dispatch(QueryBuilderActions.loadDataSources());
  }
  
  onDataSourceChange(event: Event) {
    const dataSourceId = (event.target as HTMLSelectElement).value;
    this.store.dispatch(QueryBuilderActions.loadFields({ dataSourceId }));
  }
  
  executeQuery() {
    const query = this.buildQuery(); // Build query from UI
    this.store.dispatch(QueryBuilderActions.executeQuery({ query }));
  }
  
  exportResults(format: 'CSV' | 'JSON' | 'Excel') {
    this.result$.subscribe(result => {
      if (result) {
        this.store.dispatch(QueryBuilderActions.exportResults({
          result,
          format,
          fileName: 'query-results'
        }));
      }
    }).unsubscribe();
  }
}
```

### Template Management

```typescript
// Load templates
this.store.dispatch(QueryBuilderActions.loadTemplates());

// Create template
this.store.dispatch(QueryBuilderActions.createTemplate({
  request: {
    name: 'My Query',
    description: 'Description',
    dataSource: 'deployments',
    sqlTemplate: 'SELECT * FROM deployments WHERE status = @status',
    parameters: [
      { name: 'status', displayName: 'Status', dataType: 'string', isRequired: true }
    ],
    isPublic: false
  }
}));

// Execute template
this.store.dispatch(QueryBuilderActions.executeTemplate({
  templateId: 'template-123',
  request: {
    parameters: { status: 'ACTIVE' }
  }
}));

// Delete template
this.store.dispatch(QueryBuilderActions.deleteTemplate({
  templateId: 'template-123'
}));
```

## Requirements Mapping

- **3.1**: NgRx Store for state management
- **3.2**: Actions for all state mutations
- **3.3**: Pure, immutable reducers
- **3.4**: Effects for async operations
- **3.5**: Loading actions dispatched
- **3.6**: Success actions with data
- **3.7**: Failure actions with errors
- **3.8**: Memoized selectors
- **3.9**: Separate state slices
- **11.3**: Selector memoization for performance

## Testing

Each file has corresponding test coverage:
- State structure validation
- Action creators
- Reducer state transitions
- Effect API interactions
- Selector memoization and derivation

## Related Files

- **Service**: `src/app/features/atlas/services/query-builder.service.ts`
- **Models**: `src/app/features/atlas/models/query-builder.model.ts`
- **Components**: `src/app/features/atlas/components/query-builder/`
