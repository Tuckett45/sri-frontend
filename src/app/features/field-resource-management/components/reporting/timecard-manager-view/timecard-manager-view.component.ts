import { Component, OnInit, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatTableDataSource } from '@angular/material/table';

@Component({
  selector: 'app-timecard-manager-view',
  templateUrl: './timecard-manager-view.component.html',
  styleUrls: ['./timecard-manager-view.component.scss']
})
export class TimecardManagerViewComponent implements OnInit, OnDestroy {
  displayedColumns = ['technician', 'totalHours', 'regularHours', 'overtimeHours', 'status', 'actions'];
  dataSource = new MatTableDataSource<any>([]);
  weekStart = this.getWeekStart(new Date());
  private destroy$ = new Subject<void>();

  constructor(private store: Store) {}

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  approve(row: any): void {
    row.status = 'approved';
  }

  reject(row: any): void {
    row.status = 'rejected';
  }

  previousWeek(): void {
    this.weekStart = new Date(this.weekStart);
    this.weekStart.setDate(this.weekStart.getDate() - 7);
  }

  nextWeek(): void {
    this.weekStart = new Date(this.weekStart);
    this.weekStart.setDate(this.weekStart.getDate() + 7);
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
  }
}
