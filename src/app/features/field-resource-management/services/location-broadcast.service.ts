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
  private readonly MIN_DISTANCE_METERS = 30;  // only broadcast if moved >30 m
  private readonly MIN_INTERVAL_MS = 15_000;  // or at least 15 s have passed

  private watchId: number | null = null;
  private active = false;
  private technicianId: string | null = null;
  private lastBroadcast: GeoLocation | null = null;
  private lastBroadcastTime = 0;

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
    // DISABLED: Location broadcasting disabled to reduce API usage
    // With SignalR off, this would fall back to REST PUT every 15s per technician
    console.log('[LocationBroadcast] Disabled to reduce API usage');
    return;
  }

  /** Stop broadcasting and release the GPS watch. */
  stop(): void {
    if (this.watchId !== null) {
      this.geolocationService.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.active = false;
    this.technicianId = null;
    this.lastBroadcast = null;
  }

  private throttledBroadcast(location: GeoLocation): void {
    const now = Date.now();
    const timeSinceLast = now - this.lastBroadcastTime;
    const moved = this.lastBroadcast
      ? this.geolocationService.calculateDistance(this.lastBroadcast, location)
      : Infinity;

    if (timeSinceLast < this.MIN_INTERVAL_MS && moved < this.MIN_DISTANCE_METERS) {
      return; // not enough movement or time — skip this fix
    }

    this.lastBroadcast = location;
    this.lastBroadcastTime = now;
    this.broadcast(location);
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
