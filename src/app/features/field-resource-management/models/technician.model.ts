/**
 * Technician-related models and enums for Field Resource Management
 */

import { GeoLocation } from './time-entry.model';

export enum TechnicianRole {
  Installer = 'Installer',
  Lead = 'Lead',
  Level1 = 'Level1',
  Level2 = 'Level2',
  Level3 = 'Level3',
  Level4 = 'Level4'
}

export enum EmploymentType {
  W2 = 'W2',
  Contractor1099 = '1099'
}

export enum CertificationStatus {
  Active = 'Active',
  ExpiringSoon = 'ExpiringSoon',
  Expired = 'Expired'
}

export enum SkillLevel {
  Beginner = 'BEGINNER',
  Intermediate = 'INTERMEDIATE',
  Advanced = 'ADVANCED',
  Expert = 'EXPERT'
}

export interface Skill {
  id: string;
  name: string;
  category: string;
  level: SkillLevel;
  verifiedDate?: Date;
}

export interface Certification {
  id: string;
  name: string;
  issueDate: Date;
  expirationDate: Date;
  status: CertificationStatus;
}

export interface Availability {
  id: string;
  technicianId: string;
  date: Date;
  isAvailable: boolean;
  reason?: string; // PTO, Sick, Training
}

export interface Technician {
  id: string;
  technicianId: string; // Business ID
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: TechnicianRole;
  employmentType: EmploymentType;
  homeBase: string;
  region: string;
  skills: Skill[];
  certifications: Certification[];
  availability: Availability[];
  hourlyCostRate?: number; // Admin only
  isActive: boolean;
  currentLocation?: GeoLocation;
  createdAt: Date;
  updatedAt: Date;
}
