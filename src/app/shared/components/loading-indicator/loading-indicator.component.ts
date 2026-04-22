import { Component, Input } from '@angular/core';

/**
 * Reusable loading indicator component
 * Supports multiple display modes: spinner, progress bar, and skeleton screen
 */
@Component({
  selector: 'app-loading-indicator',
  templateUrl: './loading-indicator.component.html',
  styleUrls: ['./loading-indicator.component.scss']
})
export class LoadingIndicatorComponent {
  /**
   * Display mode for the loading indicator
   * - spinner: Circular spinner for general loading
   * - progress: Progress bar for operations with known progress
   * - skeleton: Skeleton screen for initial content loads
   */
  @Input() mode: 'spinner' | 'progress' | 'skeleton' = 'spinner';

  /**
   * Size of the loading indicator
   * - small: 24px
   * - medium: 48px (default)
   * - large: 72px
   */
  @Input() size: 'small' | 'medium' | 'large' = 'medium';

  /**
   * Progress value (0-100) for progress bar mode
   */
  @Input() progress: number = 0;

  /**
   * Optional message to display below the indicator
   */
  @Input() message?: string;

  /**
   * Whether to show the indicator inline or as an overlay
   */
  @Input() overlay: boolean = false;

  /**
   * Number of skeleton lines to display (for skeleton mode)
   */
  @Input() skeletonLines: number = 3;
}
