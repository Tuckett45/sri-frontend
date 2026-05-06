import { Component, OnInit, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { AssignmentDialogComponent } from '../assignment-dialog/assignment-dialog.component';

@Component({
  selector: 'app-calendar-view',
  templateUrl: './calendar-view.component.html',
  styleUrls: ['./calendar-view.component.scss']
})
export class CalendarViewComponent implements OnInit, OnDestroy {
  viewMode: 'week' | 'month' | 'day' = 'week';
  currentDate = new Date();
  assignments: any[] = [];
  technicians: any[] = [];
  weekDays: Date[] = [];
  private destroy$ = new Subject<void>();

  constructor(private store: Store, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.buildWeekDays();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  buildWeekDays(): void {
    const start = new Date(this.currentDate);
    const day = start.getDay();
    start.setDate(start.getDate() - day);
    this.weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }

  previousPeriod(): void {
    this.currentDate = new Date(this.currentDate);
    this.currentDate.setDate(this.currentDate.getDate() - 7);
    this.buildWeekDays();
  }

  nextPeriod(): void {
    this.currentDate = new Date(this.currentDate);
    this.currentDate.setDate(this.currentDate.getDate() + 7);
    this.buildWeekDays();
  }

  today(): void {
    this.currentDate = new Date();
    this.buildWeekDays();
  }

  openAssignDialog(): void {
    this.dialog.open(AssignmentDialogComponent, {
      width: '500px',
      data: { date: this.currentDate }
    });
  }

  getAssignmentsForCell(technicianId: string, day: Date): any[] {
    return this.assignments.filter(a =>
      a.technicianId === technicianId &&
      new Date(a.date).toDateString() === day.toDateString()
    );
  }
}
