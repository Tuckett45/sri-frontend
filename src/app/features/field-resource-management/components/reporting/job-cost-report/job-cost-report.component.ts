import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-job-cost-report',
  templateUrl: './job-cost-report.component.html',
  styleUrls: ['./job-cost-report.component.scss']
})
export class JobCostReportComponent implements OnInit, OnDestroy {
  jobId: string | null = null;
  job: any = null;
  costSummary = {
    budget: 0,
    laborActual: 0,
    materialActual: 0,
    totalActual: 0,
    variance: 0
  };
  lineItems: any[] = [];
  displayedColumns = ['category', 'budgeted', 'actual', 'variance'];
  private destroy$ = new Subject<void>();

  constructor(private route: ActivatedRoute, private store: Store) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.jobId = params.get('jobId');
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
