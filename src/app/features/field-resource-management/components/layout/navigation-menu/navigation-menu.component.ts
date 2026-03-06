import { Component, OnInit, OnDestroy, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { AuthService } from '../../../../../services/auth.service';
import { PermissionService } from '../../../../../services/permission.service';
import { User } from '../../../../../models/user.model';
import { UserRole } from '../../../../../models/role.enum';

/**
 * Navigation Menu Item Interface
 */
interface MenuItem {
  label: string;
  icon: string;
  route?: string;
  resource?: string;
  action?: string;
  children?: MenuItem[];
  roles?: UserRole[];
}

/**
 * Navigation Menu Component
 * 
 * Displays role-appropriate navigation menu items based on user permissions.
 * Features:
 * - Role-based menu filtering
 * - Permission-based access control
 * - Hierarchical menu structure support
 * - Active route highlighting
 * - Responsive collapsible design
 * 
 * Requirements: 1.1.5, 2.1.1-2.4.8
 */
@Component({
  selector: 'app-frm-nav-menu',
  templateUrl: './navigation-menu.component.html',
  styleUrls: ['./navigation-menu.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavigationMenuComponent implements OnInit, OnDestroy {
  @Output() navigationClick = new EventEmitter<void>();

  menuItems: MenuItem[] = [];
  currentUser: User | null = null;
  activeRoute: string = '';
  expandedItems: Set<string> = new Set();
  
  private destroy$ = new Subject<void>();

  /**
   * Complete menu structure for all roles
   */
  private readonly allMenuItems: MenuItem[] = [
    {
      label: 'Dashboard',
      icon: 'dashboard',
      route: '/frm/dashboard',
      resource: 'kpis',
      action: 'read'
    },
    {
      label: 'Technicians',
      icon: 'engineering',
      route: '/frm/technicians',
      resource: 'technicians',
      action: 'read'
    },
    {
      label: 'Crews',
      icon: 'groups',
      route: '/frm/crews',
      resource: 'crews',
      action: 'read'
    },
    {
      label: 'Jobs',
      icon: 'work',
      route: '/frm/jobs',
      resource: 'jobs',
      action: 'read'
    },
    {
      label: 'Scheduling',
      icon: 'calendar_today',
      route: '/frm/scheduling',
      resource: 'assignments',
      action: 'read'
    },
    {
      label: 'Map View',
      icon: 'map',
      route: '/frm/map',
      resource: 'technicians',
      action: 'read'
    },
    {
      label: 'Reports',
      icon: 'assessment',
      route: '/frm/reports',
      resource: 'reports',
      action: 'read'
    },
    {
      label: 'KPIs',
      icon: 'analytics',
      route: '/frm/kpis',
      resource: 'kpis',
      action: 'read'
    },
    {
      label: 'System Config',
      icon: 'settings',
      route: '/frm/system-config',
      resource: 'system_config',
      action: 'read',
      roles: [UserRole.Admin]
    },
    {
      label: 'My Assignments',
      icon: 'assignment',
      route: '/frm/my-assignments',
      resource: 'assignments',
      action: 'read',
      roles: [UserRole.Technician]
    },
    {
      label: 'My Schedule',
      icon: 'event',
      route: '/frm/my-schedule',
      resource: 'assignments',
      action: 'read',
      roles: [UserRole.Technician]
    },
    {
      label: 'My Profile',
      icon: 'person',
      route: '/frm/my-profile',
      resource: 'technicians',
      action: 'read',
      roles: [UserRole.Technician]
    }
  ];

  constructor(
    private authService: AuthService,
    private permissionService: PermissionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getUser();
    this.buildMenuForCurrentUser();
    this.trackActiveRoute();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Build menu items based on current user's role and permissions
   */
  private buildMenuForCurrentUser(): void {
    if (!this.currentUser) {
      this.menuItems = [];
      return;
    }

    this.menuItems = this.allMenuItems.filter(item => 
      this.canAccessMenuItem(item)
    );
  }

  /**
   * Check if user can access a menu item
   */
  private canAccessMenuItem(item: MenuItem): boolean {
    if (!this.currentUser) {
      return false;
    }

    // Check role-specific items
    if (item.roles && item.roles.length > 0) {
      const userRole = this.currentUser.role as UserRole;
      if (!item.roles.includes(userRole)) {
        return false;
      }
    }

    // Check permission if resource and action are defined
    if (item.resource && item.action) {
      return this.permissionService.checkPermission(
        this.currentUser,
        item.resource,
        item.action as any
      );
    }

    // Check children permissions
    if (item.children && item.children.length > 0) {
      return item.children.some(child => this.canAccessMenuItem(child));
    }

    return true;
  }

  /**
   * Track active route for highlighting
   */
  private trackActiveRoute(): void {
    // Set initial active route
    this.activeRoute = this.router.url;

    // Listen to route changes
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event: any) => {
        this.activeRoute = event.urlAfterRedirects || event.url;
      });
  }

  /**
   * Check if a route is currently active
   */
  isActive(route: string): boolean {
    return this.activeRoute.startsWith(route);
  }

  /**
   * Navigate to a route
   */
  navigate(route: string): void {
    this.router.navigate([route]);
    this.navigationClick.emit();
  }

  /**
   * Toggle expansion of menu item with children
   */
  toggleExpanded(label: string): void {
    if (this.expandedItems.has(label)) {
      this.expandedItems.delete(label);
    } else {
      this.expandedItems.add(label);
    }
  }

  /**
   * Check if menu item is expanded
   */
  isExpanded(label: string): boolean {
    return this.expandedItems.has(label);
  }

  /**
   * Check if menu item has children
   */
  hasChildren(item: MenuItem): boolean {
    return !!(item.children && item.children.length > 0);
  }
}
