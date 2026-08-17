import { Component, OnInit, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { selectSidebarOpen, selectSidebarCollapsed } from '../../../state/ui/ui.selectors';
import { toggleSidebar, toggleSidebarCollapsed } from '../../../state/ui/ui.actions';

/**
 * FRM Layout Component
 * 
 * Provides the main layout structure for the Field Resource Management module.
 * Features:
 * - Responsive sidebar navigation
 * - Collapsible sidebar (icon-only mode) for smaller screens
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
  sidebarCollapsed$: Observable<boolean>;
  private destroy$ = new Subject<void>();

  constructor(private store: Store) {
    this.sidebarOpen$ = this.store.select(selectSidebarOpen);
    this.sidebarCollapsed$ = this.store.select(selectSidebarCollapsed);
  }

  ngOnInit(): void {
    // Auto-collapse sidebar on smaller desktop screens (≤1440px) on initial load
    if (window.innerWidth <= 1440) {
      this.store.dispatch(toggleSidebarCollapsed());
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Toggle sidebar open/closed state (mobile)
   */
  toggleSidebar(): void {
    this.store.dispatch(toggleSidebar());
  }

  /**
   * Toggle sidebar collapsed/expanded state (desktop)
   */
  toggleSidebarCollapsed(): void {
    this.store.dispatch(toggleSidebarCollapsed());
  }

  /**
   * Close sidebar (for mobile when navigation occurs)
   */
  closeSidebar(): void {
    this.store.dispatch(toggleSidebar());
  }
}
