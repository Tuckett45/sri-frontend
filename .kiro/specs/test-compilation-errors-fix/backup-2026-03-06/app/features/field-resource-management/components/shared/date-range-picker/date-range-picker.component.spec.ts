import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatNativeDateModule } from '@angular/material/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { DateRangePickerComponent, DateRange } from './date-range-picker.component';

describe('DateRangePickerComponent', () => {
  let component: DateRangePickerComponent;
  let fixture: ComponentFixture<DateRangePickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DateRangePickerComponent],
      imports: [
        ReactiveFormsModule,
        MatDatepickerModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule,
        MatNativeDateModule,
        BrowserAnimationsModule
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DateRangePickerComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should initialize with empty date range', () => {
      fixture.detectChanges();
      
      expect(component.range.value.start).toBeNull();
      expect(component.range.value.end).toBeNull();
    });

    it('should initialize with provided dateRange input', () => {
      const startDate = new Date(2024, 0, 1);
      const endDate = new Date(2024, 0, 31);
      
      component.dateRange = { startDate, endDate };
      component.ngOnInit();
      
      expect(component.range.value.start).toEqual(startDate);
      expect(component.range.value.end).toEqual(endDate);
    });

    it('should have correct preset ranges', () => {
      expect(component.presetRanges).toEqual([
        { label: 'Today', value: 'today' },
        { label: 'Last 7 Days', value: 'last7Days' },
        { label: 'Last 30 Days', value: 'last30Days' },
        { label: 'This Month', value: 'thisMonth' },
        { label: 'Last Month', value: 'lastMonth' },
        { label: 'Custom', value: 'custom' }
      ]);
    });

    it('should initialize as not disabled', () => {
      fixture.detectChanges();
      expect(component.disabled).toBe(false);
    });
  });

  describe('Preset Ranges', () => {
    beforeEach(() => {
      jasmine.clock().install();
      // Set a fixed date for testing: January 15, 2024
      jasmine.clock().mockDate(new Date(2024, 0, 15));
    });

    afterEach(() => {
      jasmine.clock().uninstall();
    });

    it('should apply "Today" preset correctly', () => {
      component.applyPreset('today');
      
      const start = component.range.value.start;
      const end = component.range.value.end;
      
      expect(start).toBeTruthy();
      expect(end).toBeTruthy();
      expect(start!.getDate()).toBe(15);
      expect(end!.getDate()).toBe(15);
      expect(start!.getMonth()).toBe(0);
      expect(end!.getMonth()).toBe(0);
    });

    it('should apply "Last 7 Days" preset correctly', () => {
      component.applyPreset('last7Days');
      
      const start = component.range.value.start;
      const end = component.range.value.end;
      
      expect(start).toBeTruthy();
      expect(end).toBeTruthy();
      // Should be 7 days including today (15 - 6 = 9)
      expect(start!.getDate()).toBe(9);
      expect(end!.getDate()).toBe(15);
    });

    it('should apply "Last 30 Days" preset correctly', () => {
      component.applyPreset('last30Days');
      
      const start = component.range.value.start;
      const end = component.range.value.end;
      
      expect(start).toBeTruthy();
      expect(end).toBeTruthy();
      // Should be 30 days including today (Dec 17 to Jan 15)
      expect(start!.getMonth()).toBe(11); // December
      expect(start!.getDate()).toBe(17);
      expect(end!.getMonth()).toBe(0); // January
      expect(end!.getDate()).toBe(15);
    });

    it('should apply "This Month" preset correctly', () => {
      component.applyPreset('thisMonth');
      
      const start = component.range.value.start;
      const end = component.range.value.end;
      
      expect(start).toBeTruthy();
      expect(end).toBeTruthy();
      expect(start!.getDate()).toBe(1);
      expect(start!.getMonth()).toBe(0);
      expect(end!.getDate()).toBe(15);
      expect(end!.getMonth()).toBe(0);
    });

    it('should apply "Last Month" preset correctly', () => {
      component.applyPreset('lastMonth');
      
      const start = component.range.value.start;
      const end = component.range.value.end;
      
      expect(start).toBeTruthy();
      expect(end).toBeTruthy();
      // December 1 to December 31
      expect(start!.getMonth()).toBe(11);
      expect(start!.getDate()).toBe(1);
      expect(end!.getMonth()).toBe(11);
      expect(end!.getDate()).toBe(31);
    });

    it('should not set dates for "Custom" preset', () => {
      component.range.patchValue({ start: null, end: null });
      component.applyPreset('custom');
      
      expect(component.range.value.start).toBeNull();
      expect(component.range.value.end).toBeNull();
    });

    it('should not change dates for unknown preset', () => {
      const initialStart = new Date(2024, 0, 1);
      const initialEnd = new Date(2024, 0, 31);
      component.range.patchValue({ start: initialStart, end: initialEnd });
      
      component.applyPreset('unknown');
      
      expect(component.range.value.start).toEqual(initialStart);
      expect(component.range.value.end).toEqual(initialEnd);
    });
  });

  describe('Clear Range', () => {
    it('should clear date range', () => {
      const startDate = new Date(2024, 0, 1);
      const endDate = new Date(2024, 0, 31);
      component.range.patchValue({ start: startDate, end: endDate });
      
      component.clearRange();
      
      expect(component.range.value.start).toBeNull();
      expect(component.range.value.end).toBeNull();
    });

    it('should call onChange when clearing', () => {
      const onChangeSpy = jasmine.createSpy('onChange');
      component.registerOnChange(onChangeSpy);
      
      component.clearRange();
      
      expect(onChangeSpy).toHaveBeenCalledWith({ start: null, end: null });
    });

    it('should call onTouched when clearing', () => {
      const onTouchedSpy = jasmine.createSpy('onTouched');
      component.registerOnTouched(onTouchedSpy);
      
      component.clearRange();
      
      expect(onTouchedSpy).toHaveBeenCalled();
    });
  });

  describe('Validation', () => {
    it('should return true for valid range (start before end)', () => {
      const startDate = new Date(2024, 0, 1);
      const endDate = new Date(2024, 0, 31);
      component.range.patchValue({ start: startDate, end: endDate });
      
      expect(component.isValidRange).toBe(true);
    });

    it('should return true for valid range (start equals end)', () => {
      const date = new Date(2024, 0, 15);
      component.range.patchValue({ start: date, end: date });
      
      expect(component.isValidRange).toBe(true);
    });

    it('should return false for invalid range (start after end)', () => {
      const startDate = new Date(2024, 0, 31);
      const endDate = new Date(2024, 0, 1);
      component.range.patchValue({ start: startDate, end: endDate });
      
      expect(component.isValidRange).toBe(false);
    });

    it('should return false when start is null', () => {
      const endDate = new Date(2024, 0, 31);
      component.range.patchValue({ start: null, end: endDate });
      
      expect(component.isValidRange).toBe(false);
    });

    it('should return false when end is null', () => {
      const startDate = new Date(2024, 0, 1);
      component.range.patchValue({ start: startDate, end: null });
      
      expect(component.isValidRange).toBe(false);
    });

    it('should return false when both dates are null', () => {
      component.range.patchValue({ start: null, end: null });
      
      expect(component.isValidRange).toBe(false);
    });
  });

  describe('ControlValueAccessor Implementation', () => {
    it('should write value to form', () => {
      const startDate = new Date(2024, 0, 1);
      const endDate = new Date(2024, 0, 31);
      
      component.writeValue({ start: startDate, end: endDate });
      
      expect(component.range.value.start).toEqual(startDate);
      expect(component.range.value.end).toEqual(endDate);
    });

    it('should reset form when writing null value', () => {
      const startDate = new Date(2024, 0, 1);
      const endDate = new Date(2024, 0, 31);
      component.range.patchValue({ start: startDate, end: endDate });
      
      component.writeValue(null);
      
      expect(component.range.value.start).toBeNull();
      expect(component.range.value.end).toBeNull();
    });

    it('should register onChange callback', () => {
      const onChangeSpy = jasmine.createSpy('onChange');
      
      component.registerOnChange(onChangeSpy);
      
      expect(component['onChange']).toBe(onChangeSpy);
    });

    it('should register onTouched callback', () => {
      const onTouchedSpy = jasmine.createSpy('onTouched');
      
      component.registerOnTouched(onTouchedSpy);
      
      expect(component['onTouched']).toBe(onTouchedSpy);
    });

    it('should call onChange when range changes', (done) => {
      const onChangeSpy = jasmine.createSpy('onChange');
      component.registerOnChange(onChangeSpy);
      component.ngOnInit();
      
      const startDate = new Date(2024, 0, 1);
      const endDate = new Date(2024, 0, 31);
      
      component.range.patchValue({ start: startDate, end: endDate });
      
      setTimeout(() => {
        expect(onChangeSpy).toHaveBeenCalledWith({ start: startDate, end: endDate });
        done();
      }, 100);
    });

    it('should call onTouched when range changes', (done) => {
      const onTouchedSpy = jasmine.createSpy('onTouched');
      component.registerOnTouched(onTouchedSpy);
      component.ngOnInit();
      
      const startDate = new Date(2024, 0, 1);
      const endDate = new Date(2024, 0, 31);
      
      component.range.patchValue({ start: startDate, end: endDate });
      
      setTimeout(() => {
        expect(onTouchedSpy).toHaveBeenCalled();
        done();
      }, 100);
    });

    it('should emit dateRangeChange when range changes', (done) => {
      component.ngOnInit();
      
      const startDate = new Date(2024, 0, 1);
      const endDate = new Date(2024, 0, 31);
      
      component.dateRangeChange.subscribe((dateRange: DateRange) => {
        expect(dateRange.startDate).toEqual(startDate);
        expect(dateRange.endDate).toEqual(endDate);
        done();
      });
      
      component.range.patchValue({ start: startDate, end: endDate });
    });

    it('should not call onChange when only start date is set', (done) => {
      const onChangeSpy = jasmine.createSpy('onChange');
      component.registerOnChange(onChangeSpy);
      component.ngOnInit();
      
      const startDate = new Date(2024, 0, 1);
      component.range.patchValue({ start: startDate, end: null });
      
      setTimeout(() => {
        expect(onChangeSpy).not.toHaveBeenCalled();
        done();
      }, 100);
    });

    it('should not call onChange when only end date is set', (done) => {
      const onChangeSpy = jasmine.createSpy('onChange');
      component.registerOnChange(onChangeSpy);
      component.ngOnInit();
      
      const endDate = new Date(2024, 0, 31);
      component.range.patchValue({ start: null, end: endDate });
      
      setTimeout(() => {
        expect(onChangeSpy).not.toHaveBeenCalled();
        done();
      }, 100);
    });
  });

  describe('Disabled State', () => {
    it('should disable form when setDisabledState is called with true', () => {
      component.setDisabledState(true);
      
      expect(component.disabled).toBe(true);
      expect(component.range.disabled).toBe(true);
    });

    it('should enable form when setDisabledState is called with false', () => {
      component.setDisabledState(true);
      component.setDisabledState(false);
      
      expect(component.disabled).toBe(false);
      expect(component.range.disabled).toBe(false);
    });
  });

  describe('Component Rendering', () => {
    it('should render preset buttons', () => {
      fixture.detectChanges();
      
      const buttons = fixture.nativeElement.querySelectorAll('.date-range-picker__presets button');
      expect(buttons.length).toBe(6);
    });

    it('should render date range input', () => {
      fixture.detectChanges();
      
      const dateRangeInput = fixture.nativeElement.querySelector('mat-date-range-input');
      expect(dateRangeInput).toBeTruthy();
    });

    it('should render clear button', () => {
      fixture.detectChanges();
      
      const clearButton = fixture.nativeElement.querySelector('.date-range-picker__clear');
      expect(clearButton).toBeTruthy();
    });

    it('should disable preset buttons when component is disabled', () => {
      component.setDisabledState(true);
      fixture.detectChanges();
      
      const buttons = fixture.nativeElement.querySelectorAll('.date-range-picker__presets button');
      buttons.forEach((button: HTMLButtonElement) => {
        expect(button.disabled).toBe(true);
      });
    });

    it('should disable clear button when no dates are selected', () => {
      component.range.patchValue({ start: null, end: null });
      fixture.detectChanges();
      
      const clearButton = fixture.nativeElement.querySelector('.date-range-picker__clear');
      expect(clearButton.disabled).toBe(true);
    });

    it('should enable clear button when dates are selected', () => {
      const startDate = new Date(2024, 0, 1);
      const endDate = new Date(2024, 0, 31);
      component.range.patchValue({ start: startDate, end: endDate });
      fixture.detectChanges();
      
      const clearButton = fixture.nativeElement.querySelector('.date-range-picker__clear');
      expect(clearButton.disabled).toBe(false);
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label on clear button', () => {
      fixture.detectChanges();
      
      const clearButton = fixture.nativeElement.querySelector('.date-range-picker__clear');
      expect(clearButton.getAttribute('aria-label')).toBe('Clear date range');
    });

    it('should have tooltip on clear button', () => {
      fixture.detectChanges();
      
      const clearButton = fixture.nativeElement.querySelector('.date-range-picker__clear');
      expect(clearButton.getAttribute('matTooltip')).toBe('Clear date range');
    });

    it('should have proper button types to prevent form submission', () => {
      fixture.detectChanges();
      
      const buttons = fixture.nativeElement.querySelectorAll('button');
      buttons.forEach((button: HTMLButtonElement) => {
        expect(button.type).toBe('button');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle leap year in Last Month preset', () => {
      jasmine.clock().install();
      // March 1, 2024 (2024 is a leap year)
      jasmine.clock().mockDate(new Date(2024, 2, 1));
      
      component.applyPreset('lastMonth');
      
      const start = component.range.value.start;
      const end = component.range.value.end;
      
      expect(start!.getMonth()).toBe(1); // February
      expect(start!.getDate()).toBe(1);
      expect(end!.getMonth()).toBe(1); // February
      expect(end!.getDate()).toBe(29); // Leap year
      
      jasmine.clock().uninstall();
    });

    it('should handle year boundary in Last 30 Days preset', () => {
      jasmine.clock().install();
      // January 15, 2024
      jasmine.clock().mockDate(new Date(2024, 0, 15));
      
      component.applyPreset('last30Days');
      
      const start = component.range.value.start;
      const end = component.range.value.end;
      
      expect(start!.getFullYear()).toBe(2023);
      expect(start!.getMonth()).toBe(11); // December
      expect(end!.getFullYear()).toBe(2024);
      expect(end!.getMonth()).toBe(0); // January
      
      jasmine.clock().uninstall();
    });

    it('should handle January when applying Last Month preset', () => {
      jasmine.clock().install();
      // January 15, 2024
      jasmine.clock().mockDate(new Date(2024, 0, 15));
      
      component.applyPreset('lastMonth');
      
      const start = component.range.value.start;
      const end = component.range.value.end;
      
      expect(start!.getFullYear()).toBe(2023);
      expect(start!.getMonth()).toBe(11); // December
      expect(start!.getDate()).toBe(1);
      expect(end!.getFullYear()).toBe(2023);
      expect(end!.getMonth()).toBe(11); // December
      expect(end!.getDate()).toBe(31);
      
      jasmine.clock().uninstall();
    });
  });

  describe('Integration with Reactive Forms', () => {
    it('should work with FormControl', () => {
      const formControl = new FormControl();
      component.registerOnChange((value) => formControl.setValue(value, { emitEvent: false }));
      component.ngOnInit();
      
      const startDate = new Date(2024, 0, 1);
      const endDate = new Date(2024, 0, 31);
      component.range.patchValue({ start: startDate, end: endDate });
      
      setTimeout(() => {
        expect(formControl.value).toEqual({ start: startDate, end: endDate });
      }, 100);
    });

    it('should update when FormControl value changes', () => {
      const startDate = new Date(2024, 0, 1);
      const endDate = new Date(2024, 0, 31);
      
      component.writeValue({ start: startDate, end: endDate });
      
      expect(component.range.value.start).toEqual(startDate);
      expect(component.range.value.end).toEqual(endDate);
    });
  });
});
