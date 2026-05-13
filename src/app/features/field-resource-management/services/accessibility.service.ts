import { Injectable } from '@angular/core';
import { LiveAnnouncer } from '@angular/cdk/a11y';

/**
 * Service for managing accessibility features across the application
 */
@Injectable({
  providedIn: 'root'
})
export class AccessibilityService {
  constructor(private liveAnnouncer: LiveAnnouncer) {}

  /**
   * Announce a message to screen readers
   * @param message The message to announce
   * @param politeness The politeness level ('polite' or 'assertive')
   */
  announce(message: string, politeness: 'polite' | 'assertive' = 'polite'): void {
    this.liveAnnouncer.announce(message, politeness);
  }

  /**
   * Clear any pending announcements
   */
  clear(): void {
    this.liveAnnouncer.clear();
  }

  /**
   * Generate a unique ID for ARIA attributes
   * @param prefix Optional prefix for the ID
   */
  generateId(prefix: string = 'aria'): string {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get ARIA label for job status
   */
  getJobStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'NotStarted': 'Not Started',
      'EnRoute': 'En Route to job site',
      'OnSite': 'On Site',
      'Completed': 'Completed',
      'Issue': 'Issue reported',
      'Cancelled': 'Cancelled'
    };
    return labels[status] || status;
  }

  /**
   * Get ARIA label for priority
   */
  getPriorityLabel(priority: string): string {
    const labels: Record<string, string> = {
      'P1': 'Priority 1 - Critical',
      'P2': 'Priority 2 - High',
      'Normal': 'Normal Priority'
    };
    return labels[priority] || priority;
  }

  /**
   * Get ARIA label for action buttons
   */
  getActionLabel(action: string, context?: string): string {
    const labels: Record<string, string> = {
      'edit': `Edit ${context || 'item'}`,
      'delete': `Delete ${context || 'item'}`,
      'view': `View ${context || 'details'}`,
      'assign': `Assign ${context || 'job'}`,
      'clockIn': 'Clock in to job',
      'clockOut': 'Clock out from job',
      'call': `Call ${context || 'customer'}`,
      'email': `Email ${context || 'customer'}`,
      'upload': 'Upload photo',
      'export': `Export ${context || 'data'}`,
      'filter': 'Filter results',
      'search': 'Search',
      'refresh': 'Refresh data'
    };
    return labels[action] || action;
  }

  /**
   * Announce status change to screen readers
   */
  announceStatusChange(jobId: string, oldStatus: string, newStatus: string): void {
    const message = `Job ${jobId} status changed from ${this.getJobStatusLabel(oldStatus)} to ${this.getJobStatusLabel(newStatus)}`;
    this.announce(message, 'polite');
  }

  /**
   * Announce assignment to screen readers
   */
  announceAssignment(jobId: string, technicianName: string): void {
    const message = `Job ${jobId} assigned to ${technicianName}`;
    this.announce(message, 'polite');
  }

  /**
   * Announce notification to screen readers
   */
  announceNotification(message: string): void {
    this.announce(message, 'assertive');
  }

  /**
   * Announce error to screen readers
   */
  announceError(error: string): void {
    this.announce(`Error: ${error}`, 'assertive');
  }

  /**
   * Announce success to screen readers
   */
  announceSuccess(message: string): void {
    this.announce(message, 'polite');
  }
}
