import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

/**
 * Empty State Component
 * 
 * Displays an empty state message when lists or views have no data.
 * Provides customizable icon, message, and optional action button.
 * 
 * Features:
 * - Customizable icon
 * - Customizable message
 * - Optional action button
 * - Centered layout
 * - Mobile-responsive
 * 
 * @example
 * <frm-empty-state
 *   icon="work"
 *   message="No jobs found"
 *   actionText="Create Job"
 *   (action)="onCreateJob()">
 * </frm-empty-state>
 */
@Component({
  selector: 'frm-empty-state',
  templateUrl: './empty-state.component.html',
  styleUrls: ['./empty-state.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmptyStateComponent {
  @Input() icon = 'inbox';
  @Input() message = 'No data available';
  @Input() description?: string;
  @Input() actionText?: string;
  @Input() actionIcon?: string;
  
  @Output() action = new EventEmitter<void>();

  /**
   * Handle action button click
   */
  onAction(): void {
    this.action.emit();
  }
}
