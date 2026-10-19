/**
 * QR Timekeeping Selectors
 * Provides memoized selectors for accessing all QR timekeeping state slices.
 *
 * Requirements: 5.5, 6.4, 9.1, 10.5, 11.1
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import {
  QrTimekeepingState,
  QrStationState,
  ScanEventState,
  AttendanceState,
  ReconciliationState,
  stationAdapter,
  reconciliationAdapter
} from './qr-timekeeping.reducer';

// ─── Feature Selector ─────────────────────────────────────────────────────────

export const selectQrTimekeepingState = createFeatureSelector<QrTimekeepingState>('qrTimekeeping');

// ─── Station Selectors ────────────────────────────────────────────────────────

export const selectStationState = createSelector(
  selectQrTimekeepingState,
  (state) => state.stations
);

// Entity adapter selectors for stations
const {
  selectAll: selectAllStationsFromAdapter,
  selectEntities: selectStationEntities,
  selectTotal: selectStationTotal
} = stationAdapter.getSelectors();

export const selectAllStations = createSelector(
  selectStationState,
  selectAllStationsFromAdapter
);

export const selectStationsBySite = (siteId: string) => createSelector(
  selectAllStations,
  (stations) => stations.filter(s => s.jobSiteId === siteId)
);

export const selectStationCount = (siteId: string) => createSelector(
  selectStationsBySite(siteId),
  (stations) => stations.length
);

export const selectStationMap = createSelector(
  selectStationState,
  (state) => state.stationMap
);

export const selectStationsLoading = createSelector(
  selectStationState,
  (state) => state.loading
);

export const selectStationsError = createSelector(
  selectStationState,
  (state) => state.error
);

export const selectSelectedSiteId = createSelector(
  selectStationState,
  (state) => state.selectedSiteId
);

// ─── Scan Selectors ───────────────────────────────────────────────────────────

export const selectScanState = createSelector(
  selectQrTimekeepingState,
  (state) => state.scanEvents
);

export const selectLastScanResult = createSelector(
  selectScanState,
  (state) => state.lastScanResult
);

export const selectScanProcessing = createSelector(
  selectScanState,
  (state) => state.processing
);

export const selectScanHistory = createSelector(
  selectScanState,
  (state) => state.scanHistory
);

export const selectScanError = createSelector(
  selectScanState,
  (state) => state.error
);

// ─── Attendance Selectors ─────────────────────────────────────────────────────

export const selectAttendanceState = createSelector(
  selectQrTimekeepingState,
  (state) => state.attendance
);

export const selectAttendanceRecords = createSelector(
  selectAttendanceState,
  (state) => state.records
);

export const selectAttendanceSummary = createSelector(
  selectAttendanceState,
  (state) => state.summary
);

export const selectAttendanceLoading = createSelector(
  selectAttendanceState,
  (state) => state.loading
);

export const selectAttendanceFilters = createSelector(
  selectAttendanceState,
  (state) => state.filters
);

export const selectAttendanceError = createSelector(
  selectAttendanceState,
  (state) => state.error
);

// ─── Reconciliation Selectors ─────────────────────────────────────────────────

export const selectReconciliationState = createSelector(
  selectQrTimekeepingState,
  (state) => state.reconciliation
);

// Entity adapter selectors for reconciliation reports
const {
  selectAll: selectAllReportsFromAdapter,
  selectEntities: selectReportEntities
} = reconciliationAdapter.getSelectors();

export const selectAllReports = createSelector(
  selectReconciliationState,
  selectAllReportsFromAdapter
);

export const selectSelectedReport = createSelector(
  selectReconciliationState,
  (state) => {
    if (!state.selectedReportId) return null;
    return state.entities[state.selectedReportId] ?? null;
  }
);

export const selectDiscrepancies = createSelector(
  selectReconciliationState,
  (state) => state.discrepancies
);

export const selectReportSummary = createSelector(
  selectReconciliationState,
  (state) => state.selectedReportSummary
);

export const selectGenerating = createSelector(
  selectReconciliationState,
  (state) => state.generating
);

export const selectReconciliationLoading = createSelector(
  selectReconciliationState,
  (state) => state.loading
);

export const selectReconciliationError = createSelector(
  selectReconciliationState,
  (state) => state.error
);
