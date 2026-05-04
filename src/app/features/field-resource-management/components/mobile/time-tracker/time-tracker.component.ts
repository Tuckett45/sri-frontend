import { Component, Input, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import * as L from 'leaflet';
import { Job, JobStatus } from '../../../models/job.model';
import { TimeEntry, GeoLocation } from '../../../models/time-entry.model';
import { clockIn, clockOut, updateTimeEntry } from '../../../state/time-entries/time-entry.actions';
import { updateJobStatus } from '../../../state/jobs/job.actions';
import { selectActiveTimeEntry, selectLastCompletedTimeEntry } from '../../../state/time-entries/time-entry.selectors';
import { GeolocationService, GeolocationError, GeolocationErrorType } from '../../../services/geolocation.service';
import { AuthService } from '../../../../../services/auth.service';
import { FrmPermissionService } from '../../../services/frm-permission.service';

// Fix Leaflet default icon paths broken by webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'assets/images/marker-icon-2x.png',
  iconUrl: 'assets/images/marker-icon.png',
  shadowUrl: 'assets/images/marker-shadow.png',
});

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
  @ViewChild('routeMapContainer') mapContainerRef!: ElementRef;

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
  showClockOutReasons = false;
  showRouteMap = false;
  manualMileage: number | null = null;
  canEditMileage = false;

  // Map
  private routeMap: L.Map | null = null;
  mapLoading = false;
  mapError: string | null = null;

  // Expose enum for template
  LocationStatus = LocationStatus;

  constructor(
    private store: Store,
    private geolocationService: GeolocationService,
    private authService: AuthService,
    private frmPermissionService: FrmPermissionService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.canEditMileage = this.frmPermissionService.hasPermission(
      this.authService.getUserRole(), 'canEditMileage'
    );
    this.subscribeToActiveTimeEntry();
    this.startElapsedTimeTimer();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.destroyRouteMap();
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
        this.cdr.markForCheck();
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
      // Capture the user's current GPS location
      const location = await this.captureLocation();
      this.currentLocation = location;
      this.locationStatus = LocationStatus.Success;

      // Get current technician ID from auth
      const technicianId = this.authService.getUser()?.id || '';

      // Dispatch clock in action with location
      this.store.dispatch(clockIn({
        jobId: this.job.id,
        technicianId,
        location
      }));

      // Determine job status based on distance to job site
      this.updateJobStatusByProximity(location);

    } catch (error) {
      this.handleLocationError(error as GeolocationError);
      
      // Still allow clock in without location — default to EnRoute
      const technicianId = this.authService.getUser()?.id || '';
      this.store.dispatch(clockIn({
        jobId: this.job.id,
        technicianId
      }));

      // Without location, assume not on site
      this.store.dispatch(updateJobStatus({
        id: this.job.id,
        status: JobStatus.EnRoute
      }));
    }
  }

  /**
   * Handle clock out
   */
  async onClockOut(reason?: 'end_of_day' | 'break' | 'lunch' | 'other'): Promise<void> {
    if (!this.activeTimeEntry) {
      return;
    }

    this.showClockOutReasons = false;
    this.locationStatus = LocationStatus.Pending;
    this.locationError = null;

    try {
      // Attempt to get current location for clock out
      const location = await this.captureLocation();
      this.locationStatus = LocationStatus.Success;

      this.store.dispatch(clockOut({
        timeEntryId: this.activeTimeEntry.id,
        location,
        reason
      }));

    } catch (error) {
      this.handleLocationError(error as GeolocationError);
      
      // Still allow clock out without location
      this.store.dispatch(clockOut({
        timeEntryId: this.activeTimeEntry.id,
        reason
      }));
    }
  }

  /**
   * Toggle clock out reason selection
   */
  toggleClockOutReasons(): void {
    this.showClockOutReasons = !this.showClockOutReasons;
  }

  /**
   * Clock out with a specific reason
   */
  clockOutWithReason(reason: 'end_of_day' | 'break' | 'lunch' | 'other'): void {
    this.onClockOut(reason);
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
   * Toggle route map visibility
   */
  toggleRouteMap(): void {
    this.showRouteMap = !this.showRouteMap;
    if (this.showRouteMap) {
      this.initRouteMap();
    } else {
      this.destroyRouteMap();
    }
  }

  /**
   * Get Google Maps directions URL
   */
  getDirectionsUrl(): string {
    const addr = this.job.siteAddress;
    if (addr?.latitude != null && addr?.longitude != null) {
      return `https://www.google.com/maps/dir/?api=1&destination=${addr.latitude},${addr.longitude}`;
    }
    const dest = encodeURIComponent(`${addr.street}, ${addr.city}, ${addr.state} ${addr.zipCode}`);
    return `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
  }

  /**
   * Initialize the Leaflet route map
   */
  private initRouteMap(): void {
    this.mapLoading = true;
    this.mapError = null;

    // Get user location first, then render map
    this.geolocationService.getCurrentPositionWithFallback().subscribe({
      next: (userLocation) => {
        this.mapLoading = false;
        // Small delay to let the DOM render the container
        setTimeout(() => this.renderMap(userLocation), 50);
      },
      error: () => {
        this.mapLoading = false;
        // Still show map centered on job site if user location unavailable
        this.mapError = 'Could not get your location. Showing job site only.';
        setTimeout(() => this.renderMap(null), 50);
      }
    });
  }

  /**
   * Render the Leaflet map with markers and route line
   */
  private renderMap(userLocation: GeoLocation | null): void {
    if (!this.mapContainerRef) return;

    const jobAddr = this.job.siteAddress;
    const jobLat = jobAddr?.latitude;
    const jobLng = jobAddr?.longitude;

    if (jobLat == null || jobLng == null) {
      this.mapError = 'Job site coordinates are not available.';
      return;
    }

    // Destroy previous map if any
    this.destroyRouteMap();

    this.routeMap = L.map(this.mapContainerRef.nativeElement, {
      zoomControl: true,
      attributionControl: true
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(this.routeMap);

    const jobIcon = L.icon({
      iconUrl: 'assets/images/marker-icon.png',
      iconRetinaUrl: 'assets/images/marker-icon-2x.png',
      shadowUrl: 'assets/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34]
    });

    // Job site marker
    const jobMarker = L.marker([jobLat, jobLng], { icon: jobIcon })
      .addTo(this.routeMap)
      .bindPopup(`<b>${this.job.siteName}</b><br>${jobAddr.street}<br>${jobAddr.city}, ${jobAddr.state}`);

    if (userLocation) {
      const userIcon = L.divIcon({
        html: '<div style="background:#1976d2;width:14px;height:14px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 6px rgba(0,0,0,0.3);"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        className: ''
      });

      const userMarker = L.marker([userLocation.latitude, userLocation.longitude], { icon: userIcon })
        .addTo(this.routeMap)
        .bindPopup('Your location');

      // Draw a dashed line between user and job site
      L.polyline(
        [[userLocation.latitude, userLocation.longitude], [jobLat, jobLng]],
        { color: '#1976d2', weight: 3, dashArray: '8, 8', opacity: 0.7 }
      ).addTo(this.routeMap);

      // Fit bounds to show both markers
      const bounds = L.latLngBounds(
        [userLocation.latitude, userLocation.longitude],
        [jobLat, jobLng]
      );
      this.routeMap.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    } else {
      this.routeMap.setView([jobLat, jobLng], 14);
    }

    jobMarker.openPopup();

    // Leaflet needs a size recalc after CSS settles
    setTimeout(() => this.routeMap?.invalidateSize(), 200);
  }

  /**
   * Destroy the route map instance
   */
  private destroyRouteMap(): void {
    if (this.routeMap) {
      this.routeMap.remove();
      this.routeMap = null;
    }
  }

  /**
   * Determine and dispatch the correct job status based on proximity to the job site.
   * ≤ 1 mile → OnSite, > 1 mile → EnRoute
   */
  private updateJobStatusByProximity(userLocation: GeoLocation): void {
    const distance = this.getDistanceToJobSite(userLocation);

    if (distance !== null && distance <= 1) {
      this.store.dispatch(updateJobStatus({
        id: this.job.id,
        status: JobStatus.OnSite
      }));
    } else {
      this.store.dispatch(updateJobStatus({
        id: this.job.id,
        status: JobStatus.EnRoute
      }));
    }
  }

  /**
   * Calculate the distance in miles between a location and the job site.
   * Returns null if the job site has no coordinates.
   */
  private getDistanceToJobSite(userLocation: GeoLocation): number | null {
    const jobLat = this.job.siteAddress?.latitude;
    const jobLng = this.job.siteAddress?.longitude;

    if (jobLat == null || jobLng == null) {
      return null;
    }

    return this.haversineDistanceMiles(
      userLocation.latitude, userLocation.longitude,
      jobLat, jobLng
    );
  }

  /**
   * Haversine formula — returns distance between two lat/lng points in miles.
   */
  private haversineDistanceMiles(
    lat1: number, lon1: number,
    lat2: number, lon2: number
  ): number {
    const R = 3958.8; // Earth radius in miles
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
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
   * Get formatted location — shows the user's captured coordinates and
   * the distance to the job site when available.
   */
  get formattedLocation(): string {
    if (!this.currentLocation) {
      return 'N/A';
    }

    const coords = this.geolocationService.formatLocation(this.currentLocation);
    const distance = this.getDistanceToJobSite(this.currentLocation);

    if (distance !== null) {
      return `${coords} (${distance.toFixed(1)} mi from site)`;
    }

    return coords;
  }
}
