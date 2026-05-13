import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { ConstructionService } from '../../services/construction.service';
import * as AllocationActions from './allocation.actions';

@Injectable()
export class AllocationEffects {
  constructor(
    private actions$: Actions,
    private constructionService: ConstructionService
  ) {}

  loadAllocations$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AllocationActions.loadAllocations),
      switchMap(({ year }) =>
        this.constructionService.getAllocations(year).pipe(
          map(allocations => AllocationActions.loadAllocationsSuccess({ allocations })),
          catchError(error =>
            of(AllocationActions.loadAllocationsFailure({
              error: error.message || 'Failed to load allocations'
            }))
          )
        )
      )
    )
  );

  updateAllocation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AllocationActions.updateAllocation),
      switchMap(({ allocation, previousAllocation }) =>
        this.constructionService.updateAllocation(allocation).pipe(
          map(updated => AllocationActions.updateAllocationSuccess({ allocation: updated })),
          catchError(error =>
            of(AllocationActions.updateAllocationFailure({
              error: error.message || 'Failed to update allocation',
              previousAllocation
            }))
          )
        )
      )
    )
  );
}
