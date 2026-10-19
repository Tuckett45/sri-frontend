import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';
import { Store } from '@ngrx/store';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Observable, Subject } from 'rxjs';
import { takeUntil, map } from 'rxjs/operators';

import {
  ReconciliationReport,
  ReconciliationDiscrepancy,
  ReconciliationSummary
} from '../../../models/qr-timekeeping.model';
import * as QrTimekeepingActions from '../../../state/qr-timekeeping/qr-timekeeping.actions';
import {
  selectSelectedReport,
  selectDiscrepancies,
  selectReportSummary,
  selectReconciliationLoading
} from '../../../state/qr-timekeeping/qr-timekeeping.selectors';
import {
  ResolveDiscrepancyDialogComponent,
  EscalateDiscrepancyDialogComponent
} from '../reconciliation-view/reconciliation-view.component';

/**
 * Reconciliation Detail Component
 *
 * Displays a single reconciliation report's full details when
 * navigating to /reconciliation/:reportId. Shows report metadata,
 * summary statistics, and the complete list of discrepancies with
 * resolve/escalate actions.
 *
 * Requirements: 10.5, 10.6, 11.1-11.6, 15.2
 */
@Component({
  selector: 'app-reconciliation-detail',
  templateUrl: './reconciliation-detail.component.html',
  styleUrls: ['./reconciliation-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReconciliationDetailComponent implements OnInit, OnDestroy {
  // ─── Observables ──────────────────────────────────────────────────────────
  report$: Observable<ReconciliationReport | null>;
  discrepancies$: Observable<ReconciliationDiscrepancy[]>;
  summary$: Observable<ReconciliationSummary | null>;
  loading$: Observable<boolean>;

  // ─── State ────────────────────────────────────────────────────────────────
  reportId: string = '';
  typeFilter: 'all' | 'hours' | 'category' | 'both' = 'all';
  filteredDiscrepancies$: Observable<ReconciliationDiscrepancy[]>;

  displayedColumns: string[] = [
    'technicianName', 'workDate', 'atlasHours', 'celerityHours',
    'hoursVariance', 'discrepancyType', 'status', 'actions'
  ];

  // ─── Virtual scroll ───────────────────────────────────────────────────────
  useVirtualScroll: boolean = false;
  private static readonly VIRTUAL_SCROLL_THRESHOLD = 1000;

  private destroy$ = new Subject<void>();

  constructor(
    private store: Store,
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) {
    this.report$ = this.store.select(selectSelectedReport);
    this.discrepancies$ = this.store.select(selectDiscrepancies);
    this.summary$ = this.store.select(selectReportSummary);
    this.loading$ = this.store.select(selectReconciliationLoading);
    this.filteredDiscrepancies$ = this.discrepancies$.pipe(
      map(d => this.applyTypeFilter(d))
    );
  }

  ngOnInit(): void {
    this.route.params.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      this.reportId = params['reportId'];
      if (this.reportId) {
        this.store.dispatch(QrTimekeepingActions.loadReport({ reportId: this.reportId }));
      }
    });

    // Monitor discrepancy count for virtual scrolling
    this.discrepancies$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(discrepancies => {
      this.useVirtualScroll = discrepancies.length > ReconciliationDetailComponent.VIRTUAL_SCROLL_THRESHOLD;
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Navigate back to reconciliation list.
   */
  goBack(): void {
    this.router.navigate(['/frm/qr-timekeeping/reconciliation']);
  }

  /**
   * Filters discrepancies by type.
   */
  filterDiscrepancies(type: string): void {
    this.typeFilter = type as 'all' | 'hours' | 'category' | 'both';
    this.filteredDiscrepancies$ = this.discrepancies$.pipe(
      map(d => this.applyTypeFilter(d))
    );
    this.cdr.markForCheck();
  }

  /**
   * Opens resolve modal for a discrepancy.
   * Requirement: 11.3
   */
  openResolveDialog(discrepancy: ReconciliationDiscrepancy): void {
    const dialogRef = this.dialog.open(ResolveDiscrepancyDialogComponent, {
      width: '500px',
      data: { discrepancy }
    });

    dialogRef.afterClosed().pipe(
      takeUntil(this.destroy$)
    ).subscribe(result => {
      if (result?.note) {
        this.store.dispatch(QrTimekeepingActions.resolveDiscrepancy({
          discrepancyId: discrepancy.id,
          request: { resolutionNote: result.note }
        }));
      }
    });
  }

  /**
   * Opens escalate dialog for a discrepancy.
   * Requirement: 11.5
   */
  openEscalateDialog(discrepancy: ReconciliationDiscrepancy): void {
    const dialogRef = this.dialog.open(EscalateDiscrepancyDialogComponent, {
      width: '450px',
      data: { discrepancy }
    });

    dialogRef.afterClosed().pipe(
      takeUntil(this.destroy$)
    ).subscribe(result => {
      if (result?.supervisorId) {
        this.store.dispatch(QrTimekeepingActions.escalateDiscrepancy({
          discrepancyId: discrepancy.id,
          request: { supervisorId: result.supervisorId }
        }));
      }
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private applyTypeFilter(discrepancies: ReconciliationDiscrepancy[]): ReconciliationDiscrepancy[] {
    if (this.typeFilter === 'all') return discrepancies;
    return discrepancies.filter(d =>
      d.discrepancyType.toLowerCase() === this.typeFilter
    );
  }

  getTypeClass(type: string): string {
    switch (type) {
      case 'Hours': return 'type-hours';
      case 'Category': return 'type-category';
      case 'Both': return 'type-both';
      default: return '';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Pending': return 'status-pending';
      case 'Resolved': return 'status-resolved';
      case 'Escalated': return 'status-escalated';
      default: return '';
    }
  }

  isReportValid(summary: ReconciliationSummary): boolean {
    return (summary.matchCount + summary.discrepancyCount) === summary.totalRecords;
  }
}
