/**
 * Timecard Models (Enhanced)
 * 
 * Enhanced timecard models with rounding support
 */

/**
 * Timecard status enum
 */
export enum TimecardStatus {
  Draft = 'draft',
  Submitted = 'submitted',
  Approved = 'approved',
  Rejected = 'rejected'
}

/**
 * Rounding method enum
 */
export enum RoundingMethod {
  RoundUp = 'round-up',     // Always round up (default)
  RoundDown = 'round-down',
  RoundNearest = 'round-nearest'
}

/**
 * Enhanced timecard entry with rounding
 */
export interface TimecardEntry {
  id: string;
  technicianId: string;
  jobId: string;
  clockIn: Date;
  clockOut: Date;
  actualHours: number;      // Exact hours worked
  roundedHours: number;     // Rounded to nearest 15 minutes
  roundingDifference: number; // roundedHours - actualHours
  status: TimecardStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Rounding configuration
 */
export interface RoundingConfig {
  intervalMinutes: number;  // Default: 15
  roundingMethod: RoundingMethod;
}
