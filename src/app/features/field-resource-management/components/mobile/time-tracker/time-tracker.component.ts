import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Job } from '../../../models/job.model';
import { TimeEntry, GeoLocation } from '../../../models/time-entry.model';
import { clockIn, clockOut, updateTimeEntry } from '../../../state/time-entries/time-entry.actions';
import { selectActiveTimeEntry } from '../../../state/time-entries/time-entry.selectors';
import { GeolocationService, GeolocationError, GeolocationErrorType } from '../../../services/geolocation.service';

/**
 * Location capture status
 */
enum LocationStatus {
  Idle = 'idle',
  Pending = 'pending',
  Success = 'success',
  Failed = 'failed'
}

/**
 * Time Tracker Component
 * 
 * Mobile component for tracking time on jobs with automatic geolocation capture.
 * 
 * Features:
 * - Display active job information
 * - Timer with elapsed time (updates every second)
 * - Large clock in/out button
 * - Automatic geolocation capture on clock in/out
 * - Display calculated mileage
 * - Location capture status indicator
 * - User-friendly error messages for location permission errors
 * - Manual time adjustment (admin override only)
 * - Manual mileage entry (if location unavailable)
 * 
 * Requirements: 7.1-7.7, 8.1-8.6
 */
@Component({
  selector: 'frm-time-tracker',
  templateUrl: './time-tracker.component.html',
  styleUrls: ['./time-tracker.component.scss']
})
export class TimeTrackerComponent implements OnInit, OnDestroy {
  @Input() job!: Job;
  @Input() isAdmin = false; // For admin override features

  private destroy$ = new Subject<void>();
  
  activeTimeEntry: TimeEntry | null = null;
  isClockedIn = false;
  elapsedTime = '';
  
  locationStatus = LocationStatus.Idle;
  locationError: string | null = null;
  currentLocation: GeoLocation | null = null;
  calculatedMileage: number | null = null;

  showManualTimeAdjustment = false;
  showManualMileageEntry = false;
  manualMileage: number | null = null;

  // Expose enum for template
  LocationStatus = LocationStatus;

  constructor(
    private store: Store,
    private geolocationService: GeolocationService
  ) {}

  ngOnInit(): void {
    this.subscribeToActiveTimeEntry();
    this.startElapsedTimeTimer();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Subscribe to active time entry
   */
  private subscribeToActiveTimeEntry(): void {
    this.store.select(selectActiveTimeEntry).pipe(
      takeUntil(this.destroy$)
    ).subscribe(entry => {
      this.activeTimeEntry = entry;
      this.isClockedIn = entry?.jobId === this.job.id && !entry.clockOutTime;
      
      if (entry && entry.jobId === this.job.id) {
        this.calculatedMileage = entry.mileage || null;
      }
    });
  }

  /**
   * Start timer to update elapsed time
   */
  private startElapsedTimeTimer(): void {
    interval(1000).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      if (this.isClockedIn && this.activeTimeEntry) {
        this.updateElapsedTime();
      }
    });
  }

  /**
   * Update elapsed time display
   */
  private updateElapsedTime(): void {
    if (!this.activeTimeEntry?.clockInTime) {
      this.elapsedTime = '00:00:00';
      return;
    }

    const clockInTime = new Date(this.activeTimeEntry.clockInTime).getTime();
    const now = Date.now();
    const elapsed = now - clockInTime;

    const hours = Math.floor(elapsed / (1000 * 60 * 60));
    const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);

    this.elapsedTime = `${this.pad(hours)}:${this.pad(minutes)}:${this.pad(seconds)}`;
  }

  /**
   * Pad number with leading zero
   */
  private pad(num: number): string {
    return num.toString().padStart(2, '0');
  }

  /**
   * Handle clock in
   */
  async onClockIn(): Promise<void> {
    this.locationStatus = LocationStatus.Pending;
    this.locationError = null;

    try {
      // Attempt to get current location
      const location = await this.captureLocation();
      this.currentLocation = location;
      this.locationStatus = LocationStatus.Success;

      // Get current technician ID from auth (mock for now)
      const technicianId = 'current-technician-id';

      // Dispatch clock in action with location
      this.store.dispatch(clockIn({
        jobId: this.job.id,
        technicianId,
        location
      }));

    } catch (error) {
      this.handleLocationError(error as GeolocationError);
      
      // Still allow clock in without location
      const technicianId = 'current-technician-id';
      this.store.dispatch(clockIn({
        jobId: this.job.id,
        technicianId
      }));
    }
  }

  /**
   * Handle clock out
   */
  async onClockOut(): Promise<void> {
    if (!this.activeTimeEntry) {
      return;
    }

    this.locationStatus = LocationStatus.Pending;
    this.locationError = null;

    try {
      // Attempt to get current location
      const location = await this.captureLocation();
      this.locationStatus = LocationStatus.Success;

      // Calculate mileage if we have both locations
      if (this.activeTimeEntry.clockInLocation && location) {
        const distanceMeters = this.geolocationService.calculateDistance(
          this.activeTimeEntry.clockInLocation,
          location
        );
        this.calculatedMileage = this.metersToMiles(distanceMeters);
      }

      // Dispatch clock out action with location
      this.store.dispatch(clockOut({
        timeEntryId: this.activeTimeEntry.id,
        location
      }));

    } catch (error) {
      this.handleLocationError(error as GeolocationError);
      
      // Still allow clock out without location
      this.store.dispatch(clockOut({
        timeEntryId: this.activeTimeEntry.id
      }));
    }
  }

  /**
   * Capture current location
   */
  private captureLocation(): Promise<GeoLocation> {
    return new Promise((resolve, reject) => {
      this.geolocationService.getCurrentPositionWithFallback().subscribe({
        next: (location) => resolve(location),
        error: (error) => reject(error)
      });
    });
  }

  /**
   * Handle location error
   */
  private handleLocationError(error: GeolocationError): void {
    this.locationStatus = LocationStatus.Failed;
    this.locationError = error.message;

    // Show manual mileage entry option
    if (error.type === GeolocationErrorType.PermissionDenied ||
        error.type === GeolocationErrorType.PositionUnavailable) {
      this.showManualMileageEntry = true;
    }
  }

  /**
   * Convert meters to miles
   */
  private metersToMiles(meters: number): number {
    return meters * 0.000621371;
  }

  /**
   * Handle manual time adjustment (admin only)
   */
  onManualTimeAdjustment(): void {
    if (!this.isAdmin || !this.activeTimeEntry) {
      return;
    }
    this.showManualTimeAdjustment = true;
  }

  /**
   * Save manual time adjustment
   */
  saveManualTimeAdjustment(clockInTime: Date, clockOutTime?: Date): void {
    if (!this.activeTimeEntry) {
      return;
    }

    this.store.dispatch(updateTimeEntry({
      id: this.activeTimeEntry.id,
      timeEntry: {
        clockInTime,
        clockOutTime,
        isManuallyAdjusted: true,
        adjustedBy: 'current-user-id',
        adjustmentReason: 'Manual adjustment by admin'
      }
    }));

    this.showManualTimeAdjustment = false;
  }

  /**
   * Handle manual mileage entry
   */
  onManualMileageEntry(): void {
    this.showManualMileageEntry = true;
  }

  /**
   * Save manual mileage
   */
  saveManualMileage(): void {
    if (!this.activeTimeEntry || this.manualMileage === null) {
      return;
    }

    this.store.dispatch(updateTimeEntry({
      id: this.activeTimeEntry.id,
      timeEntry: {
        mileage: this.manualMileage
      }
    }));

    this.calculatedMileage = this.manualMileage;
    this.showManualMileageEntry = false;
    this.manualMileage = null;
  }

  /**
   * Cancel manual mileage entry
   */
  cancelManualMileage(): void {
    this.showManualMileageEntry = false;
    this.manualMileage = null;
  }

  /**
   * Retry location capture
   */
  retryLocationCapture(): void {
    this.locationError = null;
    this.locationStatus = LocationStatus.Pending;

    this.geolocationService.getCurrentPositionWithFallback().subscribe({
      next: (location) => {
        this.currentLocation = location;
        this.locationStatus = LocationStatus.Success;
        this.locationError = null;
      },
      error: (error: GeolocationError) => {
        this.handleLocationError(error);
      }
    });
  }

  /**
   * Get location status icon
   */
  get locationStatusIcon(): string {
    switch (this.locationStatus) {
      case LocationStatus.Pending:
        return 'location_searching';
      case LocationStatus.Success:
        return 'location_on';
      case LocationStatus.Failed:
        return 'location_off';
      default:
        return 'location_disabled';
    }
  }

  /**
   * Get location status color
   */
  get locationStatusColor(): string {
    switch (this.locationStatus) {
      case LocationStatus.Pending:
        return 'accent';
      case LocationStatus.Success:
        return 'primary';
      case LocationStatus.Failed:
        return 'warn';
      default:
        return '';
    }
  }

  /**
   * Get location status message
   */
  get locationStatusMessage(): string {
    switch (this.locationStatus) {
      case LocationStatus.Pending:
        return 'Capturing location...';
      case LocationStatus.Success:
        return 'Location captured';
      case LocationStatus.Failed:
        return this.locationError || 'Location capture failed';
      default:
        return 'Location not captured';
    }
  }

  /**
   * Get formatted mileage
   */
  get formattedMileage(): string {
    if (this.calculatedMileage === null) {
      return 'N/A';
    }
    return `${this.calculatedMileage.toFixed(2)} mi`;
  }

  /**
   * Get formatted location
   */
  get formattedLocation(): string {
    if (!this.currentLocation) {
      return 'N/A';
    }
    return this.geolocationService.formatLocation(this.currentLocation);
  }
}
