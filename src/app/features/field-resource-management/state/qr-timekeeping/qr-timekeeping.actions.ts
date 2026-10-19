/**
 * QR Timekeeping Actions
 * Defines all actions for QR timekeeping state management including
 * QR scanning, station management, attendance, and reconciliation.
 *
 * Requirements: 5.5, 6.3, 7.2, 9.1, 10.1, 10.5, 11.6
 */

import { createAction, props } from '@ngrx/store';
import {
  QrScanRequest,
  ScanResult,
  QrCodeStation,
  RegisterStationRequest,
  StationMapData,
  AttendanceRecord,
  AttendanceSummary,
  AttendanceFilter,
  ReconciliationReport,
  ReconciliationDiscrepancy,
  ReconciliationSummary,
  GenerateReportRequest,
  ResolveDiscrepancyRequest,
  EscalateDiscrepancyRequest,
  ScanEvent
} from '../../models/qr-timekeeping.model';

// ─── QR Scan Actions ──────────────────────────────────────────────────────────

export const processQrScan = createAction(
  '[QR Scan] Process Scan',
  props<{ request: QrScanRequest }>()
);

export const processQrScanSuccess = createAction(
  '[QR Scan] Process Scan Success',
  props<{ result: ScanResult }>()
);

export const processQrScanFailure = createAction(
  '[QR Scan] Process Scan Failure',
  props<{ error: string }>()
);

export const clearScanResult = createAction(
  '[QR Scan] Clear Scan Result'
);

// ─── Station Actions ──────────────────────────────────────────────────────────

export const loadStations = createAction(
  '[QR Stations] Load Stations',
  props<{ siteId: string }>()
);

export const loadStationsSuccess = createAction(
  '[QR Stations] Load Stations Success',
  props<{ stations: QrCodeStation[] }>()
);

export const loadStationsFailure = createAction(
  '[QR Stations] Load Stations Failure',
  props<{ error: string }>()
);

export const registerStation = createAction(
  '[QR Stations] Register Station',
  props<{ request: RegisterStationRequest }>()
);

export const registerStationSuccess = createAction(
  '[QR Stations] Register Station Success',
  props<{ station: QrCodeStation }>()
);

export const registerStationFailure = createAction(
  '[QR Stations] Register Station Failure',
  props<{ error: string }>()
);

export const deactivateStation = createAction(
  '[QR Stations] Deactivate Station',
  props<{ stationId: string }>()
);

export const deactivateStationSuccess = createAction(
  '[QR Stations] Deactivate Station Success',
  props<{ stationId: string }>()
);

export const loadStationMap = createAction(
  '[QR Stations] Load Station Map',
  props<{ jobId: string; period?: number }>()
);

export const loadStationMapSuccess = createAction(
  '[QR Stations] Load Station Map Success',
  props<{ stationMap: StationMapData }>()
);

// ─── Attendance Actions ───────────────────────────────────────────────────────

export const loadAttendance = createAction(
  '[Attendance] Load Attendance',
  props<{ filters: AttendanceFilter }>()
);

export const loadAttendanceSuccess = createAction(
  '[Attendance] Load Attendance Success',
  props<{ records: AttendanceRecord[] }>()
);

export const loadAttendanceFailure = createAction(
  '[Attendance] Load Attendance Failure',
  props<{ error: string }>()
);

export const loadAttendanceSummary = createAction(
  '[Attendance] Load Summary',
  props<{ date: string }>()
);

export const loadAttendanceSummarySuccess = createAction(
  '[Attendance] Load Summary Success',
  props<{ summary: AttendanceSummary }>()
);

// ─── Reconciliation Actions ───────────────────────────────────────────────────

export const generateReport = createAction(
  '[Reconciliation] Generate Report',
  props<{ request: GenerateReportRequest }>()
);

export const generateReportSuccess = createAction(
  '[Reconciliation] Generate Report Success',
  props<{ report: ReconciliationReport }>()
);

export const generateReportFailure = createAction(
  '[Reconciliation] Generate Report Failure',
  props<{ error: string }>()
);

export const loadReport = createAction(
  '[Reconciliation] Load Report',
  props<{ reportId: string }>()
);

export const loadReportSuccess = createAction(
  '[Reconciliation] Load Report Success',
  props<{ report: ReconciliationReport; summary: ReconciliationSummary }>()
);

export const resolveDiscrepancy = createAction(
  '[Reconciliation] Resolve Discrepancy',
  props<{ discrepancyId: string; request: ResolveDiscrepancyRequest }>()
);

export const resolveDiscrepancySuccess = createAction(
  '[Reconciliation] Resolve Discrepancy Success',
  props<{ discrepancyId: string }>()
);

export const escalateDiscrepancy = createAction(
  '[Reconciliation] Escalate Discrepancy',
  props<{ discrepancyId: string; request: EscalateDiscrepancyRequest }>()
);

export const escalateDiscrepancySuccess = createAction(
  '[Reconciliation] Escalate Discrepancy Success',
  props<{ discrepancyId: string }>()
);
