import { Component, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-recent-jobs-widget',
  templateUrl: './recent-jobs-widget.component.html',
  styleUrls: ['./recent-jobs-widget.component.scss']
})
export class RecentJobsWidgetComponent implements OnInit {
  recentJobs$: Observable<any[]>;

  constructor(private store: Store) {
    this.recentJobs$ = this.store.select(state => (state as any)['jobs']?.jobs || []).pipe(
      map((jobs: any[]) => jobs.slice(0, 5))
    );
  }

  ngOnInit(): void {}
}
