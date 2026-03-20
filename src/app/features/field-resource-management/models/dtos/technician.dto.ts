/**
 * Data Transfer Objects for Technician API requests
 */

import { TechnicianRole, EmploymentType, Skill, Certification, Availability } from '../technician.model';
import { GeoLocation } from '../time-entry.model';

export interface CreateTechnicianDto {
  technicianId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: TechnicianRole;
  employmentType: EmploymentType;
  homeBase: string;
  region: string;
  skills?: Skill[];
  certifications?: Certification[];
  availability?: Availability[];
  hourlyCostRate?: number;
  canTravel?: boolean;
}

export interface UpdateTechnicianDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  role?: TechnicianRole;
  employmentType?: EmploymentType;
  homeBase?: string;
  region?: string;
  skills?: Skill[];
  certifications?: Certification[];
  availability?: Availability[];
  hourlyCostRate?: number;
  isActive?: boolean;
  canTravel?: boolean;
  currentLocation?: GeoLocation;
}
