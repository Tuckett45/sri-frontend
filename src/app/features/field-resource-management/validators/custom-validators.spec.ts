import { FormControl, FormGroup } from '@angular/forms';
import { CustomValidators } from './custom-validators';

describe('CustomValidators', () => {
  
  describe('phoneNumber', () => {
    it('should accept valid US phone number formats', () => {
      const validator = CustomValidators.phoneNumber();
      
      expect(validator(new FormControl('1234567890'))).toBeNull();
      expect(validator(new FormControl('123-456-7890'))).toBeNull();
      expect(validator(new FormControl('(123) 456-7890'))).toBeNull();
      expect(validator(new FormControl('+1 123 456 7890'))).toBeNull();
      expect(validator(new FormControl('11234567890'))).toBeNull();
    });

    it('should reject invalid phone numbers', () => {
      const validator = CustomValidators.phoneNumber();
      
      expect(validator(new FormControl('123'))).toEqual({ phoneNumber: { value: '123' } });
      expect(validator(new FormControl('abcdefghij'))).toEqual({ phoneNumber: { value: 'abcdefghij' } });
      expect(validator(new FormControl('123-456'))).toEqual({ phoneNumber: { value: '123-456' } });
    });

    it('should not validate empty values', () => {
      const validator = CustomValidators.phoneNumber();
      
      expect(validator(new FormControl(''))).toBeNull();
      expect(validator(new FormControl(null))).toBeNull();
    });
  });

  describe('dateRange', () => {
    it('should accept valid date ranges', () => {
      const validator = CustomValidators.dateRange('startDate', 'endDate');
      const group = new FormGroup({
        startDate: new FormControl('2024-01-01'),
        endDate: new FormControl('2024-01-31')
      });
      
      expect(validator(group)).toBeNull();
    });

    it('should accept equal dates', () => {
      const validator = CustomValidators.dateRange('startDate', 'endDate');
      const group = new FormGroup({
        startDate: new FormControl('2024-01-01'),
        endDate: new FormControl('2024-01-01')
      });
      
      expect(validator(group)).toBeNull();
    });

    it('should reject invalid date ranges', () => {
      const validator = CustomValidators.dateRange('startDate', 'endDate');
      const group = new FormGroup({
        startDate: new FormControl('2024-01-31'),
        endDate: new FormControl('2024-01-01')
      });
      
      expect(validator(group)).toEqual({
        dateRange: { startDate: '2024-01-31', endDate: '2024-01-01' }
      });
    });

    it('should not validate if either date is missing', () => {
      const validator = CustomValidators.dateRange('startDate', 'endDate');
      const group = new FormGroup({
        startDate: new FormControl('2024-01-01'),
        endDate: new FormControl(null)
      });
      
      expect(validator(group)).toBeNull();
    });
  });

  describe('greaterThanZero', () => {
    it('should accept positive numbers', () => {
      const validator = CustomValidators.greaterThanZero();
      
      expect(validator(new FormControl(1))).toBeNull();
      expect(validator(new FormControl(100))).toBeNull();
      expect(validator(new FormControl(0.5))).toBeNull();
    });

    it('should reject zero and negative numbers', () => {
      const validator = CustomValidators.greaterThanZero();
      
      expect(validator(new FormControl(0))).toEqual({ greaterThanZero: { value: 0 } });
      expect(validator(new FormControl(-1))).toEqual({ greaterThanZero: { value: -1 } });
    });

    it('should not validate empty values', () => {
      const validator = CustomValidators.greaterThanZero();
      
      expect(validator(new FormControl(''))).toBeNull();
      expect(validator(new FormControl(null))).toBeNull();
    });
  });

  describe('minValue', () => {
    it('should accept values greater than or equal to minimum', () => {
      const validator = CustomValidators.minValue(10);
      
      expect(validator(new FormControl(10))).toBeNull();
      expect(validator(new FormControl(20))).toBeNull();
      expect(validator(new FormControl(100))).toBeNull();
    });

    it('should reject values less than minimum', () => {
      const validator = CustomValidators.minValue(10);
      
      expect(validator(new FormControl(5))).toEqual({ minValue: { min: 10, actual: 5 } });
      expect(validator(new FormControl(0))).toEqual({ minValue: { min: 10, actual: 0 } });
    });
  });

  describe('maxValue', () => {
    it('should accept values less than or equal to maximum', () => {
      const validator = CustomValidators.maxValue(100);
      
      expect(validator(new FormControl(100))).toBeNull();
      expect(validator(new FormControl(50))).toBeNull();
      expect(validator(new FormControl(0))).toBeNull();
    });

    it('should reject values greater than maximum', () => {
      const validator = CustomValidators.maxValue(100);
      
      expect(validator(new FormControl(101))).toEqual({ maxValue: { max: 100, actual: 101 } });
      expect(validator(new FormControl(200))).toEqual({ maxValue: { max: 100, actual: 200 } });
    });
  });

  describe('crewSize', () => {
    it('should accept positive integers', () => {
      const validator = CustomValidators.crewSize();
      
      expect(validator(new FormControl(1))).toBeNull();
      expect(validator(new FormControl(5))).toBeNull();
      expect(validator(new FormControl(10))).toBeNull();
    });

    it('should reject zero, negative numbers, and decimals', () => {
      const validator = CustomValidators.crewSize();
      
      expect(validator(new FormControl(0))).toEqual({ crewSize: { value: 0 } });
      expect(validator(new FormControl(-1))).toEqual({ crewSize: { value: -1 } });
      expect(validator(new FormControl(1.5))).toEqual({ crewSize: { value: 1.5 } });
    });
  });

  describe('estimatedHours', () => {
    it('should accept positive numbers', () => {
      const validator = CustomValidators.estimatedHours();
      
      expect(validator(new FormControl(1))).toBeNull();
      expect(validator(new FormControl(8.5))).toBeNull();
      expect(validator(new FormControl(40))).toBeNull();
    });

    it('should reject zero and negative numbers', () => {
      const validator = CustomValidators.estimatedHours();
      
      expect(validator(new FormControl(0))).toEqual({ estimatedHours: { value: 0 } });
      expect(validator(new FormControl(-5))).toEqual({ estimatedHours: { value: -5 } });
    });
  });

  describe('requiredSkills', () => {
    it('should accept non-empty arrays', () => {
      const validator = CustomValidators.requiredSkills();
      
      expect(validator(new FormControl(['skill1']))).toBeNull();
      expect(validator(new FormControl(['skill1', 'skill2']))).toBeNull();
    });

    it('should reject empty arrays and null values', () => {
      const validator = CustomValidators.requiredSkills();
      
      expect(validator(new FormControl([]))).toEqual({ requiredSkills: true });
      expect(validator(new FormControl(null))).toEqual({ requiredSkills: true });
    });
  });

  describe('zipCode', () => {
    it('should accept valid ZIP code formats', () => {
      const validator = CustomValidators.zipCode();
      
      expect(validator(new FormControl('12345'))).toBeNull();
      expect(validator(new FormControl('12345-6789'))).toBeNull();
    });

    it('should reject invalid ZIP codes', () => {
      const validator = CustomValidators.zipCode();
      
      expect(validator(new FormControl('1234'))).toEqual({ zipCode: { value: '1234' } });
      expect(validator(new FormControl('123456'))).toEqual({ zipCode: { value: '123456' } });
      expect(validator(new FormControl('abcde'))).toEqual({ zipCode: { value: 'abcde' } });
    });

    it('should not validate empty values', () => {
      const validator = CustomValidators.zipCode();
      
      expect(validator(new FormControl(''))).toBeNull();
      expect(validator(new FormControl(null))).toBeNull();
    });
  });

  describe('hourlyRate', () => {
    it('should accept valid hourly rates', () => {
      const validator = CustomValidators.hourlyRate();
      
      expect(validator(new FormControl(10))).toBeNull();
      expect(validator(new FormControl(50))).toBeNull();
      expect(validator(new FormControl(500))).toBeNull();
    });

    it('should reject rates outside acceptable range', () => {
      const validator = CustomValidators.hourlyRate();
      
      expect(validator(new FormControl(5))).toEqual({ hourlyRate: { value: 5, min: 10, max: 500 } });
      expect(validator(new FormControl(501))).toEqual({ hourlyRate: { value: 501, min: 10, max: 500 } });
    });
  });

  describe('mileage', () => {
    it('should accept non-negative numbers', () => {
      const validator = CustomValidators.mileage();
      
      expect(validator(new FormControl(0))).toBeNull();
      expect(validator(new FormControl(10))).toBeNull();
      expect(validator(new FormControl(100.5))).toBeNull();
    });

    it('should reject negative numbers', () => {
      const validator = CustomValidators.mileage();
      
      expect(validator(new FormControl(-1))).toEqual({ mileage: { value: -1 } });
      expect(validator(new FormControl(-10.5))).toEqual({ mileage: { value: -10.5 } });
    });
  });

  describe('certificationDates', () => {
    it('should accept valid certification date ranges', () => {
      const validator = CustomValidators.certificationDates('issueDate', 'expirationDate');
      const group = new FormGroup({
        issueDate: new FormControl('2024-01-01'),
        expirationDate: new FormControl('2025-01-01')
      });
      
      expect(validator(group)).toBeNull();
    });

    it('should reject expiration date before or equal to issue date', () => {
      const validator = CustomValidators.certificationDates('issueDate', 'expirationDate');
      const group = new FormGroup({
        issueDate: new FormControl('2024-01-01'),
        expirationDate: new FormControl('2024-01-01')
      });
      
      expect(validator(group)).toEqual({
        certificationDates: { issueDate: '2024-01-01', expirationDate: '2024-01-01' }
      });
    });
  });
});
