import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';

import { QuoteWorkflow, WorkflowStatus } from '../../../models/quote-workflow.model';
import * as QuoteActions from '../../../state/quotes/quote.actions';
import * as QuoteSelectors from '../../../state/quotes/quote.selectors';
import { FrmSignalRService } from '../../../services/frm-signalr.service';

/**
 * Pipeline category definition used by the template.
 */
export interface PipelineCategory {
  key: string;
  label: string;
  icon: string;
  colorClass: string;
  quotes$: Observable<QuoteWorkflow[]>;
  count$: Observable<number>;
  /** WorkflowStatus values that map to this category (used for filtered navigation) */
  statuses: WorkflowStatus[];
}

/**
 * Quote Pipeline Dashboard Widget
 *
 * Displays six pipeline categories with counts and clickable quote lists
 * on the FRM home dashboard. Subscribes to NgRx selectors for pipeline
 * data and to SignalR for real-time updates.
 *
 * Requirements: 8.4–8.14
 */
@Component({
  selector: 'app-quote-pipeline-dashboard',
  templateUrl: './quote-pipeline-dashboard.component.html',
  styleUrls: ['./quote-pipeline-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuotePipelineDashboardComponent implements OnInit, OnDestroy {
  categories: PipelineCategory[] = [];
  loading$!: Observable<boolean>;
  error$!: Observable<string | null>;

  /** Tracks which category is currently expanded */
  expandedCategory: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private store: Store,
    private router: Router,
    private signalRService: FrmSignalRService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Dispatch loadQuotes to ensure pipeline data is available
    this.store.dispatch(QuoteActions.loadQuotes({}));

    this.loading$ = this.store.select(QuoteSelectors.selectQuoteLoading);
    this.error$ = this.store.select(QuoteSelectors.selectQuoteError);

    // Build the six pipeline categories from NgRx selectors
    const rfpsReceived$ = this.store.select(QuoteSelectors.selectRfpsReceived);
    const bomsNotReady$ = this.store.select(QuoteSelectors.selectBomsNotReady);
    const bomsReady$ = this.store.select(QuoteSelectors.selectBomsReady);
    const quotesReadyForCustomer$ = this.store.select(QuoteSelectors.selectQuotesReadyForCustomer);
    const quotesDelivered$ = this.store.select(QuoteSelectors.selectQuotesDelivered);
    const quotesConverted$ = this.store.select(QuoteSelectors.selectQuotesConverted);

    this.categories = [
      {
        key: 'rfpsReceived',
        label: 'RFPs Received',
        icon: 'inbox',
        colorClass: 'category-rfps',
        quotes$: rfpsReceived$,
        count$: rfpsReceived$.pipe(map(q => q.length)),
        statuses: [WorkflowStatus.Draft, WorkflowStatus.Job_Summary_In_Progress]
      },
      {
        key: 'bomsNotReady',
        label: 'BOMs Not Ready',
        icon: 'warning',
        colorClass: 'category-boms-not-ready',
        quotes$: bomsNotReady$,
        count$: bomsNotReady$.pipe(map(q => q.length)),
        statuses: [WorkflowStatus.BOM_In_Progress, WorkflowStatus.Validation_Rejected]
      },
      {
        key: 'bomsReady',
        label: 'BOMs Ready',
        icon: 'check_circle',
        colorClass: 'category-boms-ready',
        quotes$: bomsReady$,
        count$: bomsReady$.pipe(map(q => q.length)),
        statuses: [WorkflowStatus.Pending_Validation, WorkflowStatus.Validation_Approved]
      },
      {
        key: 'quotesReadyForCustomer',
        label: 'Quotes Ready for Customer',
        icon: 'description',
        colorClass: 'category-quotes-ready',
        quotes$: quotesReadyForCustomer$,
        count$: quotesReadyForCustomer$.pipe(map(q => q.length)),
        statuses: [WorkflowStatus.Quote_Assembled]
      },
      {
        key: 'quotesDelivered',
        label: 'Quotes Delivered',
        icon: 'send',
        colorClass: 'category-delivered',
        quotes$: quotesDelivered$,
        count$: quotesDelivered$.pipe(map(q => q.length)),
        statuses: [WorkflowStatus.Quote_Delivered]
      },
      {
        key: 'quotesConverted',
        label: 'Quotes Converted to Job',
        icon: 'swap_horiz',
        colorClass: 'category-converted',
        quotes$: quotesConverted$,
        count$: quotesConverted$.pipe(map(q => q.length)),
        statuses: [WorkflowStatus.Quote_Converted]
      }
    ];

    // Subscribe to SignalR for real-time quote updates
    this.signalRService.quoteUpdated$
      .pipe(
        takeUntil(this.destroy$)
      )
      .subscribe(update => {
        if (update) {
          // The SignalR handler dispatches quoteUpdatedRemotely to the store,
          // so selectors update automatically. Mark for change detection.
          this.cdr.markForCheck();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ---------------------------------------------------------------------------
  // Category Interaction
  // ---------------------------------------------------------------------------

  /**
   * Toggles the expanded state of a pipeline category.
   */
  toggleCategory(categoryKey: string): void {
    this.expandedCategory = this.expandedCategory === categoryKey ? null : categoryKey;
  }

  /**
   * Navigates to the quote list filtered by the given category's statuses.
   */
  navigateToFilteredList(category: PipelineCategory): void {
    this.router.navigate(['/field-resource-management/quotes'], {
      queryParams: { status: category.statuses.join(',') }
    });
  }

  /**
   * Navigates to the workflow view for a specific quote.
   */
  navigateToQuote(quoteId: string): void {
    this.router.navigate(['/field-resource-management/quotes', quoteId]);
  }

  // ---------------------------------------------------------------------------
  // Template Helpers
  // ---------------------------------------------------------------------------

  /**
   * Returns a display label for the workflow status.
   */
  getStatusLabel(status: WorkflowStatus): string {
    switch (status) {
      case WorkflowStatus.Draft: return 'Draft';
      case WorkflowStatus.Job_Summary_In_Progress: return 'Job Summary';
      case WorkflowStatus.BOM_In_Progress: return 'BOM In Progress';
      case WorkflowStatus.Pending_Validation: return 'Pending Validation';
      case WorkflowStatus.Validation_Approved: return 'Approved';
      case WorkflowStatus.Validation_Rejected: return 'Rejected';
      case WorkflowStatus.Quote_Assembled: return 'Assembled';
      case WorkflowStatus.Quote_Delivered: return 'Delivered';
      case WorkflowStatus.Quote_Converted: return 'Converted';
      default: return status;
    }
  }

  /**
   * Retry loading quotes after an error.
   */
  retry(): void {
    this.store.dispatch(QuoteActions.loadQuotes({}));
  }

  /**
   * TrackBy function for category list rendering.
   */
  trackByCategory(_index: number, category: PipelineCategory): string {
    return category.key;
  }

  /**
   * TrackBy function for quote list rendering.
   */
  trackByQuote(_index: number, quote: QuoteWorkflow): string {
    return quote.id;
  }
}
