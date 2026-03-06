import { Component, OnInit, OnDestroy, Output, EventEmitter, Input, ChangeDetectionStrategy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { GeolocationService, GeolocationError, GeolocationErrorType } from '../../../services/geolocation.service';
import { GeoLocation } from '../../../models/time-entry.model';

/**
 * Location tracking status
 */
export interface LocationTrackingStatus {
  enabled: boolean;
  currentLocation?: GeoLocation;
  lastUpdate?: Date;
  error?: GeolocationError;
}

/**
 * Location Tracking Toggle Component
 * 
 * Provides a toggle control for technicians to enable/disable location tracking
 * with proper visual feedback and accessibility support.
 * 
 * Features:
 * - Toggle switch for enabling/disabling location tracking
 * - Visual status indicators (enabled/disabled/error)
 * - Real-time location updates when enabled
 * - Error handling with user-friendly messages
 * - Keyboard accessible (space/enter to toggle)
 * - ARIA labels for screen readers
 * - Mobile-friendly design
 * 
 * @example
 * <frm-location-tracking-toggle
 *   [autoStart]="false"
 *   (trackingStatusChange)="onTrackingStatusChange($event)"
 *   (locationUpdate)="onLocationUpdate($event)">
 * </frm-location-tracking-toggle>
 */
@Component({
  selector: 'frm-location-tracking-toggle',
  templateUrl: './location-tracking-toggle.component.html',
  styleUrls: ['./location-tracking-toggle.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LocationTrackingToggleComponent implements OnInit, OnDestroy {
  /**
   * Whether to automatically start tracking on component init
   */
  @Input() autoStart = false;

  /**
   * Update interval in milliseconds (default: 30 seconds)
   */
  @Input() updateInterval = 30000;

  /**
   * Whether to use high accuracy GPS (default: true)
   */
  @Input() highAccuracy = true;

  /**
   * Emits when tracking status changes
   */
  @Output() trackingStatusChange = new EventEmitter<LocationTrackingStatus>();

  /**
   * Emits when a new location is obtained
   */
  @Output() locationUpdate = new EventEmitter<GeoLocation>();

  /**
   * Emits when an error occurs
   */
  @Output() trackingError = new EventEmitter<GeolocationError>();

  /**
   * Current tracking status
   */
  status: LocationTrackingStatus = {
    enabled: false
  };

  /**
   * Watch ID for geolocation tracking
   */
  private watchId: number | null = null;

  /**
   * Interval ID for periodic updates
   */
  private updateIntervalId: any = null;

  /**
   * Subject for component destruction
   */
  private destroy$ = new Subject<void>();

  /**
   * Whether geolocation is supported by the browser
   */
  isGeolocationSupported = false;

  /**
   * Permission state for geolocation
   */
  permissionState: PermissionState = 'prompt';

  constructor(private geolocationService: GeolocationService) {}

  ngOnInit(): void {
    // Check if geolocation is supported
    this.isGeolocationSupported = this.geolocationService.isGeolocationSupported();

    if (!this.isGeolocationSupported) {
      this.handleError({
        type: GeolocationErrorType.NotSupported,
        message: 'Location tracking is not supported by your browser. Please use a modern browser.'
      });
      return;
    }

    // Check permission state
    this.checkPermissionState();

    // Auto-start if configured
    if (this.autoStart) {
      this.startTracking();
    }
  }

  ngOnDestroy(): void {
    // Stop tracking and clean up
    this.stopTracking();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Check the current permission state for geolocation
   */
  private checkPermissionState(): void {
    this.geolocationService.requestPermission()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (state) => {
          this.permissionState = state;
          
          // If permission is already denied, show error
          if (state === 'denied') {
            this.handleError({
              type: GeolocationErrorType.PermissionDenied,
              message: 'Location permission has been blocked. Please enable location access in your browser settings to use this feature.'
            });
          }
        },
        error: (error) => {
          // If permission check fails, assume prompt state
          this.permissionState = 'prompt';
        }
      });
  }

  /**
   * Toggle tracking on/off
   */
  toggleTracking(): void {
    if (this.status.enabled) {
      this.stopTracking();
    } else {
      this.startTracking();
    }
  }

  /**
   * Start location tracking
   */
  startTracking(): void {
    if (!this.isGeolocationSupported) {
      this.handleError({
        type: GeolocationErrorType.NotSupported,
        message: 'Location tracking is not supported by your browser.'
      });
      return;
    }

    if (this.status.enabled) {
      return; // Already tracking
    }

    // Check permission state before requesting location
    this.geolocationService.requestPermission()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (state) => {
          this.permissionState = state;
          
          // Handle different permission states
          if (state === 'denied') {
            this.handleError({
              type: GeolocationErrorType.PermissionDenied,
              message: 'Location permission has been blocked. Please enable location access in your browser settings to use this feature.'
            });
            return;
          }
          
          // Permission is granted or prompt - proceed with getting location
          this.requestLocationAndStartTracking();
        },
        error: (error) => {
          // If permission check fails, try to get location anyway
          // (browser will prompt for permission)
          this.requestLocationAndStartTracking();
        }
      });
  }

  /**
   * Request location and start tracking
   * @private
   */
  private requestLocationAndStartTracking(): void {
    // Get initial position
    this.geolocationService.getCurrentPositionWithFallback()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (location) => {
          // Update permission state to granted after successful location retrieval
          this.permissionState = 'granted';
          
          this.handleLocationUpdate(location);
          
          // Start periodic updates
          this.startPeriodicUpdates();
          
          // Update status
          this.status = {
            enabled: true,
            currentLocation: location,
            lastUpdate: new Date(),
            error: undefined
          };
          
          this.emitStatusChange();
        },
        error: (error: GeolocationError) => {
          // Update permission state if error is permission denied
          if (error.type === GeolocationErrorType.PermissionDenied) {
            this.permissionState = 'denied';
          }
          
          this.handleError(error);
        }
      });
  }

  /**
   * Stop location tracking
   */
  stopTracking(): void {
    // Clear watch if active
    if (this.watchId !== null) {
      this.geolocationService.clearWatch(this.watchId);
      this.watchId = null;
    }

    // Clear interval if active
    if (this.updateIntervalId !== null) {
      clearInterval(this.updateIntervalId);
      this.updateIntervalId = null;
    }

    // Update status
    this.status = {
      enabled: false,
      currentLocation: this.status.currentLocation,
      lastUpdate: this.status.lastUpdate,
      error: undefined
    };

    this.emitStatusChange();
  }

  /**
   * Start periodic location updates
   */
  private startPeriodicUpdates(): void {
    // Clear any existing interval
    if (this.updateIntervalId !== null) {
      clearInterval(this.updateIntervalId);
    }

    // Set up periodic updates
    this.updateIntervalId = setInterval(() => {
      if (this.status.enabled) {
        this.updateLocation();
      }
    }, this.updateInterval);
  }

  /**
   * Update location manually
   */
  private updateLocation(): void {
    this.geolocationService.getCurrentPositionWithFallback()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (location) => {
          this.handleLocationUpdate(location);
        },
        error: (error: GeolocationError) => {
          this.handleError(error);
        }
      });
  }

  /**
   * Handle location update
   */
  private handleLocationUpdate(location: GeoLocation): void {
    this.status = {
      ...this.status,
      currentLocation: location,
      lastUpdate: new Date(),
      error: undefined
    };

    this.locationUpdate.emit(location);
    this.emitStatusChange();
  }

  /**
   * Handle geolocation error
   */
  private handleError(error: GeolocationError): void {
    this.status = {
      ...this.status,
      enabled: false,
      error
    };

    this.trackingError.emit(error);
    this.emitStatusChange();

    // Stop tracking on error
    this.stopTracking();
  }

  /**
   * Emit status change event
   */
  private emitStatusChange(): void {
    this.trackingStatusChange.emit({ ...this.status });
  }

  /**
   * Get status icon based on current state
   */
  get statusIcon(): string {
    if (this.status.error) {
      return 'error';
    }
    return this.status.enabled ? 'location_on' : 'location_off';
  }

  /**
   * Get status text based on current state
   */
  get statusText(): string {
    if (this.status.error) {
      return 'Location Error';
    }
    return this.status.enabled ? 'Tracking Enabled' : 'Tracking Disabled';
  }

  /**
   * Get status color based on current state
   */
  get statusColor(): 'primary' | 'accent' | 'warn' {
    if (this.status.error) {
      return 'warn';
    }
    return this.status.enabled ? 'primary' : 'accent';
  }

  /**
   * Get error message for display
   */
  get errorMessage(): string | undefined {
    return this.status.error?.message;
  }

  /**
   * Format last update time
   */
  get lastUpdateText(): string {
    if (!this.status.lastUpdate) {
      return 'Never';
    }

    const now = new Date();
    const diff = now.getTime() - this.status.lastUpdate.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);

    if (seconds < 60) {
      return 'Just now';
    } else if (minutes < 60) {
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    } else {
      return this.status.lastUpdate.toLocaleTimeString();
    }
  }

  /**
   * Format current location for display
   */
  get locationText(): string {
    if (!this.status.currentLocation) {
      return 'No location';
    }

    return this.geolocationService.formatLocation(this.status.currentLocation);
  }

  /**
   * Get accuracy text
   */
  get accuracyText(): string {
    if (!this.status.currentLocation?.accuracy) {
      return 'Unknown';
    }

    const accuracy = Math.round(this.status.currentLocation.accuracy);
    return `±${accuracy}m`;
  }

  /**
   * Get permission status text for display
   */
  get permissionStatusText(): string {
    switch (this.permissionState) {
      case 'granted':
        return 'Location access granted';
      case 'denied':
        return 'Location access blocked';
      case 'prompt':
        return 'Location access not yet requested';
      default:
        return 'Unknown permission status';
    }
  }

  /**
   * Check if permission is blocked
   */
  get isPermissionBlocked(): boolean {
    return this.permissionState === 'denied';
  }

  /**
   * Check if permission needs to be requested
   */
  get needsPermissionRequest(): boolean {
    return this.permissionState === 'prompt';
  }

  /**
   * Get user-friendly error message with actionable guidance
   */
  get userFriendlyErrorMessage(): string | undefined {
    if (!this.status.error) {
      return undefined;
    }

    switch (this.status.error.type) {
      case GeolocationErrorType.PermissionDenied:
        return 'Location access is blocked. To enable tracking:\n' +
               '1. Click the location icon in your browser\'s address bar\n' +
               '2. Select "Allow" for location access\n' +
               '3. Refresh the page and try again';
      
      case GeolocationErrorType.PositionUnavailable:
        return 'Unable to determine your location. Please check that:\n' +
               '1. Location services are enabled on your device\n' +
               '2. You have a stable internet connection\n' +
               '3. You are not using a VPN that blocks location services';
      
      case GeolocationErrorType.Timeout:
        return 'Location request timed out. This may happen if:\n' +
               '1. Your GPS signal is weak\n' +
               '2. Location services are slow to respond\n' +
               'Please try again or move to an area with better signal.';
      
      case GeolocationErrorType.NotSupported:
        return 'Your browser does not support location tracking. Please:\n' +
               '1. Update to the latest version of your browser\n' +
               '2. Use a modern browser (Chrome, Firefox, Safari, Edge)\n' +
               '3. Contact support if the issue persists';
      
      default:
        return this.status.error.message;
    }
  }
}
