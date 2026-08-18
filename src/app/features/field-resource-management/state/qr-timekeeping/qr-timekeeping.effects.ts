/**
 * QR Timekeeping Effects
 * Handles side effects for all QR timekeeping actions including API calls
 * and real-time SignalR integration.
 *
 * Requirements: 5.5, 5.6, 5.7, 5.8, 6.3, 7.2, 9.1, 10.1, 11.5, 11.6, 13.1, 17.1, 17.2
 */

import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import * as QrTimekeepingActions from './qr-timekeeping.actions';
import { QrScanService } from '../../services/qr-scan.service';
import { StationService } from '../../services/station.service';
import { AttendanceService } from '../../services/attendance.service';
import { ReconciliationService } from '../../services/reconciliation.service';

// ─── QR Scan Effects ──────────────────────────────────────────────────────────

@Injectable()
export class QrScanEffects {

  processQrScan$ = createEffect(() =>
    this.actions$.pipe(
      ofType(QrTimekeepingActions.processQrScan),
      switchMap(({ request }) =>
        this.qrScanService.processScan(request).pipe(
          map((result) => QrTimekeepingActions.processQrScanSuccess({ result })),
          catchError((error) =>
            of(QrTimekeepingActions.processQrScanFailure({
              error: error.message || 'Scan processing failed'
            }))
          )
        )
      )
    )
  );

  constructor(
    private actions$: Actions,
    private qrScanService: QrScanService
  ) {}
}

// ─── QR Station Effects ───────────────────────────────────────────────────────

@Injectable()
export class QrStationEffects {

  loadStations$ = createEffect(() =>
    this.actions$.pipe(
      ofType(QrTimekeepingActions.loadStations),
      switchMap(({ siteId }) =>
        this.stationService.getStationsForSite(siteId).pipe(
          map((stations) => QrTimekeepingActions.loadStationsSuccess({ stations })),
          catchError((error) =>
            of(QrTimekeepingActions.loadStationsFailure({
              error: error.message || 'Failed to load stations'
            }))
          )
        )
      )
    )
  );

  registerStation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(QrTimekeepingActions.registerStation),
      switchMap(({ request }) =>
        this.stationService.registerStation(request).pipe(
          map((station) => QrTimekeepingActions.registerStationSuccess({ station })),
          catchError((error) =>
            of(QrTimekeepingActions.registerStationFailure({
              error: error.message || 'Failed to register station'
            }))
          )
        )
      )
    )
  );

  deactivateStation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(QrTimekeepingActions.deactivateStation),
      switchMap(({ stationId }) =>
        this.stationService.deactivateStation(stationId).pipe(
          map(() => QrTimekeepingActions.deactivateStationSuccess({ stationId })),
          catchError((error) =>
            of(QrTimekeepingActions.loadStationsFailure({
              error: error.message || 'Failed to deactivate station'
            }))
          )
        )
      )
    )
  );

  loadStationMap$ = createEffect(() =>
    this.actions$.pipe(
      ofType(QrTimekeepingActions.loadStationMap),
      switchMap(({ jobId, period }) =>
        this.stationService.getStationMap(jobId, period).pipe(
          map((stationMap) => QrTimekeepingActions.loadStationMapSuccess({ stationMap })),
          catchError((error) =>
            of(QrTimekeepingActions.loadStationsFailure({
              error: error.message || 'Failed to load station map'
            }))
          )
        )
      )
    )
  );

  constructor(
    private actions$: Actions,
    private stationService: StationService
  ) {}
}

// ─── Attendance Effects ───────────────────────────────────────────────────────

@Injectable()
export class AttendanceEffects {

  loadAttendance$ = createEffect(() =>
    this.actions$.pipe(
      ofType(QrTimekeepingActions.loadAttendance),
      switchMap(({ filters }) =>
        this.attendanceService.getAttendance(filters).pipe(
          map((records) => QrTimekeepingActions.loadAttendanceSuccess({ records })),
          catchError((error) =>
            of(QrTimekeepingActions.loadAttendanceFailure({
              error: error.message || 'Failed to load attendance records'
            }))
          )
        )
      )
    )
  );

  loadAttendanceSummary$ = createEffect(() =>
    this.actions$.pipe(
      ofType(QrTimekeepingActions.loadAttendanceSummary),
      switchMap(({ date }) =>
        this.attendanceService.getSummary(date).pipe(
          map((summary) => QrTimekeepingActions.loadAttendanceSummarySuccess({ summary })),
          catchError((error) =>
            of(QrTimekeepingActions.loadAttendanceFailure({
              error: error.message || 'Failed to load attendance summary'
            }))
          )
        )
      )
    )
  );

  constructor(
    private actions$: Actions,
    private attendanceService: AttendanceService
  ) {}
}

// ─── Reconciliation Effects ───────────────────────────────────────────────────

@Injectable()
export class ReconciliationEffects {

  generateReport$ = createEffect(() =>
    this.actions$.pipe(
      ofType(QrTimekeepingActions.generateReport),
      switchMap(({ request }) =>
        this.reconciliationService.generateReport(request).pipe(
          map((report) => QrTimekeepingActions.generateReportSuccess({ report })),
          catchError((error) =>
            of(QrTimekeepingActions.generateReportFailure({
              error: error.message || 'Failed to generate reconciliation report'
            }))
          )
        )
      )
    )
  );

  loadReport$ = createEffect(() =>
    this.actions$.pipe(
      ofType(QrTimekeepingActions.loadReport),
      switchMap(({ reportId }) =>
        this.reconciliationService.getReport(reportId).pipe(
          switchMap((report) =>
            this.reconciliationService.getReportSummary(reportId).pipe(
              map((summary) => QrTimekeepingActions.loadReportSuccess({ report, summary }))
            )
          ),
          catchError((error) =>
            of(QrTimekeepingActions.generateReportFailure({
              error: error.message || 'Failed to load reconciliation report'
            }))
          )
        )
      )
    )
  );

  resolveDiscrepancy$ = createEffect(() =>
    this.actions$.pipe(
      ofType(QrTimekeepingActions.resolveDiscrepancy),
      switchMap(({ discrepancyId, request }) =>
        this.reconciliationService.resolveDiscrepancy(discrepancyId, request).pipe(
          map(() => QrTimekeepingActions.resolveDiscrepancySuccess({ discrepancyId })),
          catchError((error) =>
            of(QrTimekeepingActions.generateReportFailure({
              error: error.message || 'Failed to resolve discrepancy'
            }))
          )
        )
      )
    )
  );

  escalateDiscrepancy$ = createEffect(() =>
    this.actions$.pipe(
      ofType(QrTimekeepingActions.escalateDiscrepancy),
      switchMap(({ discrepancyId, request }) =>
        this.reconciliationService.escalateDiscrepancy(discrepancyId, request).pipe(
          map(() => QrTimekeepingActions.escalateDiscrepancySuccess({ discrepancyId })),
          catchError((error) =>
            of(QrTimekeepingActions.generateReportFailure({
              error: error.message || 'Failed to escalate discrepancy'
            }))
          )
        )
      )
    )
  );

  constructor(
    private actions$: Actions,
    private reconciliationService: ReconciliationService
  ) {}
}
