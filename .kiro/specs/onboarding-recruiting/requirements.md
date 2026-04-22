# Requirements Document

## Introduction

This feature adds an Onboarding/Recruiting module to the Field Resource Management (FRM) Angular application. The module tracks new technician hires from initial recruitment through full onboarding completion. Each candidate progresses through a defined lifecycle with an offer status (Pre Offer → Offer → Offer Acceptance), required certifications (OSHA, Scissor Lift, BIISCI), a drug test, and work-site assignment. HR, Payroll, and Admin users can create candidate records, update their status, and view a pipeline dashboard showing where every candidate stands in the onboarding process.

## Glossary

- **Onboarding_Module**: The new Angular lazy-loaded module at `src/app/features/field-resource-management/components/onboarding/` that hosts all onboarding and recruiting components.
- **Onboarding_Service**: A new Angular injectable service responsible for all HTTP calls to the backend API for onboarding operations.
- **Candidate**: A prospective technician hire being tracked through the onboarding lifecycle. Identified by a unique `candidateId` string.
- **Offer_Status**: The current stage of a candidate's offer process. One of: `pre_offer`, `offer`, `offer_acceptance`.
- **Onboarding_Lifecycle**: The full progression of a candidate from initial record creation through offer acceptance, certification completion, and work-site assignment to a final "Onboarding Complete" state.
- **Certification_Status**: A boolean flag indicating whether a candidate has completed a specific certification (OSHA, Scissor Lift, or BIISCI).
- **Drug_Test_Status**: A boolean flag indicating whether a candidate has completed the required drug test.
- **Work_Site**: The physical location where the candidate will be assigned upon hire.
- **Pipeline_Dashboard**: A view that displays all candidates grouped or filterable by their current onboarding stage, providing at-a-glance visibility into the recruiting pipeline.
- **FRM_Permission_Service**: The existing Angular service at `src/app/features/field-resource-management/services/frm-permission.service.ts` that evaluates role-based permissions.
- **HR_Group**: Roles with onboarding read and write access: `HR`.
- **Payroll_Group**: Roles with onboarding read and write access: `Payroll`.
- **Admin**: The `Admin` role with full access to all onboarding features.
- **HrGuard**: The existing Angular route guard that restricts routes to `HR`, `Payroll`, and `Admin` roles.

---

## Requirements

### Requirement 1: Onboarding Module Navigation and Access Control

**User Story:** As an HR or Payroll staff member, I want a dedicated onboarding section in the FRM application, so that I can manage new hire candidates without navigating through unrelated modules.

#### Acceptance Criteria

1. WHEN a user with an `HR_Group`, `Payroll_Group`, or `Admin` role is authenticated, THE FRM navigation SHALL display a link to the `Onboarding_Module`.
2. IF a user without `HR_Group`, `Payroll_Group`, or `Admin` role attempts to activate any route under `/onboarding`, THEN THE `HrGuard` SHALL redirect the user to `/field-resource-management/dashboard`.
3. THE `Onboarding_Module` SHALL be lazy-loaded via a `loadChildren` route configuration in `field-resource-management-routing.module.ts` at the path `onboarding`.
4. WHEN the `Onboarding_Module` is loaded, THE `Onboarding_Module` SHALL display navigation links for: Candidate List, Pipeline Dashboard, and Add Candidate.

---

### Requirement 2: Candidate Data Model

**User Story:** As an HR staff member, I want each candidate record to capture all required onboarding information, so that I can track every detail of a new hire from start to finish.

#### Acceptance Criteria

1. THE `Candidate` model SHALL include the following required fields: `candidateId` (string), `techName` (string), `techEmail` (string), `techPhone` (string), `vestSize` (string), `drugTestComplete` (boolean), `oshaCertified` (boolean), `scissorLiftCertified` (boolean), `biisciCertified` (boolean), `workSite` (string), `startDate` (string, ISO date format), `offerStatus` (Offer_Status enum).
2. THE `Candidate` model SHALL include the following audit fields: `createdBy` (string), `createdAt` (string, ISO datetime), `updatedBy` (string), `updatedAt` (string, ISO datetime).
3. THE `Offer_Status` type SHALL support exactly three values: `pre_offer`, `offer`, `offer_acceptance`.
4. THE `vestSize` field SHALL accept the following values: `XS`, `S`, `M`, `L`, `XL`, `2XL`, `3XL`.

---

### Requirement 3: Create Candidate Record

**User Story:** As an HR staff member, I want to create a new candidate record with all onboarding details, so that the candidate enters the recruiting pipeline and can be tracked through the lifecycle.

#### Acceptance Criteria

1. WHEN a user submits a new candidate form, THE `Onboarding_Service` SHALL require the following fields: `techName`, `techEmail`, `techPhone`, `vestSize`, `workSite`, `startDate`, `offerStatus`.
2. WHEN a new candidate record is created, THE `Onboarding_Service` SHALL set `drugTestComplete`, `oshaCertified`, `scissorLiftCertified`, and `biisciCertified` to `false` by default.
3. IF the `techEmail` field does not conform to a valid email address format, THEN THE `Onboarding_Module` SHALL display a field-level validation error and prevent form submission.
4. IF the `techPhone` field does not contain a minimum of 10 digits (allowing digits, spaces, hyphens, parentheses, and the `+` character), THEN THE `Onboarding_Module` SHALL display a field-level validation error and prevent form submission.
5. IF any required field is missing or empty when the form is submitted, THEN THE `Onboarding_Module` SHALL display a field-level validation error adjacent to each invalid field and prevent form submission.
6. WHEN a candidate record is successfully created, THE `Onboarding_Module` SHALL display a success confirmation message and navigate to the candidate list view.
7. IF the backend API returns an error when creating a candidate, THEN THE `Onboarding_Module` SHALL display a user-readable error message and preserve the form data.

---

### Requirement 4: Edit Candidate Record

**User Story:** As an HR staff member, I want to update an existing candidate's onboarding information, so that I can reflect changes in their status, certifications, or personal details as they progress.

#### Acceptance Criteria

1. WHEN a user selects a candidate from the candidate list, THE `Onboarding_Module` SHALL display an edit form pre-populated with the candidate's current data.
2. WHEN a user submits an updated candidate form, THE `Onboarding_Service` SHALL send the updated fields to the backend API and record the updater's identity and the update timestamp.
3. THE `Onboarding_Module` SHALL allow updating all candidate fields: `techName`, `techEmail`, `techPhone`, `vestSize`, `drugTestComplete`, `oshaCertified`, `scissorLiftCertified`, `biisciCertified`, `workSite`, `startDate`, `offerStatus`.
4. IF any field fails validation on the edit form, THEN THE `Onboarding_Module` SHALL display a field-level validation error and prevent form submission.
5. WHEN a candidate record is successfully updated, THE `Onboarding_Module` SHALL display a success confirmation message.
6. IF the backend API returns an error when updating a candidate, THEN THE `Onboarding_Module` SHALL display a user-readable error message and preserve the form data.

---

### Requirement 5: Candidate List View

**User Story:** As an HR staff member, I want to view a list of all candidates with their current onboarding status, so that I can quickly see who is in the pipeline and where they stand.

#### Acceptance Criteria

1. WHEN the candidate list view is loaded, THE `Onboarding_Module` SHALL display a table with the following columns: Tech Name, Tech Email, Tech Phone, Vest Size, Drug Test, OSHA, Scissor Lift, BIISCI, Work Site, Start Date, Offer Status.
2. THE `Onboarding_Module` SHALL display boolean certification and drug test fields as visual indicators (e.g., checkmark for complete, dash for incomplete).
3. WHEN a user clicks a column header, THE `Onboarding_Module` SHALL sort the candidate list by that column in ascending order; clicking the same header again SHALL reverse the sort to descending order.
4. WHEN a user enters text in the search field, THE `Onboarding_Module` SHALL filter the candidate list to show only candidates whose `techName`, `techEmail`, or `workSite` contains the search text (case-insensitive).
5. WHEN a user selects an `Offer_Status` filter value, THE `Onboarding_Module` SHALL display only candidates matching the selected offer status.
6. WHEN no candidates match the current filters, THE `Onboarding_Module` SHALL display a message indicating no candidates were found.
7. IF the backend API returns an error when loading the candidate list, THEN THE `Onboarding_Module` SHALL display a user-readable error message.

---

### Requirement 6: Pipeline Dashboard

**User Story:** As an HR manager, I want a visual dashboard showing candidates grouped by their onboarding stage, so that I can see the overall health of the recruiting pipeline at a glance.

#### Acceptance Criteria

1. WHEN the pipeline dashboard is loaded, THE `Onboarding_Module` SHALL display candidate counts for each `Offer_Status` value: Pre Offer, Offer, Offer Acceptance.
2. WHEN the pipeline dashboard is loaded, THE `Onboarding_Module` SHALL display a summary count of candidates with incomplete certifications (any of `oshaCertified`, `scissorLiftCertified`, `biisciCertified` is `false`).
3. WHEN the pipeline dashboard is loaded, THE `Onboarding_Module` SHALL display a summary count of candidates with an incomplete drug test (`drugTestComplete` is `false`).
4. WHEN a user clicks on an `Offer_Status` group in the pipeline dashboard, THE `Onboarding_Module` SHALL navigate to the candidate list view pre-filtered by that offer status.
5. WHEN a user clicks on the incomplete certifications summary, THE `Onboarding_Module` SHALL navigate to the candidate list view filtered to show only candidates with at least one incomplete certification.
6. THE `Onboarding_Module` SHALL display a count of candidates whose `startDate` falls within the next 14 calendar days.

---

### Requirement 7: Offer Status Lifecycle Transitions

**User Story:** As an HR staff member, I want the system to enforce a valid offer status progression, so that candidates move through the pipeline in the correct order.

#### Acceptance Criteria

1. WHEN a candidate's `offerStatus` is `pre_offer`, THE `Onboarding_Module` SHALL allow transitioning only to `offer`.
2. WHEN a candidate's `offerStatus` is `offer`, THE `Onboarding_Module` SHALL allow transitioning only to `offer_acceptance` or back to `pre_offer`.
3. WHEN a candidate's `offerStatus` is `offer_acceptance`, THE `Onboarding_Module` SHALL allow transitioning back to `offer` only.
4. IF a user attempts to set an `offerStatus` value that violates the allowed transitions, THEN THE `Onboarding_Module` SHALL display a validation error and prevent the status change.

---

### Requirement 8: Onboarding Service API Integration

**User Story:** As a developer, I want a centralized `Onboarding_Service`, so that all onboarding components share a single, consistent HTTP client for backend communication.

#### Acceptance Criteria

1. THE `Onboarding_Service` SHALL expose typed methods for: `getCandidates`, `getCandidateById`, `createCandidate`, `updateCandidate`, `deleteCandidateById`.
2. WHEN any `Onboarding_Service` method receives an HTTP error response, THE `Onboarding_Service` SHALL map the error to a typed `OnboardingServiceError` object containing `statusCode`, `message`, and `operation` fields.
3. WHEN any `Onboarding_Service` method succeeds, THE `Onboarding_Service` SHALL return an `Observable` of the typed response model.
4. THE `Onboarding_Service` SHALL be provided at the root level so that all onboarding components share a single instance.
5. WHEN `Onboarding_Service.getCandidates` is called with filter parameters, THE `Onboarding_Service` SHALL pass the filters as HTTP query parameters to the backend API.

---

### Requirement 9: Onboarding Permissions

**User Story:** As a system administrator, I want onboarding access controlled by the existing permission system, so that only authorized roles can create, edit, or view candidate records.

#### Acceptance Criteria

1. THE `FRM_Permission_Service` SHALL support a new permission key `canManageOnboarding` that grants create, read, and update access to candidate records.
2. WHEN a user with `HR_Group` role is authenticated, THE `FRM_Permission_Service` SHALL return `true` for the `canManageOnboarding` permission.
3. WHEN a user with `Payroll_Group` role is authenticated, THE `FRM_Permission_Service` SHALL return `true` for the `canManageOnboarding` permission.
4. WHEN a user with `Admin` role is authenticated, THE `FRM_Permission_Service` SHALL return `true` for the `canManageOnboarding` permission.
5. WHEN a user without `HR_Group`, `Payroll_Group`, or `Admin` role is authenticated, THE `FRM_Permission_Service` SHALL return `false` for the `canManageOnboarding` permission.

---

### Requirement 10: Form State and Error Handling

**User Story:** As an HR staff member, I want onboarding forms to preserve my input and show clear error messages when something goes wrong, so that I do not lose work due to validation failures or API errors.

#### Acceptance Criteria

1. WHEN a form submission fails due to a validation error, THE `Onboarding_Module` SHALL display inline error messages adjacent to each invalid field and SHALL NOT clear any field values.
2. WHEN a form submission fails due to a backend API error, THE `Onboarding_Module` SHALL display a dismissible error banner at the top of the form and SHALL NOT clear any field values.
3. WHEN a form is successfully submitted, THE `Onboarding_Module` SHALL reset the form to its initial empty state and display a success confirmation message.
4. WHILE a form submission is in progress, THE `Onboarding_Module` SHALL disable the submit button and display a loading indicator.
5. IF a user navigates away from a form with unsaved changes, THEN THE `Onboarding_Module` SHALL display a confirmation dialog asking the user to confirm navigation before discarding changes.
