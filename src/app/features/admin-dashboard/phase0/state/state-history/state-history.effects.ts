import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import * as StateHistoryActions from './state-history.actions';
import { StateVisualizationService } from '../../services/state-visualization.service';

@Injectable()
export class StateHistoryEffects {
  private readonly actions$ = inject(Actions);
  private readonly stateVisualizationService = inject(StateVisualizationService);
  
  loadStateHistory$ = createEffect(() =>
    this.actions$.pipe(
      ofType(StateHistoryActions.loadStateHistory),
      switchMap(({ entityId, entityType }) =>
        this.stateVisualizationService.getStateHistory(entityId, entityType).pipe(
          map((history) =>
            StateHistoryActions.loadStateHistorySuccess({ history })
          ),
          catchError((error) =>
            of(StateHistoryActions.loadStateHistoryFailure({ error: error.message }))
          )
        )
      )
    )
  );
  
  loadStateTransitions$ = createEffect(() =>
    this.actions$.pipe(
      ofType(StateHistoryActions.loadStateTransitions),
      switchMap(({ entityId, entityType }) =>
        this.stateVisualizationService.getStateTransitions(entityId, entityType).pipe(
          map((transitions) =>
            StateHistoryActions.loadStateTransitionsSuccess({ transitions })
          ),
          catchError((error) =>
            of(StateHistoryActions.loadStateTransitionsFailure({ error: error.message }))
          )
        )
      )
    )
  );
  
  selectEntity$ = createEffect(() =>
    this.actions$.pipe(
      ofType(StateHistoryActions.selectEntity),
      map(({ entityId, entityType }) =>
        StateHistoryActions.loadStateHistory({ entityId, entityType })
      )
    )
  );
}
