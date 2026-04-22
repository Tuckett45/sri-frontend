/**
 * Data Transfer Objects for Crew API requests
 */

import { CrewStatus } from '../crew.model';
import { GeoLocation } from '../time-entry.model';

export interface CreateCrewDto {
  name: string;
  leadTechnicianId: string;
  memberIds: string[];
  market: string;
  company: string;
  status?: CrewStatus;
}

export interface UpdateCrewDto {
  name?: string;
  leadTechnicianId?: string;
  memberIds?: string[];
  market?: string;
  company?: string;
  status?: CrewStatus;
  currentLocation?: GeoLocation;
  activeJobId?: string;
}
