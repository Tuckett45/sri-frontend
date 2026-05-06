import { Component, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-active-jobs-widget',
  templateUrl: './active-jobs-widget.component.html',
  styleUrls: ['./active-jobs-widget.component.scss']
})
export class ActiveJobsWidgetComponent implements OnInit {
  jobs$: Observable<any[]>;
  isLoading$: Observable<boolean>;

  constructor(private store: Store) {
    this.jobs$ = this.store.select(state => (state as any)['jobs']?.jobs || []);
    this.isLoading$ = this.store.select(state => (state as any)['jobs']?.loading || false);
  }

  ngOnInit(): void {}
}
