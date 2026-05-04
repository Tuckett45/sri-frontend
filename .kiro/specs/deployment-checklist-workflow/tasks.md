# Implementation Plan: Deployment Checklist Workflow

## Overview

This plan implements the Deployment Checklist Workflow for the FRM module, adding a four-phase checklist (Job Details, Pre-Installation, End of Day Reports, Close-Out) as a tab within the existing `JobDetailComponent`. The implementation follows the project's established patterns: NgRx state slices, Angular Reactive Forms with Angular Material, `FrmPermissionService` for RBAC, `FrmSignalRService` for real-time updates, and session-storage draft persistence. Tasks are ordered to build incrementally — data models and permissions first, then state management, then UI components, then integration and cross-cutting concerns.

## Tasks

- [x] 1. Define data models and constants
  - [x] 1.1 Create the deployment checklist model file
    - Create `src/app/features/field-resource-management/models/deployment-checklist.model.ts`
    - Define enums: `ChecklistStatus`, `PhaseStatus`
    - Define types: `ChecklistPhase`, `ChecklistItemResponse`
    - Define interfaces: `ChecklistContact`, `JobDetailsPhaseData`, `ChecklistItem`, `PreInstallationPhaseData`, `DailyProgress`, `EodEntry`, `HandoffParticipant`, `CloseOutPhaseData`, `DeploymentChecklist`
    - Define constants: `PRE_INSTALLATION_ITEMS`, `REQUIRED_PICTURES_ITEMS`, `FINAL_INSPECTION_ITEMS`
    - Export all types from `src/app/features/field-resource-management/models/index.ts`
    - _Requirements: 2.1, 2.2, 4.1–4.13, 5.1, 6.1–6.11, 7.1–7.6_

  - [ ]* 1.2 Write property tests for checklist status computation
    - **Property 4: Checklist status computation** — verify `computeChecklistStatus` returns `NotStarted` when all phases are `NotStarted`, `Completed` when all are `Completed`, and `InProgress` otherwise, across randomized phase status combinations
    - **Validates: Requirements 2.3, 2.4, 2.5**

  - [ ]* 1.3 Write property tests for phase status computation
    - **Property 10: Job Details phase status computation** — verify `computePhaseStatus('jobDetails', data)` returns correct status based on technicalLead.name, sriJobNumbers, and jobStartDate across randomized `JobDetailsPhaseData`
    - **Property 11: Pre-Installation phase status computation** — verify `computePhaseStatus('preInstallation', data)` returns correct status based on item responses and `markedComplete` flag across randomized `PreInstallationPhaseData`
    - **Property 14: EOD Report phase status computation** — verify EOD phase status is `NotStarted` when empty, `Completed` when Close-Out is `Completed`, and `InProgress` otherwise
    - **Property 15: Close-Out phase status computation** — verify `computePhaseStatus('closeOut', data)` returns correct status based on siteAcceptance fields and finalInspectionItems across randomized `CloseOutPhaseData`
    - **Validates: Requirements 4.16, 5.5, 5.6, 5.7, 6.14, 6.15, 6.16, 7.9, 7.10, 7.11**

- [x] 2. Extend FrmPermissionService with checklist permissions
  - [x] 2.1 Add deployment checklist permission keys and role mappings
    - Modify `src/app/features/field-resource-management/services/frm-permission.service.ts`
    - Add `canViewDeploymentChecklist`, `canEditDeploymentChecklist`, `canSubmitEODReport` to `FrmPermissionKey` type
    - Add role-permission mappings per the design: Admin/PM/DCOps/OSPCoordinator/EngineeringFieldSupport/Manager/DeploymentEngineer get all three; Technician/SRITech/CM get view + EOD only; HR/Payroll/ReadOnly get none
    - Update `src/app/features/field-resource-management/services/frm-permission.service.spec.ts` with unit tests for each role's checklist permissions
    - _Requirements: 1.1–1.9_

  - [ ]* 2.2 Write property tests for permission controls
    - **Property 1: Permission controls tab visibility** — for any user role, verify `canViewDeploymentChecklist` is granted if and only if the role is in the authorized set
    - **Property 2: Permission controls field editability** — for any user role, verify `canEditDeploymentChecklist` is granted if and only if the role is in the editor set
    - **Validates: Requirements 1.10, 1.11, 10.2**

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Create NgRx state slice for deployment checklist
  - [x] 4.1 Create checklist state, actions, and reducer
    - Create `src/app/features/field-resource-management/state/deployment-checklist/checklist.state.ts` with `ChecklistState` interface and `initialChecklistState`
    - Create `src/app/features/field-resource-management/state/deployment-checklist/checklist.actions.ts` with actions: `loadChecklist`, `loadChecklistSuccess`, `loadChecklistFailure`, `savePhase`, `savePhaseSuccess`, `savePhaseFailure`, `addEodEntry`, `addEodEntrySuccess`, `addEodEntryFailure`, `autoCreateChecklist`, `autoCreateChecklistSuccess`, `autoCreateChecklistFailure`, `checklistUpdatedRemotely`
    - Create `src/app/features/field-resource-management/state/deployment-checklist/checklist.reducer.ts` implementing state transitions for all actions
    - _Requirements: 8.5_

  - [x] 4.2 Create checklist selectors with computed status
    - Create `src/app/features/field-resource-management/state/deployment-checklist/checklist.selectors.ts`
    - Implement `selectChecklist`, `selectChecklistLoading`, `selectChecklistSaving`, `selectChecklistError`
    - Implement computed status selectors: `selectChecklistStatus`, `selectJobDetailsPhaseStatus`, `selectPreInstallationPhaseStatus`, `selectEodReportPhaseStatus`, `selectCloseOutPhaseStatus`
    - Implement phase data selectors: `selectJobDetailsPhase`, `selectPreInstallationPhase`, `selectEodEntries`, `selectCloseOutPhase`
    - Register the state slice in `src/app/features/field-resource-management/state/index.ts`
    - _Requirements: 2.3, 2.4, 2.5, 4.16, 5.5, 5.6, 5.7, 6.14, 6.15, 6.16, 7.9, 7.10, 7.11_

  - [ ]* 4.3 Write unit tests for reducer and selectors
    - Create `src/app/features/field-resource-management/state/deployment-checklist/checklist.reducer.spec.ts` testing state transitions for all actions
    - Create `src/app/features/field-resource-management/state/deployment-checklist/checklist.selectors.spec.ts` testing computed status selectors with specific state shapes
    - _Requirements: 2.3, 2.4, 2.5, 8.5_

- [x] 5. Create DeploymentChecklistService
  - [x] 5.1 Implement the checklist service with API methods and draft persistence
    - Create `src/app/features/field-resource-management/services/deployment-checklist.service.ts`
    - Implement API methods: `getChecklist`, `createChecklist`, `saveJobDetailsPhase`, `savePreInstallationPhase`, `saveEodEntry`, `updateEodEntry`, `saveCloseOutPhase`, `exportPdf`
    - Implement draft persistence methods: `saveDraft` (debounced 3s to sessionStorage), `restoreDraft`, `clearDraft`, `clearAllDrafts` using key format `frm_checklist_draft_{jobId}_{phase}`
    - Implement status computation helpers: `computePhaseStatus`, `computeChecklistStatus`
    - Wrap sessionStorage operations in try/catch for quota/disabled storage handling
    - Discard drafts older than 24 hours on restore
    - _Requirements: 8.1, 8.6, 8.7, 8.8, 13.1, 13.3_

  - [ ]* 5.2 Write unit tests for DeploymentChecklistService
    - Create `src/app/features/field-resource-management/services/deployment-checklist.service.spec.ts`
    - Test API method calls with correct endpoints and HTTP methods
    - Test draft save/restore/clear operations with sessionStorage
    - Test `computePhaseStatus` and `computeChecklistStatus` with specific inputs
    - _Requirements: 8.1, 8.6, 13.1, 13.2, 13.3_

  - [ ]* 5.3 Write property tests for draft persistence and validation
    - **Property 18: Draft persistence round trip** — for any phase form value, verify `saveDraft` followed by `restoreDraft` returns a deeply equal value
    - **Property 8: Phone number format validation** — for any string input, verify `CustomValidators.phoneNumber()` returns valid only for exactly 10-digit inputs
    - **Property 9: Email format validation** — for any string input, verify `Validators.email` returns valid only for valid email format inputs
    - **Property 12: Percentage field validation (0–100 integer)** — for any numeric input, verify validation passes only for integers 0–100
    - **Validates: Requirements 4.14, 4.15, 6.7, 7.7, 7.8, 9.2, 9.6, 9.7, 13.1, 13.2**

- [x] 6. Create NgRx effects for checklist operations
  - [x] 6.1 Implement checklist effects
    - Create `src/app/features/field-resource-management/state/deployment-checklist/checklist.effects.ts`
    - Implement `loadChecklist$` effect: dispatches API call via `DeploymentChecklistService.getChecklist`, handles success/failure
    - Implement `savePhase$` effect: calls appropriate service save method, on success dispatches `savePhaseSuccess`, clears draft, broadcasts SignalR update
    - Implement `addEodEntry$` effect: calls `saveEodEntry`, dispatches success/failure, broadcasts SignalR
    - Implement `autoCreateChecklist$` effect: listens for job OnSite transition, calls `createChecklist`
    - Implement `checklistUpdatedRemotely$` effect: updates state from SignalR events
    - Attach `lastModifiedBy` (from `AuthService`) and `lastModifiedAt` (UTC timestamp) on save operations
    - _Requirements: 8.1, 8.5, 8.7, 8.8, 11.1_

  - [ ]* 6.2 Write unit tests for checklist effects
    - Create `src/app/features/field-resource-management/state/deployment-checklist/checklist.effects.spec.ts`
    - Test `loadChecklist$` triggers API call and dispatches success/failure
    - Test `savePhase$` clears draft and broadcasts SignalR on success
    - Test `autoCreateChecklist$` triggers on job OnSite transition
    - _Requirements: 2.1, 8.1, 8.5, 8.7, 8.8, 11.1_

  - [ ]* 6.3 Write property test for save operation metadata
    - **Property 16: Save operation records lastModifiedBy** — for any authenticated user identity, verify save operations set `lastModifiedBy` to that identity
    - **Validates: Requirements 8.7**

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement DeploymentChecklistComponent (container)
  - [x] 8.1 Create the container component with tab layout and status badges
    - Create `src/app/features/field-resource-management/components/jobs/deployment-checklist/deployment-checklist.component.ts`
    - Create `src/app/features/field-resource-management/components/jobs/deployment-checklist/deployment-checklist.component.html`
    - Create `src/app/features/field-resource-management/components/jobs/deployment-checklist/deployment-checklist.component.scss`
    - Accept `@Input() jobId` and `@Input() job` from `JobDetailComponent`
    - Dispatch `loadChecklist` on init, subscribe to SignalR updates for the job
    - Render 4-phase tab layout using `<mat-tab-group>` with `Phase_Status` badges on each tab
    - Display `Checklist_Status` badge
    - Show loading spinner while data loads, error message with retry on failure
    - Pass `canEdit` and `canSubmitEOD` permission flags to child phase components
    - Implement unsaved-changes confirmation dialog on tab switch when form is dirty
    - Provide Print and Export PDF action buttons in the toolbar
    - Clean up SignalR subscription on destroy
    - _Requirements: 2.6, 2.7, 3.1, 3.2, 3.3, 3.4, 3.5, 8.2, 8.3, 8.4, 10.1, 12.1, 12.3_

  - [ ]* 8.2 Write unit tests for DeploymentChecklistComponent
    - Test tab rendering with 4 phase tabs and status badges
    - Test loading/error/empty states
    - Test unsaved-changes dialog triggers on dirty form tab switch
    - Test Print and Export PDF button visibility
    - _Requirements: 2.6, 2.7, 3.1, 3.2, 3.5_

  - [ ]* 8.3 Write property tests for tab navigation
    - **Property 5: Tab navigation preserves form data** — for any form data entered in a phase, verify navigating away and back preserves all field values
    - **Property 6: Unsaved changes triggers confirmation dialog** — for any phase with dirty form, verify tab switch triggers confirmation dialog
    - **Validates: Requirements 3.3, 3.4, 3.5**

- [x] 9. Implement JobDetailsPhaseComponent
  - [x] 9.1 Create the Job Details phase form
    - Create `src/app/features/field-resource-management/components/jobs/deployment-checklist/phases/job-details-phase.component.ts`
    - Create corresponding `.html` and `.scss` files
    - Build reactive form with dynamic `FormArray` fields for SRI Job Numbers, Customer Job Numbers, Change Tickets, Site Access Tickets (add/remove buttons)
    - Add date fields for Job Start Date and Job Complete Date
    - Pre-populate site info (Site Name, Suite Number, Street, City/State, Zip Code) from `Job.siteAddress` on load
    - Add date/time field for Proposed Validation Date/Time
    - Add contact sections (name, phone, email) for: Technical Lead, Technician 1, Technician 2, SRI Project Lead, Primary Customer Contact, Secondary Customer Contact
    - Apply `CustomValidators.phoneNumber()` to all phone fields and `Validators.email` to all email fields
    - Add Statement of Work textarea with `maxLength(5000)`
    - Emit save event via `@Output()` on Save button click; mark all fields touched to trigger validation display
    - Integrate draft auto-save: call `DeploymentChecklistService.saveDraft` on form value changes (debounced), restore draft on init with notification banner
    - Render all fields as read-only when `canEdit` is false
    - _Requirements: 4.1–4.16, 9.1–9.7, 13.1, 13.2_

  - [ ]* 9.2 Write unit tests for JobDetailsPhaseComponent
    - Test site info pre-population from Job.siteAddress
    - Test dynamic array add/remove for SRI Job Numbers
    - Test phone and email validation error display
    - Test read-only mode when canEdit is false
    - Test draft restore notification banner
    - _Requirements: 4.6, 4.14, 4.15, 9.1, 9.4, 9.5, 9.6, 9.7_

  - [ ]* 9.3 Write property test for site info pre-population
    - **Property 7: Site info pre-population from Job** — for any Job with non-empty siteAddress, verify loading Job Details pre-populates Site Name, Street, City/State, Zip Code matching the Job's data
    - **Validates: Requirements 4.6**

- [x] 10. Implement PreInstallationPhaseComponent
  - [x] 10.1 Create the Pre-Installation phase form
    - Create `src/app/features/field-resource-management/components/jobs/deployment-checklist/phases/pre-installation-phase.component.ts`
    - Create corresponding `.html` and `.scss` files
    - Render 11 fixed checklist items from `PRE_INSTALLATION_ITEMS` constant, each with Yes/No/N/A radio group
    - Display `Playbook_Reference` badge next to items that have one
    - Show warning indicator (icon + highlight) when "No" is selected for an item
    - Add optional notes textarea per item with `maxLength(1000)`
    - Add "Mark Phase Complete" toggle for explicit completion
    - Emit save event via `@Output()`; integrate draft auto-save
    - Render all fields as read-only when `canEdit` is false
    - _Requirements: 5.1–5.7, 9.3, 13.1, 13.2_

  - [ ]* 10.2 Write unit tests for PreInstallationPhaseComponent
    - Test all 11 items render with correct labels and playbook references
    - Test "No" selection shows warning indicator
    - Test notes field maxLength enforcement
    - Test read-only mode
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 11. Implement EodReportPhaseComponent and EodEntryFormComponent
  - [x] 11.1 Create the EOD Report phase component
    - Create `src/app/features/field-resource-management/components/jobs/deployment-checklist/phases/eod-report-phase.component.ts`
    - Create corresponding `.html` and `.scss` files
    - Display existing EOD entries in reverse chronological order (most recent first)
    - Show "Add EOD Report" button, visible only when user has `canSubmitEODReport` permission
    - Show empty state message when no entries exist
    - _Requirements: 6.1, 6.12, 6.13, 6.14, 6.15, 6.16_

  - [x] 11.2 Create the EOD Entry form component
    - Create `src/app/features/field-resource-management/components/jobs/deployment-checklist/phases/eod-entry-form.component.ts`
    - Create corresponding `.html` and `.scss` files
    - Pre-populate Date field with current date on new entry creation
    - Add required fields: Personnel On-site, Technical Lead Name, Technician Names, Time In, Time Out
    - Add Customer Notification fields: Contact Name, Method of Notification
    - Add 6 percentage-complete fields (0–100 integer) for Daily Progress categories with `Validators.min(0)`, `Validators.max(100)`, integer pattern validation
    - Add Yes/No toggles for "Daily Pictures Provided?" and "EDP Redline Required?"
    - Add 3 narrative textareas (maxLength 3000 each): Work Completed Today, Issues/Roadblocks, Plan for Tomorrow
    - Emit save event via `@Output()` dispatching `addEodEntry` action
    - _Requirements: 6.2–6.11, 9.1–9.4_

  - [ ]* 11.3 Write unit tests for EOD components
    - Test reverse chronological display order of entries
    - Test "Add EOD Report" button visibility based on permission
    - Test date pre-population on new entry
    - Test percentage field range validation (0–100)
    - Test required field validation on save attempt
    - _Requirements: 6.2, 6.7, 6.12, 6.13_

  - [ ]* 11.4 Write property test for EOD entry ordering
    - **Property 13: EOD entries display in reverse chronological order** — for any list of EOD entries with distinct dates, verify the displayed order has the most recent date first
    - **Validates: Requirements 6.12, 6.13**

- [x] 12. Implement CloseOutPhaseComponent
  - [x] 12.1 Create the Close-Out phase form
    - Create `src/app/features/field-resource-management/components/jobs/deployment-checklist/phases/close-out-phase.component.ts`
    - Create corresponding `.html` and `.scss` files
    - Add Equipment Hand-off section with Company/Date/Name fields for SRI Lead and Customer Lead
    - Add Other Participants text field
    - Add Required Pictures section with checklist items (Yes/No/N/A) organized by category (General, Rack/Cabinet View, Equipment & Patch Panel Detail) from `REQUIRED_PICTURES_ITEMS` constant
    - Add optional notes field per picture item with `maxLength(1000)`
    - Add Documentation and Final Inspection section with checklist items from `FINAL_INSPECTION_ITEMS` constant
    - Add Site Acceptance section with Customer Name, Customer Email (with `Validators.email`), Customer Phone (with `CustomValidators.phoneNumber()`), Date/Time Site Accepted
    - Emit save event via `@Output()`; integrate draft auto-save
    - Render all fields as read-only when `canEdit` is false
    - _Requirements: 7.1–7.11, 9.1–9.7, 13.1, 13.2_

  - [ ]* 12.2 Write unit tests for CloseOutPhaseComponent
    - Test required pictures items render by category
    - Test final inspection items render
    - Test site acceptance email and phone validation
    - Test read-only mode
    - _Requirements: 7.1, 7.3, 7.5, 7.7, 7.8_

- [x] 13. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Integrate checklist tab into JobDetailComponent and route support
  - [x] 14.1 Add Deployment Checklist tab to job detail view
    - Modify `src/app/features/field-resource-management/components/jobs/job-detail/job-detail.component.html` to add a new `<mat-tab>` with `*appFrmHasPermission="'canViewDeploymentChecklist'"` directive
    - Add `<app-status-badge>` in the tab label showing `checklistStatus$`
    - Render `<app-deployment-checklist [jobId]="job.id" [job]="job">` inside the tab content
    - Modify `src/app/features/field-resource-management/components/jobs/job-detail/job-detail.component.ts` to select `checklistStatus$` from the store
    - Support deep-link query params `tab=deployment-checklist&phase={phaseName}` to activate the checklist tab and select the specified phase
    - _Requirements: 2.6, 2.7, 10.1, 10.2, 10.3, 10.4_

  - [x] 14.2 Register checklist components in the jobs module
    - Modify `src/app/features/field-resource-management/components/jobs/jobs.module.ts` to declare all new checklist components
    - Register the `deployment-checklist` NgRx state slice in the FRM module using `StoreModule.forFeature`
    - Register `ChecklistEffects` in `EffectsModule.forFeature`
    - _Requirements: 10.1, 10.4_

  - [ ]* 14.3 Write unit tests for route integration
    - Test that deep-link query params activate correct tab and phase
    - Test that the Deployment Checklist tab is hidden for users without `canViewDeploymentChecklist`
    - _Requirements: 1.10, 10.2, 10.3_

- [x] 15. Integrate SignalR real-time updates
  - [x] 15.1 Extend FrmSignalRService for checklist events
    - Modify `src/app/features/field-resource-management/services/frm-signalr.service.ts` to add `ChecklistUpdated` event handler in `setupEventHandlers()`
    - On receiving `ChecklistUpdated`, dispatch `checklistUpdatedRemotely` action to the store
    - Add connection status indicator support: emit connection state changes so `DeploymentChecklistComponent` can display a warning banner on disconnect
    - On reconnection, dispatch `loadChecklist` to resynchronize state from the API
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [ ]* 15.2 Write unit tests for SignalR checklist integration
    - Test `ChecklistUpdated` event dispatches `checklistUpdatedRemotely` action
    - Test reconnection triggers checklist reload
    - _Requirements: 11.1, 11.4_

- [x] 16. Implement auto-create checklist on Job OnSite transition
  - [x] 16.1 Wire auto-creation logic into job state effects
    - Modify the existing job effects or add a new effect in `src/app/features/field-resource-management/state/deployment-checklist/checklist.effects.ts` to listen for job status changes to `OnSite`
    - When a job transitions to `OnSite`, dispatch `autoCreateChecklist` if no checklist exists for that job
    - Handle success (store the new checklist) and failure (log error, do not block job transition)
    - _Requirements: 2.1, 2.2_

  - [ ]* 16.2 Write unit tests for auto-creation
    - Test that `autoCreateChecklist` is dispatched when job transitions to OnSite
    - Test that auto-creation is skipped if checklist already exists
    - _Requirements: 2.1, 2.2_

  - [ ]* 16.3 Write property test for checklist-job association
    - **Property 3: Checklist-Job association invariant** — for any valid Job ID, verify creating or loading a checklist always produces a checklist whose `jobId` equals the originating Job's ID
    - **Validates: Requirements 2.2**

- [x] 17. Implement ChecklistPrintComponent and PDF export
  - [x] 17.1 Create the print/export component
    - Create `src/app/features/field-resource-management/components/jobs/deployment-checklist/checklist-print.component.ts`
    - Create corresponding `.html` and `.scss` files with print-friendly layout
    - Render all four phases with current data, response statuses, and notes
    - Include Job identifier, checklist status, and generation timestamp
    - Implement Print action using `window.print()` with a dedicated print stylesheet
    - Implement Export PDF action using `jspdf` + `html2canvas` or browser print-to-PDF
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [ ]* 17.2 Write unit tests for ChecklistPrintComponent
    - Test that all four phases render in print layout
    - Test that Job identifier and generation timestamp are displayed
    - _Requirements: 12.1, 12.2, 12.4_

- [x] 18. Implement form validation UX
  - [x] 18.1 Wire validation display across all phase components
    - Ensure all phase components mark fields as touched on Save to trigger `<mat-error>` display
    - Ensure `maxlength` attribute prevents exceeding character limits at the browser level
    - Ensure invalid fields show red border via Angular Material's built-in error styling
    - Ensure error messages clear immediately when field value becomes valid
    - Add "This field is required" messages for required fields
    - Add format error messages for phone and email fields
    - Add range error messages for percentage fields
    - _Requirements: 9.1–9.7_

  - [ ]* 18.2 Write property test for error state clearing
    - **Property 17: Error state clears on valid input** — for any form field in an invalid state, verify changing to a valid value immediately clears the error state
    - **Validates: Requirements 9.5**

- [x] 19. Implement draft auto-save and restore across phases
  - [x] 19.1 Wire draft persistence into all phase components
    - Ensure each phase component subscribes to form `valueChanges` and calls `DeploymentChecklistService.saveDraft` with 3-second debounce
    - On phase init, call `restoreDraft` and if draft data exists, populate the form and show a notification: "Unsaved changes have been restored"
    - On successful backend save, call `clearDraft` for the phase
    - Add "Discard" button that calls `clearDraft` and reloads last saved state from the store
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

  - [ ]* 19.2 Write unit tests for draft auto-save
    - Test that form changes trigger draft save to sessionStorage
    - Test that draft restore populates form and shows notification
    - Test that successful save clears draft
    - Test that Discard button clears draft and reloads saved state
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

- [x] 20. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key integration points
- Property tests validate universal correctness properties from the design document using `fast-check`
- Unit tests validate specific examples, edge cases, and integration points
- All components follow existing project patterns: Angular Material, Reactive Forms, NgRx, and the FRM module's established file structure
