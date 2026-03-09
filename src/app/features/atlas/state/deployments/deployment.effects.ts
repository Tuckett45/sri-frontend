import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { map, catchError, switchMap, withLatestFrom } from 'rxjs/operators';
import { DeploymentService } from '../../services/deployment.service';
import * as DeploymentActions from './deployment.actions';
import * as DeploymentSelectors from './deployment.selectors';

@Injectable()
export class DeploymentEffects {
  constructor(
    private actions$: Actions,
    private deploymentService: DeploymentService,
    private store: Store
  ) {}

  loadDeployments$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DeploymentActions.loadDeployments, DeploymentActions.refreshDeployments),
      withLatestFrom(this.store.select(DeploymentSelectors.selectDeploymentFilters)),
      switchMap(([action, filters]) => {
        const actionFilters = 'filters' in action ? action.filters : undefined;
        return this.deploymentService.getDeployments(actionFilters ?? filters).pipe(
          map((result) => DeploymentActions.loadDeploymentsSuccess({ result })),
          catchError((error) =>
            of(DeploymentActions.loadDeploymentsFailure({
              error: error.message || 'Failed to load deployments'
            }))
          )
        );
      })
    )
  );

  loadDeploymentDetail$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DeploymentActions.loadDeploymentDetail),
      switchMap(({ id }) =>
        this.deploymentService.getDeployment(id).pipe(
          map((deployment) => DeploymentActions.loadDeploymentDetailSuccess({ deployment })),
          catchError((error) =>
            of(DeploymentActions.loadDeploymentDetailFailure({
              error: error.message || 'Failed to load deployment'
            }))
          )
        )
      )
    )
  );

  createDeployment$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DeploymentActions.createDeployment),
      switchMap(({ request }) =>
        this.deploymentService.createDeployment(request).pipe(
          map((deployment) => DeploymentActions.createDeploymentSuccess({ deployment })),
          catchError((error) =>
            of(DeploymentActions.createDeploymentFailure({
              error: error.message || 'Failed to create deployment'
            }))
          )
        )
      )
    )
  );

  updateDeployment$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DeploymentActions.updateDeployment),
      switchMap(({ id, request }) =>
        this.deploymentService.updateDeployment(id, request).pipe(
          map((deployment) => DeploymentActions.updateDeploymentSuccess({ deployment })),
          catchError((error) =>
            of(DeploymentActions.updateDeploymentFailure({
              error: error.message || 'Failed to update deployment'
            }))
          )
        )
      )
    )
  );

  transitionState$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DeploymentActions.transitionState),
      switchMap(({ id, request }) =>
        this.deploymentService.transitionState(id, request).pipe(
          map((deployment) => DeploymentActions.transitionStateSuccess({ deployment })),
          catchError((error) =>
            of(DeploymentActions.transitionStateFailure({
              error: error.message || 'Failed to transition state'
            }))
          )
        )
      )
    )
  );

  // Reload list after create/update/delete/transition
  reloadAfterMutation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        DeploymentActions.createDeploymentSuccess,
        DeploymentActions.deleteDeploymentSuccess,
        DeploymentActions.transitionStateSuccess
      ),
      map(() => DeploymentActions.loadDeployments({}))
    )
  );
}
