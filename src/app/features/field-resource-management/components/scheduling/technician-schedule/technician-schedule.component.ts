import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-technician-schedule',
  templateUrl: './technician-schedule.component.html',
  styleUrls: ['./technician-schedule.component.scss']
})
export class TechnicianScheduleComponent implements OnInit, OnDestroy {
  technicianId: string | null = null;
  technician: any = null;
  currentDate = new Date();
  weekDays: Date[] = [];
  assignments: any[] = [];
  private destroy$ = new Subject<void>();

  constructor(private route: ActivatedRoute, private store: Store) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.technicianId = params.get('id');
      this.buildWeekDays();
    });
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

  previousWeek(): void {
    this.currentDate.setDate(this.currentDate.getDate() - 7);
    this.currentDate = new Date(this.currentDate);
    this.buildWeekDays();
  }

  nextWeek(): void {
    this.currentDate.setDate(this.currentDate.getDate() + 7);
    this.currentDate = new Date(this.currentDate);
    this.buildWeekDays();
  }

  getAssignmentsForDay(day: Date): any[] {
    return this.assignments.filter(
      a => new Date(a.date).toDateString() === day.toDateString()
    );
  }
}
