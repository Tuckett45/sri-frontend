/**
 * Query Builder NgRx State Management
 * 
 * This module defines the state structure for query builder management in the ATLAS feature.
 * It uses NgRx for predictable state management with entities, loading states, errors,
 * query results, and templates.
 * 
 * Requirements: 3.1, 3.9
 */

import { EntityState, EntityAdapter, createEntityAdapter } from '@ngrx/entity';
import {
  DataSourceInfo,
  FieldConfig,
  UserQuery,
  QueryResult,
  QueryTemplate,
  ExportFormat
} from '../../models/query-builder.model';

/**
 * Loading state for different operations
 */
export interface LoadingState {
  /** Loading data sources */
  dataSources: boolean;
  
  /** Loading fields for a data source */
  fields: boolean;
  
  /** Executing query */
  executing: boolean;
  
  /** Exporting results */
  exporting: boolean;
  
  /** Loading templates */
  templates: boolean;
  
  /** Loading template detail */
  templateDetail: boolean;
  
  /** Creating template */
  creatingTemplate: boolean;
  
  /** Deleting template */
  deletingTemplate: boolean;
  
  /** Executing template */
  executingTemplate: boolean;
}

/**
 * Error state for different operations
 */
export interface ErrorState {
  /** Error loading data sources */
  dataSources: string | null;
  
  /** Error loading fields */
  fields: string | null;
  
  /** Error executing query */
  executing: string | null;
  
  /** Error exporting results */
  exporting: string | null;
  
  /** Error loading templates */
  templates: string | null;
  
  /** Error loading template detail */
  templateDetail: string | null;
  
  /** Error creating template */
  creatingTemplate: string | null;
  
  /** Error deleting template */
  deletingTemplate: string | null;
  
  /** Error executing template */
  executingTemplate: string | null;
}

/**
 * Query Builder state interface
 * 
 * Manages query templates using NgRx Entity for normalized storage,
 * along with loading states, errors, data sources, fields, and query results.
 */
export interface QueryBuilderState extends EntityState<QueryTemplate> {
  /** Available data sources */
  dataSources: DataSourceInfo[];
  
  /** Fields for currently selected data source */
  fields: FieldConfig[];
  
  /** Currently selected data source ID */
  selectedDataSource: string | null;
  
  /** Current query being built */
  currentQuery: UserQuery | null;
  
  /** Most recent query result */
  queryResult: QueryResult | null;
  
  /** Currently selected template ID */
  selectedTemplateId: string | null;
  
  /** Detailed template data (separate from entity list) */
  selectedTemplateDetail: QueryTemplate | null;
  
  /** Loading states for various operations */
  loading: LoadingState;
  
  /** Error states for various operations */
  error: ErrorState;
  
  /** Timestamp of last successful query execution */
  lastExecuted: number | null;
  
  /** Timestamp of last successful template load */
  lastTemplatesLoaded: number | null;
}

/**
 * Entity adapter for query template management
 * Provides methods for CRUD operations on the entity collection
 */
export const queryTemplateAdapter: EntityAdapter<QueryTemplate> = createEntityAdapter<QueryTemplate>({
  selectId: (template: QueryTemplate) => template.id || '',
  sortComparer: (a: QueryTemplate, b: QueryTemplate) => {
    // Sort by modifiedAt descending (most recent first)
    const aDate = a.modifiedAt ? new Date(a.modifiedAt).getTime() : 0;
    const bDate = b.modifiedAt ? new Date(b.modifiedAt).getTime() : 0;
    return bDate - aDate;
  }
});

/**
 * Initial loading state
 */
const initialLoadingState: LoadingState = {
  dataSources: false,
  fields: false,
  executing: false,
  exporting: false,
  templates: false,
  templateDetail: false,
  creatingTemplate: false,
  deletingTemplate: false,
  executingTemplate: false
};

/**
 * Initial error state
 */
const initialErrorState: ErrorState = {
  dataSources: null,
  fields: null,
  executing: null,
  exporting: null,
  templates: null,
  templateDetail: null,
  creatingTemplate: null,
  deletingTemplate: null,
  executingTemplate: null
};

/**
 * Initial query builder state
 * 
 * Provides the default state structure with empty entities,
 * no selection, no loading, no errors, and empty data sources.
 */
export const initialQueryBuilderState: QueryBuilderState = queryTemplateAdapter.getInitialState({
  dataSources: [],
  fields: [],
  selectedDataSource: null,
  currentQuery: null,
  queryResult: null,
  selectedTemplateId: null,
  selectedTemplateDetail: null,
  loading: initialLoadingState,
  error: initialErrorState,
  lastExecuted: null,
  lastTemplatesLoaded: null
});
