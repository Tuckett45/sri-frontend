# Requirements Document

## Introduction

This feature adds a structured Deployment Checklist Workflow to the Field Resource Management (FRM) module, enabling field teams to track and complete deployment activities across the full lifecycle of a job. The checklist covers four phases — Job Details capture, Pre-Installation verification, End of Day (EOD) reporting, and Close-Out documentation — and integrates with the existing `Job` model, NgRx state management, role-based permissions, and SignalR real-time updates. The workflow is accessible from the job detail view once a job has been created and assigned, and its completion status feeds back into the job's overall lifecycle tracking.

## Glossary

- **Deployment_Checklist**: The top-level data structure representing the full deployment checklist associated with a single Job, containing four phases: Job_Details_Phase, Pre_Installation_Phase, EOD_Report_Phase, and Close_Out_Phase.
- **Job_Details_Phase**: The first phase of the Deployment_Checklist capturing SRI job numbers, customer job numbers, change tickets, site access tickets, site information, team contacts, and statement of work.
- **Pre_Installation_Phase**: The second phase of the Deployment_Checklist containing verification items that must be confirmed (Y/N/N/A) before physical installation begins, each with an optional playbook reference.
- **EOD_Report_Phase**: The third phase of the Deployment_Checklist used to record daily end-of-day reports including personnel on-site, time tracking, daily progress percentages, and work summaries.
- **Close_Out_Phase**: The fourth and final phase of the Deployment_Checklist covering equipment hand-off validation, required photography documentation, final inspection items, and site acceptance sign-off.
- **Checklist_Item**: A single verifiable line item within a checklist phase that has a response status of Yes, No, or Not_Applicable, an optional notes field, and an optional playbook reference.
- **EOD_Entry**: A single daily end-of-day report record within the EOD_Report_Phase, capturing date, personnel, time in/out, daily progress percentages, and narrative fields.
- **Checklist_Status**: The computed overall status of the Deployment_Checklist, derived from the completion state of its four phases: Not_Started, In_Progress, or Completed.
- **Phase_Status**: The computed status of an individual phase: Not_Started, In_Progress, or Completed.
- **FRM_Permission_Service**: The existing Angular service that evaluates role-permission mappings for the FRM module.
- **Job**: The existing data model representing a field resource management job record.
- **Authorized_Editor**: A user with the `Admin`, `PM`, `DCOps`, `OSPCoordinator`, `EngineeringFieldSupport`, `Manager`, or `DeploymentEngineer` role who has permission to edit deployment checklists.
- **Field_User**: A user with the `Technician`, `SRITech`, `CM`, or `DeploymentEngineer` role who can view and contribute to EOD reports for jobs they are assigned to.
- **Site_Acceptance_Signoff**: The formal record of customer acceptance captured in the Close_Out_Phase, including customer name, email, phone, and date/time of acceptance.
- **Playbook_Reference**: A reference identifier (e.g., "2.1", "1.4") linking a Pre_Installation checklist item to a section in the SRI deployment playbook documentation.
- **Daily_Progress**: A set of percentage-complete values tracked per EOD_Entry for: devices racked, devices powered, cabling installed/dressed, cables tested, labels installed, and customer validation.

---

## Requirements

### Requirement 1: Deployment Checklist Access Control

**User Story:** As a system administrator, I want deployment checklist access to be governed by role-based permissions, so that only appropriate personnel can view and edit checklist data.

#### Acceptance Criteria

1. THE FRM_Permission_Service SHALL define a `canViewDeploymentChecklist` permission flag.
2. THE FRM_Permission_Service SHALL define a `canEditDeploymentChecklist` permission flag.
3. THE FRM_Permission_Service SHALL define a `canSubmitEODReport` permission flag.
4. WHEN the FRM_Permission_Service evaluates permissions for the `Admin` role, THE FRM_Permission_Service SHALL grant `canViewDeploymentChecklist`, `canEditDeploymentChecklist`, and `canSubmitEODReport` permissions.
5. WHEN the FRM_Permission_Service evaluates permissions for the `PM` role, THE FRM_Permission_Service SHALL grant `canViewDeploymentChecklist`, `canEditDeploymentChecklist`, and `canSubmitEODReport` permissions.
6. WHEN the FRM_Permission_Service evaluates permissions for the `DCOps` role, THE FRM_Permission_Service SHALL grant `canViewDeploymentChecklist`, `canEditDeploymentChecklist`, and `canSubmitEODReport` permissions.
7. WHEN the FRM_Permission_Service evaluates permissions for the `Technician` role, THE FRM_Permission_Service SHALL grant `canViewDeploymentChecklist` and `canSubmitEODReport` permissions.
8. WHEN the FRM_Permission_Service evaluates permissions for the `DeploymentEngineer` role, THE FRM_Permission_Service SHALL grant `canViewDeploymentChecklist`, `canEditDeploymentChecklist`, and `canSubmitEODReport` permissions.
9. WHEN the FRM_Permission_Service evaluates permissions for the `SRITech` role, THE FRM_Permission_Service SHALL grant `canViewDeploymentChecklist` and `canSubmitEODReport` permissions.
10. WHEN a user without the `canViewDeploymentChecklist` permission views a job detail page, THE application SHALL hide the Deployment Checklist tab.
11. WHEN a user without the `canEditDeploymentChecklist` permission views the Deployment_Checklist, THE application SHALL render all checklist fields as read-only.

---

### Requirement 2: Deployment Checklist Lifecycle Integration

**User Story:** As a project manager, I want the deployment checklist to be tied to a job's lifecycle, so that checklist progress is tracked alongside job status.

#### Acceptance Criteria

1. WHEN a Job transitions to `OnSite` status, THE system SHALL automatically create a Deployment_Checklist record associated with that Job if one does not already exist.
2. THE Deployment_Checklist SHALL maintain a one-to-one relationship with a Job, identified by the Job's unique identifier.
3. THE Deployment_Checklist SHALL compute its Checklist_Status as `Not_Started` when no phase has any completed items.
4. THE Deployment_Checklist SHALL compute its Checklist_Status as `In_Progress` when at least one phase has a completed item and at least one phase is not fully completed.
5. THE Deployment_Checklist SHALL compute its Checklist_Status as `Completed` when all four phases have a Phase_Status of `Completed`.
6. WHEN the Deployment_Checklist reaches `Completed` status, THE system SHALL display a visual indicator on the Job detail view confirming checklist completion.
7. THE Job detail view SHALL display the current Checklist_Status as a badge next to the Deployment Checklist tab label.

---

### Requirement 3: Deployment Checklist Navigation

**User Story:** As an Authorized_Editor, I want to navigate between checklist phases easily, so that I can complete each section in a logical order.

#### Acceptance Criteria

1. THE Deployment_Checklist view SHALL present the four phases as navigable tabs: "Job Details", "Pre-Installation", "End of Day Reports", and "Close-Out".
2. THE Deployment_Checklist view SHALL display a Phase_Status indicator on each tab showing the completion state of that phase.
3. WHEN the Authorized_Editor selects a phase tab, THE Deployment_Checklist view SHALL display the content for that phase while preserving unsaved data in other phases.
4. THE Deployment_Checklist view SHALL allow the Authorized_Editor to navigate to any phase in any order without requiring sequential completion.
5. WHEN the Authorized_Editor has unsaved changes in the current phase and selects a different tab, THE Deployment_Checklist view SHALL display a confirmation dialog warning of unsaved changes.

---

### Requirement 4: Job Details Phase

**User Story:** As an Authorized_Editor, I want to capture all job identification and contact information in a structured form, so that the deployment team has a complete reference for the job.

#### Acceptance Criteria

1. THE Job_Details_Phase SHALL provide fields for entering one or more SRI Job Numbers as text entries.
2. THE Job_Details_Phase SHALL provide fields for entering one or more Customer Job Numbers as text entries.
3. THE Job_Details_Phase SHALL provide fields for entering one or more Change Ticket numbers as text entries.
4. THE Job_Details_Phase SHALL provide fields for entering one or more Site Access Ticket numbers as text entries.
5. THE Job_Details_Phase SHALL provide date fields for Job Start Date and Job Complete Date.
6. WHEN the Job_Details_Phase loads for a Job that has existing site information, THE Job_Details_Phase SHALL pre-populate Site Name, Suite Number, Street, City/State, and Zip Code from the Job's `siteAddress` data.
7. THE Job_Details_Phase SHALL provide a date/time field for the Proposed Validation Date/Time.
8. THE Job_Details_Phase SHALL provide contact fields (name, phone, email) for the On-site Technical Lead.
9. THE Job_Details_Phase SHALL provide contact fields (name, phone, email) for up to two additional Technicians.
10. THE Job_Details_Phase SHALL provide contact fields (name, email, phone) for the SRI Project Lead.
11. THE Job_Details_Phase SHALL provide contact fields (name, email, phone) for a Primary Customer Technical Contact.
12. THE Job_Details_Phase SHALL provide contact fields (name, email, phone) for a Secondary Customer Technical Contact.
13. THE Job_Details_Phase SHALL provide a free-text field for the Statement of Work with a maximum length of 5000 characters.
14. WHEN the Authorized_Editor enters a phone number in any contact field, THE Job_Details_Phase SHALL validate the phone number matches a 10-digit US phone format.
15. WHEN the Authorized_Editor enters an email address in any contact field, THE Job_Details_Phase SHALL validate the email address contains a valid email format.
16. THE Job_Details_Phase SHALL compute its Phase_Status as `Completed` when the On-site Technical Lead name, at least one SRI Job Number, and the Job Start Date fields are populated.

---

### Requirement 5: Pre-Installation Checklist Phase

**User Story:** As an Authorized_Editor, I want to verify all pre-installation conditions before beginning physical work, so that the deployment team confirms readiness and documents any gaps.

#### Acceptance Criteria

1. THE Pre_Installation_Phase SHALL present the following Checklist_Items, each with a response of Yes, No, or Not_Applicable:
   - Required Tickets Opened
   - Customer Equipment Received (Playbook_Reference 2.1)
   - SRI Materials Received
   - Documentation Received
   - Before Pictures Taken
   - Site Inspection Completed (Playbook_Reference 1.4)
   - Rack Assignments Clear (Playbook_Reference 1.1)
   - Equipment Ports Available
   - Patch Panel Ports Available (Playbook_Reference 1.2)
   - PDU Assignments Available (Playbook_Reference 1.3)
   - Equipment Orientation Correct (Playbook_Reference 2.1.3)
2. WHEN a Checklist_Item has an associated Playbook_Reference, THE Pre_Installation_Phase SHALL display the reference identifier next to the item label.
3. THE Pre_Installation_Phase SHALL provide an optional notes text field for each Checklist_Item with a maximum length of 1000 characters.
4. WHEN the Authorized_Editor selects "No" for a Checklist_Item, THE Pre_Installation_Phase SHALL visually highlight that item with a warning indicator.
5. THE Pre_Installation_Phase SHALL compute its Phase_Status as `Not_Started` when no Checklist_Items have a response selected.
6. THE Pre_Installation_Phase SHALL compute its Phase_Status as `In_Progress` when at least one Checklist_Item has a response selected and at least one Checklist_Item has no response.
7. THE Pre_Installation_Phase SHALL compute its Phase_Status as `Completed` when all eleven Checklist_Items have a response of Yes or Not_Applicable, or when all items have a response selected and the Authorized_Editor explicitly marks the phase as complete.

---

### Requirement 6: End of Day Report Phase

**User Story:** As a Field_User, I want to submit daily end-of-day reports, so that project managers have visibility into daily progress and any issues encountered.

#### Acceptance Criteria

1. THE EOD_Report_Phase SHALL allow the creation of multiple EOD_Entry records, one per day of on-site work.
2. WHEN the Field_User creates a new EOD_Entry, THE EOD_Report_Phase SHALL pre-populate the Date field with the current date.
3. THE EOD_Entry SHALL require the Field_User to enter the Personnel On-site, Technical Lead name, and Technician names.
4. THE EOD_Entry SHALL require the Field_User to enter Time In and Time Out values as time fields.
5. THE EOD_Entry SHALL require the Field_User to enter Customer Notification details including the contact Name and Method of notification.
6. THE EOD_Entry SHALL provide percentage-complete fields (0 to 100) for each Daily_Progress category: Devices Racked, Devices Powered, Cabling Installed/Dressed, Cables Tested, Labels Installed, and Customer Validation.
7. WHEN the Field_User enters a percentage value, THE EOD_Entry SHALL validate the value is an integer between 0 and 100 inclusive.
8. THE EOD_Entry SHALL require the Field_User to answer "Yes" or "No" for: "Daily Pictures Provided?" and "EDP Redline Required?".
9. THE EOD_Entry SHALL provide a free-text field for "Work Completed Today" with a maximum length of 3000 characters.
10. THE EOD_Entry SHALL provide a free-text field for "Issues/Roadblocks Discovered and/or Resolved" with a maximum length of 3000 characters.
11. THE EOD_Entry SHALL provide a free-text field for "Plan for Tomorrow" with a maximum length of 3000 characters.
12. WHEN the Field_User saves an EOD_Entry, THE EOD_Report_Phase SHALL add the entry to a chronological list of daily reports for the Job.
13. THE EOD_Report_Phase SHALL display all submitted EOD_Entry records in reverse chronological order with the most recent entry first.
14. THE EOD_Report_Phase SHALL compute its Phase_Status as `Not_Started` when no EOD_Entry records exist.
15. THE EOD_Report_Phase SHALL compute its Phase_Status as `In_Progress` when at least one EOD_Entry record exists.
16. THE EOD_Report_Phase SHALL compute its Phase_Status as `Completed` when the Close_Out_Phase has a Phase_Status of `Completed`.

---

### Requirement 7: Close-Out Phase

**User Story:** As an Authorized_Editor, I want to document the final hand-off, capture required photographs, and obtain customer acceptance, so that the deployment is formally closed with a complete audit trail.

#### Acceptance Criteria

1. THE Close_Out_Phase SHALL provide an Equipment Hand-off and Validation section with fields for: Company, Date, and Name for both the SRI Lead and the Customer Lead.
2. THE Close_Out_Phase SHALL provide a text field for listing Other Participants in the hand-off.
3. THE Close_Out_Phase SHALL provide a Required Pictures section with Checklist_Items (Yes/No/Not_Applicable) for each of the following categories:
   - General: Overview of Work Area, Design Modifications, Equipment Discrepancies
   - Rack/Cabinet View: Front Top, Front Middle, Front Bottom, Rear Top, Rear Middle, Rear Bottom
   - Equipment & Patch Panel Detail: Front, Rear
4. THE Close_Out_Phase SHALL provide an optional notes field for each Required Pictures Checklist_Item with a maximum length of 1000 characters.
5. THE Close_Out_Phase SHALL provide a Documentation and Final Inspection section with Checklist_Items (Yes/No/Not_Applicable) for: Site Cleanliness, Workmanship, EDP Updated, Cable Test Results, and Label Audit.
6. THE Close_Out_Phase SHALL provide a Site Acceptance section with fields for: Customer Name, Customer Email, Customer Phone, and Date/Time Site Accepted.
7. WHEN the Authorized_Editor enters a customer email in the Site Acceptance section, THE Close_Out_Phase SHALL validate the email address contains a valid email format.
8. WHEN the Authorized_Editor enters a customer phone in the Site Acceptance section, THE Close_Out_Phase SHALL validate the phone number matches a 10-digit US phone format.
9. THE Close_Out_Phase SHALL compute its Phase_Status as `Completed` when the Site Acceptance section has Customer Name and Date/Time Site Accepted populated, and all Documentation and Final Inspection Checklist_Items have a response selected.
10. THE Close_Out_Phase SHALL compute its Phase_Status as `Not_Started` when no fields in the Close_Out_Phase have been populated.
11. THE Close_Out_Phase SHALL compute its Phase_Status as `In_Progress` when at least one field is populated and the completion criteria in acceptance criterion 9 are not met.

---

### Requirement 8: Checklist Data Persistence

**User Story:** As a system architect, I want deployment checklist data to persist reliably and integrate with the existing data layer, so that checklist progress is never lost and is available across sessions.

#### Acceptance Criteria

1. WHEN the Authorized_Editor saves a phase, THE Deployment_Checklist_Service SHALL send the updated phase data to the backend API.
2. WHILE the Deployment_Checklist_Service is processing a save operation, THE Deployment_Checklist view SHALL display a saving indicator and disable the save button.
3. WHEN the backend API returns a successful save response, THE Deployment_Checklist view SHALL display a brief success confirmation.
4. IF the backend API returns an error during a save operation, THEN THE Deployment_Checklist view SHALL display an error message and keep the save button enabled for retry.
5. THE Deployment_Checklist_Service SHALL store checklist data using NgRx state management, dispatching actions for load, save, and update operations.
6. WHEN the Authorized_Editor navigates to a Job detail view containing a Deployment_Checklist, THE Deployment_Checklist_Service SHALL load the checklist data from the backend API.
7. THE Deployment_Checklist_Service SHALL record the `lastModifiedBy` field with the authenticated user's identity on each save operation.
8. THE Deployment_Checklist_Service SHALL record the `lastModifiedAt` field with the current UTC timestamp on each save operation.

---

### Requirement 9: Checklist Form Validation

**User Story:** As an Authorized_Editor, I want clear validation feedback when filling out checklist forms, so that I can correct errors before saving.

#### Acceptance Criteria

1. WHEN the Authorized_Editor leaves a required field empty and attempts to save, THE Deployment_Checklist view SHALL display a "This field is required" message below the empty field.
2. WHEN the Authorized_Editor enters a numeric value outside the allowed range, THE Deployment_Checklist view SHALL display a message indicating the valid range.
3. WHEN the Authorized_Editor enters text exceeding the maximum character length, THE Deployment_Checklist view SHALL prevent additional character input.
4. THE Deployment_Checklist view SHALL highlight invalid fields with a red border.
5. WHEN the Authorized_Editor corrects a previously invalid field, THE Deployment_Checklist view SHALL remove the error message and red border immediately.
6. WHEN the Authorized_Editor enters a phone number that does not match the 10-digit US phone format, THE Deployment_Checklist view SHALL display a format error message below the field.
7. WHEN the Authorized_Editor enters an email address that does not match a valid email format, THE Deployment_Checklist view SHALL display a format error message below the field.

---

### Requirement 10: Deployment Checklist Route Integration

**User Story:** As a developer, I want the deployment checklist to be accessible as a tab within the existing job detail view, so that it integrates naturally with the current navigation structure.

#### Acceptance Criteria

1. THE Job detail view SHALL include a "Deployment Checklist" tab that loads the Deployment_Checklist component for the current Job.
2. THE "Deployment Checklist" tab SHALL only be visible to users with the `canViewDeploymentChecklist` permission.
3. WHEN the Authorized_Editor navigates directly to a URL containing the job ID and a checklist phase identifier, THE application SHALL load the Job detail view with the Deployment Checklist tab active and the specified phase selected.
4. THE Deployment_Checklist route SHALL use the existing `JobDetailComponent` as its parent context.

---

### Requirement 11: Real-Time Checklist Updates

**User Story:** As a project manager, I want to see checklist updates in real time when field personnel make changes, so that I have current visibility into deployment progress without refreshing the page.

#### Acceptance Criteria

1. WHEN an Authorized_Editor or Field_User saves checklist data, THE system SHALL broadcast the update via SignalR to other users viewing the same Job's Deployment_Checklist.
2. WHEN a SignalR checklist update is received, THE Deployment_Checklist view SHALL update the displayed data and Phase_Status indicators without requiring a page refresh.
3. IF the SignalR connection is lost while viewing a Deployment_Checklist, THEN THE Deployment_Checklist view SHALL display a connection status indicator and attempt automatic reconnection.
4. WHEN the SignalR connection is re-established, THE Deployment_Checklist_Service SHALL reload the latest checklist data from the backend API to synchronize state.

---

### Requirement 12: Checklist Print and Export

**User Story:** As a project manager, I want to print or export the deployment checklist, so that I can share a physical or digital copy with stakeholders who do not have system access.

#### Acceptance Criteria

1. THE Deployment_Checklist view SHALL provide a "Print" action that generates a print-friendly layout of the entire checklist.
2. THE print layout SHALL include all four phases with their current data, response statuses, and notes.
3. THE Deployment_Checklist view SHALL provide an "Export PDF" action that generates a downloadable PDF document of the entire checklist.
4. THE exported PDF SHALL include the Job identifier, checklist status, all phase data, and a generation timestamp.

---

### Requirement 13: Draft Auto-Save for Checklist Phases

**User Story:** As an Authorized_Editor, I want my in-progress checklist edits to be preserved if I accidentally navigate away, so that I do not lose unsaved work.

#### Acceptance Criteria

1. WHEN the Authorized_Editor modifies any field in a checklist phase, THE Deployment_Checklist view SHALL save the current phase state to browser session storage within 3 seconds.
2. WHEN the Authorized_Editor returns to a checklist phase that has unsaved draft data in session storage, THE Deployment_Checklist view SHALL restore the draft data and display a notification indicating that unsaved changes have been restored.
3. WHEN the Authorized_Editor successfully saves a phase to the backend, THE Deployment_Checklist view SHALL clear the draft data for that phase from session storage.
4. WHEN the Authorized_Editor explicitly discards changes by clicking a "Discard" button, THE Deployment_Checklist view SHALL clear the draft data from session storage and reload the last saved state from the backend.
