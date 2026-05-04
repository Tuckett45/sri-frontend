import { Injectable } from '@angular/core';

import { TimeEntry } from '../models/time-entry.model';
import { Job } from '../models/job.model';
import { BillableAmount, JobBillableSummary } from '../../../models/time-payroll.model';
import { PayType } from '../../../models/time-payroll.enum';
import {
  validateBillRate as payrollValidateBillRate,
  ValidationResult
} from '../validators/payroll-validators';
import {
  calculateEntryBillableAmount,
  calculatePeriodBillablesByJob
} from '../utils/timecard-calculations';

/**
 * Bill Rate Service
 *
 * Manages customer bill rates at the job level and calculates billable amounts.
 * Delegates pure computation to `timecard-calculations` utility functions and
 * validation to `PayrollValidators`.
 *
 * Requirements: 5.3, 5.4, 5.5, 5.6
 */
@Injectable({
  providedIn: 'root'
})
export class BillRateService {

  /**
   * Calculate the billable amount for a single time entry against its job's bill rate.
   *
   * Uses the overtime bill rate when the entry's payType is Overtime;
   * otherwise uses the standard bill rate. Returns a `BillableAmount` object
   * with the computed amount and metadata.
   *
   * Requirement 5.4
   */
  calculateBillableAmount(entry: TimeEntry, job: Job): BillableAmount {
    const isOvertime = entry.payType === PayType.Overtime;
    const hours = entry.totalHours ?? 0;
    const rate = isOvertime
      ? (job.overtimeBillRate ?? 0)
      : (job.standardBillRate ?? 0);
    const amount = calculateEntryBillableAmount(hours, isOvertime, job);

    return {
      entryId: entry.id,
      jobId: entry.jobId,
      hours,
      rate,
      isOvertime,
      amount
    };
  }

  /**
   * Calculate total billable amounts for a timecard period grouped by job.
   *
   * Accepts an array of time entries and an array of jobs. Builds a lookup
   * map from the jobs array and delegates to the pure
   * `calculatePeriodBillablesByJob` utility. Jobs without bill rates are
   * flagged with `rateNotSet: true`.
   *
   * Requirements: 5.4, 5.5, 5.6
   */
  calculatePeriodBillables(entries: TimeEntry[], jobs: Job[]): JobBillableSummary[] {
    const jobMap = new Map<string, Pick<Job, 'standardBillRate' | 'overtimeBillRate'>>();
    for (const job of jobs) {
      jobMap.set(job.id, {
        standardBillRate: job.standardBillRate,
        overtimeBillRate: job.overtimeBillRate
      });
    }

    return calculatePeriodBillablesByJob(entries, jobMap);
  }

  /**
   * Validate a customer bill rate value.
   *
   * Delegates to the pure `validateBillRate` function in PayrollValidators.
   * A bill rate is valid when it is strictly positive and has at most two
   * decimal places.
   *
   * Requirement 5.3
   */
  validateBillRate(rate: number): ValidationResult {
    return payrollValidateBillRate(rate);
  }
}
