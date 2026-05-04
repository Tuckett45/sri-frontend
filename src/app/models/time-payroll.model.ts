/**
 * Time & Payroll model interfaces for Field Resource Management
 */

import { TechnicianRole } from '../features/field-resource-management/models/technician.model';

/** Company-recognized holiday */
export interface Holiday {
  id: string;
  name: string;
  date: Date;
  isRecurring: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Auto-submit configuration per region */
export interface AutoSubmitConfig {
  id: string;
  region: string;
  dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  timeOfDay: string; // HH:mm format
  enabled: boolean;
  maxRetries: number;           // default: 3
  retryIntervalMinutes: number; // default: 5
  updatedBy: string;
  updatedAt: Date;
}

/** Result of an auto-submit operation */
export interface AutoSubmitResult {
  periodId: string;
  technicianId: string;
  success: boolean;
  attempt: number;
  error?: string;
  timestamp: Date;
}

/** User pay rate with effective date */
export interface UserPayRate {
  id: string;
  technicianId: string;
  roleLevel: TechnicianRole;
  standardHourlyRate: number;
  overtimeHourlyRate: number;
  effectiveDate: Date;
  createdBy: string;
  createdAt: Date;
}


/** Default pay rate for a role level */
export interface RoleLevelPayRate {
  roleLevel: TechnicianRole;
  standardHourlyRate: number;
  overtimeHourlyRate: number;
  updatedBy: string;
  updatedAt: Date;
}

/** Pay rate change audit record */
export interface PayRateChange {
  id: string;
  technicianId: string;
  previousStandardRate: number;
  previousOvertimeRate: number;
  newStandardRate: number;
  newOvertimeRate: number;
  effectiveDate: Date;
  changedBy: string;
  changedAt: Date;
}

/** Contract model (extends existing contract support) */
export interface Contract {
  id: string;
  name: string;
  clientName: string;
  startDate: Date;
  endDate: Date;
  status: 'Active' | 'Expired' | 'Pending';
  region?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Billable amount calculation result */
export interface BillableAmount {
  entryId: string;
  jobId: string;
  hours: number;
  rate: number;
  isOvertime: boolean;
  amount: number;
}

/** Job billable summary for a timecard period */
export interface JobBillableSummary {
  jobId: string;
  standardHours: number;
  overtimeHours: number;
  standardAmount: number;
  overtimeAmount: number;
  totalAmount: number;
  rateNotSet: boolean;
}

/** Labor cost summary for a technician */
export interface LaborCostSummary {
  technicianId: string;
  regularHours: number;
  overtimeHours: number;
  regularCost: number;
  overtimeCost: number;
  totalCost: number;
}

/** Category hours summary */
export interface CategoryHoursSummary {
  driveTimeHours: number;
  onSiteHours: number;
  totalHours: number;
}

/** Pay type hours summary */
export interface PayTypeHoursSummary {
  regularHours: number;
  overtimeHours: number;
  holidayHours: number;
  ptoHours: number;
  totalHours: number;
}

/** ATLAS API payload format (flat structure) */
export interface AtlasTimeEntryPayload {
  id?: string;
  jobId: string;
  technicianId: string;
  clockInTime: string;    // ISO 8601
  clockOutTime?: string;  // ISO 8601
  clockInLatitude?: number;
  clockInLongitude?: number;
  clockOutLatitude?: number;
  clockOutLongitude?: number;
  mileage?: number;
  adjustmentReason?: string;
  timeCategory?: string;
  payType?: string;
}

/** ATLAS sync result */
export interface AtlasSyncResult {
  entryId: string;
  success: boolean;
  httpStatus?: number;
  errorDetail?: string;
  payloadHash: string;
  timestamp: Date;
  conflict?: SyncConflict;
}

/** Sync conflict details */
export interface SyncConflict {
  entryId: string;
  mismatchedFields: string[];
  localValues: Record<string, any>;
  remoteValues: Record<string, any>;
}

/** Pending sync entry in the retry queue */
export interface PendingSyncEntry {
  entryId: string;
  payload: AtlasTimeEntryPayload;
  attempt: number;
  maxAttempts: number;
  nextRetryAt: Date;
  lastError?: string;
}

/** Contract validation result */
export interface ContractValidationResult {
  valid: boolean;
  expired: boolean;
  requiresApproval: boolean;
  message?: string;
}

/** Timecard notification badge counts */
export interface TimecardBadgeCounts {
  draft: number;
  rejected: number;
  approachingDeadline: number;
  total: number;
}