import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../../../services/auth.service';
import { UserRole } from '../../../../../models/role.enum';

interface FrmNavItem {
  label: string;
  route: string;
  icon: string;
  roles: UserRole[];
  children?: FrmNavItem[];
}

/**
 * Field Resource Management Navigation Menu Component
 * 
 * Provides role-based navigation menu for the Field Resource Management feature.
 * Menu items are filtered based on user role:
 * - Admin: All items
 * - Dispatcher (PM, CM, OSPCoordinator): Scheduling, jobs, technicians, reports
 * - Technician: Daily view, my schedule
 * 
 * Usage:
 * ```html
 * <app-frm-nav-menu></app-frm-nav-menu>
 * ```
 */
@Component({
  selector: 'app-frm-nav-menu',
  templateUrl: './frm-nav-menu.component.html',
  styleUrls: ['./frm-nav-menu.component.scss']
})
export class FrmNavMenuComponent implements OnInit {
  menuItems: FrmNavItem[] = [];

  private readonly allMenuItems: FrmNavItem[] = [
    {
      label: 'Dashboard',
      route: '/field-resource-management/dashboard',
      icon: 'dashboard',
      roles: [UserRole.Admin, UserRole.PM, UserRole.CM, UserRole.OSPCoordinator]
    },
    {
      label: 'Schedule',
      route: '/field-resource-management/schedule',
      icon: 'calendar_today',
      roles: [UserRole.Admin, UserRole.PM, UserRole.CM, UserRole.OSPCoordinator]
    },
    {
      label: 'Jobs',
      route: '/field-resource-management/jobs',
      icon: 'work',
      roles: [UserRole.Admin, UserRole.PM, UserRole.CM, UserRole.OSPCoordinator]
    },
    {
      label: 'Technicians',
      route: '/field-resource-management/technicians',
      icon: 'people',
      roles: [UserRole.Admin, UserRole.PM, UserRole.CM, UserRole.OSPCoordinator]
    },
    {
      label: 'Reports',
      route: '/field-resource-management/reports',
      icon: 'assessment',
      roles: [UserRole.Admin, UserRole.PM, UserRole.CM, UserRole.OSPCoordinator],
      children: [
        {
          label: 'Dashboard',
          route: '/field-resource-management/reports/dashboard',
          icon: 'dashboard',
          roles: [UserRole.Admin, UserRole.PM, UserRole.CM, UserRole.OSPCoordinator]
        },
        {
          label: 'Utilization',
          route: '/field-resource-management/reports/utilization',
          icon: 'bar_chart',
          roles: [UserRole.Admin, UserRole.PM, UserRole.CM, UserRole.OSPCoordinator]
        },
        {
          label: 'Performance',
          route: '/field-resource-management/reports/performance',
          icon: 'trending_up',
          roles: [UserRole.Admin, UserRole.PM, UserRole.CM, UserRole.OSPCoordinator]
        }
      ]
    },
    {
      label: 'My Daily Schedule',
      route: '/field-resource-management/mobile/daily',
      icon: 'today',
      roles: [UserRole.Technician, UserRole.DeploymentEngineer, UserRole.SRITech]
    },
    {
      label: 'Admin',
      route: '/field-resource-management/admin',
      icon: 'settings',
      roles: [UserRole.Admin],
      children: [
        {
          label: 'Configuration',
          route: '/field-resource-management/admin/configuration',
          icon: 'tune',
          roles: [UserRole.Admin]
        },
        {
          label: 'Job Templates',
          route: '/field-resource-management/admin/templates',
          icon: 'content_copy',
          roles: [UserRole.Admin]
        },
        {
          label: 'Regions',
          route: '/field-resource-management/admin/regions',
          icon: 'map',
          roles: [UserRole.Admin]
        },
        {
          label: 'Audit Log',
          route: '/field-resource-management/admin/audit-log',
          icon: 'history',
          roles: [UserRole.Admin]
        }
      ]
    }
  ];

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.menuItems = this.filterMenuByRole(this.allMenuItems);
  }

  private filterMenuByRole(items: FrmNavItem[]): FrmNavItem[] {
    return items
      .filter(item => this.hasAccess(item.roles))
      .map(item => ({
        ...item,
        children: item.children ? this.filterMenuByRole(item.children) : undefined
      }));
  }

  private hasAccess(roles: UserRole[]): boolean {
    return this.authService.isUserInRole(roles);
  }

  isActive(route: string): boolean {
    return window.location.pathname.startsWith(route);
  }
}
