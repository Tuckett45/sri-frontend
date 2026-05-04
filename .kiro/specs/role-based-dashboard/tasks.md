# Implementation Plan: Role-Based Dashboard

## Overview

Refactor the existing `HomeDashboardComponent` into a role-aware dashboard host that renders role-specific child views via `ngSwitch`. Build incrementally: data models → data service → shared widget components → role-specific dashboards → host refactoring → wiring and integration. All components use Angular Material, follow existing FRM styling patterns (white cards, blue accents, `#f5f7fa` background), and integrate with the existing NgRx store.

## Tasks

- [x] 1. Create dashboard data models and utility functions
  - [x] 1.1 Create `dashboard.models.ts` in `src/app/features/field-resource-management/models/`
    - Define `QuickAction`, `KpiItem`, `ApprovalCounts`, `PendingTimecard`, `PendingExpense`, `TravelBreakPtoSummary`, `WidgetState<T>`, and `DashboardView` interfaces/types as specified in the design
    - Export from the models barrel `index.ts`
    - _Requirements: 1.1, 1.6, 2.1, 3.5, 5.1, 5.2, 5.3, 5.5_

  - [x] 1.2 Create `resolveDashboardView` function in `dashboard.models.ts`
    - Implement the role-to-dashboard mapping: field roles → `'technician'`, Admin → `'admin'`, CM → `'cm'`, HR/Payroll → `'hr-payroll'`, all others (including null/undefined) → `'default'`
    - Add `isFieldRole()` and `isHrPayrollRole()` helper functions
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [ ]* 1.3 Write property test for `resolveDashboardView` (Property 1)
    - **Property 1: Role-to-dashboard mapping is total and correct**
    - Use `fast-check` to generate arbitrary `UserRole` values including null/undefined
    - Verify the function returns exactly one of the five valid `DashboardView` values and matches the expected mapping
    - **Validates: Requirements 1.2, 1.5, 1.6, 1.7**

- [x] 2. Create DashboardDataService
  - [x] 2.1 Create `dashboard-data.service.ts` in `src/app/features/field-resource-management/services/`
    - Implement `getApprovalCounts(): Observable<ApprovalCounts>`
    - Implement `getPendingTimecards(): Observable<PendingTimecard[]>`
    - Implement `getPendingExpenses(): Observable<PendingExpense[]>`
    - Implement `getTravelBreakPtoSummary(): Observable<TravelBreakPtoSummary>`
    - Use `HttpClient` to call existing API endpoints
    - _Requirements: 5.1, 5.2, 5.3, 5.5_

- [x] 3. Checkpoint - Ensure models and service compile
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Create shared widget components
  - [x] 4.1 Create `QuickActionsWidgetComponent`
    - Create in `src/app/features/field-resource-management/components/home/widgets/quick-actions-widget/`
    - Accept `@Input() actions: QuickAction[]`
    - Render `mat-raised-button` elements in a flex grid with icon, label, and router link
    - Follow existing `.links-grid` styling pattern from the dashboard SCSS
    - _Requirements: 2.1, 3.3, 4.3, 5.4_

  - [x] 4.2 Create `ActiveJobsWidgetComponent`
    - Create in `src/app/features/field-resource-management/components/home/widgets/active-jobs-widget/`
    - Accept `@Input() marketFilter: string | null = null`
    - Emit `@Output() jobSelected` with job ID
    - Select jobs with status `EnRoute`, `OnSite`, or `NotStarted` from NgRx store
    - Filter by `job.market` when `marketFilter` is provided and non-empty
    - Implement loading/error/retry pattern per design
    - _Requirements: 3.1, 4.1, 4.5, 6.1, 6.2, 6.3, 6.4_

  - [ ]* 4.3 Write property test for active jobs status filtering (Property 4)
    - **Property 4: Active jobs widget filters by status correctly**
    - Generate arbitrary arrays of jobs with random statuses; verify only `EnRoute`, `OnSite`, `NotStarted` are included
    - **Validates: Requirements 3.1**

  - [ ]* 4.4 Write property test for CM market filtering (Property 7)
    - **Property 7: CM market filtering returns only jobs in the CM's market**
    - Generate arbitrary jobs with random market strings; verify filtering correctness and null/empty market fallback
    - **Validates: Requirements 4.1, 4.5**

  - [x] 4.5 Create `RecentJobsWidgetComponent`
    - Create in `src/app/features/field-resource-management/components/home/widgets/recent-jobs-widget/`
    - Accept `@Input() marketFilter: string | null = null` and `@Input() limit: number = 10`
    - Select from NgRx store, sort by `updatedAt` desc, apply market filter and limit
    - Implement loading/error/retry pattern
    - _Requirements: 3.4, 4.4, 6.1, 6.2, 6.3, 6.4_

  - [ ]* 4.6 Write property test for recent jobs sorting and limit (Property 6)
    - **Property 6: Recent jobs returns at most N jobs sorted by updatedAt descending, optionally filtered by market**
    - **Validates: Requirements 3.4, 4.4**

  - [x] 4.7 Create `AssignmentsWidgetComponent`
    - Create in `src/app/features/field-resource-management/components/home/widgets/assignments-widget/`
    - Select active assignments for current user from NgRx store
    - Show assignment status indicator, job site name, status text
    - Display "No active assignments" empty state
    - Implement loading/error/retry pattern
    - _Requirements: 2.2, 2.7, 6.1, 6.2, 6.3, 6.4_

  - [ ]* 4.8 Write property test for assignments filtering (Property 2)
    - **Property 2: Assignments widget shows only active assignments for the current user**
    - **Validates: Requirements 2.2**

  - [x] 4.9 Create `TimecardWidgetComponent`
    - Create in `src/app/features/field-resource-management/components/home/widgets/timecard-widget/`
    - Select current pay period from timecard store
    - Show period dates, total hours, submission status
    - Emit `@Output() viewTimecardClicked`
    - _Requirements: 2.3, 6.1, 6.2, 6.3, 6.4_

  - [x] 4.10 Create `ScheduleWidgetComponent`
    - Create in `src/app/features/field-resource-management/components/home/widgets/schedule-widget/`
    - Select this week's jobs assigned to current user
    - Emit `@Output() viewScheduleClicked`
    - _Requirements: 2.4, 6.1, 6.2, 6.3, 6.4_

  - [ ]* 4.11 Write property test for schedule week filtering (Property 3)
    - **Property 3: Schedule widget shows only current-week jobs**
    - **Validates: Requirements 2.4**

  - [x] 4.12 Create `CurrentJobStatusWidgetComponent`
    - Create in `src/app/features/field-resource-management/components/home/widgets/current-job-status-widget/`
    - Find user's assignment with status `InProgress`, load related job
    - Display job status, site name, client
    - Show "No active job" when null
    - _Requirements: 2.5, 2.6, 6.1, 6.2, 6.3, 6.4_

  - [x] 4.13 Create `AvailableTechniciansWidgetComponent`
    - Create in `src/app/features/field-resource-management/components/home/widgets/available-technicians-widget/`
    - Select technicians not assigned to active jobs from NgRx store
    - Display count and names
    - Emit `@Output() technicianSelected`
    - _Requirements: 3.2, 6.1, 6.2, 6.3, 6.4_

  - [ ]* 4.14 Write property test for available technicians (Property 5)
    - **Property 5: Available technicians are those with no active assignment**
    - **Validates: Requirements 3.2**

  - [x] 4.15 Create `KpiSummaryCardComponent`
    - Create in `src/app/features/field-resource-management/components/home/widgets/kpi-summary-card/`
    - Accept `@Input() kpis: KpiItem[]`
    - Render KPI hero cards using existing `.kpi-hero-card` styling pattern
    - _Requirements: 3.5_

  - [ ]* 4.16 Write property test for KPI computation (Property 8)
    - **Property 8: KPI summary values are correctly computed from source data**
    - **Validates: Requirements 3.5**

- [x] 5. Checkpoint - Ensure all shared widgets compile and tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Create HR/Payroll-specific widget components
  - [x] 6.1 Create `ApprovalsWidgetComponent`
    - Create in `src/app/features/field-resource-management/components/home/widgets/approvals-widget/`
    - Fetch approval counts from `DashboardDataService`
    - Display counts for pending timecards, expenses, travel requests, break requests
    - Implement loading/error/retry pattern
    - _Requirements: 5.1, 6.1, 6.2, 6.3, 6.4_

  - [x] 6.2 Create `TimecardReviewWidgetComponent`
    - Create in `src/app/features/field-resource-management/components/home/widgets/timecard-review-widget/`
    - Fetch pending timecards from `DashboardDataService`, sorted by `submittedAt` desc
    - Emit `@Output() timecardSelected`
    - _Requirements: 5.2, 6.1, 6.2, 6.3, 6.4_

  - [ ]* 6.3 Write property test for timecard sorting (Property 9)
    - **Property 9: Pending timecards are sorted by submission date descending**
    - **Validates: Requirements 5.2**

  - [x] 6.4 Create `ExpensesWidgetComponent`
    - Create in `src/app/features/field-resource-management/components/home/widgets/expenses-widget/`
    - Fetch pending expenses from `DashboardDataService`, sorted by `submittedAt` desc
    - Emit `@Output() expenseSelected`
    - _Requirements: 5.3, 6.1, 6.2, 6.3, 6.4_

  - [ ]* 6.5 Write property test for expenses sorting (Property 10)
    - **Property 10: Pending expenses are sorted by submission date descending**
    - **Validates: Requirements 5.3**

  - [x] 6.6 Create `TravelBreakPtoWidgetComponent`
    - Create in `src/app/features/field-resource-management/components/home/widgets/travel-break-pto-widget/`
    - Fetch summary from `DashboardDataService`
    - Display pending travel requests, break requests, PTO requests
    - _Requirements: 5.5, 6.1, 6.2, 6.3, 6.4_

- [x] 7. Checkpoint - Ensure all widget components compile
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Create role-specific dashboard components
  - [x] 8.1 Create `TechnicianDashboardComponent`
    - Create in `src/app/features/field-resource-management/components/home/dashboards/technician-dashboard/`
    - Compose: `QuickActionsWidgetComponent` (with technician actions: My Timecard, My Schedule, My Assignments, Map View), `AssignmentsWidgetComponent`, `TimecardWidgetComponent`, `ScheduleWidgetComponent`, `CurrentJobStatusWidgetComponent`
    - Use responsive grid layout: multi-column ≥769px, single-column ≤768px
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 7.1, 7.2, 7.3_

  - [x] 8.2 Create `AdminDashboardComponent`
    - Create in `src/app/features/field-resource-management/components/home/dashboards/admin-dashboard/`
    - Compose: `KpiSummaryCardComponent` (active jobs count, available techs count, utilization %), `QuickActionsWidgetComponent` (with admin actions: Create New Job, View All Jobs, Manage Technicians, Open Schedule, View Map, View Reports, Admin Panel), `ActiveJobsWidgetComponent`, `AvailableTechniciansWidgetComponent`, `RecentJobsWidgetComponent`
    - Use responsive grid layout
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 7.1, 7.2, 7.3_

  - [x] 8.3 Create `CmDashboardComponent`
    - Create in `src/app/features/field-resource-management/components/home/dashboards/cm-dashboard/`
    - Compose: `QuickActionsWidgetComponent` (with CM actions: Create New Job, View All Jobs, Open Schedule, View Map, My Timecard), `ActiveJobsWidgetComponent` (with `marketFilter` set to `user.market`), `RecentJobsWidgetComponent` (with `marketFilter` set to `user.market`)
    - Log `console.warn` when CM market is null/empty
    - Use responsive grid layout
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 7.1, 7.2, 7.3_

  - [x] 8.4 Create `HrPayrollDashboardComponent`
    - Create in `src/app/features/field-resource-management/components/home/dashboards/hr-payroll-dashboard/`
    - Compose: `QuickActionsWidgetComponent` (with HR/Payroll actions), `ApprovalsWidgetComponent`, `TimecardReviewWidgetComponent`, `ExpensesWidgetComponent`, `TravelBreakPtoWidgetComponent`
    - Use `FrmPermissionService` to restrict HR widget data to approval-related info
    - Show payroll-specific links (Pay Stubs, W-2, Direct Deposit, W-4) only for Payroll role
    - Use responsive grid layout
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 7.1, 7.2, 7.3_

  - [ ]* 8.5 Write property test for HR permission restrictions (Property 11)
    - **Property 11: HR role permissions are restricted to approval-only capabilities**
    - Verify that for HR role, `hasPermission` returns true only for approval keys
    - **Validates: Requirements 5.6**

  - [x] 8.6 Create `DefaultDashboardComponent`
    - Create in `src/app/features/field-resource-management/components/home/dashboards/default-dashboard/`
    - Display welcome message and `QuickActionsWidgetComponent` with basic navigation links
    - _Requirements: 1.6_

- [x] 9. Refactor HomeDashboardComponent as host
  - [x] 9.1 Refactor `HomeDashboardComponent` template to use `ngSwitch`
    - Replace existing template with role-switching container
    - Subscribe to `AuthService.getUserRole$()` for reactive role detection
    - Use `resolveDashboardView()` to map role to dashboard view
    - Render appropriate child dashboard via `ngSwitch` on `DashboardView`
    - Log `console.warn` when role is null/undefined
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [x] 9.2 Update `HomeDashboardComponent` TypeScript
    - Remove existing monolithic logic (metrics, recent jobs, assignments)
    - Add `currentView$: Observable<DashboardView>` derived from `AuthService.getUserRole$()`
    - Keep `UserRole` enum reference for template
    - _Requirements: 1.1, 1.7_

- [x] 10. Wire components into the FRM module
  - [x] 10.1 Declare all new components in the FRM module
    - Add all widget components, dashboard components to the appropriate module declarations
    - Import required Angular Material modules (`MatCardModule`, `MatButtonModule`, `MatIconModule`, `MatProgressSpinnerModule`, etc.)
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1_

  - [ ]* 10.2 Write integration tests for widget independence (Property 12)
    - **Property 12: Widget data loading independence**
    - Test that a failing widget does not prevent other widgets from rendering
    - Use Angular TestBed to simulate one widget error and verify others still load
    - **Validates: Requirements 6.4**

- [x] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests use `fast-check` and validate universal correctness properties from the design document
- All widgets follow the consistent loading/error/retry pattern defined in the design
- Existing FRM styling patterns (white cards, blue accents, `#f5f7fa` background, 12px border-radius) are reused throughout
- No routing changes needed — the existing `/field-resource-management/dashboard` route is preserved
