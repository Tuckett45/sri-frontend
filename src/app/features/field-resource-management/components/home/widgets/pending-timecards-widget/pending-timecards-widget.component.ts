import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Router } from '@angular/router';
import { TimecardApiService, TimecardDto } from '../../../../services/timecard-api.service';
import { FrmSignalRService } from '../../../../services/frm-signalr.service';
import { AuthService } from '../../../../../../services/auth.service';

/**
 * Widget for Payroll/HR users showing submitted timecards pending approval.
 * Includes inline approve/reject actions with real-time new submissions via SignalR.
 */
@Component({
  selector: 'app-pending-timecards-widget',
  templateUrl: './pending-timecards-widget.component.html',
  styleUrls: ['./pending-timecards-widget.component.scss']
})
export class PendingTimecardsWidgetComponent implements OnInit, OnDestroy {
  pendingTimecards: TimecardDto[] = [];
  totalCount = 0;
  loading = false;
  error: string | null = null;
  actionInProgress: string | null = null; // timecardId being actioned
  rejectingId: string | null = null;
  rejectReason = '';

  private destroy$ = new Subject<void>();
  private currentUserId = '';

  constructor(
    private timecardApi: TimecardApiService,
    private signalRService: FrmSignalRService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.authService.getUser()?.id || '';
    this.loadPendingTimecards();
    this.subscribeToRealTime();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  approveTimecard(timecard: TimecardDto): void {
    this.actionInProgress = timecard.id;
    this.timecardApi.approveTimecard(timecard.id, this.currentUserId, 'Payroll')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.pendingTimecards = this.pendingTimecards.filter(t => t.id !== timecard.id);
          this.totalCount--;
          this.actionInProgress = null;
        },
        error: () => {
          this.actionInProgress = null;
        }
      });
  }

  startReject(timecardId: string): void {
    this.rejectingId = timecardId;
    this.rejectReason = '';
  }

  cancelReject(): void {
    this.rejectingId = null;
    this.rejectReason = '';
  }

  confirmReject(): void {
    if (!this.rejectingId || !this.rejectReason.trim()) return;
    this.actionInProgress = this.rejectingId;
    this.timecardApi.rejectTimecard(this.rejectingId, this.currentUserId, this.rejectReason, 'Payroll')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.pendingTimecards = this.pendingTimecards.filter(t => t.id !== this.rejectingId);
          this.totalCount--;
          this.rejectingId = null;
          this.rejectReason = '';
          this.actionInProgress = null;
        },
        error: () => {
          this.actionInProgress = null;
        }
      });
  }

  requestCorrection(timecard: TimecardDto): void {
    this.startReject(timecard.id); // Reuse rejection flow with different action
  }

  viewDetails(timecardId: string): void {
    this.router.navigate(['/field-resource-management/timecards', timecardId]);
  }

  formatPeriod(start: string, end: string): string {
    const s = new Date(start);
    const e = new Date(end);
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }

  hasOvertime(timecard: TimecardDto): boolean {
    return timecard.totalOvertimeHours > 0;
  }

  private loadPendingTimecards(): void {
    this.loading = true;
    this.error = null;
    this.timecardApi.getPendingTimecards(undefined, 1, 10)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.pendingTimecards = result.items;
          this.totalCount = result.totalCount;
          this.loading = false;
        },
        error: () => {
          this.error = 'Unable to load pending timecards';
          this.loading = false;
        }
      });
  }

  private subscribeToRealTime(): void {
    // Listen for new timecard submissions via SignalR
    this.signalRService.notification$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notification => {
        if (notification && notification.type === 'TimecardSubmitted') {
          // Add to top of list
          const newTimecard: TimecardDto = {
            id: notification.data?.timecardId || crypto.randomUUID(),
            technicianId: notification.data?.technicianId || '',
            technicianName: notification.data?.technicianName || 'Unknown',
            periodStart: notification.data?.periodStart || '',
            periodEnd: notification.data?.periodEnd || '',
            status: 'submitted',
            totalRegularHours: notification.data?.totalHours || 0,
            totalOvertimeHours: notification.data?.overtimeHours || 0,
            totalMileage: 0,
            entryCount: 0,
            submittedAt: new Date().toISOString(),
            market: notification.data?.market,
            isLocked: false
          };
          this.pendingTimecards.unshift(newTimecard);
          this.totalCount++;
        }
      });
  }
}
