# Implementation Plan: Onboarding Technician Actions

## Overview

This plan covers the remaining work to complete the onboarding technician actions feature. The Technician model fields, OnboardingInfoModal, and basic module wiring are already in place. The remaining work focuses on enhancing the CredentialDetailComponent as the unified detail page, creating the OnboardingProgressHeader, adding row actions to the list page, implementing section navigation with deep-linking, wiring data reload on child changes, and adding property-based tests for the checklist delta computation.

## Tasks

- [x] 1. Create the OnboardingProgressHeader component
  - [x] 1.1 Create OnboardingProgressHeaderComponent with inputs for technician, checklistSummary, and prcIndicator
    - Create file `src/app/features/field-resource-management/components/onboarding/onboarding-progress-header/onboarding-progress-header.component.ts`
    - Implement `@Input() technician: Technician`, `@Input() checklistSummary: ChecklistSummary`, `@Input() prcIndicator: 'upcoming' | 'overdue' | null`
    - Render a progress bar showing `checklistSummary.completionPercentage`
    - Display counts for complete, missing, and expired items
    - Show "Ready to Start" badge when `checklistSummary.isReadyToStart === true`
    - Show PRC status indicator (upcoming/overdue) when `prcIndicator` is non-null
    - Use `OnPush` change detection strategy for performance
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 1.2 Register OnboardingProgressHeaderComponent in OnboardingModule
    - Add the component to `declarations` array in `onboarding.module.ts`
    - _Requirements: 4.1_

  - [x] 1.3 Handle missing Role Template scenario in progress header
    - When `checklistSummary` is null, hide the progress header entirely
    - Display informational message "No onboarding template configured for this role"
    - _Requirements: 4.6_

- [x] 2. Enhance CredentialDetailComponent as unified detail page with progress header and section navigation
  - [x] 2.1 Add Role Template loading and checklist delta computation to CredentialDetailComponent
    - Import `RoleCredentialTemplate` model and `computeChecklistDelta` utility
    - Add `checklistSummary: ChecklistSummary | null` and `roleTemplate: RoleCredentialTemplate | null` properties
    - After `loadAllData` completes, call `technicianService.getRoleCredentialTemplate(technician.role)` to fetch the template
    - Compute `checklistSummary` using `computeChecklistDelta(template, credentials, equipment, competencies, prc)`
    - Handle 404 from template fetch gracefully (set `roleTemplate = null`)
    - _Requirements: 3.3, 3.4, 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 2.2 Integrate OnboardingProgressHeader into CredentialDetailComponent template
    - Add `<app-onboarding-progress-header>` above the credentials grid
    - Pass `technician`, `checklistSummary`, and computed `prcIndicator` as inputs
    - Conditionally render the header only when `roleTemplate` is not null
    - Compute `prcIndicator` from PRC status field
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 2.3 Add section IDs and deep-linking via query params
    - Add `id="section-credentials"`, `id="section-equipment"`, `id="section-competencies"`, `id="section-prc"` attributes to section wrapper elements in the template
    - Read `section` query parameter from `ActivatedRoute` on init
    - Implement `scrollToSection(sectionId: string)` method that calls `element.scrollIntoView({ behavior: 'smooth', block: 'start' })` and `element.focus()`
    - Call `scrollToSection` after a short delay (e.g., `setTimeout(..., 500)`) when query param is present
    - Gracefully no-op if the section element is not found
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 2.4 Wire data reload when child section components emit changes
    - Ensure `reloadData()` re-fetches all data AND recomputes `checklistSummary`
    - Verify `(equipmentChanged)`, `(competencyChanged)`, and `(prcChanged)` event bindings trigger full reload
    - After reload, update the progress header inputs so it reflects the new state
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 2.5 Add back-navigation button and "Technician not found" error handling
    - Add a "Back to List" button that navigates to `../` (credentials list)
    - When `getTechnicianById` returns 404, display "Technician not found" message with back-to-list button
    - _Requirements: 9.1_

- [x] 3. Add row actions to CredentialsListComponent
  - [x] 3.1 Define RowActionConfig array and implement navigation methods
    - Add `RowActionConfig` interface and `rowActions` array to the component
    - Define four actions: "View Detail", "View Checklist", "Add Credential", "Assign Equipment"
    - Implement `navigateToDetail(technicianId)` → `router.navigate(['credentials', id], { relativeTo: route })`
    - Implement `navigateToChecklist(technicianId)` → `router.navigate(['credentials', id, 'checklist'], { relativeTo: route })`
    - Implement `navigateToAddCredential(technicianId)` → `router.navigate(['credentials', id, 'new'], { relativeTo: route })`
    - Implement `navigateToAssignEquipment(technicianId)` → `router.navigate(['credentials', id], { relativeTo: route, queryParams: { section: 'equipment' } })`
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.2 Implement conditional visibility for row actions
    - "View Detail" and "View Checklist" are always visible (`isVisible: () => true`)
    - "Add Credential" is hidden when `onboardingCompletionPercentage === 100`
    - "Assign Equipment" is hidden when `onboardingCompletionPercentage === 100`
    - Implement `getVisibleRowActions(summary: TechnicianCredentialSummary): RowActionConfig[]` method
    - _Requirements: 1.2, 10.1, 10.2, 10.3_

  - [x] 3.3 Render action buttons in the template with accessibility attributes
    - Add an "Actions" column to the technician table
    - Render visible action buttons using `*ngFor` over `getVisibleRowActions(summary)`
    - Add `[attr.aria-label]` binding using the action's `ariaLabel(technician)` function
    - Add `(click)` handler that calls `action.execute(technician.id)` with `$event.stopPropagation()`
    - Preserve defined ordering of actions regardless of visibility
    - _Requirements: 1.1, 1.3, 1.4, 2.5_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Improve error handling in CredentialDetailComponent
  - [x] 5.1 Add credential deletion error recovery with retry
    - Preserve credential in list when DELETE fails
    - Display error banner with retry button
    - Store `lastDeletedCredentialId` for retry (already partially implemented)
    - _Requirements: 9.2_

  - [x] 5.2 Add data reload failure handling that preserves previous state
    - When `reloadData()` fails after a child change event, display error message
    - Preserve previously loaded data arrays (do not clear them on reload failure)
    - _Requirements: 9.3_

- [ ] 6. Property-based tests for checklist delta computation (new properties)
  - [ ]* 6.1 Write property test: Checklist delta partition invariant (Property 3)
    - **Property 3: Checklist delta partition invariant**
    - For any valid RoleCredentialTemplate and any combination of on-file data, verify `completeCount + missingCount + expiredCount === totalCount` AND `totalCount === template.requiredItems.length`
    - Use fast-check arbitraries for template and credential generation
    - Add to `src/app/features/field-resource-management/utils/checklist-delta.util.spec.ts`
    - **Validates: Requirements 5.1, 5.2**

  - [ ]* 6.2 Write property test: Completion percentage bounds (Property 4)
    - **Property 4: Completion percentage bounds**
    - For any valid inputs, verify `0 <= completionPercentage <= 100`
    - Generate random templates with 0–15 required items and random on-file data
    - **Validates: Requirement 5.3**

  - [ ]* 6.3 Write property test: Expired credential classification (Property 5)
    - **Property 5: Expired credential classification**
    - For any credential that is on-file but whose expiration date is before the reference date, verify the item is classified as "expired" rather than "complete"
    - Generate expirable credential types with past expiration dates
    - **Validates: Requirement 5.5**

  - [ ]* 6.4 Write property test: Completion percentage monotonicity on valid additions (Property 7)
    - **Property 7: Completion percentage monotonicity on valid additions**
    - For any onboarding state, adding a valid credential/equipment/competency that satisfies a required item SHALL not decrease the completion percentage
    - Generate a template, compute baseline percentage, add a matching item, verify percentage >= baseline
    - **Validates: Requirement 8.3**

- [x] 7. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- The Technician model fields, OnboardingInfoModal, and module imports are already implemented
- The existing `checklist-delta.util.spec.ts` already covers several properties (partition, totalCount, percentage formula, isReadyToStart, missing-when-empty, expired credentials, equipment status, PRC presence); tasks 6.1–6.4 add the remaining design properties not yet covered
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- The project uses Karma/Jasmine as the test runner with fast-check for property-based tests
