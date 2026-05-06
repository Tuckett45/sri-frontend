import { Component, OnInit, OnDestroy, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-timecard-weekly-view',
  templateUrl: './timecard-weekly-view.component.html',
  styleUrls: ['./timecard-weekly-view.component.scss']
})
export class TimecardWeeklyViewComponent implements OnInit, OnDestroy, OnChanges {
  @Input() technicianId = '';
  @Input() weekStart: Date = new Date();
  weekDays: { date: Date; entries: any[] }[] = [];
  private destroy$ = new Subject<void>();

  constructor(private store: Store) {}

  ngOnInit(): void {
    this.buildWeek();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['weekStart']) {
      this.buildWeek();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  buildWeek(): void {
    if (!this.weekStart) return;
    this.weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(this.weekStart);
      d.setDate(d.getDate() + i);
      return { date: d, entries: [] };
    });
  }

  totalHours(entries: any[]): number {
    return entries.reduce((sum, e) => sum + (e.hours || 0), 0);
  }
}
