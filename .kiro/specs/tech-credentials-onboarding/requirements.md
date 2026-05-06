# Requirements Document

## Introduction

This feature integrates credential management, onboarding tracking, equipment management, technical competency verification, and performance review cycle (PRC) scheduling for current technicians into the existing Onboarding workflow. Today, the onboarding module manages candidates through offer stages and tracks basic certification booleans (drug test, OSHA). The Technician model already supports rich Certification objects (with issue dates, expiration dates, and status). This feature bridges the gap by:

1. Adding a "Tech Credentials" tab to the Onboarding navigation for generic credential CRUD (Requirements 1–10).
2. Expanding the credential model to support typed credentials with type-specific fields (Drivers License, Drug Screen, OSHA Training Cert, Offer Letter, Background Check, SSN last four) via a configurable, extensible credential type registry (Requirement 11).
3. Providing an onboarding checklist that compares required credentials per role against what a technician already has on file, surfacing gaps (Requirement 12).
4. Tracking equipment assignments such as badges and laptops (Requirement 13).
5. Recording and verifying technical competencies such as OTDR Knowledge and Fiber Optic Characterization (Requirement 14).
6. Managing PRC goals with a 60-day timer from hire date or last PRC date (Requirement 15).

## Glossary

- **Onboarding_Module**: The Angular module that manages the candidate onboarding workflow, including navigation, candidate list, candidate form, and pipeline dashboard.
- **Credentials_Tab**: A new tab within the Onboarding navigation that provides access to technician credential management.
- **Credential**: A certification, license, or training record associated with a technician, containing a name, issue date, expiration date, and status.
- **Credential_Type**: A classification for credentials that determines type-specific fields and validation rules. Initial supported types: Drivers_License, Drug_Screen, OSHA_Training_Cert, Offer_Letter, Background_Check, SSN_Last_Four. The list is extensible via the Credential_Type_Registry.
- **Credential_Type_Registry**: A configurable data store that defines available credential types and their associated field configurations, allowing administrators to add new credential types without code changes.
- **Credential_Status**: The current state of a credential: Active, ExpiringSoon, or Expired.
- **Technician**: An existing field resource with skills, certifications, and availability records.
- **Credentials_List_View**: The component that displays all technicians and their credential statuses in a filterable list.
- **Credential_Form**: The component used to add or edit a credential for a specific technician.
- **Onboarding_Nav**: The navigation component within the Onboarding module that provides tab-based routing to child views.
- **Onboarding_Service**: The service responsible for HTTP communication related to onboarding operations.
- **Technician_Service**: The existing service that handles CRUD operations for technicians, including certifications.
- **Role_Credential_Template**: A configuration that defines which credentials, equipment, and competencies are required for a specific technician role or position.
- **Onboarding_Checklist**: A view that compares a technician's on-file credentials against the Role_Credential_Template, displaying which items are complete and which are missing (the "delta").
- **Delta**: The difference between what credentials and items are required for a technician's role and what the technician already has on file.
- **Equipment_Assignment**: A tracked piece of equipment (badge, laptop, or other hardware) issued to a technician, with assignment date, return status, and asset identifier.
- **Technical_Competency**: A verified skill or knowledge area (such as OTDR Knowledge or Fiber Optic Characterization) that a technician has demonstrated, with verification date and verifier information.
- **PRC**: Performance Review Cycle — a recurring evaluation process for technicians with goals and a 60-day cadence from hire date or last PRC completion date.
- **PRC_Goal**: A specific, measurable objective assigned to a technician as part of a Performance Review Cycle.
- **PRC_Due_Date**: The date by which the next PRC must be completed, calculated as 60 days from hire date (for first PRC) or 60 days from the last PRC completion date.

## Requirements

### Requirement 1: Credentials Tab in Onboarding Navigation

**User Story:** As an operations manager, I want a "Tech Credentials" tab in the onboarding navigation, so that I can access credential management without leaving the onboarding workflow.

#### Acceptance Criteria

1. THE Onboarding_Nav SHALL display a "Tech Credentials" tab after the existing "Pipeline Dashboard" tab.
2. WHEN a user clicks the "Tech Credentials" tab, THE Onboarding_Module SHALL navigate to the Credentials_List_View.
3. THE Credentials_Tab SHALL use the same visual styling and active-state indicators as the existing navigation tabs.
4. THE Onboarding_Nav SHALL maintain the existing "Candidate List" and "Pipeline Dashboard" tabs without modification.

### Requirement 2: Technician Credentials List View

**User Story:** As an operations manager, I want to see a list of technicians with their credential statuses, so that I can identify who needs credential updates.

#### Acceptance Criteria

1. WHEN the Credentials_List_View loads, THE Credentials_List_View SHALL display all technicians with their name, email, region, and credential summary.
2. THE Credentials_List_View SHALL display the count of Active, ExpiringSoon, and Expired credentials for each technician.
3. WHEN a user enters text in the search field, THE Credentials_List_View SHALL filter technicians by name or email within 300ms of the last keystroke.
4. WHEN a user selects a credential status filter, THE Credentials_List_View SHALL display only technicians who have at least one credential matching the selected Credential_Status.
5. WHEN no technicians match the applied filters, THE Credentials_List_View SHALL display a message stating "No technicians match the current filters."
6. THE Credentials_List_View SHALL indicate technicians who have zero credentials with a visual "No Credentials" badge.

### Requirement 3: View Technician Credentials Detail

**User Story:** As an operations manager, I want to view all credentials for a specific technician, so that I can review their certification history and status.

#### Acceptance Criteria

1. WHEN a user selects a technician from the Credentials_List_View, THE Onboarding_Module SHALL navigate to a detail view showing all credentials for that technician.
2. THE Credential detail view SHALL display each credential with its name, issue date, expiration date, and Credential_Status.
3. THE Credential detail view SHALL visually distinguish credentials by status using color coding: green for Active, amber for ExpiringSoon, and red for Expired.
4. THE Credential detail view SHALL sort credentials with Expired first, then ExpiringSoon, then Active.
5. WHEN a technician has no credentials, THE Credential detail view SHALL display a message stating "No credentials on file" and a button to add a new credential.

### Requirement 4: Add a New Credential

**User Story:** As an operations manager, I want to add a new credential to a technician, so that I can record their certifications and licenses.

#### Acceptance Criteria

1. WHEN a user clicks the "Add Credential" button, THE Onboarding_Module SHALL display the Credential_Form with empty fields.
2. THE Credential_Form SHALL require the user to provide a credential name, issue date, and expiration date.
3. WHEN the user submits a valid Credential_Form, THE Technician_Service SHALL persist the new credential and THE Credential_Form SHALL navigate back to the technician credential detail view.
4. IF the user submits the Credential_Form with missing required fields, THEN THE Credential_Form SHALL display inline validation messages identifying each missing field.
5. IF the user provides an expiration date earlier than the issue date, THEN THE Credential_Form SHALL display a validation error stating "Expiration date must be after issue date."
6. WHEN the credential is saved successfully, THE Credentials_List_View SHALL reflect the updated credential count for that technician.

### Requirement 5: Edit an Existing Credential

**User Story:** As an operations manager, I want to edit an existing credential, so that I can correct errors or update expiration dates.

#### Acceptance Criteria

1. WHEN a user clicks the "Edit" action on a credential, THE Onboarding_Module SHALL display the Credential_Form pre-populated with the existing credential data.
2. WHEN the user submits a valid updated Credential_Form, THE Technician_Service SHALL persist the changes and THE Credential_Form SHALL navigate back to the technician credential detail view.
3. IF the user has unsaved changes and attempts to navigate away, THEN THE Credential_Form SHALL display a confirmation dialog asking "You have unsaved changes. Are you sure you want to leave?"
4. THE Credential_Form SHALL compute and display the Credential_Status based on the expiration date: Expired if expiration date is in the past, ExpiringSoon if expiration date is within 30 days, Active otherwise.

### Requirement 6: Delete a Credential

**User Story:** As an operations manager, I want to remove an incorrect credential from a technician, so that their records remain accurate.

#### Acceptance Criteria

1. WHEN a user clicks the "Delete" action on a credential, THE Credential detail view SHALL display a confirmation dialog stating "Are you sure you want to delete this credential? This action cannot be undone."
2. WHEN the user confirms deletion, THE Technician_Service SHALL remove the credential and THE Credential detail view SHALL update to reflect the removal.
3. IF the deletion request fails, THEN THE Credential detail view SHALL display an error message stating "Failed to delete credential. Please try again."

### Requirement 7: Credential Status Computation

**User Story:** As an operations manager, I want credential statuses to be automatically computed, so that I can see at a glance which credentials need attention.

#### Acceptance Criteria

1. THE Credentials_List_View SHALL compute Credential_Status as Expired when the expiration date is before the current date.
2. THE Credentials_List_View SHALL compute Credential_Status as ExpiringSoon when the expiration date is within 30 days of the current date.
3. THE Credentials_List_View SHALL compute Credential_Status as Active when the expiration date is more than 30 days from the current date.
4. WHEN the Credentials_List_View loads, THE Credentials_List_View SHALL use the current date at the time of rendering to compute all credential statuses.

### Requirement 8: Routing and Module Integration

**User Story:** As a developer, I want the credentials feature to be properly integrated into the onboarding routing and module structure, so that it follows existing architectural patterns.

#### Acceptance Criteria

1. THE Onboarding_Routing SHALL register a route at path "credentials" under the Onboarding_Nav parent route.
2. THE Onboarding_Routing SHALL register a route at path "credentials/:technicianId" for the technician credential detail view.
3. THE Onboarding_Routing SHALL register a route at path "credentials/:technicianId/new" for adding a new credential.
4. THE Onboarding_Routing SHALL register a route at path "credentials/:technicianId/edit/:credentialId" for editing an existing credential.
5. THE Credential_Form route SHALL use the existing UnsavedChangesGuard to prevent accidental navigation away from unsaved edits.
6. THE Onboarding_Module SHALL declare all new credential components in its declarations array.

### Requirement 9: Error Handling

**User Story:** As an operations manager, I want clear error messages when operations fail, so that I can understand what went wrong and take corrective action.

#### Acceptance Criteria

1. IF the Technician_Service returns an error when loading technicians, THEN THE Credentials_List_View SHALL display an error message stating "Unable to load technicians. Please try again."
2. IF the Technician_Service returns an error when loading credentials for a technician, THEN THE Credential detail view SHALL display an error message stating "Unable to load credentials for this technician."
3. IF the Technician_Service returns an error when saving a credential, THEN THE Credential_Form SHALL display an error message stating "Failed to save credential. Please try again."
4. WHEN an error occurs, THE affected component SHALL provide a "Retry" button that re-attempts the failed operation.

### Requirement 10: Mock Data Support

**User Story:** As a developer, I want mock data for the credentials feature, so that I can develop and test the UI without a live backend.

#### Acceptance Criteria

1. THE mock interceptor SHALL handle GET requests to the technicians endpoint and return technician data with certification arrays.
2. THE mock interceptor SHALL handle POST requests to add a new certification to a technician.
3. THE mock interceptor SHALL handle PUT requests to update an existing certification for a technician.
4. THE mock interceptor SHALL handle DELETE requests to remove a certification from a technician.
5. THE mock interceptor SHALL include technicians with varying credential statuses: some with all Active, some with ExpiringSoon, some with Expired, and some with no credentials.

### Requirement 11: Typed Credential Support

**User Story:** As an operations manager, I want credentials to have specific types with type-appropriate fields, so that I can track Drivers Licenses, Drug Screens, OSHA Training Certs, Offer Letters, Background Checks, and SSN last four digits with the correct information for each type.

#### Acceptance Criteria

1. THE Credential_Form SHALL support the following Credential_Type values: Drivers_License, Drug_Screen, OSHA_Training_Cert, Offer_Letter, Background_Check, and SSN_Last_Four.
2. WHEN a user selects the Drivers_License Credential_Type, THE Credential_Form SHALL require license number, issuing state, issue date, and expiration date fields.
3. WHEN a user selects the Drug_Screen Credential_Type, THE Credential_Form SHALL require test date, result (pass/fail), and testing facility fields, replacing the existing boolean-only tracking.
4. WHEN a user selects the OSHA_Training_Cert Credential_Type, THE Credential_Form SHALL require certification number, issue date, expiration date, and training provider fields, replacing the existing boolean-only tracking.
5. WHEN a user selects the Offer_Letter Credential_Type, THE Credential_Form SHALL require offer date, accepted date (optional), and offer status fields.
6. WHEN a user selects the Background_Check Credential_Type, THE Credential_Form SHALL require submission date, completion date (optional), result (pass/fail/pending), and provider fields.
7. WHEN a user selects the SSN_Last_Four Credential_Type, THE Credential_Form SHALL require exactly four numeric digits and THE Credential_Form SHALL mask the input after entry.
8. THE Credentials_List_View SHALL display the Credential_Type alongside each credential name in the technician detail view.
9. WHEN a credential of type Drug_Screen or OSHA_Training_Cert is added, THE Technician_Service SHALL update the corresponding legacy boolean field on the Candidate record for backward compatibility.
10. THE Onboarding_Module SHALL store Credential_Type values in a configurable registry so that administrators can add new credential types without code changes.
11. WHEN an administrator adds a new Credential_Type to the registry, THE Credential_Form SHALL dynamically render the fields defined in that type's configuration.

### Requirement 12: Onboarding Checklist and Delta Tracking

**User Story:** As an operations manager, I want to see which credentials and items are required for a technician's role compared to what they already have on file, so that I can identify onboarding gaps and ensure compliance before a technician starts work.

#### Acceptance Criteria

1. THE Onboarding_Module SHALL provide a Role_Credential_Template configuration that defines required credentials, equipment, and competencies for each TechnicianRole.
2. WHEN an operations manager views a technician's Onboarding_Checklist, THE Onboarding_Checklist SHALL display all items from the Role_Credential_Template for that technician's role.
3. THE Onboarding_Checklist SHALL mark each required item as "Complete" when a matching valid credential, equipment assignment, or competency verification exists on file for the technician.
4. THE Onboarding_Checklist SHALL mark each required item as "Missing" when no matching record exists on file for the technician.
5. THE Onboarding_Checklist SHALL mark each required item as "Expired" when a matching credential exists but has a Credential_Status of Expired.
6. THE Onboarding_Checklist SHALL display a summary showing the count of Complete, Missing, and Expired items out of the total required items.
7. WHEN all required items are marked Complete, THE Onboarding_Checklist SHALL display a "Ready to Start" indicator for the technician.
8. THE Credentials_List_View SHALL display the onboarding completion percentage for each technician alongside their credential summary.
9. WHEN an operations manager filters by "Incomplete Onboarding," THE Credentials_List_View SHALL display only technicians who have at least one Missing or Expired required item.
10. THE Role_Credential_Template SHALL be configurable per TechnicianRole (Installer, Lead, Level1, Level2, Level3, Level4) with different required items for each role.

### Requirement 13: Equipment Tracking

**User Story:** As an operations manager, I want to track equipment issued to technicians (badges, laptops, and other hardware), so that I can ensure all equipment is accounted for during onboarding and offboarding.

#### Acceptance Criteria

1. THE Onboarding_Module SHALL provide an Equipment_Assignment record type with fields: asset type (badge, laptop, or other), asset identifier, assignment date, return date (optional), and status (assigned, returned, lost).
2. WHEN an operations manager assigns equipment to a technician, THE Technician_Service SHALL persist the Equipment_Assignment and associate it with the technician.
3. THE Credential detail view SHALL display a separate "Equipment" section listing all Equipment_Assignments for the technician.
4. WHEN an operations manager marks equipment as returned, THE Technician_Service SHALL update the Equipment_Assignment with the return date and set status to "returned."
5. IF an operations manager attempts to assign equipment with a duplicate asset identifier that is currently in "assigned" status for another technician, THEN THE Credential_Form SHALL display a validation error stating "This asset is currently assigned to another technician."
6. THE Onboarding_Checklist SHALL include required equipment items from the Role_Credential_Template and mark them as Complete when a matching Equipment_Assignment with status "assigned" exists.
7. WHEN an operations manager filters by "Missing Equipment," THE Credentials_List_View SHALL display only technicians who are missing required equipment per their Role_Credential_Template.

### Requirement 14: Technical Competency Tracking

**User Story:** As an operations manager, I want to record and verify technical competencies (such as OTDR Knowledge and Fiber Optic Characterization/OTDR testing), so that I can ensure technicians are qualified for their assigned work.

#### Acceptance Criteria

1. THE Onboarding_Module SHALL provide a Technical_Competency record type with fields: competency name, verification date, verified by (person who confirmed competency), proficiency level (beginner, intermediate, advanced, expert), and notes (optional).
2. THE Onboarding_Module SHALL support the following predefined competency names: "OTDR Knowledge" and "Fiber Optic Characterization / OTDR Testing," while also allowing custom competency names.
3. WHEN an operations manager adds a Technical_Competency to a technician, THE Technician_Service SHALL persist the competency record and associate it with the technician.
4. THE Credential detail view SHALL display a separate "Technical Competencies" section listing all Technical_Competency records for the technician.
5. THE Onboarding_Checklist SHALL include required competencies from the Role_Credential_Template and mark them as Complete when a matching Technical_Competency record exists for the technician.
6. WHEN an operations manager views the Technical Competencies section, THE Credential detail view SHALL display competencies sorted by proficiency level (expert first, then advanced, intermediate, beginner).
7. IF a required Technical_Competency is missing for a technician, THEN THE Onboarding_Checklist SHALL display the competency as "Not Verified" with a link to add the verification.

### Requirement 15: PRC Goals and Timer Tracking

**User Story:** As an operations manager, I want to track Performance Review Cycle (PRC) goals for technicians with a 60-day timer, so that I can ensure reviews happen on schedule and employees have clear objectives.

#### Acceptance Criteria

1. THE Onboarding_Module SHALL provide a PRC record type with fields: PRC due date, PRC completion date (optional), status (upcoming, overdue, completed), and an array of PRC_Goal objects.
2. THE PRC_Goal record SHALL contain fields: goal description, target date, status (not_started, in_progress, completed), and completion notes (optional).
3. WHEN a technician is first created with a start date, THE Technician_Service SHALL compute the initial PRC_Due_Date as 60 days from the start date.
4. WHEN a PRC is marked as completed, THE Technician_Service SHALL compute the next PRC_Due_Date as 60 days from the completion date.
5. THE Credential detail view SHALL display a "Performance Reviews" section showing the current PRC status, due date, and associated goals.
6. WHILE a PRC_Due_Date is within 14 days of the current date, THE Credentials_List_View SHALL display an "Upcoming PRC" indicator for that technician.
7. IF the current date exceeds the PRC_Due_Date and the PRC has not been marked as completed, THEN THE Credentials_List_View SHALL display an "Overdue PRC" warning indicator for that technician.
8. WHEN an operations manager adds a PRC_Goal to a technician's current PRC, THE Technician_Service SHALL persist the goal and associate it with the active PRC.
9. THE Onboarding_Checklist SHALL include "Initial PRC Scheduled" as a required onboarding item and mark it as Complete when a PRC record exists for the technician.
10. WHEN an operations manager filters by "Overdue PRC," THE Credentials_List_View SHALL display only technicians whose PRC_Due_Date has passed without a completed PRC.
