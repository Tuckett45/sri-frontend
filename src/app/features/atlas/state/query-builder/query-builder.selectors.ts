/**
 * Query Builder NgRx Selectors
 * 
 * This module defines selectors for accessing query builder state.
 * Selectors are memoized functions that efficiently derive state.
 * 
 * Requirements: 3.8, 11.3
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { QueryBuilderState, queryTemplateAdapter } from './query-builder.state';
import { QueryTemplate } from '../../models/query-builder.model';

/**
 * Feature selector for query builder state
 */
export const selectQueryBuilderState = createFeatureSelector<QueryBuilderState>('queryBuilder');

/**
 * Entity selectors from adapter
 */
const {
  selectIds: selectTemplateIds,
  selectEntities: selectTemplateEntities,
  selectAll: selectAllTemplates,
  selectTotal: selectTotalTemplates
} = queryTemplateAdapter.getSelectors(selectQueryBuilderState);

export { selectTemplateIds, selectTemplateEntities, selectAllTemplates, selectTotalTemplates };

/**
 * Data Sources Selectors
 */

/** Select all data sources */
export const selectDataSources = createSelector(
  selectQueryBuilderState,
  (state: QueryBuilderState) => state.dataSources
);

/** Select data sources loading state */
export const selectDataSourcesLoading = createSelector(
  selectQueryBuilderState,
  (state: QueryBuilderState) => state.loading.dataSources
);

/** Select data sources error */
export const selectDataSourcesError = createSelector(
  selectQueryBuilderState,
  (state: QueryBuilderState) => state.error.dataSources
);

/**
 * Fields Selectors
 */

/** Select fields for current data source */
export const selectFields = createSelector(
  selectQueryBuilderState,
  (state: QueryBuilderState) => state.fields
);

/** Select fields loading state */
export const selectFieldsLoading = createSelector(
  selectQueryBuilderState,
  (state: QueryBuilderState) => state.loading.fields
);

/** Select fields error */
export const selectFieldsError = createSelector(
  selectQueryBuilderState,
  (state: QueryBuilderState) => state.error.fields
);

/** Select currently selected data source ID */
export const selectSelectedDataSource = createSelector(
  selectQueryBuilderState,
  (state: QueryBuilderState) => state.selectedDataSource
);

/** Select currently selected data source details */
export const selectSelectedDataSourceDetails = createSelector(
  selectDataSources,
  selectSelectedDataSource,
  (dataSources, selectedId) => 
    selectedId ? dataSources.find(ds => ds.id === selectedId) : null
);

/**
 * Query Execution Selectors
 */

/** Select current query being built */
export const selectCurrentQuery = createSelector(
  selectQueryBuilderState,
  (state: QueryBuilderState) => state.currentQuery
);

/** Select query result */
export const selectQueryResult = createSelector(
  selectQueryBuilderState,
  (state: QueryBuilderState) => state.queryResult
);

/** Select query executing state */
export const selectQueryExecuting = createSelector(
  selectQueryBuilderState,
  (state: QueryBuilderState) => state.loading.executing
);

/** Select query execution error */
export const selectQueryExecutionError = createSelector(
  selectQueryBuilderState,
  (state: QueryBuilderState) => state.error.executing
);

/** Select last execution timestamp */
export const selectLastExecuted = createSelector(
  selectQueryBuilderState,
  (state: QueryBuilderState) => state.lastExecuted
);

/**
 * Export Selectors
 */

/** Select export loading state */
export const selectExporting = createSelector(
  selectQueryBuilderState,
  (state: QueryBuilderState) => state.loading.exporting
);

/** Select export error */
export const selectExportError = createSelector(
  selectQueryBuilderState,
  (state: QueryBuilderState) => state.error.exporting
);

/**
 * Template Selectors
 */

/** Select templates loading state */
export const selectTemplatesLoading = createSelector(
  selectQueryBuilderState,
  (state: QueryBuilderState) => state.loading.templates
);

/** Select templates error */
export const selectTemplatesError = createSelector(
  selectQueryBuilderState,
  (state: QueryBuilderState) => state.error.templates
);

/** Select last templates loaded timestamp */
export const selectLastTemplatesLoaded = createSelector(
  selectQueryBuilderState,
  (state: QueryBuilderState) => state.lastTemplatesLoaded
);

/** Select currently selected template ID */
export const selectSelectedTemplateId = createSelector(
  selectQueryBuilderState,
  (state: QueryBuilderState) => state.selectedTemplateId
);

/** Select currently selected template detail */
export const selectSelectedTemplateDetail = createSelector(
  selectQueryBuilderState,
  (state: QueryBuilderState) => state.selectedTemplateDetail
);

/** Select template detail loading state */
export const selectTemplateDetailLoading = createSelector(
  selectQueryBuilderState,
  (state: QueryBuilderState) => state.loading.templateDetail
);

/** Select template detail error */
export const selectTemplateDetailError = createSelector(
  selectQueryBuilderState,
  (state: QueryBuilderState) => state.error.templateDetail
);

/** Select template creating state */
export const selectTemplateCreating = createSelector(
  selectQueryBuilderState,
  (state: QueryBuilderState) => state.loading.creatingTemplate
);

/** Select template creation error */
export const selectTemplateCreationError = createSelector(
  selectQueryBuilderState,
  (state: QueryBuilderState) => state.error.creatingTemplate
);

/** Select template deleting state */
export const selectTemplateDeleting = createSelector(
  selectQueryBuilderState,
  (state: QueryBuilderState) => state.loading.deletingTemplate
);

/** Select template deletion error */
export const selectTemplateDeletionError = createSelector(
  selectQueryBuilderState,
  (state: QueryBuilderState) => state.error.deletingTemplate
);

/** Select template executing state */
export const selectTemplateExecuting = createSelector(
  selectQueryBuilderState,
  (state: QueryBuilderState) => state.loading.executingTemplate
);

/** Select template execution error */
export const selectTemplateExecutionError = createSelector(
  selectQueryBuilderState,
  (state: QueryBuilderState) => state.error.executingTemplate
);

/**
 * Derived Selectors
 */

/** Select public templates only */
export const selectPublicTemplates = createSelector(
  selectAllTemplates,
  (templates: QueryTemplate[]) => templates.filter(template => template.isPublic)
);

/** Select private templates only */
export const selectPrivateTemplates = createSelector(
  selectAllTemplates,
  (templates: QueryTemplate[]) => templates.filter(template => !template.isPublic)
);

/** Select templates by data source */
export const selectTemplatesByDataSource = (dataSourceId: string) => createSelector(
  selectAllTemplates,
  (templates: QueryTemplate[]) => templates.filter(template => template.dataSource === dataSourceId)
);

/** Select filterable fields */
export const selectFilterableFields = createSelector(
  selectFields,
  (fields) => fields.filter(field => field.isFilterable)
);

/** Select sortable fields */
export const selectSortableFields = createSelector(
  selectFields,
  (fields) => fields.filter(field => field.isSortable)
);

/** Select whether query has results */
export const selectHasQueryResults = createSelector(
  selectQueryResult,
  (result) => !!(result !== null && result.rows && result.rows.length > 0)
);

/** Select query result row count */
export const selectQueryResultRowCount = createSelector(
  selectQueryResult,
  (result) => result?.totalRows || 0
);

/** Select whether results are from cache */
export const selectResultsFromCache = createSelector(
  selectQueryResult,
  (result) => result?.fromCache || false
);

/** Select query execution time */
export const selectQueryExecutionTime = createSelector(
  selectQueryResult,
  (result) => result?.executionTimeMs || 0
);

/**
 * Loading State Selectors
 */

/** Select overall loading state (any operation in progress) */
export const selectIsLoading = createSelector(
  selectQueryBuilderState,
  (state: QueryBuilderState) => 
    Object.values(state.loading).some(loading => loading === true)
);

/** Select whether any error exists */
export const selectHasError = createSelector(
  selectQueryBuilderState,
  (state: QueryBuilderState) => 
    Object.values(state.error).some(error => error !== null)
);
