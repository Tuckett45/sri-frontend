/**
 * Location history models for Field Resource Management
 * 
 * Tracks historical location data for crews and technicians
 * for audit purposes and route tracking.
 * 
 * Requirements: 1.6.5 - Location history for audit purposes
 */

import { GeoLocation } from './time-entry.model';

/**
 * Location history entry
 * Records a single location point with timestamp
 */
export interface LocationHistoryEntry {
  id: string;
  entityId: string; // Crew ID or Technician ID
  entityType: 'crew' | 'technician';
  location: GeoLocation;
  timestamp: Date;
  recordedBy?: string; // User ID who recorded (for manual entries)
  isManualEntry: boolean;
  createdAt: Date;
}

/**
 * Location history query filters
 */
export interface LocationHistoryFilters {
  entityId: string;
  entityType: 'crew' | 'technician';
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}
