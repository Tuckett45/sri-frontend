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
  credentialType?: string; // Backend discriminator field (e.g. 'Certification')
  attachmentId?: string; // Links to an uploaded document in AttachmentService
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

export enum TechnicianStatus {
  Available = 'Available',
  OnSite = 'OnSite',
  EnRoute = 'EnRoute',
  OffDuty = 'OffDuty'
}

/**
 * Lightweight view of the crew a technician is assigned to (a technician is on at most
 * one crew). Returned on the serialized Technician as the `crew` property by the
 * technician list endpoint; undefined when the technician is not on any crew.
 */
export interface TechnicianCrewInfo {
  crewId: string;
  crewName: string;
  /** The crew's company/client (free-text), from Crew.Company. */
  company?: string;
  /** The crew's current job id, if assigned to a job (resolved via Crew.CurrentJobId or Job.CrewId). */
  currentJobId?: string;
  /** The client of the crew's current job (free-text), from Job.Client, when present. */
  currentJobClient?: string;
  /** The site name of the crew's current job (Job.SiteName), when present. */
  currentJobSiteName?: string;
}

export interface Technician {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  email: string;
  phone: string;
  role: TechnicianRole;
  region: string;
  isAvailable: boolean;
  isActive: boolean;
  currentStatus?: TechnicianStatus;
  statusUpdatedAt?: string;
  userId?: string; // Links to authenticated user account in SRI backend
  willingToTravel?: boolean;
  scissorLiftCertified?: boolean;

  // Personal / logistics (carried over from onboarding candidate)
  vestSize?: string;
  homeAddress?: string;
  homeState?: string;
  workSite?: string;
  startDate?: string;
  experienceLevel?: string;

  // File uploads (carried over from onboarding candidate on promotion)
  resumeUrl?: string;
  headshotUrl?: string;

  // Onboarding tracking fields
  fiberExperience?: FiberExperienceLevel;
  oshaCertified?: boolean;
  oshaCertNumber?: string;
  oshaCertExpiration?: string;
  liftCertifications?: LiftCertificationType[];
  liftCertification?: boolean;
  travelAvailability?: boolean;
  militaryBackground?: boolean;
  shiftAvailability?: ShiftType[];
  backgroundCheckStatus?: ScreeningStatus;
  drugScreenStatus?: ScreeningStatus;
  isVeteran?: boolean;
  militaryBranch?: string;

  // Badges & Access
  attBadge?: boolean;
  comcastBadge?: boolean;
  lumenBadge?: boolean;
  attSupplierTraining?: boolean;
  cienaBasicTraining?: boolean;
  googleRedBadge?: boolean;
  googleLdap?: boolean;
  metaGreenListing?: boolean;
  metaBadge?: boolean;
  workedAtMetaSite?: boolean;   // Has previously worked at a Meta site (shown as a flag next to the name)

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

  // Notes
  onboardingNotes?: string;

  // Referral tracking (carried over from onboarding candidate)
  referredBy?: string;

  // Personal Facebook profile URL (carried over from candidate on promotion; used for META site badging)
  facebookProfileUrl?: string;

  lastKnownLatitude?: number;
  lastKnownLongitude?: number;
  locationUpdatedAt?: Date;
  skills?: Skill[];
  certifications?: Certification[];
  availability?: Availability[];

  // Real-time field status determined by backend on clock-in/out
  fieldStatus?: 'Available' | 'EnRoute' | 'OnSite' | 'ClockedOut';

  // Crew the technician is assigned to (a technician is on at most one crew),
  // populated by the technician list endpoint. Includes the crew's company/client.
  crew?: TechnicianCrewInfo;

  createdAt: Date;
  updatedAt: Date;
}

// --- Onboarding Tracking Types ---

export type FiberExperienceLevel = 'none' | '1-2_years' | '3-5_years' | '5+_years';

export type LiftCertificationType = 'scissor_lift' | 'boom_lift' | 'forklift';

export type ShiftType = 'day' | 'night' | 'swing' | 'weekends';

export type ScreeningStatus = 'not_started' | 'pending' | 'pass' | 'fail';
