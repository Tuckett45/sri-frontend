/**
 * PTO Validation Service
 * Handles validation of PTO request data and workflow state transitions.
 */

import { Injectable } from '@angular/core';
import {
  CreatePtoRequestDto,
  RequestStatus,
  UserRole,
  ValidationResult,
  VALID_TRANSITIONS
} from '../models/pto.models';

@Injectable({
  providedIn: 'root'
})
export class PtoValidationService {

  /**
   * Validates a PTO request DTO for correctness.
   * Checks start date not in past, end date >= start date, leave type provided, notes max length.
   * @param dto The create PTO request DTO to validate
   * @returns ValidationResult with valid flag and per-field error messages
   */
  validateRequest(dto: CreatePtoRequestDto): ValidationResult {
    const errors: Record<string, string> = {};

    // Validate start date is not in the past (today is valid)
    if (dto.startDate) {
      const today = this.getToday();
      const startDate = this.parseDate(dto.startDate);
      if (startDate < today) {
        errors['startDate'] = 'Start date cannot be in the past';
      }
    } else {
      errors['startDate'] = 'Start date is required';
    }

    // Validate end date >= start date
    if (dto.endDate && dto.startDate) {
      const startDate = this.parseDate(dto.startDate);
      const endDate = this.parseDate(dto.endDate);
      if (endDate < startDate) {
        errors['endDate'] = 'End date must be on or after start date';
      }
    } else if (!dto.endDate) {
      errors['endDate'] = 'End date is required';
    }

    // Validate request type is provided and non-empty
    if (!dto.requestType || dto.requestType.trim().length === 0) {
      errors['requestType'] = 'Please select a leave type';
    }

    // Validate reason max length (1000 characters)
    if (dto.reason && dto.reason.length > 1000) {
      errors['notes'] = 'Notes must not exceed 1000 characters';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
   * Checks whether a status transition is valid according to the workflow state machine.
   * @param currentStatus The current status of the request
   * @param targetStatus The desired target status
   * @returns true if the transition is allowed
   */
  canTransition(currentStatus: RequestStatus, targetStatus: RequestStatus): boolean {
    const validTargets = VALID_TRANSITIONS[currentStatus];
    if (!validTargets) {
      return false;
    }
    return validTargets.includes(targetStatus);
  }

  /**
   * Checks whether a status transition is valid for a given user role.
   * Enforces role-based transition rules:
   * - 'employee' can only transition to Cancelled
   * - 'manager' can transition from Pending_Manager_Approval to Pending_Backoffice_Approval or Rejected
   * - 'backoffice' can transition from Pending_Backoffice_Approval to Approved or Rejected
   * @param from The current status
   * @param to The target status
   * @param role The role of the user attempting the transition
   * @returns true if the transition is valid for the given role
   */
  isValidTransition(from: RequestStatus, to: RequestStatus, role: UserRole): boolean {
    // First check if the transition is valid in the state machine
    if (!this.canTransition(from, to)) {
      return false;
    }

    // Enforce role-based rules
    switch (role) {
      case 'employee':
        return to === RequestStatus.Cancelled;

      case 'manager':
        return (
          from === RequestStatus.Pending_Manager_Approval &&
          (to === RequestStatus.Pending_Backoffice_Approval || to === RequestStatus.Rejected)
        );

      case 'backoffice':
        return (
          from === RequestStatus.Pending_Backoffice_Approval &&
          (to === RequestStatus.Approved || to === RequestStatus.Rejected)
        );

      default:
        return false;
    }
  }

  /**
   * Gets today's date as a Date object with time set to midnight.
   * Extracted for testability.
   */
  protected getToday(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  /**
   * Parses an ISO date string into a Date object at midnight.
   * @param dateStr ISO date string (YYYY-MM-DD)
   */
  private parseDate(dateStr: string): Date {
    const parts = dateStr.split('-');
    return new Date(
      parseInt(parts[0], 10),
      parseInt(parts[1], 10) - 1,
      parseInt(parts[2], 10)
    );
  }
}
