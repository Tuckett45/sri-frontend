import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter, distinctUntilChanged } from 'rxjs/operators';
import { Subscription } from 'rxjs';

interface Breadcrumb {
  label: string;
  url: string;
}

/**
 * Breadcrumb Navigation Component
 * 
 * Displays breadcrumb trail based on current route.
 * Breadcrumb items are clickable for navigation.
 * Updates automatically on route changes.
 * 
 * Breadcrumb labels are derived from route data 'breadcrumb' property.
 * 
 * Usage:
 * ```html
 * <app-breadcrumb></app-breadcrumb>
 * ```
 * 
 * Route Configuration Example:
 * ```typescript
 * {
 *   path: 'technicians/:id',
 *   component: TechnicianDetailComponent,
 *   data: { breadcrumb: 'Detail' }
 * }
 * ```
 */
@Component({
  selector: 'app-breadcrumb',
  templateUrl: './breadcrumb.component.html',
  styleUrls: ['./breadcrumb.component.scss']
})
export class BreadcrumbComponent implements OnInit, OnDestroy {
  breadcrumbs: Breadcrumb[] = [];
  private routerSubscription?: Subscription;

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Build breadcrumbs on initial load
    this.breadcrumbs = this.buildBreadcrumbs(this.activatedRoute.root);

    // Update breadcrumbs on route changes
    this.routerSubscription = this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        distinctUntilChanged()
      )
      .subscribe(() => {
        this.breadcrumbs = this.buildBreadcrumbs(this.activatedRoute.root);
      });
  }

  ngOnDestroy(): void {
    this.routerSubscription?.unsubscribe();
  }

  /**
   * Build breadcrumb trail from route tree
   */
  private buildBreadcrumbs(
    route: ActivatedRoute,
    url: string = '',
    breadcrumbs: Breadcrumb[] = []
  ): Breadcrumb[] {
    // Get the child routes
    const children: ActivatedRoute[] = route.children;

    // Return if there are no more children
    if (children.length === 0) {
      return breadcrumbs;
    }

    // Iterate over each child
    for (const child of children) {
      // Verify primary route
      if (child.outlet !== 'primary') {
        continue;
      }

      // Get the route's URL segment
      const routeURL: string = child.snapshot.url
        .map(segment => segment.path)
        .join('/');

      // Append route URL to URL
      if (routeURL) {
        url += `/${routeURL}`;
      }

      // Get breadcrumb label from route data
      const label = child.snapshot.data['breadcrumb'];

      // Add breadcrumb if label exists
      if (label) {
        breadcrumbs.push({
          label,
          url
        });
      }

      // Recursive call for child routes
      return this.buildBreadcrumbs(child, url, breadcrumbs);
    }

    return breadcrumbs;
  }

  /**
   * Navigate to breadcrumb URL
   */
  navigateTo(url: string): void {
    this.router.navigate([url]);
  }

  /**
   * Check if breadcrumb is the last item
   */
  isLast(index: number): boolean {
    return index === this.breadcrumbs.length - 1;
  }
}
