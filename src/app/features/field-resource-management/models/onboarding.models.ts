// --- Type Aliases ---

export type OfferStatus = 'needs_review' | 'vetted_available' | 'offer_extended' | 'offer_accepted_onboarding';

export type VestSize = 'XS' | 'S' | 'M' | 'L' | 'XL' | '2XL' | '3XL';

// --- Candidate ---

export interface Candidate {
  candidateId: string;
  techName: string;
  middleName?: string;
  techEmail: string;
  techPhone: string;
  vestSize: VestSize;
  drugTestComplete: boolean;
  oshaCertified: boolean;
  scissorLiftCertified: boolean;
  biisciCertified?: boolean;
  workSite: string;
  homeAddress?: string;
  homeState?: string;
  startDate: string;          // ISO date
  offerStatus: OfferStatus;
  resumeUrl?: string;
  headshotUrl?: string;
  referredBy?: string;
  notes?: string;

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
  startDate: string;
  offerStatus: OfferStatus;
  referredBy?: string;
  drugTestComplete?: boolean;
  oshaCertified?: boolean;
  scissorLiftCertified?: boolean;

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
  drugTestComplete?: boolean;
  oshaCertified?: boolean;
  scissorLiftCertified?: boolean;
  workSite?: string;
  homeAddress?: string;
  startDate?: string;
  offerStatus?: OfferStatus;
  referredBy?: string;

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
  search?: string;
  incompleteCerts?: boolean;
}

// --- Service Error ---

export interface OnboardingServiceError {
  statusCode: number;
  message: string;
  operation: string;
}
