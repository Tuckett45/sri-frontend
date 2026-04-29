import { Directive, Input, OnDestroy, OnInit, TemplateRef, ViewContainerRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { FrmPermissionKey, FrmPermissionService } from '../services/frm-permission.service';

const ALL_PERMISSION_KEYS: ReadonlySet<string> = new Set<FrmPermissionKey>([
  'canCreateJob', 'canStartJob', 'canEditJob',
  'canViewOwnSchedule', 'canViewAllSchedules', 'canEditSchedule', 'canAssignCrew',
  'canTrackTime', 'canSubmitTimecard', 'canApproveTimecard',
  'canApproveExpense', 'canApproveTravelRequest', 'canApproveBreakRequest',
  'canViewBudget', 'canManageBudget',
  'canViewReports', 'canViewManagementReports',
  'canManageIncidentReports', 'canManageDirectDeposit', 'canManageW4',
  'canManageContactInfo', 'canSignPRC', 'canViewPayStubs', 'canViewW2',
  'canAccessAdminPanel', 'canViewReadOnly', 'canManageOnboarding',
  'canViewDeploymentChecklist', 'canEditDeploymentChecklist', 'canSubmitEODReport',
  'canCreateQuote', 'canEditQuote', 'canValidateBOM', 'canViewQuote',
]);

@Directive({ selector: '[frmHasPermission]' })
export class FrmHasPermissionDirective implements OnInit, OnDestroy {
  @Input('frmHasPermission') permission!: FrmPermissionKey;

  private subscription: Subscription | null = null;
  private hasView = false;

  constructor(
    private templateRef: TemplateRef<unknown>,
    private viewContainer: ViewContainerRef,
    private permissionService: FrmPermissionService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.subscription = this.authService.getUserRole$().subscribe(role => {
      this.updateView(role);
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
  }

  private updateView(role: string | null | undefined): void {
    if (!ALL_PERMISSION_KEYS.has(this.permission)) {
      console.warn(`FrmHasPermissionDirective: unrecognized permission key "${this.permission}"`);
      this.clearView();
      return;
    }

    const granted = this.permissionService.hasPermission(role, this.permission);

    if (granted && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!granted && this.hasView) {
      this.clearView();
    }
  }

  private clearView(): void {
    this.viewContainer.clear();
    this.hasView = false;
  }
}
