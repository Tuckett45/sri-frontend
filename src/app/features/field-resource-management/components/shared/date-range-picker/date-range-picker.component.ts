import { Component, forwardRef, OnInit, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormGroup, FormControl } from '@angular/forms';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Date Range Picker Component
 * 
 * A reusable date range picker with preset ranges and custom selection.
 * Implements ControlValueAccessor for form integration.
 * 
 * Features:
 * - Material date range picker integration
 * - Preset ranges: Today, This Week, This Month, Last 30 Days
 * - Custom range selection
 * - Date range validation (start <= end)
 * - Form control integration
 * 
 * @example
 * <frm-date-range-picker
 *   formControlName="dateRange">
 * </frm-date-range-picker>
 */
@Component({
  selector: 'frm-date-range-picker',
  templateUrl: './date-range-picker.component.html',
  styleUrls: ['./date-range-picker.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DateRangePickerComponent),
      multi: true
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DateRangePickerComponent implements ControlValueAccessor, OnInit {
  @Input() dateRange: DateRange | null = null;
  @Output() dateRangeChange = new EventEmitter<DateRange>();
  
  range = new FormGroup({
    start: new FormControl<Date | null>(null),
    end: new FormControl<Date | null>(null)
  });

  presetRanges = [
    { label: 'Today', value: 'today' },
    { label: 'Last 7 Days', value: 'last7Days' },
    { label: 'Last 30 Days', value: 'last30Days' },
    { label: 'This Month', value: 'thisMonth' },
    { label: 'Last Month', value: 'lastMonth' },
    { label: 'Custom', value: 'custom' }
  ];

  private onChange: (value: { start: Date | null; end: Date | null }) => void = () => {};
  private onTouched: () => void = () => {};
  disabled = false;

  ngOnInit(): void {
    // Initialize from input if provided
    if (this.dateRange) {
      this.range.patchValue({
        start: this.dateRange.startDate,
        end: this.dateRange.endDate
      });
    }
    
    this.range.valueChanges.subscribe(value => {
      if (value.start && value.end) {
        const dateRange: DateRange = {
          startDate: value.start,
          endDate: value.end
        };
        this.onChange({ start: value.start, end: value.end });
        this.dateRangeChange.emit(dateRange);
        this.onTouched();
      }
    });
  }

  /**
   * Apply preset date range
   */
  applyPreset(preset: string): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let start: Date;
    let end: Date = new Date(today);

    switch (preset) {
      case 'today':
        start = new Date(today);
        break;
      
      case 'last7Days':
        start = new Date(today);
        start.setDate(start.getDate() - 6); // Include today
        break;
      
      case 'last30Days':
        start = new Date(today);
        start.setDate(start.getDate() - 29); // Include today
        break;
      
      case 'thisMonth':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      
      case 'lastMonth':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0); // Last day of previous month
        break;
      
      case 'custom':
        // Don't set any dates, let user pick custom range
        return;
      
      default:
        return;
    }

    this.range.patchValue({ start, end });
  }

  /**
   * Clear date range selection
   */
  clearRange(): void {
    this.range.reset();
    this.onChange({ start: null, end: null });
    this.onTouched();
  }

  /**
   * Check if date range is valid
   */
  get isValidRange(): boolean {
    const start = this.range.value.start;
    const end = this.range.value.end;
    return !!(start && end && start <= end);
  }

  // ControlValueAccessor implementation
  writeValue(value: { start: Date | null; end: Date | null } | null): void {
    if (value) {
      this.range.patchValue(value);
    } else {
      this.range.reset();
    }
  }

  registerOnChange(fn: (value: { start: Date | null; end: Date | null }) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    if (isDisabled) {
      this.range.disable();
    } else {
      this.range.enable();
    }
  }
}
