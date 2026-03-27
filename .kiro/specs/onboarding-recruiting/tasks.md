# Implementation Plan: Onboarding/Recruiting Module

## Overview

Incrementally build the onboarding/recruiting feature module for the FRM Angular application. Tasks progress from data models and utilities, through the service layer, to UI components, and finally integration wiring. Each step builds on the previous and ends with everything connected.

## Tasks

- [x] 1. Create data models and offer status utility
  - [x] 1.1 Create onboarding data models
    - Create `src/app/features/field-resource-management/models/onboarding.models.ts`
    - Define `OfferStatus` type alias (`'pre_offer' | 'offer' | 'offer_acceptance'`)
    - Define `VestSize` type alias (`'XS' | 'S' | 'M' | 'L' | 'XL' | '2XL' | '3XL'`)
    - Define `Candidate` interface with all required and audit fields
    - Define `CreateCandidatePayload`, `UpdateCandidatePayload`, `CandidateFilters`, and `OnboardingServiceError` interfaces
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 1.2 Create offer status transition utility
    - Create `src/app/features/field-resource-management/utils/offer-status.util.ts`
    - Implement `OFFER_TRANSITIONS` map, `getValidTransitions()`, and `isValidTransition()` functions
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ]* 1.3 Write property tests for offer status transitions
    - **Property 15: Valid offer status transitions are accepted**
    - **Property 16: Invalid offer status transitions are rejected**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4**

  - [ ]* 1.4 Write property test for vest size validation
    - **Property 3: Vest size validation accepts only valid values**
    - **Validates: Requirements 2.4**

- [x] 2. Extend permission service with onboarding permission
  - [x] 2.1 Add `canManageOnboarding` permission key
    - Add `'canManageOnboarding'` to the `FrmPermissionKey` type union in `frm-permission.service.ts`
    - Add `canManageOnboarding: false` to `ALL_FALSE` permission set
    - Add `canManageOnboarding: true` to `HR_GROUP_PERMISSIONS`, `PAYROLL_GROUP_PERMISSIONS`, and `ADMIN_PERMISSIONS`
    - Add `canManageOnboarding: false` to all other permission group objects that spread `ALL_FALSE` (field, manager, readonly)
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 2.2 Write property tests for onboarding permission
    - **Property 1: Non-allowed roles are denied onboarding permission**
    - **Property 2: Allowed roles are granted onboarding permission**
    - **Validates: Requirements 9.2, 9.3, 9.4, 9.5**

- [x] 3. Checkpoint — Models and permissions
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement OnboardingService
  - [x] 4.1 Create the OnboardingService
    - Create `src/app/features/field-resource-management/services/onboarding.service.ts`
    - Inject `HttpClient` and `AuthService`
    - Implement `getCandidates(filters?: CandidateFilters)` — builds query params from filters, returns `Observable<Candidate[]>`
    - Implement `getCandidateById(id: string)` — returns `Observable<Candidate>`
    - Implement `createCandidate(payload: CreateCandidatePayload)` — attaches audit metadata, returns `Observable<Candidate>`
    - Implement `updateCandidate(id: string, payload: UpdateCandidatePayload)` — attaches audit metadata, returns `Observable<Candidate>`
    - Implement `deleteCandidateById(id: string)` — returns `Observable<void>`
    - Implement private `mapError(operation: string)` method that maps HTTP errors to `OnboardingServiceError`
    - Provide at root level (`providedIn: 'root'`)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ]* 4.2 Write property tests for OnboardingService error mapping
    - **Property 17: Service error mapping produces typed errors**
    - **Validates: Requirements 8.2**

  - [ ]* 4.3 Write property test for filter query params
    - **Property 18: Service passes filter parameters as query params**
    - **Validates: Requirements 8.5**

- [x] 5. Create UnsavedChangesGuard
  - [x] 5.1 Implement UnsavedChangesGuard
    - Create `src/app/features/field-resource-management/guards/unsaved-changes.guard.ts`
    - Implement `CanDeactivate` interface that checks if the component has unsaved changes
    - Show a browser confirmation dialog when the form is dirty
    - _Requirements: 10.5_

  - [ ]* 5.2 Write property test for unsaved changes guard
    - **Property 20: Unsaved changes guard triggers on dirty form**
    - **Validates: Requirements 10.5**

- [x] 6. Checkpoint — Service layer and guard
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Create OnboardingModule, routing, and nav component
  - [x] 7.1 Create OnboardingRoutingModule
    - Create `src/app/features/field-resource-management/components/onboarding/onboarding-routing.module.ts`
    - Define child routes: default redirect to `candidates`, `candidates` → `CandidateListComponent`, `candidates/new` → `CandidateFormComponent` with `UnsavedChangesGuard`, `candidates/:candidateId` → `CandidateFormComponent` with `UnsavedChangesGuard`, `pipeline` → `PipelineDashboardComponent`
    - Wrap all routes under `OnboardingNavComponent` as the parent layout
    - _Requirements: 1.3, 1.4_

  - [x] 7.2 Create OnboardingModule
    - Create `src/app/features/field-resource-management/components/onboarding/onboarding.module.ts`
    - Import `CommonModule`, `ReactiveFormsModule`, `OnboardingRoutingModule`, and shared UI modules
    - Declare `OnboardingNavComponent`, `CandidateListComponent`, `CandidateFormComponent`, `PipelineDashboardComponent`
    - _Requirements: 1.3_

  - [x] 7.3 Create OnboardingNavComponent
    - Create `src/app/features/field-resource-management/components/onboarding/onboarding-nav/onboarding-nav.component.ts` (with template and styles)
    - Render sub-navigation links: Candidate List (`candidates`), Pipeline Dashboard (`pipeline`), Add Candidate (`candidates/new`)
    - Include `<router-outlet>` for child route content
    - _Requirements: 1.4_

  - [x] 7.4 Register lazy-loaded route in FRM routing module
    - Add `onboarding` path to `field-resource-management-routing.module.ts` with `loadChildren` pointing to `OnboardingModule` and `canActivate: [HrGuard]`
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 8. Implement CandidateFormComponent
  - [x] 8.1 Create CandidateFormComponent with reactive form
    - Create `src/app/features/field-resource-management/components/onboarding/candidate-form/candidate-form.component.ts` (with template and styles)
    - Build reactive form with controls: `techName` (required), `techEmail` (required, email validator), `techPhone` (required, pattern validator for min 10 digits), `vestSize` (required, restricted to valid values), `workSite` (required), `startDate` (required), `offerStatus` (required)
    - In create mode: hide certification/drug test checkboxes, default `offerStatus` to `pre_offer`
    - In edit mode: load candidate via `OnboardingService.getCandidateById()`, pre-populate all fields, show certification/drug test checkboxes, filter `offerStatus` dropdown to valid transitions using `getValidTransitions()`
    - Display inline field-level validation errors on blur and on submit
    - On submit: disable button, show spinner, call create or update service method
    - On success: show success message, navigate to candidate list (create) or show confirmation (edit)
    - On API error: show dismissible error banner, preserve form data
    - Implement `CanDeactivate` interface for unsaved changes check
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 7.1, 7.2, 7.3, 7.4, 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ]* 8.2 Write property tests for form validation
    - **Property 4: Required field validation rejects incomplete forms**
    - **Property 5: Email validation rejects invalid formats**
    - **Property 6: Phone validation rejects strings with fewer than 10 digits**
    - **Validates: Requirements 3.1, 3.3, 3.4, 3.5, 4.4**

  - [ ]* 8.3 Write property tests for form behavior
    - **Property 7: New candidates default all certifications and drug test to false**
    - **Property 8: Edit form pre-populates with candidate data**
    - **Property 9: Update payloads include audit metadata**
    - **Property 19: Form data is preserved on submission failure**
    - **Validates: Requirements 3.2, 4.1, 4.2, 10.1, 10.2**

- [ ] 9. Checkpoint — Form component
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement CandidateListComponent
  - [x] 10.1 Create CandidateListComponent
    - Create `src/app/features/field-resource-management/components/onboarding/candidate-list/candidate-list.component.ts` (with template and styles)
    - Fetch candidates via `OnboardingService.getCandidates()` on init
    - Render table with columns: Tech Name, Tech Email, Tech Phone, Vest Size, Drug Test, OSHA, Scissor Lift, BIISCI, Work Site, Start Date, Offer Status
    - Display boolean fields as checkmark (✓) / dash (—) indicators
    - Implement column header click sorting (toggle asc/desc)
    - Implement text search filtering on `techName`, `techEmail`, `workSite` (case-insensitive)
    - Implement offer status dropdown filter
    - Accept query params for pre-filtering (used by pipeline dashboard navigation)
    - Show empty state message when no candidates match filters
    - Show error banner on API failure
    - Row click navigates to `candidates/:candidateId` for editing
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [ ]* 10.2 Write property tests for candidate list filtering and sorting
    - **Property 10: Text search filters candidates correctly**
    - **Property 11: Offer status filter returns only matching candidates**
    - **Property 12: Column sorting produces correctly ordered results**
    - **Validates: Requirements 5.3, 5.4, 5.5**

- [x] 11. Implement PipelineDashboardComponent
  - [x] 11.1 Create PipelineDashboardComponent
    - Create `src/app/features/field-resource-management/components/onboarding/pipeline-dashboard/pipeline-dashboard.component.ts` (with template and styles)
    - Fetch candidates via `OnboardingService.getCandidates()` on init
    - Compute and display summary cards: Pre Offer count, Offer count, Offer Acceptance count, Incomplete Certifications count, Incomplete Drug Test count, Starting Within 14 Days count
    - Make offer status cards clickable — navigate to candidate list filtered by that status
    - Make incomplete certifications card clickable — navigate to candidate list filtered by incomplete certs
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [ ]* 11.2 Write property tests for pipeline dashboard counts
    - **Property 13: Pipeline dashboard counts are correct**
    - **Property 14: Upcoming start date count is correct**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.6**

- [x] 12. Checkpoint — All components
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Wire navigation link into FRM layout
  - [x] 13.1 Add onboarding link to FRM navigation
    - Update the FRM navigation/sidebar component to include an "Onboarding" link pointing to `/field-resource-management/onboarding`
    - Conditionally show the link only when `FrmPermissionService.hasPermission(role, 'canManageOnboarding')` returns `true`
    - _Requirements: 1.1_

- [x] 14. Final checkpoint — Full integration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` and each maps to a correctness property from the design document
- Checkpoints ensure incremental validation at logical boundaries
- The module follows existing FRM patterns (payroll module structure, permission service, HrGuard)
