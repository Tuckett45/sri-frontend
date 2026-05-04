# Implementation Plan: Back Office Employee Services

## Overview

Implement the six BOES service areas by extending existing payroll models, creating a centralized `PayrollService`, upgrading each stub component with reactive forms, validation, role-based UI, audit trail integration, error handling, and PDF download/print capabilities. Tasks build incrementally: models → service → shared utilities → components (one at a time) → wiring and guards.

## Tasks

- [x] 1. Extend data models and shared interfaces
  - [x] 1.1 Extend `payroll.models.ts` with all BOES interfaces
    - Add `IncidentType`, `AccountType`, `FilingStatus` type aliases
    - Extend `IncidentReport` with `incidentDate` field; add `CreateIncidentReportPayload` and `IncidentReportFilters` interfaces
    - Extend `DirectDepositChange` with `bankName`, `accountType`; add `DirectDepositPayload` interface
    - Replace `W4Change.allowances` with full W-4 fields (`multipleJobsOrSpouseWorks`, `claimDependents`, `otherIncome`, `deductions`, `extraWithholding`); add `W4Payload` interface
    - Add `fieldsChanged` to `ContactInfoChange`; add `ContactInfoPayload` interface
    - Add `PrcPayload` interface with `signature` field
    - Add `PayStub`, `DeductionItem`, `PayStubFilters` interfaces
    - Extend `W2Document` with all tax fields (`employerName`, `employeeName`, `wagesTips`, `federalIncomeTaxWithheld`, `socialSecurityWages`, `socialSecurityTaxWithheld`, `medicareWages`, `medicareTaxWithheld`)
    - Add `PayrollServiceError` and `AuditMetadata` interfaces
    - Change all date fields from `Date` to `string` (ISO format) to match design
    - _Requirements: 2.1, 3.1, 4.1, 4.3, 5.1, 6.2, 7.1–7.2, 8.1–8.2, 9.2, 10.1_

- [x] 2. Implement PayrollService
  - [x] 2.1 Create `PayrollService` with all BOES HTTP methods
    - Create `src/app/features/field-resource-management/services/payroll.service.ts`
    - Inject `HttpClient` and `AuthService`; provide at root level
    - Implement `getIncidentReports(filters?)`, `createIncidentReport(payload)`
    - Implement `submitDirectDepositChange(payload)`, `getDirectDepositHistory(employeeId)`
    - Implement `submitW4Change(payload)`, `getW4History(employeeId)`
    - Implement `submitContactInfoChange(payload)`, `getContactInfoHistory(employeeId)`
    - Implement `signPrc(payload)`, `getPrcHistory(employeeId)`, `getPrcByDocRef(employeeId, documentRef)`
    - Implement `getPayStubs(employeeId, params?)`, `getPayStubPdf(employeeId, payPeriod)` with `responseType: 'blob'`
    - Implement `getW2Documents(employeeId, taxYear?)`, `getW2Pdf(employeeId, taxYear)` with `responseType: 'blob'`, `getAvailableTaxYears(employeeId)`
    - Attach `AuditMetadata` (user id, name, role, UTC timestamp) to every write request payload
    - Map HTTP errors to `PayrollServiceError` with `statusCode`, `message`, `operation`
    - _Requirements: 9.1–9.6, 10.1, 10.7_

  - [ ]* 2.2 Write unit tests for `PayrollService`
    - Test each method returns typed Observable on success
    - Test error mapping produces correct `PayrollServiceError`
    - Test audit metadata is attached to write requests
    - Test PDF methods use `responseType: 'blob'`
    - _Requirements: 9.1–9.6, 10.1_

- [x] 3. Implement shared utilities and guards
  - [x] 3.1 Create `UnsavedChangesGuard` and `HasUnsavedChanges` interface
    - Create `src/app/features/field-resource-management/guards/unsaved-changes.guard.ts`
    - Implement `CanDeactivate` guard that calls `component.hasUnsavedChanges()`
    - Show browser `confirm()` dialog when unsaved changes exist
    - _Requirements: 11.5_

  - [x] 3.2 Create PDF download utility function
    - Create `triggerBlobDownload(blob, filename)` helper in a shared utils file under `src/app/features/field-resource-management/utils/`
    - Use `URL.createObjectURL`, temporary anchor element, and `URL.revokeObjectURL`
    - _Requirements: 7.4, 8.4_

- [x] 4. Checkpoint — Verify foundation
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement Incident Reports component
  - [x] 5.1 Upgrade `IncidentReportsComponent` with form and list view
    - Inject `PayrollService`, `FrmPermissionService`, `AuthService`
    - Resolve role on init; compute `readOnly` flag using `canManageIncidentReports`
    - Build reactive `FormGroup` with required validators for `employeeId`, `type`, `incidentDate`, `description`
    - Implement submit handler: disable button, show spinner, call `createIncidentReport`, reset on success with confirmation, show error banner on failure preserving form data
    - Implement list view: call `getIncidentReports()`, display sorted by `reportedAt` descending
    - Implement filters: type dropdown, date range inputs, employee ID input
    - Hide create form and submit controls when `readOnly` is true (HR_Group)
    - Implement `HasUnsavedChanges` interface
    - _Requirements: 2.1–2.10, 10.6, 11.1–11.5_

  - [ ]* 5.2 Write unit tests for `IncidentReportsComponent`
    - Test form validation rejects missing required fields
    - Test read-only mode hides create controls for HR role
    - Test filter by type, date range, and employee ID
    - Test error banner displays on API failure
    - _Requirements: 2.4, 2.6–2.10_

- [x] 6. Implement Direct Deposit component
  - [x] 6.1 Upgrade `DirectDepositComponent` with form and history view
    - Inject `PayrollService`, `FrmPermissionService`, `AuthService`
    - Build reactive `FormGroup` with required validators for `employeeId`, `bankName`, `accountType`, `routingNumber`, `accountNumber`, `accountNumberConfirm`
    - Add cross-field validator: `accountNumber` must match `accountNumberConfirm`
    - Mask account number and routing number display (show last 4 digits only)
    - Implement submit handler with audit trail, success confirmation (submitter name + timestamp), error banner
    - Implement history view: call `getDirectDepositHistory(employeeId)`, sorted by `submittedAt` descending
    - Implement `HasUnsavedChanges` interface
    - _Requirements: 3.1–3.9, 10.2, 11.1–11.5_

  - [ ]* 6.2 Write unit tests for `DirectDepositComponent`
    - Test account number confirmation mismatch rejects submission
    - Test masking displays only last 4 digits
    - Test success confirmation includes submitter name and timestamp
    - _Requirements: 3.3–3.7_

- [x] 7. Implement W-4 Changes component
  - [x] 7.1 Upgrade `W4Component` with form and history view
    - Inject `PayrollService`, `FrmPermissionService`, `AuthService`
    - Build reactive `FormGroup` with required validators for all W-4 fields
    - Add `min(0)` validators for numeric dollar fields (`claimDependents`, `otherIncome`, `deductions`, `extraWithholding`)
    - Implement filing status dropdown with three options
    - Implement submit handler with audit trail, success confirmation, error banner
    - Implement history view: call `getW4History(employeeId)`, sorted by `submittedAt` descending
    - Implement `HasUnsavedChanges` interface
    - _Requirements: 4.1–4.7, 10.3, 11.1–11.5_

  - [ ]* 7.2 Write unit tests for `W4Component`
    - Test negative numeric values are rejected
    - Test all three filing status values are selectable
    - Test success confirmation message content
    - _Requirements: 4.3–4.5_

- [x] 8. Checkpoint — Verify first four service areas
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement Contact Info component
  - [x] 9.1 Upgrade `ContactInfoComponent` with form and history view
    - Inject `PayrollService`, `FrmPermissionService`, `AuthService`
    - Build reactive `FormGroup` with `employeeId` (required), `address`, `phone`, `email` (all optional individually)
    - Add form-level validator: at least one of `address`, `phone`, `email` must be non-empty
    - Add email format validator on `email` field
    - Add phone pattern validator on `phone` field (digits, spaces, hyphens, parentheses, `+`; min 10 digits)
    - Implement submit handler with audit trail, success confirmation, error banner
    - Implement history view: call `getContactInfoHistory(employeeId)`, sorted by `updatedAt` descending
    - Implement `HasUnsavedChanges` interface
    - _Requirements: 5.1–5.8, 10.4, 11.1–11.5_

  - [ ]* 9.2 Write unit tests for `ContactInfoComponent`
    - Test form rejects submission when all contact fields are empty
    - Test email validation rejects invalid format
    - Test phone validation rejects values with fewer than 10 digits
    - _Requirements: 5.3–5.5_

- [x] 10. Implement PRC Signing component
  - [x] 10.1 Upgrade `PrcComponent` with signature form and history view
    - Inject `PayrollService`, `FrmPermissionService`, `AuthService`
    - Build reactive `FormGroup` with required validators for `employeeId`, `documentRef`, `signature`
    - Add validator: `signature` must not be empty or whitespace-only
    - Display PRC document content or reference link before signature input
    - On init, check for existing signature via `getPrcByDocRef`; if found, display existing record and disable form
    - Implement submit handler with audit trail, success confirmation (signer name, documentRef, timestamp), error banner
    - Implement history view: call `getPrcHistory(employeeId)`, sorted by `signedAt` descending
    - Implement `HasUnsavedChanges` interface
    - _Requirements: 6.1–6.8, 10.5, 11.1–11.5_

  - [ ]* 10.2 Write unit tests for `PrcComponent`
    - Test whitespace-only signature is rejected
    - Test duplicate signature detection disables form
    - Test confirmation includes signer name, documentRef, and timestamp
    - _Requirements: 6.4, 6.5, 6.8_

- [x] 11. Implement Pay Stubs component
  - [x] 11.1 Upgrade `PayStubsComponent` with list view, print, and download
    - Inject `PayrollService`, `FrmPermissionService`, `AuthService`
    - Resolve role on init; compute `readOnly` flag using `canViewPayStubs`
    - Build employee selector and pay period/year filter inputs
    - Call `getPayStubs(employeeId, params)` and display: pay period dates, gross pay, itemized deductions, total deductions, net pay, payment date
    - Implement year filter to show only stubs within selected calendar year
    - Implement print button: open print-optimized view via `window.print()`
    - Implement download button: call `getPayStubPdf`, trigger download with filename `paystub_{employeeId}_{payPeriod}.pdf` using `triggerBlobDownload`
    - Display "no records found" message when results are empty
    - Show error banner on API failure
    - Hide edit controls for HR_Group (read-only mode)
    - _Requirements: 7.1–7.8, 11.2, 11.4_

  - [ ]* 11.2 Write unit tests for `PayStubsComponent`
    - Test PDF download triggers with correct filename format
    - Test year filter narrows displayed stubs
    - Test empty state message displays when no stubs found
    - _Requirements: 7.4, 7.5, 7.8_

- [x] 12. Implement W-2 component
  - [x] 12.1 Upgrade `W2Component` with list view, print, and download
    - Inject `PayrollService`, `FrmPermissionService`, `AuthService`
    - Resolve role on init; compute `readOnly` flag using `canViewW2`
    - Build employee selector; call `getAvailableTaxYears(employeeId)` to populate year dropdown
    - Call `getW2Documents(employeeId, taxYear)` and display all tax fields per requirement 8.2
    - Implement print button: open print-optimized view via `window.print()`
    - Implement download button: call `getW2Pdf`, trigger download with filename `w2_{employeeId}_{taxYear}.pdf` using `triggerBlobDownload`
    - Display "no records found" message when results are empty
    - Show error banner on API failure
    - Hide edit controls for HR_Group (read-only mode)
    - _Requirements: 8.1–8.8, 11.2, 11.4_

  - [ ]* 12.2 Write unit tests for `W2Component`
    - Test available tax years populate dropdown
    - Test PDF download triggers with correct filename format
    - Test empty state message displays when no documents found
    - _Requirements: 8.4, 8.5, 8.8_

- [x] 13. Wire routing, guards, and module integration
  - [x] 13.1 Add `UnsavedChangesGuard` to write-capable routes in `PayrollRoutingModule`
    - Apply `canDeactivate: [UnsavedChangesGuard]` to incident-reports, direct-deposit, w4, contact-info, and prc routes
    - _Requirements: 11.5_

  - [x] 13.2 Update `PayrollModule` imports if needed
    - Ensure `ReactiveFormsModule` is imported (already present)
    - Verify all component declarations are registered
    - _Requirements: 1.5_

  - [x] 13.3 Implement role-based navigation links in payroll section
    - Show all seven links for Payroll_Group and Admin roles
    - Show only Incident Reports, Pay Stubs, W-2 links for HR_Group in read-only mode
    - Use `FrmPermissionService` to determine visible links
    - _Requirements: 1.1–1.3_

- [x] 14. Final checkpoint — Full integration verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- The design uses TypeScript throughout; all code examples use Angular/TypeScript conventions
- Existing `PayrollGuard`, `FrmPermissionService`, and `PayrollRoutingModule` are reused — not recreated
