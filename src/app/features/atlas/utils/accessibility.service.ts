import { Injectable } from '@angular/core';

/**
 * Service for managing accessibility features across ATLAS components
 * Provides utilities for ARIA labels, live regions, and screen reader announcements
 */
@Injectable({
  providedIn: 'root'
})
export class AtlasAccessibilityService {
  private liveRegion: HTMLElement | null = null;

  constructor() {
    this.initializeLiveRegion();
  }

  /**
   * Initialize ARIA live region for screen reader announcements
   */
  private initializeLiveRegion(): void {
    if (typeof document !== 'undefined') {
      this.liveRegion = document.createElement('div');
      this.liveRegion.setAttribute('role', 'status');
      this.liveRegion.setAttribute('aria-live', 'polite');
      this.liveRegion.setAttribute('aria-atomic', 'true');
      this.liveRegion.className = 'sr-only';
      this.liveRegion.style.position = 'absolute';
      this.liveRegion.style.left = '-10000px';
      this.liveRegion.style.width = '1px';
      this.liveRegion.style.height = '1px';
      this.liveRegion.style.overflow = 'hidden';
      document.body.appendChild(this.liveRegion);
    }
  }

  /**
   * Announce a message to screen readers
   * @param message - Message to announce
   * @param priority - 'polite' (default) or 'assertive'
   */
  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    if (this.liveRegion) {
      this.liveRegion.setAttribute('aria-live', priority);
      this.liveRegion.textContent = message;
      
      // Clear after announcement
      setTimeout(() => {
        if (this.liveRegion) {
          this.liveRegion.textContent = '';
        }
      }, 1000);
    }
  }

  /**
   * Generate unique ID for ARIA relationships
   * @param prefix - Prefix for the ID
   */
  generateId(prefix: string): string {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get ARIA label for deployment state
   */
  getDeploymentStateLabel(state: string): string {
    const stateLabels: Record<string, string> = {
      'DRAFT': 'Draft state',
      'SUBMITTED': 'Submitted for review',
      'INTAKE_REVIEW': 'In intake review',
      'PLANNING': 'Planning phase',
      'READY': 'Ready for deployment',
      'IN_PROGRESS': 'Deployment in progress',
      'EXECUTION_COMPLETE': 'Execution completed',
      'QA_REVIEW': 'In quality assurance review',
      'APPROVED_FOR_CLOSEOUT': 'Approved for closeout',
      'CLOSED': 'Closed',
      'ON_HOLD': 'On hold',
      'CANCELLED': 'Cancelled',
      'REWORK_REQUIRED': 'Rework required'
    };
    return stateLabels[state] || state;
  }

  /**
   * Get ARIA label for risk level
   */
  getRiskLevelLabel(level: string): string {
    const riskLabels: Record<string, string> = {
      'VeryLow': 'Very low risk',
      'Low': 'Low risk',
      'Medium': 'Medium risk',
      'High': 'High risk',
      'VeryHigh': 'Very high risk',
      'Critical': 'Critical risk'
    };
    return riskLabels[level] || level;
  }

  /**
   * Get ARIA label for severity
   */
  getSeverityLabel(severity: string): string {
    const severityLabels: Record<string, string> = {
      'Info': 'Informational',
      'Low': 'Low severity',
      'Medium': 'Medium severity',
      'High': 'High severity',
      'Critical': 'Critical severity'
    };
    return severityLabels[severity] || severity;
  }

  /**
   * Get ARIA label for approval status
   */
  getApprovalStatusLabel(status: string): string {
    const statusLabels: Record<string, string> = {
      'PENDING': 'Pending approval',
      'APPROVED': 'Approved',
      'DENIED': 'Denied',
      'EXPIRED': 'Expired'
    };
    return statusLabels[status] || status;
  }

  /**
   * Get ARIA label for agent health status
   */
  getAgentHealthLabel(state: string): string {
    const healthLabels: Record<string, string> = {
      'Healthy': 'Agent is healthy',
      'Degraded': 'Agent performance is degraded',
      'Unhealthy': 'Agent is unhealthy',
      'Unknown': 'Agent health status unknown'
    };
    return healthLabels[state] || state;
  }

  /**
   * Format date for screen readers
   */
  formatDateForScreenReader(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Get ARIA description for loading state
   */
  getLoadingDescription(itemType: string): string {
    return `Loading ${itemType}, please wait`;
  }

  /**
   * Get ARIA description for error state
   */
  getErrorDescription(itemType: string, error?: string): string {
    return error 
      ? `Error loading ${itemType}: ${error}`
      : `Error loading ${itemType}`;
  }

  /**
   * Get ARIA description for empty state
   */
  getEmptyDescription(itemType: string): string {
    return `No ${itemType} available`;
  }
}
