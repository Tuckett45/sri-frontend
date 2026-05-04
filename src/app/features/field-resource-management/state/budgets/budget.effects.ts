/**
 * Budget Effects
 * Handles side effects for budget actions (API calls, notifications)
 */

import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, forkJoin } from 'rxjs';
import { map, catchError, switchMap, tap, withLatestFrom, filter } from 'rxjs/operators';
import * as BudgetActions from './budget.actions';
import { BudgetService } from '../../services/budget.service';
import { selectBudgetByJobId, selectAlertThresholds } from './budget.selectors';

@Injectable()
export class BudgetEffects {
  // Load Budget Effect
  loadBudget$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BudgetActions.loadBudget),
      switchMap(({ jobId }) =>
        this.budgetService.getBudget(jobId).pipe(
          map((budget) =>
            BudgetActions.loadBudgetSuccess({ budget })
          ),
          catchError((error) =>
            of(BudgetActions.loadBudgetFailure({ 
              error: error.message || 'Failed to load budget' 
            }))
          )
        )
      )
    )
  );

  // Load Multiple Budgets Effect
  loadBudgets$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BudgetActions.loadBudgets),
      switchMap(({ jobIds }) => {
        const budgetRequests = jobIds.map(jobId => 
          this.budgetService.getBudget(jobId).pipe(
            catchError(() => of(null))
          )
        );
        
        return forkJoin(budgetRequests).pipe(
          map((budgets) => {
            const validBudgets = budgets.filter(b => b !== null);
            return BudgetActions.loadBudgetsSuccess({ budgets: validBudgets as any[] });
          }),
          catchError((error) =>
            of(BudgetActions.loadBudgetsFailure({ 
              error: error.message || 'Failed to load budgets' 
            }))
          )
        );
      })
    )
  );

  // Create Budget Effect
  createBudget$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BudgetActions.createBudget),
      switchMap(({ budget }) =>
        this.budgetService.createBudget(budget).pipe(
          map((createdBudget) =>
            BudgetActions.createBudgetSuccess({ budget: createdBudget })
          ),
          catchError((error) =>
            of(BudgetActions.createBudgetFailure({ 
              error: error.message || 'Failed to create budget' 
            }))
          )
        )
      )
    )
  );

  // Adjust Budget Effect
  adjustBudget$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BudgetActions.adjustBudget),
      switchMap(({ jobId, adjustment }) =>
        this.budgetService.adjustBudget(jobId, adjustment).pipe(
          switchMap((adjustmentRecord) =>
            this.budgetService.getBudget(jobId).pipe(
              map((budget) =>
                BudgetActions.adjustBudgetSuccess({ 
                  budget, 
                  adjustment: adjustmentRecord 
                })
              )
            )
          ),
          catchError((error) =>
            of(BudgetActions.adjustBudgetFailure({ 
              error: error.message || 'Failed to adjust budget' 
            }))
          )
        )
      )
    )
  );

  // Deduct Hours Effect
  deductHours$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BudgetActions.deductHours),
      switchMap(({ jobId, hours, timecardEntryId }) =>
        this.budgetService.deductHours(jobId, hours, timecardEntryId).pipe(
          map((budget) => {
            // Create deduction record for history
            const deduction = {
              id: `${jobId}-${timecardEntryId}`,
              jobId,
              timecardEntryId,
              technicianId: '', // Will be populated by backend
              technicianName: '', // Will be populated by backend
              hoursDeducted: hours,
              timestamp: new Date()
            };
            
            return BudgetActions.deductHoursSuccess({ budget, deduction });
          }),
          catchError((error) =>
            of(BudgetActions.deductHoursFailure({ 
              error: error.message || 'Failed to deduct hours from budget' 
            }))
          )
        )
      )
    )
  );

  // Load Adjustment History Effect
  loadAdjustmentHistory$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BudgetActions.loadAdjustmentHistory),
      switchMap(({ jobId }) =>
        this.budgetService.getAdjustmentHistory(jobId).pipe(
          map((adjustments) =>
            BudgetActions.loadAdjustmentHistorySuccess({ jobId, adjustments })
          ),
          catchError((error) =>
            of(BudgetActions.loadAdjustmentHistoryFailure({ 
              error: error.message || 'Failed to load adjustment history' 
            }))
          )
        )
      )
    )
  );

  // Load Deduction History Effect
  loadDeductionHistory$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BudgetActions.loadDeductionHistory),
      switchMap(({ jobId }) =>
        this.budgetService.getDeductionHistory(jobId).pipe(
          map((deductions) =>
            BudgetActions.loadDeductionHistorySuccess({ jobId, deductions })
          ),
          catchError((error) =>
            of(BudgetActions.loadDeductionHistoryFailure({ 
              error: error.message || 'Failed to load deduction history' 
            }))
          )
        )
      )
    )
  );

  // Budget Alert Effect - triggers on successful deduction or adjustment
  budgetAlert$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        BudgetActions.deductHoursSuccess,
        BudgetActions.adjustBudgetSuccess
      ),
      map(action => action.budget),
      withLatestFrom(this.store.select(selectAlertThresholds)),
      filter(([budget, thresholds]) => {
        if (!budget || budget.allocatedHours === 0) {
          return false;
        }
        const percentConsumed = (budget.consumedHours / budget.allocatedHours) * 100;
        return percentConsumed >= thresholds.warning;
      }),
      map(([budget, thresholds]) => {
        const percentConsumed = (budget.consumedHours / budget.allocatedHours) * 100;
        const threshold = percentConsumed >= thresholds.critical ? 'critical' : 'warning';
        
        return BudgetActions.budgetAlert({ 
          jobId: budget.jobId, 
          budget, 
          threshold 
        });
      })
    )
  );

  // Success Notifications
  createBudgetSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(BudgetActions.createBudgetSuccess),
        tap(() => {
          this.snackBar.open('Budget created successfully', 'Close', {
            duration: 3000,
            horizontalPosition: 'end',
            verticalPosition: 'top'
          });
        })
      ),
    { dispatch: false }
  );

  adjustBudgetSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(BudgetActions.adjustBudgetSuccess),
        tap(() => {
          this.snackBar.open('Budget adjusted successfully', 'Close', {
            duration: 3000,
            horizontalPosition: 'end',
            verticalPosition: 'top'
          });
        })
      ),
    { dispatch: false }
  );

  deductHoursSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(BudgetActions.deductHoursSuccess),
        tap(({ budget }) => {
          this.snackBar.open(
            `${budget.consumedHours.toFixed(2)} hours deducted from budget`, 
            'Close', 
            {
              duration: 3000,
              horizontalPosition: 'end',
              verticalPosition: 'top'
            }
          );
        })
      ),
    { dispatch: false }
  );

  // Budget Alert Notifications
  budgetAlertNotification$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(BudgetActions.budgetAlert),
        tap(({ budget, threshold }) => {
          const percentConsumed = budget.allocatedHours > 0
            ? Math.round((budget.consumedHours / budget.allocatedHours) * 100)
            : 0;
          
          const message = threshold === 'critical'
            ? `⚠️ Budget EXCEEDED for job ${budget.jobId} (${percentConsumed}% consumed)`
            : `⚠️ Budget WARNING for job ${budget.jobId} (${percentConsumed}% consumed)`;
          
          const panelClass = threshold === 'critical' 
            ? 'error-snackbar' 
            : 'warning-snackbar';
          
          this.snackBar.open(message, 'View', {
            duration: 5000,
            horizontalPosition: 'end',
            verticalPosition: 'top',
            panelClass: [panelClass]
          });
        })
      ),
    { dispatch: false }
  );

  // Error Notifications (suppress "not found" for budgets — expected for new jobs)
  budgetFailure$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(
          BudgetActions.loadBudgetsFailure,
          BudgetActions.createBudgetFailure,
          BudgetActions.adjustBudgetFailure,
          BudgetActions.deductHoursFailure,
          BudgetActions.loadAdjustmentHistoryFailure,
          BudgetActions.loadDeductionHistoryFailure
        ),
        tap(({ error }) => {
          this.snackBar.open(`Error: ${error}`, 'Close', {
            duration: 5000,
            horizontalPosition: 'end',
            verticalPosition: 'top',
            panelClass: ['error-snackbar']
          });
        })
      ),
    { dispatch: false }
  );

  // Silently handle single-budget load failures (404 = no budget yet)
  loadBudgetFailureSilent$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(BudgetActions.loadBudgetFailure),
        filter(({ error }) => !error.includes('not found')),
        tap(({ error }) => {
          this.snackBar.open(`Error: ${error}`, 'Close', {
            duration: 5000,
            horizontalPosition: 'end',
            verticalPosition: 'top',
            panelClass: ['error-snackbar']
          });
        })
      ),
    { dispatch: false }
  );

  constructor(
    private actions$: Actions,
    private store: Store,
    private budgetService: BudgetService,
    private snackBar: MatSnackBar
  ) {}
}
