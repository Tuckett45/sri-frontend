import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { QuoteWorkflow, WorkflowStatus } from '../../../models/quote-workflow.model';
import * as QuoteActions from '../../../state/quotes/quote.actions';
import * as QuoteSelectors from '../../../state/quotes/quote.selectors';

/**
 * Quote List Component
 *
 * Displays all quotes the user has permission to view in a card/list format.
 * Supports filtering by workflow status (used by pipeline dashboard navigation).
 * Clicking a quote navigates to its workflow view.
 *
 * Requirements: 12.1
 */
@Component({
  selector: 'app-quote-list',
  templateUrl: './quote-list.component.html',
  styleUrls: ['./quote-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuoteListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Observable data from NgRx store
  quotes$: Observable<QuoteWorkflow[]>;
  loading$: Observable<boolean>;
  error$: Observable<string | null>;

  // Filter state
  selectedStatus: WorkflowStatus | null = null;

  // Enum reference for template
  WorkflowStatus = WorkflowStatus;
  statusOptions = Object.values(WorkflowStatus);

  // Filtered quotes for display
  displayedQuotes: QuoteWorkflow[] = [];

  constructor(
    private store: Store,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.quotes$ = this.store.select(QuoteSelectors.selectAllQuotes);
    this.loading$ = this.store.select(QuoteSelectors.selectQuoteLoading);
    this.error$ = this.store.select(QuoteSelectors.selectQuoteError);
  }

  ngOnInit(): void {
    // Read status filter from query params (pipeline dashboard navigation)
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['status']) {
        this.selectedStatus = params['status'] as WorkflowStatus;
      }
    });

    // Load quotes
    this.store.dispatch(QuoteActions.loadQuotes({ filters: {} }));

    // Subscribe to quotes and apply local filtering
    this.quotes$.pipe(takeUntil(this.destroy$)).subscribe(quotes => {
      this.applyFilter(quotes);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Apply the current status filter to the quotes list
   */
  private applyFilter(quotes: QuoteWorkflow[]): void {
    if (this.selectedStatus) {
      this.displayedQuotes = quotes.filter(
        q => q.workflowStatus === this.selectedStatus
      );
    } else {
      this.displayedQuotes = quotes;
    }
  }

  /**
   * Handle status filter change from the dropdown
   */
  onStatusFilterChange(): void {
    // Update URL query params
    const queryParams: Record<string, string> = {};
    if (this.selectedStatus) {
      queryParams['status'] = this.selectedStatus;
    }
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge'
    });

    // Re-apply filter with current quotes
    this.quotes$.pipe(takeUntil(this.destroy$)).subscribe(quotes => {
      this.applyFilter(quotes);
    });
  }

  /**
   * Clear the status filter
   */
  clearFilter(): void {
    this.selectedStatus = null;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { status: null },
      queryParamsHandling: 'merge'
    });
    this.quotes$.pipe(takeUntil(this.destroy$)).subscribe(quotes => {
      this.applyFilter(quotes);
    });
  }

  /**
   * Navigate to the quote workflow view
   */
  viewQuote(quote: QuoteWorkflow): void {
    this.router.navigate(
      ['/field-resource-management/quotes', quote.id]
    );
  }

  /**
   * Navigate to create a new quote
   */
  createQuote(): void {
    this.router.navigate(['/field-resource-management/quotes/new']);
  }

  /**
   * Retry loading quotes after an error
   */
  retryLoad(): void {
    this.store.dispatch(QuoteActions.loadQuotes({ filters: {} }));
  }

  /**
   * Format an ISO date string for display
   */
  formatDate(isoDate: string): string {
    return new Date(isoDate).toLocaleDateString();
  }

  /**
   * Get a human-readable label for a workflow status
   */
  getStatusLabel(status: WorkflowStatus): string {
    const labels: Record<WorkflowStatus, string> = {
      [WorkflowStatus.Draft]: 'Draft',
      [WorkflowStatus.Job_Summary_In_Progress]: 'Job Summary In Progress',
      [WorkflowStatus.BOM_In_Progress]: 'BOM In Progress',
      [WorkflowStatus.Pending_Validation]: 'Pending Validation',
      [WorkflowStatus.Validation_Approved]: 'Validation Approved',
      [WorkflowStatus.Validation_Rejected]: 'Validation Rejected',
      [WorkflowStatus.Quote_Assembled]: 'Quote Assembled',
      [WorkflowStatus.Quote_Delivered]: 'Quote Delivered',
      [WorkflowStatus.Quote_Converted]: 'Quote Converted'
    };
    return labels[status] || status;
  }

  /**
   * Get CSS class for a workflow status badge
   */
  getStatusClass(status: WorkflowStatus): string {
    const classMap: Record<WorkflowStatus, string> = {
      [WorkflowStatus.Draft]: 'status-draft',
      [WorkflowStatus.Job_Summary_In_Progress]: 'status-in-progress',
      [WorkflowStatus.BOM_In_Progress]: 'status-in-progress',
      [WorkflowStatus.Pending_Validation]: 'status-pending',
      [WorkflowStatus.Validation_Approved]: 'status-approved',
      [WorkflowStatus.Validation_Rejected]: 'status-rejected',
      [WorkflowStatus.Quote_Assembled]: 'status-assembled',
      [WorkflowStatus.Quote_Delivered]: 'status-delivered',
      [WorkflowStatus.Quote_Converted]: 'status-converted'
    };
    return classMap[status] || '';
  }
}
