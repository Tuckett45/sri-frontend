/**
 * Data Transfer Objects for Technician API requests
 */

import { TechnicianRole } from '../technician.model';

export interface CreateTechnicianDto {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: TechnicianRole;
  region: string;
  isAvailable?: boolean;
}

export interface UpdateTechnicianDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  role?: TechnicianRole;
  region?: string;
  isAvailable?: boolean;
  isActive?: boolean;
  lastKnownLatitude?: number;
  lastKnownLongitude?: number;
}
