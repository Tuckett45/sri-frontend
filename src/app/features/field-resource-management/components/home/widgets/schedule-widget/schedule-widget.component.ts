import { Component, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';

@Component({
  selector: 'app-schedule-widget',
  templateUrl: './schedule-widget.component.html',
  styleUrls: ['./schedule-widget.component.scss']
})
export class ScheduleWidgetComponent implements OnInit {
  upcomingSchedule: any[] = [];

  constructor(private store: Store) {}

  ngOnInit(): void {
    this.store.select(state => (state as any)['schedule']?.upcoming || []).subscribe(
      (schedule: any[]) => {
        this.upcomingSchedule = schedule;
      }
    );
  }
}
