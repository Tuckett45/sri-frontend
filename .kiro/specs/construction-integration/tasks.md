# Implementation Plan: Construction Integration Module

## Overview

Incrementally build the Construction Integration feature module following the existing Angular lazy-loaded module pattern (similar to atlas/deployment). Start with data models and services, then NgRx state, then components, and finally wire everything together with routing and RBAC.

## Tasks

- [x] 1. Create data models and enums
  - [x] 1.1 Create `src/app/features/construction-integration/models/construction.models.ts` with `ProjectCategory`, `IssueSeverity`, `IssueStatus` enums, `Project`, `ResourceAllocation`, `Issue`, `IssueFilters` interfaces, and `VALID_STATUS_TRANSITIONS` map
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_
  - [ ]* 1.2 Write property test: ResourceAllocation month range invariant
    - **Property 18: ResourceAllocation month is in range 1-12**
    - **Validates: Requirements 9.2**
  - [ ]* 1.3 Write property test: Issue status transitions follow the state machine
    - **Property 11: Issue status transitions follow the state machine**
    - **Validates: Requirements 5.4, 5.5**

- [x] 2. Implement ConstructionService and CsvExportService
  - [x] 2.1 Create `src/app/features/construction-integration/services/construction.service.ts` with CRUD methods for Projects, ResourceAllocations, and Issues, including filtered issue retrieval and status transition
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_
  - [x] 2.2 Create `src/app/features/construction-integration/services/csv-export.service.ts` with `exportForecast()` and `exportIssues()` methods that generate CSV and trigger browser download
    - _Requirements: 7.1, 7.2, 7.3_
  - [ ]* 2.3 Write property test: API errors produce descriptive Observable errors
    - **Property 19: API errors produce descriptive Observable errors**
    - **Validates: Requirements 10.5**
  - [ ]* 2.4 Write property test: Forecast CSV round trip
    - **Property 14: Forecast CSV round trip**
    - **Validates: Requirements 7.1**
  - [ ]* 2.5 Write property test: Issue CSV contains all filtered issues with required columns
    - **Property 15: Issue CSV contains all filtered issues with required columns**
    - **Validates: Requirements 7.2**
  - [ ]* 2.6 Write property test: CSV filename contains export type and date
    - **Property 16: CSV filename contains export type and date**
    - **Validates: Requirements 7.3**

- [x] 3. Implement NgRx state for projects
  - [x] 3.1 Create `src/app/features/construction-integration/state/projects/` with `project.state.ts`, `project.actions.ts`, `project.reducer.ts`, `project.effects.ts`, and `project.selectors.ts` using EntityAdapter pattern
    - Include selectors for `selectAllProjects`, `selectProjectsByCategory`, and `selectSelectedProject`
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.4, 3.5_
  - [ ]* 3.2 Write property test: Projects are correctly grouped by category
    - **Property 3: Projects are correctly grouped by category**
    - **Validates: Requirements 2.2**
  - [ ]* 3.3 Write property test: Project creation round trip
    - **Property 4: Project creation round trip**
    - **Validates: Requirements 3.1, 3.2, 3.5**

- [x] 4. Implement NgRx state for allocations
  - [x] 4.1 Create `src/app/features/construction-integration/state/allocations/` with `allocation.state.ts`, `allocation.actions.ts`, `allocation.reducer.ts`, `allocation.effects.ts`, and `allocation.selectors.ts`
    - Include `selectAllocationGrid` selector that builds the project × month grid with row/column totals
    - Include optimistic update with revert-on-failure for allocation edits
    - _Requirements: 2.4, 2.5, 2.6, 2.7, 4.2, 4.4, 4.5, 8.2_
  - [ ]* 4.2 Write property test: Allocation grid maps data to correct cells
    - **Property 1: Allocation grid maps data to correct cells**
    - **Validates: Requirements 2.4, 2.5**
  - [ ]* 4.3 Write property test: Grid totals are consistent with cell values
    - **Property 2: Grid totals are consistent with cell values**
    - **Validates: Requirements 2.6, 2.7, 4.4**
  - [ ]* 4.4 Write property test: Allocation update failure reverts cell value
    - **Property 9: Allocation update failure reverts cell value**
    - **Validates: Requirements 4.5**
  - [ ]* 4.5 Write property test: Year selection loads correct allocations
    - **Property 17: Year selection loads correct allocations**
    - **Validates: Requirements 8.2**

- [x] 5. Implement NgRx state for issues
  - [x] 5.1 Create `src/app/features/construction-integration/state/issues/` with `issue.state.ts`, `issue.actions.ts`, `issue.reducer.ts`, `issue.effects.ts`, and `issue.selectors.ts`
    - Include filter and sort selectors for severity, status, projectId, and createdDate
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.1, 6.2, 6.3, 6.4, 6.5_
  - [ ]* 5.2 Write property test: Issue creation produces OPEN status
    - **Property 10: Issue creation produces OPEN status**
    - **Validates: Requirements 5.2, 5.3**
  - [ ]* 5.3 Write property test: Issue filters return correct intersection
    - **Property 12: Issue filters return correct intersection**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 10.4**
  - [ ]* 5.4 Write property test: Issue list sorting preserves all elements in correct order
    - **Property 13: Issue list sorting preserves all elements in correct order**
    - **Validates: Requirements 6.5**
  - [ ]* 5.5 Write property test: Project issues filter matches project
    - **Property 20: Project issues filter matches project**
    - **Validates: Requirements 5.6**

- [x] 6. Checkpoint - Ensure all state management and services compile
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement container and Forecast Dashboard components
  - [x] 7.1 Create `src/app/features/construction-integration/construction-container.component.ts` as a shell component with `<router-outlet>` and sidebar navigation links to forecast and issues views
    - _Requirements: 1.5_
  - [x] 7.2 Create `src/app/features/construction-integration/components/forecast-dashboard/forecast-dashboard.component.ts|html|scss` with year selector, tabular grid (projects × months), category grouping, row/column totals, inline cell editing for admins, read-only for non-admins, and CSV export button
    - Default to current calendar year on initial load
    - Use `AuthService.isAdmin()` to toggle edit affordances
    - Dispatch NgRx actions for loading projects and allocations
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 7.1, 8.1, 8.2, 8.3, 11.3, 11.4, 11.5_
  - [ ]* 7.3 Write property test: Allocation input validation rejects non-numeric values
    - **Property 8: Allocation input validation rejects non-numeric values**
    - **Validates: Requirements 4.3**

- [x] 8. Implement project management components
  - [x] 8.1 Create `src/app/features/construction-integration/components/project-detail/project-detail.component.ts|html|scss` displaying project metadata, 12-month allocation row, and filtered issue list for the project. Show edit button only for admins.
    - _Requirements: 3.4, 3.6, 5.6, 11.4, 11.5_
  - [x] 8.2 Create `src/app/features/construction-integration/components/project-create/project-create.component.ts|html|scss` with reactive form for name, clientName, location, category. Validate required fields with inline error messages.
    - _Requirements: 3.1, 3.2, 3.3_
  - [x] 8.3 Create `src/app/features/construction-integration/components/project-edit/project-edit.component.ts|html|scss` with reactive form pre-populated with existing project data for editing.
    - _Requirements: 3.5_
  - [ ]* 8.4 Write property test: Project form validation rejects missing required fields
    - **Property 5: Project form validation rejects missing required fields**
    - **Validates: Requirements 3.3**

- [x] 9. Implement issue management components
  - [x] 9.1 Create `src/app/features/construction-integration/components/issue-list/issue-list.component.ts|html|scss` with PrimeNG table, filters for severity/status/project, sortable columns, CSV export button. Admin users see create button; non-admins see read-only.
    - _Requirements: 5.1, 5.7, 6.1, 6.2, 6.3, 6.4, 6.5, 7.2, 11.4, 11.5_
  - [x] 9.2 Create `src/app/features/construction-integration/components/issue-create/issue-create.component.ts|html|scss` with reactive form for project, description, severity. Validate required fields.
    - _Requirements: 5.2, 5.3_
  - [x] 9.3 Create `src/app/features/construction-integration/components/issue-detail/issue-detail.component.ts|html|scss` displaying issue details with status transition buttons for admins (OPEN→IN_PROGRESS→RESOLVED→CLOSED). Non-admins see read-only.
    - _Requirements: 5.4, 5.5, 5.7, 11.4, 11.5_
  - [ ]* 9.4 Write property test: Role-based UI visibility
    - **Property 6: Role-based UI visibility**
    - **Validates: Requirements 3.6, 4.6, 5.7, 11.3, 11.4, 11.5**

- [x] 10. Checkpoint - Ensure all components compile and render
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Wire module, routing, and RBAC
  - [x] 11.1 Create `src/app/features/construction-integration/construction-integration-routing.module.ts` with child routes: forecast (default), project create/detail/edit, issue list/create/detail. Apply `RoleGuard` with `expectedRoles: [UserRole.Admin]` on create and edit routes.
    - _Requirements: 1.4, 1.5, 3.7, 11.1, 11.2, 11.6_
  - [x] 11.2 Create `src/app/features/construction-integration/construction-integration.module.ts` importing CommonModule, ReactiveFormsModule, routing module, all components, Angular Material/PrimeNG modules, and NgRx StoreModule.forFeature/EffectsModule.forFeature for all three stores. Provide ConstructionService and CsvExportService.
    - _Requirements: 1.1, 1.2, 10.6_
  - [x] 11.3 Register the lazy-loaded route in `src/app/app-routing.module.ts` with path `construction`, `loadChildren` pointing to `ConstructionIntegrationModule`, and `canActivate: [AuthGuard]`
    - _Requirements: 1.1, 1.2, 1.3_
  - [ ]* 11.4 Write property test: RoleGuard denies non-admin users on admin routes
    - **Property 7: RoleGuard denies non-admin users on admin routes**
    - **Validates: Requirements 3.7, 11.6**

- [x] 12. Final checkpoint - Ensure full module compiles, routes work, and all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (20 properties total)
- All components follow the existing atlas/deployment patterns: standalone components, NgRx state, Angular Material + PrimeNG UI
- fast-check is already in devDependencies for property-based testing
