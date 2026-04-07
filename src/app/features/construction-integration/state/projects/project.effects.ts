import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { ConstructionService } from '../../services/construction.service';
import * as ProjectActions from './project.actions';

@Injectable()
export class ProjectEffects {
  constructor(
    private actions$: Actions,
    private constructionService: ConstructionService
  ) {}

  loadProjects$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ProjectActions.loadProjects),
      switchMap(() =>
        this.constructionService.getProjects().pipe(
          map(projects => ProjectActions.loadProjectsSuccess({ projects })),
          catchError(error =>
            of(ProjectActions.loadProjectsFailure({
              error: error.message || 'Failed to load projects'
            }))
          )
        )
      )
    )
  );

  loadProject$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ProjectActions.loadProject),
      switchMap(({ id }) =>
        this.constructionService.getProject(id).pipe(
          map(project => ProjectActions.loadProjectSuccess({ project })),
          catchError(error =>
            of(ProjectActions.loadProjectFailure({
              error: error.message || 'Failed to load project'
            }))
          )
        )
      )
    )
  );

  createProject$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ProjectActions.createProject),
      switchMap(({ project }) =>
        this.constructionService.createProject(project).pipe(
          map(created => ProjectActions.createProjectSuccess({ project: created })),
          catchError(error =>
            of(ProjectActions.createProjectFailure({
              error: error.message || 'Failed to create project'
            }))
          )
        )
      )
    )
  );

  updateProject$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ProjectActions.updateProject),
      switchMap(({ id, project }) =>
        this.constructionService.updateProject(id, project).pipe(
          map(updated => ProjectActions.updateProjectSuccess({ project: updated })),
          catchError(error =>
            of(ProjectActions.updateProjectFailure({
              error: error.message || 'Failed to update project'
            }))
          )
        )
      )
    )
  );
}
