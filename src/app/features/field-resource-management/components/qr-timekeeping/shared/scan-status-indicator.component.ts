import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

/**
 * ScanStatusIndicatorComponent
 *
 * Displays GPS status and scan state indicators as a small reusable widget.
 * Used in the QR scanner and admin components to show real-time status.
 *
 * GPS Status:
 *   - acquiring: pulsing blue dot with "Acquiring GPS..." text
 *   - acquired:  solid green dot with "GPS Acquired" text
 *   - failed:    solid red dot with "Location unavailable" text
 *
 * Scan State:
 *   - idle:            grey dot
 *   - scanning:        pulsing blue dot
 *   - category-select: solid amber dot
 *   - processing:      pulsing purple dot
 *   - success:         solid green dot
 *   - error:           solid red dot
 *
 * Requirements: 12.3, 17.1, 17.2
 */
@Component({
  selector: 'app-scan-status-indicator',
  template: `
    <div class="status-indicator-container">
      <!-- GPS Status -->
      <div *ngIf="showGps" class="indicator-item" [ngClass]="'gps-' + gpsStatus">
        <span class="indicator-dot"
              [ngClass]="{
                'dot-pulse': gpsStatus === 'acquiring',
                'dot-green': gpsStatus === 'acquired',
                'dot-red': gpsStatus === 'failed',
                'dot-blue': gpsStatus === 'acquiring'
              }"></span>
        <span class="indicator-label">{{ gpsLabel }}</span>
      </div>

      <!-- Scan State -->
      <div *ngIf="showScanState" class="indicator-item" [ngClass]="'scan-' + scanState">
        <span class="indicator-dot"
              [ngClass]="{
                'dot-grey': scanState === 'idle',
                'dot-pulse dot-blue': scanState === 'scanning',
                'dot-amber': scanState === 'category-select',
                'dot-pulse dot-purple': scanState === 'processing',
                'dot-green': scanState === 'success',
                'dot-red': scanState === 'error'
              }"></span>
        <span class="indicator-label">{{ scanStateLabel }}</span>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: inline-block;
    }

    .status-indicator-container {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .indicator-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 16px;
      background-color: #f3f4f6;
      font-size: 12px;
    }

    .indicator-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .dot-green {
      background-color: #16a34a;
    }

    .dot-red {
      background-color: #dc2626;
    }

    .dot-blue {
      background-color: #2563eb;
    }

    .dot-amber {
      background-color: #d97706;
    }

    .dot-purple {
      background-color: #7c3aed;
    }

    .dot-grey {
      background-color: #9ca3af;
    }

    .dot-pulse {
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
        transform: scale(1);
      }
      50% {
        opacity: 0.5;
        transform: scale(1.3);
      }
    }

    .indicator-label {
      color: #374151;
      font-weight: 500;
      white-space: nowrap;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ScanStatusIndicatorComponent {
  @Input() gpsStatus: 'acquiring' | 'acquired' | 'failed' = 'acquiring';
  @Input() scanState: 'idle' | 'scanning' | 'category-select' | 'processing' | 'success' | 'error' = 'idle';
  @Input() showGps: boolean = true;
  @Input() showScanState: boolean = false;

  get gpsLabel(): string {
    switch (this.gpsStatus) {
      case 'acquiring':
        return 'Acquiring GPS...';
      case 'acquired':
        return 'GPS Acquired';
      case 'failed':
        return 'Location unavailable';
      default:
        return '';
    }
  }

  get scanStateLabel(): string {
    switch (this.scanState) {
      case 'idle':
        return 'Ready';
      case 'scanning':
        return 'Scanning...';
      case 'category-select':
        return 'Select Category';
      case 'processing':
        return 'Processing...';
      case 'success':
        return 'Success';
      case 'error':
        return 'Error';
      default:
        return '';
    }
  }
}
