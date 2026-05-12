import { CredentialType } from '../models/credential-types.model';

/**
 * Field type for credential form fields.
 */
export type CredentialFieldType = 'text' | 'date' | 'select';

/**
 * Configuration for a single field within a credential type.
 */
export interface CredentialFieldConfig {
  name: string;
  label: string;
  type: CredentialFieldType;
  required: boolean;
  validators: string[];
  options?: string[];
}

/**
 * Configuration for a credential type, defining its label and form fields.
 */
export interface CredentialTypeConfig {
  type: CredentialType;
  label: string;
  fields: CredentialFieldConfig[];
}

/**
 * Registry of all credential type configurations.
 * Each entry defines the fields to render and their validation rules for a credential type.
 * Administrators can extend this registry to add new credential types without code changes.
 */
export const CREDENTIAL_TYPE_REGISTRY: CredentialTypeConfig[] = [
  {
    type: 'Drivers_License',
    label: 'Drivers License',
    fields: [
      { name: 'licenseNumber', label: 'License Number', type: 'text', required: true, validators: ['required'] },
      { name: 'issuingState', label: 'Issuing State', type: 'text', required: true, validators: ['required'] },
      { name: 'issueDate', label: 'Issue Date', type: 'date', required: true, validators: ['required'] },
      { name: 'expirationDate', label: 'Expiration Date', type: 'date', required: true, validators: ['required'] }
    ]
  },
  {
    type: 'Drug_Screen',
    label: 'Drug Screen',
    fields: [
      { name: 'testDate', label: 'Test Date', type: 'date', required: true, validators: ['required'] },
      { name: 'result', label: 'Result', type: 'select', required: true, validators: ['required'], options: ['pass', 'fail'] },
      { name: 'testingFacility', label: 'Testing Facility', type: 'text', required: true, validators: ['required'] }
    ]
  },
  {
    type: 'OSHA_Training_Cert',
    label: 'OSHA Training Cert',
    fields: [
      { name: 'certificationNumber', label: 'Certification Number', type: 'text', required: true, validators: ['required'] },
      { name: 'issueDate', label: 'Issue Date', type: 'date', required: true, validators: ['required'] },
      { name: 'expirationDate', label: 'Expiration Date', type: 'date', required: true, validators: ['required'] },
      { name: 'trainingProvider', label: 'Training Provider', type: 'text', required: true, validators: ['required'] }
    ]
  },
  {
    type: 'Offer_Letter',
    label: 'Offer Letter',
    fields: [
      { name: 'offerDate', label: 'Offer Date', type: 'date', required: true, validators: ['required'] },
      { name: 'acceptedDate', label: 'Accepted Date', type: 'date', required: false, validators: [] },
      { name: 'offerStatus', label: 'Offer Status', type: 'select', required: true, validators: ['required'], options: ['pending', 'accepted', 'declined'] }
    ]
  },
  {
    type: 'Background_Check',
    label: 'Background Check',
    fields: [
      { name: 'submissionDate', label: 'Submission Date', type: 'date', required: true, validators: ['required'] },
      { name: 'completionDate', label: 'Completion Date', type: 'date', required: false, validators: [] },
      { name: 'result', label: 'Result', type: 'select', required: true, validators: ['required'], options: ['pass', 'fail', 'pending'] },
      { name: 'provider', label: 'Provider', type: 'text', required: true, validators: ['required'] }
    ]
  },
  {
    type: 'SSN_Last_Four',
    label: 'SSN Last Four',
    fields: [
      { name: 'lastFourDigits', label: 'Last Four Digits', type: 'text', required: true, validators: ['required', 'ssnLastFour'] }
    ]
  }
];

/**
 * Retrieves the credential type configuration for a given credential type.
 *
 * @param type - The credential type to look up
 * @returns The configuration for the specified credential type
 * @throws Error if the credential type is not found in the registry
 */
export function getCredentialTypeConfig(type: CredentialType): CredentialTypeConfig {
  const config = CREDENTIAL_TYPE_REGISTRY.find(entry => entry.type === type);
  if (!config) {
    throw new Error(`Credential type "${type}" not found in registry.`);
  }
  return config;
}
