import { Injectable } from '@angular/core';
import { RoundingConfig, RoundingMethod } from '../models/timecard.model';

/**
 * TimecardRoundingService
 * 
 * Handles timecard rounding calculations with configurable rounding methods.
 * Default behavior is to round up to the nearest 15-minute interval.
 */
@Injectable({
  providedIn: 'root'
})
export class TimecardRoundingService {
  private config: RoundingConfig = {
    intervalMinutes: 15,
    roundingMethod: RoundingMethod.RoundUp
  };

  /**
   * Round hours to nearest interval based on configured rounding method
   * 
   * @param hours - The number of hours to round
   * @returns The rounded hours value
   */
  roundHours(hours: number): number {
    const minutes = hours * 60;
    const roundedMinutes = this.roundMinutes(minutes);
    return roundedMinutes / 60;
  }

  /**
   * Round minutes to nearest interval based on configured rounding method
   * 
   * @param minutes - The number of minutes to round
   * @returns The rounded minutes value
   */
  private roundMinutes(minutes: number): number {
    const interval = this.config.intervalMinutes;

    switch (this.config.roundingMethod) {
      case RoundingMethod.RoundUp:
        return Math.ceil(minutes / interval) * interval;

      case RoundingMethod.RoundDown:
        return Math.floor(minutes / interval) * interval;

      case RoundingMethod.RoundNearest:
        return Math.round(minutes / interval) * interval;

      default:
        return Math.ceil(minutes / interval) * interval;
    }
  }

  /**
   * Calculate actual hours from clock in/out times
   * 
   * @param clockIn - The clock in timestamp
   * @param clockOut - The clock out timestamp
   * @returns The actual hours worked
   */
  calculateActualHours(clockIn: Date, clockOut: Date): number {
    const diffMs = clockOut.getTime() - clockIn.getTime();
    return diffMs / (1000 * 60 * 60);
  }

  /**
   * Process timecard entry with rounding
   * 
   * @param clockIn - The clock in timestamp
   * @param clockOut - The clock out timestamp
   * @returns Object containing actual hours, rounded hours, and rounding difference
   */
  processTimecardEntry(clockIn: Date, clockOut: Date): {
    actualHours: number;
    roundedHours: number;
    roundingDifference: number;
  } {
    const actualHours = this.calculateActualHours(clockIn, clockOut);
    const roundedHours = this.roundHours(actualHours);
    const roundingDifference = roundedHours - actualHours;

    return {
      actualHours,
      roundedHours,
      roundingDifference
    };
  }

  /**
   * Update rounding configuration
   * 
   * @param config - Partial rounding configuration to update
   */
  updateConfig(config: Partial<RoundingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current rounding configuration
   * 
   * @returns The current rounding configuration
   */
  getConfig(): RoundingConfig {
    return { ...this.config };
  }
}
