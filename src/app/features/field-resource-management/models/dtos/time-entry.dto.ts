/**
 * Data Transfer Objects for Time Entry API requests
 */

import { GeoLocation } from '../time-entry.model';

export interface ClockInDto {
  jobId: string;
  technicianId: string;
  clockInTime: Date;
  clockInLocation?: GeoLocation;
}

export interface ClockOutDto {
  timeEntryId: string;
  clockOutTime: Date;
  clockOutLocation?: GeoLocation;
  mileage?: number;
}

export interface UpdateTimeEntryDto {
  clockInTime?: Date;
  clockOutTime?: Date;
  clockInLocation?: GeoLocation;
  clockOutLocation?: GeoLocation;
  mileage?: number;
  adjustmentReason?: string;
  isManuallyAdjusted?: boolean;
  adjustedBy?: string;
}
