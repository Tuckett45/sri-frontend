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

import { DashboardQuote } from '../../../models/quote-workflow.model';
import * as DashboardSelectors from '../../../state/quotes/dashboard.selectors';

/**
 * Pipeline category definition used by the template.
 */
export interface PipelineCategory {
  key: string;
  label: string;
  icon: string;
  colorClass: string;
  quotes$: Observable<DashboardQuote[]>;
  count$: Observable<number>;
  /** Tab parameter for navigation */
  tabParam: string;
}

/**
 * Quote Pipeline Dashboard Widget
 *
 * Displays pipeline categories with counts derived from the same
 * dashboard data source that powers the KPI cards above.
 * This ensures the pipeline counts are consistent with the KPIs.
 *
 * Data source: DashboardSelectors (from /quotes/dashboard API)
 *   - rfpRecords → RFPs Received + Quotes in Progress + Quotes Delivered
 *   - poTrackingRecords → PO Needed
 *   - projectTrackingRecords → Quotes Converted to Job
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
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Use the same dashboard loading/error state as the KPI cards
    this.loading$ = this.store.select(DashboardSelectors.selectDashboardLoading);
    this.error$ = this.store.select(DashboardSelectors.selectDashboardError);

    // Use the same dashboard data that powers the KPI cards
    const rfpRecords$ = this.store.select(DashboardSelectors.selectRfpRecords);
    const poTrackingRecords$ = this.store.select(DashboardSelectors.selectPoTrackingRecords);
    const projectTrackingRecords$ = this.store.select(DashboardSelectors.selectProjectTrackingRecords);

    // RFPs Received: all rfpRecords (matches "Active RFPs" KPI)
    const rfpsReceived$ = rfpRecords$;

    // Quotes in Progress: rfpRecords that don't yet have a quoteSubmittedDate
    const quotesInProgress$ = rfpRecords$.pipe(
      map(records => records.filter(r => !r.quoteSubmittedDate))
    );

    // Quotes Delivered: rfpRecords that have a quoteSubmittedDate
    const quotesDelivered$ = rfpRecords$.pipe(
      map(records => records.filter(r => !!r.quoteSubmittedDate))
    );

    // PO Needed: poTrackingRecords (matches "POs Received" KPI)
    const poNeeded$ = poTrackingRecords$;

    // Quotes Converted to Job: projectTrackingRecords (matches "Active Projects" KPI)
    const quotesConverted$ = projectTrackingRecords$;

    this.categories = [
      {
        key: 'rfpsReceived',
        label: 'RFPs Received',
        icon: 'inbox',
        colorClass: 'category-rfps',
        quotes$: rfpsReceived$,
        count$: rfpsReceived$.pipe(map(q => q.length)),
        tabParam: 'rfps'
      },
      {
        key: 'quotesInProgress',
        label: 'Quotes in Progress',
        icon: 'build',
        colorClass: 'category-quotes-in-progress',
        quotes$: quotesInProgress$,
        count$: quotesInProgress$.pipe(map(q => q.length)),
        tabParam: 'rfps'
      },
      {
        key: 'quotesDelivered',
        label: 'Quotes Delivered',
        icon: 'send',
        colorClass: 'category-delivered',
        quotes$: quotesDelivered$,
        count$: quotesDelivered$.pipe(map(q => q.length)),
        tabParam: 'rfps'
      },
      {
        key: 'poNeeded',
        label: 'PO Needed',
        icon: 'receipt_long',
        colorClass: 'category-po-needed',
        quotes$: poNeeded$,
        count$: poNeeded$.pipe(map(q => q.length)),
        tabParam: 'po'
      },
      {
        key: 'quotesConverted',
        label: 'Quotes Converted to Job',
        icon: 'swap_horiz',
        colorClass: 'category-converted',
        quotes$: quotesConverted$,
        count$: quotesConverted$.pipe(map(q => q.length)),
        tabParam: 'projects'
      }
    ];
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
   * Navigates to the appropriate tab filtered by category.
   */
  navigateToFilteredList(category: PipelineCategory): void {
    this.router.navigate(['/field-resource-management/quotes'], {
      queryParams: { tab: category.tabParam }
    });
  }

  // ---------------------------------------------------------------------------
  // Template Helpers
  // ---------------------------------------------------------------------------

  /**
   * Returns the oldest RFP received date from a set of dashboard quotes.
   */
  getOldestDate(quotes: DashboardQuote[]): string | null {
    if (!quotes.length) return null;
    const dates = quotes
      .map(q => q.rfpReceiveDate)
      .filter((d): d is string => !!d)
      .sort();
    return dates.length > 0 ? dates[0] : null;
  }

  /**
   * Returns the total PO value for quotes that have a PO amount.
   */
  getCategoryTotal(quotes: DashboardQuote[]): number | null {
    const total = quotes.reduce((sum, q) => sum + (q.poAmount || 0), 0);
    return total > 0 ? total : null;
  }

  /**
   * Navigate to the relevant tab and highlight the specific quote row.
   */
  navigateToTab(category: PipelineCategory, quote: DashboardQuote): void {
    this.router.navigate(['/field-resource-management/quotes'], {
      queryParams: { tab: category.tabParam, highlight: quote.id }
    });
  }

  /**
   * Retry loading - dispatches a dashboard reload via parent component's refresh
   */
  retry(): void {
    // The dashboard data is loaded by the parent RFP Dashboard component.
    // Triggering a navigation refresh to reload the dashboard.
    this.router.navigate(['/field-resource-management/quotes'], {
      queryParams: { refresh: Date.now() }
    });
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
  trackByQuote(_index: number, quote: DashboardQuote): string {
    return quote.id;
  }
}
