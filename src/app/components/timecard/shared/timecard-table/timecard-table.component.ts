import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-timecard-table',
  template: '<div>TimeCard Table Component</div>',
  styles: ['']
})
export class TimeCardTableComponent {
  @Input() timecards: any[] = [];
}

