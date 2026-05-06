import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatTableDataSource } from '@angular/material/table';

@Component({
  selector: 'app-utilization-report',
  templateUrl: './utilization-report.component.html',
  styleUrls: ['./utilization-report.component.scss']
})
export class UtilizationReportComponent implements OnInit, OnDestroy {
  displayedColumns = ['technician', 'scheduledHours', 'actualHours', 'utilization'];
  dataSource = new MatTableDataSource<any>([]);
  startDate = new FormControl(new Date());
  endDate = new FormControl(new Date());
  private destroy$ = new Subject<void>();

  constructor(private store: Store) {}

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadReport(): void { /* dispatch load action */ }
}
