import { Component, OnInit, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatTableDataSource } from '@angular/material/table';

@Component({
  selector: 'app-job-performance-report',
  templateUrl: './job-performance-report.component.html',
  styleUrls: ['./job-performance-report.component.scss']
})
export class JobPerformanceReportComponent implements OnInit, OnDestroy {
  displayedColumns = ['job', 'technician', 'completionRate', 'onTimeRate', 'avgDuration'];
  dataSource = new MatTableDataSource<any>([]);
  summaryStats = { completionRate: 0, onTimeRate: 0, avgDuration: 0 };
  private destroy$ = new Subject<void>();

  constructor(private store: Store) {}

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
