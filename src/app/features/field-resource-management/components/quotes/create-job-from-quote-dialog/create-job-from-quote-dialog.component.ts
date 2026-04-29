import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { QuoteWorkflow, WorkflowStatus } from '../../../models/quote-workflow.model';
import * as QuoteActions from '../../../state/quotes/quote.actions';
import * as QuoteSelectors from '../../../state/quotes/quote.selectors';

/**
 * Dialog for creating a Job from an existing delivered Quote.
 *
 * Shows a list of quotes with status Quote_Delivered that haven't
 * been converted yet. Selecting a quote navigates to its workflow
 * view at the Convert to Job step.
 */
@Component({
  selector: 'app-create-job-from-quote-dialog',
  template: `
    <h2 mat-dialog-title>Create Job from Quote</h2>
    <mat-dialog-content>
      <p class="dialog-description">
        Select a delivered quote to convert into a job.
      </p>

      <!-- Loading -->
      <div class="dialog-loading" *ngIf="loading$ | async">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <!-- Quote List -->
      <div class="quote-select-list" *ngIf="!(loading$ | async)">
        <div
          *ngFor="let quote of deliveredQuotes$ | async"
          class="quote-select-item"
          (click)="selectQuote(quote)"
          (keydown.enter)="selectQuote(quote)"
          role="button"
          tabindex="0"
        >
          <div class="quote-select-info">
            <span class="quote-project">{{ quote.rfpRecord.projectName }}</span>
            <span class="quote-client">{{ quote.rfpRecord.clientName }}</span>
          </div>
          <mat-icon class="quote-select-arrow">chevron_right</mat-icon>
        </div>

        <div class="empty-state" *ngIf="(deliveredQuotes$ | async)?.length === 0">
          <mat-icon>info</mat-icon>
          <p>No delivered quotes available for conversion.</p>
          <p class="empty-hint">Quotes must be delivered to a customer before they can be converted to jobs.</p>
        </div>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-description {
      margin: 0 0 16px;
      color: rgba(0, 0, 0, 0.6);
      font-size: 14px;
    }
    .dialog-loading {
      display: flex;
      justify-content: center;
      padding: 24px;
    }
    .quote-select-list {
      max-height: 400px;
      overflow-y: auto;
    }
    .quote-select-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      margin-bottom: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .quote-select-item:hover {
      background-color: #e3f2fd;
      border-color: #1976d2;
    }
    .quote-select-item:focus {
      outline: 2px solid #1976d2;
      outline-offset: 2px;
    }
    .quote-select-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .quote-project {
      font-weight: 600;
      font-size: 14px;
      color: #1976d2;
    }
    .quote-client {
      font-size: 13px;
      color: #666;
    }
    .quote-select-arrow {
      color: #9e9e9e;
    }
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 24px 16px;
      text-align: center;
      color: rgba(0, 0, 0, 0.54);
    }
    .empty-state mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: rgba(0, 0, 0, 0.26);
      margin-bottom: 8px;
    }
    .empty-state p {
      margin: 0 0 4px;
      font-size: 14px;
    }
    .empty-hint {
      font-size: 12px;
      color: rgba(0, 0, 0, 0.38);
    }
    mat-dialog-content {
      min-width: 400px;
    }
  `]
})
export class CreateJobFromQuoteDialogComponent implements OnInit, OnDestroy {
  deliveredQuotes$!: Observable<QuoteWorkflow[]>;
  loading$!: Observable<boolean>;

  private destroy$ = new Subject<void>();

  constructor(
    private dialogRef: MatDialogRef<CreateJobFromQuoteDialogComponent>,
    private store: Store,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Load quotes if not already loaded
    this.store.dispatch(QuoteActions.loadQuotes({}));

    this.loading$ = this.store.select(QuoteSelectors.selectQuoteLoading);

    // Filter to only show delivered quotes (not yet converted)
    this.deliveredQuotes$ = this.store.select(QuoteSelectors.selectQuotesDelivered);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  selectQuote(quote: QuoteWorkflow): void {
    this.dialogRef.close();
    // Navigate to the quote workflow view — the container component
    // will render the ConvertToJob step since status is Quote_Delivered
    this.router.navigate(['/field-resource-management/quotes', quote.id]);
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
