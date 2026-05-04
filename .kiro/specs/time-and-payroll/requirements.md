# Requirements Document

## Introduction

This document defines the requirements for the Time & Payroll feature within the Field Resource Management (FRM) module. The feature enhances the existing timecard and payroll system to support differentiated time tracking categories (Drive Time vs On Site), holiday and PTO pay classification, automated timecard submission, timecard status notifications, customer billing rates, role-based user pay rates, contract date management, and reliable time entry synchronization with the ATLAS backend API. These capabilities address gaps identified in the current system where time entries lack category granularity, pay types are not differentiated, and the ATLAS API integration has known payload synchronization issues.

## Glossary

- **Timecard_System**: The FRM module subsystem responsible for creating, editing, submitting, and managing technician time entries and timecard periods.
- **Time_Entry**: A single clock-in/clock-out record associated with a technician and a job, stored in the `TimeEntry` model.
- **Time_Category**: A classification applied to a Time_Entry that distinguishes the type of work performed — either "Drive Time" (travel to/from a job site) or "On Site" (work performed at the job location).
- **Timecard_Period**: A weekly or biweekly collection of Time_Entries for a single technician, tracked via the `TimecardPeriod` model.
- **Pay_Type**: A classification of compensable time that determines the pay rate applied — Regular, Overtime, Holiday, or PTO/Vacation.
- **Holiday_Pay**: Compensation at a designated holiday rate for time worked on company-recognized holidays or for holiday time-off entitlements.
- **PTO**: Paid Time Off, including vacation days and personal days, tracked separately from regular worked hours.
- **Auto_Submit**: An automated process that submits a Timecard_Period on behalf of a technician when the configured deadline is reached and the timecard remains in Draft status.
- **Notification_Service**: The FRM subsystem responsible for delivering in-app alerts and reminders to users regarding timecard status events.
- **Customer_Bill_Rate**: The hourly rate charged to a customer for labor performed on a specific job or contract, stored at the job or contract level.
- **User_Pay_Rate**: The hourly compensation rate assigned to a technician, determined by the technician's role level (e.g., Level1 through Level4, Lead, Installer).
- **Contract**: A time-bounded agreement with a customer that has a defined start date and end date, governing job assignments and billing rates.
- **ATLAS_API**: The external backend API system that the FRM module synchronizes time entry data with, connected via HTTP endpoints.
- **Payload_Sync**: The process of serializing a Time_Entry into the format expected by the ATLAS_API and transmitting the data for persistence.
- **Dispatcher**: A user role responsible for managing technician schedules and reviewing timecards.
- **Manager**: A user role with authority to approve timecards, set pay rates, and manage contracts.
- **Technician**: A field worker who records time entries and submits timecards.

## Requirements

### Requirement 1: Time Category Differentiation

**User Story:** As a Technician, I want to categorize my time entries as either "Drive Time" or "On Site," so that my timecard accurately reflects how my work hours were spent.

#### Acceptance Criteria

1. WHEN a Technician creates a new Time_Entry, THE Timecard_System SHALL present a Time_Category selection with the options "Drive Time" and "On Site."
2. THE Timecard_System SHALL require a Time_Category value on every Time_Entry before the Time_Entry can be saved.
3. WHEN a Technician clocks in, THE Timecard_System SHALL default the Time_Category to "On Site."
4. WHEN a Technician changes the Time_Category on an existing Time_Entry, THE Timecard_System SHALL record the change in the audit log with the previous value, new value, and the identity of the user who made the change.
5. WHILE a Timecard_Period is in "Submitted" or "Approved" status, THE Timecard_System SHALL prevent modification of the Time_Category on any Time_Entry within that period.
6. THE Timecard_System SHALL display the Time_Category label alongside each Time_Entry in the timecard view.
7. WHEN a Timecard_Period summary is calculated, THE Timecard_System SHALL display separate hour totals for "Drive Time" and "On Site" categories.

### Requirement 2: Holiday Pay and PTO Classification

**User Story:** As a Manager, I want time entries classified by Pay_Type (Regular, Overtime, Holiday, PTO), so that payroll calculations apply the correct compensation rates.

#### Acceptance Criteria

1. WHEN a Technician creates a Time_Entry on a company-recognized holiday, THE Timecard_System SHALL automatically set the Pay_Type to "Holiday."
2. WHEN a Technician requests PTO for a date, THE Timecard_System SHALL create a Time_Entry with the Pay_Type set to "PTO" and the hours set to the Technician's standard workday length.
3. THE Timecard_System SHALL allow a Manager to configure the list of company-recognized holidays with a name and date for each holiday.
4. WHEN a Timecard_Period summary is calculated, THE Timecard_System SHALL display separate hour totals for each Pay_Type: Regular, Overtime, Holiday, and PTO.
5. THE Timecard_System SHALL prevent a Technician from recording both a full-day PTO entry and a regular Time_Entry for the same date.
6. WHEN a Technician works on a holiday, THE Timecard_System SHALL allow the Technician to override the Pay_Type from "Holiday" to "Regular" with a Manager approval.
7. IF a holiday date is modified after Time_Entries have been recorded for that date, THEN THE Timecard_System SHALL flag the affected Time_Entries for Manager review.

### Requirement 3: Automated Timecard Submission

**User Story:** As a Dispatcher, I want timecards that remain in Draft status to be automatically submitted at a configured deadline, so that payroll processing is not delayed by missing submissions.

#### Acceptance Criteria

1. THE Timecard_System SHALL provide a configurable Auto_Submit deadline defined by a day-of-week and time-of-day (e.g., Friday at 17:00).
2. WHEN the Auto_Submit deadline is reached and a Timecard_Period remains in "Draft" status, THE Timecard_System SHALL change the Timecard_Period status to "Submitted."
3. WHEN the Timecard_System performs an Auto_Submit, THE Timecard_System SHALL record the submission as "Auto-Submitted" in the audit log, distinguishing the submission from a manual submission by the Technician.
4. WHEN the Timecard_System performs an Auto_Submit, THE Notification_Service SHALL send a notification to the Technician informing the Technician that the timecard was auto-submitted.
5. THE Timecard_System SHALL allow a Manager to configure the Auto_Submit deadline independently per region.
6. IF the Auto_Submit process encounters an error for a specific Timecard_Period, THEN THE Timecard_System SHALL retry the submission up to 3 times at 5-minute intervals and notify the Manager if all retries fail.

### Requirement 4: Timecard Status Notifications

**User Story:** As a Technician, I want to receive notifications about my timecard status, so that I am aware of deadlines and required actions.

#### Acceptance Criteria

1. WHEN a Timecard_Period lock deadline is within 24 hours and the Timecard_Period status is "Draft," THE Notification_Service SHALL send a "Not Submitted" reminder notification to the Technician.
2. WHEN a Timecard_Period is locked, THE Notification_Service SHALL send a "Locked" notification to the Technician.
3. WHEN a new pay period begins and the Technician has not created any Time_Entries within the first 24 hours, THE Notification_Service SHALL send a "Not Started" notification to the Technician.
4. WHEN a Timecard_Period status changes to "Rejected," THE Notification_Service SHALL send a notification to the Technician that includes the rejection reason.
5. WHEN a Timecard_Period status changes to "Approved," THE Notification_Service SHALL send a confirmation notification to the Technician.
6. THE Notification_Service SHALL deliver all timecard notifications as in-app notifications visible in the FRM notification panel.
7. THE Timecard_System SHALL display a status badge on the timecard navigation item indicating the count of timecards requiring attention (Draft, Rejected, or approaching lock deadline).

### Requirement 5: Customer Bill Rate Management

**User Story:** As a Manager, I want to define customer billing rates at the job level, so that labor costs can be accurately invoiced to customers.

#### Acceptance Criteria

1. THE Timecard_System SHALL store a standard Customer_Bill_Rate and an overtime Customer_Bill_Rate on each Job record.
2. WHEN a Manager creates or edits a Job, THE Timecard_System SHALL provide fields for entering the standard Customer_Bill_Rate and the overtime Customer_Bill_Rate in dollars-per-hour.
3. THE Timecard_System SHALL validate that the Customer_Bill_Rate values are positive numbers with up to two decimal places.
4. WHEN a Time_Entry is associated with a Job that has a Customer_Bill_Rate defined, THE Timecard_System SHALL calculate the billable amount by multiplying the Time_Entry hours by the applicable Customer_Bill_Rate (standard or overtime based on the Pay_Type).
5. WHEN a Timecard_Period summary is generated, THE Timecard_System SHALL display the total billable amount for each Job within the period.
6. IF a Job does not have a Customer_Bill_Rate defined, THEN THE Timecard_System SHALL display a "Rate Not Set" indicator on the Job's time entry summary.

### Requirement 6: User Pay Rate by Role Level

**User Story:** As a Manager, I want to assign pay rates to technicians based on their role level, so that payroll calculations reflect the correct compensation for each technician.

#### Acceptance Criteria

1. THE Timecard_System SHALL store a User_Pay_Rate (standard hourly rate and overtime hourly rate) for each Technician.
2. THE Timecard_System SHALL associate the User_Pay_Rate with the Technician's role level (Installer, Lead, Level1, Level2, Level3, Level4).
3. WHEN a Manager assigns or changes a Technician's role level, THE Timecard_System SHALL prompt the Manager to confirm or update the User_Pay_Rate.
4. THE Timecard_System SHALL allow a Manager to define default User_Pay_Rate values for each role level.
5. WHEN a Technician's User_Pay_Rate is changed, THE Timecard_System SHALL apply the new rate only to Time_Entries created after the effective date of the change.
6. THE Timecard_System SHALL record all User_Pay_Rate changes in the audit log with the previous rate, new rate, effective date, and the identity of the Manager who made the change.
7. WHEN a payroll summary is generated, THE Timecard_System SHALL calculate the labor cost for each Technician by multiplying the Technician's hours by the applicable User_Pay_Rate.

### Requirement 7: Contract Date Management

**User Story:** As a Manager, I want to define start and end dates for contracts, so that job assignments and billing are bounded to the correct contract period.

#### Acceptance Criteria

1. THE Timecard_System SHALL store a contract start date and a contract end date on each Contract record.
2. THE Timecard_System SHALL validate that the contract end date is after the contract start date.
3. WHEN a Manager creates or edits a Job associated with a Contract, THE Timecard_System SHALL validate that the Job's scheduled dates fall within the Contract's start and end dates.
4. WHEN a Contract end date is within 30 days, THE Notification_Service SHALL send a notification to the Manager indicating the Contract is approaching expiration.
5. WHILE a Contract is expired (current date is past the contract end date), THE Timecard_System SHALL display a visual "Expired" indicator on all Jobs associated with that Contract.
6. IF a Technician attempts to create a Time_Entry for a Job whose associated Contract has expired, THEN THE Timecard_System SHALL display a warning to the Technician and require Manager approval before saving the Time_Entry.

### Requirement 8: ATLAS API Time Entry Synchronization

**User Story:** As a Dispatcher, I want time entry updates to reliably synchronize with the ATLAS backend, so that payroll and reporting data is consistent across systems.

#### Acceptance Criteria

1. WHEN a Time_Entry is created or updated, THE Timecard_System SHALL serialize the Time_Entry into the payload format expected by the ATLAS_API, including all required fields (clockInTime, clockOutTime, jobId, technicianId, clockInLatitude, clockInLongitude, clockOutLatitude, clockOutLongitude, mileage, adjustmentReason).
2. THE Timecard_System SHALL validate the serialized payload against the ATLAS_API schema before transmitting the request.
3. IF the ATLAS_API returns an error response, THEN THE Timecard_System SHALL display a descriptive error message to the user that includes the HTTP status code and the error detail from the response body.
4. IF the ATLAS_API request fails due to a network error or timeout, THEN THE Timecard_System SHALL queue the request for automatic retry up to 3 times with exponential backoff (2 seconds, 4 seconds, 8 seconds).
5. WHEN a Time_Entry update is queued for retry, THE Timecard_System SHALL display a "Sync Pending" indicator on the affected Time_Entry.
6. THE Timecard_System SHALL log all ATLAS_API synchronization attempts (success and failure) in the audit log with the request payload hash, response status, and timestamp.
7. WHEN the Timecard_System detects a payload mismatch between the local Time_Entry and the ATLAS_API response, THE Timecard_System SHALL flag the Time_Entry as "Sync Conflict" and notify the Dispatcher.
