import { FormControl } from '@angular/forms';
import { validateSSNLastFour, ssnLastFourValidator } from './ssn-validation.util';

describe('ssn-validation.util', () => {
  describe('validateSSNLastFour', () => {
    it('should return true for exactly four numeric digits', () => {
      expect(validateSSNLastFour('1234')).toBeTrue();
      expect(validateSSNLastFour('0000')).toBeTrue();
      expect(validateSSNLastFour('9999')).toBeTrue();
    });

    it('should return false for fewer than four digits', () => {
      expect(validateSSNLastFour('123')).toBeFalse();
      expect(validateSSNLastFour('1')).toBeFalse();
      expect(validateSSNLastFour('')).toBeFalse();
    });

    it('should return false for more than four digits', () => {
      expect(validateSSNLastFour('12345')).toBeFalse();
      expect(validateSSNLastFour('123456789')).toBeFalse();
    });

    it('should return false for non-numeric characters', () => {
      expect(validateSSNLastFour('abcd')).toBeFalse();
      expect(validateSSNLastFour('12ab')).toBeFalse();
      expect(validateSSNLastFour('12.4')).toBeFalse();
      expect(validateSSNLastFour('12 4')).toBeFalse();
    });

    it('should return false for strings with leading/trailing spaces', () => {
      expect(validateSSNLastFour(' 1234')).toBeFalse();
      expect(validateSSNLastFour('1234 ')).toBeFalse();
    });
  });

  describe('ssnLastFourValidator', () => {
    it('should return null for a valid four-digit value', () => {
      const control = new FormControl('1234');
      expect(ssnLastFourValidator(control)).toBeNull();
    });

    it('should return null for an empty value (no validation when empty)', () => {
      const control = new FormControl('');
      expect(ssnLastFourValidator(control)).toBeNull();
    });

    it('should return null for a null value', () => {
      const control = new FormControl(null);
      expect(ssnLastFourValidator(control)).toBeNull();
    });

    it('should return { ssnLastFour: true } for an invalid value', () => {
      const control = new FormControl('123');
      expect(ssnLastFourValidator(control)).toEqual({ ssnLastFour: true });
    });

    it('should return { ssnLastFour: true } for non-numeric input', () => {
      const control = new FormControl('abcd');
      expect(ssnLastFourValidator(control)).toEqual({ ssnLastFour: true });
    });

    it('should return { ssnLastFour: true } for too many digits', () => {
      const control = new FormControl('12345');
      expect(ssnLastFourValidator(control)).toEqual({ ssnLastFour: true });
    });
  });
});
