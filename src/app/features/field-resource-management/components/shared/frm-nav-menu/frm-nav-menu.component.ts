import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../../../services/auth.service';
import { FrmPermissionService, FrmPermissionKey } from '../../../services/frm-permission.service';

export interface FrmNavItem {
  label: string;
  route: string;
  icon: string;
  permission: FrmPermissionKey | FrmPermissionKey[] | null; // null = always visible, array = any match
  children?: FrmNavItem[];
}

/**
 * Field Resource Management Navigation Menu Component
 *
 * Uses FrmPermissionService to filter navigation items based on the
 * current user's role. Reactively re-evaluates when the role changes.
 */
@Component({
  selector: 'app-frm-nav-menu-legacy',
  templateUrl: './frm-nav-menu.component.html',
  styleUrls: ['./frm-nav-menu.component.scss']
})
export class FrmNavMenuComponent implements OnInit, OnDestroy {
  menuItems: FrmNavItem[] = [];

  private roleSub!: Subscription;

  private readonly allMenuItems: FrmNavItem[] = [
    { label: 'Dashboard', route: '/field-resource-management/dashboard', icon: 'dashboard', permission: null },
    { label: 'My Schedule', route: '/field-resource-management/mobile/daily', icon: 'today', permission: 'canViewOwnSchedule' },
    { label: 'Jobs', route: '/field-resource-management/jobs', icon: 'work', permission: 'canStartJob' },
    { label: 'Mobile', route: '/field-resource-management/mobile', icon: 'phone_android', permission: 'canTrackTime' },
    { label: 'Timecards', route: '/field-resource-management/timecard', icon: 'schedule', permission: 'canSubmitTimecard' },
    { label: 'Technicians', route: '/field-resource-management/technicians', icon: 'people', permission: 'canViewAllSchedules' },
    { label: 'Crews', route: '/field-resource-management/crews', icon: 'groups', permission: 'canAssignCrew' },
    { label: 'Schedule', route: '/field-resource-management/schedule', icon: 'calendar_today', permission: 'canEditSchedule' },
    { label: 'Approvals', route: '/field-resource-management/approvals', icon: 'check_circle', permission: 'canApproveTimecard' },
    { label: 'Reports', route: '/field-resource-management/reports', icon: 'assessment',
      permission: ['canViewReports', 'canViewReadOnly'],
      children: [
        { label: 'Dashboard', route: '/field-resource-management/reports/dashboard', icon: 'dashboard', permission: ['canViewReports', 'canViewReadOnly'] },
        { label: 'Utilization', route: '/field-resource-management/reports/utilization', icon: 'bar_chart', permission: ['canViewReports', 'canViewReadOnly'] },
        { label: 'Performance', route: '/field-resource-management/reports/performance', icon: 'trending_up', permission: ['canViewReports', 'canViewReadOnly'] },
      ]
    },
    { label: 'Map', route: '/field-resource-management/map', icon: 'map', permission: 'canViewAllSchedules' },
    { label: 'Inventory', route: '/field-resource-management/inventory', icon: 'inventory', permission: 'canAssignCrew' },
    { label: 'Travel', route: '/field-resource-management/travel', icon: 'flight', permission: 'canApproveTravelRequest' },
    { label: 'Materials', route: '/field-resource-management/materials', icon: 'category', permission: 'canAssignCrew' },
    { label: 'Incident Reports', route: '/field-resource-management/payroll/incident-reports', icon: 'report', permission: 'canManageIncidentReports' },
    { label: 'Direct Deposit', route: '/field-resource-management/payroll/direct-deposit', icon: 'account_balance', permission: 'canManageDirectDeposit' },
    { label: 'W-4', route: '/field-resource-management/payroll/w4', icon: 'description', permission: 'canManageW4' },
    { label: 'Contact Info', route: '/field-resource-management/payroll/contact-info', icon: 'contact_mail', permission: 'canManageContactInfo' },
    { label: 'PRC', route: '/field-resource-management/payroll/prc', icon: 'draw', permission: 'canSignPRC' },
    { label: 'Pay Stubs', route: '/field-resource-management/payroll/pay-stubs', icon: 'receipt', permission: 'canViewPayStubs' },
    { label: 'W-2', route: '/field-resource-management/payroll/w2', icon: 'article', permission: 'canViewW2' },
    { label: 'Admin', route: '/field-resource-management/admin', icon: 'settings', permission: 'canAccessAdminPanel',
      children: [
        { label: 'Configuration', route: '/field-resource-management/admin/configuration', icon: 'tune', permission: 'canAccessAdminPanel' },
        { label: 'Job Templates', route: '/field-resource-management/admin/templates', icon: 'content_copy', permission: 'canAccessAdminPanel' },
        { label: 'Regions', route: '/field-resource-management/admin/regions', icon: 'map', permission: 'canAccessAdminPanel' },
        { label: 'Audit Log', route: '/field-resource-management/admin/audit-log', icon: 'history', permission: 'canAccessAdminPanel' },
      ]
    },
  ];

  constructor(
    private authService: AuthService,
    private permissionService: FrmPermissionService
  ) {}

  ngOnInit(): void {
    this.roleSub = this.authService.getUserRole$().subscribe(role => {
      this.menuItems = this.filterMenuByRole(role, this.allMenuItems);
    });
  }

  ngOnDestroy(): void {
    this.roleSub?.unsubscribe();
  }

  filterMenuByRole(role: string | null | undefined, items: FrmNavItem[]): FrmNavItem[] {
    return items
      .filter(item => this.hasItemPermission(role, item.permission))
      .map(item => ({
        ...item,
        children: item.children ? this.filterMenuByRole(role, item.children) : undefined
      }));
  }

  private hasItemPermission(role: string | null | undefined, permission: FrmPermissionKey | FrmPermissionKey[] | null): boolean {
    if (permission === null) {
      return true;
    }
    if (Array.isArray(permission)) {
      return permission.some(p => this.permissionService.hasPermission(role, p));
    }
    return this.permissionService.hasPermission(role, permission);
  }

  isActive(route: string): boolean {
    return window.location.pathname.startsWith(route);
  }
}
