import * as fc from 'fast-check';
import { TestBed } from '@angular/core/testing';
import { FrmPermissionService, FrmPermissionKey, FrmPermissionSet } from './frm-permission.service';
import { UserRole } from '../../../models/role.enum';

const ALL_PERMISSION_KEYS: FrmPermissionKey[] = [
  'canCreateJob', 'canStartJob', 'canEditJob', 'canViewOwnSchedule', 'canViewAllSchedules',
  'canEditSchedule', 'canAssignCrew', 'canTrackTime', 'canSubmitTimecard',
  'canApproveTimecard', 'canApproveExpense', 'canApproveTravelRequest',
  'canApproveBreakRequest', 'canViewBudget', 'canManageBudget', 'canViewReports',
  'canViewManagementReports', 'canManageIncidentReports', 'canManageDirectDeposit',
  'canManageW4', 'canManageContactInfo', 'canSignPRC', 'canViewPayStubs', 'canViewW2',
  'canAccessAdminPanel', 'canViewReadOnly', 'canManageOnboarding',
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
            expect(Object.keys(allPerms).length).toBe(27);
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
              expect(perms.canViewReports).withContext(`${role}.canViewReports`).toBeTrue();
              expect(perms.canViewManagementReports).withContext(`${role}.canViewManagementReports`).toBeTrue();
              // Payroll/admin permissions must be false
              expect(perms.canManageDirectDeposit).withContext(`${role}.canManageDirectDeposit`).toBeFalse();
              expect(perms.canAccessAdminPanel).withContext(`${role}.canAccessAdminPanel`).toBeFalse();
            }

            if (HR_GROUP.includes(role as UserRole)) {
              expect(perms.canApproveExpense).withContext(`${role}.canApproveExpense`).toBeTrue();
              expect(perms.canApproveTravelRequest).withContext(`${role}.canApproveTravelRequest`).toBeTrue();
              expect(perms.canApproveTimecard).withContext(`${role}.canApproveTimecard`).toBeTrue();
              expect(perms.canApproveBreakRequest).withContext(`${role}.canApproveBreakRequest`).toBeTrue();
              expect(perms.canManageOnboarding).withContext(`${role}.canManageOnboarding`).toBeTrue();
              // Payroll-specific and admin must be false
              expect(perms.canManageDirectDeposit).withContext(`${role}.canManageDirectDeposit`).toBeFalse();
              expect(perms.canManageW4).withContext(`${role}.canManageW4`).toBeFalse();
              expect(perms.canAccessAdminPanel).withContext(`${role}.canAccessAdminPanel`).toBeFalse();
            }

            if (PAYROLL_GROUP.includes(role as UserRole)) {
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
