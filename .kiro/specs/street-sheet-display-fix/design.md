# Street Sheet Display Fix — Bugfix Design

## Overview

The "Submitted Sheets" side panel on the Street Sheet Dashboard displays only a handful of sheets (typically ~3) because the dashboard date filter defaults both `dashboardStartDate` and `dashboardEndDate` to today. However, the `StreetSheetService.getStreetSheets()` method fetches sheets from the last 10 days by default. The mismatch means `applyDashboardFiltersInternal()` filters out every sheet not dated today, leaving the panel nearly empty.

The fix aligns the component's default `dashboardStartDate` with the service's 10-day fetch window so that all fetched sheets pass the dashboard date filter on initial load. The same alignment must be applied in `clearDashboardFilters()` to keep the "Reset" button consistent.

## Glossary

- **Bug_Condition (C)**: The dashboard loads (or resets) with default filters and `dashboardStartDate` equals today, causing sheets from the previous 1–9 days to be excluded from `dashboardStreetSheets`.
- **Property (P)**: When the dashboard loads with default filters, `dashboardStartDate` should be 10 days before today so that all fetched sheets appear in the "Submitted Sheets" panel.
- **Preservation**: Custom date ranges, vendor/PM/market/CM filters, map interactions, CM summary tables, and pagination must continue to work exactly as before.
- **`applyDashboardFiltersInternal()`**: The method in `street-sheet.component.ts` that filters `this.streetSheets` by date range and other criteria to produce `dashboardStreetSheets`.
- **`getStreetSheets()`**: The service method in `street-sheet.service.ts` that fetches sheets from the API using a default 10-day window when no dates are supplied.
- **`dashboardStartDate` / `dashboardEndDate`**: Component properties that define the active date range for the dashboard filter. Bound to the date pickers in the template.

## Bug Details

### Bug Condition

The bug manifests when the dashboard initializes (or the user clicks "Reset") and the default `dashboardStartDate` is set to today. The service fetches sheets from the last 10 days, but `applyDashboardFiltersInternal()` then filters them down to only today's sheets, discarding the majority.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { dashboardStartDate: Date, dashboardEndDate: Date, fetchedSheets: StreetSheet[] }
  OUTPUT: boolean

  LET today = startOfDay(new Date())
  LET startDate = startOfDay(input.dashboardStartDate)

  RETURN startDate == today
         AND input.fetchedSheets contains sheets with dates before today
         AND those sheets are excluded from dashboardStreetSheets
END FUNCTION
```

### Examples

- **Example 1**: Today is June 25. Service fetches 30 sheets from June 15–25. `dashboardStartDate` = June 25. Only 3 sheets from June 25 appear in the panel. Expected: all 30 sheets appear.
- **Example 2**: Today is June 25. Service fetches 10 sheets, all from June 20. `dashboardStartDate` = June 25. Panel shows 0 sheets. Expected: all 10 sheets appear.
- **Example 3**: User clicks "Reset". `dashboardStartDate` resets to today. Panel shrinks from showing many sheets to only today's. Expected: panel shows last 10 days of sheets.
- **Edge case**: No sheets exist in the last 10 days. Panel correctly shows "No street sheets found." — this behavior is unchanged.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Custom date range filtering via the date pickers must continue to restrict `dashboardStreetSheets` to the user-selected range
- Vendor, PM, market, and CM dropdown filters must continue to narrow results within the active date range
- Clicking "Reset" must clear all dropdown filters and reset dates to defaults, then refresh
- Clicking a sheet row in the "Submitted Sheets" panel must center the map and open the popup
- CM "Submitted" and "Missing" tables must continue to paginate with their existing controls
- The `sheets-scroll` container in the template must continue to provide scrollable overflow for the sheet list

**Scope:**
All inputs that do NOT involve the default date initialization are completely unaffected by this fix. This includes:
- User-selected custom date ranges
- All dropdown filter interactions (vendor, PM, market, CM)
- Map marker interactions and location navigation
- Sheet creation, editing, and deletion flows
- Non-admin user filtering by `createdBy`

## Hypothesized Root Cause

Based on the code analysis, the root cause is confirmed:

1. **Mismatched Default Date Range**: In `ngOnInit()`, line `this.dashboardStartDate = this.startOfDay(new Date())` sets the start date to today. The service's `getStreetSheets()` defaults to `new Date(endDate.getTime() - 10 * 24 * 60 * 60 * 1000)` (10 days ago). This mismatch means the component's filter window is 1 day while the fetched data spans 10 days.

2. **Same Issue in `clearDashboardFilters()`**: The reset method also sets `this.dashboardStartDate = this.startOfDay(new Date())`, reproducing the same mismatch after a reset.

3. **No Other Contributing Factors**: The `applyDashboardFiltersInternal()` method and `isWithinRange()` helper work correctly — they faithfully filter by whatever date range is set. The template's `sheets-scroll` container already handles overflow. The bug is purely a default-value issue.

## Correctness Properties

Property 1: Bug Condition — Default Date Range Matches Service Fetch Window

_For any_ dashboard initialization or reset where no custom date range has been set, the component SHALL set `dashboardStartDate` to 10 days before today (matching the service's default fetch window), so that all fetched sheets pass the date filter and appear in the "Submitted Sheets" panel.

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation — Custom Filters Continue to Work

_For any_ user interaction that sets a custom date range or applies vendor/PM/market/CM filters, the component SHALL produce the same filtered `dashboardStreetSheets` result as the original code, preserving all existing filter behavior.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

**File**: `src/app/components/street-sheet/street-sheet.component.ts`

**Function**: `ngOnInit()`

**Specific Changes**:
1. **Change default `dashboardStartDate`**: Replace `this.dashboardStartDate = this.startOfDay(new Date())` with a date 10 days in the past:
   ```typescript
   const today = new Date();
   this.dashboardEndDate = this.endOfDay(today);
   this.dashboardStartDate = this.startOfDay(new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000));
   ```

**Function**: `clearDashboardFilters()`

**Specific Changes**:
2. **Align reset behavior**: Replace `this.dashboardStartDate = this.startOfDay(new Date())` with the same 10-day-ago calculation:
   ```typescript
   const today = new Date();
   this.dashboardStartDate = this.startOfDay(new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000));
   this.dashboardEndDate = this.endOfDay(today);
   ```

**File**: `src/app/components/street-sheet/street-sheet.component.html`

3. **No template changes required**: The `sheets-scroll` container already provides scrollable overflow for the sheet list. With the corrected date range, all fetched sheets will render inside the existing scrollable panel.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm that the default date range mismatch causes sheets to be filtered out.

**Test Plan**: Write tests that instantiate `StreetSheetComponent`, mock the service to return sheets spanning the last 10 days, and assert on the length of `dashboardStreetSheets` after `ngOnInit()` completes. Run on UNFIXED code to observe failures.

**Test Cases**:
1. **Default Load Test**: Mock 20 sheets across 10 days. After `ngOnInit()`, check `dashboardStreetSheets.length`. On unfixed code, only today's sheets appear (will fail assertion expecting all 20).
2. **Reset Test**: After widening the date range manually, click "Reset" (`clearDashboardFilters()`). On unfixed code, `dashboardStreetSheets` shrinks to today-only (will fail).
3. **No Sheets Today Test**: Mock 15 sheets, none from today. On unfixed code, `dashboardStreetSheets` is empty (will fail expecting 15).
4. **All Sheets Today Test**: Mock 5 sheets, all from today. On unfixed code, all 5 appear (will pass — edge case where bug is not visible).

**Expected Counterexamples**:
- `dashboardStreetSheets.length` is much smaller than `streetSheets.length` when sheets span multiple days
- Possible cause confirmed: `dashboardStartDate` defaults to today, excluding older sheets

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := ngOnInit_fixed(input)
  ASSERT dashboardStreetSheets contains all sheets from last 10 days
  ASSERT dashboardStartDate == startOfDay(today - 10 days)
  ASSERT dashboardEndDate == endOfDay(today)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT applyDashboardFiltersInternal_original(input) = applyDashboardFiltersInternal_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many date range and filter combinations automatically
- It catches edge cases around date boundaries and timezone offsets
- It provides strong guarantees that custom filter behavior is unchanged

**Test Plan**: Observe behavior on UNFIXED code for custom date ranges and filter combinations, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Custom Date Range Preservation**: Set `dashboardStartDate` to 5 days ago and `dashboardEndDate` to 2 days ago. Verify `applyDashboardFiltersInternal()` returns the same sheets before and after the fix.
2. **Dropdown Filter Preservation**: Apply vendor/PM/market/CM filters with a custom date range. Verify filtered results are identical before and after the fix.
3. **Map Interaction Preservation**: Click a sheet in the panel. Verify `selectStreetSheet()` still centers the map and opens the popup.
4. **CM Table Preservation**: Verify `cmsWithEntries` and `cmsWithoutEntries` pagination continues to work with the same data.

### Unit Tests

- Test that `ngOnInit()` sets `dashboardStartDate` to 10 days ago and `dashboardEndDate` to end of today
- Test that `clearDashboardFilters()` resets dates to the same 10-day default
- Test that `applyDashboardFiltersInternal()` includes sheets from all 10 days when using default dates
- Test edge case: no sheets in the 10-day window returns empty array

### Property-Based Tests

- Generate random sets of sheets with dates spanning 0–30 days ago; verify that with default dates, all sheets within the 10-day window appear in `dashboardStreetSheets`
- Generate random custom date ranges; verify `applyDashboardFiltersInternal()` produces identical results before and after the fix
- Generate random filter combinations (vendor, PM, market, CM) with fixed date ranges; verify preservation

### Integration Tests

- Test full dashboard load flow: service returns 10-day data, component initializes, panel shows all sheets
- Test reset flow: user sets custom filters, clicks "Reset", panel returns to showing all 10-day sheets
- Test that scrolling works in the `sheets-scroll` container when many sheets are displayed
