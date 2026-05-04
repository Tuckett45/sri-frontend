# Implementation Plan: Job Setup Workflow

## Overview

Implement a multi-step Job Setup Workflow in the FRM module. The plan extends the permission system, adds a route guard, builds a four-step reactive form with draft persistence, and wires everything into the existing routing and dashboard infrastructure. Tasks are ordered so each builds on the previous, with no orphaned code.

## Tasks

- [x] 1. Extend permission system and add route guard
  - [x] 1.1 Add `canCreateJob` to `FrmPermissionKey` and grant it to Admin, Payroll, and HR roles
    - Add `'canCreateJob'` to the `FrmPermissionKey` type union in `frm-permission.service.ts`
    - Add `canCreateJob: false` to `ALL_FALSE`
    - Set `canCreateJob: true` in `ADMIN_PERMISSIONS`, `PAYROLL_GROUP_PERMISSIONS`, and `HR_GROUP_PERMISSIONS`
    - Ensure `FIELD_GROUP_PERMISSIONS`, `MANAGER_GROUP_PERMISSIONS`, and `READONLY_GROUP_PERMISSIONS` remain `false`
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ]* 1.2 Write property test for unauthorized role denial
    - **Property 1: Unauthorized role denial**
    - Use `fast-check` with `fc.constantFrom(...)` over all `UserRole` values
    - Assert `hasPermission(role, 'canCreateJob')` is `true` only for Admin, Payroll, HR
    - **Validates: Requirements 1.5**

  - [x] 1.3 Create `CreateJobGuard` at `src/app/features/field-resource-management/guards/create-job.guard.ts`
    - Inject `AuthService`, `FrmPermissionService`, `Router`
    - Implement `CanActivate` — check `canCreateJob` permission, redirect to `/field-resource-management/dashboard` on denial
    - Follow the same pattern as existing `AdminGuard`
    - _Requirements: 1.5, 9.2_

  - [ ]* 1.4 Write unit tests for `CreateJobGuard`
    - Test Admin, Payroll, HR roles are granted access
    - Test Technician, PM, VendorRep roles are denied and redirected
    - _Requirements: 1.5_

- [x] 2. Checkpoint — Ensure permission and guard tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Define data models and form interfaces
  - [x] 3.1 Create `JobSetupFormValue` and `JobSetupDraft` interfaces
    - Create file `src/app/features/field-resource-management/models/job-setup.models.ts`
    - Define `JobSetupFormValue` with nested `customerInfo`, `pricingBilling`, `sriInternal` groups per design
    - Define `JobSetupDraft` with `formValue`, `currentStep`, `savedAt`
    - _Requirements: 3.1–3.10, 4.1–4.5, 5.1–5.6_

  - [x] 3.2 Extend `CreateJobDto` with pricing/billing and SRI internal fields
    - Add `authorizationStatus`, `hasPurchaseOrders`, `purchaseOrderNumber`, `standardBillRate`, `overtimeBillRate`, `perDiem`, `invoicingProcess`, `projectDirector`, `targetResources`, `bizDevContact`, `requestedHours`, `overtimeRequired`, `estimatedOvertimeHours` to the existing `CreateJobDto`
    - _Requirements: 7.1, 7.5_

- [x] 4. Implement `JobSetupService`
  - [x] 4.1 Create `JobSetupService` at `src/app/features/field-resource-management/services/job-setup.service.ts`
    - Implement `saveDraft(formValue, currentStep)` — serialize to `sessionStorage` with key `frm_job_setup_draft` and debounce (2s)
    - Implement `restoreDraft()` — deserialize from `sessionStorage`, return `{ formValue, currentStep }` or `null`
    - Implement `clearDraft()` — remove from `sessionStorage`
    - Wrap all `sessionStorage` operations in try/catch
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x] 4.2 Implement `mapToCreateJobDto` in `JobSetupService`
    - Map `JobSetupFormValue` fields to `CreateJobDto` fields per design
    - Set `status` to `JobStatus.NotStarted`, `createdBy` to authenticated user
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 4.3 Implement `submitJob` in `JobSetupService`
    - Call `mapToCreateJobDto`, dispatch NgRx `createJob` action
    - Listen for `createJobSuccess` / `createJobFailure` to resolve the observable
    - Clear draft on success
    - _Requirements: 6.4, 6.6, 6.7, 10.3_

  - [ ]* 4.4 Write property test for form-to-DTO mapping correctness
    - **Property 11: Form-to-DTO mapping correctness**
    - Generate arbitrary valid `JobSetupFormValue` with `fast-check`
    - Assert all fields map correctly, status is `NotStarted`, `createdBy` is set
    - **Validates: Requirements 6.4, 7.1, 7.2, 7.3, 7.4, 7.5**

  - [ ]* 4.5 Write property test for draft persistence round trip
    - **Property 13: Draft persistence round trip**
    - Generate arbitrary `JobSetupFormValue` and step index with `fast-check`
    - Assert `restoreDraft()` after `saveDraft()` returns identical data
    - **Validates: Requirements 10.1, 10.2**

- [x] 5. Checkpoint — Ensure service tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Build step components
  - [x] 6.1 Create `CustomerInfoStepComponent`
    - Create at `src/app/features/field-resource-management/components/jobs/job-setup/steps/customer-info-step.component.ts` (with template and styles)
    - Accept `FormGroup` via `@Input()`
    - Render fields: clientName, siteName, street, city, state, zipCode, pocName, pocPhone, pocEmail, targetStartDate, authorizationStatus, hasPurchaseOrders, purchaseOrderNumber (conditional)
    - Add validators: required, maxLength, email, phone pattern, minDate(today)
    - Show/hide purchaseOrderNumber based on hasPurchaseOrders toggle
    - _Requirements: 3.1–3.10, 8.1–8.6_

  - [ ]* 6.2 Write property tests for Customer Info validation
    - **Property 4: Required text field validation** (clientName, siteName, street, city, state, zipCode, pocName)
    - **Property 5: Phone number format validation**
    - **Property 6: Email format validation**
    - **Property 7: Start date must not be in the past**
    - **Property 8: Conditional field requirements** (hasPurchaseOrders → purchaseOrderNumber)
    - **Validates: Requirements 3.1–3.10**

  - [x] 6.3 Create `PricingBillingStepComponent`
    - Create at `src/app/features/field-resource-management/components/jobs/job-setup/steps/pricing-billing-step.component.ts` (with template and styles)
    - Accept `FormGroup` via `@Input()`
    - Render fields: standardBillRate, overtimeBillRate, perDiem, invoicingProcess
    - Add validators: required, min, pattern (2 decimal), cross-field validator (overtimeBillRate >= standardBillRate)
    - Display billing summary section
    - _Requirements: 4.1–4.6, 8.1–8.6_

  - [ ]* 6.4 Write property tests for Pricing/Billing validation
    - **Property 9: Numeric field range validation** (standardBillRate, overtimeBillRate, perDiem)
    - **Property 10: Overtime rate must be >= standard rate**
    - **Validates: Requirements 4.1–4.4**

  - [x] 6.5 Create `SriInternalStepComponent`
    - Create at `src/app/features/field-resource-management/components/jobs/job-setup/steps/sri-internal-step.component.ts` (with template and styles)
    - Accept `FormGroup` via `@Input()`
    - Render fields: projectDirector, targetResources, bizDevContact, requestedHours, overtimeRequired, estimatedOvertimeHours (conditional)
    - Add validators: required, maxLength, min, max, integer
    - Show/hide estimatedOvertimeHours based on overtimeRequired toggle
    - _Requirements: 5.1–5.6, 8.1–8.6_

  - [ ]* 6.6 Write property tests for SRI Internal validation
    - **Property 9: Numeric field range validation** (targetResources, requestedHours, estimatedOvertimeHours)
    - **Property 8: Conditional field requirements** (overtimeRequired → estimatedOvertimeHours)
    - **Validates: Requirements 5.1–5.6**

  - [x] 6.7 Create `ReviewStepComponent`
    - Create at `src/app/features/field-resource-management/components/jobs/job-setup/steps/review-step.component.ts` (with template and styles)
    - Accept entire form value as `@Input()`, submitting/error state as `@Input()`
    - Display read-only summary in three labeled sections: "Customer Information", "Pricing & Billing", "SRI Internal"
    - Emit `editSection` event with step index when "Edit" link is clicked
    - Show loading indicator and disable Submit during submission
    - Display error banner on submission failure
    - _Requirements: 6.1–6.7_

  - [ ]* 6.8 Write property test for error state clears on valid input
    - **Property 12: Error state clears on valid input**
    - For any field in invalid state, setting a valid value should clear errors immediately
    - **Validates: Requirements 8.5**

- [x] 7. Checkpoint — Ensure step component tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Build parent `JobSetupComponent` and wire steps together
  - [x] 8.1 Create `JobSetupComponent` at `src/app/features/field-resource-management/components/jobs/job-setup/job-setup.component.ts` (with template and styles)
    - Build master `FormGroup` with nested groups: `customerInfo`, `pricingBilling`, `sriInternal`
    - Manage `currentStep` index (0–3)
    - Render step indicator, Back/Next/Submit/Cancel buttons
    - Delegate to child step components via `[formGroup]` input
    - Implement `CanDeactivate` for unsaved changes warning
    - On init, call `JobSetupService.restoreDraft()` to restore draft if available
    - Subscribe to form `valueChanges` with debounce to call `JobSetupService.saveDraft()`
    - On cancel, call `JobSetupService.clearDraft()` and navigate back
    - _Requirements: 2.1–2.8, 10.1–10.4_

  - [ ]* 8.2 Write property test for step validation blocks advancement
    - **Property 2: Step validation blocks advancement**
    - For any step with invalid FormGroup, attempting next should not change step index
    - **Validates: Requirements 2.3**

  - [ ]* 8.3 Write property test for navigation preserves form data
    - **Property 3: Navigation preserves form data**
    - For any valid data across steps, navigating back and forward preserves all values
    - **Validates: Requirements 2.5, 6.3**

  - [ ]* 8.4 Write unit tests for `JobSetupComponent`
    - Test step navigation forward/backward
    - Test step indicator rendering
    - Test button states (Back disabled on step 0, Submit on step 3)
    - Test draft restore on init
    - Test unsaved changes guard
    - _Requirements: 2.1–2.8, 10.1–10.4_

- [x] 9. Register route and update dashboards
  - [x] 9.1 Register `jobs/new` route in `JobsModule`
    - Replace existing `jobs/new` route to use `JobSetupComponent` with `CreateJobGuard`
    - Set route data: `title: 'New Job Setup'`, `breadcrumb: 'New Job'`
    - Declare all new components in `JobsModule`
    - _Requirements: 9.1, 9.2, 9.5_

  - [x] 9.2 Add "Create Job" quick action to admin dashboard
    - Add a "Create Job" action to the `quickActions` array in `AdminDashboardComponent`
    - Navigate to `/field-resource-management/jobs/new`
    - Gate visibility with `*appFrmHasPermission="'canCreateJob'"`
    - _Requirements: 9.3, 1.6_

  - [x] 9.3 Add "Create Job" quick action to HR/Payroll dashboard
    - Add a "Create Job" action to the `quickActions` array in `HrPayrollDashboardComponent`
    - Navigate to `/field-resource-management/jobs/new`
    - Gate visibility with `*appFrmHasPermission="'canCreateJob'"`
    - _Requirements: 9.4, 1.6_

- [x] 10. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` with the existing Jasmine/Karma test runner
- Checkpoints ensure incremental validation at natural breakpoints
- All components follow existing Angular patterns in the FRM module (Material UI, reactive forms, NgRx)
