# Requirements Document

## Introduction

This document defines the requirements for the Onboarding Technician Actions feature, which adds row-level action buttons to the Tech Credentials list page and builds out the Technician Onboarding Detail page as a unified hub for managing a technician's full onboarding lifecycle. The feature enables Construction Managers to quickly navigate to common onboarding tasks (view checklist, add credential, assign equipment) directly from the list, and provides a cohesive detail page that composes existing section components with an onboarding progress header.

## Glossary

- **Credentials_List_Page**: The CredentialsListComponent that displays all technicians with their credential summaries in a table format
- **Detail_Page**: The CredentialDetailComponent that serves as the unified Technician Onboarding Detail page
- **Progress_Header**: The OnboardingProgressHeaderComponent that displays onboarding completion percentage and status indicators
- **Equipment_Section**: The EquipmentSectionComponent that manages equipment assignments for a technician
- **Competency_Section**: The CompetencySectionComponent that manages technical competencies for a technician
- **PRC_Section**: The PRCSectionComponent that manages Performance Review Cycle records and goals
- **Checklist_Delta**: The computed difference between a role's required onboarding items and the technician's on-file items
- **Role_Template**: The RoleCredentialTemplate that defines required onboarding items per technician role
- **Row_Action**: A contextual action button displayed in the Actions column of a technician row
- **TechnicianService**: The Angular service responsible for all HTTP communication with the backend API
- **Completion_Percentage**: A numeric value (0–100) representing the ratio of completed onboarding items to total required items

## Requirements

### Requirement 1: Row Action Display

**User Story:** As a Construction Manager, I want to see contextual action buttons on each technician row in the credentials list, so that I can quickly navigate to common onboarding tasks without opening the detail page first.

#### Acceptance Criteria

1. WHEN the Credentials_List_Page renders a technician row, THE Credentials_List_Page SHALL display Row_Action buttons in the Actions column for that row
2. WHEN a Row_Action's visibility condition evaluates to false for a given technician summary, THE Credentials_List_Page SHALL hide that Row_Action for that row
3. THE Credentials_List_Page SHALL preserve the defined ordering of Row_Action buttons regardless of which actions are visible
4. WHEN a Row_Action button is rendered, THE Credentials_List_Page SHALL include an aria-label attribute that identifies the technician by name and the action purpose

### Requirement 2: Row Action Navigation

**User Story:** As a Construction Manager, I want each row action button to navigate me to the correct page or section, so that I can perform onboarding tasks efficiently.

#### Acceptance Criteria

1. WHEN a user clicks the "View Detail" Row_Action, THE Credentials_List_Page SHALL navigate to the Detail_Page for that technician
2. WHEN a user clicks the "View Checklist" Row_Action, THE Credentials_List_Page SHALL navigate to the Onboarding Checklist page for that technician
3. WHEN a user clicks the "Add Credential" Row_Action, THE Credentials_List_Page SHALL navigate to the Credential Form page for that technician
4. WHEN a user clicks the "Assign Equipment" Row_Action, THE Credentials_List_Page SHALL navigate to the Detail_Page with a query parameter indicating the equipment section
5. WHEN a user clicks any Row_Action button, THE Credentials_List_Page SHALL stop event propagation to prevent the row-click handler from firing

### Requirement 3: Detail Page Data Loading

**User Story:** As a Construction Manager, I want the technician detail page to load all onboarding data in parallel, so that I can see the complete onboarding status without waiting for sequential requests.

#### Acceptance Criteria

1. WHEN the Detail_Page initializes with a valid technician ID, THE Detail_Page SHALL load the technician record from TechnicianService
2. WHEN the technician record is loaded, THE Detail_Page SHALL load certifications, equipment, competencies, and PRC data in parallel using forkJoin
3. WHEN all parallel data loads complete, THE Detail_Page SHALL fetch the Role_Template for the technician's role
4. WHEN the Role_Template is loaded, THE Detail_Page SHALL compute the Checklist_Delta from the template and on-file data
5. IF any HTTP request in the data loading sequence fails, THEN THE Detail_Page SHALL display a user-friendly error message and a retry button
6. WHILE data is loading, THE Detail_Page SHALL display a loading indicator

### Requirement 4: Onboarding Progress Display

**User Story:** As a Construction Manager, I want to see a progress header showing onboarding completion status, so that I can quickly assess how far along a technician is in their onboarding process.

#### Acceptance Criteria

1. WHEN the Checklist_Delta is computed, THE Progress_Header SHALL display the Completion_Percentage as a progress bar
2. WHEN the Checklist_Delta is computed, THE Progress_Header SHALL display counts of complete, missing, and expired items
3. WHEN the Completion_Percentage equals 100 and no items are expired, THE Progress_Header SHALL display a "Ready to Start" badge
4. WHEN the technician has a PRC with status "overdue", THE Progress_Header SHALL display an overdue indicator
5. WHEN the technician has a PRC with status "upcoming", THE Progress_Header SHALL display an upcoming indicator
6. IF the Role_Template is not found for the technician's role, THEN THE Detail_Page SHALL hide the Progress_Header and display an informational message

### Requirement 5: Checklist Delta Computation

**User Story:** As a Construction Manager, I want the onboarding checklist to accurately reflect which items are complete, missing, or expired, so that I can track onboarding progress reliably.

#### Acceptance Criteria

1. THE Checklist_Delta SHALL produce a total item count equal to the number of required items in the Role_Template
2. THE Checklist_Delta SHALL partition all items into exactly one of three statuses: complete, missing, or expired
3. THE Checklist_Delta SHALL compute Completion_Percentage as the ratio of complete items to total items, bounded between 0 and 100
4. WHEN the Role_Template has zero required items, THE Checklist_Delta SHALL return a Completion_Percentage of 100
5. WHEN a credential is on-file but expired relative to the reference date, THE Checklist_Delta SHALL classify that item as expired rather than complete

### Requirement 6: Section Navigation

**User Story:** As a Construction Manager, I want to navigate directly to a specific section on the detail page, so that I can quickly access the relevant onboarding area without scrolling manually.

#### Acceptance Criteria

1. WHEN the Detail_Page loads with a query parameter specifying a section, THE Detail_Page SHALL scroll to that section after rendering
2. WHEN the Detail_Page scrolls to a section, THE Detail_Page SHALL set focus on the section element for keyboard accessibility
3. IF the specified section element does not exist in the DOM, THEN THE Detail_Page SHALL perform no scroll action

### Requirement 7: Equipment Assignment

**User Story:** As a Construction Manager, I want to assign equipment to a technician with uniqueness validation, so that no two technicians are assigned the same asset.

#### Acceptance Criteria

1. WHEN a user submits an equipment assignment form, THE Equipment_Section SHALL validate asset identifier uniqueness before creating the assignment
2. IF the asset identifier is not unique, THEN THE Equipment_Section SHALL display an inline validation error and prevent submission
3. WHEN the asset identifier is unique and the form is valid, THE Equipment_Section SHALL create the equipment assignment via TechnicianService
4. WHEN an equipment assignment is created successfully, THE Equipment_Section SHALL emit a change event to trigger parent data reload
5. WHEN a user updates equipment status to "returned" or "lost", THE Equipment_Section SHALL persist the status change and emit a change event

### Requirement 8: Data Synchronization

**User Story:** As a Construction Manager, I want the detail page to stay in sync when I make changes in any section, so that the progress header always reflects the current onboarding state.

#### Acceptance Criteria

1. WHEN any child section component emits a change event, THE Detail_Page SHALL reload all onboarding data
2. WHEN data is reloaded after a change event, THE Detail_Page SHALL recompute the Checklist_Delta and update the Progress_Header
3. THE Detail_Page SHALL ensure that adding a valid credential or equipment assignment does not decrease the Completion_Percentage

### Requirement 9: Error Recovery

**User Story:** As a Construction Manager, I want clear error messages and recovery options when something goes wrong, so that I can resolve issues without losing my work.

#### Acceptance Criteria

1. IF the technician ID in the route does not correspond to an existing technician, THEN THE Detail_Page SHALL display a "Technician not found" message with a back-to-list navigation button
2. IF a credential deletion request fails, THEN THE Detail_Page SHALL display an error banner with a retry option and preserve the credential in the list
3. IF the data reload after a change event fails, THEN THE Detail_Page SHALL display an error message while preserving the previously loaded data

### Requirement 10: Conditional Action Visibility

**User Story:** As a Construction Manager, I want action buttons to appear only when relevant, so that the interface remains clean and I am guided toward actions that still need to be performed.

#### Acceptance Criteria

1. WHEN a technician's Completion_Percentage is 100, THE Credentials_List_Page SHALL hide the "Add Credential" Row_Action for that technician
2. WHEN a technician's Completion_Percentage is 100, THE Credentials_List_Page SHALL hide the "Assign Equipment" Row_Action for that technician
3. THE Credentials_List_Page SHALL always display the "View Detail" and "View Checklist" Row_Action buttons regardless of completion status
