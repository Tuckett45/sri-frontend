/**
 * QR Timekeeping State — Barrel Export
 *
 * Re-exports all actions, reducer, selectors, effects, and state interfaces
 * for the QR Timekeeping NgRx state slice.
 */

export * as QrTimekeepingActions from './qr-timekeeping.actions';
export {
  qrTimekeepingReducer,
  QrTimekeepingState,
  QrStationState,
  ScanEventState,
  AttendanceState,
  ReconciliationState,
  stationAdapter,
  reconciliationAdapter,
  initialState as qrTimekeepingInitialState
} from './qr-timekeeping.reducer';
export * from './qr-timekeeping.selectors';
export {
  QrScanEffects,
  QrStationEffects,
  AttendanceEffects,
  ReconciliationEffects
} from './qr-timekeeping.effects';
