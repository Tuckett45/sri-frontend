/**
 * Query Builder NgRx Actions
 * 
 * This module defines all actions for query builder state management.
 * Actions represent events that can occur in the application related to query building.
 * 
 * Requirements: 3.2
 */

import { createAction, props } from '@ngrx/store';
import {
  DataSourceInfo,
  FieldConfig,
  UserQuery,
  QueryResult,
  QueryTemplate,
  CreateTemplateRequest,
  TemplateExecutionRequest,
  ExportFormat
} from '../../models/query-builder.model';

/**
 * Data Sources Actions
 */

/** Load available data sources */
export const loadDataSources = createAction(
  '[Query Builder] Load Data Sources'
);

/** Data sources loaded successfully */
export const loadDataSourcesSuccess = createAction(
  '[Query Builder] Load Data Sources Success',
  props<{ dataSources: DataSourceInfo[] }>()
);

/** Data sources load failed */
export const loadDataSourcesFailure = createAction(
  '[Query Builder] Load Data Sources Failure',
  props<{ error: string }>()
);

/**
 * Fields Actions
 */

/** Load fields for a data source */
export const loadFields = createAction(
  '[Query Builder] Load Fields',
  props<{ dataSourceId: string }>()
);

/** Fields loaded successfully */
export const loadFieldsSuccess = createAction(
  '[Query Builder] Load Fields Success',
  props<{ fields: FieldConfig[] }>()
);

/** Fields load failed */
export const loadFieldsFailure = createAction(
  '[Query Builder] Load Fields Failure',
  props<{ error: string }>()
);

/**
 * Query Execution Actions
 */

/** Set current query being built */
export const setCurrentQuery = createAction(
  '[Query Builder] Set Current Query',
  props<{ query: UserQuery }>()
);

/** Clear current query */
export const clearCurrentQuery = createAction(
  '[Query Builder] Clear Current Query'
);

/** Execute query */
export const executeQuery = createAction(
  '[Query Builder] Execute Query',
  props<{ query: UserQuery }>()
);

/** Query executed successfully */
export const executeQuerySuccess = createAction(
  '[Query Builder] Execute Query Success',
  props<{ result: QueryResult }>()
);

/** Query execution failed */
export const executeQueryFailure = createAction(
  '[Query Builder] Execute Query Failure',
  props<{ error: string }>()
);

/** Clear query result */
export const clearQueryResult = createAction(
  '[Query Builder] Clear Query Result'
);

/**
 * Export Actions
 */

/** Export query results */
export const exportResults = createAction(
  '[Query Builder] Export Results',
  props<{ result: QueryResult; format: ExportFormat; dataSource?: string; fileName?: string }>()
);

/** Export completed successfully */
export const exportResultsSuccess = createAction(
  '[Query Builder] Export Results Success'
);

/** Export failed */
export const exportResultsFailure = createAction(
  '[Query Builder] Export Results Failure',
  props<{ error: string }>()
);

/**
 * Template Actions
 */

/** Load query templates */
export const loadTemplates = createAction(
  '[Query Builder] Load Templates'
);

/** Templates loaded successfully */
export const loadTemplatesSuccess = createAction(
  '[Query Builder] Load Templates Success',
  props<{ templates: QueryTemplate[] }>()
);

/** Templates load failed */
export const loadTemplatesFailure = createAction(
  '[Query Builder] Load Templates Failure',
  props<{ error: string }>()
);

/** Load template detail */
export const loadTemplateDetail = createAction(
  '[Query Builder] Load Template Detail',
  props<{ templateId: string }>()
);

/** Template detail loaded successfully */
export const loadTemplateDetailSuccess = createAction(
  '[Query Builder] Load Template Detail Success',
  props<{ template: QueryTemplate }>()
);

/** Template detail load failed */
export const loadTemplateDetailFailure = createAction(
  '[Query Builder] Load Template Detail Failure',
  props<{ error: string }>()
);

/** Create new template */
export const createTemplate = createAction(
  '[Query Builder] Create Template',
  props<{ request: CreateTemplateRequest }>()
);

/** Template created successfully */
export const createTemplateSuccess = createAction(
  '[Query Builder] Create Template Success',
  props<{ template: QueryTemplate }>()
);

/** Template creation failed */
export const createTemplateFailure = createAction(
  '[Query Builder] Create Template Failure',
  props<{ error: string }>()
);

/** Delete template */
export const deleteTemplate = createAction(
  '[Query Builder] Delete Template',
  props<{ templateId: string }>()
);

/** Template deleted successfully */
export const deleteTemplateSuccess = createAction(
  '[Query Builder] Delete Template Success',
  props<{ templateId: string }>()
);

/** Template deletion failed */
export const deleteTemplateFailure = createAction(
  '[Query Builder] Delete Template Failure',
  props<{ error: string }>()
);

/** Execute template */
export const executeTemplate = createAction(
  '[Query Builder] Execute Template',
  props<{ templateId: string; request: TemplateExecutionRequest }>()
);

/** Template executed successfully */
export const executeTemplateSuccess = createAction(
  '[Query Builder] Execute Template Success',
  props<{ result: QueryResult }>()
);

/** Template execution failed */
export const executeTemplateFailure = createAction(
  '[Query Builder] Execute Template Failure',
  props<{ error: string }>()
);

/** Select template */
export const selectTemplate = createAction(
  '[Query Builder] Select Template',
  props<{ templateId: string | null }>()
);

/** Select data source */
export const selectDataSource = createAction(
  '[Query Builder] Select Data Source',
  props<{ dataSourceId: string | null }>()
);
