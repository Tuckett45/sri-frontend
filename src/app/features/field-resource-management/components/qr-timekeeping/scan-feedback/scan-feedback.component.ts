import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  OnDestroy
} from '@angular/core';
import { ScanResult } from '../../../models/qr-timekeeping.model';

/**
 * Scan Feedback Component
 *
 * Displays success/error feedback after a QR scan submission.
 * Shows:
 * - Success: green checkmark with "Clocked In!" or "Clocked Out!" message
 * - Error 409: conflict message about already being clocked in
 * - Error 404: station not active, resets scanner after 3 seconds
 * - Error 400: validation error from API response
 * - Proximity Warning: yellow warning about distance from site
 *
 * Requirements: 5.5, 5.6, 5.7, 5.8
 */
@Component({
  selector: 'app-scan-feedback',
  templateUrl: './scan-feedback.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ScanFeedbackComponent implements OnChanges, OnDestroy {
  /** The scan result from the API (success or error details) */
  @Input() scanResult: ScanResult | null = null;

  /** Error message for display (covers HTTP error scenarios) */
  @Input() error: string | null = null;

  /** Error code from the API response (e.g., '409', '404', '400') */
  @Input() errorCode: string | null = null;

  /** Emits when user dismisses the feedback overlay */
  @Output() dismiss = new EventEmitter<void>();

  /** Emits when user wants to retry scanning */
  @Output() retry = new EventEmitter<void>();

  /** Emits when scanner should be reset (e.g., after 3-second delay on 404) */
  @Output() resetScanner = new EventEmitter<void>();

  /** Timer reference for auto-reset on 404 errors */
  private resetTimer: ReturnType<typeof setTimeout> | null = null;

  /** Determines if the feedback represents a successful scan */
  get isSuccess(): boolean {
    return !!this.scanResult?.success;
  }

  /** Determines if there is a proximity warning */
  get hasProximityWarning(): boolean {
    return !!this.scanResult?.proximityWarning;
  }

  /** Returns the appropriate display message for the scan type */
  get successMessage(): string {
    if (!this.scanResult) return '';
    return this.scanResult.scanType === 'ClockIn' ? 'Clocked In!' : 'Clocked Out!';
  }

  /** Returns user-friendly error message based on error code */
  get errorMessage(): string {
    if (this.errorCode === '409') {
      return 'Already clocked in. Scan again to clock out.';
    }
    if (this.errorCode === '404') {
      return 'This station is not active. Please scan a different station or contact your supervisor.';
    }
    if (this.errorCode === '400') {
      return this.error || 'Validation error. Please try again.';
    }
    return this.error || 'An unexpected error occurred. Please try again.';
  }

  /** Determines if the retry button should be shown */
  get showRetryButton(): boolean {
    return !this.isSuccess && this.errorCode !== '404';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['errorCode'] || changes['error']) {
      this.clearResetTimer();

      // Auto-reset scanner after 3-second delay on 404 errors
      if (this.errorCode === '404') {
        this.resetTimer = setTimeout(() => {
          this.resetScanner.emit();
        }, 3000);
      }
    }
  }

  ngOnDestroy(): void {
    this.clearResetTimer();
  }

  /** User-initiated dismiss of the feedback overlay */
  onDismiss(): void {
    this.clearResetTimer();
    this.dismiss.emit();
  }

  /** User-initiated retry after an error */
  onRetry(): void {
    this.clearResetTimer();
    this.retry.emit();
  }

  /** Clears any pending auto-reset timer */
  private clearResetTimer(): void {
    if (this.resetTimer !== null) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }
  }
}
