import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { ConstructionService } from '../../services/construction.service';
import * as IssueActions from './issue.actions';

@Injectable()
export class IssueEffects {
  constructor(
    private actions$: Actions,
    private constructionService: ConstructionService
  ) {}

  loadIssues$ = createEffect(() =>
    this.actions$.pipe(
      ofType(IssueActions.loadIssues),
      switchMap(({ filters }) =>
        this.constructionService.getIssues(filters).pipe(
          map(issues => IssueActions.loadIssuesSuccess({ issues })),
          catchError(error =>
            of(IssueActions.loadIssuesFailure({
              error: error.message || 'Failed to load issues'
            }))
          )
        )
      )
    )
  );

  loadIssue$ = createEffect(() =>
    this.actions$.pipe(
      ofType(IssueActions.loadIssue),
      switchMap(({ id }) =>
        this.constructionService.getIssue(id).pipe(
          map(issue => IssueActions.loadIssueSuccess({ issue })),
          catchError(error =>
            of(IssueActions.loadIssueFailure({
              error: error.message || 'Failed to load issue'
            }))
          )
        )
      )
    )
  );

  loadIssuesByProject$ = createEffect(() =>
    this.actions$.pipe(
      ofType(IssueActions.loadIssuesByProject),
      switchMap(({ projectId }) =>
        this.constructionService.getIssuesByProject(projectId).pipe(
          map(issues => IssueActions.loadIssuesByProjectSuccess({ issues })),
          catchError(error =>
            of(IssueActions.loadIssuesByProjectFailure({
              error: error.message || 'Failed to load issues for project'
            }))
          )
        )
      )
    )
  );

  createIssue$ = createEffect(() =>
    this.actions$.pipe(
      ofType(IssueActions.createIssue),
      switchMap(({ issue }) =>
        this.constructionService.createIssue(issue).pipe(
          map(created => IssueActions.createIssueSuccess({ issue: created })),
          catchError(error =>
            of(IssueActions.createIssueFailure({
              error: error.message || 'Failed to create issue'
            }))
          )
        )
      )
    )
  );

  updateIssue$ = createEffect(() =>
    this.actions$.pipe(
      ofType(IssueActions.updateIssue),
      switchMap(({ id, issue }) =>
        this.constructionService.updateIssue(id, issue).pipe(
          map(updated => IssueActions.updateIssueSuccess({ issue: updated })),
          catchError(error =>
            of(IssueActions.updateIssueFailure({
              error: error.message || 'Failed to update issue'
            }))
          )
        )
      )
    )
  );

  transitionIssueStatus$ = createEffect(() =>
    this.actions$.pipe(
      ofType(IssueActions.transitionIssueStatus),
      switchMap(({ id, newStatus }) =>
        this.constructionService.transitionIssueStatus(id, newStatus).pipe(
          map(issue => IssueActions.transitionIssueStatusSuccess({ issue })),
          catchError(error =>
            of(IssueActions.transitionIssueStatusFailure({
              error: error.message || 'Failed to transition issue status'
            }))
          )
        )
      )
    )
  );
}
