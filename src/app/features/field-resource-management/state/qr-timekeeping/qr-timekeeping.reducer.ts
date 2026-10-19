/**
 * QR Timekeeping Reducer
 * Manages all QR timekeeping state using EntityAdapter for normalized entities.
 * Handles stations, scan events, attendance, and reconciliation sub-states.
 *
 * Requirements: 5.5, 6.3, 9.1, 10.5, 11.6
 */

import { createReducer, on } from '@ngrx/store';
import { EntityState, EntityAdapter, createEntityAdapter } from '@ngrx/entity';
import {
  QrCodeStation,
  ScanResult,
  ScanEvent,
  StationMapData,
  AttendanceRecord,
  AttendanceSummary,
  AttendanceFilter,
  ReconciliationReport,
  ReconciliationDiscrepancy,
  ReconciliationSummary
} from '../../models/qr-timekeeping.model';
import * as QrTimekeepingActions from './qr-timekeeping.actions';

// ─── State Interfaces ─────────────────────────────────────────────────────────

export interface QrStationState extends EntityState<QrCodeStation> {
  selectedSiteId: string | null;
  loading: boolean;
  error: string | null;
  stationMap: StationMapData | null;
}

export interface ScanEventState {
  lastScanResult: ScanResult | null;
  scanHistory: ScanEvent[];
  processing: boolean;
  error: string | null;
}

export interface AttendanceState {
  records: AttendanceRecord[];
  summary: AttendanceSummary | null;
  filters: AttendanceFilter;
  loading: boolean;
  error: string | null;
}

export interface ReconciliationState extends EntityState<ReconciliationReport> {
  selectedReportId: string | null;
  selectedReportSummary: ReconciliationSummary | null;
  discrepancies: ReconciliationDiscrepancy[];
  generating: boolean;
  loading: boolean;
  error: string | null;
}

export interface QrTimekeepingState {
  stations: QrStationState;
  scanEvents: ScanEventState;
  attendance: AttendanceState;
  reconciliation: ReconciliationState;
}

// ─── Entity Adapters ──────────────────────────────────────────────────────────

export const stationAdapter: EntityAdapter<QrCodeStation> = createEntityAdapter<QrCodeStation>({
  selectId: (station: QrCodeStation) => station.id,
  sortComparer: (a, b) => a.sequenceNumber - b.sequenceNumber
});

export const reconciliationAdapter: EntityAdapter<ReconciliationReport> = createEntityAdapter<ReconciliationReport>({
  selectId: (report: ReconciliationReport) => report.id,
  sortComparer: (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
});

// ─── Initial State ────────────────────────────────────────────────────────────

export const initialStationState: QrStationState = stationAdapter.getInitialState({
  selectedSiteId: null,
  loading: false,
  error: null,
  stationMap: null
});

export const initialScanEventState: ScanEventState = {
  lastScanResult: null,
  scanHistory: [],
  processing: false,
  error: null
};

export const initialAttendanceState: AttendanceState = {
  records: [],
  summary: null,
  filters: {},
  loading: false,
  error: null
};

export const initialReconciliationState: ReconciliationState = reconciliationAdapter.getInitialState({
  selectedReportId: null,
  selectedReportSummary: null,
  discrepancies: [],
  generating: false,
  loading: false,
  error: null
});

export const initialState: QrTimekeepingState = {
  stations: initialStationState,
  scanEvents: initialScanEventState,
  attendance: initialAttendanceState,
  reconciliation: initialReconciliationState
};

// ─── Reducer ──────────────────────────────────────────────────────────────────

export const qrTimekeepingReducer = createReducer(
  initialState,

  // ─── QR Scan ────────────────────────────────────────────────────────────────

  on(QrTimekeepingActions.processQrScan, (state) => ({
    ...state,
    scanEvents: {
      ...state.scanEvents,
      processing: true,
      error: null
    }
  })),

  on(QrTimekeepingActions.processQrScanSuccess, (state, { result }) => ({
    ...state,
    scanEvents: {
      ...state.scanEvents,
      lastScanResult: result,
      processing: false,
      error: null
    }
  })),

  on(QrTimekeepingActions.processQrScanFailure, (state, { error }) => ({
    ...state,
    scanEvents: {
      ...state.scanEvents,
      processing: false,
      error
    }
  })),

  on(QrTimekeepingActions.clearScanResult, (state) => ({
    ...state,
    scanEvents: {
      ...state.scanEvents,
      lastScanResult: null,
      error: null
    }
  })),

  // ─── Stations ───────────────────────────────────────────────────────────────

  on(QrTimekeepingActions.loadStations, (state, { siteId }) => ({
    ...state,
    stations: {
      ...state.stations,
      selectedSiteId: siteId,
      loading: true,
      error: null
    }
  })),

  on(QrTimekeepingActions.loadStationsSuccess, (state, { stations }) => ({
    ...state,
    stations: stationAdapter.setAll(stations, {
      ...state.stations,
      loading: false,
      error: null
    })
  })),

  on(QrTimekeepingActions.loadStationsFailure, (state, { error }) => ({
    ...state,
    stations: {
      ...state.stations,
      loading: false,
      error
    }
  })),

  on(QrTimekeepingActions.registerStation, (state) => ({
    ...state,
    stations: {
      ...state.stations,
      loading: true,
      error: null
    }
  })),

  on(QrTimekeepingActions.registerStationSuccess, (state, { station }) => ({
    ...state,
    stations: stationAdapter.addOne(station, {
      ...state.stations,
      loading: false,
      error: null
    })
  })),

  on(QrTimekeepingActions.registerStationFailure, (state, { error }) => ({
    ...state,
    stations: {
      ...state.stations,
      loading: false,
      error
    }
  })),

  on(QrTimekeepingActions.deactivateStation, (state) => ({
    ...state,
    stations: {
      ...state.stations,
      loading: true,
      error: null
    }
  })),

  on(QrTimekeepingActions.deactivateStationSuccess, (state, { stationId }) => ({
    ...state,
    stations: stationAdapter.updateOne(
      {
        id: stationId,
        changes: {
          isActive: false,
          activityStatus: 'Inactive_Flagged' as const,
          deactivatedAt: new Date()
        }
      },
      {
        ...state.stations,
        loading: false,
        error: null
      }
    )
  })),

  on(QrTimekeepingActions.loadStationMap, (state) => ({
    ...state,
    stations: {
      ...state.stations,
      loading: true,
      error: null
    }
  })),

  on(QrTimekeepingActions.loadStationMapSuccess, (state, { stationMap }) => ({
    ...state,
    stations: {
      ...state.stations,
      stationMap,
      loading: false,
      error: null
    }
  })),

  // ─── Attendance ─────────────────────────────────────────────────────────────

  on(QrTimekeepingActions.loadAttendance, (state, { filters }) => ({
    ...state,
    attendance: {
      ...state.attendance,
      filters,
      loading: true,
      error: null
    }
  })),

  on(QrTimekeepingActions.loadAttendanceSuccess, (state, { records }) => ({
    ...state,
    attendance: {
      ...state.attendance,
      records,
      loading: false,
      error: null
    }
  })),

  on(QrTimekeepingActions.loadAttendanceFailure, (state, { error }) => ({
    ...state,
    attendance: {
      ...state.attendance,
      loading: false,
      error
    }
  })),

  on(QrTimekeepingActions.loadAttendanceSummary, (state) => ({
    ...state,
    attendance: {
      ...state.attendance,
      loading: true,
      error: null
    }
  })),

  on(QrTimekeepingActions.loadAttendanceSummarySuccess, (state, { summary }) => ({
    ...state,
    attendance: {
      ...state.attendance,
      summary,
      loading: false,
      error: null
    }
  })),

  // ─── Reconciliation ────────────────────────────────────────────────────────

  on(QrTimekeepingActions.generateReport, (state) => ({
    ...state,
    reconciliation: {
      ...state.reconciliation,
      generating: true,
      error: null
    }
  })),

  on(QrTimekeepingActions.generateReportSuccess, (state, { report }) => ({
    ...state,
    reconciliation: reconciliationAdapter.addOne(report, {
      ...state.reconciliation,
      selectedReportId: report.id,
      discrepancies: report.discrepancies || [],
      generating: false,
      error: null
    })
  })),

  on(QrTimekeepingActions.generateReportFailure, (state, { error }) => ({
    ...state,
    reconciliation: {
      ...state.reconciliation,
      generating: false,
      error
    }
  })),

  on(QrTimekeepingActions.loadReport, (state) => ({
    ...state,
    reconciliation: {
      ...state.reconciliation,
      loading: true,
      error: null
    }
  })),

  on(QrTimekeepingActions.loadReportSuccess, (state, { report, summary }) => ({
    ...state,
    reconciliation: reconciliationAdapter.upsertOne(report, {
      ...state.reconciliation,
      selectedReportId: report.id,
      selectedReportSummary: summary,
      discrepancies: report.discrepancies || [],
      loading: false,
      error: null
    })
  })),

  on(QrTimekeepingActions.resolveDiscrepancy, (state) => ({
    ...state,
    reconciliation: {
      ...state.reconciliation,
      loading: true,
      error: null
    }
  })),

  on(QrTimekeepingActions.resolveDiscrepancySuccess, (state, { discrepancyId }) => ({
    ...state,
    reconciliation: {
      ...state.reconciliation,
      discrepancies: state.reconciliation.discrepancies.map(d =>
        d.id === discrepancyId ? { ...d, status: 'Resolved' as const } : d
      ),
      loading: false,
      error: null
    }
  })),

  on(QrTimekeepingActions.escalateDiscrepancy, (state) => ({
    ...state,
    reconciliation: {
      ...state.reconciliation,
      loading: true,
      error: null
    }
  })),

  on(QrTimekeepingActions.escalateDiscrepancySuccess, (state, { discrepancyId }) => ({
    ...state,
    reconciliation: {
      ...state.reconciliation,
      discrepancies: state.reconciliation.discrepancies.map(d =>
        d.id === discrepancyId ? { ...d, status: 'Escalated' as const } : d
      ),
      loading: false,
      error: null
    }
  }))
);
