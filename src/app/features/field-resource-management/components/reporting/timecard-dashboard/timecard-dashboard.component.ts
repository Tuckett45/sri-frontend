import { Component, OnInit, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TimeEntryDialogComponent } from '../time-entry-dialog/time-entry-dialog.component';

@Component({
  selector: 'app-timecard-dashboard',
  templateUrl: './timecard-dashboard.component.html',
  styleUrls: ['./timecard-dashboard.component.scss']
})
export class TimecardDashboardComponent implements OnInit, OnDestroy {
  isClockedIn = false;
  clockInTime: Date | null = null;
  weekStart = this.getWeekStart(new Date());
  totalHoursThisWeek = 0;
  dailySummary: { day: string; hours: number }[] = [
    { day: 'Sun', hours: 0 }, { day: 'Mon', hours: 0 }, { day: 'Tue', hours: 0 },
    { day: 'Wed', hours: 0 }, { day: 'Thu', hours: 0 }, { day: 'Fri', hours: 0 },
    { day: 'Sat', hours: 0 }
  ];
  private destroy$ = new Subject<void>();

  constructor(private store: Store, private dialog: MatDialog) {}

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleClockIn(): void {
    if (this.isClockedIn) {
      this.isClockedIn = false;
      this.clockInTime = null;
    } else {
      this.isClockedIn = true;
      this.clockInTime = new Date();
    }
  }

  openManualEntry(): void {
    this.dialog.open(TimeEntryDialogComponent, { width: '450px' });
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
  }
}
