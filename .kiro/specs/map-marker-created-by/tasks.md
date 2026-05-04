# Implementation Plan: Map Marker Created By Display

## Overview

Add the `createdBy` field from the `StreetSheet` model into the Leaflet marker popup HTML in `StreetSheetMapComponent.addMarker()`. The field already exists on the model — this is a display-only change to the popup content string, with an "N/A" fallback for missing values.

## Tasks

- [x] 1. Add "Created By" line to the marker popup HTML
  - [x] 1.1 Update the `addMarker()` method in `src/app/components/street-sheet/street-sheet-map.component.ts`
    - Insert a `<b>Created By:</b>` line into the `popupContent` template literal, placed after the PM line and before the Date line
    - Use `streetSheet.createdBy || 'N/A'` for the value to handle undefined, null, or empty string cases
    - Do not modify any other popup fields or their order
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 3.1_

  - [ ]* 1.2 Write unit tests for the Created By popup display
    - Add tests in `src/app/components/street-sheet/street-sheet-map.component.spec.ts`
    - Test that popup HTML contains "Created By:" label when `createdBy` is set
    - Test that popup HTML shows the exact `createdBy` value when provided
    - Test that popup HTML shows "N/A" when `createdBy` is `undefined`
    - Test that popup HTML shows "N/A" when `createdBy` is an empty string
    - Test that all existing popup fields (vendor name, Segment, Address, City, State, Deployment, PM, Date) remain present
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2_

  - [ ]* 1.3 Write property test for Created By label presence
    - **Property 1: Created By label always present**
    - Use fast-check to generate arbitrary `StreetSheet` objects and verify the popup HTML always contains a "Created By:" label
    - **Validates: Requirement 1.1**

  - [ ]* 1.4 Write property test for non-empty createdBy value displayed verbatim
    - **Property 2: Non-empty createdBy value displayed verbatim**
    - Use fast-check to generate arbitrary non-empty strings for `createdBy` and verify the popup HTML contains that exact string
    - **Validates: Requirement 1.2**

  - [ ]* 1.5 Write property test for existing popup fields preserved
    - **Property 3: Existing popup fields preserved in order**
    - Use fast-check to generate arbitrary `StreetSheet` objects and verify all original field labels appear in the popup HTML in their original relative order
    - **Validates: Requirements 2.1, 2.2**

- [x] 2. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- The implementation is a single-line addition to an existing template literal — no new files, services, or model changes needed
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
