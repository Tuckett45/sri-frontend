import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../../../services/auth.service';
import { FrmPermissionService } from '../../../services/frm-permission.service';

export interface PayrollNavLink {
  label: string;
  route: string;
  visible: boolean;
}

@Component({
  selector: 'app-payroll-nav',
  templateUrl: './payroll-nav.component.html',
  styleUrls: ['./payroll-nav.component.scss']
})
export class PayrollNavComponent implements OnInit {
  navLinks: PayrollNavLink[] = [];
  readOnly = false;

  constructor(
    private authService: AuthService,
    private permissionService: FrmPermissionService
  ) {}

  ngOnInit(): void {
    const role = this.authService.getUserRole();
    const canManage = this.permissionService.hasPermission(role, 'canManageIncidentReports');

    // Payroll_Group and Admin have canManageIncidentReports = true → full access
    // HR_Group does NOT have canManageIncidentReports → read-only, limited links
    this.readOnly = !canManage;

    this.navLinks = [
      { label: 'Incident Reports', route: './incident-reports', visible: true },
      { label: 'Direct Deposit', route: './direct-deposit', visible: canManage },
      { label: 'W-4', route: './w4', visible: canManage },
      { label: 'Contact Info', route: './contact-info', visible: canManage },
      { label: 'PRC Signing', route: './prc', visible: canManage },
      { label: 'Pay Stubs', route: './pay-stubs', visible: true },
      { label: 'W-2', route: './w2', visible: true }
    ];
  }
}
