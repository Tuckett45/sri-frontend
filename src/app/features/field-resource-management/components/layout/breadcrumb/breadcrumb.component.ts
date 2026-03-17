import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
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
    'field-resource-management': 'Field Resources',
    'dashboard': 'Dashboard',
    'technicians': 'Technicians',
    'crews': 'Crews',
    'jobs': 'Jobs',
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
    'view': 'View'
  };

  /**
   * Route icon mapping for common FRM routes
   */
  private readonly routeIcons: { [key: string]: string } = {
    'field-resource-management': 'home',
    'dashboard': 'dashboard',
    'technicians': 'engineering',
    'crews': 'groups',
    'jobs': 'work',
    'scheduling': 'calendar_today',
    'map': 'map',
    'reports': 'assessment',
    'timecard': 'schedule',
    'timecard-manager': 'admin_panel_settings',
    'kpis': 'analytics',
    'system-config': 'settings',
    'my-assignments': 'assignment',
    'my-schedule': 'event',
    'my-profile': 'person'
  };

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
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
        this.cdr.markForCheck(); // Trigger change detection
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

    console.log('=== BREADCRUMB BUILD START ===');
    console.log('Full URL:', this.router.url);
    console.log('URL segments:', urlSegments);

    let currentUrl = '';

    urlSegments.forEach((segment, index) => {
      // Skip query parameters and fragments
      const cleanSegment = segment.split('?')[0].split('#')[0];
      
      console.log(`\n[${index}] Processing: "${cleanSegment}"`);
      
      if (!cleanSegment) {
        console.log('  ❌ Empty segment, skipping');
        return;
      }

      // Build URL incrementally
      currentUrl += `/${cleanSegment}`;
      console.log(`  📍 Current URL: ${currentUrl}`);

      // Check if this is an ID segment (UUID or entity ID like "tech-15")
      const isId = this.isUUID(cleanSegment);
      
      if (isId) {
        console.log(`  🔑 ID segment detected, skipping breadcrumb (but URL continues)`);
        return;
      }

      // Get label and icon for this segment
      const label = this.getRouteLabel(cleanSegment, index);
      const icon = index === 0 ? this.routeIcons[cleanSegment] : undefined;

      console.log(`  ✅ Adding breadcrumb: "${label}"`);
      console.log(`     URL: ${currentUrl}`);
      console.log(`     Icon: ${icon || 'none'}`);

      breadcrumbs.push({
        label,
        url: currentUrl,
        icon
      });
    });

    console.log('\n=== FINAL BREADCRUMBS ===');
    console.log(breadcrumbs.map(b => b.label).join(' > '));
    console.log('========================\n');
    
    this.breadcrumbs = breadcrumbs;
  }

  /**
   * Get label for route segment
   */
  private getRouteLabel(segment: string, index: number): string {
    // Use predefined label or format segment
    return this.routeLabels[segment] || this.formatSegment(segment);
  }

  /**
   * Check if string is a UUID or entity ID
   */
  private isUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    // Check for patterns like "tech-15", "job-123", "crew-5" (entity IDs with numbers)
    // This should NOT match "technicians", "jobs", "crews" (plural route names)
    const idPattern = /^(tech|job|crew|user)-\d+$/i;
    
    const isUuid = uuidRegex.test(str);
    const isIdPattern = idPattern.test(str);
    
    console.log(`isUUID check for "${str}": UUID=${isUuid}, IDPattern=${isIdPattern}`);
    
    return isUuid || isIdPattern;
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
