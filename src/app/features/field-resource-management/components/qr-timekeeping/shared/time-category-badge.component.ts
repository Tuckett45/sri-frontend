import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { QrTimeCategory } from '../../../models/qr-timekeeping.model';

/**
 * TimeCategoryBadgeComponent
 *
 * Displays a styled badge (colored pill) for any QrTimeCategory value.
 * Color coding:
 *   - Green  = Regular
 *   - Blue   = PTO
 *   - Purple = Training
 *   - Orange = Recharge
 *   - Red    = Excused_Absence
 *
 * Requirements: 12.3, 17.1, 17.2
 */
@Component({
  selector: 'app-time-category-badge',
  template: `
    <span class="category-badge"
          [ngClass]="'badge-' + (category || '').toLowerCase().replace('_', '-')">
      {{ displayLabel }}
    </span>
  `,
  styles: [`
    :host {
      display: inline-block;
    }

    .category-badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      white-space: nowrap;
    }

    .badge-regular {
      background-color: #dcfce7;
      color: #166534;
    }

    .badge-pto {
      background-color: #dbeafe;
      color: #1e40af;
    }

    .badge-training {
      background-color: #ede9fe;
      color: #6d28d9;
    }

    .badge-recharge {
      background-color: #ffedd5;
      color: #c2410c;
    }

    .badge-excused-absence {
      background-color: #fee2e2;
      color: #991b1b;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TimeCategoryBadgeComponent {
  @Input() category: QrTimeCategory | string = '';

  get displayLabel(): string {
    if (!this.category) return '';
    switch (this.category) {
      case 'Excused_Absence':
        return 'Excused Absence';
      case 'PTO':
        return 'PTO';
      default:
        return this.category;
    }
  }
}
