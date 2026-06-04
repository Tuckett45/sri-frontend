import { Injectable, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { GeolocationService } from './geolocation.service';
import { GeoLocation } from '../models/time-entry.model';
import { Job } from '../models/job.model';

export interface GeofenceEvent {
  job: Job;
  location: GeoLocation;
  distanceMeters: number;
}

/**
 * Monitors the technician's live GPS position against an assigned job's site coordinates.
 * Emits geofenceEntered$ when they cross into the 1-mile radius and geofenceExited$ when
 * they leave — enabling the auto clock-in/out prompt in the clock-in widget.
 */
@Injectable({ providedIn: 'root' })
export class GeofencingService implements OnDestroy {
  private readonly GEOFENCE_RADIUS_METERS = 1609.34; // 1 mile

  private watchId: number | null = null;
  private monitoredJob: Job | null = null;
  private insideGeofence = false;

  private readonly enteredSubject = new Subject<GeofenceEvent>();
  private readonly exitedSubject = new Subject<GeofenceEvent>();

  readonly geofenceEntered$ = this.enteredSubject.asObservable();
  readonly geofenceExited$ = this.exitedSubject.asObservable();

  constructor(private geolocationService: GeolocationService) {}

  ngOnDestroy(): void {
    this.stopMonitoring();
  }

  /**
   * Begin watching the technician's position relative to a job site.
   * Calling this while already monitoring replaces the previous job.
   */
  monitorJob(job: Job): void {
    this.stopMonitoring();

    if (!job.siteAddress?.latitude || !job.siteAddress?.longitude) {
      return; // No coordinates — geofencing not possible for this job
    }

    this.monitoredJob = job;
    this.insideGeofence = false;

    this.watchId = this.geolocationService.watchPosition(
      (location) => this.evaluatePosition(location),
      (error) => console.warn('[GeofencingService] Position error:', error),
      true
    );
  }

  /** Stop monitoring and clean up the GPS watch. */
  stopMonitoring(): void {
    if (this.watchId !== null) {
      this.geolocationService.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.monitoredJob = null;
    this.insideGeofence = false;
  }

  isMonitoring(): boolean {
    return this.watchId !== null;
  }

  private evaluatePosition(location: GeoLocation): void {
    if (!this.monitoredJob?.siteAddress) return;

    const site: GeoLocation = {
      latitude: this.monitoredJob.siteAddress.latitude!,
      longitude: this.monitoredJob.siteAddress.longitude!,
      accuracy: 0
    };

    const distance = this.geolocationService.calculateDistance(location, site);
    const isInside = distance <= this.GEOFENCE_RADIUS_METERS;

    const event: GeofenceEvent = { job: this.monitoredJob, location, distanceMeters: distance };

    if (isInside && !this.insideGeofence) {
      this.insideGeofence = true;
      this.enteredSubject.next(event);
    } else if (!isInside && this.insideGeofence) {
      this.insideGeofence = false;
      this.exitedSubject.next(event);
    }
  }
}
