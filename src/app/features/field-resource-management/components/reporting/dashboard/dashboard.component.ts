import { Component, OnInit, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  kpis = [
    { title: 'Total Jobs', value: 0, change: 0, icon: 'work' },
    { title: 'Active Technicians', value: 0, change: 0, icon: 'people' },
    { title: 'Completion Rate', value: '0%', change: 0, icon: 'check_circle' },
    { title: 'Revenue', value: '$0', change: 0, icon: 'attach_money' }
  ];
  private destroy$ = new Subject<void>();

  constructor(private store: Store) {}

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
