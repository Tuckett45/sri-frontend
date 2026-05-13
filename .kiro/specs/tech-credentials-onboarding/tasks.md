# Implementation Plan: Tech Credentials Onboarding

## Overview

This plan implements the full "Tech Credentials" feature within the existing Onboarding module. Phase 1 (tasks 1–10) covers basic credential CRUD — navigation, list view, detail view, form, routing, and mock data. Phase 2 (tasks 11–21) extends the feature with typed credentials, onboarding checklist with delta tracking, equipment management, technical competency tracking, and PRC goals with a 60-day timer.

All components use inline template/style patterns and integrate with the existing `OnboardingModule`, `OnboardingRoutingModule`, `TechnicianService`, and `MockOnboardingInterceptor`.

## Tasks

- [x] 1. Create credential status utility and property tests
  - [x] 1.1 Create `credential-status.util.ts` with `computeCredentialStatus` function
    - Create file at `src/app/features/field-resource-management/utils/credential-status.util.ts`
    - Implement pure function that accepts `expirationDate: Date` and optional `referenceDate: Date` (defaults to `new Date()`)
    - Return `CertificationStatus.Expired` if expirationDate < referenceDate
    - Return `CertificationStatus.ExpiringSoon` if expirationDate is within 30 days of referenceDate
    - Return `CertificationStatus.Active` otherwise
    - Import `CertificationStatus` from `../models/technician.model`
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x]* 1.2 Write property test: Credential status computation is correct
    - **Property 1: Credential status computation is correct**
    - **Validates: Requirements 5.4, 7.1, 7.2, 7.3**
    - Create `src/app/features/field-resource-management/utils/credential-status.util.spec.ts`
    - Use fast-check to generate arbitrary expiration dates and reference dates
    - Assert the three-way partition: Expired, ExpiringSoon, Active based on date difference
    - Minimum 100 iterations

  - [ ]* 1.3 Write property test: Credential status count aggregation is correct
    - **Property 2: Credential status count aggregation is correct**
    - **Validates: Requirements 2.2**
    - Generate arbitrary arrays of Certification objects with random expiration dates
    - Assert `activeCount + expiringSoonCount + expiredCount === totalCount === certifications.length`
    - Assert each credential is counted in exactly one category

- [x] 2. Extend TechnicianService with certification CRUD methods
  - [x] 2.1 Add `addTechnicianCertification` method to TechnicianService
    - Add method signature: `addTechnicianCertification(technicianId: string, certification: Omit<Certification, 'id'>): Observable<Certification>`
    - POST to `${apiUrl}/${technicianId}/certifications`
    - Apply `retry(1)` and `catchError(this.handleError)`
    - _Requirements: 4.3, 10.2_

  - [x] 2.2 Add `updateTechnicianCertification` method to TechnicianService
    - Add method signature: `updateTechnicianCertification(technicianId: string, certificationId: string, certification: Partial<Certification>): Observable<Certification>`
    - PUT to `${apiUrl}/${technicianId}/certifications/${certificationId}`
    - Apply `catchError(this.handleError)`
    - _Requirements: 5.2, 10.3_

  - [x] 2.3 Add `deleteTechnicianCertification` method to TechnicianService
    - Add method signature: `deleteTechnicianCertification(technicianId: string, certificationId: string): Observable<void>`
    - DELETE to `${apiUrl}/${technicianId}/certifications/${certificationId}`
    - Apply `catchError(this.handleError)`
    - _Requirements: 6.2, 10.4_

  - [ ]* 2.4 Write unit tests for new TechnicianService methods
    - Test that `addTechnicianCertification` makes correct POST request
    - Test that `updateTechnicianCertification` makes correct PUT request
    - Test that `deleteTechnicianCertification` makes correct DELETE request
    - Test error handling for each method
    - _Requirements: 4.3, 5.2, 6.2_

- [x] 3. Extend MockOnboardingInterceptor for certification endpoints
  - [x] 3.1 Add mock technician data with certifications to the interceptor
    - Add a `technicians` array with seed data including varying credential statuses
    - Include technicians with all Active, some ExpiringSoon, some Expired, and some with no credentials
    - Reuse the existing `Certification` interface from `technician.model.ts`
    - _Requirements: 10.5_

  - [x] 3.2 Handle GET `/technicians` and GET `/technicians/:id` in the interceptor
    - Match GET requests to `/technicians` endpoint and return the mock technicians array
    - Match GET requests to `/technicians/:id` and return a single technician
    - Support the existing `getTechnicians()` and `getTechnicianById()` service methods
    - _Requirements: 10.1_

  - [x] 3.3 Handle GET `/technicians/:id/certifications` in the interceptor
    - Match GET requests and return the certifications array for the specified technician
    - Return 404 if technician not found
    - _Requirements: 10.1_

  - [x] 3.4 Handle POST `/technicians/:id/certifications` in the interceptor
    - Generate a new certification ID
    - Add the certification to the technician's certifications array
    - Return the created certification object
    - _Requirements: 10.2_

  - [x] 3.5 Handle PUT `/technicians/:id/certifications/:certId` in the interceptor
    - Find and update the matching certification
    - Return the updated certification object
    - Return 404 if technician or certification not found
    - _Requirements: 10.3_

  - [x] 3.6 Handle DELETE `/technicians/:id/certifications/:certId` in the interceptor
    - Remove the certification from the technician's array
    - Return 200 with null body
    - Return 404 if technician or certification not found
    - _Requirements: 10.4_

- [x] 4. Checkpoint - Ensure utility and service layer tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement CredentialsListComponent
  - [x] 5.1 Create `CredentialsListComponent` with template, styles, and logic
    - Create file at `src/app/features/field-resource-management/components/onboarding/credentials-list/credentials-list.component.ts`
    - Use inline template and styles following existing project pattern
    - Inject `TechnicianService` and `Router`
    - On init, load all technicians and their certifications
    - Compute `TechnicianCredentialSummary` for each technician using `computeCredentialStatus`
    - Display technician name, email, region, and credential status counts (Active, ExpiringSoon, Expired)
    - Display "No Credentials" badge for technicians with zero credentials
    - Implement text search with `Subject` and `debounceTime(300)` filtering by name or email (case-insensitive)
    - Implement status filter dropdown (All, Active, ExpiringSoon, Expired)
    - Display "No technicians match the current filters." when filters yield no results
    - Display error state with "Unable to load technicians. Please try again." message and Retry button
    - Navigate to credential detail on technician row click
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 9.1_

  - [ ]* 5.2 Write property test: Search filtering returns only matching technicians
    - **Property 3: Search filtering returns only matching technicians**
    - **Validates: Requirements 2.3**
    - Generate arbitrary technician lists and search terms
    - Assert filtered results contain only and all technicians matching by name or email (case-insensitive)

  - [ ]* 5.3 Write property test: Status filtering returns only technicians with matching credentials
    - **Property 4: Status filtering returns only technicians with matching credentials**
    - **Validates: Requirements 2.4**
    - Generate arbitrary technician lists with credentials and a selected status
    - Assert filtered results contain only technicians with at least one credential of the selected status

  - [ ]* 5.4 Write unit tests for CredentialsListComponent
    - Test rendering with mock technician data
    - Test empty state message display
    - Test error state and retry button
    - Test debounce timing on search input
    - _Requirements: 2.1, 2.3, 2.5, 9.1_

- [x] 6. Implement CredentialDetailComponent
  - [x] 6.1 Create `CredentialDetailComponent` with template, styles, and logic
    - Create file at `src/app/features/field-resource-management/components/onboarding/credential-detail/credential-detail.component.ts`
    - Use inline template and styles following existing project pattern
    - Inject `TechnicianService`, `ActivatedRoute`, and `Router`
    - Read `technicianId` from route params
    - Load technician info and certifications on init
    - Display each credential with name, issue date, expiration date, and computed status
    - Color-code credentials: green for Active, amber for ExpiringSoon, red for Expired
    - Sort credentials: Expired first, then ExpiringSoon, then Active
    - Provide "Add Credential" button navigating to `credentials/:technicianId/new`
    - Provide "Edit" action per credential navigating to `credentials/:technicianId/edit/:credentialId`
    - Provide "Delete" action per credential with confirmation dialog: "Are you sure you want to delete this credential? This action cannot be undone."
    - Display "No credentials on file" message with add button when technician has no credentials
    - Display error state with "Unable to load credentials for this technician." and Retry button
    - Display "Failed to delete credential. Please try again." on delete failure with Retry
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 6.1, 6.2, 6.3, 9.2, 9.3_

  - [ ]* 6.2 Write property test: Credential sorting maintains status priority ordering
    - **Property 5: Credential sorting maintains status priority ordering**
    - **Validates: Requirements 3.4**
    - Generate arbitrary arrays of credentials with random statuses
    - Assert after sorting: all Expired before all ExpiringSoon, all ExpiringSoon before all Active

  - [ ]* 6.3 Write unit tests for CredentialDetailComponent
    - Test color coding by status
    - Test empty state message and add button
    - Test delete confirmation dialog
    - Test navigation to add/edit forms
    - Test error state and retry
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 6.1, 9.2_

- [x] 7. Implement CredentialFormComponent
  - [x] 7.1 Create `CredentialFormComponent` with template, styles, and logic
    - Create file at `src/app/features/field-resource-management/components/onboarding/credential-form/credential-form.component.ts`
    - Use inline template and styles following existing project pattern
    - Inject `TechnicianService`, `ActivatedRoute`, `Router`, and `FormBuilder`
    - Read `technicianId` and optional `credentialId` from route params
    - If `credentialId` present, load existing credential and pre-populate form (edit mode)
    - Create reactive form with fields: `name` (required), `issueDate` (required), `expirationDate` (required)
    - Add cross-field validator: expirationDate must be after issueDate, error message "Expiration date must be after issue date."
    - Display inline validation messages for each missing required field
    - Compute and display credential status based on expiration date using `computeCredentialStatus`
    - Implement `HasUnsavedChanges` interface (or equivalent) for `UnsavedChangesGuard` integration
    - On valid submit in add mode: call `addTechnicianCertification()`, navigate back to detail view
    - On valid submit in edit mode: call `updateTechnicianCertification()`, navigate back to detail view
    - Display "Failed to save credential. Please try again." on save failure with Retry
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 9.3, 9.4_

  - [ ]* 7.2 Write property test: Form validation rejects submissions with missing required fields
    - **Property 6: Form validation rejects submissions with missing required fields**
    - **Validates: Requirements 4.2, 4.4**
    - Generate arbitrary subsets of required fields left empty
    - Assert form is invalid and each empty field has a 'required' validation error

  - [ ]* 7.3 Write property test: Cross-field date validation rejects invalid date ranges
    - **Property 7: Cross-field date validation rejects invalid date ranges**
    - **Validates: Requirements 4.5**
    - Generate arbitrary date pairs
    - Assert validation error present when expirationDate <= issueDate
    - Assert no date-range error when expirationDate > issueDate

  - [ ]* 7.4 Write property test: Form pre-population preserves credential data
    - **Property 8: Form pre-population preserves credential data**
    - **Validates: Requirements 5.1**
    - Generate arbitrary valid Certification objects
    - Assert form values match the original credential's name, issueDate, and expirationDate after initialization

  - [ ]* 7.5 Write unit tests for CredentialFormComponent
    - Test empty form rendering for add mode
    - Test pre-populated form for edit mode
    - Test save success navigation
    - Test error display on save failure
    - Test unsaved changes guard integration
    - _Requirements: 4.1, 4.4, 5.1, 5.3, 9.3_

- [x] 8. Checkpoint - Ensure all component tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Wire routing, module declarations, and navigation
  - [x] 9.1 Update `OnboardingRoutingModule` with credential routes
    - Add route `credentials` → `CredentialsListComponent`
    - Add route `credentials/:technicianId` → `CredentialDetailComponent`
    - Add route `credentials/:technicianId/new` → `CredentialFormComponent` with `UnsavedChangesGuard`
    - Add route `credentials/:technicianId/edit/:credentialId` → `CredentialFormComponent` with `UnsavedChangesGuard`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 9.2 Update `OnboardingModule` declarations
    - Add `CredentialsListComponent`, `CredentialDetailComponent`, and `CredentialFormComponent` to the declarations array
    - _Requirements: 8.6_

  - [x] 9.3 Update `OnboardingNavComponent` with "Tech Credentials" tab
    - Add `{ label: 'Tech Credentials', route: './credentials' }` to the `navLinks` array after "Pipeline Dashboard"
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ]* 9.4 Write unit tests for routing and navigation integration
    - Test that all credential routes are registered correctly
    - Test that OnboardingNavComponent displays three tabs in correct order
    - Test that "Tech Credentials" tab navigates to credentials route
    - _Requirements: 1.1, 1.2, 8.1, 8.2, 8.3, 8.4_

- [x] 10. Final checkpoint - Phase 1 complete
  - Ensure all tests pass, ask the user if questions arise.


---

## Phase 2: Typed Credentials, Onboarding Checklist, Equipment, Competencies, and PRC (Requirements 11–15)

- [x] 11. Create data models for typed credentials, equipment, competencies, and PRC
  - [x] 11.1 Create `credential-types.model.ts` with TypedCredential discriminated union
    - Create file at `src/app/features/field-resource-management/models/credential-types.model.ts`
    - Define `CredentialType` union type: `'Drivers_License' | 'Drug_Screen' | 'OSHA_Training_Cert' | 'Offer_Letter' | 'Background_Check' | 'SSN_Last_Four'`
    - Define `BaseCredential` interface with shared fields: id, technicianId, credentialType, name, status, createdAt, updatedAt
    - Define type-specific interfaces: `DriversLicenseCredential`, `DrugScreenCredential`, `OSHATrainingCertCredential`, `OfferLetterCredential`, `BackgroundCheckCredential`, `SSNLastFourCredential`
    - Define `TypedCredential` discriminated union type
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

  - [x] 11.2 Create `equipment.model.ts` with EquipmentAssignment interface
    - Create file at `src/app/features/field-resource-management/models/equipment.model.ts`
    - Define `EquipmentAssetType`: `'badge' | 'laptop' | 'other'`
    - Define `EquipmentStatus`: `'assigned' | 'returned' | 'lost'`
    - Define `EquipmentAssignment` interface with fields: id, technicianId, assetType, assetIdentifier, assignmentDate, returnDate (optional), status, notes (optional), createdAt, updatedAt
    - _Requirements: 13.1_

  - [x] 11.3 Create `competency.model.ts` with TechnicalCompetency interface
    - Create file at `src/app/features/field-resource-management/models/competency.model.ts`
    - Define `ProficiencyLevel`: `'beginner' | 'intermediate' | 'advanced' | 'expert'`
    - Define `PREDEFINED_COMPETENCIES` constant array: `['OTDR Knowledge', 'Fiber Optic Characterization / OTDR Testing']`
    - Define `TechnicalCompetency` interface with fields: id, technicianId, competencyName, verificationDate, verifiedBy, proficiencyLevel, notes (optional), createdAt, updatedAt
    - _Requirements: 14.1, 14.2_

  - [x] 11.4 Create `prc.model.ts` with PRC and PRCGoal interfaces
    - Create file at `src/app/features/field-resource-management/models/prc.model.ts`
    - Define `PRCRecordStatus`: `'upcoming' | 'overdue' | 'completed'`
    - Define `PRCGoalStatus`: `'not_started' | 'in_progress' | 'completed'`
    - Define `PRCGoal` interface with fields: id, prcId, description, targetDate, status, completionNotes (optional), createdAt, updatedAt
    - Define `PRC` interface with fields: id, technicianId, dueDate, completionDate (optional), status, goals array, createdAt, updatedAt
    - _Requirements: 15.1, 15.2_

  - [x] 11.5 Create `role-credential-template.model.ts` with RoleCredentialTemplate interface
    - Create file at `src/app/features/field-resource-management/models/role-credential-template.model.ts`
    - Define `RequiredItem` interface with fields: category ('credential' | 'equipment' | 'competency' | 'prc'), name, credentialType (optional), assetType (optional), competencyName (optional)
    - Define `RoleCredentialTemplate` interface with fields: role (TechnicianRole), requiredItems array
    - _Requirements: 12.1, 12.10_

- [x] 12. Create PRC timer utility and checklist delta utility
  - [x] 12.1 Create `prc-timer.util.ts` with PRC date and status computation
    - Create file at `src/app/features/field-resource-management/utils/prc-timer.util.ts`
    - Implement `computePRCDueDate(startOrCompletionDate: Date): Date` — adds 60 days to input date
    - Implement `computePRCStatus(dueDate: Date, completionDate: Date | null, referenceDate?: Date): PRCStatus` — returns 'completed' if completionDate set, 'overdue' if referenceDate > dueDate, 'upcoming' otherwise
    - _Requirements: 15.3, 15.4, 15.6, 15.7_

  - [x]* 12.2 Write property test: PRC due date computation is 60 days from reference date
    - **Property 13: PRC due date computation is 60 days from reference date**
    - **Validates: Requirements 15.3, 15.4**
    - Create `src/app/features/field-resource-management/utils/prc-timer.util.spec.ts`
    - Use fast-check to generate arbitrary valid dates
    - Assert `computePRCDueDate(date)` returns a date exactly 60 days after input
    - Minimum 100 iterations

  - [x]* 12.3 Write property test: PRC status derivation is correct
    - **Property 14: PRC status derivation is correct**
    - **Validates: Requirements 15.6, 15.7**
    - Generate arbitrary due dates, optional completion dates, and reference dates
    - Assert 'completed' when completionDate is not null
    - Assert 'overdue' when completionDate is null AND referenceDate > dueDate
    - Assert 'upcoming' when completionDate is null AND referenceDate <= dueDate

  - [x] 12.4 Create `checklist-delta.util.ts` with onboarding delta computation
    - Create file at `src/app/features/field-resource-management/utils/checklist-delta.util.ts`
    - Define `ChecklistItem` interface: category, name, status ('complete' | 'missing' | 'expired')
    - Define `ChecklistSummary` interface: items, completeCount, missingCount, expiredCount, totalCount, completionPercentage, isReadyToStart
    - Implement `computeChecklistDelta(template, credentials, equipment, competencies, prc, referenceDate?)` pure function
    - Mark item "Complete" when matching valid (non-expired) record exists on file
    - Mark item "Expired" when matching credential exists but has Expired status
    - Mark item "Missing" when no matching record exists
    - Compute completionPercentage as `(completeCount / totalCount) * 100`
    - Set isReadyToStart to true only when missingCount === 0 AND expiredCount === 0
    - _Requirements: 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 13.6, 14.5, 15.9_

  - [x]* 12.5 Write property test: Onboarding checklist delta computation is correct
    - **Property 10: Onboarding checklist delta computation is correct**
    - **Validates: Requirements 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 13.6, 14.5, 15.9**
    - Create `src/app/features/field-resource-management/utils/checklist-delta.util.spec.ts`
    - Generate arbitrary RoleCredentialTemplates and on-file item combinations
    - Assert completeCount + missingCount + expiredCount === totalCount
    - Assert completionPercentage === (completeCount / totalCount) * 100
    - Assert isReadyToStart === (missingCount === 0 AND expiredCount === 0)
    - Minimum 100 iterations

- [x] 13. Create SSN validation utility and credential type registry
  - [x] 13.1 Create `ssn-validation.util.ts` with SSN Last Four validator
    - Create file at `src/app/features/field-resource-management/utils/ssn-validation.util.ts`
    - Implement `validateSSNLastFour(value: string): boolean` — returns true if and only if input matches `/^\d{4}$/`
    - Implement Angular `ValidatorFn` wrapper for use in reactive forms
    - _Requirements: 11.7_

  - [ ]* 13.2 Write property test: SSN Last Four validation accepts only 4-digit strings
    - **Property 9: SSN Last Four validation accepts only 4-digit strings**
    - **Validates: Requirements 11.7**
    - Create `src/app/features/field-resource-management/utils/ssn-validation.util.spec.ts`
    - Generate arbitrary strings (varying lengths, numeric and non-numeric)
    - Assert validation passes if and only if string matches exactly 4 numeric digits
    - Minimum 100 iterations

  - [x] 13.3 Create credential type registry configuration
    - Create file at `src/app/features/field-resource-management/config/credential-type-registry.ts`
    - Define `CredentialTypeConfig` interface: type (CredentialType), label (string), fields array (field name, label, type, required, validators)
    - Define `CREDENTIAL_TYPE_REGISTRY` constant array with configurations for all 6 credential types
    - Each type config specifies which fields to render and their validation rules
    - Export helper function `getCredentialTypeConfig(type: CredentialType): CredentialTypeConfig`
    - _Requirements: 11.10, 11.11_

- [x] 14. Checkpoint - Ensure all utility and model tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Extend TechnicianService with equipment, competency, and PRC methods
  - [x] 15.1 Add equipment CRUD methods to TechnicianService
    - Add `getTechnicianEquipment(technicianId: string): Observable<EquipmentAssignment[]>`
    - Add `assignEquipment(technicianId: string, equipment: Omit<EquipmentAssignment, 'id'>): Observable<EquipmentAssignment>`
    - Add `updateEquipmentAssignment(technicianId: string, equipmentId: string, update: Partial<EquipmentAssignment>): Observable<EquipmentAssignment>`
    - Add `validateAssetUniqueness(assetIdentifier: string, excludeTechnicianId?: string): Observable<boolean>`
    - All methods follow existing pattern: HttpClient call with `retry()` and `catchError(this.handleError)`
    - _Requirements: 13.2, 13.4, 13.5_

  - [x] 15.2 Add competency CRUD methods to TechnicianService
    - Add `getTechnicianCompetencies(technicianId: string): Observable<TechnicalCompetency[]>`
    - Add `addTechnicianCompetency(technicianId: string, competency: Omit<TechnicalCompetency, 'id'>): Observable<TechnicalCompetency>`
    - Add `updateTechnicianCompetency(technicianId: string, competencyId: string, update: Partial<TechnicalCompetency>): Observable<TechnicalCompetency>`
    - _Requirements: 14.3_

  - [x] 15.3 Add PRC CRUD methods to TechnicianService
    - Add `getTechnicianPRC(technicianId: string): Observable<PRC | null>`
    - Add `createPRC(technicianId: string, prc: Omit<PRC, 'id' | 'goals'>): Observable<PRC>`
    - Add `completePRC(technicianId: string, prcId: string, completionDate: Date): Observable<PRC>` — also computes next PRC due date
    - Add `addPRCGoal(technicianId: string, prcId: string, goal: Omit<PRCGoal, 'id'>): Observable<PRCGoal>`
    - Add `updatePRCGoal(technicianId: string, prcId: string, goalId: string, update: Partial<PRCGoal>): Observable<PRCGoal>`
    - _Requirements: 15.3, 15.4, 15.8_

  - [x] 15.4 Add checklist template method to TechnicianService
    - Add `getRoleCredentialTemplate(role: TechnicianRole): Observable<RoleCredentialTemplate>`
    - GET to `${apiUrl}/role-templates/${role}`
    - _Requirements: 12.1, 12.10_

  - [ ]* 15.5 Write unit tests for new TechnicianService equipment, competency, and PRC methods
    - Test HTTP call verification for all new endpoints
    - Test error handling for each method
    - Test that `completePRC` triggers next due date computation
    - _Requirements: 13.2, 14.3, 15.3, 15.4, 15.8_

- [x] 16. Extend MockOnboardingInterceptor for equipment, competency, PRC, and template endpoints
  - [x] 16.1 Add mock equipment data and handlers to the interceptor
    - Add equipment assignments in all statuses (assigned, returned, lost) to mock data
    - Handle GET `/technicians/:id/equipment` — return equipment for technician
    - Handle POST `/technicians/:id/equipment` — assign new equipment, generate ID
    - Handle PUT `/technicians/:id/equipment/:equipmentId` — update equipment status/return date
    - Handle GET `/equipment/validate/:assetIdentifier` — check uniqueness across all technicians
    - _Requirements: 13.1, 13.2, 13.4, 13.5_

  - [x] 16.2 Add mock competency data and handlers to the interceptor
    - Add competencies at various proficiency levels to mock data
    - Handle GET `/technicians/:id/competencies` — return competencies for technician
    - Handle POST `/technicians/:id/competencies` — add new competency, generate ID
    - Handle PUT `/technicians/:id/competencies/:competencyId` — update competency
    - _Requirements: 14.1, 14.3_

  - [x] 16.3 Add mock PRC data and handlers to the interceptor
    - Add PRCs in all states (upcoming, overdue, completed) with sample goals to mock data
    - Handle GET `/technicians/:id/prc` — return current PRC for technician
    - Handle POST `/technicians/:id/prc` — create new PRC
    - Handle PUT `/technicians/:id/prc/:prcId/complete` — mark PRC complete, compute next due date
    - Handle POST `/technicians/:id/prc/:prcId/goals` — add PRC goal
    - Handle PUT `/technicians/:id/prc/:prcId/goals/:goalId` — update PRC goal status
    - _Requirements: 15.1, 15.3, 15.4, 15.8_

  - [x] 16.4 Add mock role credential template data and handler
    - Define role templates for each TechnicianRole (Installer, Lead, Level1, Level2, Level3, Level4) with different required items
    - Handle GET `/role-templates/:role` — return RoleCredentialTemplate for the specified role
    - Include required credentials, equipment, competencies, and PRC items per role
    - _Requirements: 12.1, 12.10_

  - [x] 16.5 Add typed credential mock data to existing certification handlers
    - Update mock technician certifications to use `TypedCredential` discriminated union format
    - Include examples of all 6 credential types across different technicians
    - Ensure backward compatibility with existing GET/POST/PUT/DELETE handlers
    - _Requirements: 11.1, 11.8_

- [x] 17. Upgrade CredentialFormComponent with typed credential support
  - [x] 17.1 Add credential type selector and dynamic field rendering to CredentialFormComponent
    - Add `credentialType` dropdown to the form using values from `CREDENTIAL_TYPE_REGISTRY`
    - On type selection, dynamically show/hide type-specific fields based on registry configuration
    - Add type-specific form controls with appropriate validators per credential type
    - For Drivers_License: add licenseNumber (required), issuingState (required) fields
    - For Drug_Screen: add testDate (required), result (required, pass/fail), testingFacility (required) fields
    - For OSHA_Training_Cert: add certificationNumber (required), trainingProvider (required) fields
    - For Offer_Letter: add offerDate (required), acceptedDate (optional), offerStatus (required) fields
    - For Background_Check: add submissionDate (required), completionDate (optional), result (required), provider (required) fields
    - For SSN_Last_Four: add lastFourDigits field with SSN validator and input masking after entry
    - Display credential type alongside credential name in detail view
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.11_

  - [x] 17.2 Add legacy boolean field update for Drug_Screen and OSHA_Training_Cert
    - When saving a Drug_Screen credential, also update the legacy `drugTest` boolean on the Candidate record via TechnicianService
    - When saving an OSHA_Training_Cert credential, also update the legacy `osha` boolean on the Candidate record via TechnicianService
    - Ensure backward compatibility with existing onboarding pipeline views
    - _Requirements: 11.9_

  - [ ]* 17.3 Write unit tests for typed credential form behavior
    - Test that selecting each credential type shows correct fields
    - Test SSN masking behavior after entry
    - Test type-specific validation rules
    - Test legacy boolean update for Drug_Screen and OSHA_Training_Cert
    - Test dynamic field rendering from registry configuration
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.9, 11.11_

- [x] 18. Implement EquipmentSectionComponent and CompetencySectionComponent
  - [x] 18.1 Create `EquipmentSectionComponent` with template, styles, and logic
    - Create file at `src/app/features/field-resource-management/components/onboarding/equipment-section/equipment-section.component.ts`
    - Use inline template and styles following existing project pattern
    - Accept `@Input() technicianId: string` and `@Input() equipmentAssignments: EquipmentAssignment[]`
    - Emit `@Output() equipmentChanged: EventEmitter<void>` to trigger parent reload
    - Display all equipment assignments with asset type, asset identifier, assignment date, return date, and status
    - Provide "Assign Equipment" button with inline form (asset type, asset identifier)
    - Validate asset identifier uniqueness via `TechnicianService.validateAssetUniqueness()` before submission
    - Display "This asset is currently assigned to another technician." on duplicate validation failure
    - Provide "Mark as Returned" action — updates status to 'returned' and sets return date
    - Provide "Mark as Lost" action — updates status to 'lost'
    - Display error state with retry on failure
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [ ]* 18.2 Write property test: Equipment asset identifier uniqueness validation
    - **Property 12: Equipment asset identifier uniqueness validation**
    - **Validates: Requirements 13.5**
    - Create `src/app/features/field-resource-management/utils/equipment-validation.util.spec.ts`
    - Generate arbitrary sets of equipment assignments across technicians
    - Assert that assigning a currently-assigned identifier to a different technician is rejected
    - Assert that assigning a returned/lost identifier or same-technician identifier is allowed
    - Minimum 100 iterations

  - [x] 18.3 Create `CompetencySectionComponent` with template, styles, and logic
    - Create file at `src/app/features/field-resource-management/components/onboarding/competency-section/competency-section.component.ts`
    - Use inline template and styles following existing project pattern
    - Accept `@Input() technicianId: string` and `@Input() competencies: TechnicalCompetency[]`
    - Emit `@Output() competencyChanged: EventEmitter<void>` to trigger parent reload
    - Display all competencies sorted by proficiency level: Expert first, then Advanced, Intermediate, Beginner
    - Show competency name, verification date, verified by, proficiency level, and notes
    - Provide "Add Competency" button with inline form (competency name with predefined options + custom, verification date, verified by, proficiency level, notes)
    - Support predefined competency names ("OTDR Knowledge", "Fiber Optic Characterization / OTDR Testing") as dropdown options plus a custom text input
    - Display error state with retry on failure
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.6_

  - [ ]* 18.4 Write property test: Technical competency sorting by proficiency level
    - **Property 15: Technical competency sorting by proficiency level**
    - **Validates: Requirements 14.6**
    - Create `src/app/features/field-resource-management/utils/competency-sort.util.spec.ts`
    - Generate arbitrary arrays of TechnicalCompetency objects with random proficiency levels
    - Assert after sorting: all 'expert' before 'advanced', all 'advanced' before 'intermediate', all 'intermediate' before 'beginner'
    - Minimum 100 iterations

  - [ ]* 18.5 Write unit tests for EquipmentSectionComponent and CompetencySectionComponent
    - Test equipment list rendering with all statuses
    - Test assign/return/lost actions and event emission
    - Test duplicate asset validation error display
    - Test competency list rendering sorted by proficiency
    - Test add competency form with predefined and custom names
    - _Requirements: 13.1, 13.3, 13.4, 13.5, 14.1, 14.4, 14.6_

- [x] 19. Implement PRCSectionComponent
  - [x] 19.1 Create `PRCSectionComponent` with template, styles, and logic
    - Create file at `src/app/features/field-resource-management/components/onboarding/prc-section/prc-section.component.ts`
    - Use inline template and styles following existing project pattern
    - Accept `@Input() technicianId: string` and `@Input() prc: PRC | null`
    - Emit `@Output() prcChanged: EventEmitter<void>` to trigger parent reload
    - Display current PRC status (upcoming/overdue/completed), due date, and completion date if applicable
    - Display PRC goals with description, target date, status, and completion notes
    - Provide "Add Goal" button with inline form (description, target date)
    - Provide "Update Goal Status" action to cycle: not_started → in_progress → completed (with optional completion notes)
    - Provide "Mark PRC Complete" action — calls `TechnicianService.completePRC()` which computes next due date
    - Display "Upcoming PRC" indicator when due date is within 14 days
    - Display "Overdue PRC" warning when current date exceeds due date and PRC not completed
    - Display error state with retry on failure
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 15.8_

  - [ ]* 19.2 Write unit tests for PRCSectionComponent
    - Test PRC status display for upcoming, overdue, and completed states
    - Test goal list rendering and status updates
    - Test add goal form
    - Test mark complete action and next due date display
    - Test upcoming/overdue indicator display logic
    - _Requirements: 15.1, 15.5, 15.6, 15.7, 15.8_

- [x] 20. Implement OnboardingChecklistComponent and integrate with CredentialDetailComponent
  - [x] 20.1 Create `OnboardingChecklistComponent` with template, styles, and logic
    - Create file at `src/app/features/field-resource-management/components/onboarding/onboarding-checklist/onboarding-checklist.component.ts`
    - Use inline template and styles following existing project pattern
    - Inject `TechnicianService` and `ActivatedRoute`
    - Read `technicianId` from route params
    - Load the `RoleCredentialTemplate` for the technician's role via `TechnicianService.getRoleCredentialTemplate()`
    - Load the technician's on-file credentials, equipment, competencies, and PRC records
    - Call `computeChecklistDelta()` to compute the delta
    - Display all required items grouped by category (Credentials, Equipment, Competencies, PRC)
    - Mark each item visually as Complete (green check), Missing (red X), or Expired (amber warning)
    - Display summary: "X of Y items complete (Z%)" with counts of Complete, Missing, Expired
    - Display "Ready to Start" indicator when all items are Complete (isReadyToStart === true)
    - Display "Not Verified" label with add link for missing competencies
    - Provide navigation links to add missing items (credential form, equipment form, competency form)
    - Display error state with "Unable to load onboarding checklist. Please try again." and Retry button
    - _Requirements: 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 14.7_

  - [ ]* 20.2 Write property test: Checklist-based filtering returns correct technician subsets
    - **Property 11: Checklist-based filtering returns correct technician subsets**
    - **Validates: Requirements 12.9, 13.7, 15.10**
    - Generate arbitrary lists of technicians with computed checklist summaries
    - Assert "Incomplete Onboarding" filter returns exactly technicians where missingCount > 0 OR expiredCount > 0
    - Assert "Missing Equipment" filter returns exactly technicians missing required equipment
    - Assert "Overdue PRC" filter returns exactly technicians with overdue PRCs
    - Minimum 100 iterations

  - [x] 20.3 Update `CredentialDetailComponent` to render section components
    - Add `EquipmentSectionComponent`, `CompetencySectionComponent`, and `PRCSectionComponent` as child components
    - Load equipment, competencies, and PRC data alongside credentials on init
    - Pass data via `@Input()` bindings to each section component
    - Handle `equipmentChanged`, `competencyChanged`, and `prcChanged` events to reload data
    - Add "View Onboarding Checklist" button navigating to `credentials/:technicianId/checklist`
    - _Requirements: 13.3, 14.4, 15.5_

  - [x] 20.4 Update `CredentialsListComponent` with onboarding completion %, PRC indicators, and new filters
    - Compute and display `onboardingCompletionPercentage` for each technician using `computeChecklistDelta()`
    - Display "Upcoming PRC" indicator (within 14 days) and "Overdue PRC" warning per technician using `computePRCStatus()`
    - Add "Incomplete Onboarding" filter toggle to filter state
    - Add "Missing Equipment" filter toggle to filter state
    - Add "Overdue PRC" filter toggle to filter state
    - Add checklist icon/button per technician row navigating to `credentials/:technicianId/checklist`
    - _Requirements: 12.8, 12.9, 13.7, 15.6, 15.7, 15.10_

  - [ ]* 20.5 Write unit tests for OnboardingChecklistComponent
    - Test rendering all template items grouped by category
    - Test Complete/Missing/Expired visual states
    - Test "Ready to Start" indicator display
    - Test summary counts and percentage
    - Test navigation links for missing items
    - Test error state and retry
    - _Requirements: 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

- [x] 21. Wire Phase 2 routing, module declarations, and final integration
  - [x] 21.1 Add OnboardingChecklistComponent route to `OnboardingRoutingModule`
    - Add route `credentials/:technicianId/checklist` → `OnboardingChecklistComponent`
    - _Requirements: 12.2_

  - [x] 21.2 Update `OnboardingModule` declarations with all new Phase 2 components
    - Add `OnboardingChecklistComponent`, `EquipmentSectionComponent`, `CompetencySectionComponent`, and `PRCSectionComponent` to the declarations array
    - _Requirements: 8.6_

  - [ ]* 21.3 Write integration tests for Phase 2 flows
    - Test checklist flow: navigate to checklist → verify delta → add missing item → verify update
    - Test equipment flow: assign equipment → verify → mark returned → verify status
    - Test competency flow: add competency → verify display → verify checklist update
    - Test PRC flow: view PRC → add goal → mark complete → verify next due date
    - Test filter flow: apply "Incomplete Onboarding" → verify results → apply "Overdue PRC" → verify
    - _Requirements: 12.3, 12.9, 13.2, 13.4, 14.3, 15.4, 15.8, 15.10_

- [x] 22. Final checkpoint - Ensure all Phase 2 tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties using fast-check
- Unit tests validate specific examples and edge cases
- All components use inline templates/styles following existing project conventions
- The `computeCredentialStatus` utility accepts an optional `referenceDate` parameter for deterministic testing
- Phase 1 (tasks 1–10) covers Requirements 1–10: basic credential CRUD
- Phase 2 (tasks 11–22) covers Requirements 11–15: typed credentials, onboarding checklist, equipment, competencies, and PRC
- The credential type registry (task 13.3) enables administrators to add new credential types without code changes
- Section components (Equipment, Competency, PRC) use `@Input()`/`@Output()` pattern for parent-child communication
