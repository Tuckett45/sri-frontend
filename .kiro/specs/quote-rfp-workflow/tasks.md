# Implementation Plan: Quote/RFP Workflow

## Overview

This plan implements the Quote/RFP Workflow for the FRM module, covering the full pipeline from RFP intake through labor estimation, BOM creation, internal BOM validation, quote assembly, delivery, and quote-to-job conversion. The workflow becomes the primary path for creating Jobs in the FRM module. It also introduces a Quote Pipeline Dashboard with real-time visibility via SignalR, per-client configuration for quote presentation, and Job Readiness/Customer Ready status fields. Tasks are ordered to build incrementally — data models and permissions first, then state management, then services, then UI components, then integration and cross-cutting concerns.

## Tasks

- [x] 1. Define data models, enums, and interfaces
  - [x] 1.1 Create the quote workflow model file
    - Create `src/app/features/field-resource-management/models/quote-workflow.model.ts`
    - Define enums: `WorkflowStatus`, `ValidationStep`
    - Define types: `QuoteStep`
    - Define interfaces: `RfpRecord`, `LaborLineItem`, `JobSummaryData`, `BomLineItem`, `BomTotals`, `BomData`, `ValidationStepEntry`, `ValidationRequest`, `PriceSummary`, `QuoteDocument`, `DeliveryRecord`, `ConvertToJobData`, `ClientConfiguration`, `StatusTransition`, `QuoteWorkflow`, `QuoteFilters`, `QuoteEmailData`
    - Define constant: `PIPELINE_CATEGORIES` mapping pipeline category names to `WorkflowStatus[]`
    - Export all types from `src/app/features/field-resource-management/models/index.ts`
    - _Requirements: 8.1, 4.1–4.10, 3.1–3.5, 5.1–5.4, 6.1–6.9, 10.2–10.10, 11.1_

  - [ ]* 1.2 Write property tests for workflow status transition validity
    - **Property 10: Workflow status transition validity** — verify that `WorkflowStatus` only transitions through the valid sequence: Draft → Job_Summary_In_Progress → BOM_In_Progress → Pending_Validation → Validation_Approved or Validation_Rejected → (if rejected, back to BOM_In_Progress) → Quote_Assembled → Quote_Delivered → Quote_Converted
    - **Validates: Requirements 8.1**

  - [ ]* 1.3 Write property tests for pipeline dashboard category completeness
    - **Property 11: Pipeline dashboard category completeness** — verify that every `WorkflowStatus` value appears in exactly one pipeline category in `PIPELINE_CATEGORIES`, no status is uncategorized, and no status appears in multiple categories
    - **Validates: Requirements 8.5, 8.6, 8.7, 8.8, 8.9, 8.10**

- [x] 2. Extend FrmPermissionService with quote permissions
  - [x] 2.1 Add quote permission keys and role mappings
    - Modify `src/app/features/field-resource-management/services/frm-permission.service.ts`
    - Add `canCreateQuote`, `canEditQuote`, `canValidateBOM`, `canViewQuote` to `FrmPermissionKey` type
    - Add role-permission mappings per the design: Admin gets all four; PM/DCOps/OSPCoordinator/EngineeringFieldSupport/Manager get canCreateQuote, canEditQuote, canViewQuote; MaterialsManager gets canEditQuote, canValidateBOM, canViewQuote; Field_Group/HR_Group/Payroll_Group/ReadOnly_Group get none
    - Update `src/app/features/field-resource-management/services/frm-permission.service.spec.ts` with unit tests for each role's quote permissions
    - _Requirements: 1.1–1.11_

  - [ ]* 2.2 Write property tests for permission controls
    - **Property 1: Permission controls quote visibility** — for any user role, verify the "New Quote" action button is visible if and only if `FrmPermissionService.hasPermission(role, 'canCreateQuote')` returns true
    - **Property 2: Permission controls quote editability** — for any user role viewing a Quote_Workflow, verify all quote form fields are editable if and only if `FrmPermissionService.hasPermission(role, 'canEditQuote')` returns true
    - **Property 3: Permission controls BOM validation access** — for any user role viewing the BOM Validation step, verify the "Approve" and "Reject" buttons are visible if and only if `FrmPermissionService.hasPermission(role, 'canValidateBOM')` returns true
    - **Validates: Requirements 1.12, 1.14, 1.3, 5.6**

- [x] 3. Create route guards for quote routes
  - [x] 3.1 Implement QuoteViewGuard and QuoteCreateGuard
    - Create `src/app/features/field-resource-management/guards/quote-view.guard.ts` following the `CreateJobGuard` pattern; check `canViewQuote` permission, redirect to `/field-resource-management/dashboard` on denial
    - Create `src/app/features/field-resource-management/guards/quote-create.guard.ts`; check `canCreateQuote` permission, redirect to `/field-resource-management/dashboard` on denial
    - Write unit tests for both guards with various permission states
    - _Requirements: 1.13, 12.4, 12.5_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Create NgRx state slice for quotes
  - [x] 5.1 Create quote state, actions, and reducer
    - Create `src/app/features/field-resource-management/state/quotes/quote.state.ts` with `QuoteState` interface and `initialQuoteState`
    - Create `src/app/features/field-resource-management/state/quotes/quote.actions.ts` with all actions: `loadQuotes`, `loadQuotesSuccess`, `loadQuotesFailure`, `loadQuote`, `loadQuoteSuccess`, `loadQuoteFailure`, `createQuote`, `createQuoteSuccess`, `createQuoteFailure`, `saveJobSummary`, `saveJobSummarySuccess`, `completeJobSummary`, `completeJobSummarySuccess`, `saveBom`, `saveBomSuccess`, `completeBom`, `completeBomSuccess`, `initiateValidation`, `initiateValidationSuccess`, `approveBom`, `approveBomSuccess`, `rejectBom`, `rejectBomSuccess`, `finalizeQuote`, `finalizeQuoteSuccess`, `deliverQuote`, `deliverQuoteSuccess`, `convertToJob`, `convertToJobSuccess`, `convertToJobFailure`, `quoteUpdatedRemotely`, `quoteOperationFailure`
    - Create `src/app/features/field-resource-management/state/quotes/quote.reducer.ts` implementing state transitions for all actions
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 5.2 Create quote selectors with pipeline dashboard computed selectors
    - Create `src/app/features/field-resource-management/state/quotes/quote.selectors.ts`
    - Implement entity selectors: `selectQuoteState`, `selectAllQuotes`, `selectSelectedQuote`, `selectQuoteLoading`, `selectQuoteSaving`, `selectQuoteError`
    - Implement pipeline dashboard selectors: `selectRfpsReceived`, `selectBomsNotReady`, `selectBomsReady`, `selectQuotesReadyForCustomer`, `selectQuotesDelivered`, `selectQuotesConverted`
    - Implement status selectors: `selectWorkflowStatus`, `selectStatusHistory`
    - Register the state slice in `src/app/features/field-resource-management/state/index.ts`
    - _Requirements: 8.1, 8.5–8.10_

  - [ ]* 5.3 Write unit tests for reducer and selectors
    - Create `src/app/features/field-resource-management/state/quotes/quote.reducer.spec.ts` testing state transitions for all actions
    - Create `src/app/features/field-resource-management/state/quotes/quote.selectors.spec.ts` testing pipeline dashboard selectors with specific state shapes and computed status selectors
    - _Requirements: 8.1, 8.5–8.10_

- [x] 6. Create core services
  - [x] 6.1 Implement QuoteWorkflowService
    - Create `src/app/features/field-resource-management/services/quote-workflow.service.ts`
    - Implement API methods: `getQuote`, `getQuotes`, `createQuote`, `updateRfp`, `convertToJob`, `markQuoteDelivered`
    - Implement draft persistence methods: `saveDraft` (debounced 3s to sessionStorage), `restoreDraft`, `clearDraft`, `clearAllDrafts` using key format `frm_quote_draft_{quoteId}_{step}`
    - Wrap sessionStorage operations in try/catch for quota/disabled storage handling
    - Discard drafts older than 24 hours on restore
    - _Requirements: 2.15, 2.16, 14.1–14.4_

  - [x] 6.2 Implement BomCalculationService
    - Create `src/app/features/field-resource-management/services/bom-calculation.service.ts`
    - Implement pure calculation functions: `computeExtendedCost`, `computeMarkedUpCost`, `computeSubtotal`, `computeGrandTotal`, `computeBomTotals`, `computeLaborTotal`
    - All functions take data and configuration as input and return computed values with no side effects
    - _Requirements: 3.4, 3.5, 4.2, 4.3, 4.5, 4.7_

  - [x] 6.3 Implement BomService
    - Create `src/app/features/field-resource-management/services/bom.service.ts`
    - Implement API methods: `saveBom`, `completeBom`
    - _Requirements: 4.11, 4.12_

  - [x] 6.4 Implement JobSummaryService
    - Create `src/app/features/field-resource-management/services/job-summary.service.ts`
    - Implement API methods: `saveJobSummary`, `completeJobSummary`
    - _Requirements: 3.6, 3.7, 3.8_

  - [x] 6.5 Implement BomValidationService
    - Create `src/app/features/field-resource-management/services/bom-validation.service.ts`
    - Implement API methods: `initiateValidation`, `approveBom`, `rejectBom`, `getValidationHistory`
    - _Requirements: 5.1–5.14_

  - [x] 6.6 Implement QuoteAssemblyService
    - Create `src/app/features/field-resource-management/services/quote-assembly.service.ts`
    - Implement API methods: `assembleQuoteDocument`, `updateSow`, `finalizeQuote`, `exportPdf`, `sendToCustomer`
    - _Requirements: 6.1–6.9, 7.1–7.6_

  - [x] 6.7 Implement ClientConfigurationService
    - Create `src/app/features/field-resource-management/services/client-configuration.service.ts`
    - Implement API methods: `getClientConfiguration`, `getDefaultConfiguration`, `saveClientConfiguration`, `getAllClientConfigurations`
    - `getDefaultConfiguration` returns `{ taxFreightVisible: true, defaultMarkupPercentage: 10 }` when no config exists
    - _Requirements: 11.1–11.4_

  - [ ]* 6.8 Write property tests for BOM calculations
    - **Property 4: BOM extended cost computation** — for any BOM line item with positive quantity and positive unitCost, verify `computeExtendedCost(quantity, unitCost)` returns exactly `quantity × unitCost`
    - **Property 5: BOM markup computation** — for any non-negative extendedCost and markupPercentage in [0, 100], verify `computeMarkedUpCost(extendedCost, markupPercentage)` returns exactly `extendedCost × (1 + markupPercentage / 100)`
    - **Property 6: BOM subtotal computation** — for any list of BOM line items and markupPercentage in [0, 100], verify `computeSubtotal(lineItems, markupPercentage)` equals the sum of marked-up extended costs for each item
    - **Property 7: BOM grand total computation** — for any non-negative subtotal, tax, and freight, verify `computeGrandTotal(subtotal, tax, freight)` returns exactly `subtotal + tax + freight`
    - **Property 8: BOM totals consistency** — for any list of BOM line items, markupPercentage, tax, and freight, verify `computeBomTotals` returns a `BomTotals` where `grandTotal === subtotal + tax + freight` and subtotal equals the sum of all marked-up extended costs
    - **Validates: Requirements 4.2, 4.3, 4.5, 4.7**

  - [ ]* 6.9 Write property tests for labor totals
    - **Property 9: Labor totals computation** — for any list of labor line items with positive estimatedHours and positive hourlyRate, verify `computeLaborTotal(lineItems)` returns totalHours equal to the sum of all estimatedHours and totalCost equal to the sum of estimatedHours × hourlyRate for each item
    - **Validates: Requirements 3.4, 3.5**

  - [ ]* 6.10 Write property tests for draft persistence and client configuration
    - **Property 16: Draft persistence round trip** — for any quote step form value, verify `saveDraft(quoteId, step, formValue)` followed by `restoreDraft(quoteId, step)` returns a value deeply equal to the original form value
    - **Property 19: Client configuration defaults** — for any client name with no ClientConfiguration record, verify the system uses default values: `taxFreightVisible = true` and `defaultMarkupPercentage = 10`
    - **Validates: Requirements 14.1, 14.2, 11.4**

  - [ ]* 6.11 Write unit tests for all services
    - Create spec files for `QuoteWorkflowService`, `BomCalculationService`, `BomService`, `JobSummaryService`, `BomValidationService`, `QuoteAssemblyService`, `ClientConfigurationService`
    - Test API method calls with correct endpoints and HTTP methods
    - Test draft save/restore/clear operations with sessionStorage
    - Test `BomCalculationService` pure functions with specific inputs and edge cases
    - Test `ClientConfigurationService.getDefaultConfiguration` returns correct defaults
    - _Requirements: 3.4–3.8, 4.2–4.12, 5.1–5.14, 6.1–6.9, 7.1–7.6, 11.1–11.4, 14.1–14.4_

- [x] 7. Create NgRx effects for quote operations
  - [x] 7.1 Implement quote effects
    - Create `src/app/features/field-resource-management/state/quotes/quote.effects.ts`
    - Implement `loadQuotes$` effect: dispatches API call via `QuoteWorkflowService.getQuotes`, handles success/failure
    - Implement `loadQuote$` effect: dispatches API call via `QuoteWorkflowService.getQuote`, handles success/failure
    - Implement `createQuote$` effect: calls `QuoteWorkflowService.createQuote`, on success dispatches `createQuoteSuccess`, clears draft, broadcasts SignalR update, navigates to `/quotes/:id`
    - Implement `saveJobSummary$` and `completeJobSummary$` effects: calls `JobSummaryService`, dispatches success/failure, clears draft, broadcasts SignalR
    - Implement `saveBom$` and `completeBom$` effects: calls `BomService`, dispatches success/failure, clears draft, broadcasts SignalR
    - Implement `initiateValidation$` effect: calls `BomValidationService.initiateValidation`, dispatches success/failure, broadcasts SignalR
    - Implement `approveBom$` and `rejectBom$` effects: calls `BomValidationService`, dispatches success/failure, broadcasts SignalR
    - Implement `finalizeQuote$` effect: calls `QuoteAssemblyService.finalizeQuote`, dispatches success/failure, broadcasts SignalR
    - Implement `deliverQuote$` effect: calls `QuoteAssemblyService.sendToCustomer`, dispatches success/failure, broadcasts SignalR
    - Implement `convertToJob$` effect: calls `QuoteWorkflowService.convertToJob`, dispatches success/failure, broadcasts SignalR
    - Implement `quoteUpdatedRemotely$` effect: updates state from SignalR events
    - _Requirements: 2.15, 2.16, 3.6–3.8, 4.11–4.12, 5.1–5.12, 6.8–6.9, 7.4, 8.14, 10.6, 15.1–15.4_

  - [ ]* 7.2 Write unit tests for quote effects
    - Create `src/app/features/field-resource-management/state/quotes/quote.effects.spec.ts`
    - Test each effect triggers the correct API call and dispatches success/failure actions
    - Test that success actions clear drafts and broadcast SignalR updates
    - Test that `createQuote$` navigates to the new quote route on success
    - _Requirements: 2.15, 3.6, 4.11, 5.1, 6.8, 7.4, 8.14, 10.6, 15.1_

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement RfpIntakeFormComponent
  - [x] 9.1 Create the RFP intake form
    - Create `src/app/features/field-resource-management/components/quotes/rfp-intake/rfp-intake-form.component.ts`
    - Create corresponding `.html` and `.scss` files
    - Build reactive form with sections: Client & Project (client name with autocomplete, project name), Site Information (site name, street, city, state, zip), Customer Contact (name, phone with `CustomValidators.phoneNumber()`, email with `Validators.email`), Scope & Materials (scope of work textarea max 5000, material specifications textarea max 5000), Dates (RFP received date picker required, requested completion date picker validated >= received date via `CustomValidators.dateRange()`), Classification (job type select from `JobType` enum, priority select from `Priority` enum), Attachments (file upload for PDF/DOCX/XLSX, max 25 MB)
    - On client selection, load `ClientConfiguration` via `ClientConfigurationService` and store for later BOM Builder use
    - On "Create Quote" click, dispatch `createQuote` action with form data
    - Integrate draft auto-save: call `QuoteWorkflowService.saveDraft` on form value changes (debounced 3s), restore draft on init with notification banner
    - Render all fields as read-only when `canEdit` is false
    - _Requirements: 2.1–2.16, 11.2, 13.1–13.7, 14.1–14.4_

  - [ ]* 9.2 Write unit tests for RfpIntakeFormComponent
    - Test field rendering and required field validation
    - Test phone and email validation error display
    - Test date range validation (completion date >= received date)
    - Test file upload type and size validation
    - Test client autocomplete and configuration loading
    - Test draft restore notification banner
    - Test read-only mode when canEdit is false
    - _Requirements: 2.1–2.14, 11.2, 13.1–13.7_

  - [ ]* 9.3 Write property tests for date and contact validation
    - **Property 12: Date range validation** — for any pair of dates where requestedCompletionDate is before rfpReceivedDate, verify `CustomValidators.dateRange()` returns a validation error; when on or after, returns null
    - **Property 13: Phone number format validation** — for any string input, verify `CustomValidators.phoneNumber()` returns null (valid) if and only if the input contains exactly 10 digits
    - **Property 14: Email format validation** — for any string input, verify `Validators.email` returns null (valid) if and only if the input matches a valid email format
    - **Validates: Requirements 2.5, 2.6, 2.11, 13.6, 13.7**

- [x] 10. Implement QuoteWorkflowComponent (container)
  - [x] 10.1 Create the quote workflow container component
    - Create `src/app/features/field-resource-management/components/quotes/quote-workflow/quote-workflow.component.ts`
    - Create corresponding `.html` and `.scss` files
    - Receive `quoteId` from route params
    - Dispatch `loadQuote` on init, subscribe to SignalR updates for this quote
    - Render a visual progress indicator showing all 9 workflow statuses with the current status highlighted
    - Conditionally render the active step component based on `Workflow_Status`: RFP (Draft), Job Summary (Job_Summary_In_Progress), BOM (BOM_In_Progress), Validation (Pending_Validation), Assembly (Validation_Approved), Delivery (Quote_Assembled/Quote_Delivered), Convert to Job (Quote_Delivered)
    - Pass `canEdit` flag to child components based on `canEditQuote` permission
    - Display status transition history with dates and user identities
    - Provide navigation links to associated Job (when converted) and back to quote list
    - Show loading spinner while data loads, error message with retry on failure
    - Clean up SignalR subscription on destroy
    - _Requirements: 8.1–8.3, 8.14, 10.7–10.9, 15.1–15.4_

  - [ ]* 10.2 Write unit tests for QuoteWorkflowComponent
    - Test step rendering based on workflow status
    - Test progress indicator display with all 9 statuses
    - Test loading/error states
    - Test canEdit flag propagation to child components
    - Test status transition history display
    - Test navigation links to associated Job
    - _Requirements: 8.1–8.3, 10.8, 10.9_

- [x] 11. Implement JobSummaryFormComponent
  - [x] 11.1 Create the Job Summary form
    - Create `src/app/features/field-resource-management/components/quotes/job-summary/job-summary-form.component.ts`
    - Create corresponding `.html` and `.scss` files
    - Pre-populate project name, site name, and scope of work from the RFP_Record
    - Add total estimated labor hours field (positive number, 2 decimal places)
    - Add repeatable labor line items section using `FormArray`: task description (max 500), labor category (max 100), estimated hours (positive number), hourly rate (positive number, 2 decimal places)
    - Compute and display running total of estimated hours (sum of line item hours)
    - Compute and display running total of estimated labor cost (sum of hours × rate per line item) using `BomCalculationService.computeLaborTotal`
    - "Save" action persists data via `saveJobSummary` action
    - "Mark Complete" validates at least one line item and hours > 0 before dispatching `completeJobSummary`
    - Integrate draft auto-save; render read-only when `canEdit` is false
    - _Requirements: 3.1–3.8, 13.1–13.5, 14.1–14.4_

  - [ ]* 11.2 Write unit tests for JobSummaryFormComponent
    - Test pre-population from RFP data
    - Test labor line item add/remove
    - Test running totals computation
    - Test completion validation (at least one line item, hours > 0)
    - Test read-only mode
    - _Requirements: 3.1–3.8_

- [x] 12. Implement BomBuilderComponent
  - [x] 12.1 Create the BOM Builder form
    - Create `src/app/features/field-resource-management/components/quotes/bom-builder/bom-builder.component.ts`
    - Create corresponding `.html` and `.scss` files
    - Add repeatable BOM line items section using `FormArray`: material description (non-empty, max 500), quantity (positive integer), unit of measure (max 50), unit cost (positive number, 2 decimal places), supplier name (max 200)
    - Display extended cost per line item computed by `BomCalculationService.computeExtendedCost`
    - Display marked-up extended cost per line item computed by `BomCalculationService.computeMarkedUpCost`
    - Add markup percentage field: defaults to 10% (or client config default), overridable 0–100 with 2 decimal places
    - Add tax amount field (non-negative, 2 decimal places) and freight/shipping cost field (non-negative, 2 decimal places)
    - Display subtotal (sum of marked-up extended costs) and grand total (subtotal + tax + freight) computed by `BomCalculationService`
    - Add tax/freight visibility toggle: defaults based on `ClientConfiguration`, controls customer-facing display
    - Add customer-facing BOM preview panel that respects visibility toggle (hides tax/freight line items when toggle is off, but includes amounts in grand total)
    - "Save" persists data via `saveBom` action; "Mark Complete" validates at least one line item before dispatching `completeBom`
    - Integrate draft auto-save; render read-only when `canEdit` is false
    - _Requirements: 4.1–4.12, 11.2, 13.1–13.5, 14.1–14.4_

  - [ ]* 12.2 Write unit tests for BomBuilderComponent
    - Test line item add/remove
    - Test extended cost and marked-up cost display
    - Test markup application and override
    - Test subtotal/grand total display
    - Test tax/freight visibility toggle and customer-facing preview
    - Test client config defaults applied
    - Test completion validation (at least one line item)
    - Test read-only mode
    - _Requirements: 4.1–4.12_

  - [ ]* 12.3 Write property test for tax/freight visibility
    - **Property 15: Tax/freight visibility respects client configuration** — for any ClientConfiguration where taxFreightVisible is false, verify the customer-facing BOM preview excludes tax and freight as separate line items while the grand total still includes those amounts
    - **Validates: Requirements 4.9, 4.10, 6.4, 6.6**

- [x] 13. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Implement BomValidationComponent
  - [x] 14.1 Create the BOM Validation view
    - Create `src/app/features/field-resource-management/components/quotes/bom-validation/bom-validation.component.ts`
    - Create corresponding `.html` and `.scss` files
    - Display the complete BOM in read-only format with all line items, markup, tax, freight, and grand total
    - Show "Approve" and "Reject" buttons visible only to users with `canValidateBOM` permission
    - On "Approve" click, dispatch `approveBom` action
    - On "Reject" click, open a dialog requiring rejection comments (non-empty, max 2000 chars), then dispatch `rejectBom` action with comments
    - Display validation timeline showing all steps (Request_Sent, Under_Review, Approved/Rejected) with timestamps and actor identities
    - When `Workflow_Status` is `Validation_Rejected`, allow the Authorized_Quoter to navigate back to the BOM Builder to revise and resubmit
    - _Requirements: 5.1–5.14_

  - [ ]* 14.2 Write unit tests for BomValidationComponent
    - Test read-only BOM display with all line items and totals
    - Test approve/reject button visibility based on `canValidateBOM` permission
    - Test rejection comments dialog and validation
    - Test validation timeline display with step history
    - Test navigation back to BOM Builder on rejection
    - _Requirements: 5.1–5.14_

- [x] 15. Implement QuoteAssemblyComponent
  - [x] 15.1 Create the Quote Assembly view
    - Create `src/app/features/field-resource-management/components/quotes/quote-assembly/quote-assembly.component.ts`
    - Create corresponding `.html` and `.scss` files
    - Enable only when `Workflow_Status` is `Validation_Approved`
    - Display three sections: Price Summary (total labor cost, total material cost as marked-up subtotal, combined project total; respects tax/freight visibility config), SOW (editable scope of work text max 10000 chars, pre-populated from RFP_Record), BOM (read-only display with marked-up pricing, respects tax/freight visibility)
    - Provide preview mode for the assembled Quote Document
    - "Finalize" action records timestamp and user identity, dispatches `finalizeQuote` action to update status to `Quote_Assembled`
    - _Requirements: 6.1–6.9_

  - [ ]* 15.2 Write unit tests for QuoteAssemblyComponent
    - Test three-section display (Price Summary, SOW, BOM)
    - Test SOW editing and max length
    - Test tax/freight visibility in Price Summary and BOM sections
    - Test preview mode
    - Test finalize action
    - _Requirements: 6.1–6.9_

- [x] 16. Implement QuoteDeliveryComponent
  - [x] 16.1 Create the Quote Delivery view
    - Create `src/app/features/field-resource-management/components/quotes/quote-delivery/quote-delivery.component.ts`
    - Create corresponding `.html` and `.scss` files
    - "Export PDF" action calls `QuoteAssemblyService.exportPdf` to generate downloadable PDF with company logo, project name, client name, date, Price Summary, SOW, BOM
    - "Send to Customer" action opens email composition form pre-populated with customer contact email from RFP_Record, default subject line containing project name, and Quote_Document PDF as attachment
    - "Print" action generates print-friendly layout using `window.print()` with dedicated print stylesheet
    - After sending, dispatch `deliverQuote` action to record delivery timestamp and recipient email, update status to `Quote_Delivered`
    - Display delivery history (timestamp and recipient) when status is `Quote_Delivered`
    - _Requirements: 7.1–7.6_

  - [ ]* 16.2 Write unit tests for QuoteDeliveryComponent
    - Test PDF export action
    - Test email composition pre-population
    - Test print action
    - Test delivery history display
    - _Requirements: 7.1–7.6_

- [x] 17. Implement ConvertToJobComponent
  - [x] 17.1 Create the Convert to Job view
    - Create `src/app/features/field-resource-management/components/quotes/convert-to-job/convert-to-job.component.ts`
    - Create corresponding `.html` and `.scss` files
    - Available when `Workflow_Status` is `Quote_Delivered`
    - Display pre-populated job fields from quote data in read-only summary: client name, site name, site address, customer contact, job type, priority, scope of work, estimated hours
    - Add PO Number field (text, optional)
    - Add SRI Job Number field (text, required)
    - "Create Job" action dispatches `convertToJob` action which creates a Job via the backend, stores Job ID on the quote, updates status to `Quote_Converted`
    - Display link to created Job after conversion
    - _Requirements: 10.1–10.10_

  - [ ]* 17.2 Write unit tests for ConvertToJobComponent
    - Test pre-populated job fields display from quote data
    - Test PO Number and SRI Job Number field validation
    - Test job creation action
    - Test link to created Job after conversion
    - _Requirements: 10.1–10.10_

  - [ ]* 17.3 Write property test for quote-to-job data preservation
    - **Property 18: Quote-to-Job data preservation** — for any QuoteWorkflow converted to a Job, verify the created Job contains the client name, site name, site address, customer contact, job type, priority, scope of work, and estimated hours from the originating quote with no data lost
    - **Validates: Requirements 10.3**

- [x] 18. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 19. Implement QuotePipelineDashboardComponent
  - [x] 19.1 Create the pipeline dashboard widget
    - Create `src/app/features/field-resource-management/components/quotes/pipeline-dashboard/quote-pipeline-dashboard.component.ts`
    - Create corresponding `.html` and `.scss` files
    - Widget displayed on the FRM home dashboard for users with `canViewQuote` permission
    - Display six pipeline categories with counts and clickable lists: RFPs Received (Draft + Job_Summary_In_Progress), BOMs Not Ready (BOM_In_Progress + Validation_Rejected), BOMs Ready (Pending_Validation + Validation_Approved), Quotes Ready for Customer (Quote_Assembled), Quotes Delivered (Quote_Delivered), Quotes Converted to Job (Quote_Converted)
    - Display PO Number and SRI Job Number indicators per quote
    - Clicking a count navigates to filtered quote list; clicking a quote navigates to its workflow view
    - Subscribe to NgRx quote selectors for pipeline data
    - Subscribe to SignalR for real-time updates
    - _Requirements: 8.4–8.14_

  - [ ]* 19.2 Write unit tests for QuotePipelineDashboardComponent
    - Test six pipeline categories with correct status groupings
    - Test count display for each category
    - Test navigation on count click and quote click
    - Test PO Number and SRI Job Number indicators
    - Test real-time updates via SignalR
    - _Requirements: 8.4–8.14_

- [x] 20. Implement QuoteListComponent
  - [x] 20.1 Create the quote list view
    - Create `src/app/features/field-resource-management/components/quotes/quote-list/quote-list.component.ts`
    - Create corresponding `.html` and `.scss` files
    - Display all quotes the user has permission to view in a table/list format
    - Show key columns: project name, client name, workflow status, created date, PO Number, SRI Job Number
    - Support filtering by workflow status (for pipeline dashboard navigation)
    - Clicking a quote navigates to its workflow view
    - _Requirements: 12.1_

  - [ ]* 20.2 Write unit tests for QuoteListComponent
    - Test quote list rendering with key columns
    - Test status filtering
    - Test navigation to quote workflow view
    - _Requirements: 12.1_

- [x] 21. Register QuotesModule with routes and integrate into FRM module
  - [x] 21.1 Create QuotesModule with lazy-loaded routes
    - Create `src/app/features/field-resource-management/components/quotes/quotes.module.ts`
    - Declare all quote components: `QuoteListComponent`, `QuoteWorkflowComponent`, `RfpIntakeFormComponent`, `JobSummaryFormComponent`, `BomBuilderComponent`, `BomValidationComponent`, `QuoteAssemblyComponent`, `QuoteDeliveryComponent`, `ConvertToJobComponent`, `QuotePipelineDashboardComponent`
    - Register routes: `''` → `QuoteListComponent`, `'new'` → `RfpIntakeFormComponent` (with `QuoteCreateGuard`), `':id'` → `QuoteWorkflowComponent`
    - Register the `quotes` NgRx state slice using `StoreModule.forFeature` and `QuoteEffects` in `EffectsModule.forFeature`
    - Use `FrmLayoutComponent` as the parent layout
    - _Requirements: 12.1–12.7_

  - [x] 21.2 Register quotes route in FRM routing module and add navigation
    - Modify `src/app/features/field-resource-management/field-resource-management-routing.module.ts` to add lazy-loaded `quotes` route with `QuoteViewGuard`
    - Add redirect from `jobs/new` to `/field-resource-management/quotes/new`
    - Add "Quotes" menu item to FRM navigation, visible to users with `canViewQuote` permission
    - _Requirements: 10.1, 12.1–12.7_

  - [x] 21.3 Integrate QuotePipelineDashboardComponent into FRM home dashboard
    - Modify the FRM home dashboard component to include `<app-quote-pipeline-dashboard>` widget
    - Conditionally render based on `canViewQuote` permission using the existing permission directive
    - _Requirements: 8.4_

  - [ ]* 21.4 Write unit tests for route integration
    - Test that quotes routes load correct components
    - Test that `jobs/new` redirects to `quotes/new`
    - Test that "Quotes" menu item visibility is based on `canViewQuote` permission
    - Test that `QuoteViewGuard` and `QuoteCreateGuard` protect routes correctly
    - _Requirements: 10.1, 12.1–12.7_

- [x] 22. Extend Job model with readiness fields and update Job detail view
  - [x] 22.1 Add Job Readiness and Customer Ready fields
    - Modify `src/app/features/field-resource-management/models/job.model.ts` to add `jobReadiness` field with values `Not_Ready`, `Partially_Ready`, `Ready` and `customerReady` field with values `Not_Ready`, `Ready`
    - Modify the Job detail view component to display `jobReadiness` and `customerReady` as editable dropdowns for users with `canEditJob` permission, read-only text otherwise
    - Display a visual indicator (e.g., green badge) when both `jobReadiness` is `Ready` and `customerReady` is `Ready`
    - Add link to originating Quote_Workflow on the Job detail view when one exists
    - Modify the Job list view to support filtering by `jobReadiness` and `customerReady` values
    - Persist changes via `JobService` with update timestamp and user identity
    - _Requirements: 9.1–9.7, 10.8_

  - [ ]* 22.2 Write unit tests for Job readiness fields
    - Test editable dropdowns for users with `canEditJob` permission
    - Test read-only display for users without `canEditJob`
    - Test visual indicator when both fields are `Ready`
    - Test link to originating Quote_Workflow
    - Test filtering by readiness values in Job list
    - _Requirements: 9.1–9.7, 10.8_

- [x] 23. Implement Client Configuration admin interface
  - [x] 23.1 Create Client Configuration admin components
    - Create `src/app/features/field-resource-management/components/admin/client-config/client-config-list.component.ts` with corresponding `.html` and `.scss` — lists all client configurations
    - Create `src/app/features/field-resource-management/components/admin/client-config/client-config-form.component.ts` with corresponding `.html` and `.scss` — create/edit form for ClientConfiguration records with fields: client name, tax/freight visibility toggle, default markup percentage
    - Protect with `canAccessAdminPanel` permission
    - _Requirements: 11.1–11.4_

  - [ ]* 23.2 Write unit tests for Client Configuration admin
    - Test list rendering of client configurations
    - Test create/edit form validation
    - Test permission-based access control
    - _Requirements: 11.1–11.4_

- [x] 24. Integrate SignalR real-time updates for quotes
  - [x] 24.1 Extend FrmSignalRService for quote events
    - Modify `src/app/features/field-resource-management/services/frm-signalr.service.ts` to add `QuoteUpdated` event handler in `setupEventHandlers()`
    - On receiving `QuoteUpdated`, dispatch `quoteUpdatedRemotely` action to the store
    - Add connection status indicator support for quote views: emit connection state changes so `QuoteWorkflowComponent` can display a warning banner on disconnect
    - On reconnection, dispatch `loadQuote` to resynchronize state from the API
    - Add SignalR broadcast calls in quote effects after successful status-changing operations
    - _Requirements: 8.13, 8.14, 15.1–15.4_

  - [ ]* 24.2 Write unit tests for SignalR quote integration
    - Test `QuoteUpdated` event dispatches `quoteUpdatedRemotely` action
    - Test reconnection triggers quote reload
    - Test connection status indicator display
    - _Requirements: 15.1–15.4_

- [x] 25. Implement form validation UX across all quote components
  - [x] 25.1 Wire validation display across all quote form components
    - Ensure all form components (RfpIntakeForm, JobSummaryForm, BomBuilder, BomValidation rejection dialog, QuoteAssembly SOW, ConvertToJob) mark fields as touched on Save/Advance to trigger `<mat-error>` display
    - Ensure `maxlength` attribute prevents exceeding character limits at the browser level
    - Ensure invalid fields show red border via Angular Material's built-in error styling
    - Ensure error messages clear immediately when field value becomes valid
    - Add "This field is required" messages for required fields
    - Add format error messages for phone and email fields
    - Add range error messages for numeric fields (markup percentage, tax, freight, hours, rates)
    - _Requirements: 13.1–13.7_

  - [ ]* 25.2 Write property test for error state clearing
    - **Property 17: Error state clears on valid input** — for any form field in an invalid state, verify changing to a valid value immediately clears the error state and removes visual error indicators
    - **Validates: Requirements 13.5**

- [x] 26. Implement draft auto-save and restore across quote steps
  - [x] 26.1 Wire draft persistence into all quote step components
    - Ensure each step component (RfpIntakeForm, JobSummaryForm, BomBuilder, QuoteAssembly) subscribes to form `valueChanges` and calls `QuoteWorkflowService.saveDraft` with 3-second debounce
    - On step init, call `restoreDraft` and if draft data exists, populate the form and show a notification: "Unsaved changes have been restored"
    - On successful backend save, call `clearDraft` for the step
    - Add "Discard" button that calls `clearDraft` and reloads last saved state from the store
    - _Requirements: 14.1–14.4_

  - [ ]* 26.2 Write unit tests for draft auto-save
    - Test that form changes trigger draft save to sessionStorage
    - Test that draft restore populates form and shows notification
    - Test that successful save clears draft
    - Test that Discard button clears draft and reloads saved state
    - _Requirements: 14.1–14.4_

- [x] 27. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key integration points
- Property tests validate universal correctness properties from the design document using `fast-check`
- Unit tests validate specific examples, edge cases, and integration points
- All components follow existing project patterns: Angular Material, Reactive Forms, NgRx, and the FRM module's established file structure
- The `BomCalculationService` uses pure functions to enable thorough property-based testing of financial calculations
- The `jobs/new` route redirects to `quotes/new` to enforce the quote-first job creation path while preserving backward compatibility
