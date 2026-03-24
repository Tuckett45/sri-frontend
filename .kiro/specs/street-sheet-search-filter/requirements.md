# Requirements Document

## Introduction

This document defines the requirements for adding a search and filter toolbar to the "Submitted Sheets" panel on the Street Sheet Dashboard. The toolbar enables users to quickly locate specific street sheets by typing a search term or selecting dropdown filters, with the list and map markers updating in real-time. All filtering is performed client-side against the existing `dashboardStreetSheets` array.

## Glossary

- **Search_Toolbar**: The UI region above the Submitted Sheets list containing the text search input, dropdown filters, clear button, and result count display
- **Filter_Engine**: The client-side logic that computes the displayed subset of street sheets based on active search text and dropdown filter values
- **Displayed_Sheets**: The filtered subset of `dashboardStreetSheets` shown in the Submitted Sheets list and reflected on the map
- **Dashboard_Sheets**: The full set of street sheets produced by the existing dashboard-level filters (date range, market, vendor, PM, CM)
- **Searchable_Fields**: The eight StreetSheet fields matched by text search: segmentId, vendorName, streetAddress, city, state, deployment, pm, createdBy
- **Map_Component**: The StreetSheetMapComponent responsible for rendering Leaflet map markers

## Requirements

### Requirement 1: Text Search Input

**User Story:** As a dashboard user, I want to type a search term and see the Submitted Sheets list filter in real-time, so that I can quickly find a specific street sheet without scrolling.

#### Acceptance Criteria

1. WHEN the Search_Toolbar is rendered, THE Search_Toolbar SHALL display a text input field with placeholder text indicating searchable fields
2. WHEN a user types a non-empty search term, THE Filter_Engine SHALL filter Dashboard_Sheets to include only sheets where at least one Searchable_Field contains the search term as a case-insensitive substring
3. WHEN a user clears the search text to an empty string, THE Filter_Engine SHALL include all Dashboard_Sheets in the Displayed_Sheets (assuming no dropdown filters are active)
4. WHEN the search text contains only whitespace characters, THE Filter_Engine SHALL treat the search text as empty and apply no text-based filtering

### Requirement 2: Dropdown Filters

**User Story:** As a dashboard user, I want to select a vendor, state, or created-by value from dropdown menus, so that I can narrow the Submitted Sheets list to an exact category.

#### Acceptance Criteria

1. WHEN the Search_Toolbar is rendered, THE Search_Toolbar SHALL display dropdown filters for vendor, state, and created-by fields
2. WHEN a user selects a vendor value from the vendor dropdown, THE Filter_Engine SHALL include only sheets where the vendorName field matches the selected value (case-insensitive exact match)
3. WHEN a user selects a state value from the state dropdown, THE Filter_Engine SHALL include only sheets where the state field matches the selected value (case-insensitive exact match)
4. WHEN a user selects a created-by value from the created-by dropdown, THE Filter_Engine SHALL include only sheets where the createdBy field matches the selected value (case-insensitive exact match)
5. WHEN multiple dropdown filters are active simultaneously, THE Filter_Engine SHALL combine all active filters using AND logic so that only sheets satisfying every active filter are included
6. THE vendor dropdown SHALL populate its options from the existing vendorOptions array
7. THE state dropdown SHALL populate its options from the existing filteredLocations array
8. THE created-by dropdown SHALL populate its options from the existing uniqueCreatedByUsers array

### Requirement 3: Combined Search and Filter

**User Story:** As a dashboard user, I want to use text search and dropdown filters together, so that I can perform precise lookups combining free-text and exact-match criteria.

#### Acceptance Criteria

1. WHEN both a text search term and one or more dropdown filters are active, THE Filter_Engine SHALL apply the text search first, then apply each active dropdown filter using AND logic to produce the Displayed_Sheets
2. THE Filter_Engine SHALL produce the same Displayed_Sheets regardless of the order in which filters are applied
3. THE Filter_Engine SHALL produce Displayed_Sheets that is always a subset of Dashboard_Sheets
4. WHEN the same filter values are applied multiple times, THE Filter_Engine SHALL produce identical Displayed_Sheets each time

### Requirement 4: Clear Filters

**User Story:** As a dashboard user, I want a clear button to reset all search and filter values at once, so that I can quickly return to the full unfiltered list.

#### Acceptance Criteria

1. WHILE any search text or dropdown filter is active, THE Search_Toolbar SHALL display a visible clear button
2. WHEN the user clicks the clear button, THE Filter_Engine SHALL reset the search text and all dropdown filter values to empty strings
3. WHEN the clear button is clicked, THE Filter_Engine SHALL set Displayed_Sheets equal to Dashboard_Sheets
4. WHEN no search text or dropdown filter is active, THE Search_Toolbar SHALL hide the clear button

### Requirement 5: Result Count Display

**User Story:** As a dashboard user, I want to see how many sheets match my current search and filter criteria, so that I can gauge the scope of my results at a glance.

#### Acceptance Criteria

1. THE Search_Toolbar SHALL display the count of sheets in Displayed_Sheets
2. WHEN filters change and Displayed_Sheets is updated, THE Search_Toolbar SHALL update the displayed count to reflect the new Displayed_Sheets length

### Requirement 6: Map Marker Synchronization

**User Story:** As a dashboard user, I want the map markers to update when I search or filter the sheets list, so that the map always reflects the same set of sheets I see in the list.

#### Acceptance Criteria

1. WHEN the Filter_Engine updates Displayed_Sheets, THE Map_Component SHALL clear all existing markers and render markers only for sheets in Displayed_Sheets
2. WHEN no sheet search filters are active, THE Map_Component SHALL display markers for all Dashboard_Sheets
3. WHEN Displayed_Sheets is empty, THE Map_Component SHALL display no markers

### Requirement 7: Null and Undefined Field Handling

**User Story:** As a dashboard user, I want the search and filter to work correctly even when some street sheet fields are missing, so that I get accurate results without errors.

#### Acceptance Criteria

1. WHEN a Searchable_Field on a street sheet is null or undefined, THE Filter_Engine SHALL skip that field during text search comparison without raising an error
2. WHEN a dropdown filter field (vendorName, state, or createdBy) on a street sheet is null or undefined, THE Filter_Engine SHALL treat the sheet as not matching that dropdown filter

### Requirement 8: Dashboard Filter Interaction

**User Story:** As a dashboard user, I want the sheet search filters to work correctly alongside the existing dashboard-level filters, so that both filter layers compose without conflict.

#### Acceptance Criteria

1. WHEN dashboard-level filters (date range, market, vendor, PM, CM) change, THE Filter_Engine SHALL re-apply the active sheet search filters against the updated Dashboard_Sheets
2. THE Filter_Engine SHALL not mutate the Dashboard_Sheets array during filtering

### Requirement 9: Empty Results Display

**User Story:** As a dashboard user, I want to see a clear message when no sheets match my search criteria, so that I know the filters are working and there are simply no matches.

#### Acceptance Criteria

1. WHEN Displayed_Sheets is empty due to active filters, THE Search_Toolbar SHALL display a message indicating no matching street sheets were found
