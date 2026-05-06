import { CertificationStatus } from './technician.model';

/**
 * Typed credential models using a discriminated union on `credentialType`.
 * Each credential type has type-specific fields beyond the shared base.
 */

export type CredentialType =
  | 'Drivers_License'
  | 'Drug_Screen'
  | 'OSHA_Training_Cert'
  | 'Offer_Letter'
  | 'Background_Check'
  | 'SSN_Last_Four';

export interface BaseCredential {
  id: string;
  technicianId: string;
  credentialType: CredentialType;
  name: string;
  status: CertificationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DriversLicenseCredential extends BaseCredential {
  credentialType: 'Drivers_License';
  licenseNumber: string;
  issuingState: string;
  issueDate: string;
  expirationDate: string;
}

export interface DrugScreenCredential extends BaseCredential {
  credentialType: 'Drug_Screen';
  testDate: string;
  result: 'pass' | 'fail';
  testingFacility: string;
}

export interface OSHATrainingCertCredential extends BaseCredential {
  credentialType: 'OSHA_Training_Cert';
  certificationNumber: string;
  issueDate: string;
  expirationDate: string;
  trainingProvider: string;
}

export interface OfferLetterCredential extends BaseCredential {
  credentialType: 'Offer_Letter';
  offerDate: string;
  acceptedDate?: string;
  offerStatus: 'pending' | 'accepted' | 'declined';
}

export interface BackgroundCheckCredential extends BaseCredential {
  credentialType: 'Background_Check';
  submissionDate: string;
  completionDate?: string;
  result: 'pass' | 'fail' | 'pending';
  provider: string;
}

export interface SSNLastFourCredential extends BaseCredential {
  credentialType: 'SSN_Last_Four';
  lastFourDigits: string;
}

export type TypedCredential =
  | DriversLicenseCredential
  | DrugScreenCredential
  | OSHATrainingCertCredential
  | OfferLetterCredential
  | BackgroundCheckCredential
  | SSNLastFourCredential;
