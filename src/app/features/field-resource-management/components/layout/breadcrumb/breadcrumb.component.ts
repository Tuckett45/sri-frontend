import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
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
    'frm': 'Field Resource Management',
    'dashboard': 'Dashboard',
    'technicians': 'Technicians',
    'crews': 'Crews',
    'jobs': 'Jobs',
    'scheduling': 'Scheduling',
    'map': 'Map View',
    'reports': 'Reports',
    'kpis': 'KPIs',
    'system-config': 'System Configuration',
    'my-assignments': 'My Assignments',
    'my-schedule': 'My Schedule',
    'my-profile': 'My Profile',
    'new': 'New',
    'edit': 'Edit',
    'detail': 'Details',
    'view': 'View'
  };

  /**
   * Route icon mapping for common FRM routes
   */
  private readonly routeIcons: { [key: string]: string } = {
    'frm': 'home',
    'dashboard': 'dashboard',
    'technicians': 'engineering',
    'crews': 'groups',
    'jobs': 'work',
    'scheduling': 'calendar_today',
    'map': 'map',
    'reports': 'assessment',
    'kpis': 'analytics',
    'system-config': 'settings',
    'my-assignments': 'assignment',
    'my-schedule': 'event',
    'my-profile': 'person'
  };

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute
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

      currentUrl += `/${cleanSegment}`;

      // Get label from route data or use default mapping
      const label = this.getRouteLabel(cleanSegment, index);
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
  private getRouteLabel(segment: string, index: number): string {
    // Check if segment is a UUID (entity ID)
    if (this.isUUID(segment)) {
      return this.getEntityLabel(segment);
    }

    // Use predefined label or format segment
    return this.routeLabels[segment] || this.formatSegment(segment);
  }

  /**
   * Check if string is a UUID
   */
  private isUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  /**
   * Get label for entity ID (can be enhanced with entity name lookup)
   */
  private getEntityLabel(id: string): string {
    // In a real implementation, this could fetch entity name from store
    // For now, return shortened ID
    return `ID: ${id.substring(0, 8)}...`;
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
    // Don't navigate if it's the current page (last breadcrumb)
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
