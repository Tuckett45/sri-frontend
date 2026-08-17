import { Component, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';

import { ScanEvent } from '../../../models/qr-timekeeping.model';
import { selectScanHistory } from '../../../state/qr-timekeeping/qr-timekeeping.selectors';

/**
 * QR Time History Component
 *
 * Displays the technician's recent QR scan events as a scrollable list.
 * Each scan event shows timestamp, station identifier, scan type
 * (ClockIn/ClockOut/Rejected), and success status.
 *
 * Requirements: 16.1, 16.2
 */
@Component({
  selector: 'app-qr-time-history',
  templateUrl: './qr-time-history.component.html',
  styleUrls: ['./qr-time-history.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QrTimeHistoryComponent implements OnInit {
  scanHistory$!: Observable<ScanEvent[]>;

  constructor(private store: Store) {}

  ngOnInit(): void {
    this.scanHistory$ = this.store.select(selectScanHistory);
  }

  /**
   * Returns a CSS class for the scan type badge based on the scan type.
   */
  getScanTypeBadgeClass(scanType: string): string {
    switch (scanType) {
      case 'ClockIn':
        return 'badge-clock-in';
      case 'ClockOut':
        return 'badge-clock-out';
      case 'Rejected':
        return 'badge-rejected';
      default:
        return '';
    }
  }

  /**
   * Returns a human-readable label for the scan type.
   */
  getScanTypeLabel(scanType: string): string {
    switch (scanType) {
      case 'ClockIn':
        return 'Clock In';
      case 'ClockOut':
        return 'Clock Out';
      case 'Rejected':
        return 'Rejected';
      default:
        return scanType;
    }
  }

  /**
   * TrackBy function for ngFor performance optimization.
   */
  trackByScanEvent(index: number, event: ScanEvent): string {
    return event.id;
  }
}
