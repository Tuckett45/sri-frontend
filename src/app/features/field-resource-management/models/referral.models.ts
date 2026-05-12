/**
 * Referral Tracker Models
 *
 * Models for tracking technician referrals during the onboarding pipeline.
 * Supports manual entry and bulk import from spreadsheets (Excel/CSV).
 */

export type ReferralStatus = 'new' | 'contacted' | 'onboarded' | 'declined';

export interface Referral {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  cityState: string;
  willingToTravel: boolean | null;  // null = unknown/not answered
  referredFrom: string;             // Name of the person who referred them
  onboarded: boolean;
  status: ReferralStatus;
  notes?: string;
  createdBy: string;
  createdAt: string;                // ISO datetime
  updatedBy: string;
  updatedAt: string;                // ISO datetime
}

export interface CreateReferralPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  cityState?: string;
  willingToTravel?: boolean | null;
  referredFrom: string;
  notes?: string;
}

export interface UpdateReferralPayload {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  cityState?: string;
  willingToTravel?: boolean | null;
  referredFrom?: string;
  onboarded?: boolean;
  status?: ReferralStatus;
  notes?: string;
}

/**
 * Represents a single row parsed from a referral import spreadsheet.
 * Maps to the standard SRI Referral Tracker template columns.
 */
export interface ReferralImportRow {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  cityState: string;
  willingToTravel: string;    // Raw value: "Yes", "No", "?", or empty
  referredFrom: string;
  onboarded: string;          // Raw value: "Yes", "No", or empty
}

/**
 * Result of parsing and validating an import file
 */
export interface ReferralImportResult {
  validRows: CreateReferralPayload[];
  invalidRows: { rowIndex: number; row: ReferralImportRow; errors: string[] }[];
  totalRows: number;
}

export interface ReferralFilters {
  search?: string;
  status?: ReferralStatus;
  onboarded?: boolean;
  willingToTravel?: boolean;
}
