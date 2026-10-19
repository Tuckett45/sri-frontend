import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';
import { Store } from '@ngrx/store';
import { FormControl } from '@angular/forms';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AttendanceRecord, AttendanceSummary, AttendanceFilter } from '../../../models/qr-timekeeping.model';
import * as QrTimekeepingActions from '../../../state/qr-timekeeping/qr-timekeeping.actions';
import {
  selectAttendanceRecords,
  selectAttendanceSummary,
  selectAttendanceLoading
} from '../../../state/qr-timekeeping/qr-timekeeping.selectors';

/**
 * Attendance Dashboard Component
 *
 * Admin daily attendance view with filtering, summary stats, and CSV export.
 * Supports date picker (single/range), site filter, status filter tabs.
 * Displays "Data may be stale" banner when offline.
 *
 * Requirements: 9.1-9.8, 13.4
 */
@Component({
  selector: 'app-attendance-dashboard',
  templateUrl: './attendance-dashboard.component.html',
  styleUrls: ['./attendance-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AttendanceDashboardComponent implements OnInit, OnDestroy {
  // ─── Observables ──────────────────────────────────────────────────────────
  records$: Observable<AttendanceRecord[]>;
  summary$: Observable<AttendanceSummary | null>;
  loading$: Observable<boolean>;

  // ─── Filters ──────────────────────────────────────────────────────────────
  selectedDate = new FormControl<Date>(new Date());
  startDate = new FormControl<Date | null>(null);
  endDate = new FormControl<Date | null>(null);
  selectedSiteId: string | null = null;
  statusFilter: 'all' | 'present' | 'absent' | 'incomplete' = 'all';
  isRangeMode: boolean = false;
  dateRangeError: string | null = null;

  // ─── Table ────────────────────────────────────────────────────────────────
  displayedColumns: string[] = [
    'technicianName', 'checkInTime', 'checkOutTime',
    'status', 'totalHours', 'timeCategoryBreakdown', 'entryCount'
  ];

  // ─── Site Options ─────────────────────────────────────────────────────────
  availableSites = [
    { id: 'site-001', name: 'Downtown Office Tower' },
    { id: 'site-002', name: 'Northside Warehouse' },
    { id: 'site-003', name: 'Airport Terminal Renovation' }
  ];

  // ─── Offline Status ───────────────────────────────────────────────────────
  isOffline: boolean = false;

  private destroy$ = new Subject<void>();

  constructor(
    private store: Store,
    private cdr: ChangeDetectorRef
  ) {
    this.records$ = this.store.select(selectAttendanceRecords);
    this.summary$ = this.store.select(selectAttendanceSummary);
    this.loading$ = this.store.select(selectAttendanceLoading);
  }

  ngOnInit(): void {
    // Load initial attendance for today
    this.loadAttendance();

    // Monitor online/offline status
    this.isOffline = !navigator.onLine;
    window.addEventListener('online', this.onOnline.bind(this));
    window.addEventListener('offline', this.onOffline.bind(this));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    window.removeEventListener('online', this.onOnline.bind(this));
    window.removeEventListener('offline', this.onOffline.bind(this));
  }

  // ─── Filter Handlers ──────────────────────────────────────────────────────

  /**
   * Handles date change for single-day selection.
   * Requirement: 9.2
   */
  onDateChanged(): void {
    this.dateRangeError = null;
    this.loadAttendance();
  }

  /**
   * Handles date range changes with 90-day validation.
   * Requirements: 9.6, 9.7
   */
  onDateRangeChanged(): void {
    this.dateRangeError = null;

    const start = this.startDate.value;
    const end = this.endDate.value;

    if (start && end) {
      const diffMs = end.getTime() - start.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      if (diffDays > 90) {
        this.dateRangeError = 'Date range cannot exceed 90 days.';
        return;
      }

      if (diffDays < 0) {
        this.dateRangeError = 'Start date must be before end date.';
        return;
      }

      this.loadAttendance();
    }
  }

  /**
   * Handles site filter change.
   * Requirement: 9.3
   */
  onSiteChanged(siteId: string | null): void {
    this.selectedSiteId = siteId;
    this.loadAttendance();
  }

  /**
   * Handles status filter tab change.
   * Requirement: 9.4
   */
  onStatusFilterChanged(status: string): void {
    this.statusFilter = status as 'all' | 'present' | 'absent' | 'incomplete';
    this.cdr.markForCheck();
  }

  /**
   * Toggles between single-date and range mode.
   */
  toggleRangeMode(): void {
    this.isRangeMode = !this.isRangeMode;
    this.dateRangeError = null;
    if (!this.isRangeMode) {
      this.startDate.reset();
      this.endDate.reset();
      this.loadAttendance();
    }
  }

  // ─── Data Loading ─────────────────────────────────────────────────────────

  /**
   * Builds filters and dispatches the load attendance action.
   * Requirement: 9.1
   */
  private loadAttendance(): void {
    const filters: AttendanceFilter = {};

    if (this.isRangeMode && this.startDate.value && this.endDate.value) {
      filters.startDate = this.startDate.value.toISOString();
      filters.endDate = this.endDate.value.toISOString();
    } else if (this.selectedDate.value) {
      filters.date = this.selectedDate.value.toISOString().split('T')[0];
    }

    if (this.selectedSiteId) {
      filters.siteId = this.selectedSiteId;
    }

    this.store.dispatch(QrTimekeepingActions.loadAttendance({ filters }));

    // Also load summary for the selected date
    if (filters.date) {
      this.store.dispatch(QrTimekeepingActions.loadAttendanceSummary({ date: filters.date }));
    }
  }

  // ─── Filtering ────────────────────────────────────────────────────────────

  /**
   * Filters records by status on the client side.
   * Requirement: 9.4
   */
  filterByStatus(records: AttendanceRecord[]): AttendanceRecord[] {
    if (this.statusFilter === 'all') return records;
    return records.filter(r =>
      r.status.toLowerCase().replace(' ', '') === this.statusFilter.toLowerCase()
    );
  }

  // ─── CSV Export ───────────────────────────────────────────────────────────

  /**
   * Exports currently displayed records to CSV.
   * Requirement: 9.8
   */
  exportToCsv(): void {
    this.records$.pipe(takeUntil(this.destroy$)).subscribe(records => {
      const filtered = this.filterByStatus(records);
      if (filtered.length === 0) return;

      const headers = ['Technician', 'Check-In', 'Check-Out', 'Status', 'Hours', 'Entry Count'];
      const rows = filtered.map(r => [
        r.technicianName,
        r.checkInTime ? new Date(r.checkInTime).toLocaleString() : '',
        r.checkOutTime ? new Date(r.checkOutTime).toLocaleString() : '',
        r.status,
        r.totalHours.toFixed(2),
        r.entryCount.toString()
      ]);

      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `attendance_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }).unsubscribe();
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Returns CSS class for status badge.
   */
  getStatusClass(status: string): string {
    switch (status) {
      case 'Present': return 'status-present';
      case 'Absent': return 'status-absent';
      case 'Incomplete': return 'status-incomplete';
      case 'Still Active': return 'status-active';
      default: return '';
    }
  }

  /**
   * Formats time category breakdown as a readable string.
   * Requirement: 9.5
   */
  formatCategoryBreakdown(breakdown: Record<string, number>): string {
    if (!breakdown) return '—';
    return Object.entries(breakdown)
      .map(([cat, hours]) => `${cat}: ${hours.toFixed(1)}h`)
      .join(', ');
  }

  // ─── Online/Offline Handlers ──────────────────────────────────────────────

  private onOnline(): void {
    this.isOffline = false;
    this.cdr.markForCheck();
  }

  private onOffline(): void {
    this.isOffline = true;
    this.cdr.markForCheck();
  }
}
