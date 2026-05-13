/**
 * Quote Effects
 * Handles side effects for quote workflow actions (API calls, draft management,
 * SignalR broadcasts, and navigation)
 *
 * Requirements: 2.15, 2.16, 3.6–3.8, 4.11–4.12, 5.1–5.12, 6.8–6.9, 7.4,
 *               8.14, 10.6, 15.1–15.4
 */

import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import * as QuoteActions from './quote.actions';
import { QuoteWorkflowService } from '../../services/quote-workflow.service';
import { JobSummaryService } from '../../services/job-summary.service';
import { BomService } from '../../services/bom.service';
import { BomValidationService } from '../../services/bom-validation.service';
import { QuoteAssemblyService } from '../../services/quote-assembly.service';
import { FrmSignalRService } from '../../services/frm-signalr.service';

@Injectable()
export class QuoteEffects {

  // ── Load Quotes ────────────────────────────────────────────────────────
  loadQuotes$ = createEffect(() =>
    this.actions$.pipe(
      ofType(QuoteActions.loadQuotes),
      switchMap(({ filters }) =>
        this.quoteWorkflowService.getQuotes(filters).pipe(
          map((quotes) => QuoteActions.loadQuotesSuccess({ quotes })),
          catchError((error) =>
            of(QuoteActions.loadQuotesFailure({
              error: error.message || 'Failed to load quotes'
            }))
          )
        )
      )
    )
  );

  // ── Load Single Quote ──────────────────────────────────────────────────
  loadQuote$ = createEffect(() =>
    this.actions$.pipe(
      ofType(QuoteActions.loadQuote),
      switchMap(({ quoteId }) =>
        this.quoteWorkflowService.getQuote(quoteId).pipe(
          map((quote) => QuoteActions.loadQuoteSuccess({ quote })),
          catchError((error) =>
            of(QuoteActions.loadQuoteFailure({
              error: error.message || 'Failed to load quote'
            }))
          )
        )
      )
    )
  );

  // ── Create Quote ───────────────────────────────────────────────────────
  createQuote$ = createEffect(() =>
    this.actions$.pipe(
      ofType(QuoteActions.createQuote),
      switchMap(({ rfpData }) =>
        this.quoteWorkflowService.createQuote(rfpData).pipe(
          map((quote) => {
            // Clear the RFP intake draft on success
            this.quoteWorkflowService.clearDraft(null, 'rfpIntake');

            // Broadcast SignalR update (fire-and-forget)
            this.broadcastQuoteUpdate(quote.id, quote);

            // Navigate to the new quote workflow view
            this.router.navigate(['/field-resource-management/quotes', quote.id]);

            return QuoteActions.createQuoteSuccess({ quote });
          }),
          catchError((error) =>
            of(QuoteActions.createQuoteFailure({
              error: error.message || 'Failed to create quote'
            }))
          )
        )
      )
    )
  );

  // ── Save Job Summary ───────────────────────────────────────────────────
  saveJobSummary$ = createEffect(() =>
    this.actions$.pipe(
      ofType(QuoteActions.saveJobSummary),
      switchMap(({ quoteId, data }) =>
        this.jobSummaryService.saveJobSummary(quoteId, data).pipe(
          map((quote) => {
            this.quoteWorkflowService.clearDraft(quoteId, 'jobSummary');
            this.broadcastQuoteUpdate(quoteId, quote);
            return QuoteActions.saveJobSummarySuccess({ quote });
          }),
          catchError((error) =>
            of(QuoteActions.quoteOperationFailure({
              error: error.message || 'Failed to save job summary'
            }))
          )
        )
      )
    )
  );

  // ── Complete Job Summary ───────────────────────────────────────────────
  completeJobSummary$ = createEffect(() =>
    this.actions$.pipe(
      ofType(QuoteActions.completeJobSummary),
      switchMap(({ quoteId }) =>
        this.jobSummaryService.completeJobSummary(quoteId).pipe(
          map((quote) => {
            this.quoteWorkflowService.clearDraft(quoteId, 'jobSummary');
            this.broadcastQuoteUpdate(quoteId, quote);
            return QuoteActions.completeJobSummarySuccess({ quote });
          }),
          catchError((error) =>
            of(QuoteActions.quoteOperationFailure({
              error: error.message || 'Failed to complete job summary'
            }))
          )
        )
      )
    )
  );

  // ── Save BOM ───────────────────────────────────────────────────────────
  saveBom$ = createEffect(() =>
    this.actions$.pipe(
      ofType(QuoteActions.saveBom),
      switchMap(({ quoteId, data }) =>
        this.bomService.saveBom(quoteId, data).pipe(
          map((quote) => {
            this.quoteWorkflowService.clearDraft(quoteId, 'bom');
            this.broadcastQuoteUpdate(quoteId, quote);
            return QuoteActions.saveBomSuccess({ quote });
          }),
          catchError((error) =>
            of(QuoteActions.quoteOperationFailure({
              error: error.message || 'Failed to save BOM'
            }))
          )
        )
      )
    )
  );

  // ── Complete BOM ───────────────────────────────────────────────────────
  completeBom$ = createEffect(() =>
    this.actions$.pipe(
      ofType(QuoteActions.completeBom),
      switchMap(({ quoteId }) =>
        this.bomService.completeBom(quoteId).pipe(
          map((quote) => {
            this.quoteWorkflowService.clearDraft(quoteId, 'bom');
            this.broadcastQuoteUpdate(quoteId, quote);
            return QuoteActions.completeBomSuccess({ quote });
          }),
          catchError((error) =>
            of(QuoteActions.quoteOperationFailure({
              error: error.message || 'Failed to complete BOM'
            }))
          )
        )
      )
    )
  );

  // ── Initiate Validation ────────────────────────────────────────────────
  initiateValidation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(QuoteActions.initiateValidation),
      switchMap(({ quoteId }) =>
        this.bomValidationService.initiateValidation(quoteId).pipe(
          switchMap(() =>
            // Reload the quote to get the updated workflow status
            this.quoteWorkflowService.getQuote(quoteId).pipe(
              map((quote) => {
                this.broadcastQuoteUpdate(quoteId, quote);
                return QuoteActions.initiateValidationSuccess({ quote });
              })
            )
          ),
          catchError((error) =>
            of(QuoteActions.quoteOperationFailure({
              error: error.message || 'Failed to initiate validation'
            }))
          )
        )
      )
    )
  );

  // ── Approve BOM ────────────────────────────────────────────────────────
  approveBom$ = createEffect(() =>
    this.actions$.pipe(
      ofType(QuoteActions.approveBom),
      switchMap(({ quoteId }) =>
        this.bomValidationService.approveBom(quoteId).pipe(
          switchMap(() =>
            this.quoteWorkflowService.getQuote(quoteId).pipe(
              map((quote) => {
                this.broadcastQuoteUpdate(quoteId, quote);
                return QuoteActions.approveBomSuccess({ quote });
              })
            )
          ),
          catchError((error) =>
            of(QuoteActions.quoteOperationFailure({
              error: error.message || 'Failed to approve BOM'
            }))
          )
        )
      )
    )
  );

  // ── Reject BOM ─────────────────────────────────────────────────────────
  rejectBom$ = createEffect(() =>
    this.actions$.pipe(
      ofType(QuoteActions.rejectBom),
      switchMap(({ quoteId, comments }) =>
        this.bomValidationService.rejectBom(quoteId, comments).pipe(
          switchMap(() =>
            this.quoteWorkflowService.getQuote(quoteId).pipe(
              map((quote) => {
                this.broadcastQuoteUpdate(quoteId, quote);
                return QuoteActions.rejectBomSuccess({ quote });
              })
            )
          ),
          catchError((error) =>
            of(QuoteActions.quoteOperationFailure({
              error: error.message || 'Failed to reject BOM'
            }))
          )
        )
      )
    )
  );

  // ── Finalize Quote ─────────────────────────────────────────────────────
  finalizeQuote$ = createEffect(() =>
    this.actions$.pipe(
      ofType(QuoteActions.finalizeQuote),
      switchMap(({ quoteId }) =>
        this.quoteAssemblyService.finalizeQuote(quoteId).pipe(
          map((quote) => {
            this.broadcastQuoteUpdate(quoteId, quote);
            return QuoteActions.finalizeQuoteSuccess({ quote });
          }),
          catchError((error) =>
            of(QuoteActions.quoteOperationFailure({
              error: error.message || 'Failed to finalize quote'
            }))
          )
        )
      )
    )
  );

  // ── Deliver Quote ──────────────────────────────────────────────────────
  deliverQuote$ = createEffect(() =>
    this.actions$.pipe(
      ofType(QuoteActions.deliverQuote),
      switchMap(({ quoteId, emailData }) =>
        this.quoteAssemblyService.sendToCustomer(quoteId, emailData).pipe(
          map((quote) => {
            this.broadcastQuoteUpdate(quoteId, quote);
            return QuoteActions.deliverQuoteSuccess({ quote });
          }),
          catchError((error) =>
            of(QuoteActions.quoteOperationFailure({
              error: error.message || 'Failed to deliver quote'
            }))
          )
        )
      )
    )
  );

  // ── Convert to Job ─────────────────────────────────────────────────────
  convertToJob$ = createEffect(() =>
    this.actions$.pipe(
      ofType(QuoteActions.convertToJob),
      switchMap(({ quoteId, data }) =>
        this.quoteWorkflowService.convertToJob(quoteId, data).pipe(
          map(({ job, quote }) => {
            this.quoteWorkflowService.clearAllDrafts(quoteId);
            this.broadcastQuoteUpdate(quoteId, quote);
            return QuoteActions.convertToJobSuccess({ quote, job });
          }),
          catchError((error) =>
            of(QuoteActions.convertToJobFailure({
              error: error.message || 'Failed to convert quote to job'
            }))
          )
        )
      )
    )
  );

  // ── Success Notifications ──────────────────────────────────────────────

  showCreateQuoteSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(QuoteActions.createQuoteSuccess),
      tap(() => {
        this.snackBar.open('Quote created successfully', 'Close', { duration: 3000 });
      })
    ),
    { dispatch: false }
  );

  showSaveJobSummarySuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(QuoteActions.saveJobSummarySuccess),
      tap(() => {
        this.snackBar.open('Job summary saved successfully', 'Close', { duration: 3000 });
      })
    ),
    { dispatch: false }
  );

  showCompleteJobSummarySuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(QuoteActions.completeJobSummarySuccess),
      tap(() => {
        this.snackBar.open('Job summary completed', 'Close', { duration: 3000 });
      })
    ),
    { dispatch: false }
  );

  showSaveBomSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(QuoteActions.saveBomSuccess),
      tap(() => {
        this.snackBar.open('BOM saved successfully', 'Close', { duration: 3000 });
      })
    ),
    { dispatch: false }
  );

  showCompleteBomSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(QuoteActions.completeBomSuccess),
      tap(() => {
        this.snackBar.open('BOM completed', 'Close', { duration: 3000 });
      })
    ),
    { dispatch: false }
  );

  showValidationSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(QuoteActions.initiateValidationSuccess),
      tap(() => {
        this.snackBar.open('Validation initiated', 'Close', { duration: 3000 });
      })
    ),
    { dispatch: false }
  );

  showApproveBomSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(QuoteActions.approveBomSuccess),
      tap(() => {
        this.snackBar.open('BOM approved', 'Close', { duration: 3000 });
      })
    ),
    { dispatch: false }
  );

  showRejectBomSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(QuoteActions.rejectBomSuccess),
      tap(() => {
        this.snackBar.open('BOM rejected', 'Close', { duration: 3000 });
      })
    ),
    { dispatch: false }
  );

  showFinalizeQuoteSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(QuoteActions.finalizeQuoteSuccess),
      tap(() => {
        this.snackBar.open('Quote finalized', 'Close', { duration: 3000 });
      })
    ),
    { dispatch: false }
  );

  showDeliverQuoteSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(QuoteActions.deliverQuoteSuccess),
      tap(() => {
        this.snackBar.open('Quote delivered to customer', 'Close', { duration: 3000 });
      })
    ),
    { dispatch: false }
  );

  showConvertToJobSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(QuoteActions.convertToJobSuccess),
      tap(() => {
        this.snackBar.open('Quote converted to job successfully', 'Close', { duration: 3000 });
      })
    ),
    { dispatch: false }
  );

  // ── Error Notifications ────────────────────────────────────────────────

  showErrorNotification$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        QuoteActions.loadQuotesFailure,
        QuoteActions.loadQuoteFailure,
        QuoteActions.createQuoteFailure,
        QuoteActions.convertToJobFailure,
        QuoteActions.quoteOperationFailure
      ),
      tap(({ error }) => {
        this.snackBar.open(error, 'Close', { duration: 5000 });
      })
    ),
    { dispatch: false }
  );

  // ── Error Logging ──────────────────────────────────────────────────────

  logErrors$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(
          QuoteActions.loadQuotesFailure,
          QuoteActions.loadQuoteFailure,
          QuoteActions.createQuoteFailure,
          QuoteActions.convertToJobFailure,
          QuoteActions.quoteOperationFailure
        ),
        tap((action) => {
          console.error('Quote Effect Error:', action.error);
        })
      ),
    { dispatch: false }
  );

  // ── Private Helpers ────────────────────────────────────────────────────

  /**
   * Broadcasts a quote update via SignalR (fire-and-forget).
   * Follows the same pattern as broadcastChecklistUpdate.
   */
  private broadcastQuoteUpdate(quoteId: string, quote: any): void {
    if (this.signalRService.isConnected()) {
      this.signalRService.broadcastQuoteUpdate(quoteId, quote).catch(err =>
        console.error('Failed to broadcast quote update', err)
      );
    }
  }

  constructor(
    private actions$: Actions,
    private router: Router,
    private snackBar: MatSnackBar,
    private quoteWorkflowService: QuoteWorkflowService,
    private jobSummaryService: JobSummaryService,
    private bomService: BomService,
    private bomValidationService: BomValidationService,
    private quoteAssemblyService: QuoteAssemblyService,
    private signalRService: FrmSignalRService
  ) {}
}
