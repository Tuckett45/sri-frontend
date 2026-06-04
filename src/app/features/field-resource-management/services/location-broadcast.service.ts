import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { GeolocationService } from './geolocation.service';
import { FrmSignalRService } from './frm-signalr.service';
import { GeoLocation } from '../models/time-entry.model';
import { environment } from '../../../../environments/environments';

/**
 * Continuously broadcasts the technician's GPS position to all connected dispatchers/admins.
 *
 * Strategy:
 *   1. Primary — send via SignalR hub (sub-second latency, server fans out to map clients).
 *   2. Fallback — if SignalR is disconnected, send via REST PUT /technicians/{id}/location
 *      so the DB record stays fresh for the next full-page load.
 *
 * Call start(technicianId) on clock-in and stop() on clock-out.
 */
@Injectable({ providedIn: 'root' })
export class LocationBroadcastService implements OnDestroy {
  private watchId: number | null = null;
  private active = false;
  private technicianId: string | null = null;

  constructor(
    private geolocationService: GeolocationService,
    private signalR: FrmSignalRService,
    private http: HttpClient
  ) {}

  ngOnDestroy(): void {
    this.stop();
  }

  /** Start broadcasting location updates. Safe to call multiple times — idempotent. */
  start(technicianId: string): void {
    if (this.active) return;
    this.active = true;
    this.technicianId = technicianId;

    this.watchId = this.geolocationService.watchPosition(
      (location) => this.broadcast(location),
      (error) => console.warn('[LocationBroadcast] GPS error:', error),
      true
    );
  }

  /** Stop broadcasting and release the GPS watch. */
  stop(): void {
    if (this.watchId !== null) {
      this.geolocationService.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.active = false;
    this.technicianId = null;
  }

  private broadcast(location: GeoLocation): void {
    if (!this.technicianId) return;

    if (this.signalR.isConnected()) {
      this.signalR.sendLocationUpdate(this.technicianId, location)
        .catch(() => this.sendRestFallback(location));
    } else {
      this.sendRestFallback(location);
    }
  }

  private sendRestFallback(location: GeoLocation): void {
    if (!this.technicianId) return;
    this.http.put(
      `${environment.atlasApiUrl}/technicians/${this.technicianId}/location`,
      { latitude: location.latitude, longitude: location.longitude, accuracy: location.accuracy }
    ).subscribe({ error: (e) => console.warn('[LocationBroadcast] REST fallback failed:', e) });
  }
}
