import { Component, Input } from '@angular/core';
import { JobStatus } from '../../../models/job.model';

/**
 * Status Badge Component
 * 
 * Displays job status with color coding and icon indicators.
 * Supports multiple sizes and is mobile-responsive.
 * 
 * Color Coding:
 * - NotStarted: Gray
 * - EnRoute: Blue
 * - OnSite: Orange
 * - Completed: Green
 * - Issue: Red
 * - Cancelled: Gray
 * 
 * @example
 * <frm-status-badge
 *   [status]="job.status"
 *   size="medium">
 * </frm-status-badge>
 */
@Component({
  selector: 'frm-status-badge',
  templateUrl: './status-badge.component.html',
  styleUrls: ['./status-badge.component.scss']
})
export class StatusBadgeComponent {
  @Input() status!: JobStatus;
  @Input() size: 'small' | 'medium' | 'large' = 'medium';

  /**
   * Get the CSS class for the status
   */
  get statusClass(): string {
    return `status-badge--${this.status.toLowerCase()}`;
  }

  /**
   * Get the size CSS class
   */
  get sizeClass(): string {
    return `status-badge--${this.size}`;
  }

  /**
   * Get the icon for the status
   */
  get statusIcon(): string {
    const iconMap: Record<JobStatus, string> = {
      [JobStatus.NotStarted]: 'schedule',
      [JobStatus.EnRoute]: 'directions_car',
      [JobStatus.OnSite]: 'location_on',
      [JobStatus.Completed]: 'check_circle',
      [JobStatus.Issue]: 'error',
      [JobStatus.Cancelled]: 'cancel'
    };
    return iconMap[this.status] || 'help';
  }

  /**
   * Get the display text for the status
   */
  get statusText(): string {
    const textMap: Record<JobStatus, string> = {
      [JobStatus.NotStarted]: 'Not Started',
      [JobStatus.EnRoute]: 'En Route',
      [JobStatus.OnSite]: 'On Site',
      [JobStatus.Completed]: 'Completed',
      [JobStatus.Issue]: 'Issue',
      [JobStatus.Cancelled]: 'Cancelled'
    };
    return textMap[this.status] || this.status;
  }
}
