import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ValidationErrorDisplayComponent, ValidationError } from './validation-error-display.component';

describe('ValidationErrorDisplayComponent', () => {
  let component: ValidationErrorDisplayComponent;
  let fixture: ComponentFixture<ValidationErrorDisplayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ValidationErrorDisplayComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ValidationErrorDisplayComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('hasErrors', () => {
    it('should return false when errors is null', () => {
      component.errors = null;
      expect(component.hasErrors).toBe(false);
    });

    it('should return false when errors is empty string', () => {
      component.errors = '';
      expect(component.hasErrors).toBe(false);
    });

    it('should return false when errors is empty array', () => {
      component.errors = [];
      expect(component.hasErrors).toBe(false);
    });

    it('should return true when errors is non-empty string', () => {
      component.errors = 'This field is required';
      expect(component.hasErrors).toBe(true);
    });

    it('should return true when errors is non-empty array', () => {
      component.errors = [
        { field: 'name', message: 'Name is required', code: 'REQUIRED' }
      ];
      expect(component.hasErrors).toBe(true);
    });
  });

  describe('errorList', () => {
    it('should return empty array when errors is null', () => {
      component.errors = null;
      expect(component.errorList).toEqual([]);
    });

    it('should convert string error to array', () => {
      component.errors = 'This field is required';
      component.fieldName = 'email';
      
      const errorList = component.errorList;
      expect(errorList.length).toBe(1);
      expect(errorList[0].field).toBe('email');
      expect(errorList[0].message).toBe('This field is required');
      expect(errorList[0].code).toBe('VALIDATION_ERROR');
    });

    it('should return array errors as-is', () => {
      const errors: ValidationError[] = [
        { field: 'name', message: 'Name is required', code: 'REQUIRED' },
        { field: 'email', message: 'Email is invalid', code: 'INVALID_FORMAT' }
      ];
      component.errors = errors;
      
      expect(component.errorList).toEqual(errors);
    });
  });

  describe('Inline mode', () => {
    it('should display inline error for string error', () => {
      component.errors = 'This field is required';
      component.mode = 'inline';
      fixture.detectChanges();

      const errorElement = fixture.nativeElement.querySelector('.validation-error-inline');
      expect(errorElement).toBeTruthy();
      expect(errorElement.textContent).toContain('This field is required');
    });

    it('should display multiple inline errors', () => {
      component.errors = [
        { field: 'name', message: 'Name is required', code: 'REQUIRED' },
        { field: 'email', message: 'Email is invalid', code: 'INVALID_FORMAT' }
      ];
      component.mode = 'inline';
      fixture.detectChanges();

      const errorMessages = fixture.nativeElement.querySelectorAll('.error-message');
      expect(errorMessages.length).toBe(2);
      expect(errorMessages[0].textContent).toContain('Name is required');
      expect(errorMessages[1].textContent).toContain('Email is invalid');
    });

    it('should apply warning class for warning severity', () => {
      component.errors = [
        { field: 'name', message: 'Name is recommended', code: 'RECOMMENDED', severity: 'warning' }
      ];
      component.mode = 'inline';
      fixture.detectChanges();

      const errorMessage = fixture.nativeElement.querySelector('.error-message');
      expect(errorMessage.classList.contains('warning')).toBe(true);
    });

    it('should not display when no errors', () => {
      component.errors = null;
      component.mode = 'inline';
      fixture.detectChanges();

      const errorElement = fixture.nativeElement.querySelector('.validation-error-inline');
      expect(errorElement).toBeFalsy();
    });
  });

  describe('Summary mode', () => {
    it('should display summary for multiple errors', () => {
      component.errors = [
        { field: 'name', message: 'Name is required', code: 'REQUIRED' },
        { field: 'email', message: 'Email is invalid', code: 'INVALID_FORMAT' }
      ];
      component.mode = 'summary';
      fixture.detectChanges();

      const summaryElement = fixture.nativeElement.querySelector('.validation-error-summary');
      expect(summaryElement).toBeTruthy();

      const errorItems = fixture.nativeElement.querySelectorAll('.error-item');
      expect(errorItems.length).toBe(2);
    });

    it('should display field names in summary', () => {
      component.errors = [
        { field: 'name', message: 'is required', code: 'REQUIRED' }
      ];
      component.mode = 'summary';
      fixture.detectChanges();

      const errorItem = fixture.nativeElement.querySelector('.error-item');
      expect(errorItem.textContent).toContain('name:');
      expect(errorItem.textContent).toContain('is required');
    });

    it('should display summary header', () => {
      component.errors = [
        { field: 'name', message: 'Name is required', code: 'REQUIRED' }
      ];
      component.mode = 'summary';
      fixture.detectChanges();

      const summaryTitle = fixture.nativeElement.querySelector('.summary-title');
      expect(summaryTitle.textContent).toContain('Please correct the following errors');
    });

    it('should not display when no errors', () => {
      component.errors = null;
      component.mode = 'summary';
      fixture.detectChanges();

      const summaryElement = fixture.nativeElement.querySelector('.validation-error-summary');
      expect(summaryElement).toBeFalsy();
    });
  });
});
