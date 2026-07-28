import { Component, OnInit } from '@angular/core';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { Store } from '@ngrx/store';

import { AuthService } from '../../../../../services/auth.service';
import { selectManagerQueue, selectBackofficeQueue } from '../../../state/pto/pto.selectors';
import { selectOvertimeManagerQueue } from '../../../state/overtime/overtime.selectors';

export interface NavTab {
  label: string;
  route: string;
  icon: string;
  badge?: number;
  visible: boolean;
}

/**
 * PTO Sub-Navigation Component
 *
 * Persistent tab bar within the PTO module for navigating between:
 * My Requests, Overtime, Timeline, Approvals (manager), Reports (manager)
 */
@Component({
  selector: 'app-pto-sub-nav',
  templateUrl: './pto-sub-nav.component.html',
  styleUrls: ['./pto-sub-nav.component.scss']
})
export class PtoSubNavComponent implements OnInit {
  tabs: NavTab[] = [];
  pendingCount$!: Observable<number>;
  isManager = false;

  constructor(
    private authService: AuthService,
    private store: Store
  ) {}

  ngOnInit(): void {
    const user = this.authService.getUser();
    this.isManager = user?.role === 'Admin' || user?.role === 'Manager' || user?.role === 'CM' || user?.role === 'Payroll';

    // Calculate total pending count for badge
    this.pendingCount$ = combineLatest([
      this.store.select(selectManagerQueue),
      this.store.select(selectBackofficeQueue),
      this.store.select(selectOvertimeManagerQueue)
    ]).pipe(
      map(([ptoMgr, ptoBo, otMgr]) => ptoMgr.length + ptoBo.length + otMgr.length)
    );

    this.tabs = [
      {
        label: 'My Requests',
        route: '/field-resource-management/pto',
        icon: 'event_note',
        visible: true
      },
      {
        label: 'Overtime',
        route: '/field-resource-management/pto/overtime',
        icon: 'schedule',
        visible: true
      },
      {
        label: 'Timeline',
        route: '/field-resource-management/pto/timeline',
        icon: 'timeline',
        visible: true
      },
      {
        label: 'Approvals',
        route: '/field-resource-management/pto/approvals',
        icon: 'check_circle',
        visible: this.isManager
      },
      {
        label: 'Reports',
        route: '/field-resource-management/pto/reports',
        icon: 'assessment',
        visible: this.isManager
      }
    ];
  }
}
