import { Injectable } from '@angular/core';

import { Job } from '../models/job.model';
import { TimeEntry } from '../models/time-entry.model';
import { Contract, ContractValidationResult } from '../../../models/time-payroll.model';
import {
  validateJobWithinContract,
  ValidationResult
} from '../validators/payroll-validators';

/**
 * Contract Date Service
 *
 * Manages contract date validation and expiration checks.
 * Delegates pure date-range validation to `PayrollValidators.validateJobWithinContract`.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */
@Injectable({
  providedIn: 'root'
})
export class ContractDateService {

  /** Default expiration warning window in days */
  private static readonly EXPIRATION_WARNING_DAYS = 30;

  /**
   * Validate that a job's scheduled dates fall within its contract period.
   *
   * Delegates to the pure `validateJobWithinContract` validator which checks
   * jobStart >= contractStart AND jobEnd <= contractEnd.
   *
   * Requirement 7.3
   */
  validateJobDatesWithinContract(job: Job, contract: Contract): ValidationResult {
    return validateJobWithinContract(
      job.scheduledStartDate,
      job.scheduledEndDate,
      contract.startDate,
      contract.endDate
    );
  }

  /**
   * Check if a contract is expired.
   *
   * Returns true if and only if the reference date is strictly after the
   * contract's end date. Defaults to the current date/time when no
   * reference date is provided.
   *
   * Requirement 7.5
   */
  isContractExpired(contract: Contract, referenceDate?: Date): boolean {
    const ref = referenceDate ?? new Date();
    return ref.getTime() > contract.endDate.getTime();
  }

  /**
   * Check if a contract is approaching expiration (within 30 days).
   *
   * Returns true if and only if the reference date is within 30 days of
   * the contract's end date AND the contract is not already expired.
   * Defaults to the current date/time when no reference date is provided.
   *
   * Requirement 7.4
   */
  isContractApproachingExpiration(contract: Contract, referenceDate?: Date): boolean {
    const ref = referenceDate ?? new Date();

    // If already expired, not "approaching" expiration
    if (this.isContractExpired(contract, ref)) {
      return false;
    }

    const msPerDay = 24 * 60 * 60 * 1000;
    const daysUntilExpiration = (contract.endDate.getTime() - ref.getTime()) / msPerDay;

    return daysUntilExpiration <= ContractDateService.EXPIRATION_WARNING_DAYS;
  }

  /**
   * Validate a time entry against its job's contract status.
   *
   * Checks whether the contract is expired and returns a
   * `ContractValidationResult` indicating:
   * - `valid`: false when the contract is expired
   * - `expired`: true when the contract is expired
   * - `requiresApproval`: true when the contract is expired (Manager
   *   approval is needed to save the entry per Requirement 7.6)
   * - `message`: a human-readable explanation when invalid
   *
   * Requirements: 7.5, 7.6
   */
  validateTimeEntryForContract(
    entry: TimeEntry,
    job: Job,
    contract: Contract
  ): ContractValidationResult {
    const expired = this.isContractExpired(contract);

    if (expired) {
      return {
        valid: false,
        expired: true,
        requiresApproval: true,
        message: 'The contract for this job has expired. Manager approval is required to save this time entry.'
      };
    }

    return {
      valid: true,
      expired: false,
      requiresApproval: false
    };
  }
}
