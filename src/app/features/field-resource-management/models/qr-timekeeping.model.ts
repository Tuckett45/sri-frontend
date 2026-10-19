/**
 * QR Timekeeping data models for Field Resource Management.
 *
 * These interfaces define the frontend contract for the QR Code Timekeeping System,
 * mapping to the Atlas API backend entities for QR scanning, station management,
 * attendance reporting, and Celerity reconciliation.
 */

import { TimeEntry } from './time-entry.model';

/**
 * Time categories supported by the QR scan system.
 * Extended from the base TimeCategory enum to include
 * QR-specific categories that require admin approval.
 */
export type QrTimeCategory =
  | 'Regular'
  | 'PTO'
  | 'Training'
  | 'Recharge'
  | 'Excused_Absence';

/**
 * QR Code Station — maps to backend QrCodeStation entity
 */
export interface QrCodeStation {
  id: string;
  stationIdentifier: string;  // "{siteId-short}:{sequenceNumber}"
  jobSiteId: string;
  locationDescription: string;
  sequenceNumber: number;
  isActive: boolean;
  activityStatus: 'Active' | 'Low_Activity' | 'Inactive_Flagged';
  createdAt: Date;
  updatedAt: Date;
  deactivatedAt?: Date;
}

/**
 * Scan Event — audit record of every scan attempt
 */
export interface ScanEvent {
  id: string;
  technicianId: string;
  stationId?: string;
  scannedValue: string;
  scanTimestamp: Date;
  latitude?: number;
  longitude?: number;
  gpsAccuracy?: number;
  scanType: 'ClockIn' | 'ClockOut' | 'Rejected';
  isSuccessful: boolean;
  rejectionReason?: string;
  resultingTimeEntryId?: string;
  createdAt: Date;
}

/**
 * QR Scan Request — sent to POST /v1/qr-scan
 */
export interface QrScanRequest {
  stationIdentifier: string;
  technicianId: string;
  scanTimestamp: string;  // ISO 8601
  latitude?: number;
  longitude?: number;
  gpsAccuracy?: number;
  timeCategory?: QrTimeCategory;  // Required for clock-in
}

/**
 * QR Scan Result — response from POST /v1/qr-scan
 */
export interface ScanResult {
  success: boolean;
  scanType: 'ClockIn' | 'ClockOut';
  timeEntry?: TimeEntry;
  errorCode?: string;
  errorMessage?: string;
  proximityWarning: boolean;
}

/**
 * Station Registration Request — sent to POST /v1/qr-stations
 */
export interface RegisterStationRequest {
  jobSiteId: string;
  locationDescription: string;
}

/**
 * Station Map Data — response from GET /v1/qr-stations/site-map/{jobId}
 */
export interface StationMapData {
  jobId: string;
  jobName: string;
  stations: StationMapEntry[];
}

/**
 * Station Map Entry — individual station within a site map response
 */
export interface StationMapEntry {
  stationId: string;
  stationIdentifier: string;
  locationDescription: string;
  isActive: boolean;
  activityStatus: 'Active' | 'Low_Activity' | 'Inactive_Flagged';
  totalScansInPeriod: number;
  lastScanTimestamp?: Date;
  uniqueTechniciansCount: number;
}

/**
 * Attendance Record — response from GET /v1/attendance
 */
export interface AttendanceRecord {
  technicianId: string;
  technicianName: string;
  date: Date;
  checkInTime?: Date;
  checkOutTime?: Date;
  status: 'Present' | 'Absent' | 'Incomplete' | 'Still Active';
  totalHours: number;
  timeCategoryBreakdown: Record<string, number>;  // e.g., {"Regular": 6.5, "Training": 1.5}
  payTypeBreakdown: Record<string, number>;
  siteLocation?: string;
  entryCount: number;
}

/**
 * Attendance Summary — response from GET /v1/attendance/summary
 */
export interface AttendanceSummary {
  date: Date;
  totalTechnicians: number;
  presentCount: number;
  absentCount: number;
  incompleteCount: number;
  stillActiveCount: number;
}

/**
 * Reconciliation Report — response from GET /v1/reconciliation/{reportId}
 */
export interface ReconciliationReport {
  id: string;
  startDate: Date;
  endDate: Date;
  generatedBy: string;
  generatedAt: Date;
  totalRecordsCompared: number;
  matchCount: number;
  discrepancyCount: number;
  discrepancyPercentage: number;
  status: 'Generated' | 'InReview' | 'Completed';
  discrepancies: ReconciliationDiscrepancy[];
}

/**
 * Reconciliation Discrepancy — individual mismatch record
 */
export interface ReconciliationDiscrepancy {
  id: string;
  reportId: string;
  technicianId: string;
  technicianName?: string;
  workDate: Date;
  atlasHours: number;
  atlasTimeCategory: string;
  celerityHours: number;
  celerityPayType: string;
  hoursVariance: number;
  discrepancyType: 'Hours' | 'Category' | 'Both';
  status: 'Pending' | 'Resolved' | 'Escalated';
  resolutionNote?: string;
  resolvedBy?: string;
  resolvedAt?: Date;
  escalatedTo?: string;
  escalatedAt?: Date;
}

/**
 * Reconciliation Summary — response from GET /v1/reconciliation/summary/{reportId}
 */
export interface ReconciliationSummary {
  reportId: string;
  totalRecords: number;
  matchCount: number;
  discrepancyCount: number;
  discrepancyPercentage: number;
  resolvedCount: number;
  pendingCount: number;
  escalatedCount: number;
  totalHoursVariance: number;
}

/**
 * Generate Report Request — sent to POST /v1/reconciliation/generate
 */
export interface GenerateReportRequest {
  startDate: string;  // ISO 8601
  endDate: string;    // ISO 8601
}

/**
 * Resolve Discrepancy Request — sent to PUT /v1/reconciliation/discrepancies/{id}/resolve
 */
export interface ResolveDiscrepancyRequest {
  resolutionNote: string;
}

/**
 * Escalate Discrepancy Request — sent to PUT /v1/reconciliation/discrepancies/{id}/escalate
 */
export interface EscalateDiscrepancyRequest {
  supervisorId: string;
}

/**
 * Attendance Filter — query parameters for attendance data retrieval
 */
export interface AttendanceFilter {
  date?: string;
  siteId?: string;
  startDate?: string;
  endDate?: string;
}
