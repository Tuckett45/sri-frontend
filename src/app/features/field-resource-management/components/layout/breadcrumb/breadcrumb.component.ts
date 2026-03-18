import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, filter, distinctUntilChanged } from 'rxjs/operators';

/**
 * Breadcrumb Item Interface
 */
export interface BreadcrumbItem {
  label: string;
  url: string;
  icon?: string;
}

/**
 * Breadcrumb Component
 * 
 * Displays hierarchical navigation breadcrumbs based on current route.
 * Features:
 * - Automatic breadcrumb generation from route data
 * - Clickable navigation to parent routes
 * - Current page indicator (non-clickable)
 * - Icon support for breadcrumb items
 * - Responsive design with ellipsis for long paths
 * 
 * Requirements: 4.4.7 (browser back/forward navigation support)
 */
@Component({
  selector: 'app-frm-breadcrumb',
  templateUrl: './breadcrumb.component.html',
  styleUrls: ['./breadcrumb.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BreadcrumbComponent implements OnInit, OnDestroy {
  breadcrumbs: BreadcrumbItem[] = [];
  private destroy$ = new Subject<void>();

  /**
   * Route label mapping for common FRM routes
   */
  private readonly routeLabels: { [key: string]: string } = {
    'field-resource-management': 'Field Resources',
    'dashboard': 'Dashboard',
    'home': 'Home',
    'technicians': 'Technicians',
    'crews': 'Crews',
    'jobs': 'Jobs',
    'schedule': 'Scheduling',
    'scheduling': 'Scheduling',
    'map': 'Map View',
    'reports': 'Reports & Analytics',
    'timecard': 'Timecards',
    'timecard-manager': 'Timecard Management',
    'kpis': 'KPIs',
    'system-config': 'System Configuration',
    'my-assignments': 'My Assignments',
    'my-schedule': 'My Schedule',
    'my-profile': 'My Profile',
    'new': 'New',
    'edit': 'Edit',
    'detail': 'Details',
    'view': 'View',
    'inventory': 'Inventory',
    'materials': 'Materials',
    'travel': 'Travel',
    'budget-dashboard': 'Budget Dashboard',
    'utilization': 'Utilization Report',
    'performance': 'Job Performance',
    'job-cost': 'Job Cost Report',
    'admin': 'Administration',
    'admin-dashboard': 'Admin Dashboard',
    'approvals': 'Approvals',
    'mobile': 'Mobile',
    'cm': 'CM'
  };

  /**
   * Route icon mapping for common FRM routes
   */
  private readonly routeIcons: { [key: string]: string } = {
    'field-resource-management': 'home',
    'dashboard': 'dashboard',
    'home': 'home',
    'technicians': 'engineering',
    'crews': 'groups',
    'jobs': 'work',
    'schedule': 'calendar_today',
    'scheduling': 'calendar_today',
    'map': 'map',
    'reports': 'assessment',
    'timecard': 'schedule',
    'timecard-manager': 'admin_panel_settings',
    'kpis': 'analytics',
    'system-config': 'settings',
    'my-assignments': 'assignment',
    'my-schedule': 'event',
    'my-profile': 'person',
    'inventory': 'inventory_2',
    'materials': 'category',
    'travel': 'directions_car',
    'budget-dashboard': 'account_balance_wallet',
    'utilization': 'bar_chart',
    'performance': 'trending_up',
    'job-cost': 'receipt_long',
    'admin': 'admin_panel_settings',
    'admin-dashboard': 'admin_panel_settings',
    'approvals': 'check_circle',
    'mobile': 'phone_iphone',
    'cm': 'supervisor_account'
  };

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Build initial breadcrumbs
    this.buildBreadcrumbs();

    // Listen to route changes
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.buildBreadcrumbs();
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Build breadcrumb trail from current route
   */
  private buildBreadcrumbs(): void {
    const breadcrumbs: BreadcrumbItem[] = [];
    const urlSegments = this.router.url.split('/').filter(segment => segment);

    let currentUrl = '';

    urlSegments.forEach((segment, index) => {
      // Skip query parameters and fragments
      const cleanSegment = segment.split('?')[0].split('#')[0];

      if (!cleanSegment) {
        return;
      }

      // Build URL incrementally
      currentUrl += `/${cleanSegment}`;

      // Check if this is an ID segment (UUID or entity ID like "tech-15")
      if (this.isEntityId(cleanSegment)) {
        return;
      }

      // Get label and icon for this segment
      const label = this.getRouteLabel(cleanSegment);
      const icon = index === 0 ? this.routeIcons[cleanSegment] : undefined;

      breadcrumbs.push({
        label,
        url: currentUrl,
        icon
      });
    });

    this.breadcrumbs = breadcrumbs;
  }

  /**
   * Get label for route segment
   */
  private getRouteLabel(segment: string): string {
    return this.routeLabels[segment] || this.formatSegment(segment);
  }

  /**
   * Check if string is a UUID or entity ID (e.g. "tech-15", "inv-001", "po-1")
   * Should NOT match route segments like "technicians", "budget-dashboard", etc.
   */
  private isEntityId(str: string): boolean {
    // Standard UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    // Entity ID patterns: prefix-number (e.g. tech-15, job-123, inv-001, po-1, sup-1, etc.)
    const idPattern = /^(tech|job|crew|user|inv|mat|budget|adj|ded|entry|assignment|po|sup)-\d+$/i;
    // Compound entity IDs like "adj-job-1-0", "ded-job-1-0"
    const compoundIdPattern = /^(adj|ded)-job-\d+-\d+$/i;

    return uuidRegex.test(str) || idPattern.test(str) || compoundIdPattern.test(str);
  }

  /**
   * Format segment into readable label
   */
  private formatSegment(segment: string): string {
    return segment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Navigate to breadcrumb URL
   */
  navigateTo(breadcrumb: BreadcrumbItem): void {
    if (breadcrumb === this.breadcrumbs[this.breadcrumbs.length - 1]) {
      return;
    }
    this.router.navigate([breadcrumb.url]);
  }

  /**
   * Check if breadcrumb is the current page
   */
  isCurrentPage(breadcrumb: BreadcrumbItem): boolean {
    return breadcrumb === this.breadcrumbs[this.breadcrumbs.length - 1];
  }
}
