# Requirements Document

## Introduction

This feature adds a multi-step Job Setup Workflow to the Field Resource Management module, enabling Payroll, HR, and Admin users to create new jobs tied to a client. The workflow collects customer information, pricing/billing details, and SRI internal staffing data through a structured, multi-step form. The feature integrates with the existing `Job` model, `FRM_Permission_Service`, role-based routing guards, and the admin/HR-payroll dashboards. Created jobs appear in the existing Active Jobs Widget and are available for assignment and scheduling.

## Glossary

- **Job_Setup_Form**: The multi-step Angular reactive form component that collects all data required to create a new job.
- **Job_Setup_Service**: The Angular service responsible for validating, submitting, and persisting new job records created through the Job_Setup_Form.
- **FRM_Permission_Service**: The existing Angular service (`frm-permission.service.ts`) that evaluates role-permission mappings for the FRM module.
- **Customer_Info_Step**: The first step of the Job_Setup_Form collecting jobsite location, site name, primary point of contact, target start date, customer authorization status, and purchase order information.
- **Pricing_Billing_Step**: The second step of the Job_Setup_Form collecting bill rates, overtime rates, per diem amounts, and invoicing process details.
- **SRI_Internal_Step**: The third step of the Job_Setup_Form collecting SRI project director, target resource count, SRI customer/biz dev contact, requested hours, and overtime requirements.
- **Review_Step**: The final step of the Job_Setup_Form displaying a read-only summary of all entered data before submission.
- **Job**: The existing data model (`job.model.ts`) representing a field resource management job record.
- **Active_Jobs_Widget**: The existing dashboard widget that displays jobs with active statuses (EnRoute, OnSite, NotStarted).
- **Authorized_User**: A user with the `Admin`, `Payroll`, or `HR` role as determined by the FRM_Permission_Service.
- **Purchase_Order**: A client-issued purchase order number associated with a job for billing purposes.
- **Bill_Rate**: The hourly rate charged to the client for standard work hours on a job.
- **Per_Diem**: A daily allowance amount provided to field resources for living expenses on a job.

---

## Requirements

### Requirement 1: Job Setup Access Control

**User Story:** As a system administrator, I want only authorized Payroll, HR, and Admin users to access the Job Setup Workflow, so that job creation is restricted to appropriate personnel.

#### Acceptance Criteria

1. THE FRM_Permission_Service SHALL define a `canCreateJob` permission flag.
2. WHEN the FRM_Permission_Service evaluates permissions for the `Admin` role, THE FRM_Permission_Service SHALL grant the `canCreateJob` permission.
3. WHEN the FRM_Permission_Service evaluates permissions for the `Payroll` role, THE FRM_Permission_Service SHALL grant the `canCreateJob` permission.
4. WHEN the FRM_Permission_Service evaluates permissions for the `HR` role, THE FRM_Permission_Service SHALL grant the `canCreateJob` permission.
5. WHEN a user without the `canCreateJob` permission attempts to navigate to the job setup route, THE Role_Guard SHALL deny access and redirect the user to `/field-resource-management/dashboard`.
6. WHEN a user without the `canCreateJob` permission views a dashboard, THE Permission_Directive SHALL hide the "Create Job" action button.

---

### Requirement 2: Job Setup Workflow Navigation

**User Story:** As an Authorized_User, I want a multi-step form with clear navigation, so that I can complete the job setup process in an organized manner.

#### Acceptance Criteria

1. THE Job_Setup_Form SHALL present four sequential steps: Customer_Info_Step, Pricing_Billing_Step, SRI_Internal_Step, and Review_Step.
2. THE Job_Setup_Form SHALL display a step indicator showing the current step number, step label, and total number of steps.
3. WHEN the Authorized_User clicks the "Next" button, THE Job_Setup_Form SHALL validate all required fields in the current step before advancing to the next step.
4. IF the current step contains validation errors, THEN THE Job_Setup_Form SHALL display inline error messages for each invalid field and remain on the current step.
5. WHEN the Authorized_User clicks the "Back" button, THE Job_Setup_Form SHALL navigate to the previous step and preserve all previously entered data.
6. WHEN the Authorized_User is on the Customer_Info_Step, THE Job_Setup_Form SHALL disable the "Back" button.
7. WHEN the Authorized_User is on the Review_Step, THE Job_Setup_Form SHALL replace the "Next" button with a "Submit" button.
8. WHEN the Authorized_User navigates away from the Job_Setup_Form with unsaved data, THE Job_Setup_Form SHALL display a confirmation dialog warning of unsaved changes.

---

### Requirement 3: Customer Information Step

**User Story:** As an Authorized_User, I want to enter customer and jobsite details, so that the job is properly associated with a client location and contact.

#### Acceptance Criteria

1. THE Customer_Info_Step SHALL require the Authorized_User to enter a client name as a non-empty text field with a maximum length of 200 characters.
2. THE Customer_Info_Step SHALL require the Authorized_User to enter a site name as a non-empty text field with a maximum length of 200 characters.
3. THE Customer_Info_Step SHALL require the Authorized_User to enter a jobsite location consisting of street address, city, state, and zip code fields, each non-empty.
4. THE Customer_Info_Step SHALL require the Authorized_User to enter a primary point of contact with name, phone number, and email address fields.
5. WHEN the Authorized_User enters a phone number, THE Customer_Info_Step SHALL validate the phone number matches a 10-digit US phone format.
6. WHEN the Authorized_User enters an email address, THE Customer_Info_Step SHALL validate the email address contains a valid email format.
7. THE Customer_Info_Step SHALL require the Authorized_User to select a target start date using a date picker that does not allow past dates.
8. THE Customer_Info_Step SHALL require the Authorized_User to indicate customer authorization status as either "Authorized" or "Pending Authorization".
9. THE Customer_Info_Step SHALL require the Authorized_User to indicate whether the client will work off purchase orders by selecting "Yes" or "No".
10. WHEN the Authorized_User selects "Yes" for purchase orders, THE Customer_Info_Step SHALL display an additional text field for the Authorized_User to enter the purchase order number.

---

### Requirement 4: Pricing and Billing Step

**User Story:** As an Authorized_User, I want to define billing rates and invoicing details, so that the job has accurate financial parameters from the start.

#### Acceptance Criteria

1. THE Pricing_Billing_Step SHALL require the Authorized_User to enter a standard bill rate as a positive numeric value with up to two decimal places.
2. THE Pricing_Billing_Step SHALL require the Authorized_User to enter an overtime bill rate as a positive numeric value with up to two decimal places.
3. WHEN the Authorized_User enters an overtime bill rate, THE Pricing_Billing_Step SHALL validate that the overtime bill rate is greater than or equal to the standard bill rate.
4. THE Pricing_Billing_Step SHALL require the Authorized_User to enter a per diem amount as a non-negative numeric value with up to two decimal places.
5. THE Pricing_Billing_Step SHALL require the Authorized_User to select an invoicing process from the following options: "Weekly", "Bi-Weekly", "Monthly", "Per Milestone", "Upon Completion".
6. THE Pricing_Billing_Step SHALL display a billing summary showing the entered standard bill rate, overtime bill rate, per diem, and selected invoicing process.

---

### Requirement 5: SRI Internal Step

**User Story:** As an Authorized_User, I want to capture SRI-specific staffing and operational details, so that internal resource planning can begin immediately after job creation.

#### Acceptance Criteria

1. THE SRI_Internal_Step SHALL require the Authorized_User to enter the SRI Project Director name as a non-empty text field with a maximum length of 150 characters.
2. THE SRI_Internal_Step SHALL require the Authorized_User to enter the target number of SRI resources to start as a positive integer between 1 and 500.
3. THE SRI_Internal_Step SHALL require the Authorized_User to enter the SRI Customer / Biz Dev contact name as a non-empty text field with a maximum length of 150 characters.
4. THE SRI_Internal_Step SHALL require the Authorized_User to enter the requested hours as a positive numeric value.
5. THE SRI_Internal_Step SHALL require the Authorized_User to indicate whether overtime is required by selecting "Yes" or "No".
6. WHEN the Authorized_User selects "Yes" for overtime required, THE SRI_Internal_Step SHALL display an additional field for the Authorized_User to enter estimated overtime hours as a positive numeric value.

---

### Requirement 6: Review and Submission Step

**User Story:** As an Authorized_User, I want to review all entered job details before submitting, so that I can verify accuracy and correct any mistakes.

#### Acceptance Criteria

1. THE Review_Step SHALL display all data entered across Customer_Info_Step, Pricing_Billing_Step, and SRI_Internal_Step in a read-only summary layout.
2. THE Review_Step SHALL organize the summary into three labeled sections: "Customer Information", "Pricing & Billing", and "SRI Internal".
3. WHEN the Authorized_User clicks an "Edit" link next to a section in the Review_Step, THE Job_Setup_Form SHALL navigate back to the corresponding step with all data preserved.
4. WHEN the Authorized_User clicks the "Submit" button on the Review_Step, THE Job_Setup_Service SHALL send the job data to the backend API.
5. WHILE the Job_Setup_Service is processing the submission, THE Review_Step SHALL display a loading indicator and disable the "Submit" button.
6. WHEN the backend API returns a successful response, THE Job_Setup_Form SHALL display a success confirmation message and navigate the Authorized_User to the job detail view for the newly created job.
7. IF the backend API returns an error response, THEN THE Review_Step SHALL display an error message describing the failure and keep the "Submit" button enabled for retry.

---

### Requirement 7: Job Data Persistence

**User Story:** As a system architect, I want the job setup data to map correctly to the existing Job model, so that newly created jobs integrate seamlessly with existing job management features.

#### Acceptance Criteria

1. WHEN the Job_Setup_Service submits a new job, THE Job_Setup_Service SHALL map the Customer_Info_Step data to the `Job` model fields: `client`, `siteName`, `siteAddress`, `customerPOC`, `scheduledStartDate`.
2. WHEN the Job_Setup_Service submits a new job, THE Job_Setup_Service SHALL set the initial `status` field to `JobStatus.NotStarted`.
3. WHEN the Job_Setup_Service submits a new job, THE Job_Setup_Service SHALL record the `createdBy` field with the authenticated user's identity.
4. WHEN the Job_Setup_Service submits a new job, THE Job_Setup_Service SHALL record the `createdAt` field with the current UTC timestamp.
5. WHEN the Job_Setup_Service submits a new job, THE Job_Setup_Service SHALL store pricing and billing data (bill rate, overtime rate, per diem, invoicing process) and SRI internal data (project director, target resources, biz dev contact, requested hours, overtime required) as extended job properties.
6. WHEN a new job is successfully created, THE Active_Jobs_Widget SHALL include the new job in its displayed list without requiring a manual page refresh.

---

### Requirement 8: Form Data Validation

**User Story:** As an Authorized_User, I want clear validation feedback throughout the form, so that I can correct errors before submission.

#### Acceptance Criteria

1. WHEN the Authorized_User leaves a required field empty and attempts to advance to the next step, THE Job_Setup_Form SHALL display a "This field is required" message below the empty field.
2. WHEN the Authorized_User enters a numeric value outside the allowed range, THE Job_Setup_Form SHALL display a message indicating the valid range.
3. WHEN the Authorized_User enters text exceeding the maximum character length, THE Job_Setup_Form SHALL prevent additional character input.
4. THE Job_Setup_Form SHALL highlight invalid fields with a red border and valid fields with a standard border.
5. WHEN the Authorized_User corrects a previously invalid field, THE Job_Setup_Form SHALL remove the error message and red border immediately.
6. THE Job_Setup_Form SHALL disable the "Next" button until all required fields in the current step pass validation.

---

### Requirement 9: Job Setup Route Integration

**User Story:** As a developer, I want the Job Setup Workflow to be accessible via a dedicated route within the FRM module, so that it integrates with the existing navigation and routing structure.

#### Acceptance Criteria

1. THE FRM routing module SHALL register a `jobs/new` route that loads the Job_Setup_Form component.
2. THE FRM routing module SHALL protect the `jobs/new` route with a guard that checks the `canCreateJob` permission.
3. WHEN an Authorized_User clicks the "Create Job" quick action on the admin dashboard, THE application SHALL navigate to the `jobs/new` route.
4. WHEN an Authorized_User clicks the "Create Job" quick action on the HR/payroll dashboard, THE application SHALL navigate to the `jobs/new` route.
5. THE `jobs/new` route SHALL use the existing `FrmLayoutComponent` as its parent layout.

---

### Requirement 10: Draft Persistence

**User Story:** As an Authorized_User, I want my in-progress job setup data to be preserved if I accidentally close the browser tab, so that I do not lose my work.

#### Acceptance Criteria

1. WHEN the Authorized_User modifies any field in the Job_Setup_Form, THE Job_Setup_Form SHALL save the current form state to browser session storage within 2 seconds.
2. WHEN the Authorized_User navigates to the `jobs/new` route and session storage contains a saved draft, THE Job_Setup_Form SHALL restore the draft data and navigate to the last active step.
3. WHEN the Authorized_User successfully submits a job, THE Job_Setup_Form SHALL clear the saved draft from session storage.
4. WHEN the Authorized_User explicitly cancels the job setup by clicking a "Cancel" button, THE Job_Setup_Form SHALL clear the saved draft from session storage and navigate to the previous page.
