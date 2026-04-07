# Bugfix Requirements Document

## Introduction

The Street Sheet Dashboard's "Submitted Sheets" side panel only displays a small subset of submitted street sheets (e.g., 3 instead of all). This occurs because the dashboard date filter defaults to today only, so `dashboardStreetSheets` — which the panel iterates over — contains only sheets submitted today. Users expect the panel to show all sheets matching the current filter context, and to be able to scroll or paginate through them when the list is large. Additionally, the panel lacks pagination, making it difficult to navigate when many sheets are present.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the dashboard loads with default filters THEN the system sets both `dashboardStartDate` and `dashboardEndDate` to today, causing the "Submitted Sheets" panel to display only street sheets submitted on the current day rather than all fetched sheets

1.2 WHEN the user has not changed the default date range and there are submitted sheets from previous days within the 10-day service fetch window THEN the system excludes those sheets from the "Submitted Sheets" panel because `applyDashboardFiltersInternal()` filters them out by the today-only date range

1.3 WHEN the dashboard date range is widened and many sheets match the filter THEN the "Submitted Sheets" panel renders all matching sheets in a single unpaginated list with no way to navigate through a large number of results

### Expected Behavior (Correct)

2.1 WHEN the dashboard loads with default filters THEN the system SHALL set the default date range to cover the full service fetch window (last 10 days through today) so that the "Submitted Sheets" panel displays all recently fetched street sheets

2.2 WHEN the user has not changed the default date range THEN the system SHALL display all street sheets fetched by the service (within the default 10-day window) in the "Submitted Sheets" panel

2.3 WHEN the number of sheets in the "Submitted Sheets" panel exceeds the page size THEN the system SHALL provide pagination controls (or a scrollable container with a reasonable max height) so the user can navigate through all matching sheets

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the user manually sets a custom date range via the dashboard filters THEN the system SHALL CONTINUE TO filter `dashboardStreetSheets` to only sheets within that custom range

3.2 WHEN the user applies vendor, PM, market, or CM filters THEN the system SHALL CONTINUE TO filter the "Submitted Sheets" panel results by those criteria in addition to the date range

3.3 WHEN the user clicks "Reset" THEN the system SHALL CONTINUE TO reset all filters to their defaults and refresh the dashboard data

3.4 WHEN the user clicks a sheet in the "Submitted Sheets" panel THEN the system SHALL CONTINUE TO center the map on that sheet's location and open its popup

3.5 WHEN the "Submitted" CM summary table and "Missing" CM table are displayed THEN the system SHALL CONTINUE TO paginate those tables using their existing pagination controls
