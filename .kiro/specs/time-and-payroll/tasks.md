# Implementation Plan: Time & Payroll

## Overview

This plan implements the Time & Payroll feature for the FRM module in incremental steps. It starts with foundational types and enums, builds up pure utility functions (enabling early property-based testing), then layers in services, NgRx state management, and finally wires everything together with extended existing services and notifications. Each task builds on the previous ones so there is no orphaned code.

## Tasks

- [x] 1. Define enums, interfaces, and data models
  - [x] 1.1 Create `TimeCategory`, `PayType`, and `SyncStatus` enums
    - Create a new file for the enums (e.g., `models/time-payroll.enums.ts`)
    - Define `TimeCategory` with values `DriveTime` and `OnSite`
    - Define `PayType` with values `Regular`, `Overtime`, `Holiday`, `PTO`
    - Define `SyncStatus` with values `Synced`, `Pending`, `Failed`, `Conflict`
    - _Requirements: 1.1, 1.2, 2.1, 8.5_

  - [x] 1.2 Create new model interfaces
    - Create interfaces for `Holiday`, `AutoSubmitConfig`, `AutoSubmitResult`, `UserPayRate`, `RoleLevelPayRate`, `PayRateChange`, `Contract`, `BillableAmount`, `JobBillableSummary`, `LaborCostSummary`, `CategoryHoursSummary`, `PayTypeHoursSummary`, `AtlasTimeEntryPayload`, `AtlasSyncResult`, `SyncConflict`, `PendingSyncEntry`, `ContractValidationResult`, `TimecardBadgeCounts`
    - Place in appropriate model files following existing project conventions
    - _Requirements: 2.3, 3.1, 5.1, 6.1, 6.2, 7.1, 8.1_

  - [x] 1.3 Extend existing `TimeEntry` model
    - Add `timeCategory: TimeCategory`, `payType: PayType`, `syncStatus: SyncStatus` fields
    - Add optional fields: `lastSyncAttempt`, `syncRetryCount`, `syncConflictDetails`
    - _Requirements: 1.2, 2.1, 8.5_

  - [x] 1.4 Extend existing `TimecardPeriod` model
    - Add `driveTimeHours`, `onSiteHours`, `holidayHours`, `ptoHours`, `totalBillableAmount`, `totalLaborCost` fields
    - Add `isAutoSubmitted` and `autoSubmittedAt` fields
    - _Requirements: 1.7, 2.4, 3.3, 5.5_

  - [x] 1.5 Define new API endpoint constants
    - Add holiday, auto-submit, pay rate, contract, and ATLAS sync endpoint definitions to the API constants file
    - _Requirements: 2.3, 3.1, 6.1, 7.1, 8.1_

- [x] 2. Implement pure validation utility functions (`PayrollValidators`)
  - [x] 2.1 Create `validators/payroll-validators.ts` with pure validation functions
    - Implement `validateBillRate(rate: number): ValidationResult` — positive number, up to 2 decimal places
    - Implement `validateContractDates(startDate: Date, endDate: Date): ValidationResult` — end after start
    - Implement `validateJobWithinContract(jobStart, jobEnd, contractStart, contractEnd): ValidationResult`
    - Implement `validateNoPtoConflict(date: Date, existingEntries: TimeEntry[]): ValidationResult`
    - _Requirements: 5.3, 7.2, 7.3, 2.5_

  - [x] 2.2 Write property test: bill rate validation (Property 15)
    - **Property 15: Bill rate validation**
    - Use `fast-check` to generate random numbers (positive, negative, zero, many decimals)
    - Verify `validateBillRate` returns valid iff number is strictly positive and has at most 2 decimal places
    - **Validates: Requirements 5.3**

  - [x] 2.3 Write property test: contract date validation (Property 19)
    - **Property 19: Contract date validation**
    - Use `fast-check` to generate random date pairs
    - Verify `validateContractDates` returns valid iff endDate is strictly after startDate
    - **Validates: Requirements 7.2**

  - [x] 2.4 Write property test: job within contract period (Property 20)
    - **Property 20: Job dates within contract period**
    - Use `fast-check` to generate random job and contract date ranges
    - Verify `validateJobWithinContract` returns valid iff jobStart >= contractStart AND jobEnd <= contractEnd
    - **Validates: Requirements 7.3**

  - [x] 2.5 Write property test: PTO mutual exclusion (Property 8)
    - **Property 8: PTO and regular entry mutual exclusion**
    - Use `fast-check` to generate random dates, existing PTO entries, and attempted regular entries
    - Verify `validateNoPtoConflict` returns invalid when a full-day PTO entry exists for the same technician on the same date
    - **Validates: Requirements 2.5**

- [ ] 3. Implement pure timecard calculation utilities (`TimecardCalculations`)
  - [x] 3.1 Create `utils/timecard-calculations.ts` with pure calculation functions
    - Implement `calculateHoursByCategory(entries: TimeEntry[]): CategoryHoursSummary`
    - Implement `calculateHoursByPayType(entries: TimeEntry[]): PayTypeHoursSummary`
    - Implement `calculateEntryBillableAmount(hours, isOvertime, job): number`
    - Implement `calculatePeriodBillablesByJob(entries, jobs): JobBillableSummary[]`
    - Implement `calculateLaborCost(entries, rateHistory): number`
    - Implement `resolveApplicableRate(entryCreatedAt, rateHistory): UserPayRate`
    - _Requirements: 1.7, 2.4, 5.4, 5.5, 5.6, 6.5, 6.7_

  - [ ] 3.2 Write property test: category hours summation (Property 4)
    - **Property 4: Category hours summation is correct**
    - Use `fast-check` to generate random entry lists with DriveTime/OnSite and positive hours
    - Verify `calculateHoursByCategory` returns correct sums and driveTimeHours + onSiteHours === totalHours
    - **Validates: Requirements 1.7**

  - [ ] 3.3 Write property test: pay type hours summation (Property 7)
    - **Property 7: Pay type hours summation is correct**
    - Use `fast-check` to generate random entry lists with all PayTypes and positive hours
    - Verify `calculateHoursByPayType` returns correct sums and all pay types sum to totalHours
    - **Validates: Requirements 2.4**

  - [ ] 3.4 Write property test: period billable amounts by job (Property 16)
    - **Property 16: Period billable amounts by job**
    - Use `fast-check` to generate random entries across jobs with/without rates
    - Verify `calculatePeriodBillablesByJob` computes correct standard/overtime amounts and flags rateNotSet
    - **Validates: Requirements 5.4, 5.5, 5.6**

  - [ ] 3.5 Write property test: labor cost with rate history (Property 17)
    - **Property 17: Labor cost calculation with rate history**
    - Use `fast-check` to generate random entries and rate histories with effective dates
    - Verify `calculateLaborCost` applies the correct rate based on effective dates
    - **Validates: Requirements 6.5, 6.7**

- [x] 4. Implement ATLAS payload serializer utilities (`AtlasPayloadSerializer`)
  - [x] 4.1 Create `utils/atlas-payload-serializer.ts` with pure serialization functions
    - Implement `serializeTimeEntry(entry: TimeEntry): AtlasTimeEntryPayload`
    - Implement `deserializeAtlasResponse(payload: AtlasTimeEntryPayload): Partial<TimeEntry>`
    - Implement `validateAtlasPayload(payload: AtlasTimeEntryPayload): ValidationResult`
    - Implement `detectMismatch(local: TimeEntry, remote: AtlasTimeEntryPayload): string[]`
    - _Requirements: 8.1, 8.2, 8.7_

  - [x] 4.2 Write property test: ATLAS round-trip serialization (Property 22)
    - **Property 22: ATLAS payload serialization round-trip**
    - Use `fast-check` to generate random valid TimeEntry objects
    - Verify serialize then deserialize produces matching field values, and validateAtlasPayload returns valid
    - **Validates: Requirements 8.1, 8.2**

  - [x] 4.3 Write property test: exponential backoff calculation (Property 23)
    - **Property 23: Exponential backoff calculation**
    - Use `fast-check` to generate random attempt numbers (0-5)
    - Verify backoff delay equals 2^(n+1) seconds for n < 3, and no retry for n >= 3
    - **Validates: Requirements 8.4**

  - [x] 4.4 Write property test: payload mismatch detection (Property 24)
    - **Property 24: Payload mismatch detection**
    - Use `fast-check` to generate random entry/payload pairs with matching and differing fields
    - Verify `detectMismatch` returns non-empty list iff at least one field differs, and returns exactly the differing field names
    - **Validates: Requirements 8.7**

- [ ] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement PayClassificationService
  - [ ] 6.1 Create `PayClassificationService` with holiday and PTO classification logic
    - Implement `classifyPayType(date, technicianId, holidays): PayType`
    - Implement `isHoliday(date, holidays): boolean`
    - Implement `validatePtoEntry(date, technicianId, existingEntries): ValidationResult`
    - Implement `requestPto(technicianId, date, standardWorkdayHours): Observable<TimeEntry>`
    - Implement `getHolidays(): Observable<Holiday[]>` and `saveHolidays(holidays): Observable<Holiday[]>`
    - Implement `flagAffectedEntries(oldDate, newDate): Observable<TimeEntry[]>`
    - Wire to `AuditLoggingService` for pay type change auditing
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6, 2.7_

  - [ ] 6.2 Write property test: holiday date classification (Property 5)
    - **Property 5: Holiday date classification**
    - Use `fast-check` to generate random dates and holiday lists
    - Verify `classifyPayType` returns `PayType.Holiday` iff the date matches a holiday
    - **Validates: Requirements 2.1**

  - [ ] 6.3 Write property test: PTO entry creation (Property 6)
    - **Property 6: PTO entry creation**
    - Use `fast-check` to generate random technician IDs, dates, and workday hours
    - Verify PTO entry has `payType === PTO` and `totalHours` equals provided hours
    - **Validates: Requirements 2.2**

  - [ ] 6.4 Write property test: holiday flag detection (Property 9)
    - **Property 9: Holiday date change flags correct entries**
    - Use `fast-check` to generate random entry sets and old/new holiday dates
    - Verify `flagAffectedEntries` returns exactly entries matching the old date
    - **Validates: Requirements 2.7**

- [ ] 7. Implement BillRateService and PayRateService
  - [ ] 7.1 Create `BillRateService`
    - Implement `calculateBillableAmount(entry, job): BillableAmount`
    - Implement `calculatePeriodBillables(entries, jobs): JobBillableSummary[]`
    - Implement `validateBillRate(rate): ValidationResult` (delegates to PayrollValidators)
    - _Requirements: 5.3, 5.4, 5.5, 5.6_

  - [ ] 7.2 Create `PayRateService`
    - Implement `getPayRate(technicianId): Observable<UserPayRate>`
    - Implement `setPayRate(technicianId, rate, effectiveDate): Observable<UserPayRate>`
    - Implement `getDefaultRates(): Observable<RoleLevelPayRate[]>`
    - Implement `setDefaultRate(roleLevel, rate): Observable<RoleLevelPayRate>`
    - Implement `calculateLaborCost(entries, payRate): LaborCostSummary`
    - Implement `resolvePayRateForEntry(entry, rateHistory): UserPayRate`
    - Wire to `AuditLoggingService` for pay rate change auditing
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [ ] 7.3 Write property test: pay rate change audit completeness (Property 18)
    - **Property 18: Pay rate change audit completeness**
    - Use `fast-check` to generate random rate changes with all fields
    - Verify audit entry contains all required fields matching the change parameters
    - **Validates: Requirements 6.6**

- [ ] 8. Implement ContractDateService
  - [ ] 8.1 Create `ContractDateService`
    - Implement `validateJobDatesWithinContract(job, contract): ValidationResult`
    - Implement `isContractExpired(contract, referenceDate?): boolean`
    - Implement `isContractApproachingExpiration(contract, referenceDate?): boolean`
    - Implement `validateTimeEntryForContract(entry, job, contract): ContractValidationResult`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [ ] 8.2 Write property test: contract expiration status classification (Property 21)
    - **Property 21: Contract expiration status classification**
    - Use `fast-check` to generate random contracts and reference dates
    - Verify `isContractExpired` returns true iff referenceDate > endDate
    - Verify `isContractApproachingExpiration` returns true iff within 30 days and not expired
    - **Validates: Requirements 7.4, 7.5**

- [ ] 9. Implement AutoSubmitService
  - [ ] 9.1 Create `AutoSubmitService`
    - Implement `getConfig(region): Observable<AutoSubmitConfig>`
    - Implement `updateConfig(region, config): Observable<AutoSubmitConfig>`
    - Implement `executeAutoSubmit(): Observable<AutoSubmitResult[]>` — targets only Draft timecards past deadline
    - Implement `retryAutoSubmit(periodId, attempt): Observable<AutoSubmitResult>` — up to 3 retries at 5-min intervals
    - Wire to `AuditLoggingService` for auto-submit auditing
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.6_

  - [ ] 9.2 Write property test: auto-submit targets only draft timecards past deadline (Property 10)
    - **Property 10: Auto-submit targets only draft timecards past deadline**
    - Use `fast-check` to generate random period sets with mixed statuses and deadlines
    - Verify auto-submit changes status to Submitted for exactly Draft periods past deadline
    - **Validates: Requirements 3.2**

  - [ ] 9.3 Write property test: auto-submit audit entries are distinguishable (Property 11)
    - **Property 11: Auto-submit audit entries are distinguishable**
    - Use `fast-check` to generate random period IDs and timestamps
    - Verify audit entry contains `submissionType` of `"Auto-Submitted"` distinct from `"Manual"`
    - **Validates: Requirements 3.3**

- [ ] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Implement AtlasSyncService and NgRx atlas-sync state slice
  - [ ] 11.1 Create `AtlasSyncService`
    - Implement `serializeToAtlasPayload(entry): AtlasTimeEntryPayload` (delegates to AtlasPayloadSerializer)
    - Implement `validateAtlasPayload(payload): ValidationResult` (delegates to AtlasPayloadSerializer)
    - Implement `syncTimeEntry(entry): Observable<AtlasSyncResult>` with HTTP call and error handling
    - Implement `queueForRetry(entry, attempt): void` — dispatches NgRx action for retry queue
    - Implement `getPendingSyncs(): Observable<PendingSyncEntry[]>`
    - Implement `detectPayloadMismatch(local, atlasResponse): SyncConflict | null`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [ ] 11.2 Create NgRx `atlas-sync` state slice
    - Define `AtlasSyncState` interface with pending sync queue and sync status map
    - Create actions: `syncToAtlas`, `syncToAtlasSuccess`, `syncToAtlasFailure`, `syncConflictDetected`
    - Create reducer handling sync queue operations (add, remove, update retry count)
    - Create selectors for pending syncs, sync status by entry ID, failed syncs
    - _Requirements: 8.4, 8.5_

  - [ ] 11.3 Create NgRx effects for atlas-sync
    - Implement effect for `syncToAtlas` — calls `AtlasSyncService.syncTimeEntry`, dispatches success/failure
    - Implement effect for `syncToAtlasFailure` — queues retry with exponential backoff (2s, 4s, 8s), max 3 attempts
    - Implement effect for `syncConflictDetected` — triggers notification via `FrmNotificationAdapterService`
    - _Requirements: 8.3, 8.4, 8.7_

- [ ] 12. Extend NgRx time-entries and timecards state slices
  - [ ] 12.1 Add new NgRx actions for time category and pay type
    - Create `setTimeCategory` action with entryId, category, previousCategory
    - Create `classifyPayType` action with entryId, payType
    - Create `requestPto` action with technicianId, date, hours
    - _Requirements: 1.1, 1.4, 2.1, 2.2_

  - [ ] 12.2 Add new NgRx actions for auto-submit and notifications
    - Create `triggerAutoSubmit`, `autoSubmitSuccess`, `autoSubmitFailure` actions
    - Create `loadTimecardBadgeCounts`, `updateTimecardBadgeCounts` actions
    - _Requirements: 3.2, 4.7_

  - [ ] 12.3 Update time-entries reducer to handle new fields
    - Handle `setTimeCategory` — update entry's timeCategory field
    - Handle `classifyPayType` — update entry's payType field
    - Handle sync status updates from atlas-sync actions
    - _Requirements: 1.2, 2.1, 8.5_

  - [ ] 12.4 Update timecards reducer and selectors
    - Handle `autoSubmitSuccess` — update period status and isAutoSubmitted flag
    - Handle `updateTimecardBadgeCounts` — store badge counts
    - Create selectors for category/pay-type hour breakdowns, billable totals, badge counts
    - _Requirements: 1.7, 2.4, 3.2, 4.7, 5.5_

  - [ ] 12.5 Write property test: time category required for saving (Property 1)
    - **Property 1: Time category is required for saving**
    - Use `fast-check` to generate random TimeEntry objects with/without timeCategory
    - Verify validation rejects entries with missing/null/invalid timeCategory
    - **Validates: Requirements 1.2**

  - [ ] 12.6 Write property test: category change audit entry (Property 2)
    - **Property 2: Category change produces correct audit entry**
    - Use `fast-check` to generate random entries, categories, and user IDs
    - Verify audit entry has correct previousValue, newValue, and user fields
    - **Validates: Requirements 1.4**

  - [ ] 12.7 Write property test: locked period prevents category modification (Property 3)
    - **Property 3: Submitted/Approved periods prevent category modification**
    - Use `fast-check` to generate random periods (Submitted/Approved/Draft) and entries
    - Verify category change is rejected for Submitted/Approved periods
    - **Validates: Requirements 1.5**

- [ ] 13. Extend existing services
  - [ ] 13.1 Extend `TimeTrackingService`
    - Update `clockIn()` to accept optional `timeCategory` parameter, default to `'OnSite'`
    - Update `updateTimeEntry()` to include `timeCategory` in the update payload
    - Update `mapResponse()` to map `timeCategory`, `payType`, and `syncStatus` from API response
    - _Requirements: 1.1, 1.3, 8.1_

  - [ ] 13.2 Extend `TimecardService`
    - Update `calculateHours()` to return breakdowns by `TimeCategory` and `PayType` using `TimecardCalculations`
    - Update `createWeeklySummary()` to include category/pay-type subtotals and billable amounts
    - _Requirements: 1.7, 2.4, 5.5_

  - [ ] 13.3 Extend `FrmNotificationAdapterService` with new notification methods
    - Implement `sendTimecardNotSubmittedReminder()` — 24-hour deadline reminder
    - Implement `sendTimecardLockedNotification()` — period locked notification
    - Implement `sendTimecardNotStartedReminder()` — no entries in first 24 hours
    - Implement `sendTimecardRejectedNotification()` — includes rejection reason
    - Implement `sendTimecardApprovedNotification()` — approval confirmation
    - Implement `sendTimecardAutoSubmittedNotification()` — auto-submit notification
    - Implement `sendContractExpiringNotification()` — 30-day contract expiration warning
    - Implement `sendSyncConflictNotification()` — ATLAS sync conflict alert
    - _Requirements: 3.4, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 7.4, 8.7_

  - [ ] 13.4 Write property test: deadline proximity notification targeting (Property 12)
    - **Property 12: Deadline proximity notification targeting**
    - Use `fast-check` to generate random periods with various deadlines and statuses
    - Verify notification check identifies exactly Draft periods within 24 hours of lock deadline
    - **Validates: Requirements 4.1**

  - [ ] 13.5 Write property test: period inactivity notification targeting (Property 13)
    - **Property 13: Period inactivity notification targeting**
    - Use `fast-check` to generate random period starts and entry timestamps
    - Verify inactivity check flags technician iff no entries within 24 hours of period start
    - **Validates: Requirements 4.3**

  - [ ] 13.6 Write property test: timecard badge count calculation (Property 14)
    - **Property 14: Timecard badge count calculation**
    - Use `fast-check` to generate random period sets with mixed statuses and deadlines
    - Verify badge count equals Draft + Rejected + approaching deadline count with no double-counting
    - **Validates: Requirements 4.7**

- [ ] 14. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Create NgRx effects for notifications and auto-submit
  - [ ] 15.1 Create effects for timecard notification triggers
    - Implement effect to check deadline proximity and dispatch notification actions
    - Implement effect to check period inactivity and dispatch notification actions
    - Implement effect for period status changes (rejected, approved, locked) to trigger notifications
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ] 15.2 Create effects for auto-submit workflow
    - Implement effect for `triggerAutoSubmit` — calls `AutoSubmitService.executeAutoSubmit`
    - Implement effect for `autoSubmitFailure` — calls `AutoSubmitService.retryAutoSubmit` with retry logic
    - Implement effect for `autoSubmitSuccess` — triggers `sendTimecardAutoSubmittedNotification` for each result
    - _Requirements: 3.2, 3.4, 3.6_

  - [ ] 15.3 Create effects for contract expiration checks
    - Implement effect to periodically check for contracts approaching expiration (within 30 days)
    - Dispatch `sendContractExpiringNotification` for expiring contracts
    - _Requirements: 7.4_

- [ ] 16. Wire ATLAS sync into time entry create/update flow
  - [ ] 16.1 Integrate ATLAS sync with time entry operations
    - Update time entry create/update effects to dispatch `syncToAtlas` after successful save
    - Display `syncStatus` indicator on time entries (Synced, Pending, Failed, Conflict)
    - Display error messages with HTTP status code and error detail on sync failure
    - _Requirements: 8.1, 8.3, 8.5, 8.6_

  - [ ] 16.2 Wire sync conflict handling
    - On `syncConflictDetected`, update entry's `syncStatus` to `Conflict` and store conflict details
    - Trigger `sendSyncConflictNotification` to Dispatcher with mismatched field details
    - _Requirements: 8.7_

- [ ] 17. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation throughout implementation
- Property tests validate the 24 universal correctness properties defined in the design document using `fast-check`
- Unit tests validate specific examples and edge cases
- Pure utility functions (tasks 2–4) are implemented first to enable early property-based testing
- All services and state management build on the foundational types from task 1
