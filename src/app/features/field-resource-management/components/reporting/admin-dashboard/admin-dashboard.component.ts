import { Component, OnInit, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  systemKpis = [
    { title: 'Total Users', value: 0, change: 0, icon: 'people' },
    { title: 'Active Jobs', value: 0, change: 0, icon: 'work' },
    { title: 'All Markets', value: 0, change: 0, icon: 'location_city' },
    { title: 'System Uptime', value: '99.9%', change: 0, icon: 'cloud' }
  ];
  markets: any[] = [];
  private destroy$ = new Subject<void>();

  constructor(private store: Store) {}

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
