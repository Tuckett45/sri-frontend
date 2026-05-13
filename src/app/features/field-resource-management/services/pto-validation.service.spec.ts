import { Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PtoValidationService } from './pto-validation.service';
import { CreatePtoRequestDto, RequestStatus, UserRole } from '../models/pto.models';

/**
 * Helper subclass to control "today" for testing date validation
 */
@Injectable()
class TestablePtoValidationService extends PtoValidationService {
  private _today: Date = new Date();

  setToday(date: Date): void {
    this._today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  protected override getToday(): Date {
    return this._today;
  }
}

describe('PtoValidationService', () => {
  let service: TestablePtoValidationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: PtoValidationService, useClass: TestablePtoValidationService }
      ]
    });
    service = TestBed.inject(PtoValidationService) as TestablePtoValidationService;
    // Set a fixed "today" for deterministic tests
    service.setToday(new Date(2025, 0, 15)); // Jan 15, 2025
  });

  describe('validateRequest', () => {
    it('should return valid=true for a valid request', () => {
      const dto: CreatePtoRequestDto = {
        employeeId: 'test-user-001',
        startDate: '2025-01-20',
        endDate: '2025-01-22',
        requestType: 'Vacation',
        reason: 'Family trip'
      };

      const result = service.validateRequest(dto);

      expect(result.valid).toBeTrue();
      expect(Object.keys(result.errors).length).toBe(0);
    });

    it('should accept today as a valid start date', () => {
      const dto: CreatePtoRequestDto = {
        employeeId: 'test-user-001',
        startDate: '2025-01-15',
        endDate: '2025-01-15',
        requestType: 'Sick Leave'
      };

      const result = service.validateRequest(dto);

      expect(result.valid).toBeTrue();
    });

    it('should reject start date in the past', () => {
      const dto: CreatePtoRequestDto = {
        employeeId: 'test-user-001',
        startDate: '2025-01-14',
        endDate: '2025-01-16',
        requestType: 'Vacation'
      };

      const result = service.validateRequest(dto);

      expect(result.valid).toBeFalse();
      expect(result.errors['startDate']).toBe('Start date cannot be in the past');
    });

    it('should reject end date before start date', () => {
      const dto: CreatePtoRequestDto = {
        employeeId: 'test-user-001',
        startDate: '2025-01-20',
        endDate: '2025-01-18',
        requestType: 'Vacation'
      };

      const result = service.validateRequest(dto);

      expect(result.valid).toBeFalse();
      expect(result.errors['endDate']).toBe('End date must be on or after start date');
    });

    it('should accept same start and end date', () => {
      const dto: CreatePtoRequestDto = {
        employeeId: 'test-user-001',
        startDate: '2025-01-20',
        endDate: '2025-01-20',
        requestType: 'Personal Day'
      };

      const result = service.validateRequest(dto);

      expect(result.valid).toBeTrue();
    });

    it('should reject empty request type', () => {
      const dto: CreatePtoRequestDto = {
        employeeId: 'test-user-001',
        startDate: '2025-01-20',
        endDate: '2025-01-22',
        requestType: ''
      };

      const result = service.validateRequest(dto);

      expect(result.valid).toBeFalse();
      expect(result.errors['requestType']).toBe('Please select a leave type');
    });

    it('should reject whitespace-only request type', () => {
      const dto: CreatePtoRequestDto = {
        employeeId: 'test-user-001',
        startDate: '2025-01-20',
        endDate: '2025-01-22',
        requestType: '   '
      };

      const result = service.validateRequest(dto);

      expect(result.valid).toBeFalse();
      expect(result.errors['requestType']).toBe('Please select a leave type');
    });

    it('should reject notes exceeding 1000 characters', () => {
      const dto: CreatePtoRequestDto = {
        employeeId: 'test-user-001',
        startDate: '2025-01-20',
        endDate: '2025-01-22',
        requestType: 'Vacation',
        reason: 'a'.repeat(1001)
      };

      const result = service.validateRequest(dto);

      expect(result.valid).toBeFalse();
      expect(result.errors['notes']).toBe('Notes must not exceed 1000 characters');
    });

    it('should accept notes at exactly 1000 characters', () => {
      const dto: CreatePtoRequestDto = {
        employeeId: 'test-user-001',
        startDate: '2025-01-20',
        endDate: '2025-01-22',
        requestType: 'Vacation',
        reason: 'a'.repeat(1000)
      };

      const result = service.validateRequest(dto);

      expect(result.valid).toBeTrue();
    });

    it('should return multiple errors for multiple invalid fields', () => {
      const dto: CreatePtoRequestDto = {
        employeeId: 'test-user-001',
        startDate: '2025-01-10',
        endDate: '2025-01-08',
        requestType: '',
        reason: 'a'.repeat(1001)
      };

      const result = service.validateRequest(dto);

      expect(result.valid).toBeFalse();
      expect(result.errors['startDate']).toBeDefined();
      expect(result.errors['endDate']).toBeDefined();
      expect(result.errors['requestType']).toBeDefined();
      expect(result.errors['notes']).toBeDefined();
    });
  });

  describe('canTransition', () => {
    it('should allow Pending_Manager_Approval -> Pending_Backoffice_Approval', () => {
      expect(service.canTransition(
        RequestStatus.Pending_Manager_Approval,
        RequestStatus.Pending_Backoffice_Approval
      )).toBeTrue();
    });

    it('should allow Pending_Manager_Approval -> Rejected', () => {
      expect(service.canTransition(
        RequestStatus.Pending_Manager_Approval,
        RequestStatus.Rejected
      )).toBeTrue();
    });

    it('should allow Pending_Manager_Approval -> Cancelled', () => {
      expect(service.canTransition(
        RequestStatus.Pending_Manager_Approval,
        RequestStatus.Cancelled
      )).toBeTrue();
    });

    it('should allow Pending_Backoffice_Approval -> Approved', () => {
      expect(service.canTransition(
        RequestStatus.Pending_Backoffice_Approval,
        RequestStatus.Approved
      )).toBeTrue();
    });

    it('should allow Pending_Backoffice_Approval -> Rejected', () => {
      expect(service.canTransition(
        RequestStatus.Pending_Backoffice_Approval,
        RequestStatus.Rejected
      )).toBeTrue();
    });

    it('should allow Pending_Backoffice_Approval -> Cancelled', () => {
      expect(service.canTransition(
        RequestStatus.Pending_Backoffice_Approval,
        RequestStatus.Cancelled
      )).toBeTrue();
    });

    it('should not allow transitions from terminal statuses', () => {
      const terminalStatuses = [
        RequestStatus.Approved,
        RequestStatus.Rejected,
        RequestStatus.Cancelled
      ];

      for (const status of terminalStatuses) {
        for (const target of Object.values(RequestStatus)) {
          expect(service.canTransition(status, target)).toBeFalse();
        }
      }
    });

    it('should not allow Pending_Manager_Approval -> Approved (skip backoffice)', () => {
      expect(service.canTransition(
        RequestStatus.Pending_Manager_Approval,
        RequestStatus.Approved
      )).toBeFalse();
    });
  });

  describe('isValidTransition', () => {
    it('should allow employee to cancel from Pending_Manager_Approval', () => {
      expect(service.isValidTransition(
        RequestStatus.Pending_Manager_Approval,
        RequestStatus.Cancelled,
        'employee'
      )).toBeTrue();
    });

    it('should allow employee to cancel from Pending_Backoffice_Approval', () => {
      expect(service.isValidTransition(
        RequestStatus.Pending_Backoffice_Approval,
        RequestStatus.Cancelled,
        'employee'
      )).toBeTrue();
    });

    it('should not allow employee to approve', () => {
      expect(service.isValidTransition(
        RequestStatus.Pending_Manager_Approval,
        RequestStatus.Pending_Backoffice_Approval,
        'employee'
      )).toBeFalse();
    });

    it('should allow manager to approve (move to backoffice)', () => {
      expect(service.isValidTransition(
        RequestStatus.Pending_Manager_Approval,
        RequestStatus.Pending_Backoffice_Approval,
        'manager'
      )).toBeTrue();
    });

    it('should allow manager to reject from Pending_Manager_Approval', () => {
      expect(service.isValidTransition(
        RequestStatus.Pending_Manager_Approval,
        RequestStatus.Rejected,
        'manager'
      )).toBeTrue();
    });

    it('should not allow manager to act on Pending_Backoffice_Approval', () => {
      expect(service.isValidTransition(
        RequestStatus.Pending_Backoffice_Approval,
        RequestStatus.Approved,
        'manager'
      )).toBeFalse();
    });

    it('should allow backoffice to approve from Pending_Backoffice_Approval', () => {
      expect(service.isValidTransition(
        RequestStatus.Pending_Backoffice_Approval,
        RequestStatus.Approved,
        'backoffice'
      )).toBeTrue();
    });

    it('should allow backoffice to reject from Pending_Backoffice_Approval', () => {
      expect(service.isValidTransition(
        RequestStatus.Pending_Backoffice_Approval,
        RequestStatus.Rejected,
        'backoffice'
      )).toBeTrue();
    });

    it('should not allow backoffice to act on Pending_Manager_Approval', () => {
      expect(service.isValidTransition(
        RequestStatus.Pending_Manager_Approval,
        RequestStatus.Pending_Backoffice_Approval,
        'backoffice'
      )).toBeFalse();
    });
  });
});
