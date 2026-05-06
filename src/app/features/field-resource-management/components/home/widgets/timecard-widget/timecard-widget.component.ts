import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-timecard-widget',
  templateUrl: './timecard-widget.component.html',
  styleUrls: ['./timecard-widget.component.scss']
})
export class TimecardWidgetComponent implements OnInit {
  hoursThisWeek = 0;
  hoursToday = 0;
  targetWeeklyHours = 40;
  targetDailyHours = 8;

  get weekProgress(): number {
    return Math.min((this.hoursThisWeek / this.targetWeeklyHours) * 100, 100);
  }

  get dayProgress(): number {
    return Math.min((this.hoursToday / this.targetDailyHours) * 100, 100);
  }

  ngOnInit(): void {}
}
