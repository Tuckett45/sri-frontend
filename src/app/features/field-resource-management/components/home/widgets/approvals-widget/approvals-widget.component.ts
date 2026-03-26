import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DashboardDataService } from '../../../../services/dashboard-data.service';
import { ApprovalCounts } from '../../../../models/dashboard.models';

@Component({
  selector: 'app-approvals-widget',
  templateUrl: './approvals-widget.component.html',
  styleUrls: ['./approvals-widget.component.scss']
})
export class ApprovalsWidgetComponent implements OnInit, OnDestroy {
  counts: ApprovalCounts | null = null;
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

  retry(): void {
    this.loadData();
  }

  private loadData(): void {
    this.loading = true;
    this.error = null;
    this.dashboardDataService.getApprovalCounts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => { this.counts = data; this.loading = false; },
        error: () => { this.error = 'Unable to load data. Please try again.'; this.loading = false; }
      });
  }
}
