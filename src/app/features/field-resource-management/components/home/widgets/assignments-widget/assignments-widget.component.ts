import { Component, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-assignments-widget',
  templateUrl: './assignments-widget.component.html',
  styleUrls: ['./assignments-widget.component.scss']
})
export class AssignmentsWidgetComponent implements OnInit {
  assignments$: Observable<any[]>;

  constructor(private store: Store) {
    this.assignments$ = this.store.select(state => (state as any)['assignments']?.assignments || []);
  }

  ngOnInit(): void {}
}
