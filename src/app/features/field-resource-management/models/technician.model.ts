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
  date?: Date;
  startDate?: Date;
  endDate?: Date;
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
  willingToTravel?: boolean;
  scissorLiftCertified?: boolean;

  // Onboarding tracking fields
  fiberExperience?: FiberExperienceLevel;
  oshaCertified?: boolean;
  oshaCertNumber?: string;
  oshaCertExpiration?: string;
  liftCertifications?: LiftCertificationType[];
  shiftAvailability?: ShiftType[];
  backgroundCheckStatus?: ScreeningStatus;
  drugScreenStatus?: ScreeningStatus;
  isVeteran?: boolean;
  militaryBranch?: string;

  // Badges & Access
  attBadge?: boolean;
  comcastBadge?: boolean;
  attSupplierTraining?: boolean;
  cienaBasicTraining?: boolean;
  googleRedBadge?: boolean;
  googleLdap?: boolean;
  metaGreenListing?: boolean;

  // Training & Certs
  obsTraining?: boolean;
  osha10?: boolean;
  osha30?: boolean;
  techHandTools?: boolean;
  biisciCertified?: boolean;

  // Equipment Kits
  ciKitAssigned?: boolean;
  fiberKitAssigned?: boolean;
  labelingKitAssigned?: boolean;
  powerKitAssigned?: boolean;
  testingEqptAssigned?: boolean;

  // Notes
  onboardingNotes?: string;

  lastKnownLatitude?: number;
  lastKnownLongitude?: number;
  locationUpdatedAt?: Date;
  skills?: Skill[];
  certifications?: Certification[];
  availability?: Availability[];

  // Real-time field status determined by backend on clock-in/out
  fieldStatus?: 'Available' | 'EnRoute' | 'OnSite' | 'ClockedOut';

  createdAt: Date;
  updatedAt: Date;
}

// --- Onboarding Tracking Types ---

export type FiberExperienceLevel = 'none' | '1-2_years' | '3-5_years' | '5+_years';

export type LiftCertificationType = 'scissor_lift' | 'boom_lift' | 'forklift';

export type ShiftType = 'day' | 'night' | 'swing' | 'weekends';

export type ScreeningStatus = 'not_started' | 'pending' | 'pass' | 'fail';
