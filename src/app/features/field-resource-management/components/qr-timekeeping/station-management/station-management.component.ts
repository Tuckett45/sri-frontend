import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';
import { Store } from '@ngrx/store';
import { MatDialog } from '@angular/material/dialog';
import { Observable, Subject } from 'rxjs';
import { takeUntil, map } from 'rxjs/operators';
import { Router } from '@angular/router';

import { QrCodeStation } from '../../../models/qr-timekeeping.model';
import * as QrTimekeepingActions from '../../../state/qr-timekeeping/qr-timekeeping.actions';
import {
  selectAllStations,
  selectStationsLoading,
  selectSelectedSiteId
} from '../../../state/qr-timekeeping/qr-timekeeping.selectors';

/**
 * Job interface for site selector dropdown.
 */
export interface Job {
  id: string;
  name: string;
}

/**
 * Station Management Component
 *
 * Admin view for managing QR stations across job sites.
 * Supports registration, deactivation, and activity monitoring.
 * Displays stations in responsive table (desktop) or cards (mobile).
 *
 * Requirements: 6.1-6.4, 7.1-7.4, 14.4, 14.5
 */
@Component({
  selector: 'app-station-management',
  templateUrl: './station-management.component.html',
  styleUrls: ['./station-management.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StationManagementComponent implements OnInit, OnDestroy {
  // ─── Observables ──────────────────────────────────────────────────────────
  stations$: Observable<QrCodeStation[]>;
  loading$: Observable<boolean>;
  stationCount$: Observable<number>;

  // ─── State ────────────────────────────────────────────────────────────────
  selectedSiteId: string | null = null;
  displayedColumns: string[] = ['stationIdentifier', 'locationDescription', 'activityStatus', 'createdAt', 'actions'];

  // Mock available jobs (in production, loaded from a jobs service)
  availableJobs: Job[] = [
    { id: 'site-001', name: 'Downtown Office Tower' },
    { id: 'site-002', name: 'Northside Warehouse' },
    { id: 'site-003', name: 'Airport Terminal Renovation' }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private store: Store,
    private dialog: MatDialog,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.stations$ = this.store.select(selectAllStations);
    this.loading$ = this.store.select(selectStationsLoading);
    this.stationCount$ = this.stations$.pipe(map(stations => stations.length));
  }

  ngOnInit(): void {
    // Load initial site's stations if previously selected
    this.store.select(selectSelectedSiteId).pipe(
      takeUntil(this.destroy$)
    ).subscribe(siteId => {
      if (siteId) {
        this.selectedSiteId = siteId;
        this.cdr.markForCheck();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Handles job site selection change.
   * Loads stations for the selected site.
   * Requirement: 7.4
   */
  onSiteSelected(siteId: string): void {
    this.selectedSiteId = siteId;
    this.store.dispatch(QrTimekeepingActions.loadStations({ siteId }));
  }

  /**
   * Opens the station registration dialog.
   * Requirement: 6.1, 6.2, 6.3, 6.4
   */
  openRegistrationDialog(): void {
    const dialogRef = this.dialog.open(StationRegistrationDialogComponent, {
      width: '480px',
      data: { siteId: this.selectedSiteId }
    });

    dialogRef.afterClosed().pipe(
      takeUntil(this.destroy$)
    ).subscribe(result => {
      if (result && result.locationDescription && this.selectedSiteId) {
        this.store.dispatch(QrTimekeepingActions.registerStation({
          request: {
            jobSiteId: this.selectedSiteId,
            locationDescription: result.locationDescription
          }
        }));
      }
    });
  }

  /**
   * Deactivates a station with confirmation.
   * Requirement: 7.1, 7.2
   */
  deactivateStation(station: QrCodeStation): void {
    const dialogRef = this.dialog.open(StationDeactivateConfirmDialogComponent, {
      width: '400px',
      data: { station }
    });

    dialogRef.afterClosed().pipe(
      takeUntil(this.destroy$)
    ).subscribe(confirmed => {
      if (confirmed) {
        this.store.dispatch(QrTimekeepingActions.deactivateStation({ stationId: station.id }));
      }
    });
  }

  /**
   * Navigate to station map view.
   */
  viewStationMap(): void {
    if (this.selectedSiteId) {
      this.router.navigate(['/frm/qr-timekeeping/stations/map', this.selectedSiteId]);
    }
  }

  /**
   * Returns the CSS class for activity status badge.
   * Requirement: 7.3
   */
  getStatusClass(status: string): string {
    switch (status) {
      case 'Active': return 'status-active';
      case 'Low_Activity': return 'status-low-activity';
      case 'Inactive_Flagged': return 'status-inactive';
      default: return '';
    }
  }

  /**
   * Returns display text for activity status.
   */
  getStatusLabel(status: string): string {
    switch (status) {
      case 'Active': return 'Active';
      case 'Low_Activity': return 'Low Activity';
      case 'Inactive_Flagged': return 'Inactive';
      default: return status;
    }
  }
}

// ─── Station Registration Dialog Component ──────────────────────────────────

import { Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

/**
 * Station Registration Dialog
 * Requires locationDescription input (non-empty, max 200 chars).
 * Requirement: 6.1
 */
@Component({
  selector: 'app-station-registration-dialog',
  template: `
    <h2 mat-dialog-title>Register New Station</h2>
    <mat-dialog-content>
      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Location Description</mat-label>
          <input matInput formControlName="locationDescription"
                 placeholder="e.g., Main entrance gate"
                 maxlength="200">
          <mat-hint align="end">{{ form.get('locationDescription')?.value?.length || 0 }}/200</mat-hint>
          <mat-error *ngIf="form.get('locationDescription')?.hasError('required')">
            Location description is required
          </mat-error>
          <mat-error *ngIf="form.get('locationDescription')?.hasError('maxlength')">
            Maximum 200 characters
          </mat-error>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary"
              [disabled]="form.invalid"
              (click)="onSubmit()">
        Register
      </button>
    </mat-dialog-actions>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StationRegistrationDialogComponent {
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<StationRegistrationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { siteId: string }
  ) {
    this.form = this.fb.group({
      locationDescription: ['', [Validators.required, Validators.maxLength(200)]]
    });
  }

  onSubmit(): void {
    if (this.form.valid) {
      this.dialogRef.close({
        locationDescription: this.form.value.locationDescription.trim()
      });
    }
  }
}

// ─── Station Deactivation Confirm Dialog Component ──────────────────────────

/**
 * Confirmation dialog before station deactivation.
 * Requirement: 7.1
 */
@Component({
  selector: 'app-station-deactivate-confirm-dialog',
  template: `
    <h2 mat-dialog-title>Confirm Deactivation</h2>
    <mat-dialog-content>
      <p>Are you sure you want to deactivate station <strong>{{ data.station.stationIdentifier }}</strong>?</p>
      <p class="text-sm text-gray-500">Location: {{ data.station.locationDescription }}</p>
      <p class="text-sm text-red-600 mt-2">This action cannot be undone. Technicians will no longer be able to scan this station.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="warn" [mat-dialog-close]="true">
        Deactivate
      </button>
    </mat-dialog-actions>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StationDeactivateConfirmDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { station: QrCodeStation }
  ) {}
}
