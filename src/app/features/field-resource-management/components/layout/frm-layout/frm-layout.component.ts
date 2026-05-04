import { Component, OnInit, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { selectSidebarOpen } from '../../../state/ui/ui.selectors';
import { toggleSidebar } from '../../../state/ui/ui.actions';

/**
 * FRM Layout Component
 * 
 * Provides the main layout structure for the Field Resource Management module.
 * Features:
 * - Responsive sidebar navigation
 * - Main content area with router outlet
 * - Breadcrumb navigation
 * - Offline indicator
 * - Notification panel
 * 
 * Requirements: 1.10.4, 4.4.1
 */
@Component({
  selector: 'app-frm-layout',
  templateUrl: './frm-layout.component.html',
  styleUrls: ['./frm-layout.component.scss']
})
export class FrmLayoutComponent implements OnInit, OnDestroy {
  sidebarOpen$: Observable<boolean>;
  private destroy$ = new Subject<void>();

  constructor(private store: Store) {
    this.sidebarOpen$ = this.store.select(selectSidebarOpen);
  }

  ngOnInit(): void {
    // Component initialization
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Toggle sidebar open/closed state
   */
  toggleSidebar(): void {
    this.store.dispatch(toggleSidebar());
  }

  /**
   * Close sidebar (for mobile when navigation occurs)
   */
  closeSidebar(): void {
    this.store.dispatch(toggleSidebar());
  }
}
