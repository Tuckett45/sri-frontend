# Requirements Document

## Introduction

This feature enables employees to submit PTO (Paid Time Off) and time off requests through the application. Submitted requests require dual approval from both the employee's direct manager(s) and backoffice/payroll personnel before being finalized. The feature integrates into the existing Angular field resource management application as a new feature module.

## Glossary

- **PTO_Request**: A formal time off request submitted by an Employee, containing date range, leave type, and optional notes
- **Employee**: An authenticated user of the system who submits PTO requests
- **Manager**: A user designated as the direct supervisor of an Employee, responsible for approving or rejecting PTO requests
- **Backoffice_User**: A user in the payroll or backoffice role responsible for administrative approval of PTO requests
- **Approval_Workflow**: The process by which a PTO_Request moves through required approvals from both Manager and Backoffice_User
- **Leave_Type**: A category of time off (e.g., vacation, sick leave, personal day, bereavement)
- **Request_Status**: The current state of a PTO_Request (Draft, Pending_Manager_Approval, Pending_Backoffice_Approval, Approved, Rejected, Cancelled)
- **PTO_System**: The software module responsible for managing PTO request creation, submission, approval workflows, and status tracking

## Requirements

### Requirement 1: Create PTO Request

**User Story:** As an Employee, I want to create a PTO/time off request with relevant details, so that I can formally request time away from work.

#### Acceptance Criteria

1. THE PTO_System SHALL provide a form for the Employee to create a new PTO_Request with the following fields: start date, end date, Leave_Type, and optional notes.
2. WHEN the Employee submits a PTO_Request, THE PTO_System SHALL validate that the start date is not in the past.
3. WHEN the Employee submits a PTO_Request, THE PTO_System SHALL validate that the end date is on or after the start date.
4. WHEN the Employee submits a PTO_Request with valid data, THE PTO_System SHALL save the PTO_Request with a Request_Status of Pending_Manager_Approval.
5. IF the Employee submits a PTO_Request with invalid data, THEN THE PTO_System SHALL display specific validation error messages for each invalid field.
6. WHEN a PTO_Request is successfully submitted, THE PTO_System SHALL display a confirmation message to the Employee.

### Requirement 2: View PTO Requests

**User Story:** As an Employee, I want to view my submitted PTO requests and their statuses, so that I can track the progress of my time off requests.

#### Acceptance Criteria

1. THE PTO_System SHALL display a list of all PTO_Requests submitted by the logged-in Employee.
2. THE PTO_System SHALL display the Request_Status, start date, end date, and Leave_Type for each PTO_Request in the list.
3. WHEN the Employee selects a PTO_Request from the list, THE PTO_System SHALL display the full details of that request including approval history.
4. THE PTO_System SHALL sort PTO_Requests by start date in descending order by default.

### Requirement 3: Cancel PTO Request

**User Story:** As an Employee, I want to cancel a pending PTO request, so that I can withdraw a request that is no longer needed.

#### Acceptance Criteria

1. WHILE a PTO_Request has a Request_Status of Pending_Manager_Approval or Pending_Backoffice_Approval, THE PTO_System SHALL allow the Employee to cancel the PTO_Request.
2. WHEN the Employee cancels a PTO_Request, THE PTO_System SHALL update the Request_Status to Cancelled.
3. WHEN the Employee cancels a PTO_Request, THE PTO_System SHALL notify the Manager and Backoffice_User that the request has been cancelled.
4. WHILE a PTO_Request has a Request_Status of Approved, THE PTO_System SHALL prevent the Employee from cancelling the PTO_Request through this workflow.

### Requirement 4: Manager Approval

**User Story:** As a Manager, I want to approve or reject PTO requests from my direct reports, so that I can manage team availability and scheduling.

#### Acceptance Criteria

1. THE PTO_System SHALL display a list of PTO_Requests pending approval for the Manager's direct reports.
2. WHEN the Manager approves a PTO_Request, THE PTO_System SHALL update the Request_Status to Pending_Backoffice_Approval.
3. WHEN the Manager rejects a PTO_Request, THE PTO_System SHALL update the Request_Status to Rejected.
4. WHEN the Manager rejects a PTO_Request, THE PTO_System SHALL require the Manager to provide a rejection reason.
5. WHEN the Manager approves or rejects a PTO_Request, THE PTO_System SHALL notify the Employee of the decision.
6. THE PTO_System SHALL display the Employee name, start date, end date, Leave_Type, and notes for each pending PTO_Request in the Manager's approval queue.

### Requirement 5: Backoffice/Payroll Approval

**User Story:** As a Backoffice_User, I want to approve or reject PTO requests that have received manager approval, so that I can ensure compliance with company policies and payroll processing.

#### Acceptance Criteria

1. THE PTO_System SHALL display a list of PTO_Requests with Request_Status of Pending_Backoffice_Approval for the Backoffice_User.
2. WHEN the Backoffice_User approves a PTO_Request, THE PTO_System SHALL update the Request_Status to Approved.
3. WHEN the Backoffice_User rejects a PTO_Request, THE PTO_System SHALL update the Request_Status to Rejected.
4. WHEN the Backoffice_User rejects a PTO_Request, THE PTO_System SHALL require the Backoffice_User to provide a rejection reason.
5. WHEN the Backoffice_User approves or rejects a PTO_Request, THE PTO_System SHALL notify the Employee and the Manager of the decision.
6. THE PTO_System SHALL display the Employee name, Manager approval date, start date, end date, Leave_Type, and notes for each pending PTO_Request in the Backoffice_User's approval queue.

### Requirement 6: Notifications

**User Story:** As an Employee, Manager, or Backoffice_User, I want to receive notifications about PTO request status changes, so that I can take timely action on requests.

#### Acceptance Criteria

1. WHEN a PTO_Request is submitted, THE PTO_System SHALL send a notification to the Employee's Manager(s).
2. WHEN a Manager approves a PTO_Request, THE PTO_System SHALL send a notification to the Backoffice_User(s).
3. WHEN a PTO_Request reaches a terminal status (Approved, Rejected, or Cancelled), THE PTO_System SHALL send a notification to all parties involved in the request.
4. THE PTO_System SHALL display notifications within the application notification area.

### Requirement 7: Approval Workflow Integrity

**User Story:** As a system administrator, I want the approval workflow to enforce the correct sequence, so that PTO requests cannot bypass required approvals.

#### Acceptance Criteria

1. THE PTO_System SHALL enforce that Manager approval occurs before Backoffice_User approval.
2. THE PTO_System SHALL prevent a Manager from approving a PTO_Request that is not in Pending_Manager_Approval status.
3. THE PTO_System SHALL prevent a Backoffice_User from approving a PTO_Request that is not in Pending_Backoffice_Approval status.
4. IF a PTO_Request is modified after submission, THEN THE PTO_System SHALL reset the Request_Status to Pending_Manager_Approval and require re-approval.
5. THE PTO_System SHALL record a timestamped audit entry for each status change of a PTO_Request, including the user who performed the action.

### Requirement 8: Leave Type Management

**User Story:** As a Backoffice_User, I want to manage available leave types, so that employees can select the appropriate category for their time off.

#### Acceptance Criteria

1. THE PTO_System SHALL provide a predefined set of Leave_Types including: Vacation, Sick Leave, Personal Day, Bereavement, and Jury Duty.
2. WHERE the organization has configured custom Leave_Types, THE PTO_System SHALL display those custom types in addition to the predefined set.
3. THE PTO_System SHALL require the Employee to select exactly one Leave_Type per PTO_Request.
