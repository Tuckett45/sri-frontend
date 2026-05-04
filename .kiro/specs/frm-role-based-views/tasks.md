# Implementation Plan: FRM Role-Based Views

## Overview

Incrementally extend the `field-resource-management` Angular feature with a full RBAC system: enum extension, centralized permission service, structural directive, new guards, routing updates, data-scope alignment, payroll module, and nav menu refactor. Each task builds on the previous and ends with all code wired together.

## Tasks

- [x] 1. Extend UserRole enum with Payroll
  - Add `Payroll = 'Payroll'` to `src/app/models/role.enum.ts` after the last existing member
  - Preserve all existing member values unchanged
  - _Requirements: 1.1, 1.2, 1.3_

  - [ ]* 1.1 Write property test for enum preservation
    - **Property 1: Existing enum values are preserved**
    - **Validates: Requirements 1.2**
    - File: `src/app/features/field-resource-management/services/frm-permission.service.spec.ts`

- [x] 2. Create FrmPermissionService
  - Create `src/app/features/field-resource-management/services/frm-permission.service.ts`
  - Define `FrmPermissionKey` union type and `FrmPermissionSet` record type
  - Build the static `permissionMap` covering all 17 `UserRole` values (including `Payroll`)
  - Implement `hasPermission(role, permission): boolean` — returns `false` for null/undefined/unknown roles
  - Implement `getPermissionsForRole(role): FrmPermissionSet` — returns all-false set for unknown roles
  - Apply group permission rules: Field_Group, Manager_Group, HR_Group, Payroll_Group, ReadOnly_Group, Admin
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12_

  - [ ]* 2.1 Write property test: hasPermission/getPermissionsForRole consistency
    - **Property 2: hasPermission and getPermissionsForRole are consistent**
    - **Validates: Requirements 2.2, 2.4**
    - File: `src/app/features/field-resource-management/services/frm-permission.service.spec.ts`

  - [ ]* 2.2 Write property test: role group permissions are correctly assigned
    - **Property 3: Role group permissions are correctly assigned**
    - **Validates: Requirements 2.7, 2.8, 2.9, 2.10, 2.11**
    - File: `src/app/features/field-resource-management/services/frm-permission.service.spec.ts`

  - [ ]* 2.3 Write unit tests for FrmPermissionService
    - Test Admin role returns all permissions `true`
    - Test ReadOnly role returns only `canViewReadOnly` as `true`
    - Test null/undefined role returns all-false set
    - Test unknown role string returns all-false set and does not throw
    - File: `src/app/features/field-resource-management/services/frm-permission.service.spec.ts`

- [x] 3. Create FrmHasPermission structural directive
  - Create `src/app/features/field-resource-management/directives/frm-has-permission.directive.ts`
  - Implement `@Directive({ selector: '[frmHasPermission]' })` with `TemplateRef` and `ViewContainerRef`
  - Accept `@Input('frmHasPermission') permission: FrmPermissionKey`
  - Subscribe to `AuthService` current user observable; on each emission call `FrmPermissionService.hasPermission(role, permission)`
  - Create embedded view when permission is granted; clear view container when denied
  - Treat unrecognized permission keys as denied; emit `console.warn`
  - Unsubscribe on `ngOnDestroy`
  - Declare directive in the FRM shared/directives module (or `FieldResourceManagementModule`)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 3.1 Write property test: directive renders iff user holds permission
    - **Property 5: Directive renders iff user holds permission**
    - **Validates: Requirements 3.2, 3.3**
    - File: `src/app/features/field-resource-management/directives/frm-has-permission.directive.spec.ts`

  - [ ]* 3.2 Write property test: directive re-evaluates on user role change
    - **Property 6: Directive re-evaluates on user role change**
    - **Validates: Requirements 3.4**
    - File: `src/app/features/field-resource-management/directives/frm-has-permission.directive.spec.ts`

  - [ ]* 3.3 Write unit tests for FrmHasPermissionDirective
    - Test unrecognized permission key removes element from DOM
    - Test null user (unauthenticated) removes element from DOM
    - File: `src/app/features/field-resource-management/directives/frm-has-permission.directive.spec.ts`

- [x] 4. Create HrGuard and PayrollGuard
  - Create `src/app/features/field-resource-management/guards/hr.guard.ts`
    - Allowed roles: `UserRole.HR`, `UserRole.Payroll`, `UserRole.Admin`
    - Redirect denied users to `/field-resource-management/dashboard` with `{ error: 'insufficient_permissions' }`
  - Create `src/app/features/field-resource-management/guards/payroll.guard.ts`
    - Allowed roles: `UserRole.Payroll`, `UserRole.Admin`
    - Same redirect pattern
  - _Requirements: 4.5, 4.6, 4.7_

  - [ ]* 4.1 Write property test: guards allow exactly their intended role sets
    - **Property 4: Guards allow exactly their intended role sets**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7**
    - Files: `src/app/features/field-resource-management/guards/hr.guard.spec.ts`, `payroll.guard.spec.ts`

  - [ ]* 4.2 Write unit tests for HrGuard and PayrollGuard
    - Test redirect URL and query params when access is denied
    - Test each allowed role returns `true`
    - Files: `src/app/features/field-resource-management/guards/hr.guard.spec.ts`, `payroll.guard.spec.ts`

- [x] 5. Update ManagerGuard to cover all Manager_Group roles
  - Modify `src/app/features/field-resource-management/guards/manager.guard.ts`
  - Replace the existing `allowedRoles` array with all Manager_Group roles: `PM`, `Admin`, `DCOps`, `OSPCoordinator`, `EngineeringFieldSupport`, `MaterialsManager`, `Manager`
  - Update redirect to use `/field-resource-management/dashboard` with `{ error: 'insufficient_permissions' }` (consistent with other guards)
  - _Requirements: 4.1, 4.3, 4.4, 6.1_

- [x] 6. Update FRM routing module
  - Modify `src/app/features/field-resource-management/field-resource-management-routing.module.ts`
  - Import `HrGuard` and `PayrollGuard`
  - `approvals` route: replace `CMGuard` with `HrGuard` (covers HR_Group ∪ Payroll_Group ∪ Admin)
  - `mobile` route: replace `TechnicianGuard` with a guard that covers Field_Group ∪ Manager_Group (use `TechnicianGuard` which already includes Admin; verify it covers Manager_Group or update accordingly)
  - `timecard-manager` route: replace `ManagerGuard` with `HrGuard` (covers Manager_Group ∪ HR_Group ∪ Payroll_Group)
  - Add `payroll` lazy-loaded route protected by `PayrollGuard`:
    ```
    { path: 'payroll', loadChildren: () => import('./components/payroll/payroll.module').then(m => m.PayrollModule), canActivate: [PayrollGuard] }
    ```
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6, 4.7, 8.1_

- [x] 7. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Extend DataScopeService.getDataScopesForRole
  - Modify `src/app/features/field-resource-management/services/data-scope.service.ts`
  - Replace the existing `switch` in `getDataScopesForRole` with a complete mapping for all `UserRole` values:
    - `Admin`, `DCOps`, `Controller`, `HR`, `Payroll` → `all`
    - `CM`, `OSPCoordinator`, `EngineeringFieldSupport`, `MaterialsManager` → `market`
    - `PM`, `VendorRep`, `Client` → `company`
    - `Technician`, `DeploymentEngineer`, `SRITech` → `self`
    - Unknown roles → `self` (most restrictive, with `console.warn`)
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

  - [ ]* 8.1 Write property test: DataScopeService maps every role to correct scope
    - **Property 7: DataScopeService maps every role to the correct scope**
    - **Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5, 11.6**
    - File: `src/app/features/field-resource-management/services/data-scope.service.spec.ts`

  - [ ]* 8.2 Write unit tests for DataScopeService
    - Test null input to `filterDataByScope` returns empty array
    - Test unknown role defaults to `self` scope
    - File: `src/app/features/field-resource-management/services/data-scope.service.spec.ts`

- [x] 9. Create Payroll feature module and components
  - Create `src/app/features/field-resource-management/components/payroll/payroll.module.ts` with `PayrollRoutingModule`
  - Create `src/app/features/field-resource-management/components/payroll/payroll-routing.module.ts` with child routes:
    - `incident-reports` → `IncidentReportsComponent`
    - `direct-deposit` → `DirectDepositComponent`
    - `w4` → `W4Component`
    - `contact-info` → `ContactInfoComponent`
    - `prc` → `PrcComponent`
    - `pay-stubs` → `PayStubsComponent`
    - `w2` → `W2Component`
  - Create each component with minimal template and form logic:
    - `IncidentReportsComponent`: display list of incident reports (auto accident, work injury, other)
    - `DirectDepositComponent`: form that records `submittedBy` and `submittedAt` on submit
    - `W4Component`: form that records `submittedBy` and `submittedAt` on submit
    - `ContactInfoComponent`: form with address/phone/email fields; validate at least one field is changed before saving; record `updatedBy` and `updatedAt`
    - `PrcComponent`: form with signature field; reject empty signature; record `signedBy` and `signedAt`
    - `PayStubsComponent`: employee selector + pay stub list display
    - `W2Component`: employee selector + W-2 document list display
  - Define payroll document interfaces (`IncidentReport`, `DirectDepositChange`, `W4Change`, `ContactInfoChange`, `PrcSignature`) in `src/app/features/field-resource-management/models/payroll.models.ts`
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [ ]* 9.1 Write property test: payroll actions produce complete audit records
    - **Property 8: Payroll actions produce complete audit records**
    - **Validates: Requirements 8.3, 8.4, 8.6**
    - File: `src/app/features/field-resource-management/components/payroll/direct-deposit.component.spec.ts`

  - [ ]* 9.2 Write property test: contact info update requires at least one changed field
    - **Property 9: Contact info update requires at least one changed field**
    - **Validates: Requirements 8.5**
    - File: `src/app/features/field-resource-management/components/payroll/contact-info.component.spec.ts`

  - [ ]* 9.3 Write unit tests for payroll forms
    - Test empty PRC signature is rejected with a validation message
    - Test contact info form with no changed fields is rejected
    - Test direct deposit submit records non-null `submittedBy` and `submittedAt`
    - Files: `src/app/features/field-resource-management/components/payroll/*.spec.ts`

- [x] 10. Update FrmNavMenuComponent to use FrmPermissionService
  - Modify `src/app/features/field-resource-management/components/shared/frm-nav-menu/frm-nav-menu.component.ts`
  - Inject `FrmPermissionService` and `AuthService`
  - Define `FrmNavItem` interface with `label`, `route`, and `permission: FrmPermissionKey` fields
  - Build the full nav item list covering all routes from the design's navigation table
  - Implement `filterMenuByRole(role)` that calls `hasPermission(role, item.permission)` for each item
  - Subscribe to `AuthService` current user; re-evaluate filtered menu on each emission
  - Update the component template to iterate over the filtered menu items
  - Ensure users with no recognized role see only the dashboard link
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [ ]* 10.1 Write property test: navigation menu items match role permissions
    - **Property 10: Navigation menu items match role permissions**
    - **Validates: Requirements 10.1, 10.4**
    - File: `src/app/features/field-resource-management/components/shared/frm-nav-menu/frm-nav-menu.component.spec.ts`

- [x] 11. Implement HR approval audit trail
  - In the approvals components (timecard approval, expense approval), ensure each approval action records `approvedBy` (current user identity) and `approvedAt` (timestamp) on the resulting record
  - Wire `AuthService.getUser()` to populate `approvedBy` at the point of approval
  - _Requirements: 7.3, 7.4_

  - [ ]* 11.1 Write property test: HR approval records approver identity and timestamp
    - **Property 11: HR approval records approver identity and timestamp**
    - **Validates: Requirements 7.3, 7.4**
    - File: `src/app/features/field-resource-management/components/payroll/prc.component.spec.ts`

- [ ] 12. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Property tests use **fast-check** (`npm install --save-dev fast-check`); each test runs ≥ 100 iterations
- Each property test must include the comment: `// Feature: frm-role-based-views, Property N: <property_text>`
- Test framework is Jasmine/Karma (Angular default)
- All guards follow the same redirect pattern: `/field-resource-management/dashboard` with `{ error: 'insufficient_permissions' }`
- `FrmPermissionService` is the single source of truth — guards and the directive both delegate to it
