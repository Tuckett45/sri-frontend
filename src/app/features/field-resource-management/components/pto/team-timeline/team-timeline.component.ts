import { Component, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

import { PtoRequest, RequestStatus } from '../../../models/pto.models';
import { SUPPORTED_MARKETS, SupportedMarket } from '../../../models/overtime.models';
import * as PtoActions from '../../../state/pto/pto.actions';
import { selectAllPtoRequests } from '../../../state/pto/pto.selectors';

/**
 * Timeline entry for display
 */
interface TimelineEntry {
  id: string;
  employeeName: string;
  startDate: Date;
  endDate: Date;
  market: string;
  leftPercent: number;
  widthPercent: number;
  color: string;
}

/**
 * Market group for timeline display
 */
interface MarketGroup {
  market: string;
  entries: TimelineEntry[];
}

/**
 * Team Timeline Component
 *
 * Displays a visual timeline (similar to the Google Sheets Timeline view)
 * showing who is off when, grouped by market.
 *
 * Features:
 * - Quarter-based horizontal timeline for the year
 * - Entries positioned by start/end date
 * - Color-coded blocks per person
 * - Grouped by market (Nevada, Utah/Idaho, Arizona, etc.)
 * - Navigation: Today button, quarter view toggle
 * - Filter by market
 */
@Component({
  selector: 'app-team-timeline',
  templateUrl: './team-timeline.component.html',
  styleUrls: ['./team-timeline.component.scss']
})
export class TeamTimelineComponent implements OnInit {
  /** All approved PTO requests */
  allRequests$!: Observable<PtoRequest[]>;

  /** Market groups for display */
  marketGroups$!: Observable<MarketGroup[]>;

  /** Current year being viewed */
  currentYear = new Date().getFullYear();

  /** View mode: 'quarters' or 'months' */
  viewMode: 'quarters' | 'months' = 'quarters';

  /** Selected market filter (empty = all) */
  selectedMarket$ = new BehaviorSubject<string>('');

  /** Available markets */
  markets = SUPPORTED_MARKETS;

  /** Quarter labels */
  quarters = ['Q1', 'Q2', 'Q3', 'Q4'];

  /** Month labels */
  months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /** Color palette for timeline entries */
  private colorPalette = [
    '#4285f4', '#ea4335', '#fbbc04', '#34a853',
    '#ff6d01', '#46bdc6', '#7baaf7', '#f07b72',
    '#fdd663', '#57bb8a', '#ff8a65', '#4dd0e1',
    '#9575cd', '#f06292', '#aed581', '#ffd54f'
  ];

  /** Track color assignments per employee */
  private employeeColorMap = new Map<string, string>();
  private colorIndex = 0;

  constructor(private store: Store) {}

  ngOnInit(): void {
    this.store.dispatch(PtoActions.loadRequests());
    this.allRequests$ = this.store.select(selectAllPtoRequests);

    this.marketGroups$ = combineLatest([
      this.allRequests$,
      this.selectedMarket$
    ]).pipe(
      map(([requests, marketFilter]) => this.buildTimeline(requests, marketFilter))
    );
  }

  /**
   * Navigate to previous year
   */
  prevYear(): void {
    this.currentYear--;
    // Trigger recalculation
    this.selectedMarket$.next(this.selectedMarket$.value);
  }

  /**
   * Navigate to next year
   */
  nextYear(): void {
    this.currentYear++;
    this.selectedMarket$.next(this.selectedMarket$.value);
  }

  /**
   * Jump to current date (today)
   */
  goToToday(): void {
    this.currentYear = new Date().getFullYear();
    this.selectedMarket$.next(this.selectedMarket$.value);
  }

  /**
   * Set view mode
   */
  setViewMode(mode: 'quarters' | 'months'): void {
    this.viewMode = mode;
  }

  /**
   * Filter by market
   */
  filterByMarket(market: string): void {
    this.selectedMarket$.next(market);
  }

  /**
   * Get the left position percent for "today" indicator
   */
  getTodayPosition(): number {
    const today = new Date();
    if (today.getFullYear() !== this.currentYear) return -1;
    const yearStart = new Date(this.currentYear, 0, 1);
    const yearEnd = new Date(this.currentYear, 11, 31);
    const totalDays = this.daysBetween(yearStart, yearEnd);
    const elapsed = this.daysBetween(yearStart, today);
    return (elapsed / totalDays) * 100;
  }

  /**
   * Get quarter boundary positions (25%, 50%, 75%)
   */
  getQuarterPositions(): number[] {
    return [25, 50, 75];
  }

  /**
   * Get month boundary positions
   */
  getMonthPositions(): { left: number; label: string }[] {
    const positions: { left: number; label: string }[] = [];
    for (let m = 0; m < 12; m++) {
      const monthStart = new Date(this.currentYear, m, 1);
      const yearStart = new Date(this.currentYear, 0, 1);
      const yearEnd = new Date(this.currentYear, 11, 31);
      const totalDays = this.daysBetween(yearStart, yearEnd);
      const elapsed = this.daysBetween(yearStart, monthStart);
      positions.push({
        left: (elapsed / totalDays) * 100,
        label: this.months[m]
      });
    }
    return positions;
  }

  /**
   * Format date range for display
   */
  formatDateRange(entry: TimelineEntry): string {
    const start = entry.startDate;
    const end = entry.endDate;
    const startStr = `${this.months[start.getMonth()]} ${start.getDate()}`;
    const endStr = `${this.months[end.getMonth()]} ${end.getDate()}`;
    return `${startStr} - ${endStr}`;
  }

  /**
   * Track by function for market groups
   */
  trackByMarket(_index: number, group: MarketGroup): string {
    return group.market;
  }

  /**
   * Track by function for timeline entries
   */
  trackByEntry(_index: number, entry: TimelineEntry): string {
    return entry.id;
  }

  /**
   * Build timeline data from approved PTO requests
   */
  private buildTimeline(requests: PtoRequest[], marketFilter: string): MarketGroup[] {
    // Filter to approved requests in the current year
    const yearStart = new Date(this.currentYear, 0, 1);
    const yearEnd = new Date(this.currentYear, 11, 31);

    const filteredRequests = requests.filter(r => {
      if (r.status !== RequestStatus.Approved) return false;
      const start = new Date(r.startDate);
      const end = new Date(r.endDate);
      // Must overlap with current year
      return start <= yearEnd && end >= yearStart;
    });

    // Group by market (using requestType as the market field from the form)
    const marketMap = new Map<string, PtoRequest[]>();

    for (const req of filteredRequests) {
      const market = req.requestType || 'Other';
      if (marketFilter && market !== marketFilter) continue;

      if (!marketMap.has(market)) {
        marketMap.set(market, []);
      }
      marketMap.get(market)!.push(req);
    }

    // Build groups
    const groups: MarketGroup[] = [];
    const totalDays = this.daysBetween(yearStart, yearEnd);

    marketMap.forEach((reqs, market) => {
      const entries: TimelineEntry[] = reqs.map(req => {
        const start = new Date(req.startDate);
        const end = new Date(req.endDate);

        // Clamp to year boundaries
        const clampedStart = start < yearStart ? yearStart : start;
        const clampedEnd = end > yearEnd ? yearEnd : end;

        const leftDays = this.daysBetween(yearStart, clampedStart);
        const widthDays = this.daysBetween(clampedStart, clampedEnd) + 1;

        return {
          id: req.id,
          employeeName: req.employeeName || 'Unknown',
          startDate: start,
          endDate: end,
          market,
          leftPercent: (leftDays / totalDays) * 100,
          widthPercent: Math.max((widthDays / totalDays) * 100, 0.5),
          color: this.getEmployeeColor(req.employeeName)
        };
      });

      // Sort entries by start date
      entries.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

      groups.push({ market, entries });
    });

    // Sort groups alphabetically
    groups.sort((a, b) => a.market.localeCompare(b.market));

    return groups;
  }

  /**
   * Get a consistent color for an employee
   */
  private getEmployeeColor(name: string): string {
    if (!this.employeeColorMap.has(name)) {
      this.employeeColorMap.set(name, this.colorPalette[this.colorIndex % this.colorPalette.length]);
      this.colorIndex++;
    }
    return this.employeeColorMap.get(name)!;
  }

  /**
   * Calculate days between two dates
   */
  private daysBetween(start: Date, end: Date): number {
    const msPerDay = 86400000;
    return Math.floor((end.getTime() - start.getTime()) / msPerDay);
  }
}
