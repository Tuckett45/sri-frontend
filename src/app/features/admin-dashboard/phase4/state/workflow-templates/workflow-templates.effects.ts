import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import { TemplateEngineService } from '../../services/template-engine.service';
import * as TemplateActions from './workflow-templates.actions';

/**
 * Workflow Templates Effects
 * 
 * Side effects for template API calls
 * Requirements: 10.1, 10.6, 11.1
 */
@Injectable()
export class WorkflowTemplatesEffects {

  constructor(
    private actions$: Actions,
    private templateEngineService: TemplateEngineService
  ) {}

  /**
   * Load templates effect
   * Requirement: 10.1
   */
  loadTemplates$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TemplateActions.loadTemplates),
      switchMap(({ workflowType }) =>
        this.templateEngineService.getTemplates(workflowType).pipe(
          map(templates => TemplateActions.loadTemplatesSuccess({ templates })),
          catchError(error => of(TemplateActions.loadTemplatesFailure({ error })))
        )
      )
    )
  );

  /**
   * Load template by ID effect
   * Requirement: 10.1
   */
  loadTemplateById$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TemplateActions.loadTemplateById),
      switchMap(({ templateId }) =>
        this.templateEngineService.getTemplateById(templateId).pipe(
          map(template => TemplateActions.loadTemplateByIdSuccess({ template })),
          catchError(error => of(TemplateActions.loadTemplateByIdFailure({ error })))
        )
      )
    )
  );

  /**
   * Load template categories effect
   * Requirement: 10.1
   */
  loadTemplateCategories$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TemplateActions.loadTemplateCategories),
      switchMap(() =>
        this.templateEngineService.getTemplateCategories().pipe(
          map(categories => TemplateActions.loadTemplateCategoriesSuccess({ categories })),
          catchError(error => of(TemplateActions.loadTemplateCategoriesFailure({ error })))
        )
      )
    )
  );

  /**
   * Select template effect
   * Loads template details if not already loaded
   * Requirement: 10.6
   */
  selectTemplate$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TemplateActions.selectTemplate),
      map(({ templateId }) => TemplateActions.loadTemplateById({ templateId }))
    )
  );

  /**
   * Apply template effect
   * Requirement: 11.1
   */
  applyTemplate$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TemplateActions.applyTemplate),
      switchMap(({ templateId, customizations }) =>
        this.templateEngineService.applyTemplate(templateId, customizations).pipe(
          map(appliedTemplate => TemplateActions.applyTemplateSuccess({ appliedTemplate })),
          catchError(error => of(TemplateActions.applyTemplateFailure({ error })))
        )
      )
    )
  );

  /**
   * Log errors effect
   */
  logErrors$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(
          TemplateActions.loadTemplatesFailure,
          TemplateActions.loadTemplateByIdFailure,
          TemplateActions.loadTemplateCategoriesFailure,
          TemplateActions.applyTemplateFailure
        ),
        tap(({ error }) => {
          console.error('Workflow Templates Error:', error);
        })
      ),
    { dispatch: false }
  );
}
