# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Default Date Range Shows Only Today's Sheets
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to the concrete failing case: dashboard initializes with default filters while service returns sheets spanning 10 days
  - Write a test in `src/app/components/street-sheet/street-sheet.component.spec.ts` that:
    - Creates the `StreetSheetComponent` with mocked `StreetSheetService` returning sheets spanning the last 10 days (e.g., 20 sheets across June 15–25)
    - Calls `ngOnInit()` and waits for data to load
    - Asserts `component.dashboardStartDate` equals `startOfDay(today - 10 days)` (not today)
    - Asserts `component.dashboardEndDate` equals `endOfDay(today)`
    - Asserts `component.dashboardStreetSheets.length` equals the total number of fetched sheets (all 20, not just today's ~3)
  - Also test `clearDashboardFilters()`: after manually widening the date range, call `clearDashboardFilters()` and assert `dashboardStartDate` resets to 10 days ago (not today)
  - Run test on UNFIXED code - expect FAILURE (this confirms the bug exists)
  - **EXPECTED OUTCOME**: Test FAILS because `dashboardStartDate` defaults to today, excluding sheets from previous days
  - Document counterexamples found (e.g., "dashboardStartDate is today instead of 10 days ago; dashboardStreetSheets.length is 3 instead of 20")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 2.1, 2.2_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Custom Filters and Existing Behavior Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Write tests in `src/app/components/street-sheet/street-sheet.component.spec.ts` that:
    - Observe: when user sets a custom date range (e.g., 5 days ago to 2 days ago), `applyDashboardFiltersInternal()` returns only sheets within that range on unfixed code
    - Observe: when vendor filter is set, only sheets matching that vendor appear on unfixed code
    - Observe: when PM filter is set, only sheets matching that PM appear on unfixed code
    - Observe: when market filter is set, only sheets matching that market appear on unfixed code
    - Observe: when CM filter is set, only sheets created by that CM appear on unfixed code
    - Observe: `selectStreetSheet()` calls `centerMapOnStreetSheet()` and `openStreetSheetPopup()` on unfixed code
    - Observe: CM summary table pagination (`pagedSubmitted`, `pagedMissing`) works correctly on unfixed code
  - Write property-based tests capturing observed behavior:
    - For any custom date range where `dashboardStartDate != today` (non-bug-condition), `applyDashboardFiltersInternal()` filters sheets to only those within the custom range
    - For any combination of dropdown filters (vendor, PM, market, CM), the filtered results match the intersection of all active filters
    - `clearDashboardFilters()` resets all dropdown filters to empty strings
  - Verify all preservation tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix default dashboardStartDate to 10 days ago

  - [x] 3.1 Update `ngOnInit()` default date range in `street-sheet.component.ts`
    - Change `this.dashboardStartDate = this.startOfDay(new Date())` to set `dashboardStartDate` to 10 days before today
    - Replace with:
      ```typescript
      const today = new Date();
      this.dashboardEndDate = this.endOfDay(today);
      this.dashboardStartDate = this.startOfDay(new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000));
      ```
    - _Bug_Condition: isBugCondition(input) where dashboardStartDate == today on init, causing sheets from previous 1-9 days to be excluded_
    - _Expected_Behavior: dashboardStartDate = startOfDay(today - 10 days), dashboardEndDate = endOfDay(today), all fetched sheets appear in panel_
    - _Preservation: Custom date ranges, dropdown filters, map interactions, CM tables, pagination unchanged_
    - _Requirements: 1.1, 1.2, 2.1, 2.2_

  - [x] 3.2 Update `clearDashboardFilters()` default date range in `street-sheet.component.ts`
    - Change `this.dashboardStartDate = this.startOfDay(new Date())` to set `dashboardStartDate` to 10 days before today
    - Replace with:
      ```typescript
      const today = new Date();
      this.dashboardStartDate = this.startOfDay(new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000));
      this.dashboardEndDate = this.endOfDay(today);
      ```
    - _Bug_Condition: isBugCondition(input) where dashboardStartDate == today on reset, causing sheets from previous 1-9 days to be excluded_
    - _Expected_Behavior: dashboardStartDate = startOfDay(today - 10 days), dashboardEndDate = endOfDay(today), all fetched sheets reappear after reset_
    - _Preservation: clearDashboardFilters() still resets all dropdown filters to empty strings and calls applyDashboardFilters()_
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.3_

  - [x] 3.3 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Default Date Range Shows All Fetched Sheets
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed — `dashboardStartDate` is now 10 days ago and all fetched sheets appear)
    - _Requirements: 2.1, 2.2_

  - [x] 3.4 Verify preservation tests still pass
    - **Property 2: Preservation** - Custom Filters and Existing Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions — custom date ranges, dropdown filters, map interactions, CM tables all work as before)
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
