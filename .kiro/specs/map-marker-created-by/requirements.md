# Requirements Document

## Introduction

This document defines the requirements for displaying the creator of a street sheet within the Leaflet map marker popup. The `StreetSheet` model already contains a `createdBy` field populated by the backend. The feature adds this field to the popup content shown when a user clicks a map marker, with graceful handling when the value is missing.

## Glossary

- **Map_Marker_Popup**: The Leaflet popup element displayed when a user clicks a map marker, showing street sheet details.
- **StreetSheetMapComponent**: The Angular component responsible for rendering the Leaflet map and managing markers with popups.
- **createdBy**: An optional string field on the `StreetSheet` model representing the name or identifier of the user who created the street sheet.

## Requirements

### Requirement 1: Display Created By in Marker Popup

**User Story:** As a field user, I want to see who created a street sheet when I click its map marker, so that I can identify the author without navigating away from the map.

#### Acceptance Criteria

1. WHEN a map marker popup is displayed, THE Map_Marker_Popup SHALL include a "Created By" label and value line
2. WHEN the streetSheet.createdBy field contains a non-empty string, THE Map_Marker_Popup SHALL display that string as the "Created By" value
3. WHEN the streetSheet.createdBy field is undefined, null, or an empty string, THE Map_Marker_Popup SHALL display "N/A" as the "Created By" value

### Requirement 2: Preserve Existing Popup Content

**User Story:** As a field user, I want all existing street sheet information to remain visible in the map marker popup, so that I do not lose access to any current data.

#### Acceptance Criteria

1. WHEN a map marker popup is displayed, THE Map_Marker_Popup SHALL continue to show vendor name, segment, address, city, state, deployment, PM, and date fields
2. WHEN the "Created By" line is added, THE Map_Marker_Popup SHALL maintain the display order of all previously existing fields

### Requirement 3: No Backend or Model Changes

**User Story:** As a developer, I want the feature to use the existing `createdBy` field on the `StreetSheet` model, so that no backend or data model modifications are required.

#### Acceptance Criteria

1. THE StreetSheetMapComponent SHALL read the createdBy value directly from the existing StreetSheet model without requiring new API calls or model changes
