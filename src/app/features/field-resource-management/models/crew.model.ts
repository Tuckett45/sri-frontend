/**
 * Crew-related models and enums for Field Resource Management
 */

import { GeoLocation } from './time-entry.model';

export enum CrewStatus {
  Available = 'AVAILABLE',
  OnJob = 'ON_JOB',
  Unavailable = 'UNAVAILABLE'
}

export interface Crew {
  id: string;
  name: string;
  leadTechnicianId: string;
  memberIds: string[];
  market: string;
  company: string;
  status: CrewStatus;
  currentLocation?: GeoLocation;
  activeJobId?: string;
  createdAt: Date;
  updatedAt: Date;
}
