import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';
import { Store } from '@ngrx/store';
import { MatDialog } from '@angular/material/dialog';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Observable, Subject } from 'rxjs';
import { takeUntil, map } from 'rxjs/operators';

import {
  ReconciliationReport,
  ReconciliationDiscrepancy,
  ReconciliationSummary,
  GenerateReportRequest
} from '../../../models/qr-timekeeping.model';
import * as QrTimekeepingActions from '../../../state/qr-timekeeping/qr-timekeeping.actions';
import {
  selectSelectedReport,
  selectDiscrepancies,
  selectReportSummary,
  selectGenerating,
  selectReconciliationLoading
} from '../../../state/qr-timekeeping/qr-timekeeping.selectors';

/**
 * Reconciliation View Component
 *
 * Admin view for generating and reviewing Atlas vs Celerity reconciliation reports
 * and managing discrepancies. Uses Angular CDK virtual scrolling for large lists.
 * Shows "Data may be stale" banner when offline.
 *
 * Requirements: 10.1-10.6, 11.1-11.6, 13.4, 15.2
 */
@Component({
  selector: 'app-reconciliation-view',
  templateUrl: './reconciliation-view.component.html',
  styleUrls: ['./reconciliation-view.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReconciliationViewComponent implements OnInit, OnDestroy {
  // ─── Observables ──────────────────────────────────────────────────────────
  selectedReport$: Observable<ReconciliationReport | null>;
  discrepancies$: Observable<ReconciliationDiscrepancy[]>;
  reportSummary$: Observable<ReconciliationSummary | null>;
  generating$: Observable<boolean>;
  loading$: Observable<boolean>;

  // ─── Report Generation Form ───────────────────────────────────────────────
  reportForm = new FormGroup({
    startDate: new FormControl<Date | null>(null, Validators.required),
    endDate: new FormControl<Date | null>(null, Validators.required)
  });
  dateValidationError: string | null = null;

  // ─── Discrepancy Filtering ────────────────────────────────────────────────
  typeFilter: 'all' | 'hours' | 'category' | 'both' = 'all';
  filteredDiscrepancies$: Observable<ReconciliationDiscrepancy[]>;

  // ─── Table Columns ────────────────────────────────────────────────────────
  displayedColumns: string[] = [
    'technicianName', 'workDate', 'atlasHours', 'celerityHours',
    'hoursVariance', 'discrepancyType', 'status', 'actions'
  ];

  // ─── Offline Status ───────────────────────────────────────────────────────
  isOffline: boolean = false;

  // ─── Virtual scroll threshold ─────────────────────────────────────────────
  useVirtualScroll: boolean = false;
  private static readonly VIRTUAL_SCROLL_THRESHOLD = 1000;

  private destroy$ = new Subject<void>();

  constructor(
    private store: Store,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) {
    this.selectedReport$ = this.store.select(selectSelectedReport);
    this.discrepancies$ = this.store.select(selectDiscrepancies);
    this.reportSummary$ = this.store.select(selectReportSummary);
    this.generating$ = this.store.select(selectGenerating);
    this.loading$ = this.store.select(selectReconciliationLoading);

    // Create filtered discrepancies observable
    this.filteredDiscrepancies$ = this.discrepancies$.pipe(
      map(discrepancies => this.applyTypeFilter(discrepancies))
    );
  }

  ngOnInit(): void {
    // Monitor online/offline status
    this.isOffline = !navigator.onLine;
    window.addEventListener('online', this.onOnline.bind(this));
    window.addEventListener('offline', this.onOffline.bind(this));

    // Monitor discrepancy count for virtual scrolling
    this.discrepancies$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(discrepancies => {
      this.useVirtualScroll = discrepancies.length > ReconciliationViewComponent.VIRTUAL_SCROLL_THRESHOLD;
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    window.removeEventListener('online', this.onOnline.bind(this));
    window.removeEventListener('offline', this.onOffline.bind(this));
  }

  // ─── Report Generation ────────────────────────────────────────────────────

  /**
   * Validates and generates a reconciliation report.
   * Requirements: 10.1, 10.2, 10.3
   */
  generateReport(): void {
    this.dateValidationError = null;
    const startDate = this.reportForm.get('startDate')?.value;
    const endDate = this.reportForm.get('endDate')?.value;

    if (!startDate || !endDate) {
      this.dateValidationError = 'Both start and end dates are required.';
      return;
    }

    // Validate start < end
    if (startDate >= endDate) {
      this.dateValidationError = 'Start date must be before end date.';
      return;
    }

    // Validate <= 90 days
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays > 90) {
      this.dateValidationError = 'Date range cannot exceed 90 days.';
      return;
    }

    const request: GenerateReportRequest = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    };

    this.store.dispatch(QrTimekeepingActions.generateReport({ request }));
  }

  /**
   * Whether the generate button should be disabled.
   * Requirement: 10.3
   */
  get isGenerateDisabled(): boolean {
    return this.reportForm.invalid || !!this.dateValidationError;
  }

  // ─── Discrepancy Management ───────────────────────────────────────────────

  /**
   * Filters discrepancies by type.
   * Requirement: 11.2
   */
  filterDiscrepancies(type: string): void {
    this.typeFilter = type as 'all' | 'hours' | 'category' | 'both';
    // Re-trigger the filtered observable
    this.filteredDiscrepancies$ = this.discrepancies$.pipe(
      map(discrepancies => this.applyTypeFilter(discrepancies))
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

  /**
   * Apply type filter to discrepancies.
   */
  private applyTypeFilter(discrepancies: ReconciliationDiscrepancy[]): ReconciliationDiscrepancy[] {
    if (this.typeFilter === 'all') return discrepancies;
    return discrepancies.filter(d =>
      d.discrepancyType.toLowerCase() === this.typeFilter
    );
  }

  /**
   * Returns CSS class for discrepancy type badge.
   */
  getTypeClass(type: string): string {
    switch (type) {
      case 'Hours': return 'type-hours';
      case 'Category': return 'type-category';
      case 'Both': return 'type-both';
      default: return '';
    }
  }

  /**
   * Returns CSS class for discrepancy status badge.
   */
  getStatusClass(status: string): string {
    switch (status) {
      case 'Pending': return 'status-pending';
      case 'Resolved': return 'status-resolved';
      case 'Escalated': return 'status-escalated';
      default: return '';
    }
  }

  /**
   * Verifies report integrity: matchCount + discrepancyCount === totalRecordsCompared.
   * Requirement: 10.6
   */
  isReportValid(summary: ReconciliationSummary): boolean {
    return (summary.matchCount + summary.discrepancyCount) === summary.totalRecords;
  }

  private onOnline(): void {
    this.isOffline = false;
    this.cdr.markForCheck();
  }

  private onOffline(): void {
    this.isOffline = true;
    this.cdr.markForCheck();
  }
}

// ─── Resolve Discrepancy Dialog ─────────────────────────────────────────────

import { Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder } from '@angular/forms';

/**
 * Resolve Discrepancy Dialog
 * Requires a resolution note (1-500 characters).
 * Requirement: 11.3
 */
@Component({
  selector: 'app-resolve-discrepancy-dialog',
  template: `
    <h2 mat-dialog-title>Resolve Discrepancy</h2>
    <mat-dialog-content>
      <p class="text-sm text-gray-600 mb-4">
        Technician: <strong>{{ data.discrepancy.technicianName }}</strong><br>
        Date: {{ data.discrepancy.workDate | date:'mediumDate' }}<br>
        Variance: {{ data.discrepancy.hoursVariance | number:'1.2-2' }} hours
      </p>
      <mat-form-field appearance="outline" class="w-full">
        <mat-label>Resolution Note</mat-label>
        <textarea matInput
                  [formControl]="noteControl"
                  rows="4"
                  maxlength="500"
                  placeholder="Explain how this discrepancy was resolved..."></textarea>
        <mat-hint align="end">{{ noteControl.value?.length || 0 }}/500</mat-hint>
        <mat-error *ngIf="noteControl.hasError('required')">Resolution note is required</mat-error>
        <mat-error *ngIf="noteControl.hasError('minlength')">Note must be at least 1 character</mat-error>
        <mat-error *ngIf="noteControl.hasError('maxlength')">Note cannot exceed 500 characters</mat-error>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary"
              [disabled]="noteControl.invalid"
              (click)="onSubmit()">
        Resolve
      </button>
    </mat-dialog-actions>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResolveDiscrepancyDialogComponent {
  noteControl = new FormControl('', [
    Validators.required,
    Validators.minLength(1),
    Validators.maxLength(500)
  ]);

  constructor(
    private dialogRef: MatDialogRef<ResolveDiscrepancyDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { discrepancy: ReconciliationDiscrepancy }
  ) {}

  onSubmit(): void {
    if (this.noteControl.valid) {
      this.dialogRef.close({ note: this.noteControl.value?.trim() });
    }
  }
}

// ─── Escalate Discrepancy Dialog ────────────────────────────────────────────

/**
 * Escalate Discrepancy Dialog
 * Requires supervisor selection.
 * Requirement: 11.5
 */
@Component({
  selector: 'app-escalate-discrepancy-dialog',
  template: `
    <h2 mat-dialog-title>Escalate Discrepancy</h2>
    <mat-dialog-content>
      <p class="text-sm text-gray-600 mb-4">
        Technician: <strong>{{ data.discrepancy.technicianName }}</strong><br>
        Type: {{ data.discrepancy.discrepancyType }}<br>
        Variance: {{ data.discrepancy.hoursVariance | number:'1.2-2' }} hours
      </p>
      <mat-form-field appearance="outline" class="w-full">
        <mat-label>Select Supervisor</mat-label>
        <mat-select [formControl]="supervisorControl">
          <mat-option *ngFor="let sup of supervisors" [value]="sup.id">
            {{ sup.name }}
          </mat-option>
        </mat-select>
        <mat-error *ngIf="supervisorControl.hasError('required')">
          Supervisor selection is required
        </mat-error>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="warn"
              [disabled]="supervisorControl.invalid"
              (click)="onSubmit()">
        Escalate
      </button>
    </mat-dialog-actions>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EscalateDiscrepancyDialogComponent {
  supervisorControl = new FormControl('', Validators.required);

  // In production, this would be loaded from a service
  supervisors = [
    { id: 'sup-001', name: 'John Smith (PM)' },
    { id: 'sup-002', name: 'Jane Doe (Site Lead)' },
    { id: 'sup-003', name: 'Bob Johnson (Director)' }
  ];

  constructor(
    private dialogRef: MatDialogRef<EscalateDiscrepancyDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { discrepancy: ReconciliationDiscrepancy }
  ) {}

  onSubmit(): void {
    if (this.supervisorControl.valid) {
      this.dialogRef.close({ supervisorId: this.supervisorControl.value });
    }
  }
}
