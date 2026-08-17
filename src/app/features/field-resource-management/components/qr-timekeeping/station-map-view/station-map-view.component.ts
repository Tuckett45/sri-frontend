import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';
import { Store } from '@ngrx/store';
import { ActivatedRoute } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import * as L from 'leaflet';

import { StationMapData, StationMapEntry } from '../../../models/qr-timekeeping.model';
import * as QrTimekeepingActions from '../../../state/qr-timekeeping/qr-timekeeping.actions';
import {
  selectStationMap,
  selectStationsLoading
} from '../../../state/qr-timekeeping/qr-timekeeping.selectors';

/**
 * Station Map View Component
 *
 * Leaflet-based map showing station locations and activity status for a job site.
 * Markers are color-coded by activity status:
 *   - Green: Active
 *   - Yellow: Low_Activity
 *   - Red: Inactive_Flagged
 *
 * Requirements: 8.1, 8.2, 8.3
 */
@Component({
  selector: 'app-station-map-view',
  templateUrl: './station-map-view.component.html',
  styleUrls: ['./station-map-view.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StationMapViewComponent implements OnInit, OnDestroy {
  // ─── Observables ──────────────────────────────────────────────────────────
  stationMap$: Observable<StationMapData | null>;
  loading$: Observable<boolean>;

  // ─── Map State ────────────────────────────────────────────────────────────
  private map: L.Map | null = null;
  private markers: L.Marker[] = [];
  jobId: string = '';
  jobName: string = '';

  // Leaflet configuration for ngx-leaflet
  mapOptions: L.MapOptions = {
    zoom: 15,
    center: L.latLng(33.4484, -112.0740), // Default center (Phoenix, AZ)
    layers: [
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      })
    ]
  };

  private destroy$ = new Subject<void>();

  constructor(
    private store: Store,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {
    this.stationMap$ = this.store.select(selectStationMap);
    this.loading$ = this.store.select(selectStationsLoading);
  }

  ngOnInit(): void {
    // Get jobId from route params
    this.route.params.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      this.jobId = params['jobId'];
      if (this.jobId) {
        this.store.dispatch(QrTimekeepingActions.loadStationMap({ jobId: this.jobId }));
      }
    });

    // Subscribe to station map data
    this.stationMap$.pipe(
      takeUntil(this.destroy$),
      filter((data): data is StationMapData => data !== null)
    ).subscribe(data => {
      this.jobName = data.jobName;
      if (this.map && data.stations.length > 0) {
        this.updateMarkers(data.stations);
      }
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.cleanupMap();
  }

  /**
   * Callback when leaflet map is ready.
   */
  onMapReady(map: L.Map): void {
    this.map = map;

    // Invalidate size after a short delay to fix rendering in tabs/dialogs
    setTimeout(() => {
      this.map?.invalidateSize();
    }, 100);
  }

  /**
   * Updates markers on the map based on station data.
   * Requirement: 8.1, 8.2
   */
  updateMarkers(stations: StationMapEntry[]): void {
    // Clear existing markers
    this.clearMarkers();

    if (!this.map) return;

    const bounds: L.LatLngBounds = L.latLngBounds([]);

    stations.forEach(station => {
      // Use a default position offset for demo purposes when no real coords exist
      // In production, stations would have real GPS coordinates
      const lat = 33.4484 + (Math.random() - 0.5) * 0.01;
      const lng = -112.0740 + (Math.random() - 0.5) * 0.01;
      const position = L.latLng(lat, lng);

      const marker = L.marker(position, {
        icon: this.getMarkerIcon(station.activityStatus)
      });

      // Bind popup with station details
      marker.bindPopup(this.buildPopupContent(station));

      marker.addTo(this.map!);
      this.markers.push(marker);
      bounds.extend(position);
    });

    // Fit map to bounds if we have markers
    if (this.markers.length > 0 && bounds.isValid()) {
      this.map.fitBounds(bounds, { padding: [50, 50] });
    }
  }

  /**
   * Returns a color-coded marker icon based on activity status.
   * Requirement: 8.2
   */
  private getMarkerIcon(activityStatus: string): L.DivIcon {
    let color: string;
    switch (activityStatus) {
      case 'Active':
        color = '#16a34a'; // green
        break;
      case 'Low_Activity':
        color = '#ca8a04'; // yellow
        break;
      case 'Inactive_Flagged':
        color = '#dc2626'; // red
        break;
      default:
        color = '#6b7280'; // gray
    }

    return L.divIcon({
      className: 'custom-station-marker',
      html: `
        <div style="
          background-color: ${color};
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        "></div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12]
    });
  }

  /**
   * Builds popup content for a station marker.
   * Requirement: 8.3
   */
  private buildPopupContent(station: StationMapEntry): string {
    const lastScan = station.lastScanTimestamp
      ? new Date(station.lastScanTimestamp).toLocaleString()
      : 'N/A';

    return `
      <div class="station-popup" style="min-width: 200px;">
        <h4 style="margin: 0 0 8px; font-weight: 600; font-family: monospace;">
          ${station.stationIdentifier}
        </h4>
        <p style="margin: 0 0 4px; color: #6b7280; font-size: 13px;">
          ${station.locationDescription}
        </p>
        <hr style="margin: 8px 0; border-color: #e5e7eb;">
        <div style="font-size: 12px; line-height: 1.6;">
          <div><strong>Total Scans:</strong> ${station.totalScansInPeriod}</div>
          <div><strong>Last Scan:</strong> ${lastScan}</div>
          <div><strong>Technicians:</strong> ${station.uniqueTechniciansCount}</div>
        </div>
      </div>
    `;
  }

  /**
   * Removes all markers from the map.
   */
  private clearMarkers(): void {
    this.markers.forEach(marker => {
      if (this.map) {
        marker.removeFrom(this.map);
      }
    });
    this.markers = [];
  }

  /**
   * Cleans up map resources on destroy.
   */
  private cleanupMap(): void {
    this.clearMarkers();
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }
}
