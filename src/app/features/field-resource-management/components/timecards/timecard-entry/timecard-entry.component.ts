import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { TimecardEntry, TimecardStatus } from '../../../models/timecard.model';

/**
 * TimecardEntryComponent
 * 
 * Displays a timecard entry with actual hours alongside rounded hours.
 * Shows rounding difference with explanation and highlights rounded time
 * used for budget calculations.
 * 
 * Requirements: 3.1-3.7
 */
@Component({
  selector: 'app-timecard-entry',
  templateUrl: './timecard-entry.component.html',
  styleUrls: ['./timecard-entry.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TimecardEntryComponent {
  @Input() entry!: TimecardEntry;
  @Input() showDetails = true;

  readonly TimecardStatus = TimecardStatus;

  /**
   * Get actual hours from entry or calculate from clock times
   */
  get actualHours(): number {
    if (this.entry.actualHours !== undefined) {
      return this.entry.actualHours;
    }
    return this.calculateHours(this.entry.clockIn, this.entry.clockOut);
  }

  /**
   * Get rounded hours from entry or calculate
   */
  get roundedHours(): number {
    if (this.entry.roundedHours !== undefined) {
      return this.entry.roundedHours;
    }
    return this.roundToNearest15Minutes(this.actualHours);
  }

  /**
   * Get rounding difference from entry or calculate
   */
  get roundingDifference(): number {
    if (this.entry.roundingDifference !== undefined) {
      return this.entry.roundingDifference;
    }
    return this.roundedHours - this.actualHours;
  }

  /**
   * Check if rounding was applied (difference > 0)
   */
  get hasRounding(): boolean {
    return Math.abs(this.roundingDifference) > 0.001;
  }

  /**
   * Get rounding difference in minutes for display
   */
  get roundingDifferenceMinutes(): number {
    return Math.round(this.roundingDifference * 60);
  }

  /**
   * Get status color class
   */
  getStatusClass(status: TimecardStatus): string {
    switch (status) {
      case TimecardStatus.Approved:
        return 'status-approved';
      case TimecardStatus.Submitted:
        return 'status-submitted';
      case TimecardStatus.Rejected:
        return 'status-rejected';
      case TimecardStatus.Draft:
      default:
        return 'status-draft';
    }
  }

  /**
   * Get status label
   */
  getStatusLabel(status: TimecardStatus): string {
    switch (status) {
      case TimecardStatus.Approved:
        return 'Approved';
      case TimecardStatus.Submitted:
        return 'Submitted';
      case TimecardStatus.Rejected:
        return 'Rejected';
      case TimecardStatus.Draft:
      default:
        return 'Draft';
    }
  }

  /**
   * Format time for display
   */
  formatTime(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  /**
   * Format date for display
   */
  formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  /**
   * Calculate hours between two dates
   */
  private calculateHours(start: Date | string, end: Date | string): number {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate.getTime() - startDate.getTime();
    return diffMs / (1000 * 60 * 60);
  }

  /**
   * Round hours to nearest 15 minutes (rounds up per requirements)
   */
  private roundToNearest15Minutes(hours: number): number {
    const minutes = hours * 60;
    const roundedMinutes = Math.ceil(minutes / 15) * 15;
    return roundedMinutes / 60;
  }
}
