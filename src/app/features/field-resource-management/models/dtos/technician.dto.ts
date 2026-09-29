/**
 * Data Transfer Objects for Technician API requests
 */

import {
  TechnicianRole,
  Skill,
  Certification,
  Availability,
  FiberExperienceLevel,
  LiftCertificationType,
  ShiftType,
  ScreeningStatus
} from '../technician.model';

/**
 * Onboarding "carry-over" fields shared by create/update technician payloads.
 *
 * These mirror the data captured on the Onboarding Candidate form so the same
 * information can be entered/edited directly on a Technician and persists after
 * a candidate is promoted to a technician.
 */
export interface TechnicianOnboardingFields {
  // Personal / logistics (carried over from candidate)
  vestSize?: string;
  homeAddress?: string;
  homeState?: string;
  workSite?: string;
  startDate?: string; // ISO date
  referredBy?: string;
  facebookProfileUrl?: string;
  onboardingNotes?: string;

  // Core Qualifications
  fiberExperience?: FiberExperienceLevel | boolean;
  oshaCertified?: boolean;
  oshaCertNumber?: string;
  oshaCertExpiration?: string;
  liftCertifications?: LiftCertificationType[];
  liftCertification?: boolean;
  travelAvailability?: boolean;
  shiftAvailability?: ShiftType[] | boolean;
  militaryBackground?: boolean;
  isVeteran?: boolean;
  militaryBranch?: string;
  backgroundCheckStatus?: ScreeningStatus;
  drugScreenStatus?: ScreeningStatus;

  // Badges & Access
  attBadge?: boolean;
  comcastBadge?: boolean;
  lumenBadge?: boolean;
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
  amaMetaTraining?: boolean;
  iesNeoTraining?: boolean;

  // Equipment Kits
  ciKitAssigned?: boolean;
  fiberKitAssigned?: boolean;
  labelingKitAssigned?: boolean;
  powerKitAssigned?: boolean;
  testingEqptAssigned?: boolean;
}

export interface CreateTechnicianDto extends TechnicianOnboardingFields {
  firstName: string;
  lastName: string;
  middleName?: string;
  email: string;
  phone: string;
  role: TechnicianRole;
  region: string;
  isAvailable?: boolean;
  userId?: string;
  scissorLiftCertified?: boolean;
  willingToTravel?: boolean;
  skills?: Skill[];
  certifications?: Omit<Certification, 'id' | 'status'>[];
  availability?: Omit<Availability, 'id'>[];
}

export interface UpdateTechnicianDto extends TechnicianOnboardingFields {
  firstName?: string;
  lastName?: string;
  middleName?: string;
  email?: string;
  phone?: string;
  role?: TechnicianRole;
  region?: string;
  isAvailable?: boolean;
  isActive?: boolean;
  willingToTravel?: boolean;
  scissorLiftCertified?: boolean;
  lastKnownLatitude?: number;
  lastKnownLongitude?: number;
  skills?: Skill[];
  certifications?: Omit<Certification, 'id' | 'status'>[];
  availability?: Omit<Availability, 'id'>[];
}
