import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  NgZone
} from '@angular/core';
import { Store } from '@ngrx/store';
import { Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AuthService } from '../../../../../services/auth.service';
import { GeolocationService } from '../../../services/geolocation.service';
import { OfflineQueueService } from '../../../services/offline-queue.service';
import { GeoLocation } from '../../../models/time-entry.model';
import { QrScanRequest, QrTimeCategory, ScanResult } from '../../../models/qr-timekeeping.model';
import * as QrTimekeepingActions from '../../../state/qr-timekeeping/qr-timekeeping.actions';
import {
  selectLastScanResult,
  selectScanProcessing,
  selectScanError
} from '../../../state/qr-timekeeping/qr-timekeeping.selectors';
import { selectActiveTimeEntry } from '../../../state/time-entries/time-entry.selectors';
import { TimeEntry } from '../../../models/time-entry.model';

/**
 * Scan state machine states for the QR scanner UI.
 */
export type ScanState = 'idle' | 'scanning' | 'category-select' | 'processing' | 'success' | 'error';

/**
 * GPS acquisition status.
 */
export type GpsStatus = 'acquiring' | 'acquired' | 'failed';

/**
 * QR Scanner Component
 *
 * Mobile-first camera-based QR code scanning for clock-in/out.
 * Uses html5-qrcode library for cross-browser camera access.
 *
 * Requirements: 1.1–1.7, 2.1–2.4, 3.1–3.2, 5.1–5.4, 13.1–13.2, 15.3, 15.4
 */
@Component({
  selector: 'app-qr-scanner',
  templateUrl: './qr-scanner.component.html',
  styleUrls: ['./qr-scanner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QrScannerComponent implements OnInit, OnDestroy {
  // ─── UI State ─────────────────────────────────────────────────────────────
  scanState: ScanState = 'idle';
  gpsStatus: GpsStatus = 'acquiring';
  errorMessage: string = '';
  successMessage: string = '';
  feedbackMessage: string = '';

  // ─── Scan Data ────────────────────────────────────────────────────────────
  scannedStationId: string | null = null;
  selectedCategory: QrTimeCategory | null = null;
  showCategorySelector: boolean = false;
  currentLocation: GeoLocation | null = null;
  activeEntry: TimeEntry | null = null;

  // ─── Camera ───────────────────────────────────────────────────────────────
  private html5QrCode: any = null;
  cameraActive: boolean = false;
  cameraError: string | null = null;

  // ─── GPS Caching ──────────────────────────────────────────────────────────
  private gpsCacheTimestamp: number = 0;
  private static readonly GPS_CACHE_DURATION_MS = 60000; // 60 seconds

  // ─── Lifecycle ────────────────────────────────────────────────────────────
  private destroy$ = new Subject<void>();
  private resetTimeout: any = null;

  // ─── Station identifier validation pattern ────────────────────────────────
  private readonly stationPattern = /^[a-f0-9]+:\d{2}$/;

  constructor(
    private store: Store,
    private authService: AuthService,
    private geolocationService: GeolocationService,
    private offlineQueueService: OfflineQueueService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    // Subscribe to active time entry to determine clock-in vs clock-out
    this.store.select(selectActiveTimeEntry).pipe(
      takeUntil(this.destroy$)
    ).subscribe(entry => {
      this.activeEntry = entry;
      this.cdr.markForCheck();
    });

    // Subscribe to scan result from store
    this.store.select(selectLastScanResult).pipe(
      takeUntil(this.destroy$)
    ).subscribe(result => {
      if (result) {
        this.onScanResult(result);
      }
    });

    // Subscribe to scan processing state
    this.store.select(selectScanProcessing).pipe(
      takeUntil(this.destroy$)
    ).subscribe(processing => {
      if (processing && this.scanState !== 'processing') {
        this.scanState = 'processing';
        this.cdr.markForCheck();
      }
    });

    // Subscribe to scan errors
    this.store.select(selectScanError).pipe(
      takeUntil(this.destroy$)
    ).subscribe(error => {
      if (error) {
        this.onScanError(error);
      }
    });

    // Initialize scanner
    this.initializeScanner();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopScanner();

    if (this.resetTimeout) {
      clearTimeout(this.resetTimeout);
    }
  }

  // ─── Scanner Initialization ─────────────────────────────────────────────────

  /**
   * Initializes camera and GPS acquisition in parallel.
   * Requirements: 1.1, 1.2, 1.4, 1.5, 15.4
   */
  async initializeScanner(): Promise<void> {
    // Begin GPS acquisition in parallel
    this.acquireGps();

    // Initialize html5-qrcode camera
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      this.html5QrCode = new Html5Qrcode('qr-reader-container');

      const cameras = await Html5Qrcode.getCameras();
      if (!cameras || cameras.length === 0) {
        this.cameraError = 'No cameras found on this device.';
        this.scanState = 'error';
        this.errorMessage = 'No cameras available. Please ensure camera access is enabled.';
        this.cdr.markForCheck();
        return;
      }

      // Prefer rear-facing camera
      const backCamera = cameras.find(
        (c: any) => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('rear')
      ) || cameras[0];

      await this.html5QrCode.start(
        backCamera.id,
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText: string) => this.ngZone.run(() => this.onQrCodeScanned(decodedText)),
        () => {} // Ignore scan failures during active scanning
      );

      this.cameraActive = true;
      this.scanState = 'scanning';
      this.cdr.markForCheck();
    } catch (error: any) {
      this.cameraError = error?.message || 'Camera initialization failed.';
      this.scanState = 'error';
      this.errorMessage = 'Camera permission denied. Enable camera in browser settings.';
      this.cdr.markForCheck();
    }
  }

  /**
   * Acquires GPS coordinates with caching.
   * Requirements: 1.4, 1.5, 1.6, 15.4
   */
  private acquireGps(): void {
    // Check if cached GPS is still valid
    const now = Date.now();
    if (this.currentLocation && (now - this.gpsCacheTimestamp) < QrScannerComponent.GPS_CACHE_DURATION_MS) {
      this.gpsStatus = 'acquired';
      this.cdr.markForCheck();
      return;
    }

    this.gpsStatus = 'acquiring';
    this.geolocationService.getCurrentPositionWithFallback().subscribe({
      next: (location: GeoLocation) => {
        this.currentLocation = location;
        this.gpsCacheTimestamp = Date.now();
        this.gpsStatus = 'acquired';
        this.cdr.markForCheck();
      },
      error: () => {
        this.gpsStatus = 'failed';
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Stops the camera stream and releases hardware resources.
   * Requirement: 1.7
   */
  async stopScanner(): Promise<void> {
    if (this.html5QrCode && this.cameraActive) {
      try {
        await this.html5QrCode.stop();
      } catch (e) {
        // Ignore stop errors (camera may already be stopped)
      }
      this.cameraActive = false;
    }
  }

  // ─── QR Code Handling ───────────────────────────────────────────────────────

  /**
   * Handles decoded QR text. Validates format and transitions state.
   * Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2
   */
  onQrCodeScanned(decodedText: string): void {
    // Validate station identifier pattern
    if (!this.stationPattern.test(decodedText)) {
      this.showTemporaryError('Invalid QR code. Please scan a registered station code.');
      return;
    }

    // Pause scanner to prevent duplicate scans
    if (this.html5QrCode) {
      try {
        this.html5QrCode.pause();
      } catch (e) {
        // Ignore pause errors
      }
    }

    this.scannedStationId = decodedText;

    // Trigger haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(200);
    }

    // Determine clock-in vs clock-out
    if (this.activeEntry && !this.activeEntry.clockOutTime) {
      // Clock-out: skip category selection, submit immediately
      this.submitClockOut(this.activeEntry.id);
    } else {
      // Clock-in: show category selector
      this.scanState = 'category-select';
      this.showCategorySelector = true;
      this.cdr.markForCheck();
    }
  }

  /**
   * Handles time category selection from the selector component.
   * Requirement: 4.3
   */
  onCategorySelected(category: QrTimeCategory): void {
    this.selectedCategory = category;
    this.cdr.markForCheck();
  }

  // ─── Scan Submission ────────────────────────────────────────────────────────

  /**
   * Submits a clock-in scan with all required data.
   *
   * Guards:
   * - No scannedStationId: return early
   * - Already processing: return early (idempotency)
   * - Clock-in without GPS: return early
   * - Clock-in without category: return early
   *
   * Requirements: 5.1, 5.2, 5.3, 5.4, 13.1, 13.2
   */
  submitScan(): void {
    // Guard: no station scanned
    if (!this.scannedStationId) {
      return;
    }

    // Guard: prevent duplicate submissions while processing
    if (this.scanState === 'processing') {
      return;
    }

    // Guard: for clock-in, require category selection
    if (!this.activeEntry || this.activeEntry.clockOutTime) {
      // This is a clock-in flow
      if (!this.selectedCategory) {
        return;
      }
      // Guard: for clock-in, require GPS
      if (this.gpsStatus !== 'acquired' || !this.currentLocation) {
        return;
      }
    }

    // Build QrScanRequest
    const user = this.authService.getUser();
    const request: QrScanRequest = {
      stationIdentifier: this.scannedStationId,
      technicianId: user?.id || '',
      scanTimestamp: new Date().toISOString(),
      latitude: this.currentLocation?.latitude,
      longitude: this.currentLocation?.longitude,
      gpsAccuracy: this.currentLocation?.accuracy,
      timeCategory: this.selectedCategory ?? undefined
    };

    // Set processing state
    this.scanState = 'processing';
    this.cdr.markForCheck();

    // Check online status and handle offline scenario
    if (!navigator.onLine) {
      this.handleOfflineScan(request);
      return;
    }

    // Dispatch to store
    this.store.dispatch(QrTimekeepingActions.processQrScan({ request }));
  }

  /**
   * Submits a clock-out scan (no category required).
   *
   * Requirements: 5.2, 5.4, 13.1, 13.2
   */
  submitClockOut(activeEntryId: string): void {
    if (!this.scannedStationId) {
      return;
    }

    // Guard: prevent duplicate submissions while processing
    if (this.scanState === 'processing') {
      return;
    }

    const user = this.authService.getUser();
    const request: QrScanRequest = {
      stationIdentifier: this.scannedStationId,
      technicianId: user?.id || '',
      scanTimestamp: new Date().toISOString(),
      latitude: this.currentLocation?.latitude,
      longitude: this.currentLocation?.longitude,
      gpsAccuracy: this.currentLocation?.accuracy
      // No timeCategory for clock-out
    };

    // Set processing state
    this.scanState = 'processing';
    this.cdr.markForCheck();

    // Check online status and handle offline scenario
    if (!navigator.onLine) {
      this.handleOfflineScan(request);
      return;
    }

    // Dispatch to store
    this.store.dispatch(QrTimekeepingActions.processQrScan({ request }));
  }

  /**
   * Handles offline scan by queuing the request for later submission.
   * Requirements: 13.1, 13.2
   */
  private handleOfflineScan(request: QrScanRequest): void {
    // Queue the action for later submission when online
    const action = QrTimekeepingActions.processQrScan({ request });
    this.offlineQueueService.queueAction(action);

    // Show queued feedback
    this.scanState = 'success';
    this.feedbackMessage = 'Scan queued — will submit when online.';
    this.successMessage = 'Scan queued — will submit when online.';
    this.cdr.markForCheck();

    // Auto-reset after delay
    this.scheduleReset(4000);
  }

  // ─── Result Handling ────────────────────────────────────────────────────────

  /**
   * Handles successful scan result from the store.
   * Requirement: 5.5
   */
  private onScanResult(result: ScanResult): void {
    if (result.success) {
      this.scanState = 'success';
      this.successMessage = result.scanType === 'ClockIn'
        ? 'Clock-in recorded successfully!'
        : 'Clock-out recorded successfully!';
      this.feedbackMessage = this.successMessage;
      this.errorMessage = '';
    } else {
      this.scanState = 'error';
      this.errorMessage = result.errorMessage || 'Scan failed. Please try again.';
      this.feedbackMessage = this.errorMessage;
    }
    this.cdr.markForCheck();

    // Auto-reset to scanning after delay
    this.scheduleReset(3500);
  }

  /**
   * Handles scan error from the store.
   * Requirements: 5.6, 5.7, 5.8
   */
  private onScanError(error: string): void {
    this.scanState = 'error';
    this.errorMessage = error;
    this.feedbackMessage = error;
    this.cdr.markForCheck();

    // Auto-reset after delay
    this.scheduleReset(3500);
  }

  // ─── UI Helpers ─────────────────────────────────────────────────────────────

  /**
   * Whether the submit button should be disabled.
   * Requirements: 5.3, 5.4
   */
  get isSubmitDisabled(): boolean {
    // Disabled while processing
    if (this.scanState === 'processing') {
      return true;
    }

    // For clock-in: require both GPS and category
    const isClockIn = !this.activeEntry || !!this.activeEntry.clockOutTime;
    if (isClockIn) {
      if (!this.selectedCategory) {
        return true;
      }
      if (this.gpsStatus !== 'acquired' || !this.currentLocation) {
        return true;
      }
    }

    return false;
  }

  /**
   * Shows a temporary error message without changing state.
   */
  private showTemporaryError(message: string): void {
    this.errorMessage = message;
    this.cdr.markForCheck();

    setTimeout(() => {
      this.errorMessage = '';
      this.cdr.markForCheck();
    }, 3000);
  }

  /**
   * Resets the scanner to the scanning state after a delay.
   */
  private scheduleReset(delayMs: number): void {
    if (this.resetTimeout) {
      clearTimeout(this.resetTimeout);
    }

    this.resetTimeout = setTimeout(() => {
      this.resetScanner();
    }, delayMs);
  }

  /**
   * Resets scanner to initial scanning state.
   */
  resetScanner(): void {
    this.scannedStationId = null;
    this.selectedCategory = null;
    this.showCategorySelector = false;
    this.errorMessage = '';
    this.successMessage = '';
    this.feedbackMessage = '';
    this.scanState = 'scanning';

    // Clear scan result from store
    this.store.dispatch(QrTimekeepingActions.clearScanResult());

    // Resume camera scanner
    if (this.html5QrCode && this.cameraActive) {
      try {
        this.html5QrCode.resume();
      } catch (e) {
        // Ignore resume errors
      }
    }

    this.cdr.markForCheck();
  }

  /**
   * Switches between front and rear cameras.
   */
  async switchCamera(): Promise<void> {
    if (!this.html5QrCode) return;

    try {
      await this.stopScanner();
      // Re-initialize will pick a different camera
      await this.initializeScanner();
    } catch (e) {
      // Ignore switch errors
    }
  }
}
