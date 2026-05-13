import { Component, Input, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { JobStatus } from '../../../models/job.model';

/**
 * Status History Entry
 */
export interface StatusHistoryEntry {
  id: string;
  jobId: string;
  status: JobStatus;
  changedBy: string;
  changedAt: Date;
  reason?: string;
}

/**
 * Job Status Timeline Component
 * 
 * Displays job status changes as a vertical timeline.
 * Shows status, timestamp, user who made the change, and optional reason.
 * Uses color coding for different statuses.
 * 
 * Features:
 * - Vertical timeline layout
 * - Color-coded status indicators
 * - Status icons
 * - Timestamp and user information
 * - Optional reason for status change
 * 
 * Requirements: 6.6
 */
@Component({
  selector: 'frm-job-status-timeline',
  templateUrl: './job-status-timeline.component.html',
  styleUrls: ['./job-status-timeline.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JobStatusTimelineComponent implements OnInit {
  @Input() jobId!: string;
  @Input() statusHistory: StatusHistoryEntry[] = [];
  
  // Enum reference for template
  JobStatus = JobStatus;

  constructor() {}

  ngOnInit(): void {
    // Sort status history by date (newest first)
    this.sortStatusHistory();
    
    // If no status history provided, create mock data for demonstration
    if (this.statusHistory.length === 0) {
      this.createMockStatusHistory();
    }
  }

  /**
   * Sort status history by date (newest first)
   */
  private sortStatusHistory(): void {
    this.statusHistory = [...this.statusHistory].sort((a, b) => {
      return new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime();
    });
  }

  /**
   * Create mock status history for demonstration
   * In a real implementation, this would be loaded from the backend
   */
  private createMockStatusHistory(): void {
    const now = new Date();
    this.statusHistory = [
      {
        id: '1',
        jobId: this.jobId,
        status: JobStatus.NotStarted,
        changedBy: 'System',
        changedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
      }
    ];
  }

  /**
   * Get status color class
   */
  getStatusColorClass(status: JobStatus): string {
    const colorMap: Record<JobStatus, string> = {
      [JobStatus.NotStarted]: 'status-not-started',
      [JobStatus.EnRoute]: 'status-en-route',
      [JobStatus.OnSite]: 'status-on-site',
      [JobStatus.Completed]: 'status-completed',
      [JobStatus.Issue]: 'status-issue',
      [JobStatus.Cancelled]: 'status-cancelled'
    };
    return colorMap[status] || 'status-default';
  }

  /**
   * Get status icon
   */
  getStatusIcon(status: JobStatus): string {
    const iconMap: Record<JobStatus, string> = {
      [JobStatus.NotStarted]: 'schedule',
      [JobStatus.EnRoute]: 'directions_car',
      [JobStatus.OnSite]: 'location_on',
      [JobStatus.Completed]: 'check_circle',
      [JobStatus.Issue]: 'error',
      [JobStatus.Cancelled]: 'cancel'
    };
    return iconMap[status] || 'help';
  }

  /**
   * Get status display text
   */
  getStatusText(status: JobStatus): string {
    const textMap: Record<JobStatus, string> = {
      [JobStatus.NotStarted]: 'Not Started',
      [JobStatus.EnRoute]: 'En Route',
      [JobStatus.OnSite]: 'On Site',
      [JobStatus.Completed]: 'Completed',
      [JobStatus.Issue]: 'Issue',
      [JobStatus.Cancelled]: 'Cancelled'
    };
    return textMap[status] || status;
  }

  /**
   * Format date and time for display
   */
  formatDateTime(date: Date): string {
    return new Date(date).toLocaleString();
  }

  /**
   * Get relative time (e.g., "2 hours ago")
   */
  getRelativeTime(date: Date): string {
    const now = new Date();
    const entryDate = new Date(date);
    const diffMs = now.getTime() - entryDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return this.formatDateTime(date);
  }

  /**
   * Check if this is the first (most recent) entry
   */
  isFirstEntry(index: number): boolean {
    return index === 0;
  }

  /**
   * Check if this is the last (oldest) entry
   */
  isLastEntry(index: number): boolean {
    return index === this.statusHistory.length - 1;
  }
}
