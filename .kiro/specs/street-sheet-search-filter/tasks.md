# Implementation Plan: Street Sheet Search & Filter

## Overview

Add a search/filter toolbar to the "Submitted Sheets" panel in the Street Sheet Dashboard. The toolbar includes a text search input, three dropdown filters (vendor, state, created-by), a clear button, and a result count. Filtering is client-side against `dashboardStreetSheets`, updating both the list and map markers in real-time.

## Tasks

- [x] 1. Add filter state properties and core filtering methods to StreetSheetComponent
  - [x] 1.1 Add new properties: `sheetSearchText`, `sheetFilterVendor`, `sheetFilterState`, `sheetFilterCreatedBy`, `displayedStreetSheets`
    - Initialize `displayedStreetSheets` to `[]` and populate it from `dashboardStreetSheets` after dashboard data loads
    - Wire `refreshDashboardData()` to call `applySheetSearchFilter()` so `displayedStreetSheets` stays in sync when dashboard-level filters change
    - _Requirements: 3.3, 8.1_

  - [x] 1.2 Implement `applySheetSearchFilter()` method
    - Filter `dashboardStreetSheets` by text search (case-insensitive substring across segmentId, vendorName, streetAddress, city, state, deployment, pm, createdBy)
    - Apply dropdown filters with AND logic (case-insensitive exact match on vendorName, state, createdBy)
    - Use optional chaining (`?.`) to safely handle null/undefined fields
    - Assign result to `displayedStreetSheets` and call `refreshMapMarkers()`
    - _Requirements: 1.2, 1.3, 1.4, 2.2, 2.3, 2.4, 2.5, 3.1, 7.1, 7.2_

  - [x] 1.3 Implement `clearSheetSearchFilter()` method
    - Reset `sheetSearchText`, `sheetFilterVendor`, `sheetFilterState`, `sheetFilterCreatedBy` to empty strings
    - Call `applySheetSearchFilter()` to restore full list
    - _Requirements: 4.2, 4.3_

  - [x] 1.4 Implement `hasActiveSheetFilter()` method
    - Return `true` if any filter value is non-empty (trim whitespace for search text)
    - _Requirements: 4.1, 4.4_

  - [x] 1.5 Modify `refreshMapMarkers()` to use `displayedStreetSheets` when sheet filters are active
    - Use `hasActiveSheetFilter()` to decide between `displayedStreetSheets` and `dashboardStreetSheets`
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ]* 1.6 Write unit tests for `applySheetSearchFilter()`
    - Test text search across all eight searchable fields
    - Test dropdown exact-match filtering for vendor, state, createdBy
    - Test combined text search + dropdown filters (AND logic)
    - Test empty/whitespace search text returns full list
    - Test null/undefined field handling does not throw errors
    - Test that `dashboardStreetSheets` is not mutated
    - _Requirements: 1.2, 1.3, 1.4, 2.2, 2.3, 2.4, 2.5, 3.1, 3.3, 7.1, 7.2, 8.2_

  - [ ]* 1.7 Write unit tests for `clearSheetSearchFilter()` and `hasActiveSheetFilter()`
    - Test clear resets all values and restores full list
    - Test `hasActiveSheetFilter()` returns correct boolean for various filter states
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 2. Checkpoint - Verify filtering logic
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Add search/filter toolbar UI to the template
  - [x] 3.1 Add the search input and dropdown filters above the Submitted Sheets list
    - Add a `mat-form-field` with text input bound to `sheetSearchText` via `[(ngModel)]` with `(ngModelChange)` calling `applySheetSearchFilter()`
    - Add three `mat-select` dropdowns for vendor (from `vendorOptions`), state (from `filteredLocations`), and created-by (from `uniqueCreatedByUsers`)
    - Bind each dropdown to its filter property and call `applySheetSearchFilter()` on `(selectionChange)`
    - _Requirements: 1.1, 2.1, 2.6, 2.7, 2.8_

  - [x] 3.2 Add clear button and result count display
    - Show a clear button (with `mat-icon` "clear") only when `hasActiveSheetFilter()` returns true, bound to `clearSheetSearchFilter()`
    - Display `displayedStreetSheets.length` as the result count
    - _Requirements: 4.1, 4.4, 5.1, 5.2_

  - [x] 3.3 Update the Submitted Sheets `*ngFor` to iterate `displayedStreetSheets` instead of `dashboardStreetSheets`
    - Change the sheet list iteration to use `displayedStreetSheets`
    - Show "No matching street sheets found." when `displayedStreetSheets` is empty and `hasActiveSheetFilter()` is true
    - _Requirements: 9.1_

- [x] 4. Add toolbar styles to the SCSS file
  - [x] 4.1 Add styles for the search/filter toolbar layout
    - Style the toolbar container as a flex/grid row above the sheets scroll area
    - Style the search input, dropdowns, clear button, and result count for consistent spacing
    - Ensure responsive behavior on mobile (stack vertically below 768px)
    - _Requirements: 1.1, 2.1_

- [x] 5. Checkpoint - Verify end-to-end UI behavior
  - Ensure all tests pass, ask the user if questions arise.

- [ ]* 6. Write property-based tests for filtering logic
  - [ ]* 6.1 Write property test for text search correctness
    - **Property 1: Text search returns only matching sheets**
    - **Validates: Requirement 1.2**

  - [ ]* 6.2 Write property test for dropdown filter correctness
    - **Property 2: Dropdown filters return only exact-matching sheets**
    - **Validates: Requirements 2.2, 2.3, 2.4, 2.5**

  - [ ]* 6.3 Write property test for subset property
    - **Property 3: Subset property**
    - **Validates: Requirement 3.3**

  - [ ]* 6.4 Write property test for identity property
    - **Property 4: Identity property**
    - **Validates: Requirements 1.3, 1.4, 4.3**

  - [ ]* 6.5 Write property test for filter commutativity
    - **Property 5: Filter commutativity**
    - **Validates: Requirement 3.2**

  - [ ]* 6.6 Write property test for filter idempotency
    - **Property 6: Filter idempotency**
    - **Validates: Requirement 3.4**

  - [ ]* 6.7 Write property test for clear resets to identity
    - **Property 7: Clear resets to identity**
    - **Validates: Requirements 4.2, 4.3**

  - [ ]* 6.8 Write property test for hasActiveSheetFilter correctness
    - **Property 8: hasActiveSheetFilter correctness**
    - **Validates: Requirements 4.1, 4.4**

  - [ ]* 6.9 Write property test for non-mutation of source array
    - **Property 10: Non-mutation of source array**
    - **Validates: Requirement 8.2**

  - [ ]* 6.10 Write property test for null-safe filtering
    - **Property 11: Null-safe filtering**
    - **Validates: Requirements 7.1, 7.2**

  - [ ]* 6.11 Write property test for case insensitivity
    - **Property 12: Case insensitivity**
    - **Validates: Requirements 1.2, 2.2, 2.3, 2.4**

- [x] 7. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- All filtering is client-side against the existing `dashboardStreetSheets` array — no new API calls needed
