// --- Type Aliases ---

export type OfferStatus = 'needs_review' | 'vetted_available' | 'offer_extended' | 'offer_accepted_onboarding' | 'hired_assigned' | 'onboarded' | 'do_not_hire' | 'turned_down_hold';

export type VestSize = 'XS' | 'S' | 'M' | 'L' | 'XL' | '2XL' | '3XL';

export type ExperienceLevel = 'management' | 'no_experience_green' | 'level_1_green' | 'level_2' | 'level_3' | 'level_4' | 'it_testing';

// --- Candidate ---

export interface Candidate {
  candidateId: string;
  techName: string;
  middleName?: string;
  techEmail: string;
  techPhone: string;
  vestSize: VestSize;
  backgroundCheckComplete: boolean;
  drugTestComplete: boolean;
  oshaCertified: boolean;
  scissorLiftCertified: boolean;
  biisciCertified?: boolean;
  workSite: string;
  homeAddress?: string;
  homeState?: string;
  startDate: string;          // ISO date
  offerStatus: OfferStatus;
  experienceLevel?: ExperienceLevel;
  resumeUrl?: string;
  headshotUrl?: string;
  referredBy?: string;
  notes?: string;

  // Core Qualifications
  fiberExperience?: boolean;
  liftCertification?: boolean;
  travelAvailability?: boolean;
  shiftAvailability?: boolean;
  militaryBackground?: boolean;

  // Badges & Access
  attBadge?: boolean;
  lumenBadge?: boolean;
  attSupplierTraining?: boolean;
  cienaBasicTraining?: boolean;
  googleRedBadge?: boolean;
  googleLdap?: boolean;
  metaGreenListing?: boolean;

  // Training & Certs
  obsTraining?: boolean;
  techHandTools?: boolean;
  osha10?: boolean;
  osha30?: boolean;

  // Equipment Kits
  ciKitAssigned?: boolean;
  fiberKitAssigned?: boolean;
  labelingKitAssigned?: boolean;
  powerKitAssigned?: boolean;
  testingEqptAssigned?: boolean;

  // Promotion tracking
  promotedToTechnicianId?: string | null;
  promotedAt?: string | null;

  createdBy: string;
  createdAt: string;          // ISO datetime
  updatedBy: string;
  updatedAt: string;          // ISO datetime
}

// --- Payloads ---

export interface CreateCandidatePayload {
  techName: string;
  middleName: string;
  techEmail: string;
  techPhone: string;
  vestSize: VestSize;
  workSite?: string;
  homeAddress: string;
  homeState?: string;
  startDate: string;
  offerStatus: OfferStatus;
  experienceLevel?: ExperienceLevel;
  referredBy?: string;
  backgroundCheckComplete?: boolean;
  drugTestComplete?: boolean;
  oshaCertified?: boolean;
  scissorLiftCertified?: boolean;
  biisciCertified?: boolean;

  // Core Qualifications
  fiberExperience?: boolean;
  liftCertification?: boolean;
  travelAvailability?: boolean;
  shiftAvailability?: boolean;
  militaryBackground?: boolean;

  // Badges & Access
  attBadge?: boolean;
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

  // Equipment Kits
  ciKitAssigned?: boolean;
  fiberKitAssigned?: boolean;
  labelingKitAssigned?: boolean;
  powerKitAssigned?: boolean;
  testingEqptAssigned?: boolean;
}

export interface UpdateCandidatePayload {
  techName?: string;
  middleName?: string;
  techEmail?: string;
  techPhone?: string;
  vestSize?: VestSize;
  backgroundCheckComplete?: boolean;
  drugTestComplete?: boolean;
  oshaCertified?: boolean;
  scissorLiftCertified?: boolean;
  biisciCertified?: boolean;
  workSite?: string;
  homeAddress?: string;
  homeState?: string;
  startDate?: string;
  offerStatus?: OfferStatus;
  experienceLevel?: ExperienceLevel | null;
  referredBy?: string;
  notes?: string;

  // Core Qualifications
  fiberExperience?: boolean;
  liftCertification?: boolean;
  travelAvailability?: boolean;
  shiftAvailability?: boolean;
  militaryBackground?: boolean;

  // Badges & Access
  attBadge?: boolean;
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

  // Equipment Kits
  ciKitAssigned?: boolean;
  fiberKitAssigned?: boolean;
  labelingKitAssigned?: boolean;
  powerKitAssigned?: boolean;
  testingEqptAssigned?: boolean;
}

// --- Filters ---

export interface CandidateFilters {
  offerStatus?: OfferStatus;
  experienceLevel?: ExperienceLevel;
  search?: string;
  incompleteCerts?: boolean;
}

// --- Service Error ---

export interface OnboardingServiceError {
  statusCode: number;
  message: string;
  operation: string;
}
