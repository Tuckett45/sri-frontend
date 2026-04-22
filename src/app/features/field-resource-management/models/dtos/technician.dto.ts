/**
 * Data Transfer Objects for Technician API requests
 */

import { TechnicianRole, Skill, Certification, Availability } from '../technician.model';

export interface CreateTechnicianDto {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: TechnicianRole;
  region: string;
  isAvailable?: boolean;
  skills?: Skill[];
  certifications?: Omit<Certification, 'id' | 'status'>[];
  availability?: Omit<Availability, 'id'>[];
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
  skills?: Skill[];
  certifications?: Omit<Certification, 'id' | 'status'>[];
  availability?: Omit<Availability, 'id'>[];
}
