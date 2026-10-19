import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  OnInit
} from '@angular/core';
import { QrTimeCategory } from '../../../models/qr-timekeeping.model';

/**
 * Time Category Selector Component
 *
 * Reusable component that displays time categories (Regular, PTO, Training,
 * Recharge, Excused_Absence) as large, tappable buttons with icons.
 * On mobile viewports (< 768px) it presents as a bottom-sheet style panel.
 *
 * Requirements: 4.1, 4.2, 4.3, 14.3
 */
@Component({
  selector: 'app-time-category-selector',
  templateUrl: './time-category-selector.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TimeCategorySelectorComponent implements OnInit {
  /** Pre-selected category (for edit scenarios) */
  @Input() preselectedCategory: QrTimeCategory | null = null;

  /** Disabled state — prevents selection when true */
  @Input() disabled: boolean = false;

  /** Emits the selected category when user taps a category button */
  @Output() categorySelected = new EventEmitter<QrTimeCategory>();

  /** Available time categories with display metadata */
  categories: { value: QrTimeCategory; label: string; icon: string }[] = [
    { value: 'Regular', label: 'Regular', icon: 'schedule' },
    { value: 'PTO', label: 'PTO', icon: 'beach_access' },
    { value: 'Training', label: 'Training', icon: 'school' },
    { value: 'Recharge', label: 'Recharge', icon: 'battery_charging_full' },
    { value: 'Excused_Absence', label: 'Excused Absence', icon: 'event_busy' }
  ];

  /** Currently selected category */
  selectedCategory: QrTimeCategory | null = null;

  ngOnInit(): void {
    if (this.preselectedCategory) {
      this.selectedCategory = this.preselectedCategory;
    }
  }

  /**
   * Handles category selection.
   * Updates the internal state and emits the selection event.
   * No-op if disabled.
   */
  selectCategory(category: QrTimeCategory): void {
    if (this.disabled) {
      return;
    }
    this.selectedCategory = category;
    this.categorySelected.emit(category);
  }
}
