# Requirements Document

## Introduction

This feature fully implements the Back Office Employee Services section of the Field Resource Management (FRM) Angular module. The six service areas — Incident/Injury Reporting, Direct Deposit Changes, W-4 Changes, Contact Information Changes, PRC Signing, and Pay Stub/W-2 Viewing — are already scaffolded as stub components under `src/app/features/field-resource-management/components/payroll/`. This spec defines the complete functional, validation, security, and UX requirements needed to bring those stubs to production quality, including backend service integration, form validation, audit trails, document retrieval, and print/download capabilities.

## Glossary

- **BOES**: Back Office Employee Services — the collective name for the six payroll-adjacent service areas defined in this spec.
- **Back_Office_Module**: The Angular lazy-loaded module at `src/app/features/field-resource-management/components/payroll/` that hosts all BOES components.
- **Payroll_Service**: A new Angular injectable service responsible for all HTTP calls to the backend API for BOES operations.
- **Employee**: A person whose records are managed through BOES. Identified by a unique `employeeId` string.
- **Incident_Report**: A record of a reportable workplace event — auto accident, work injury, or other — captured in the `IncidentReport` model.
- **Direct_Deposit_Change**: A record of a banking information update captured in the `DirectDepositChange` model.
- **W4_Change**: A record of a federal withholding election update captured in the `W4Change` model.
- **Contact_Info_Change**: A record of an address, phone, or email update captured in the `ContactInfoChange` model.
- **PRC**: Personnel Record Change — a document requiring a digital signature to record an employment record update.
- **PRC_Signature**: A record of a signed PRC captured in the `PrcSignature` model.
- **Pay_Stub**: A payroll document showing gross pay, deductions, and net pay for a specific pay period.
- **W2_Document**: An annual tax document showing total wages and withholdings for a calendar year.
- **Audit_Trail**: An immutable log entry recording who performed an action, what was changed, and when.
- **FRM_Permission_Service**: The existing Angular service at `src/app/features/field-resource-management/services/frm-permission.service.ts` that evaluates role-based permissions.
- **Payroll_Group**: Roles with full BOES write access: `Payroll`.
- **HR_Group**: Roles with read-only BOES access: `HR`.
- **Admin**: The `Admin` role with full access to all BOES features.
- **Employee_Self**: An authenticated employee accessing their own records only (applicable to pay stub and W-2 self-service viewing).
- **PayrollGuard**: The existing Angular route guard that restricts the `/payroll` route to `Payroll_Group` and `Admin`.

---

## Requirements

### Requirement 1: Back Office Module Navigation and Access Control

**User Story:** As a payroll staff member, I want a dedicated navigation section for back office employee services, so that I can quickly access each service area without navigating through unrelated FRM sections.

#### Acceptance Criteria

1. WHEN a user with a `Payroll_Group` role is authenticated, THE `Back_Office_Module` navigation SHALL display links for: Incident Reports, Direct Deposit, W-4, Contact Info, PRC Signing, Pay Stubs, W-2.
2. WHEN a user with an `HR_Group` role is authenticated, THE `Back_Office_Module` navigation SHALL display links for: Incident Reports, Pay Stubs, W-2 in read-only mode.
3. WHEN a user with the `Admin` role is authenticated, THE `Back_Office_Module` navigation SHALL display all seven service area links with full write access.
4. IF a user without `Payroll_Group`, `HR_Group`, or `Admin` role attempts to activate any route under `/payroll`, THEN THE `PayrollGuard` SHALL redirect the user to `/field-resource-management/dashboard`.
5. THE `Back_Office_Module` SHALL be lazy-loaded via the existing `loadChildren` route configuration in `field-resource-management-routing.module.ts`.

---

### Requirement 2: Incident/Injury Reporting

**User Story:** As a payroll staff member, I want to create, view, and filter incident and injury reports, so that all reportable workplace events are documented and accessible for compliance purposes.

#### Acceptance Criteria

1. THE `Incident_Report` model SHALL support the following incident types: `auto_accident`, `work_injury`, `other`.
2. WHEN a user submits a new incident report, THE `Payroll_Service` SHALL send the report to the backend API and record the submitter's identity and the submission timestamp in the `Audit_Trail`.
3. WHEN a new incident report is submitted, THE `Payroll_Service` SHALL require the following fields: `employeeId`, `type`, `incidentDate`, `description`.
4. IF any required field is missing when submitting an incident report, THEN THE `Back_Office_Module` SHALL display a field-level validation error and prevent form submission.
5. WHEN the incident reports list is loaded, THE `Back_Office_Module` SHALL display all reports sorted by `reportedAt` descending by default.
6. WHEN a user applies a type filter, THE `Back_Office_Module` SHALL display only reports matching the selected `type` value.
7. WHEN a user applies a date range filter, THE `Back_Office_Module` SHALL display only reports where `incidentDate` falls within the specified range.
8. WHEN a user applies an employee ID filter, THE `Back_Office_Module` SHALL display only reports matching the specified `employeeId`.
9. IF the backend API returns an error when loading or submitting an incident report, THEN THE `Back_Office_Module` SHALL display a user-readable error message and preserve any unsaved form data.
10. WHILE a user with `HR_Group` role is authenticated, THE `Back_Office_Module` SHALL display incident reports in read-only mode with no create or edit controls visible.

---

### Requirement 3: Direct Deposit Changes

**User Story:** As a payroll staff member, I want to submit and track direct deposit banking changes for employees, so that payroll is routed to the correct account.

#### Acceptance Criteria

1. WHEN a user submits a direct deposit change, THE `Payroll_Service` SHALL require the following fields: `employeeId`, `bankName`, `accountType` (`checking` or `savings`), `routingNumber`, `accountNumber`.
2. WHEN a direct deposit change is submitted, THE `Payroll_Service` SHALL record the submitter's identity and submission timestamp in the `Audit_Trail`.
3. THE `Back_Office_Module` SHALL mask the full account number on screen, displaying only the last 4 digits after entry.
4. THE `Back_Office_Module` SHALL mask the full routing number on screen, displaying only the last 4 digits after entry.
5. WHEN a user submits a direct deposit change, THE `Back_Office_Module` SHALL require the user to confirm the account number by entering it a second time, and SHALL reject submission if the two entries do not match.
6. IF any required field is missing or invalid when submitting a direct deposit change, THEN THE `Back_Office_Module` SHALL display a field-level validation error and prevent form submission.
7. WHEN a direct deposit change is successfully submitted, THE `Back_Office_Module` SHALL display a confirmation message including the submitter's name and the submission timestamp.
8. IF the backend API returns an error when submitting a direct deposit change, THEN THE `Back_Office_Module` SHALL display a user-readable error message and preserve the form data.
9. THE `Back_Office_Module` SHALL display the history of direct deposit changes for a selected employee, sorted by `submittedAt` descending.

---

### Requirement 4: W-4 Changes

**User Story:** As a payroll staff member, I want to submit W-4 withholding election changes for employees, so that federal tax withholding reflects the employee's current elections.

#### Acceptance Criteria

1. WHEN a user submits a W-4 change, THE `Payroll_Service` SHALL require the following fields: `employeeId`, `filingStatus`, `multipleJobsOrSpouseWorks` (boolean), `claimDependents` (numeric dollar amount ≥ 0), `otherIncome` (numeric dollar amount ≥ 0), `deductions` (numeric dollar amount ≥ 0), `extraWithholding` (numeric dollar amount ≥ 0).
2. WHEN a W-4 change is submitted, THE `Payroll_Service` SHALL record the submitter's identity and submission timestamp in the `Audit_Trail`.
3. THE `Back_Office_Module` SHALL support the following `filingStatus` values: `single_or_married_filing_separately`, `married_filing_jointly`, `head_of_household`.
4. IF any required field is missing or contains a negative numeric value when submitting a W-4 change, THEN THE `Back_Office_Module` SHALL display a field-level validation error and prevent form submission.
5. WHEN a W-4 change is successfully submitted, THE `Back_Office_Module` SHALL display a confirmation message including the submitter's name and the submission timestamp.
6. IF the backend API returns an error when submitting a W-4 change, THEN THE `Back_Office_Module` SHALL display a user-readable error message and preserve the form data.
7. THE `Back_Office_Module` SHALL display the history of W-4 changes for a selected employee, sorted by `submittedAt` descending.

---

### Requirement 5: Address/Phone/Email Contact Information Changes

**User Story:** As a payroll staff member, I want to update an employee's address, phone number, and email address, so that employee contact records remain current.

#### Acceptance Criteria

1. WHEN a user submits a contact information change, THE `Payroll_Service` SHALL require `employeeId` and at least one of the following fields to contain a non-empty value: `address`, `phone`, `email`.
2. WHEN a contact information change is submitted, THE `Payroll_Service` SHALL record the submitter's identity and submission timestamp in the `Audit_Trail`.
3. IF the `email` field is provided, THEN THE `Back_Office_Module` SHALL validate that the value conforms to a valid email address format before allowing submission.
4. IF the `phone` field is provided, THEN THE `Back_Office_Module` SHALL validate that the value contains only digits, spaces, hyphens, parentheses, and the `+` character, with a minimum of 10 digits.
5. IF no contact fields contain a non-empty value when the form is submitted, THEN THE `Back_Office_Module` SHALL display a validation error stating that at least one contact field must be changed and prevent form submission.
6. WHEN a contact information change is successfully submitted, THE `Back_Office_Module` SHALL display a confirmation message including the submitter's name and the submission timestamp.
7. IF the backend API returns an error when submitting a contact information change, THEN THE `Back_Office_Module` SHALL display a user-readable error message and preserve the form data.
8. THE `Back_Office_Module` SHALL display the history of contact information changes for a selected employee, sorted by `updatedAt` descending.

---

### Requirement 6: PRC Signing

**User Story:** As a payroll staff member, I want to capture digital signatures on Personnel Record Change documents, so that employment record updates are legally acknowledged and auditable.

#### Acceptance Criteria

1. WHEN a user initiates PRC signing, THE `Back_Office_Module` SHALL display the PRC document content or a reference link before presenting the signature input.
2. WHEN a user submits a PRC signature, THE `Payroll_Service` SHALL require the following fields: `employeeId`, `documentRef`, `signature`.
3. WHEN a PRC signature is submitted, THE `Payroll_Service` SHALL record the signer's identity, the `documentRef`, and the signature timestamp in the `Audit_Trail`.
4. IF the `signature` field is empty or contains only whitespace when the form is submitted, THEN THE `Back_Office_Module` SHALL display a validation error and prevent form submission.
5. WHEN a PRC signature is successfully submitted, THE `Back_Office_Module` SHALL display a confirmation message including the signer's name, the `documentRef`, and the signature timestamp.
6. IF the backend API returns an error when submitting a PRC signature, THEN THE `Back_Office_Module` SHALL display a user-readable error message and preserve the form data.
7. THE `Back_Office_Module` SHALL display the history of signed PRCs for a selected employee, sorted by `signedAt` descending.
8. WHEN a PRC document has already been signed by the current user for the same `documentRef` and `employeeId`, THE `Back_Office_Module` SHALL display the existing signature record and prevent duplicate submission.

---

### Requirement 7: Pay Stub Viewing and Printing

**User Story:** As a payroll staff member or employee, I want to view and print pay stubs for any pay period, so that employees have access to their compensation records.

#### Acceptance Criteria

1. WHEN a user selects an employee and a pay period, THE `Payroll_Service` SHALL retrieve the matching `Pay_Stub` records from the backend API.
2. WHEN pay stubs are retrieved, THE `Back_Office_Module` SHALL display the following fields for each stub: pay period dates, gross pay, total deductions (itemized), net pay, and payment date.
3. WHEN a user clicks the print button for a pay stub, THE `Back_Office_Module` SHALL open a print-optimized view of the selected `Pay_Stub` using the browser's print dialog.
4. WHEN a user clicks the download button for a pay stub, THE `Payroll_Service` SHALL retrieve the pay stub as a PDF and THE `Back_Office_Module` SHALL trigger a file download with a filename in the format `paystub_{employeeId}_{payPeriod}.pdf`.
5. WHEN no pay stubs are found for the selected employee and pay period, THE `Back_Office_Module` SHALL display a message indicating no records were found.
6. IF the backend API returns an error when retrieving pay stubs, THEN THE `Back_Office_Module` SHALL display a user-readable error message.
7. WHILE a user with `HR_Group` role is authenticated, THE `Back_Office_Module` SHALL display pay stubs in read-only mode with no edit controls visible.
8. THE `Back_Office_Module` SHALL support filtering pay stubs by year, displaying only stubs where the pay period falls within the selected calendar year.

---

### Requirement 8: W-2 Viewing and Printing

**User Story:** As a payroll staff member or employee, I want to view and print W-2 tax documents for any tax year, so that employees have access to their annual tax records.

#### Acceptance Criteria

1. WHEN a user selects an employee and a tax year, THE `Payroll_Service` SHALL retrieve the matching `W2_Document` records from the backend API.
2. WHEN W-2 documents are retrieved, THE `Back_Office_Module` SHALL display the following fields for each document: tax year, employer name, employee name, wages and tips, federal income tax withheld, Social Security wages, Social Security tax withheld, Medicare wages, Medicare tax withheld.
3. WHEN a user clicks the print button for a W-2 document, THE `Back_Office_Module` SHALL open a print-optimized view of the selected `W2_Document` using the browser's print dialog.
4. WHEN a user clicks the download button for a W-2 document, THE `Payroll_Service` SHALL retrieve the W-2 as a PDF and THE `Back_Office_Module` SHALL trigger a file download with a filename in the format `w2_{employeeId}_{taxYear}.pdf`.
5. WHEN no W-2 documents are found for the selected employee and tax year, THE `Back_Office_Module` SHALL display a message indicating no records were found.
6. IF the backend API returns an error when retrieving W-2 documents, THEN THE `Back_Office_Module` SHALL display a user-readable error message.
7. WHILE a user with `HR_Group` role is authenticated, THE `Back_Office_Module` SHALL display W-2 documents in read-only mode with no edit controls visible.
8. THE `Back_Office_Module` SHALL list all available tax years for a selected employee, allowing the user to select a year before retrieving the document.

---

### Requirement 9: Payroll Service API Integration

**User Story:** As a developer, I want a centralized `Payroll_Service`, so that all BOES components share a single, consistent HTTP client for backend communication.

#### Acceptance Criteria

1. THE `Payroll_Service` SHALL expose typed methods for each BOES operation: `getIncidentReports`, `createIncidentReport`, `submitDirectDepositChange`, `submitW4Change`, `submitContactInfoChange`, `signPrc`, `getPayStubs`, `getPayStubPdf`, `getW2Documents`, `getW2Pdf`.
2. WHEN any `Payroll_Service` method receives an HTTP error response, THE `Payroll_Service` SHALL map the error to a typed `PayrollServiceError` object containing `statusCode`, `message`, and `operation` fields.
3. WHEN any `Payroll_Service` method succeeds, THE `Payroll_Service` SHALL return an `Observable` of the typed response model.
4. THE `Payroll_Service` SHALL be provided at the root level so that all BOES components share a single instance.
5. WHEN `Payroll_Service.getPayStubPdf(employeeId, payPeriod)` is called, THE `Payroll_Service` SHALL request the PDF as a `Blob` response type.
6. WHEN `Payroll_Service.getW2Pdf(employeeId, taxYear)` is called, THE `Payroll_Service` SHALL request the PDF as a `Blob` response type.

---

### Requirement 10: Audit Trail

**User Story:** As a compliance officer, I want every write operation in BOES to produce an immutable audit log entry, so that all changes to employee records are traceable.

#### Acceptance Criteria

1. WHEN any BOES write operation is successfully persisted by the backend, THE `Payroll_Service` SHALL include in the request payload: the authenticated user's `id`, `name`, and `role`, and the UTC timestamp of the operation.
2. THE `Audit_Trail` entry for a direct deposit change SHALL include: `employeeId`, `submittedBy`, `submittedAt`, `bankAccountLast4`, `routingNumberLast4`.
3. THE `Audit_Trail` entry for a W-4 change SHALL include: `employeeId`, `submittedBy`, `submittedAt`, `filingStatus`.
4. THE `Audit_Trail` entry for a contact information change SHALL include: `employeeId`, `updatedBy`, `updatedAt`, and the names of the fields that were changed (not the values).
5. THE `Audit_Trail` entry for a PRC signature SHALL include: `employeeId`, `signedBy`, `signedAt`, `documentRef`.
6. THE `Audit_Trail` entry for an incident report SHALL include: `employeeId`, `reportedBy`, `reportedAt`, `type`.
7. WHEN a BOES write operation fails before reaching the backend, THE `Payroll_Service` SHALL NOT create an `Audit_Trail` entry.

---

### Requirement 11: Form State and Error Handling

**User Story:** As a payroll staff member, I want forms to preserve my input and show clear error messages when something goes wrong, so that I do not lose work due to validation failures or API errors.

#### Acceptance Criteria

1. WHEN a form submission fails due to a validation error, THE `Back_Office_Module` SHALL display inline error messages adjacent to each invalid field and SHALL NOT clear any field values.
2. WHEN a form submission fails due to a backend API error, THE `Back_Office_Module` SHALL display a dismissible error banner at the top of the form and SHALL NOT clear any field values.
3. WHEN a form is successfully submitted, THE `Back_Office_Module` SHALL reset the form to its initial empty state and display a success confirmation message.
4. WHILE a form submission is in progress, THE `Back_Office_Module` SHALL disable the submit button and display a loading indicator.
5. IF a user navigates away from a form with unsaved changes, THEN THE `Back_Office_Module` SHALL display a confirmation dialog asking the user to confirm navigation before discarding changes.
