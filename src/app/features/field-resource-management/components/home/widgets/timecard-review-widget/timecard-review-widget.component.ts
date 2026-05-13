import { Component, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DashboardDataService } from '../../../../services/dashboard-data.service';
import { PendingTimecard } from '../../../../models/dashboard.models';

@Component({
  selector: 'app-timecard-review-widget',
  templateUrl: './timecard-review-widget.component.html',
  styleUrls: ['./timecard-review-widget.component.scss']
})
export class TimecardReviewWidgetComponent implements OnInit, OnDestroy {
  @Output() timecardSelected = new EventEmitter<string>();

  timecards: PendingTimecard[] = [];
  loading = false;
  error: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(private dashboardDataService: DashboardDataService) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onTimecardClick(id: string): void {
    this.timecardSelected.emit(id);
  }

  retry(): void {
    this.loadData();
  }

  private loadData(): void {
    this.loading = true;
    this.error = null;
    this.dashboardDataService.getPendingTimecards()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.timecards = data.sort((a, b) =>
            new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
          );
          this.loading = false;
        },
        error: () => { this.error = 'Unable to load data. Please try again.'; this.loading = false; }
      });
  }
}
