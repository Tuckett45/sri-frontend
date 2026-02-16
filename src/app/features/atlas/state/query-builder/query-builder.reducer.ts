/**
 * Query Builder NgRx Reducer
 * 
 * This module defines the reducer for query builder state management.
 * Reducers handle state transitions in a pure, immutable manner.
 * 
 * Requirements: 3.3
 */

import { createReducer, on } from '@ngrx/store';
import { QueryBuilderState, initialQueryBuilderState, queryTemplateAdapter } from './query-builder.state';
import * as QueryBuilderActions from './query-builder.actions';

/**
 * Query Builder reducer
 * 
 * Handles all query builder actions and produces new state immutably.
 * Uses NgRx Entity adapter for template entity management.
 */
export const queryBuilderReducer = createReducer(
  initialQueryBuilderState,

  /**
   * Data Sources Actions
   */
  on(QueryBuilderActions.loadDataSources, (state): QueryBuilderState => ({
    ...state,
    loading: { ...state.loading, dataSources: true },
    error: { ...state.error, dataSources: null }
  })),

  on(QueryBuilderActions.loadDataSourcesSuccess, (state, { dataSources }): QueryBuilderState => ({
    ...state,
    dataSources,
    loading: { ...state.loading, dataSources: false }
  })),

  on(QueryBuilderActions.loadDataSourcesFailure, (state, { error }): QueryBuilderState => ({
    ...state,
    loading: { ...state.loading, dataSources: false },
    error: { ...state.error, dataSources: error }
  })),

  /**
   * Fields Actions
   */
  on(QueryBuilderActions.loadFields, (state, { dataSourceId }): QueryBuilderState => ({
    ...state,
    selectedDataSource: dataSourceId,
    loading: { ...state.loading, fields: true },
    error: { ...state.error, fields: null }
  })),

  on(QueryBuilderActions.loadFieldsSuccess, (state, { fields }): QueryBuilderState => ({
    ...state,
    fields,
    loading: { ...state.loading, fields: false }
  })),

  on(QueryBuilderActions.loadFieldsFailure, (state, { error }): QueryBuilderState => ({
    ...state,
    loading: { ...state.loading, fields: false },
    error: { ...state.error, fields: error }
  })),

  /**
   * Query Execution Actions
   */
  on(QueryBuilderActions.setCurrentQuery, (state, { query }): QueryBuilderState => ({
    ...state,
    currentQuery: query
  })),

  on(QueryBuilderActions.clearCurrentQuery, (state): QueryBuilderState => ({
    ...state,
    currentQuery: null
  })),

  on(QueryBuilderActions.executeQuery, (state): QueryBuilderState => ({
    ...state,
    loading: { ...state.loading, executing: true },
    error: { ...state.error, executing: null }
  })),

  on(QueryBuilderActions.executeQuerySuccess, (state, { result }): QueryBuilderState => ({
    ...state,
    queryResult: result,
    loading: { ...state.loading, executing: false },
    lastExecuted: Date.now()
  })),

  on(QueryBuilderActions.executeQueryFailure, (state, { error }): QueryBuilderState => ({
    ...state,
    loading: { ...state.loading, executing: false },
    error: { ...state.error, executing: error }
  })),

  on(QueryBuilderActions.clearQueryResult, (state): QueryBuilderState => ({
    ...state,
    queryResult: null
  })),

  /**
   * Export Actions
   */
  on(QueryBuilderActions.exportResults, (state): QueryBuilderState => ({
    ...state,
    loading: { ...state.loading, exporting: true },
    error: { ...state.error, exporting: null }
  })),

  on(QueryBuilderActions.exportResultsSuccess, (state): QueryBuilderState => ({
    ...state,
    loading: { ...state.loading, exporting: false }
  })),

  on(QueryBuilderActions.exportResultsFailure, (state, { error }): QueryBuilderState => ({
    ...state,
    loading: { ...state.loading, exporting: false },
    error: { ...state.error, exporting: error }
  })),

  /**
   * Template Actions
   */
  on(QueryBuilderActions.loadTemplates, (state): QueryBuilderState => ({
    ...state,
    loading: { ...state.loading, templates: true },
    error: { ...state.error, templates: null }
  })),

  on(QueryBuilderActions.loadTemplatesSuccess, (state, { templates }): QueryBuilderState => 
    queryTemplateAdapter.setAll(templates, {
      ...state,
      loading: { ...state.loading, templates: false },
      lastTemplatesLoaded: Date.now()
    })
  ),

  on(QueryBuilderActions.loadTemplatesFailure, (state, { error }): QueryBuilderState => ({
    ...state,
    loading: { ...state.loading, templates: false },
    error: { ...state.error, templates: error }
  })),

  on(QueryBuilderActions.loadTemplateDetail, (state, { templateId }): QueryBuilderState => ({
    ...state,
    selectedTemplateId: templateId,
    loading: { ...state.loading, templateDetail: true },
    error: { ...state.error, templateDetail: null }
  })),

  on(QueryBuilderActions.loadTemplateDetailSuccess, (state, { template }): QueryBuilderState => ({
    ...state,
    selectedTemplateDetail: template,
    loading: { ...state.loading, templateDetail: false }
  })),

  on(QueryBuilderActions.loadTemplateDetailFailure, (state, { error }): QueryBuilderState => ({
    ...state,
    loading: { ...state.loading, templateDetail: false },
    error: { ...state.error, templateDetail: error }
  })),

  on(QueryBuilderActions.createTemplate, (state): QueryBuilderState => ({
    ...state,
    loading: { ...state.loading, creatingTemplate: true },
    error: { ...state.error, creatingTemplate: null }
  })),

  on(QueryBuilderActions.createTemplateSuccess, (state, { template }): QueryBuilderState => 
    queryTemplateAdapter.addOne(template, {
      ...state,
      loading: { ...state.loading, creatingTemplate: false }
    })
  ),

  on(QueryBuilderActions.createTemplateFailure, (state, { error }): QueryBuilderState => ({
    ...state,
    loading: { ...state.loading, creatingTemplate: false },
    error: { ...state.error, creatingTemplate: error }
  })),

  on(QueryBuilderActions.deleteTemplate, (state): QueryBuilderState => ({
    ...state,
    loading: { ...state.loading, deletingTemplate: true },
    error: { ...state.error, deletingTemplate: null }
  })),

  on(QueryBuilderActions.deleteTemplateSuccess, (state, { templateId }): QueryBuilderState => 
    queryTemplateAdapter.removeOne(templateId, {
      ...state,
      loading: { ...state.loading, deletingTemplate: false },
      selectedTemplateId: state.selectedTemplateId === templateId ? null : state.selectedTemplateId,
      selectedTemplateDetail: state.selectedTemplateId === templateId ? null : state.selectedTemplateDetail
    })
  ),

  on(QueryBuilderActions.deleteTemplateFailure, (state, { error }): QueryBuilderState => ({
    ...state,
    loading: { ...state.loading, deletingTemplate: false },
    error: { ...state.error, deletingTemplate: error }
  })),

  on(QueryBuilderActions.executeTemplate, (state): QueryBuilderState => ({
    ...state,
    loading: { ...state.loading, executingTemplate: true },
    error: { ...state.error, executingTemplate: null }
  })),

  on(QueryBuilderActions.executeTemplateSuccess, (state, { result }): QueryBuilderState => ({
    ...state,
    queryResult: result,
    loading: { ...state.loading, executingTemplate: false },
    lastExecuted: Date.now()
  })),

  on(QueryBuilderActions.executeTemplateFailure, (state, { error }): QueryBuilderState => ({
    ...state,
    loading: { ...state.loading, executingTemplate: false },
    error: { ...state.error, executingTemplate: error }
  })),

  on(QueryBuilderActions.selectTemplate, (state, { templateId }): QueryBuilderState => ({
    ...state,
    selectedTemplateId: templateId
  })),

  on(QueryBuilderActions.selectDataSource, (state, { dataSourceId }): QueryBuilderState => ({
    ...state,
    selectedDataSource: dataSourceId,
    fields: dataSourceId === state.selectedDataSource ? state.fields : []
  }))
);
