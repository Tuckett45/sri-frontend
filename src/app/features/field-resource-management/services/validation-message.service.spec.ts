import { TestBed } from '@angular/core/testing';
import { ValidationMessageService } from './validation-message.service';

describe('ValidationMessageService', () => {
  let service: ValidationMessageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ValidationMessageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getErrorMessage', () => {
    it('should return empty string for null errors', () => {
      expect(service.getErrorMessage('field', null)).toBe('');
    });

    it('should return required message', () => {
      expect(service.getErrorMessage('email', { required: true }))
        .toBe('Email is required');
    });

    it('should return email validation message', () => {
      expect(service.getErrorMessage('email', { email: true }))
        .toBe('Please enter a valid email address');
    });

    it('should return phone number validation message', () => {
      expect(service.getErrorMessage('phone', { phoneNumber: { value: '123' } }))
        .toBe('Please enter a valid phone number (e.g., 123-456-7890)');
    });

    it('should return date range validation message', () => {
      expect(service.getErrorMessage('dateRange', { dateRange: { startDate: '2024-01-31', endDate: '2024-01-01' } }))
        .toBe('End date must be after or equal to start date');
    });

    it('should return greater than zero validation message', () => {
      expect(service.getErrorMessage('crewSize', { greaterThanZero: { value: 0 } }))
        .toBe('Crew Size must be greater than zero');
    });

    it('should return min value validation message', () => {
      expect(service.getErrorMessage('age', { minValue: { min: 18, actual: 15 } }))
        .toBe('Age must be at least 18');
    });

    it('should return max value validation message', () => {
      expect(service.getErrorMessage('age', { maxValue: { max: 100, actual: 150 } }))
        .toBe('Age must be at most 100');
    });

    it('should return crew size validation message', () => {
      expect(service.getErrorMessage('crewSize', { crewSize: { value: 1.5 } }))
        .toBe('Crew size must be a positive whole number');
    });

    it('should return estimated hours validation message', () => {
      expect(service.getErrorMessage('estimatedHours', { estimatedHours: { value: 0 } }))
        .toBe('Estimated hours must be greater than zero');
    });

    it('should return required skills validation message', () => {
      expect(service.getErrorMessage('skills', { requiredSkills: true }))
        .toBe('At least one skill must be selected');
    });

    it('should return ZIP code validation message', () => {
      expect(service.getErrorMessage('zipCode', { zipCode: { value: '1234' } }))
        .toBe('Please enter a valid ZIP code (e.g., 12345 or 12345-6789)');
    });

    it('should return hourly rate validation message', () => {
      expect(service.getErrorMessage('hourlyRate', { hourlyRate: { value: 5, min: 10, max: 500 } }))
        .toBe('Hourly rate must be between $10 and $500');
    });

    it('should return mileage validation message', () => {
      expect(service.getErrorMessage('mileage', { mileage: { value: -1 } }))
        .toBe('Mileage must be a non-negative number');
    });

    it('should return minlength validation message', () => {
      expect(service.getErrorMessage('password', { minlength: { requiredLength: 8, actualLength: 5 } }))
        .toBe('Password must be at least 8 characters');
    });

    it('should return maxlength validation message', () => {
      expect(service.getErrorMessage('description', { maxlength: { requiredLength: 500, actualLength: 600 } }))
        .toBe('Description must be at most 500 characters');
    });

    it('should return pattern validation message', () => {
      expect(service.getErrorMessage('username', { pattern: { requiredPattern: '^[a-zA-Z0-9]+$', actualValue: 'user@name' } }))
        .toBe('Username format is invalid');
    });

    it('should return default message for unknown error', () => {
      expect(service.getErrorMessage('field', { customError: true }))
        .toBe('Field is invalid');
    });

    it('should capitalize camelCase field names', () => {
      expect(service.getErrorMessage('firstName', { required: true }))
        .toBe('First name is required');
    });
  });

  describe('hasError', () => {
    it('should return false for null errors', () => {
      expect(service.hasError(null)).toBe(false);
    });

    it('should return false for empty errors object', () => {
      expect(service.hasError({})).toBe(false);
    });

    it('should return true for errors object with errors', () => {
      expect(service.hasError({ required: true })).toBe(true);
    });
  });

  describe('getAllErrorMessages', () => {
    it('should return empty array for null errors', () => {
      expect(service.getAllErrorMessages('field', null)).toEqual([]);
    });

    it('should return all error messages', () => {
      const errors = {
        required: true,
        minlength: { requiredLength: 8, actualLength: 5 }
      };
      
      const messages = service.getAllErrorMessages('password', errors);
      
      expect(messages.length).toBe(2);
      expect(messages).toContain('Password is required');
      expect(messages).toContain('Password must be at least 8 characters');
    });
  });
});
