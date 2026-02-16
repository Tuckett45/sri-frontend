import { Component, Input } from '@angular/core';
import { ThemePalette } from '@angular/material/core';

/**
 * Loading Spinner Component
 * 
 * A reusable loading spinner with customizable size, color, and message.
 * Uses Material Design spinner (mat-spinner).
 * 
 * Features:
 * - Multiple size options (small, medium, large)
 * - Customizable color
 * - Optional loading message
 * - Centered layout
 * 
 * @example
 * <frm-loading-spinner
 *   size="medium"
 *   color="primary"
 *   message="Loading data...">
 * </frm-loading-spinner>
 */
@Component({
  selector: 'frm-loading-spinner',
  templateUrl: './loading-spinner.component.html',
  styleUrls: ['./loading-spinner.component.scss']
})
export class LoadingSpinnerComponent {
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() color: ThemePalette = 'primary';
  @Input() message?: string;
  @Input() overlay = false;

  /**
   * Get spinner diameter based on size
   */
  get diameter(): number {
    const sizeMap = {
      small: 24,
      medium: 48,
      large: 72
    };
    return sizeMap[this.size];
  }

  /**
   * Get stroke width based on size
   */
  get strokeWidth(): number {
    const widthMap = {
      small: 3,
      medium: 4,
      large: 5
    };
    return widthMap[this.size];
  }
}
