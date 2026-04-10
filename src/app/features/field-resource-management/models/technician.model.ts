/**
 * Technician-related models and enums for Field Resource Management
 */

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
  technicianId?: string;
  name: string;
  category: string;
  level: SkillLevel;
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
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: TechnicianRole;
  region: string;
  isAvailable: boolean;
  isActive: boolean;
  lastKnownLatitude?: number;
  lastKnownLongitude?: number;
  locationUpdatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
