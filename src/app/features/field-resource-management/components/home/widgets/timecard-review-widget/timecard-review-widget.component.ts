import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-timecard-review-widget',
  templateUrl: './timecard-review-widget.component.html',
  styleUrls: ['./timecard-review-widget.component.scss']
})
export class TimecardReviewWidgetComponent implements OnInit {
  pendingTimecards: any[] = [];

  ngOnInit(): void {}

  approve(timecard: any): void {
    timecard.status = 'approved';
  }

  reject(timecard: any): void {
    timecard.status = 'rejected';
  }
}
