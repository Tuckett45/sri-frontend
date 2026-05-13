import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DashboardDataService } from '../../../../services/dashboard-data.service';
import { TravelBreakPtoSummary } from '../../../../models/dashboard.models';

@Component({
  selector: 'app-travel-break-pto-widget',
  templateUrl: './travel-break-pto-widget.component.html',
  styleUrls: ['./travel-break-pto-widget.component.scss']
})
export class TravelBreakPtoWidgetComponent implements OnInit, OnDestroy {
  summary: TravelBreakPtoSummary | null = null;
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
    this.dashboardDataService.getTravelBreakPtoSummary()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => { this.summary = data; this.loading = false; },
        error: () => { this.error = 'Unable to load data. Please try again.'; this.loading = false; }
      });
  }
}
