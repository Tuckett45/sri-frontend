import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../../../services/auth.service';
import { FrmPermissionService } from '../../../../services/frm-permission.service';
import { QuickAction } from '../../../../models/dashboard.models';
import { UserRole } from '../../../../../../models/role.enum';

@Component({
  selector: 'app-hr-payroll-dashboard',
  templateUrl: './hr-payroll-dashboard.component.html',
  styleUrls: ['./hr-payroll-dashboard.component.scss']
})
export class HrPayrollDashboardComponent implements OnInit {
  quickActions: QuickAction[] = [];

  constructor(
    private router: Router,
    private authService: AuthService,
    private frmPermissionService: FrmPermissionService
  ) {}

  ngOnInit(): void {
    this.buildQuickActions();
  }

  private buildQuickActions(): void {
    const hrActions: QuickAction[] = [
      { label: 'Approvals', icon: 'approval', route: '/field-resource-management/approvals', color: 'primary', visible: true },
      { label: 'Timecard Management', icon: 'receipt_long', route: '/field-resource-management/timecards', color: 'primary', visible: true },
      { label: 'Reports', icon: 'bar_chart', route: '/field-resource-management/reports', color: 'primary', visible: true }
    ];

    const isPayroll = this.authService.getUserRole() === UserRole.Payroll;

    const payrollActions: QuickAction[] = [
      { label: 'Pay Stubs', icon: 'description', route: '/field-resource-management/payroll/pay-stubs', color: 'primary', visible: isPayroll },
      { label: 'W-2', icon: 'article', route: '/field-resource-management/payroll/w2', color: 'primary', visible: isPayroll },
      { label: 'Direct Deposit', icon: 'account_balance', route: '/field-resource-management/payroll/direct-deposit', color: 'primary', visible: isPayroll },
      { label: 'W-4', icon: 'assignment', route: '/field-resource-management/payroll/w4', color: 'primary', visible: isPayroll }
    ];

    this.quickActions = [...hrActions, ...payrollActions];
  }

  onTimecardSelected(timecardId: string): void {
    this.router.navigate(['/field-resource-management/timecards', timecardId]);
  }

  onExpenseSelected(expenseId: string): void {
    this.router.navigate(['/field-resource-management/expenses', expenseId]);
  }
}
