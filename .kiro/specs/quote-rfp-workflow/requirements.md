# Requirements Document

## Introduction

This feature implements the Quote/RFP Workflow for the Field Resource Management (FRM) module, covering the Initiating and Planning phases of the SRI Project Life Cycle. The workflow manages the full pipeline from receiving a customer Request for Pricing (RFP) or Request for Quote (RFQ) through labor estimation, material sourcing, internal validation, and final quote assembly and delivery. **This workflow becomes the primary path for creating Jobs in the FRM module** — all new jobs originate from an approved quote, replacing the previous standalone job creation form. The feature also introduces a Quote Pipeline Dashboard providing at-a-glance visibility into RFPs received, BOM readiness, quotes ready for customers, PO/SRI Job Number tracking, and quote-to-job conversion status. It integrates with the existing `Job` model, `FRM_Permission_Service`, NgRx state management, SignalR real-time updates, and the ATLAS workflow system for trackable validation steps.

## Glossary

- **RFP**: A Request for Pricing document received from a customer specifying material specifications and scope of work for a potential project.
- **RFQ**: A Request for Quote document, used interchangeably with RFP in this workflow, representing a customer's formal request for project pricing.
- **Quote_Workflow**: The end-to-end process from RFP intake through quote delivery, encompassing RFP capture, Job Summary creation, BOM creation, BOM validation, and quote assembly.
- **Quote_Workflow_Service**: The Angular service responsible for orchestrating the Quote_Workflow lifecycle, managing state transitions, and coordinating between sub-services.
- **RFP_Record**: The data structure capturing all information from a received RFP/RFQ, including customer details, material specifications, scope of work, and intake metadata.
- **RFP_Intake_Form**: The multi-step form component used to capture RFP/RFQ details into an RFP_Record.
- **Job_Summary**: The labor estimation document created from an RFP_Record, containing estimated hours, labor categories, and task breakdowns for the quoted job.
- **Job_Summary_Service**: The Angular service responsible for creating, updating, and persisting Job_Summary records.
- **BOM**: The Bill of Materials document listing all materials required for a job, including supplier sources, quantities, unit costs, markup, and optionally tax and freight charges.
- **BOM_Builder**: The form component used to create and edit a BOM, supporting line item entry, supplier selection, markup calculation, and client-specific display configuration.
- **BOM_Service**: The Angular service responsible for creating, updating, persisting, and calculating BOM totals including markup, tax, and freight.
- **BOM_Line_Item**: A single material entry within a BOM, containing material description, quantity, unit cost, supplier, and calculated extended cost.
- **BOM_Validation**: The internal review process where a designated validator reviews and approves or rejects a completed BOM before quote assembly proceeds.
- **BOM_Validation_Service**: The Angular service responsible for initiating, tracking, and completing the BOM validation process, including automated email notifications.
- **BOM_Validator**: An internal team member (e.g., a materials manager or designated reviewer) responsible for reviewing and approving or rejecting a BOM.
- **Validation_Request**: The data structure representing a pending BOM validation, including the BOM reference, assigned validator, request timestamp, and current validation status.
- **Quote_Document**: The final assembled document sent to the customer, containing a Price Summary, Statement/Scope of Work, and the BOM with pricing.
- **Quote_Assembly_Service**: The Angular service responsible for assembling the Quote_Document from the Job_Summary, BOM, and scope of work data.
- **Price_Summary**: The section of the Quote_Document summarizing total labor costs, material costs (from BOM), and the combined project total.
- **SOW**: The Statement of Work / Scope of Work section of the Quote_Document describing the work to be performed.
- **Client_Configuration**: Per-client settings that control quote presentation, such as whether tax and freight are visible on the BOM.
- **FRM_Permission_Service**: The existing Angular service that evaluates role-permission mappings for the FRM module.
- **Job**: The existing data model representing a field resource management job record.
- **Authorized_Quoter**: A user with the `Admin`, `PM`, `DCOps`, `OSPCoordinator`, `EngineeringFieldSupport`, `Manager`, or `MaterialsManager` role who has permission to create and edit quotes.
- **Markup_Percentage**: The percentage added to material base cost for the customer-facing BOM price, defaulting to 10%.
- **Workflow_Status**: The computed overall status of the Quote_Workflow: Draft, Job_Summary_In_Progress, BOM_In_Progress, Pending_Validation, Validation_Approved, Validation_Rejected, Quote_Assembled, Quote_Delivered.
- **Job_Readiness**: A status field on the Job model indicating whether all pre-deployment preparations are complete for a job to begin field work.
- **Customer_Ready**: A status field on the Job model indicating whether the customer has confirmed readiness for the project to proceed.
- **Quote_Pipeline_Dashboard**: The dashboard view providing at-a-glance visibility into the quote pipeline, showing counts and lists of quotes grouped by status categories such as RFPs received, BOMs ready/not ready, quotes ready for customer, and quotes converted to jobs.
- **Quote_Converted**: A Workflow_Status indicating that a quote has been accepted by the customer and a Job has been created from it, transitioning the workflow into the execution phase.

---

## Requirements

### Requirement 1: Quote Workflow Access Control

**User Story:** As a system administrator, I want quote workflow access to be governed by role-based permissions, so that only appropriate personnel can create, edit, and manage quotes.

#### Acceptance Criteria

1. THE FRM_Permission_Service SHALL define a `canCreateQuote` permission flag.
2. THE FRM_Permission_Service SHALL define a `canEditQuote` permission flag.
3. THE FRM_Permission_Service SHALL define a `canValidateBOM` permission flag.
4. THE FRM_Permission_Service SHALL define a `canViewQuote` permission flag.
5. WHEN the FRM_Permission_Service evaluates permissions for the `Admin` role, THE FRM_Permission_Service SHALL grant `canCreateQuote`, `canEditQuote`, `canValidateBOM`, and `canViewQuote` permissions.
6. WHEN the FRM_Permission_Service evaluates permissions for the `PM` role, THE FRM_Permission_Service SHALL grant `canCreateQuote`, `canEditQuote`, and `canViewQuote` permissions.
7. WHEN the FRM_Permission_Service evaluates permissions for the `DCOps` role, THE FRM_Permission_Service SHALL grant `canCreateQuote`, `canEditQuote`, and `canViewQuote` permissions.
8. WHEN the FRM_Permission_Service evaluates permissions for the `MaterialsManager` role, THE FRM_Permission_Service SHALL grant `canEditQuote`, `canValidateBOM`, and `canViewQuote` permissions.
9. WHEN the FRM_Permission_Service evaluates permissions for the `OSPCoordinator` role, THE FRM_Permission_Service SHALL grant `canCreateQuote`, `canEditQuote`, and `canViewQuote` permissions.
10. WHEN the FRM_Permission_Service evaluates permissions for the `EngineeringFieldSupport` role, THE FRM_Permission_Service SHALL grant `canCreateQuote`, `canEditQuote`, and `canViewQuote` permissions.
11. WHEN the FRM_Permission_Service evaluates permissions for the `Manager` role, THE FRM_Permission_Service SHALL grant `canCreateQuote`, `canEditQuote`, and `canViewQuote` permissions.
12. WHEN a user without the `canCreateQuote` permission views a dashboard, THE Permission_Directive SHALL hide the "New Quote" action button.
13. WHEN a user without the `canViewQuote` permission navigates to a quote route, THE Role_Guard SHALL deny access and redirect the user to `/field-resource-management/dashboard`.
14. WHEN a user with `canViewQuote` but without `canEditQuote` views a Quote_Workflow, THE application SHALL render all quote fields as read-only.

---

### Requirement 2: RFP/RFQ Intake

**User Story:** As an Authorized_Quoter, I want to capture all details from a customer RFP or RFQ in a structured form, so that the information is available for labor estimation and material sourcing.

#### Acceptance Criteria

1. THE RFP_Intake_Form SHALL require the Authorized_Quoter to enter a customer/client name as a non-empty text field with a maximum length of 200 characters.
2. THE RFP_Intake_Form SHALL require the Authorized_Quoter to enter a project name as a non-empty text field with a maximum length of 200 characters.
3. THE RFP_Intake_Form SHALL require the Authorized_Quoter to enter a site name and site address consisting of street, city, state, and zip code fields, each non-empty.
4. THE RFP_Intake_Form SHALL require the Authorized_Quoter to enter a primary customer contact with name, phone number, and email address fields.
5. WHEN the Authorized_Quoter enters a phone number, THE RFP_Intake_Form SHALL validate the phone number matches a 10-digit US phone format.
6. WHEN the Authorized_Quoter enters an email address, THE RFP_Intake_Form SHALL validate the email address contains a valid email format.
7. THE RFP_Intake_Form SHALL require the Authorized_Quoter to enter a scope of work description as a non-empty text field with a maximum length of 5000 characters.
8. THE RFP_Intake_Form SHALL provide a field for the Authorized_Quoter to enter material specifications as a text field with a maximum length of 5000 characters.
9. THE RFP_Intake_Form SHALL require the Authorized_Quoter to select an RFP received date using a date picker.
10. THE RFP_Intake_Form SHALL provide a field for the Authorized_Quoter to select a requested completion date using a date picker.
11. WHEN the Authorized_Quoter selects a requested completion date, THE RFP_Intake_Form SHALL validate that the requested completion date is on or after the RFP received date.
12. THE RFP_Intake_Form SHALL provide a file upload area for the Authorized_Quoter to attach the original RFP/RFQ document in PDF, DOCX, or XLSX format with a maximum file size of 25 MB.
13. THE RFP_Intake_Form SHALL require the Authorized_Quoter to select a job type from the existing JobType options (Install, Decom, SiteSurvey, PM).
14. THE RFP_Intake_Form SHALL require the Authorized_Quoter to select a priority level from the existing Priority options (P1, P2, Normal).
15. WHEN the Authorized_Quoter submits the RFP_Intake_Form, THE Quote_Workflow_Service SHALL create a new RFP_Record and set the Workflow_Status to `Draft`.
16. WHEN a new RFP_Record is created, THE Quote_Workflow_Service SHALL record the `createdBy` field with the authenticated user's identity and the `createdAt` field with the current UTC timestamp.

---

### Requirement 3: Job Summary Creation

**User Story:** As an Authorized_Quoter, I want to create a Job Summary with labor hour estimates based on the RFP, so that the quote includes accurate labor costs.

#### Acceptance Criteria

1. WHEN the Authorized_Quoter opens the Job Summary step for an RFP_Record, THE Job_Summary form SHALL pre-populate the project name, site name, and scope of work from the RFP_Record.
2. THE Job_Summary form SHALL require the Authorized_Quoter to enter a total estimated labor hours value as a positive number with up to two decimal places.
3. THE Job_Summary form SHALL provide a repeatable section for the Authorized_Quoter to add one or more labor line items, each containing a task description (max 500 characters), labor category (text, max 100 characters), estimated hours (positive number), and hourly rate (positive number with up to two decimal places).
4. THE Job_Summary form SHALL compute and display a running total of estimated hours as the sum of all labor line item hours.
5. THE Job_Summary form SHALL compute and display a running total of estimated labor cost as the sum of each labor line item's hours multiplied by its hourly rate.
6. WHEN the Authorized_Quoter saves the Job_Summary, THE Job_Summary_Service SHALL persist the data and update the Workflow_Status to `Job_Summary_In_Progress`.
7. WHEN the Authorized_Quoter marks the Job_Summary as complete, THE Job_Summary_Service SHALL validate that at least one labor line item exists and the total estimated hours is greater than zero before allowing completion.
8. WHEN the Job_Summary is marked as complete, THE Job_Summary_Service SHALL update the Workflow_Status to `BOM_In_Progress`.

---

### Requirement 4: Bill of Materials (BOM) Creation

**User Story:** As an Authorized_Quoter, I want to build a Bill of Materials with supplier pricing and configurable markup, so that the quote includes accurate material costs tailored to the client.

#### Acceptance Criteria

1. THE BOM_Builder SHALL provide a repeatable section for the Authorized_Quoter to add one or more BOM_Line_Items, each containing: material description (non-empty, max 500 characters), quantity (positive integer), unit of measure (text, max 50 characters), unit cost (positive number with up to two decimal places), and supplier name (text, max 200 characters).
2. THE BOM_Builder SHALL compute and display the extended cost for each BOM_Line_Item as quantity multiplied by unit cost.
3. THE BOM_Builder SHALL apply the Markup_Percentage to each BOM_Line_Item extended cost and display the marked-up extended cost.
4. THE BOM_Builder SHALL default the Markup_Percentage to 10% and allow the Authorized_Quoter to override the markup percentage as a positive number between 0 and 100 with up to two decimal places.
5. THE BOM_Builder SHALL compute and display a subtotal of all BOM_Line_Item marked-up extended costs.
6. THE BOM_Builder SHALL provide fields for the Authorized_Quoter to enter estimated tax amount (non-negative number, two decimal places) and estimated freight/shipping cost (non-negative number, two decimal places).
7. THE BOM_Builder SHALL compute and display a grand total as the sum of the marked-up subtotal, tax, and freight.
8. THE BOM_Builder SHALL provide a toggle for the Authorized_Quoter to configure whether tax and freight amounts are visible on the customer-facing BOM.
9. WHEN the Client_Configuration for the selected client specifies that tax and freight are hidden, THE BOM_Builder SHALL default the tax/freight visibility toggle to hidden.
10. WHEN the tax/freight visibility toggle is set to hidden, THE BOM_Builder SHALL exclude tax and freight line items from the customer-facing BOM preview and the exported Quote_Document, while still including those amounts in the grand total.
11. WHEN the Authorized_Quoter saves the BOM, THE BOM_Service SHALL persist the data and maintain the Workflow_Status as `BOM_In_Progress`.
12. WHEN the Authorized_Quoter marks the BOM as complete, THE BOM_Service SHALL validate that at least one BOM_Line_Item exists before allowing completion.

---

### Requirement 5: Internal BOM Validation Workflow

**User Story:** As a project manager, I want the completed BOM to be automatically sent for internal validation with trackable steps, so that material pricing is reviewed before the quote goes to the customer.

#### Acceptance Criteria

1. WHEN both the Job_Summary and BOM are marked as complete, THE BOM_Validation_Service SHALL automatically initiate a Validation_Request.
2. WHEN a Validation_Request is initiated, THE BOM_Validation_Service SHALL send an automated email notification to the assigned BOM_Validator containing a link to the BOM review page, the project name, client name, and BOM grand total.
3. THE BOM_Validation_Service SHALL update the Workflow_Status to `Pending_Validation` when a Validation_Request is initiated.
4. THE Validation_Request SHALL track the following steps: Request_Sent, Under_Review, Approved, and Rejected.
5. WHEN the BOM_Validator opens the validation link, THE BOM_Validation view SHALL display the complete BOM with all line items, markup, tax, freight, and grand total in a read-only format.
6. THE BOM_Validation view SHALL provide the BOM_Validator with an "Approve" button and a "Reject" button.
7. WHEN the BOM_Validator clicks "Approve", THE BOM_Validation_Service SHALL update the Validation_Request step to `Approved`, record the validator's identity and timestamp, and update the Workflow_Status to `Validation_Approved`.
8. WHEN the BOM_Validator clicks "Reject", THE BOM_Validation_Service SHALL require the BOM_Validator to enter rejection comments (non-empty, max 2000 characters) before completing the rejection.
9. WHEN the BOM_Validator submits a rejection, THE BOM_Validation_Service SHALL update the Validation_Request step to `Rejected`, record the validator's identity, timestamp, and rejection comments, and update the Workflow_Status to `Validation_Rejected`.
10. WHEN a Validation_Request is approved, THE BOM_Validation_Service SHALL send an automated email notification to the Authorized_Quoter who created the quote, confirming BOM approval.
11. WHEN a Validation_Request is rejected, THE BOM_Validation_Service SHALL send an automated email notification to the Authorized_Quoter who created the quote, including the rejection comments.
12. WHEN the Workflow_Status is `Validation_Rejected`, THE BOM_Builder SHALL allow the Authorized_Quoter to revise the BOM and resubmit for validation.
13. THE BOM_Validation view SHALL display a timeline of all validation steps with timestamps and actor identities for audit purposes.
14. THE BOM_Validation workflow SHALL integrate with the ATLAS workflow system by registering validation steps as trackable workflow items.

---

### Requirement 6: Quote Document Assembly

**User Story:** As an Authorized_Quoter, I want to assemble a final quote document from the approved components, so that I can deliver a professional quote to the customer.

#### Acceptance Criteria

1. WHEN the Workflow_Status is `Validation_Approved`, THE Quote_Assembly_Service SHALL enable the quote assembly step.
2. THE Quote_Document SHALL contain three sections: Price_Summary, SOW, and BOM.
3. THE Price_Summary section SHALL display the total labor cost from the Job_Summary, the total material cost from the BOM (marked-up subtotal), and a combined project total.
4. WHEN the Client_Configuration specifies that tax and freight are hidden, THE Price_Summary SHALL exclude tax and freight as separate line items but include those amounts in the combined project total.
5. THE SOW section SHALL display the scope of work text from the RFP_Record, and the Quote_Assembly_Service SHALL allow the Authorized_Quoter to edit the SOW text (max 10000 characters) before finalizing.
6. THE BOM section SHALL display all BOM_Line_Items with marked-up pricing, respecting the tax/freight visibility configuration for the client.
7. THE Quote_Assembly_Service SHALL provide a preview of the assembled Quote_Document before finalization.
8. WHEN the Authorized_Quoter finalizes the Quote_Document, THE Quote_Assembly_Service SHALL update the Workflow_Status to `Quote_Assembled`.
9. WHEN the Authorized_Quoter finalizes the Quote_Document, THE Quote_Assembly_Service SHALL record the finalized timestamp and the identity of the user who finalized the document.

---

### Requirement 7: Quote Delivery and Export

**User Story:** As an Authorized_Quoter, I want to export and deliver the finalized quote to the customer, so that the customer receives a professional document for review.

#### Acceptance Criteria

1. WHEN the Workflow_Status is `Quote_Assembled`, THE Quote_Workflow view SHALL provide an "Export PDF" action that generates a downloadable PDF of the Quote_Document.
2. THE exported PDF SHALL include the company logo, project name, client name, date, Price_Summary, SOW, and BOM sections.
3. THE Quote_Workflow view SHALL provide a "Send to Customer" action that opens an email composition form pre-populated with the customer contact email from the RFP_Record, a default subject line containing the project name, and the Quote_Document PDF as an attachment.
4. WHEN the Authorized_Quoter sends the quote via the "Send to Customer" action, THE Quote_Workflow_Service SHALL update the Workflow_Status to `Quote_Delivered` and record the delivery timestamp and recipient email.
5. THE Quote_Workflow view SHALL provide a "Print" action that generates a print-friendly layout of the Quote_Document.
6. WHEN the Workflow_Status is `Quote_Delivered`, THE Quote_Workflow view SHALL display the delivery timestamp and recipient information.

---

### Requirement 8: Quote Pipeline Dashboard and Status Tracking

**User Story:** As a project manager, I want a pipeline dashboard showing the current status of every quote, so that I can see at a glance which RFPs are received, which BOMs are ready or not, which quotes are ready for customers, and which quotes have been converted to jobs.

#### Acceptance Criteria

1. THE Quote_Workflow SHALL track the following Workflow_Status values: `Draft`, `Job_Summary_In_Progress`, `BOM_In_Progress`, `Pending_Validation`, `Validation_Approved`, `Validation_Rejected`, `Quote_Assembled`, `Quote_Delivered`, `Quote_Converted`.
2. THE Quote_Workflow view SHALL display a visual progress indicator showing the current Workflow_Status and all completed steps.
3. THE Quote_Workflow view SHALL display the date and user identity for each completed status transition.
4. THE FRM dashboard SHALL display a Quote_Pipeline_Dashboard widget visible to users with the `canViewQuote` permission.
5. THE Quote_Pipeline_Dashboard SHALL display a count and clickable list of **RFPs Received** — quotes in `Draft` or `Job_Summary_In_Progress` status.
6. THE Quote_Pipeline_Dashboard SHALL display a count and clickable list of **BOMs Not Ready** — quotes in `BOM_In_Progress` or `Validation_Rejected` status.
7. THE Quote_Pipeline_Dashboard SHALL display a count and clickable list of **BOMs Ready** — quotes in `Pending_Validation` or `Validation_Approved` status.
8. THE Quote_Pipeline_Dashboard SHALL display a count and clickable list of **Quotes Ready for Customer** — quotes in `Quote_Assembled` status.
9. THE Quote_Pipeline_Dashboard SHALL display a count and clickable list of **Quotes Delivered** — quotes in `Quote_Delivered` status.
10. THE Quote_Pipeline_Dashboard SHALL display a count and clickable list of **Quotes Converted to Job** — quotes in `Quote_Converted` status.
11. THE Quote_Pipeline_Dashboard SHALL display a column or indicator showing whether each quote has a **PO Number** and/or **SRI Job Number** assigned.
12. WHEN the Authorized_Quoter clicks a count or list item in the Quote_Pipeline_Dashboard, THE application SHALL navigate to the filtered quote list or the individual Quote_Workflow view.
13. THE Quote_Pipeline_Dashboard SHALL refresh in real time via SignalR when any quote's Workflow_Status changes.
14. WHEN a Workflow_Status transition occurs, THE Quote_Workflow_Service SHALL broadcast the update via SignalR to other users viewing the same quote or the Quote_Pipeline_Dashboard.

---

### Requirement 9: Job Readiness and Customer Ready Status Fields

**User Story:** As a project manager, I want Job Readiness and Customer Ready status fields on jobs, so that I can track whether a job is prepared for deployment and whether the customer has confirmed readiness.

#### Acceptance Criteria

1. THE Job model SHALL include a `jobReadiness` field with the following values: `Not_Ready`, `Partially_Ready`, `Ready`.
2. THE Job model SHALL include a `customerReady` field with the following values: `Not_Ready`, `Ready`.
3. THE Job detail view SHALL display the `jobReadiness` and `customerReady` fields as editable dropdowns for users with the `canEditJob` permission.
4. WHEN a user without the `canEditJob` permission views the Job detail, THE Job detail view SHALL display the `jobReadiness` and `customerReady` fields as read-only text.
5. WHEN the Authorized_Quoter updates the `jobReadiness` or `customerReady` field, THE Job_Service SHALL persist the change and record the update timestamp and user identity.
6. THE Job list view SHALL support filtering jobs by `jobReadiness` and `customerReady` values.
7. WHEN both `jobReadiness` is `Ready` and `customerReady` is `Ready`, THE Job detail view SHALL display a visual indicator confirming the job is fully ready for deployment.

---

### Requirement 10: Quote as Primary Job Creation Path

**User Story:** As a project manager, I want all new jobs to originate from an approved quote, so that every job has a traceable RFP, cost estimate, and approved BOM before work begins.

#### Acceptance Criteria

1. THE existing standalone "Create Job" action (the `jobs/new` route) SHALL be replaced with a redirect to the `quotes/new` route, making the Quote_Workflow the primary entry point for job creation in the FRM module.
2. WHEN the Workflow_Status reaches `Quote_Delivered` and the customer accepts the quote, THE Quote_Workflow view SHALL provide a "Convert to Job" action that creates a new Job from the quote data.
3. WHEN the Authorized_Quoter clicks "Convert to Job", THE Quote_Workflow_Service SHALL pre-populate the Job creation with client name, site name, site address, customer contact, job type, priority, scope of work, estimated hours, and billing data from the Quote_Workflow.
4. THE "Convert to Job" step SHALL require the Authorized_Quoter to enter a PO Number (purchase order number) as a text field if the client works off purchase orders.
5. THE "Convert to Job" step SHALL require the Authorized_Quoter to enter an SRI Job Number as a text field.
6. WHEN the Job is successfully created from a quote, THE Quote_Workflow_Service SHALL update the Workflow_Status to `Quote_Converted` and store the associated Job ID on the Quote_Workflow record.
7. THE Quote_Workflow SHALL maintain a reference to the associated Job ID, and the Job SHALL maintain a reference to the originating Quote_Workflow ID.
8. THE Job detail view SHALL display a link to the originating Quote_Workflow when one exists.
9. THE Quote_Workflow view SHALL display a link to the created Job when one exists.
10. THE Quote_Workflow record SHALL store the PO Number and SRI Job Number entered during the "Convert to Job" step, and these fields SHALL be visible on both the Quote_Workflow view and the associated Job detail view.

---

### Requirement 11: Client Configuration Management

**User Story:** As an administrator, I want to configure per-client settings for quote presentation, so that quotes are formatted according to each client's preferences.

#### Acceptance Criteria

1. THE system SHALL maintain a Client_Configuration record for each client, containing at minimum: client name, whether tax and freight are visible on the BOM, and default Markup_Percentage.
2. WHEN an Authorized_Quoter selects a client during RFP intake, THE RFP_Intake_Form SHALL load the Client_Configuration for that client and apply the configured defaults to the BOM_Builder.
3. THE system SHALL provide an administration interface for users with the `canAccessAdminPanel` permission to create and edit Client_Configuration records.
4. WHEN no Client_Configuration exists for a selected client, THE system SHALL use default values: tax/freight visible set to true and Markup_Percentage set to 10%.

---

### Requirement 12: Quote Workflow Navigation and Route Integration

**User Story:** As a developer, I want the Quote Workflow to be accessible via dedicated routes within the FRM module, so that it integrates with the existing navigation and routing structure.

#### Acceptance Criteria

1. THE FRM routing module SHALL register a `quotes` route that loads a quote list view showing all quotes the user has permission to view.
2. THE FRM routing module SHALL register a `quotes/new` route that loads the RFP_Intake_Form for creating a new quote.
3. THE FRM routing module SHALL register a `quotes/:id` route that loads the Quote_Workflow view for an existing quote.
4. THE FRM routing module SHALL protect all quote routes with a guard that checks the `canViewQuote` permission.
5. THE FRM routing module SHALL protect the `quotes/new` route with a guard that checks the `canCreateQuote` permission.
6. THE FRM navigation menu SHALL include a "Quotes" menu item visible to users with the `canViewQuote` permission.
7. THE `quotes` routes SHALL use the existing `FrmLayoutComponent` as the parent layout.

---

### Requirement 13: Quote Form Validation

**User Story:** As an Authorized_Quoter, I want clear validation feedback throughout the quote workflow forms, so that I can correct errors before saving or advancing.

#### Acceptance Criteria

1. WHEN the Authorized_Quoter leaves a required field empty and attempts to save or advance, THE form SHALL display a "This field is required" message below the empty field.
2. WHEN the Authorized_Quoter enters a numeric value outside the allowed range, THE form SHALL display a message indicating the valid range.
3. WHEN the Authorized_Quoter enters text exceeding the maximum character length, THE form SHALL prevent additional character input.
4. THE form SHALL highlight invalid fields with a red border and valid fields with a standard border.
5. WHEN the Authorized_Quoter corrects a previously invalid field, THE form SHALL remove the error message and red border immediately.
6. WHEN the Authorized_Quoter enters a phone number that does not match the 10-digit US phone format, THE form SHALL display a format error message below the field.
7. WHEN the Authorized_Quoter enters an email address that does not match a valid email format, THE form SHALL display a format error message below the field.

---

### Requirement 14: Quote Draft Persistence

**User Story:** As an Authorized_Quoter, I want my in-progress quote data to be preserved if I accidentally close the browser tab, so that I do not lose my work.

#### Acceptance Criteria

1. WHEN the Authorized_Quoter modifies any field in the Quote_Workflow, THE Quote_Workflow view SHALL save the current form state to browser session storage within 3 seconds.
2. WHEN the Authorized_Quoter returns to a Quote_Workflow that has unsaved draft data in session storage, THE Quote_Workflow view SHALL restore the draft data and display a notification indicating that unsaved changes have been restored.
3. WHEN the Authorized_Quoter successfully saves a workflow step to the backend, THE Quote_Workflow view SHALL clear the draft data for that step from session storage.
4. WHEN the Authorized_Quoter explicitly discards changes by clicking a "Discard" button, THE Quote_Workflow view SHALL clear the draft data from session storage and reload the last saved state from the backend.

---

### Requirement 15: Real-Time Quote Updates

**User Story:** As a project manager, I want to see quote updates in real time when team members make changes, so that I have current visibility into quote progress without refreshing the page.

#### Acceptance Criteria

1. WHEN an Authorized_Quoter saves quote data, THE system SHALL broadcast the update via SignalR to other users viewing the same Quote_Workflow.
2. WHEN a SignalR quote update is received, THE Quote_Workflow view SHALL update the displayed data and Workflow_Status indicators without requiring a page refresh.
3. IF the SignalR connection is lost while viewing a Quote_Workflow, THEN THE Quote_Workflow view SHALL display a connection status indicator and attempt automatic reconnection.
4. WHEN the SignalR connection is re-established, THE Quote_Workflow_Service SHALL reload the latest quote data from the backend API to synchronize state.

---

### Requirement 16: Daily Report Aggregation (Secondary)

**User Story:** As a project manager, I want daily reports to be aggregated into weekly reports, so that I can review weekly progress summaries and share them with customers.

#### Acceptance Criteria

1. THE system SHALL provide a Weekly_Report view that aggregates all EOD_Entry records for a Job within a selected calendar week (Monday through Sunday).
2. THE Weekly_Report SHALL display a summary of daily progress percentages showing the starting and ending values for each Daily_Progress category across the week.
3. THE Weekly_Report SHALL list all issues and roadblocks reported during the week.
4. THE system SHALL provide an "Email Weekly Report" action that sends the Weekly_Report to the customer contact email associated with the Job.
5. WHEN the "Email Weekly Report" action is triggered, THE system SHALL generate a formatted email containing the Weekly_Report summary and attach a PDF version.
