/**
 * Pure stateless calculation functions for timecard summaries and billing.
 *
 * These functions have no Angular dependencies and are designed for
 * easy property-based testing.
 *
 * Requirements: 1.7, 2.4, 5.4, 5.5, 5.6, 6.5, 6.7
 */

import { TimeEntry } from '../models/time-entry.model';
import { Job } from '../models/job.model';
import {
  CategoryHoursSummary,
  PayTypeHoursSummary,
  JobBillableSummary,
  UserPayRate,
  PayRateChange
} from '../../../models/time-payroll.model';
import { TimeCategory, PayType } from '../../../models/time-payroll.enum';

/**
 * Calculate hours breakdown by TimeCategory (Drive Time vs On Site).
 *
 * Sums `totalHours` for each category. The invariant
 * `driveTimeHours + onSiteHours === totalHours` always holds.
 *
 * Validates: Requirement 1.7
 */
export function calculateHoursByCategory(entries: TimeEntry[]): CategoryHoursSummary {
  let driveTimeHours = 0;
  let onSiteHours = 0;

  for (const entry of entries) {
    const hours = entry.totalHours ?? 0;
    if (entry.timeCategory === TimeCategory.DriveTime) {
      driveTimeHours += hours;
    } else {
      onSiteHours += hours;
    }
  }

  return {
    driveTimeHours,
    onSiteHours,
    totalHours: driveTimeHours + onSiteHours
  };
}

/**
 * Calculate hours breakdown by PayType (Regular, Overtime, Holiday, PTO).
 *
 * Sums `totalHours` for each pay type. The invariant
 * `regularHours + overtimeHours + holidayHours + ptoHours === totalHours`
 * always holds.
 *
 * Validates: Requirement 2.4
 */
export function calculateHoursByPayType(entries: TimeEntry[]): PayTypeHoursSummary {
  let regularHours = 0;
  let overtimeHours = 0;
  let holidayHours = 0;
  let ptoHours = 0;

  for (const entry of entries) {
    const hours = entry.totalHours ?? 0;
    switch (entry.payType) {
      case PayType.Regular:
        regularHours += hours;
        break;
      case PayType.Overtime:
        overtimeHours += hours;
        break;
      case PayType.Holiday:
        holidayHours += hours;
        break;
      case PayType.PTO:
        ptoHours += hours;
        break;
    }
  }

  return {
    regularHours,
    overtimeHours,
    holidayHours,
    ptoHours,
    totalHours: regularHours + overtimeHours + holidayHours + ptoHours
  };
}

/**
 * Calculate the billable amount for a single time entry.
 *
 * Uses the overtime bill rate when `isOvertime` is true, otherwise the
 * standard bill rate. Returns 0 when the job has no applicable rate set.
 *
 * Validates: Requirement 5.4
 */
export function calculateEntryBillableAmount(
  hours: number,
  isOvertime: boolean,
  job: Pick<Job, 'standardBillRate' | 'overtimeBillRate'>
): number {
  const rate = isOvertime ? job.overtimeBillRate : job.standardBillRate;
  if (rate == null) {
    return 0;
  }
  return hours * rate;
}

/**
 * Calculate total billable amounts for a timecard period, grouped by job.
 *
 * For each job referenced by the entries, computes standard and overtime
 * amounts. Sets `rateNotSet` to true when a job has no bill rates defined.
 *
 * Validates: Requirements 5.4, 5.5, 5.6
 */
export function calculatePeriodBillablesByJob(
  entries: TimeEntry[],
  jobs: Map<string, Pick<Job, 'standardBillRate' | 'overtimeBillRate'>>
): JobBillableSummary[] {
  const summaryMap = new Map<string, JobBillableSummary>();

  for (const entry of entries) {
    let summary = summaryMap.get(entry.jobId);
    if (!summary) {
      summary = {
        jobId: entry.jobId,
        standardHours: 0,
        overtimeHours: 0,
        standardAmount: 0,
        overtimeAmount: 0,
        totalAmount: 0,
        rateNotSet: false
      };
      summaryMap.set(entry.jobId, summary);
    }

    const regularHrs = entry.regularHours ?? entry.totalHours ?? 0;
    const overtimeHrs = entry.overtimeHours ?? 0;

    summary.standardHours += regularHrs;
    summary.overtimeHours += overtimeHrs;
  }

  const result: JobBillableSummary[] = [];

  for (const [jobId, summary] of summaryMap) {
    const job = jobs.get(jobId);
    const hasRates = job != null
      && job.standardBillRate != null
      && job.overtimeBillRate != null;

    if (hasRates) {
      summary.standardAmount = summary.standardHours * job!.standardBillRate!;
      summary.overtimeAmount = summary.overtimeHours * job!.overtimeBillRate!;
      summary.totalAmount = summary.standardAmount + summary.overtimeAmount;
      summary.rateNotSet = false;
    } else {
      summary.standardAmount = 0;
      summary.overtimeAmount = 0;
      summary.totalAmount = 0;
      summary.rateNotSet = true;
    }

    result.push(summary);
  }

  return result;
}

/**
 * Resolve the applicable pay rate for a time entry based on its creation date.
 *
 * Finds the rate in `rateHistory` whose `effectiveDate` is the most recent
 * one that is not after `entryCreatedAt`. Returns `undefined` when no
 * applicable rate exists.
 *
 * Validates: Requirement 6.5
 */
export function resolveApplicableRate(
  entryCreatedAt: Date,
  rateHistory: PayRateChange[]
): UserPayRate | undefined {
  let best: PayRateChange | undefined;

  for (const change of rateHistory) {
    const effectiveTime = new Date(change.effectiveDate).getTime();
    const entryTime = new Date(entryCreatedAt).getTime();

    if (effectiveTime <= entryTime) {
      if (!best || new Date(change.effectiveDate).getTime() > new Date(best.effectiveDate).getTime()) {
        best = change;
      }
    }
  }

  if (!best) {
    return undefined;
  }

  // Map the PayRateChange to a UserPayRate using the new rates from the change
  return {
    id: best.id,
    technicianId: best.technicianId,
    roleLevel: undefined as any, // role level is not tracked on PayRateChange
    standardHourlyRate: best.newStandardRate,
    overtimeHourlyRate: best.newOvertimeRate,
    effectiveDate: best.effectiveDate,
    createdBy: best.changedBy,
    createdAt: best.changedAt
  };
}

/**
 * Calculate total labor cost for a set of time entries given a pay rate history.
 *
 * For each entry, resolves the applicable rate (most recent rate with
 * `effectiveDate <= entry.createdAt`), then multiplies `regularHours` by
 * `standardHourlyRate` and `overtimeHours` by `overtimeHourlyRate`.
 *
 * Entries with no applicable rate contribute $0 to the total.
 *
 * Validates: Requirements 6.5, 6.7
 */
export function calculateLaborCost(
  entries: TimeEntry[],
  rateHistory: PayRateChange[]
): number {
  let totalCost = 0;

  for (const entry of entries) {
    const rate = resolveApplicableRate(entry.createdAt, rateHistory);
    if (!rate) {
      continue;
    }

    const regularHrs = entry.regularHours ?? entry.totalHours ?? 0;
    const overtimeHrs = entry.overtimeHours ?? 0;

    totalCost += regularHrs * rate.standardHourlyRate + overtimeHrs * rate.overtimeHourlyRate;
  }

  return totalCost;
}
