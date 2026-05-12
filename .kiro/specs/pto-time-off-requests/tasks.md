# Implementation Plan: PTO/Time Off Requests

## Overview

This plan implements the PTO request management feature within the existing Angular 18 field-resource-management module. Tasks are organized to build incrementally: data models and services first, then NgRx state management, then UI components, and finally integration wiring. Each task builds on the previous steps, ensuring no orphaned code.

## Tasks

- [x] 1. Create data models, enums, and DTOs
  - [x] 1.1 Create the PTO models file with all interfaces, enums, and types
    - Create `src/app/features/field-resource-management/models/pto.models.ts`
    - Define `RequestStatus` enum, `LeaveType`, `PtoRequest`, `ApprovalEntry`, `ApprovalAction`, `UserRole` interfaces
    - Define `CreatePtoRequestDto`, `RejectPtoRequestDto` DTOs
    - Define `VALID_TRANSITIONS` map and `PREDEFINED_LEAVE_TYPES` constant
    - _Requirements: 1.1, 7.1, 7.5, 8.1_

- [x] 2. Implement PTO Validation Service
  - [x] 2.1 Create PtoValidationService with date and form validation logic
    - Create `src/app/features/field-resource-management/services/pto-validation.service.ts`
    - Implement `validateRequest(dto: CreatePtoRequestDto): ValidationResult` — checks start date not in past, end date >= start date, valid leave type, notes max length
    - Implement `canTransition(currentStatus, targetStatus): boolean` using `VALID_TRANSITIONS` map
    - Implement `isValidTransition(from, to, role): boolean` enforcing role-based transition rules
    - _Requirements: 1.2, 1.3, 1.5, 4.4, 5.4, 7.1, 7.2, 7.3_

  - [ ]* 2.2 Write property test: Date validation rejects invalid date ranges (Property 1)
    - **Property 1: Date validation rejects invalid date ranges**
    - Create `src/app/features/field-resource-management/services/pto-validation.property.spec.ts`
    - Use fast-check to generate arbitrary dates where start is in the past OR end < start
    - Assert validation service rejects all such inputs with appropriate error messages
    - **Validates: Requirements 1.2, 1.3**

  - [ ]* 2.3 Write property test: State machine transition integrity (Property 3)
    - **Property 3: State machine transition integrity**
    - Add to `pto-validation.property.spec.ts`
    - Use fast-check to generate all combinations of (currentStatus, targetStatus)
    - Assert `canTransition` returns true if and only if targetStatus is in `VALID_TRANSITIONS[currentStatus]`
    - **Validates: Requirements 3.1, 3.2, 3.4, 4.2, 4.3, 5.2, 5.3, 7.1, 7.2, 7.3**

  - [ ]* 2.4 Write unit tests for PtoValidationService
    - Create `src/app/features/field-resource-management/services/pto-validation.service.spec.ts`
    - Test boundary cases: today as start date, same start/end date, notes at max length
    - Test each invalid field produces the correct error message
    - _Requirements: 1.2, 1.3, 1.5_

- [x] 3. Implement PTO Workflow Service
  - [x] 3.1 Create PtoWorkflowService with status transition orchestration
    - Create `src/app/features/field-resource-management/services/pto-workflow.service.ts`
    - Implement `submit(dto)` — validates then creates request with `Pending_Manager_Approval` status
    - Implement `cancel(requestId)` — validates cancellation is allowed, transitions to `Cancelled`
    - Implement `managerApprove(requestId)` / `managerReject(requestId, reason)` — validates role and status, transitions accordingly
    - Implement `backofficeApprove(requestId)` / `backofficeReject(requestId, reason)` — validates role and status, transitions accordingly
    - Each transition appends an `ApprovalEntry` to the request's `approvalHistory`
    - _Requirements: 1.4, 3.1, 3.2, 4.2, 4.3, 4.4, 5.2, 5.3, 5.4, 7.1, 7.4, 7.5_

  - [ ]* 3.2 Write property test: Valid submissions always start in Pending_Manager_Approval (Property 2)
    - **Property 2: Valid submissions always start in Pending_Manager_Approval**
    - Create `src/app/features/field-resource-management/state/pto/pto-workflow.property.spec.ts`
    - Use fast-check to generate valid CreatePtoRequestDto (future start date, end >= start, valid leave type)
    - Assert all valid submissions produce status `Pending_Manager_Approval`
    - **Validates: Requirements 1.4**

  - [ ]* 3.3 Write property test: Rejection always requires a non-empty reason (Property 4)
    - **Property 4: Rejection always requires a non-empty reason**
    - Add to `pto-workflow.property.spec.ts`
    - Use fast-check to generate empty/whitespace-only strings as rejection reasons
    - Assert rejection attempts with such reasons are rejected by the service
    - **Validates: Requirements 4.4, 5.4**

  - [ ]* 3.4 Write property test: Modification resets approval workflow (Property 7)
    - **Property 7: Modification resets approval workflow**
    - Add to `pto-workflow.property.spec.ts`
    - Use fast-check to generate requests in non-terminal statuses with arbitrary modifications
    - Assert status resets to `Pending_Manager_Approval` after modification
    - **Validates: Requirements 7.4**

  - [ ]* 3.5 Write property test: Every status transition produces an audit entry (Property 8)
    - **Property 8: Every status transition produces an audit entry**
    - Add to `pto-workflow.property.spec.ts`
    - Use fast-check to generate sequences of valid transitions
    - Assert `approvalHistory.length` equals the number of transitions performed, and each entry contains timestamp, user, fromStatus, toStatus
    - **Validates: Requirements 7.5**

- [x] 4. Implement PTO API Service
  - [x] 4.1 Create PtoApiService with HTTP methods for all PTO endpoints
    - Create `src/app/features/field-resource-management/services/pto-api.service.ts`
    - Implement all methods: `getMyRequests()`, `getRequestById(id)`, `createRequest(dto)`, `cancelRequest(id)`, `getManagerQueue()`, `getBackofficeQueue()`, `approveAsManager(id)`, `rejectAsManager(id, reason)`, `approveAsBackoffice(id)`, `rejectAsBackoffice(id, reason)`, `getLeaveTypes()`
    - Use `HttpClient` with appropriate base URL and error handling
    - _Requirements: 1.1, 2.1, 4.1, 5.1, 8.1, 8.2_

  - [ ]* 4.2 Write unit tests for PtoApiService
    - Create `src/app/features/field-resource-management/services/pto-api.service.spec.ts`
    - Use `HttpClientTestingModule` to verify correct HTTP methods, URLs, and payloads
    - Test error handling for 401, 403, 404, 409, 500 responses
    - _Requirements: 1.1, 2.1, 4.1, 5.1_

- [x] 5. Checkpoint - Ensure services compile and tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement NgRx state management
  - [x] 6.1 Create PTO NgRx actions
    - Create `src/app/features/field-resource-management/state/pto/pto.actions.ts`
    - Define actions for: load requests, load success/failure, create request, create success/failure, cancel request, cancel success/failure, manager approve/reject, backoffice approve/reject, load leave types, load manager queue, load backoffice queue, select request
    - _Requirements: 1.1, 1.4, 2.1, 3.1, 4.1, 4.2, 4.3, 5.1, 5.2, 5.3_

  - [x] 6.2 Create PTO NgRx reducer with entity adapter
    - Create `src/app/features/field-resource-management/state/pto/pto.reducer.ts`
    - Set up `EntityAdapter<PtoRequest>` with `selectId` and `sortComparer` (by startDate descending)
    - Define initial state with empty entity, empty queues, null selectedRequestId, loading false, error null
    - Handle all actions: load/create/cancel/approve/reject success and failure cases
    - _Requirements: 2.4, 7.1_

  - [x] 6.3 Create PTO NgRx selectors
    - Create `src/app/features/field-resource-management/state/pto/pto.selectors.ts`
    - Define selectors: `selectAllPtoRequests`, `selectPtoLoading`, `selectPtoError`, `selectSelectedRequest`, `selectManagerQueue`, `selectBackofficeQueue`, `selectLeaveTypes`, `selectMyRequests(employeeId)`
    - Manager queue selector filters to `Pending_Manager_Approval` status only
    - Backoffice queue selector filters to `Pending_Backoffice_Approval` status only
    - _Requirements: 2.1, 2.4, 4.1, 5.1_

  - [x] 6.4 Create PTO NgRx effects
    - Create `src/app/features/field-resource-management/state/pto/pto.effects.ts`
    - Implement effects for: loadRequests, createRequest, cancelRequest, managerApprove, managerReject, backofficeApprove, backofficeReject, loadLeaveTypes, loadManagerQueue, loadBackofficeQueue
    - Wire notification dispatches on status changes using existing `NotificationService`
    - Wire audit logging on status changes using existing `AuditLoggingService`
    - Handle optimistic update for cancellation with rollback on failure
    - _Requirements: 1.4, 1.6, 3.2, 3.3, 4.2, 4.3, 4.5, 5.2, 5.3, 5.5, 6.1, 6.2, 6.3, 6.4_

  - [ ]* 6.5 Write property test: Queue filtering returns only role-appropriate requests (Property 5)
    - **Property 5: Queue filtering returns only role-appropriate requests**
    - Create `src/app/features/field-resource-management/state/pto/pto-selectors.property.spec.ts`
    - Use fast-check to generate arrays of PtoRequest with random statuses
    - Assert manager queue selector returns only `Pending_Manager_Approval` requests
    - Assert backoffice queue selector returns only `Pending_Backoffice_Approval` requests
    - **Validates: Requirements 2.1, 4.1, 5.1**

  - [ ]* 6.6 Write property test: Request list is sorted by start date descending (Property 6)
    - **Property 6: Request list is sorted by start date descending**
    - Add to `pto-selectors.property.spec.ts`
    - Use fast-check to generate arrays of PtoRequest with random start dates
    - Assert for every adjacent pair in the result, `request[i].startDate >= request[i+1].startDate`
    - **Validates: Requirements 2.4**

  - [ ]* 6.7 Write unit tests for PTO reducer
    - Create `src/app/features/field-resource-management/state/pto/pto.reducer.spec.ts`
    - Test initial state, load success populates entities, create success adds entity, cancel success updates status, error actions set error state
    - _Requirements: 1.4, 3.2, 4.2, 5.2_

  - [ ]* 6.8 Write unit tests for PTO effects
    - Create `src/app/features/field-resource-management/state/pto/pto.effects.spec.ts`
    - Test each effect dispatches correct success/failure actions
    - Test notification dispatch on status changes
    - Test optimistic cancellation with rollback
    - _Requirements: 1.6, 3.3, 4.5, 5.5, 6.1, 6.2, 6.3_

- [x] 7. Checkpoint - Ensure NgRx state management compiles and tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement PTO Request Form Component
  - [x] 8.1 Create PtoRequestFormComponent with reactive form
    - Create `src/app/features/field-resource-management/components/pto/pto-request-form/pto-request-form.component.ts`
    - Create template and styles files
    - Build reactive form with fields: startDate, endDate, leaveTypeId, notes
    - Add validators: required for dates and leave type, custom date validators, maxLength(1000) for notes
    - Dispatch `createRequest` action on valid submission
    - Display inline validation errors per field
    - Display confirmation message on successful submission
    - Load leave types from store on init
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 8.3_

  - [ ]* 8.2 Write unit tests for PtoRequestFormComponent
    - Create `src/app/features/field-resource-management/components/pto/pto-request-form/pto-request-form.component.spec.ts`
    - Test form initialization with empty values
    - Test validation error display for each invalid field
    - Test successful submission dispatches action
    - Test leave type dropdown populated from store
    - _Requirements: 1.1, 1.5_

- [x] 9. Implement PTO Request List and Detail Components
  - [x] 9.1 Create PtoRequestListComponent with status filtering
    - Create `src/app/features/field-resource-management/components/pto/pto-request-list/pto-request-list.component.ts`
    - Create template and styles files
    - Display list of employee's own requests with status, start date, end date, leave type
    - Add status filter chips (All, Pending, Approved, Rejected, Cancelled)
    - Navigate to detail view on row click
    - Requests sorted by start date descending (from selector)
    - _Requirements: 2.1, 2.2, 2.4_

  - [x] 9.2 Create PtoRequestDetailComponent with approval history
    - Create `src/app/features/field-resource-management/components/pto/pto-request-detail/pto-request-detail.component.ts`
    - Create template and styles files
    - Display full request details: dates, leave type, notes, status, employee/manager names
    - Display approval history timeline with timestamps, actors, and actions
    - Show cancel button when request is in cancellable status and user is the owner
    - Dispatch `cancelRequest` action on cancel confirmation
    - _Requirements: 2.3, 3.1, 3.2, 3.4_

  - [ ]* 9.3 Write unit tests for PtoRequestListComponent
    - Create `src/app/features/field-resource-management/components/pto/pto-request-list/pto-request-list.component.spec.ts`
    - Test list renders requests from store
    - Test status filter changes displayed requests
    - Test navigation on row click
    - _Requirements: 2.1, 2.2, 2.4_

- [x] 10. Implement Manager and Backoffice Approval Queue Components
  - [x] 10.1 Create PtoManagerQueueComponent
    - Create `src/app/features/field-resource-management/components/pto/pto-manager-queue/pto-manager-queue.component.ts`
    - Create template and styles files
    - Display pending requests for manager's direct reports with employee name, dates, leave type, notes
    - Add approve and reject buttons per request
    - Show rejection reason dialog/modal on reject
    - Dispatch `managerApprove` or `managerReject` actions
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6_

  - [x] 10.2 Create PtoBackofficeQueueComponent
    - Create `src/app/features/field-resource-management/components/pto/pto-backoffice-queue/pto-backoffice-queue.component.ts`
    - Create template and styles files
    - Display pending requests with employee name, manager approval date, dates, leave type, notes
    - Add approve and reject buttons per request
    - Show rejection reason dialog/modal on reject
    - Dispatch `backofficeApprove` or `backofficeReject` actions
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6_

  - [ ]* 10.3 Write unit tests for PtoManagerQueueComponent
    - Create `src/app/features/field-resource-management/components/pto/pto-manager-queue/pto-manager-queue.component.spec.ts`
    - Test queue displays only pending manager approval requests
    - Test approve button dispatches correct action
    - Test reject requires reason before dispatching
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 10.4 Write unit tests for PtoBackofficeQueueComponent
    - Create `src/app/features/field-resource-management/components/pto/pto-backoffice-queue/pto-backoffice-queue.component.spec.ts`
    - Test queue displays only pending backoffice approval requests
    - Test approve/reject actions dispatch correctly
    - Test rejection reason validation
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 11. Implement Leave Type display and management
  - [x] 11.1 Create PtoLeaveTypeChipComponent
    - Create `src/app/features/field-resource-management/components/pto/pto-leave-type-chip/pto-leave-type-chip.component.ts`
    - Create template and styles files
    - Accept `LeaveType` as input, display as a styled chip
    - Differentiate predefined vs custom types visually
    - _Requirements: 8.1, 8.2_

  - [ ]* 11.2 Write property test: Leave type list is a superset of predefined types (Property 9)
    - **Property 9: Leave type list is a superset of predefined types**
    - Create `src/app/features/field-resource-management/state/pto/pto-leave-types.property.spec.ts`
    - Use fast-check to generate arrays of custom LeaveType objects
    - Assert the combined list always contains all 5 predefined types plus all active custom types, with no duplicates
    - **Validates: Requirements 8.2**

- [x] 12. Wire routing, module registration, and notifications
  - [x] 12.1 Register PTO routes and components in the field-resource-management module
    - Add PTO routes to the field-resource-management routing module: `/pto`, `/pto/new`, `/pto/:id`, `/pto/approvals/manager`, `/pto/approvals/backoffice`
    - Apply existing `ManagerGuard` to manager approval route
    - Apply existing `PayrollGuard` to backoffice approval route
    - Register all PTO components in the module declarations
    - Register PTO services in module providers
    - Register PTO NgRx state (`StoreModule.forFeature`)
    - _Requirements: 4.1, 5.1, 7.1, 7.2, 7.3_

  - [x] 12.2 Wire notification effects for PTO workflow events
    - In PTO effects, dispatch notifications via existing `NotificationService`:
      - On submission: notify manager
      - On manager approval: notify backoffice users
      - On terminal status (Approved/Rejected/Cancelled): notify all involved parties
    - Display notifications in existing application notification area
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ]* 12.3 Write integration tests for full approval workflow
    - Create `src/app/features/field-resource-management/state/pto/pto-integration.spec.ts`
    - Test full flow: submit → manager approve → backoffice approve → Approved status
    - Test rejection flow: submit → manager reject → Employee notified
    - Test cancellation flow: submit → employee cancel → parties notified
    - Verify notifications dispatched at each step
    - _Requirements: 1.4, 3.2, 4.2, 4.5, 5.2, 5.5, 6.1, 6.2, 6.3_

- [x] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document using fast-check
- Unit tests validate specific examples and edge cases using Jasmine/Karma
- The implementation uses TypeScript within the existing Angular 18 / NgRx architecture
