import { Component, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';

@Component({
  selector: 'app-current-job-status-widget',
  templateUrl: './current-job-status-widget.component.html',
  styleUrls: ['./current-job-status-widget.component.scss']
})
export class CurrentJobStatusWidgetComponent implements OnInit {
  currentJob: any = null;

  constructor(private store: Store) {}

  ngOnInit(): void {
    this.store.select(state => (state as any)['jobs']?.currentJob || null).subscribe(
      (job: any) => {
        this.currentJob = job;
      }
    );
  }
}
