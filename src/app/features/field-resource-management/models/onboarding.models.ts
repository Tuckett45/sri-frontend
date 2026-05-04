// --- Type Aliases ---

export type OfferStatus = 'pre_offer' | 'offer' | 'offer_acceptance';

export type VestSize = 'XS' | 'S' | 'M' | 'L' | 'XL' | '2XL' | '3XL';

// --- Candidate ---

export interface Candidate {
  candidateId: string;
  techName: string;
  techEmail: string;
  techPhone: string;
  vestSize: VestSize;
  drugTestComplete: boolean;
  oshaCertified: boolean;
  scissorLiftCertified: boolean;
  biisciCertified: boolean;
  workSite: string;
  startDate: string;          // ISO date
  offerStatus: OfferStatus;
  createdBy: string;
  createdAt: string;          // ISO datetime
  updatedBy: string;
  updatedAt: string;          // ISO datetime
}

// --- Payloads ---

export interface CreateCandidatePayload {
  techName: string;
  techEmail: string;
  techPhone: string;
  vestSize: VestSize;
  workSite: string;
  startDate: string;
  offerStatus: OfferStatus;
}

export interface UpdateCandidatePayload {
  techName?: string;
  techEmail?: string;
  techPhone?: string;
  vestSize?: VestSize;
  drugTestComplete?: boolean;
  oshaCertified?: boolean;
  scissorLiftCertified?: boolean;
  biisciCertified?: boolean;
  workSite?: string;
  startDate?: string;
  offerStatus?: OfferStatus;
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
