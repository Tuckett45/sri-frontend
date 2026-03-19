/**
 * Query Builder NgRx Effects
 * 
 * This module defines side effects for query builder state management.
 * Effects handle asynchronous operations like API calls and dispatch
 * success/failure actions based on results.
 * 
 * Requirements: 3.4, 3.5, 3.6, 3.7
 */

import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import { QueryBuilderService } from '../../services/query-builder.service';
import * as QueryBuilderActions from './query-builder.actions';

/**
 * Query Builder Effects
 * 
 * Handles side effects for query builder operations including:
 * - Loading data sources and fields
 * - Executing queries
 * - Exporting results
 * - Managing templates
 */
@Injectable()
export class QueryBuilderEffects {
  constructor(
    private actions$: Actions,
    private queryBuilderService: QueryBuilderService
  ) {}

  /**
   * Load data sources effect
   * 
   * Triggers when loadDataSources action is dispatched.
   * Calls the service to fetch available data sources.
   */
  loadDataSources$ = createEffect(() =>
    this.actions$.pipe(
      ofType(QueryBuilderActions.loadDataSources),
      switchMap(() =>
        this.queryBuilderService.getDataSources().pipe(
          map(dataSources => QueryBuilderActions.loadDataSourcesSuccess({ dataSources })),
          catchError(error => 
            of(QueryBuilderActions.loadDataSourcesFailure({ 
              error: error.message || 'Failed to load data sources' 
            }))
          )
        )
      )
    )
  );

  /**
   * Load fields effect
   * 
   * Triggers when loadFields action is dispatched.
   * Calls the service to fetch fields for a specific data source.
   */
  loadFields$ = createEffect(() =>
    this.actions$.pipe(
      ofType(QueryBuilderActions.loadFields),
      switchMap(({ dataSourceId }) =>
        this.queryBuilderService.getFields(dataSourceId).pipe(
          map(fields => QueryBuilderActions.loadFieldsSuccess({ fields })),
          catchError(error => 
            of(QueryBuilderActions.loadFieldsFailure({ 
              error: error.message || 'Failed to load fields' 
            }))
          )
        )
      )
    )
  );

  /**
   * Execute query effect
   * 
   * Triggers when executeQuery action is dispatched.
   * Calls the service to execute the user query.
   */
  executeQuery$ = createEffect(() =>
    this.actions$.pipe(
      ofType(QueryBuilderActions.executeQuery),
      switchMap(({ query }) =>
        this.queryBuilderService.executeQuery(query).pipe(
          map(result => QueryBuilderActions.executeQuerySuccess({ result })),
          catchError(error => 
            of(QueryBuilderActions.executeQueryFailure({ 
              error: error.message || 'Failed to execute query' 
            }))
          )
        )
      )
    )
  );

  /**
   * Export results effect
   * 
   * Triggers when exportResults action is dispatched.
   * Calls the service to export query results in the specified format.
   */
  exportResults$ = createEffect(() =>
    this.actions$.pipe(
      ofType(QueryBuilderActions.exportResults),
      switchMap(({ result, format, dataSource, fileName }) =>
        this.queryBuilderService.exportResults({
          queryResult: result,
          format,
          dataSource,
          fileName
        }).pipe(
          tap(blob => {
            // Trigger browser download
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName || `query-results.${format.toLowerCase()}`;
            link.click();
            window.URL.revokeObjectURL(url);
          }),
          map(() => QueryBuilderActions.exportResultsSuccess()),
          catchError(error => 
            of(QueryBuilderActions.exportResultsFailure({ 
              error: error.message || 'Failed to export results' 
            }))
          )
        )
      )
    )
  );

  /**
   * Load templates effect
   * 
   * Triggers when loadTemplates action is dispatched.
   * Calls the service to fetch all query templates.
   */
  loadTemplates$ = createEffect(() =>
    this.actions$.pipe(
      ofType(QueryBuilderActions.loadTemplates),
      switchMap(() =>
        this.queryBuilderService.getTemplates().pipe(
          map(templates => QueryBuilderActions.loadTemplatesSuccess({ templates })),
          catchError(error => 
            of(QueryBuilderActions.loadTemplatesFailure({ 
              error: error.message || 'Failed to load templates' 
            }))
          )
        )
      )
    )
  );

  /**
   * Load template detail effect
   * 
   * Triggers when loadTemplateDetail action is dispatched.
   * Calls the service to fetch a specific template.
   */
  loadTemplateDetail$ = createEffect(() =>
    this.actions$.pipe(
      ofType(QueryBuilderActions.loadTemplateDetail),
      switchMap(({ templateId }) =>
        this.queryBuilderService.getTemplate(templateId).pipe(
          map(template => QueryBuilderActions.loadTemplateDetailSuccess({ template })),
          catchError(error => 
            of(QueryBuilderActions.loadTemplateDetailFailure({ 
              error: error.message || 'Failed to load template detail' 
            }))
          )
        )
      )
    )
  );

  /**
   * Create template effect
   * 
   * Triggers when createTemplate action is dispatched.
   * Calls the service to create a new query template.
   */
  createTemplate$ = createEffect(() =>
    this.actions$.pipe(
      ofType(QueryBuilderActions.createTemplate),
      switchMap(({ request }) =>
        this.queryBuilderService.createTemplate(request).pipe(
          map(template => QueryBuilderActions.createTemplateSuccess({ template })),
          catchError(error => 
            of(QueryBuilderActions.createTemplateFailure({ 
              error: error.message || 'Failed to create template' 
            }))
          )
        )
      )
    )
  );

  /**
   * Delete template effect
   * 
   * Triggers when deleteTemplate action is dispatched.
   * Calls the service to delete a query template.
   */
  deleteTemplate$ = createEffect(() =>
    this.actions$.pipe(
      ofType(QueryBuilderActions.deleteTemplate),
      switchMap(({ templateId }) =>
        this.queryBuilderService.deleteTemplate(templateId).pipe(
          map(() => QueryBuilderActions.deleteTemplateSuccess({ templateId })),
          catchError(error => 
            of(QueryBuilderActions.deleteTemplateFailure({ 
              error: error.message || 'Failed to delete template' 
            }))
          )
        )
      )
    )
  );

  /**
   * Execute template effect
   * 
   * Triggers when executeTemplate action is dispatched.
   * Calls the service to execute a query template with parameters.
   */
  executeTemplate$ = createEffect(() =>
    this.actions$.pipe(
      ofType(QueryBuilderActions.executeTemplate),
      switchMap(({ templateId, request }) =>
        this.queryBuilderService.executeTemplate(templateId, request).pipe(
          map(result => QueryBuilderActions.executeTemplateSuccess({ result })),
          catchError(error => 
            of(QueryBuilderActions.executeTemplateFailure({ 
              error: error.message || 'Failed to execute template' 
            }))
          )
        )
      )
    )
  );
}
