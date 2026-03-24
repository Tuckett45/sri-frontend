import { Injectable } from '@angular/core';
import { UserRole } from '../../../models/role.enum';

export type FrmPermissionKey =
  | 'canStartJob'
  | 'canEditJob'
  | 'canViewOwnSchedule'
  | 'canViewAllSchedules'
  | 'canEditSchedule'
  | 'canAssignCrew'
  | 'canTrackTime'
  | 'canSubmitTimecard'
  | 'canApproveTimecard'
  | 'canApproveExpense'
  | 'canApproveTravelRequest'
  | 'canApproveBreakRequest'
  | 'canViewBudget'
  | 'canManageBudget'
  | 'canViewReports'
  | 'canViewManagementReports'
  | 'canManageIncidentReports'
  | 'canManageDirectDeposit'
  | 'canManageW4'
  | 'canManageContactInfo'
  | 'canSignPRC'
  | 'canViewPayStubs'
  | 'canViewW2'
  | 'canAccessAdminPanel'
  | 'canViewReadOnly';

export type FrmPermissionSet = Record<FrmPermissionKey, boolean>;

const ALL_FALSE: FrmPermissionSet = {
  canStartJob: false,
  canEditJob: false,
  canViewOwnSchedule: false,
  canViewAllSchedules: false,
  canEditSchedule: false,
  canAssignCrew: false,
  canTrackTime: false,
  canSubmitTimecard: false,
  canApproveTimecard: false,
  canApproveExpense: false,
  canApproveTravelRequest: false,
  canApproveBreakRequest: false,
  canViewBudget: false,
  canManageBudget: false,
  canViewReports: false,
  canViewManagementReports: false,
  canManageIncidentReports: false,
  canManageDirectDeposit: false,
  canManageW4: false,
  canManageContactInfo: false,
  canSignPRC: false,
  canViewPayStubs: false,
  canViewW2: false,
  canAccessAdminPanel: false,
  canViewReadOnly: false,
};

const FIELD_GROUP_PERMISSIONS: FrmPermissionSet = {
  ...ALL_FALSE,
  canStartJob: true,
  canEditJob: true,
  canViewOwnSchedule: true,
  canTrackTime: true,
  canSubmitTimecard: true,
};

const MANAGER_GROUP_PERMISSIONS: FrmPermissionSet = {
  ...FIELD_GROUP_PERMISSIONS,
  canViewAllSchedules: true,
  canEditSchedule: true,
  canAssignCrew: true,
  canApproveTimecard: true,
  canApproveExpense: true,
  canApproveTravelRequest: true,
  canViewBudget: true,
  canViewReports: true,
  canViewManagementReports: true,
};

const HR_GROUP_PERMISSIONS: FrmPermissionSet = {
  ...ALL_FALSE,
  canApproveExpense: true,
  canApproveTravelRequest: true,
  canApproveTimecard: true,
  canApproveBreakRequest: true,
};

const PAYROLL_GROUP_PERMISSIONS: FrmPermissionSet = {
  ...HR_GROUP_PERMISSIONS,
  canManageIncidentReports: true,
  canManageDirectDeposit: true,
  canManageW4: true,
  canManageContactInfo: true,
  canSignPRC: true,
  canViewPayStubs: true,
  canViewW2: true,
};

const READONLY_GROUP_PERMISSIONS: FrmPermissionSet = {
  ...ALL_FALSE,
  canViewReadOnly: true,
};

const ADMIN_PERMISSIONS: FrmPermissionSet = {
  canStartJob: true,
  canEditJob: true,
  canViewOwnSchedule: true,
  canViewAllSchedules: true,
  canEditSchedule: true,
  canAssignCrew: true,
  canTrackTime: true,
  canSubmitTimecard: true,
  canApproveTimecard: true,
  canApproveExpense: true,
  canApproveTravelRequest: true,
  canApproveBreakRequest: true,
  canViewBudget: true,
  canManageBudget: true,
  canViewReports: true,
  canViewManagementReports: true,
  canManageIncidentReports: true,
  canManageDirectDeposit: true,
  canManageW4: true,
  canManageContactInfo: true,
  canSignPRC: true,
  canViewPayStubs: true,
  canViewW2: true,
  canAccessAdminPanel: true,
  canViewReadOnly: true,
};

@Injectable({ providedIn: 'root' })
export class FrmPermissionService {
  private readonly permissionMap: Record<string, FrmPermissionSet> = {
    // Field_Group
    [UserRole.Technician]: FIELD_GROUP_PERMISSIONS,
    [UserRole.DeploymentEngineer]: FIELD_GROUP_PERMISSIONS,
    [UserRole.CM]: FIELD_GROUP_PERMISSIONS,
    [UserRole.SRITech]: FIELD_GROUP_PERMISSIONS,

    // Manager_Group
    [UserRole.PM]: MANAGER_GROUP_PERMISSIONS,
    [UserRole.Admin]: ADMIN_PERMISSIONS,
    [UserRole.DCOps]: MANAGER_GROUP_PERMISSIONS,
    [UserRole.OSPCoordinator]: MANAGER_GROUP_PERMISSIONS,
    [UserRole.EngineeringFieldSupport]: MANAGER_GROUP_PERMISSIONS,
    [UserRole.MaterialsManager]: MANAGER_GROUP_PERMISSIONS,
    [UserRole.Manager]: MANAGER_GROUP_PERMISSIONS,

    // HR_Group
    [UserRole.HR]: HR_GROUP_PERMISSIONS,

    // Payroll_Group
    [UserRole.Payroll]: PAYROLL_GROUP_PERMISSIONS,

    // ReadOnly_Group
    [UserRole.VendorRep]: READONLY_GROUP_PERMISSIONS,
    [UserRole.Client]: READONLY_GROUP_PERMISSIONS,
    [UserRole.Controller]: READONLY_GROUP_PERMISSIONS,

    // Other roles with no FRM permissions
    [UserRole.Temp]: ALL_FALSE,
    [UserRole.User]: ALL_FALSE,
  };

  hasPermission(role: string | null | undefined, permission: FrmPermissionKey): boolean {
    if (role == null) {
      return false;
    }
    const permissions = this.permissionMap[role];
    if (!permissions) {
      return false;
    }
    return permissions[permission] ?? false;
  }

  getPermissionsForRole(role: string | null | undefined): FrmPermissionSet {
    if (role == null) {
      return { ...ALL_FALSE };
    }
    const permissions = this.permissionMap[role];
    if (!permissions) {
      console.warn(`FrmPermissionService: unknown role "${role}", returning all-false permission set`);
      return { ...ALL_FALSE };
    }
    return { ...permissions };
  }
}
