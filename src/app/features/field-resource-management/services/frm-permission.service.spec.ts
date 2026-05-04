import * as fc from 'fast-check';
import { TestBed } from '@angular/core/testing';
import { FrmPermissionService, FrmPermissionKey, FrmPermissionSet } from './frm-permission.service';
import { UserRole } from '../../../models/role.enum';

const ALL_PERMISSION_KEYS: FrmPermissionKey[] = [
  'canCreateJob', 'canStartJob', 'canEditJob', 'canViewOwnSchedule', 'canViewAllSchedules',
  'canEditSchedule', 'canAssignCrew', 'canTrackTime', 'canSubmitTimecard',
  'canApproveTimecard', 'canApproveExpense', 'canApproveTravelRequest',
  'canApproveBreakRequest', 'canViewBudget', 'canManageBudget', 'canEditMileage',
  'canViewReports', 'canViewManagementReports', 'canManageIncidentReports',
  'canManageDirectDeposit', 'canManageW4', 'canManageContactInfo', 'canSignPRC',
  'canViewPayStubs', 'canViewW2', 'canAccessAdminPanel', 'canViewReadOnly',
  'canManageOnboarding', 'canViewDeploymentChecklist', 'canEditDeploymentChecklist',
  'canSubmitEODReport', 'canCreateQuote', 'canEditQuote', 'canValidateBOM', 'canViewQuote',
];

const ALL_ROLES = Object.values(UserRole);

const FIELD_GROUP = [UserRole.Technician, UserRole.DeploymentEngineer, UserRole.CM, UserRole.SRITech];
const MANAGER_GROUP = [UserRole.PM, UserRole.DCOps, UserRole.OSPCoordinator, UserRole.EngineeringFieldSupport, UserRole.MaterialsManager, UserRole.Manager];
const HR_GROUP = [UserRole.HR];
const PAYROLL_GROUP = [UserRole.Payroll];
const READONLY_GROUP = [UserRole.VendorRep, UserRole.Client, UserRole.Controller];

describe('FrmPermissionService', () => {
  let service: FrmPermissionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FrmPermissionService);
  });

  // ─── Unit Tests ───────────────────────────────────────────────────────────

  describe('Unit Tests', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('Admin role returns all permissions true', () => {
      const perms = service.getPermissionsForRole(UserRole.Admin);
      for (const key of ALL_PERMISSION_KEYS) {
        expect(perms[key]).withContext(`Admin should have ${key}`).toBeTrue();
      }
    });

    it('ReadOnly roles return only canViewReadOnly as true', () => {
      for (const role of READONLY_GROUP) {
        const perms = service.getPermissionsForRole(role);
        expect(perms.canViewReadOnly).withContext(`${role} should have canViewReadOnly`).toBeTrue();
        for (const key of ALL_PERMISSION_KEYS.filter(k => k !== 'canViewReadOnly')) {
          expect(perms[key]).withContext(`${role} should NOT have ${key}`).toBeFalse();
        }
      }
    });

    it('null role returns all-false permission set', () => {
      const perms = service.getPermissionsForRole(null);
      for (const key of ALL_PERMISSION_KEYS) {
        expect(perms[key]).withContext(`null role should not have ${key}`).toBeFalse();
      }
    });

    it('undefined role returns all-false permission set', () => {
      const perms = service.getPermissionsForRole(undefined);
      for (const key of ALL_PERMISSION_KEYS) {
        expect(perms[key]).withContext(`undefined role should not have ${key}`).toBeFalse();
      }
    });

    it('unknown role string returns all-false set and does not throw', () => {
      expect(() => {
        const perms = service.getPermissionsForRole('UnknownRole');
        for (const key of ALL_PERMISSION_KEYS) {
          expect(perms[key]).toBeFalse();
        }
      }).not.toThrow();
    });

    it('hasPermission returns false for null role', () => {
      expect(service.hasPermission(null, 'canStartJob')).toBeFalse();
    });

    it('hasPermission returns false for undefined role', () => {
      expect(service.hasPermission(undefined, 'canStartJob')).toBeFalse();
    });

    it('hasPermission returns false for unknown role', () => {
      expect(service.hasPermission('GhostRole', 'canStartJob')).toBeFalse();
    });

    it('hasPermission returns true for Admin on any permission', () => {
      for (const key of ALL_PERMISSION_KEYS) {
        expect(service.hasPermission(UserRole.Admin, key)).withContext(`Admin.${key}`).toBeTrue();
      }
    });

    it('getPermissionsForRole returns a copy (mutation does not affect service)', () => {
      const perms = service.getPermissionsForRole(UserRole.Admin);
      perms.canStartJob = false;
      const perms2 = service.getPermissionsForRole(UserRole.Admin);
      expect(perms2.canStartJob).toBeTrue();
    });

    // ─── Deployment Checklist Permission Tests (Requirements 1.1–1.9) ───────

    describe('Deployment Checklist Permissions', () => {
      const FULL_CHECKLIST_ROLES = [
        UserRole.Admin,
        UserRole.PM,
        UserRole.DCOps,
        UserRole.OSPCoordinator,
        UserRole.EngineeringFieldSupport,
        UserRole.Manager,
        UserRole.DeploymentEngineer,
      ];

      const VIEW_AND_EOD_ONLY_ROLES = [
        UserRole.Technician,
        UserRole.SRITech,
        UserRole.CM,
      ];

      const NO_CHECKLIST_ROLES = [
        UserRole.HR,
        UserRole.Payroll,
        UserRole.VendorRep,
        UserRole.Client,
        UserRole.Controller,
        UserRole.Temp,
        UserRole.User,
        UserRole.MaterialsManager,
      ];

      it('Admin/PM/DCOps/OSPCoordinator/EngineeringFieldSupport/Manager/DeploymentEngineer get all three checklist permissions', () => {
        for (const role of FULL_CHECKLIST_ROLES) {
          expect(service.hasPermission(role, 'canViewDeploymentChecklist'))
            .withContext(`${role} should have canViewDeploymentChecklist`).toBeTrue();
          expect(service.hasPermission(role, 'canEditDeploymentChecklist'))
            .withContext(`${role} should have canEditDeploymentChecklist`).toBeTrue();
          expect(service.hasPermission(role, 'canSubmitEODReport'))
            .withContext(`${role} should have canSubmitEODReport`).toBeTrue();
        }
      });

      it('Technician/SRITech/CM get view and EOD only, not edit', () => {
        for (const role of VIEW_AND_EOD_ONLY_ROLES) {
          expect(service.hasPermission(role, 'canViewDeploymentChecklist'))
            .withContext(`${role} should have canViewDeploymentChecklist`).toBeTrue();
          expect(service.hasPermission(role, 'canEditDeploymentChecklist'))
            .withContext(`${role} should NOT have canEditDeploymentChecklist`).toBeFalse();
          expect(service.hasPermission(role, 'canSubmitEODReport'))
            .withContext(`${role} should have canSubmitEODReport`).toBeTrue();
        }
      });

      it('HR/Payroll/ReadOnly/Temp/User/MaterialsManager get no checklist permissions', () => {
        for (const role of NO_CHECKLIST_ROLES) {
          expect(service.hasPermission(role, 'canViewDeploymentChecklist'))
            .withContext(`${role} should NOT have canViewDeploymentChecklist`).toBeFalse();
          expect(service.hasPermission(role, 'canEditDeploymentChecklist'))
            .withContext(`${role} should NOT have canEditDeploymentChecklist`).toBeFalse();
          expect(service.hasPermission(role, 'canSubmitEODReport'))
            .withContext(`${role} should NOT have canSubmitEODReport`).toBeFalse();
        }
      });

      it('canViewDeploymentChecklist is required for canEditDeploymentChecklist (Req 1.4–1.9)', () => {
        for (const role of Object.values(UserRole)) {
          const canEdit = service.hasPermission(role, 'canEditDeploymentChecklist');
          const canView = service.hasPermission(role, 'canViewDeploymentChecklist');
          if (canEdit) {
            expect(canView)
              .withContext(`${role} has canEdit but not canView — edit implies view`).toBeTrue();
          }
        }
      });

      it('canSubmitEODReport is required for canViewDeploymentChecklist (Req 1.7–1.9)', () => {
        for (const role of Object.values(UserRole)) {
          const canSubmitEOD = service.hasPermission(role, 'canSubmitEODReport');
          const canView = service.hasPermission(role, 'canViewDeploymentChecklist');
          if (canSubmitEOD) {
            expect(canView)
              .withContext(`${role} has canSubmitEODReport but not canView — EOD implies view`).toBeTrue();
          }
        }
      });
    });

    // ─── Quote Permission Tests (Requirements 1.1–1.11) ────────────────────

    describe('Quote Permissions', () => {
      it('Admin gets all four quote permissions (Req 1.5)', () => {
        expect(service.hasPermission(UserRole.Admin, 'canCreateQuote')).toBeTrue();
        expect(service.hasPermission(UserRole.Admin, 'canEditQuote')).toBeTrue();
        expect(service.hasPermission(UserRole.Admin, 'canValidateBOM')).toBeTrue();
        expect(service.hasPermission(UserRole.Admin, 'canViewQuote')).toBeTrue();
      });

      it('PM gets canCreateQuote, canEditQuote, canViewQuote but not canValidateBOM (Req 1.6)', () => {
        expect(service.hasPermission(UserRole.PM, 'canCreateQuote')).toBeTrue();
        expect(service.hasPermission(UserRole.PM, 'canEditQuote')).toBeTrue();
        expect(service.hasPermission(UserRole.PM, 'canValidateBOM')).toBeFalse();
        expect(service.hasPermission(UserRole.PM, 'canViewQuote')).toBeTrue();
      });

      it('DCOps gets canCreateQuote, canEditQuote, canViewQuote but not canValidateBOM (Req 1.7)', () => {
        expect(service.hasPermission(UserRole.DCOps, 'canCreateQuote')).toBeTrue();
        expect(service.hasPermission(UserRole.DCOps, 'canEditQuote')).toBeTrue();
        expect(service.hasPermission(UserRole.DCOps, 'canValidateBOM')).toBeFalse();
        expect(service.hasPermission(UserRole.DCOps, 'canViewQuote')).toBeTrue();
      });

      it('OSPCoordinator gets canCreateQuote, canEditQuote, canViewQuote but not canValidateBOM (Req 1.9)', () => {
        expect(service.hasPermission(UserRole.OSPCoordinator, 'canCreateQuote')).toBeTrue();
        expect(service.hasPermission(UserRole.OSPCoordinator, 'canEditQuote')).toBeTrue();
        expect(service.hasPermission(UserRole.OSPCoordinator, 'canValidateBOM')).toBeFalse();
        expect(service.hasPermission(UserRole.OSPCoordinator, 'canViewQuote')).toBeTrue();
      });

      it('EngineeringFieldSupport gets canCreateQuote, canEditQuote, canViewQuote but not canValidateBOM (Req 1.10)', () => {
        expect(service.hasPermission(UserRole.EngineeringFieldSupport, 'canCreateQuote')).toBeTrue();
        expect(service.hasPermission(UserRole.EngineeringFieldSupport, 'canEditQuote')).toBeTrue();
        expect(service.hasPermission(UserRole.EngineeringFieldSupport, 'canValidateBOM')).toBeFalse();
        expect(service.hasPermission(UserRole.EngineeringFieldSupport, 'canViewQuote')).toBeTrue();
      });

      it('Manager gets canCreateQuote, canEditQuote, canViewQuote but not canValidateBOM (Req 1.11)', () => {
        expect(service.hasPermission(UserRole.Manager, 'canCreateQuote')).toBeTrue();
        expect(service.hasPermission(UserRole.Manager, 'canEditQuote')).toBeTrue();
        expect(service.hasPermission(UserRole.Manager, 'canValidateBOM')).toBeFalse();
        expect(service.hasPermission(UserRole.Manager, 'canViewQuote')).toBeTrue();
      });

      it('MaterialsManager gets canEditQuote, canValidateBOM, canViewQuote but not canCreateQuote (Req 1.8)', () => {
        expect(service.hasPermission(UserRole.MaterialsManager, 'canCreateQuote')).toBeFalse();
        expect(service.hasPermission(UserRole.MaterialsManager, 'canEditQuote')).toBeTrue();
        expect(service.hasPermission(UserRole.MaterialsManager, 'canValidateBOM')).toBeTrue();
        expect(service.hasPermission(UserRole.MaterialsManager, 'canViewQuote')).toBeTrue();
      });

      it('Field_Group roles get no quote permissions', () => {
        const fieldRoles = [UserRole.Technician, UserRole.DeploymentEngineer, UserRole.CM, UserRole.SRITech];
        for (const role of fieldRoles) {
          expect(service.hasPermission(role, 'canCreateQuote'))
            .withContext(`${role} should NOT have canCreateQuote`).toBeFalse();
          expect(service.hasPermission(role, 'canEditQuote'))
            .withContext(`${role} should NOT have canEditQuote`).toBeFalse();
          expect(service.hasPermission(role, 'canValidateBOM'))
            .withContext(`${role} should NOT have canValidateBOM`).toBeFalse();
          expect(service.hasPermission(role, 'canViewQuote'))
            .withContext(`${role} should NOT have canViewQuote`).toBeFalse();
        }
      });

      it('HR_Group gets no quote permissions', () => {
        expect(service.hasPermission(UserRole.HR, 'canCreateQuote')).toBeFalse();
        expect(service.hasPermission(UserRole.HR, 'canEditQuote')).toBeFalse();
        expect(service.hasPermission(UserRole.HR, 'canValidateBOM')).toBeFalse();
        expect(service.hasPermission(UserRole.HR, 'canViewQuote')).toBeFalse();
      });

      it('Payroll_Group gets no quote permissions', () => {
        expect(service.hasPermission(UserRole.Payroll, 'canCreateQuote')).toBeFalse();
        expect(service.hasPermission(UserRole.Payroll, 'canEditQuote')).toBeFalse();
        expect(service.hasPermission(UserRole.Payroll, 'canValidateBOM')).toBeFalse();
        expect(service.hasPermission(UserRole.Payroll, 'canViewQuote')).toBeFalse();
      });

      it('ReadOnly_Group gets no quote permissions', () => {
        for (const role of READONLY_GROUP) {
          expect(service.hasPermission(role, 'canCreateQuote'))
            .withContext(`${role} should NOT have canCreateQuote`).toBeFalse();
          expect(service.hasPermission(role, 'canEditQuote'))
            .withContext(`${role} should NOT have canEditQuote`).toBeFalse();
          expect(service.hasPermission(role, 'canValidateBOM'))
            .withContext(`${role} should NOT have canValidateBOM`).toBeFalse();
          expect(service.hasPermission(role, 'canViewQuote'))
            .withContext(`${role} should NOT have canViewQuote`).toBeFalse();
        }
      });

      it('canEditQuote is required for canCreateQuote (create implies edit)', () => {
        for (const role of Object.values(UserRole)) {
          const canCreate = service.hasPermission(role, 'canCreateQuote');
          const canEdit = service.hasPermission(role, 'canEditQuote');
          if (canCreate) {
            expect(canEdit)
              .withContext(`${role} has canCreateQuote but not canEditQuote — create implies edit`).toBeTrue();
          }
        }
      });

      it('canViewQuote is required for canEditQuote (edit implies view)', () => {
        for (const role of Object.values(UserRole)) {
          const canEdit = service.hasPermission(role, 'canEditQuote');
          const canView = service.hasPermission(role, 'canViewQuote');
          if (canEdit) {
            expect(canView)
              .withContext(`${role} has canEditQuote but not canViewQuote — edit implies view`).toBeTrue();
          }
        }
      });
    });
  });

  // ─── Property-Based Tests ─────────────────────────────────────────────────

  describe('Property Tests', () => {
    // Feature: frm-role-based-views, Property 2: hasPermission and getPermissionsForRole are consistent
    it('Property 2: hasPermission and getPermissionsForRole are consistent', () => {
      // Validates: Requirements 2.2, 2.4
      fc.assert(
        fc.property(
          fc.constantFrom(...ALL_ROLES),
          fc.constantFrom(...ALL_PERMISSION_KEYS),
          (role, permission) => {
            const fromHasPermission = service.hasPermission(role, permission);
            const fromGetPermissions = service.getPermissionsForRole(role)[permission];
            expect(fromHasPermission).toBe(fromGetPermissions);

            const allPerms = service.getPermissionsForRole(role);
            expect(Object.keys(allPerms).length).toBe(35);
          }
        ),
        { numRuns: 20 }
      );
    });

    // Feature: frm-role-based-views, Property 3: role group permissions are correctly assigned
    it('Property 3: role group permissions are correctly assigned', () => {
      // Validates: Requirements 2.7, 2.8, 2.9, 2.10, 2.11
      fc.assert(
        fc.property(
          fc.constantFrom(...ALL_ROLES),
          (role) => {
            const perms = service.getPermissionsForRole(role);

            if (FIELD_GROUP.includes(role as UserRole)) {
              expect(perms.canStartJob).withContext(`${role}.canStartJob`).toBeTrue();
              expect(perms.canEditJob).withContext(`${role}.canEditJob`).toBeTrue();
              expect(perms.canViewOwnSchedule).withContext(`${role}.canViewOwnSchedule`).toBeTrue();
              expect(perms.canTrackTime).withContext(`${role}.canTrackTime`).toBeTrue();
              expect(perms.canSubmitTimecard).withContext(`${role}.canSubmitTimecard`).toBeTrue();
              // Checklist: view + EOD for all field group
              expect(perms.canViewDeploymentChecklist).withContext(`${role}.canViewDeploymentChecklist`).toBeTrue();
              expect(perms.canSubmitEODReport).withContext(`${role}.canSubmitEODReport`).toBeTrue();
              // No quote permissions for field group
              expect(perms.canCreateQuote).withContext(`${role}.canCreateQuote`).toBeFalse();
              expect(perms.canEditQuote).withContext(`${role}.canEditQuote`).toBeFalse();
              expect(perms.canValidateBOM).withContext(`${role}.canValidateBOM`).toBeFalse();
              expect(perms.canViewQuote).withContext(`${role}.canViewQuote`).toBeFalse();
              // Payroll/admin permissions must be false
              expect(perms.canManageDirectDeposit).withContext(`${role}.canManageDirectDeposit`).toBeFalse();
              expect(perms.canAccessAdminPanel).withContext(`${role}.canAccessAdminPanel`).toBeFalse();
            }

            if (MANAGER_GROUP.includes(role as UserRole)) {
              // All Field_Group permissions
              expect(perms.canStartJob).withContext(`${role}.canStartJob`).toBeTrue();
              expect(perms.canEditJob).withContext(`${role}.canEditJob`).toBeTrue();
              expect(perms.canViewOwnSchedule).withContext(`${role}.canViewOwnSchedule`).toBeTrue();
              expect(perms.canTrackTime).withContext(`${role}.canTrackTime`).toBeTrue();
              expect(perms.canSubmitTimecard).withContext(`${role}.canSubmitTimecard`).toBeTrue();
              // Plus manager permissions
              expect(perms.canViewAllSchedules).withContext(`${role}.canViewAllSchedules`).toBeTrue();
              expect(perms.canEditSchedule).withContext(`${role}.canEditSchedule`).toBeTrue();
              expect(perms.canAssignCrew).withContext(`${role}.canAssignCrew`).toBeTrue();
              expect(perms.canApproveTimecard).withContext(`${role}.canApproveTimecard`).toBeTrue();
              expect(perms.canApproveExpense).withContext(`${role}.canApproveExpense`).toBeTrue();
              expect(perms.canApproveTravelRequest).withContext(`${role}.canApproveTravelRequest`).toBeTrue();
              expect(perms.canViewBudget).withContext(`${role}.canViewBudget`).toBeTrue();
              expect(perms.canEditMileage).withContext(`${role}.canEditMileage`).toBeTrue();
              expect(perms.canViewReports).withContext(`${role}.canViewReports`).toBeTrue();
              expect(perms.canViewManagementReports).withContext(`${role}.canViewManagementReports`).toBeTrue();
              // Checklist: all three for manager group except MaterialsManager
              if (role !== UserRole.MaterialsManager) {
                expect(perms.canViewDeploymentChecklist).withContext(`${role}.canViewDeploymentChecklist`).toBeTrue();
                expect(perms.canEditDeploymentChecklist).withContext(`${role}.canEditDeploymentChecklist`).toBeTrue();
                expect(perms.canSubmitEODReport).withContext(`${role}.canSubmitEODReport`).toBeTrue();
              } else {
                expect(perms.canViewDeploymentChecklist).withContext(`${role}.canViewDeploymentChecklist`).toBeFalse();
                expect(perms.canEditDeploymentChecklist).withContext(`${role}.canEditDeploymentChecklist`).toBeFalse();
                expect(perms.canSubmitEODReport).withContext(`${role}.canSubmitEODReport`).toBeFalse();
              }
              // Quote permissions: all manager group get canEditQuote and canViewQuote
              expect(perms.canEditQuote).withContext(`${role}.canEditQuote`).toBeTrue();
              expect(perms.canViewQuote).withContext(`${role}.canViewQuote`).toBeTrue();
              // MaterialsManager gets canValidateBOM but not canCreateQuote; others get canCreateQuote but not canValidateBOM
              if (role === UserRole.MaterialsManager) {
                expect(perms.canCreateQuote).withContext(`${role}.canCreateQuote`).toBeFalse();
                expect(perms.canValidateBOM).withContext(`${role}.canValidateBOM`).toBeTrue();
              } else {
                expect(perms.canCreateQuote).withContext(`${role}.canCreateQuote`).toBeTrue();
                expect(perms.canValidateBOM).withContext(`${role}.canValidateBOM`).toBeFalse();
              }
              // Payroll/admin permissions must be false
              expect(perms.canManageDirectDeposit).withContext(`${role}.canManageDirectDeposit`).toBeFalse();
              expect(perms.canAccessAdminPanel).withContext(`${role}.canAccessAdminPanel`).toBeFalse();
            }

            if (HR_GROUP.includes(role as UserRole)) {
              expect(perms.canCreateJob).withContext(`${role}.canCreateJob`).toBeFalse();
              expect(perms.canApproveExpense).withContext(`${role}.canApproveExpense`).toBeTrue();
              expect(perms.canApproveTravelRequest).withContext(`${role}.canApproveTravelRequest`).toBeTrue();
              expect(perms.canApproveTimecard).withContext(`${role}.canApproveTimecard`).toBeTrue();
              expect(perms.canApproveBreakRequest).withContext(`${role}.canApproveBreakRequest`).toBeTrue();
              expect(perms.canManageOnboarding).withContext(`${role}.canManageOnboarding`).toBeTrue();
              // No checklist permissions
              expect(perms.canViewDeploymentChecklist).withContext(`${role}.canViewDeploymentChecklist`).toBeFalse();
              expect(perms.canEditDeploymentChecklist).withContext(`${role}.canEditDeploymentChecklist`).toBeFalse();
              expect(perms.canSubmitEODReport).withContext(`${role}.canSubmitEODReport`).toBeFalse();
              // No quote permissions
              expect(perms.canCreateQuote).withContext(`${role}.canCreateQuote`).toBeFalse();
              expect(perms.canEditQuote).withContext(`${role}.canEditQuote`).toBeFalse();
              expect(perms.canValidateBOM).withContext(`${role}.canValidateBOM`).toBeFalse();
              expect(perms.canViewQuote).withContext(`${role}.canViewQuote`).toBeFalse();
              // Payroll-specific and admin must be false
              expect(perms.canManageDirectDeposit).withContext(`${role}.canManageDirectDeposit`).toBeFalse();
              expect(perms.canManageW4).withContext(`${role}.canManageW4`).toBeFalse();
              expect(perms.canAccessAdminPanel).withContext(`${role}.canAccessAdminPanel`).toBeFalse();
            }

            if (PAYROLL_GROUP.includes(role as UserRole)) {
              // Payroll should NOT have canCreateJob
              expect(perms.canCreateJob).withContext(`${role}.canCreateJob`).toBeFalse();
              // All HR permissions
              expect(perms.canApproveExpense).withContext(`${role}.canApproveExpense`).toBeTrue();
              expect(perms.canApproveTravelRequest).withContext(`${role}.canApproveTravelRequest`).toBeTrue();
              expect(perms.canApproveTimecard).withContext(`${role}.canApproveTimecard`).toBeTrue();
              expect(perms.canApproveBreakRequest).withContext(`${role}.canApproveBreakRequest`).toBeTrue();
              expect(perms.canManageOnboarding).withContext(`${role}.canManageOnboarding`).toBeTrue();
              // Plus payroll permissions
              expect(perms.canManageIncidentReports).withContext(`${role}.canManageIncidentReports`).toBeTrue();
              expect(perms.canManageDirectDeposit).withContext(`${role}.canManageDirectDeposit`).toBeTrue();
              expect(perms.canManageW4).withContext(`${role}.canManageW4`).toBeTrue();
              expect(perms.canManageContactInfo).withContext(`${role}.canManageContactInfo`).toBeTrue();
              expect(perms.canSignPRC).withContext(`${role}.canSignPRC`).toBeTrue();
              expect(perms.canViewPayStubs).withContext(`${role}.canViewPayStubs`).toBeTrue();
              expect(perms.canViewW2).withContext(`${role}.canViewW2`).toBeTrue();
              // No checklist permissions
              expect(perms.canViewDeploymentChecklist).withContext(`${role}.canViewDeploymentChecklist`).toBeFalse();
              expect(perms.canEditDeploymentChecklist).withContext(`${role}.canEditDeploymentChecklist`).toBeFalse();
              expect(perms.canSubmitEODReport).withContext(`${role}.canSubmitEODReport`).toBeFalse();
              // No quote permissions
              expect(perms.canCreateQuote).withContext(`${role}.canCreateQuote`).toBeFalse();
              expect(perms.canEditQuote).withContext(`${role}.canEditQuote`).toBeFalse();
              expect(perms.canValidateBOM).withContext(`${role}.canValidateBOM`).toBeFalse();
              expect(perms.canViewQuote).withContext(`${role}.canViewQuote`).toBeFalse();
              // Admin permissions must be false
              expect(perms.canAccessAdminPanel).withContext(`${role}.canAccessAdminPanel`).toBeFalse();
            }

            if (READONLY_GROUP.includes(role as UserRole)) {
              expect(perms.canViewReadOnly).withContext(`${role}.canViewReadOnly`).toBeTrue();
              // All other permissions must be false
              const otherKeys = ALL_PERMISSION_KEYS.filter(k => k !== 'canViewReadOnly');
              for (const key of otherKeys) {
                expect(perms[key]).withContext(`${role}.${key} should be false`).toBeFalse();
              }
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
