import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { AuthService } from '../../../../../services/auth.service';
import { PermissionService } from '../../../../../services/permission.service';
import { FrmPermissionService, FrmPermissionKey } from '../../../services/frm-permission.service';
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
  frmPermission?: FrmPermissionKey;
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
  styleUrls: ['./navigation-menu.component.scss']
  // Temporarily using Default change detection for debugging
  // changeDetection: ChangeDetectionStrategy.OnPush
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
      route: '/field-resource-management/dashboard',
      resource: 'kpis',
      action: 'read'
    },
    {
      label: 'Technicians',
      icon: 'engineering',
      route: '/field-resource-management/technicians',
      resource: 'technicians',
      action: 'read'
    },
    {
      label: 'Crews',
      icon: 'groups',
      route: '/field-resource-management/crews',
      resource: 'crews',
      action: 'read'
    },
    {
      label: 'Jobs',
      icon: 'work',
      route: '/field-resource-management/jobs',
      resource: 'jobs',
      action: 'read'
    },
    {
      label: 'Quotes',
      icon: 'request_quote',
      route: '/field-resource-management/quotes',
      frmPermission: 'canViewQuote'
    },
    {
      label: 'Scheduling',
      icon: 'calendar_today',
      route: '/field-resource-management/schedule',
      resource: 'assignments',
      action: 'read'
    },
    {
      label: 'Map View',
      icon: 'map',
      route: '/field-resource-management/map',
      resource: 'technicians',
      action: 'read'
    },
    {
      label: 'Reports & Analytics',
      icon: 'bar_chart',
      route: '/field-resource-management/reports',
      resource: 'reports',
      action: 'read'
    },
    {
      label: 'Budget Dashboard',
      icon: 'account_balance_wallet',
      route: '/field-resource-management/reports/budget-dashboard',
      resource: 'reports',
      action: 'read'
    },
    {
      label: 'Travel',
      icon: 'flight',
      route: '/field-resource-management/travel',
      resource: 'travel_profiles',
      action: 'read'
    },
    {
      label: 'Inventory',
      icon: 'inventory_2',
      route: '/field-resource-management/inventory',
      resource: 'jobs',
      action: 'read'
    },
    {
      label: 'Materials',
      icon: 'category',
      route: '/field-resource-management/materials',
      resource: 'jobs',
      action: 'read'
    },
    {
      label: 'Approvals',
      icon: 'approval',
      route: '/field-resource-management/approvals',
      resource: 'approvals',
      action: 'read',
      roles: [UserRole.Admin, UserRole.CM, UserRole.Controller, UserRole.OSPCoordinator, UserRole.HR, UserRole.Payroll]
    },
    {
      label: 'System Config',
      icon: 'admin_panel_settings',
      route: '/field-resource-management/admin',
      resource: 'system_config',
      action: 'read',
      roles: [UserRole.Admin]
    },
    {
      label: 'My Timecard',
      icon: 'schedule',
      route: '/field-resource-management/timecard',
      resource: 'time_entries',
      action: 'read'
      // Available to all authenticated users
    },
    {
      label: 'Timecard Management',
      icon: 'fact_check',
      route: '/field-resource-management/timecard-manager',
      resource: 'time_entries',
      action: 'execute',
      roles: [UserRole.Admin, UserRole.Manager, UserRole.HR, UserRole.CM, UserRole.Controller, UserRole.Payroll]
    },
    {
      label: 'My Assignments',
      icon: 'assignment',
      route: '/field-resource-management/mobile/daily',
      resource: 'assignments',
      action: 'read',
      roles: [UserRole.Admin, UserRole.Technician]
    },
    {
      label: 'CM Dashboard',
      icon: 'business',
      route: '/field-resource-management/cm/dashboard',
      resource: 'kpis',
      action: 'read',
      roles: [UserRole.Admin, UserRole.CM, UserRole.Controller, UserRole.OSPCoordinator]
    },
    {
      label: 'Admin Dashboard',
      icon: 'dashboard_customize',
      route: '/field-resource-management/admin-dashboard',
      resource: 'kpis',
      action: 'read',
      roles: [UserRole.Admin]
    },
    {
      label: 'Onboarding',
      icon: 'person_add',
      route: '/field-resource-management/onboarding',
      frmPermission: 'canManageOnboarding'
    },
    {
      label: 'Back Office',
      icon: 'business_center',
      route: '/field-resource-management/payroll',
      resource: 'payroll',
      action: 'read',
      roles: [UserRole.Admin, UserRole.HR, UserRole.Payroll]
    }
  ];

  constructor(
    private authService: AuthService,
    private permissionService: PermissionService,
    private frmPermissionService: FrmPermissionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getUser();
    
    if (!this.currentUser) {
      console.warn('NavigationMenu: No current user found. Menu will be empty.');
      this.menuItems = [];
      return;
    }
    
    console.log('NavigationMenu: Initializing with user:', {
      email: this.currentUser.email,
      role: this.currentUser.role,
      market: this.currentUser.market
    });
    
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
      console.log('NavigationMenu: No current user found');
      this.menuItems = [];
      return;
    }

    console.log('NavigationMenu: Building menu for user:', this.currentUser.email, 'Role:', this.currentUser.role);
    
    this.menuItems = this.allMenuItems.filter(item => 
      this.canAccessMenuItem(item)
    );
    
    console.log('NavigationMenu: Built', this.menuItems.length, 'menu items:', this.menuItems.map(i => i.label));
  }

  /**
   * Check if user can access a menu item
   */
  private canAccessMenuItem(item: MenuItem): boolean {
    if (!this.currentUser) {
      return false;
    }

    // Check FRM-specific permission if defined
    if (item.frmPermission) {
      return this.frmPermissionService.hasPermission(
        this.currentUser.role,
        item.frmPermission
      );
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
      const hasPermission = this.permissionService.checkPermission(
        this.currentUser,
        item.resource,
        item.action as any
      );
      
      // Log for debugging
      if (!hasPermission) {
        console.log(`Permission denied for ${item.label}: resource=${item.resource}, action=${item.action}`);
      }
      
      return hasPermission;
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
   * Check if a route is currently active.
   * Uses exact match first; falls back to prefix match only if
   * no other menu item has a more specific (longer) prefix match.
   */
  isActive(route: string): boolean {
    if (!this.activeRoute) return false;

    // Exact match always wins
    if (this.activeRoute === route) return true;

    // Check if this route is a prefix of the active route
    const isPrefix = this.activeRoute.startsWith(route);
    if (!isPrefix) return false;

    // It's a prefix match — but only highlight if no other menu item
    // has a longer (more specific) prefix match
    const hasMoreSpecificMatch = this.menuItems.some(item => {
      if (!item.route || item.route === route) return false;
      return (
        item.route.length > route.length &&
        this.activeRoute.startsWith(item.route)
      );
    });

    return !hasMoreSpecificMatch;
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
