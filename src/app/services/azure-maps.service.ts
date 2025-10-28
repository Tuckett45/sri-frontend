import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import * as L from 'leaflet';
import { environment } from '../../environments/environments';
import {
  AzureMapsRoute,
  AzureMapsReverseGeocodeResult,
  AzureMapsSearchResponse,
  TrafficIncident
} from '../models/azure-maps-config.model';
import { AzureMapsMarker, LiveMarker } from '../models/azure-maps-marker.model';

export interface SimpleLocateControlOptions {
  position?: L.ControlPosition;
  title?: string;
  iconHtml?: string;
  showMarker?: boolean;
  showAccuracyCircle?: boolean;
  markerOptions?: L.MarkerOptions;
  circleOptions?: L.CircleMarkerOptions;
  locateOptions?: L.LocateOptions;
  setView?: boolean;
  onLocate?: (event: L.LocationEvent) => void;
  onError?: (event: L.ErrorEvent) => void;
  onStart?: () => void;
}

export interface LeafletMapOptions {
  center?: [number, number];
  zoom?: number;
  tileUrl?: string;
  maxZoom?: number;
  attribution?: string;
  zoomControl?: boolean;
  locateControl?: boolean | SimpleLocateControlOptions;
}

@Injectable({
  providedIn: 'root'
})
export class AzureMapsService {
  private map: L.Map | null = null;
  private staticLayer: L.LayerGroup = L.layerGroup();
  private liveLayer: L.LayerGroup = L.layerGroup();

  private staticLeafletMarkers = new Map<string, L.Marker>();
  private liveLeafletMarkers = new Map<string, L.Marker>();

  private staticMarkerData = new Map<string, AzureMapsMarker>();
  private liveMarkerData = new Map<string, LiveMarker>();
  
  private locateControl?: L.Control;
  private locateControlContainer?: HTMLElement;
  private locateMarker?: L.Marker;
  private locateAccuracyCircle?: L.Circle;
  private locateControlOptions: SimpleLocateControlOptions | null = null;
  private defaultLocateOptions: L.LocateOptions = {
    enableHighAccuracy: true,
    setView: false,
    watch: false,
    maximumAge: 30000,
    timeout: 10000
  };
  private locateCallbacks: {
    onLocate?: (event: L.LocationEvent) => void;
    onError?: (event: L.ErrorEvent) => void;
  } = {};

  private markersSubject = new BehaviorSubject<AzureMapsMarker[]>([]);
  private liveMarkersSubject = new BehaviorSubject<LiveMarker[]>([]);

  public markers$ = this.markersSubject.asObservable();
  public liveMarkers$ = this.liveMarkersSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Initialize Leaflet map instance.
   */
  public initializeMap(containerId: string, options: LeafletMapOptions = {}): Promise<L.Map> {
    return new Promise((resolve, reject) => {
      const container = document.getElementById(containerId);
      if (!container) {
        reject(new Error(`Map container '${containerId}' was not found`));
        return;
      }

      this.destroy();

      const center = this.toLatLng(options.center ?? [-111.8910, 40.7608]);
      const zoom = options.zoom ?? 10;

      this.map = L.map(containerId, {
        center,
        zoom,
        zoomControl: options.zoomControl ?? true
      });

      const tileUrl: string = options.tileUrl ?? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      const tileOptions: L.TileLayerOptions = {
        maxZoom: options.maxZoom ?? 19,
        attribution: options.attribution ?? '© OpenStreetMap contributors'
      };

      L.tileLayer(tileUrl, tileOptions).addTo(this.map);

      this.staticLayer = L.layerGroup();
      this.liveLayer = L.layerGroup();

      this.staticLayer.addTo(this.map);
      this.liveLayer.addTo(this.map);

      if (options.locateControl) {
        const locateOptions = typeof options.locateControl === 'boolean' ? {} : options.locateControl;
        this.initializeLocateControl(locateOptions);
      }

      resolve(this.map);
    });
  }

  public locateUser(options?: L.LocateOptions, showLoading: boolean = false): void {
    if (!this.map) {
      return;
    }

    if (showLoading) {
      this.setLocateLoading(true);
    }

    const locateOptions = this.getLocateOptions(options);
    this.map.stopLocate();
    this.map.locate(locateOptions);
  }

  private initializeLocateControl(options: SimpleLocateControlOptions): void {
    if (!this.map) return;

    this.teardownLocateControl();

    const service = this;
    const control = L.Control.extend({
      options: {
        position: options.position ?? 'topleft'
      },
      onAdd(): HTMLElement {
        const container = L.DomUtil.create('div', 'leaflet-control-simple-locate leaflet-bar');
        const link = L.DomUtil.create('a', 'leaflet-bar-part leaflet-bar-part-single locate-button', container);
        link.href = '#';
        link.title = options.title ?? 'Show my location';
        link.innerHTML = options.iconHtml ?? '<span class="locate-icon"></span>';

        service.locateControlContainer = container;

        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.on(link, 'click', L.DomEvent.stop);
        L.DomEvent.on(link, 'click', () => {
          const locateOverrides: L.LocateOptions = {
            setView: options.setView ?? true,
            ...(options.locateOptions ?? {})
          };
          options.onStart?.();
          service.locateUser(locateOverrides, true);
        });

        return container;
      },
      onRemove(): void {
        service.locateControlContainer = undefined;
      }
    });

    this.locateControlOptions = {
      showMarker: options.showMarker ?? true,
      showAccuracyCircle: options.showAccuracyCircle ?? true,
      markerOptions: options.markerOptions,
      circleOptions: options.circleOptions,
      locateOptions: {
        ...this.defaultLocateOptions,
        ...(options.locateOptions ?? {})
      },
      setView: options.setView ?? true,
      position: options.position,
      title: options.title,
      iconHtml: options.iconHtml,
      onLocate: options.onLocate,
      onError: options.onError
    };

    this.locateCallbacks = {
      onLocate: options.onLocate,
      onError: options.onError
    };

    this.locateControl = new control();
    this.locateControl.addTo(this.map);

    this.map.on('locationfound', this.onLocationFound);
    this.map.on('locationerror', this.onLocationError);
  }

  private getLocateOptions(overrides?: L.LocateOptions): L.LocateOptions {
    const base = {
      ...this.defaultLocateOptions,
      ...(this.locateControlOptions?.locateOptions ?? {})
    };

    if (this.locateControlOptions?.setView !== undefined) {
      base.setView = this.locateControlOptions.setView;
    }

    return {
      ...base,
      ...(overrides ?? {})
    };
  }

  private onLocationFound = (event: L.LocationEvent): void => {
    this.setLocateLoading(false);
    this.updateLocateOverlays(event);
    this.locateCallbacks.onLocate?.(event);
  };

  private onLocationError = (event: L.ErrorEvent): void => {
    this.setLocateLoading(false);
    this.clearLocateOverlays();
    this.locateCallbacks.onError?.(event);
  };

  private updateLocateOverlays(event: L.LocationEvent): void {
    if (!this.map) return;

    const options = this.locateControlOptions ?? {};

    if (options.showMarker !== false) {
      if (!this.locateMarker) {
        this.locateMarker = L.marker(event.latlng, options.markerOptions);
        this.locateMarker.addTo(this.map);
      } else {
        this.locateMarker.setLatLng(event.latlng);
      }
    } else if (this.locateMarker) {
      this.map.removeLayer(this.locateMarker);
      this.locateMarker = undefined;
    }

    if (options.showAccuracyCircle !== false && typeof event.accuracy === 'number') {
      const radius = event.accuracy;
      if (!this.locateAccuracyCircle) {
        this.locateAccuracyCircle = L.circle(event.latlng, {
          radius,
          color: '#1faa00',
          fillColor: '#1faa00',
          fillOpacity: 0.2,
          weight: 1,
          ...(options.circleOptions ?? {})
        });
        this.locateAccuracyCircle.addTo(this.map);
      } else {
        this.locateAccuracyCircle.setLatLng(event.latlng);
        this.locateAccuracyCircle.setRadius(radius);
      }
    } else if (this.locateAccuracyCircle) {
      this.map.removeLayer(this.locateAccuracyCircle);
      this.locateAccuracyCircle = undefined;
    }
  }

  private setLocateLoading(isLoading: boolean): void {
    if (!this.locateControlContainer) return;
    if (isLoading) {
      this.locateControlContainer.classList.add('locating');
    } else {
      this.locateControlContainer.classList.remove('locating');
    }
  }

  private clearLocateOverlays(): void {
    if (this.map && this.locateMarker) {
      this.map.removeLayer(this.locateMarker);
    }
    if (this.map && this.locateAccuracyCircle) {
      this.map.removeLayer(this.locateAccuracyCircle);
    }
    this.locateMarker = undefined;
    this.locateAccuracyCircle = undefined;
  }

  private teardownLocateControl(): void {
    if (this.map) {
      this.map.off('locationfound', this.onLocationFound);
      this.map.off('locationerror', this.onLocationError);
    }

    if (this.locateControl) {
      this.locateControl.remove();
    }

    this.setLocateLoading(false);
    this.clearLocateOverlays();
    this.locateControl = undefined;
    this.locateControlContainer = undefined;
    this.locateControlOptions = null;
    this.locateCallbacks = {};
  }

  /**
   * Add marker to the appropriate layer.
   */
  public addMarker(marker: AzureMapsMarker): void {
    if (!this.map) {
      console.error('Map not initialized');
      return;
    }

    this.removeMarker(marker.id);

    const isLive = this.isLiveMarker(marker);
    const latLng = this.toLatLng(marker.position);
    const leafletMarker = L.marker(latLng, {
      icon: this.createMarkerIcon(marker, isLive)
    });

    if (marker.popup?.content) {
      leafletMarker.bindPopup(marker.popup.content, marker.popup.options);
    }

    const layer = isLive ? this.liveLayer : this.staticLayer;
    layer.addLayer(leafletMarker);

    if (isLive) {
      this.liveLeafletMarkers.set(marker.id, leafletMarker);
      this.liveMarkerData.set(marker.id, marker as LiveMarker);
      this.liveMarkersSubject.next(Array.from(this.liveMarkerData.values()));
    } else {
      this.staticLeafletMarkers.set(marker.id, leafletMarker);
      this.staticMarkerData.set(marker.id, marker);
      this.markersSubject.next(Array.from(this.staticMarkerData.values()));
    }
  }

  /**
   * Update an existing marker.
   */
  public updateMarker(markerId: string, updates: Partial<AzureMapsMarker>): void {
    const { dataMap, markerMap, isLive } = this.getMarkerCollections(markerId);
    if (!dataMap || !markerMap) return;

    const existing = dataMap.get(markerId);
    const leafletMarker = markerMap.get(markerId);
    if (!existing || !leafletMarker) return;

    const merged = this.mergeMarkerData(existing, updates);

    leafletMarker.setLatLng(this.toLatLng(merged.position));
    leafletMarker.setIcon(this.createMarkerIcon(merged, isLive));

    if (merged.popup?.content) {
      leafletMarker.bindPopup(merged.popup.content, merged.popup.options);
    }

    dataMap.set(markerId, merged as any);
    this.emitMarkerState(isLive);
  }

  /**
   * Remove marker from the map.
   */
  public removeMarker(markerId: string): void {
    const { dataMap, markerMap, layer, isLive } = this.getMarkerCollections(markerId);
    if (!dataMap || !markerMap || !layer) return;

    const marker = markerMap.get(markerId);
    if (!marker) return;

    layer.removeLayer(marker);
    marker.remove();

    markerMap.delete(markerId);
    dataMap.delete(markerId);
    this.emitMarkerState(isLive);
  }

  /**
   * Clear all markers from both layers.
   */
  public clearMarkers(): void {
    this.staticLayer.clearLayers();
    this.liveLayer.clearLayers();
    this.staticLeafletMarkers.clear();
    this.liveLeafletMarkers.clear();
    this.staticMarkerData.clear();
    this.liveMarkerData.clear();
    this.markersSubject.next([]);
    this.liveMarkersSubject.next([]);
  }

  /**
   * Add or update live marker (for real-time location tracking).
   */
  public updateLiveMarker(liveMarker: LiveMarker): void {
    if (this.liveMarkerData.has(liveMarker.id)) {
      this.updateMarker(liveMarker.id, liveMarker);
    } else {
      this.addMarker(liveMarker);
    }
  }

  /**
   * Control layer visibility.
   */
  public setLayerVisibility(type: 'live' | 'static', visible: boolean): void {
    if (!this.map) return;
    const layer = type === 'live' ? this.liveLayer : this.staticLayer;
    const isPresent = this.map.hasLayer(layer);

    if (visible && !isPresent) {
      layer.addTo(this.map);
    } else if (!visible && isPresent) {
      layer.removeFrom(this.map);
    }
  }

  /**
   * Set map center/zoom.
   */
  public setView(center: [number, number], zoom?: number): void {
    if (!this.map) return;

    const latLng = this.toLatLng(center);
    if (zoom !== undefined) {
      this.map.setView(latLng, zoom);
    } else {
      this.map.panTo(latLng);
    }
  }

  /**
   * Fit map to show all markers.
   */
  public fitToMarkers(padding: number = 50): void {
    if (!this.map) return;

    const latLngs: L.LatLngExpression[] = [];
    this.staticLeafletMarkers.forEach(marker => latLngs.push(marker.getLatLng()));
    this.liveLeafletMarkers.forEach(marker => latLngs.push(marker.getLatLng()));

    if (!latLngs.length) return;

    const bounds = L.latLngBounds(latLngs);
    this.map.fitBounds(bounds, { padding: [padding, padding] });
  }

  /**
   * Search addresses using backend API.
   */
  public searchAddress(
    query: string,
    latitude?: number,
    longitude?: number,
    limit: number = 10
  ): Observable<AzureMapsSearchResponse> {
    let params = new HttpParams()
      .set('query', query)
      .set('limit', limit.toString());

    if (latitude !== undefined && longitude !== undefined) {
      params = params.set('latitude', latitude.toString()).set('longitude', longitude.toString());
    }

    return this.http.get<AzureMapsSearchResponse>(`${environment.apiUrl}/api/AzureMaps/search`, { params });
  }

  /**
   * Reverse geocode coordinates using backend API.
   */
  public reverseGeocode(latitude: number, longitude: number): Observable<AzureMapsReverseGeocodeResult> {
    const params = new HttpParams()
      .set('latitude', latitude.toString())
      .set('longitude', longitude.toString());

    return this.http.get<AzureMapsReverseGeocodeResult>(`${environment.apiUrl}/api/AzureMaps/reverse-geocode`, { params });
  }

  /**
   * Get route between two points using backend API.
   */
  public getRoute(startLat: number, startLon: number, endLat: number, endLon: number): Observable<AzureMapsRoute> {
    const params = new HttpParams()
      .set('startLat', startLat.toString())
      .set('startLon', startLon.toString())
      .set('endLat', endLat.toString())
      .set('endLon', endLon.toString());

    return this.http.get<AzureMapsRoute>(`${environment.apiUrl}/api/AzureMaps/route`, { params });
  }

  /**
   * Get traffic incidents using backend API.
   */
  public getTrafficIncidents(
    southLat: number,
    westLon: number,
    northLat: number,
    eastLon: number
  ): Observable<TrafficIncident[]> {
    const params = new HttpParams()
      .set('southLat', southLat.toString())
      .set('westLon', westLon.toString())
      .set('northLat', northLat.toString())
      .set('eastLon', eastLon.toString());

    return this.http.get<TrafficIncident[]>(`${environment.apiUrl}/api/AzureMaps/traffic-incidents`, { params });
  }

  /**
   * Expose current Leaflet map instance.
   */
  public getMap(): L.Map | null {
    return this.map;
  }

  /**
   * Check if map is initialized.
   */
  public isInitialized(): boolean {
    return this.map !== null;
  }

  /**
   * Destroy map and cleanup resources.
   */
  public destroy(): void {
    this.teardownLocateControl();

    if (this.map) {
      this.staticLayer.removeFrom(this.map);
      this.liveLayer.removeFrom(this.map);
      this.map.remove();
      this.map = null;
    }

    this.staticLayer = L.layerGroup();
    this.liveLayer = L.layerGroup();

    this.staticLeafletMarkers.clear();
    this.liveLeafletMarkers.clear();
    this.staticMarkerData.clear();
    this.liveMarkerData.clear();

    this.markersSubject.next([]);
    this.liveMarkersSubject.next([]);
  }

  private isLiveMarker(marker: AzureMapsMarker): marker is LiveMarker {
    return (marker as LiveMarker).isLive === true;
  }

  private toLatLng(position: [number, number]): L.LatLngExpression {
    return [position[1], position[0]];
  }

  private mergeMarkerData<T extends AzureMapsMarker>(existing: T, updates: Partial<T>): T {
    return {
      ...existing,
      ...updates,
      position: updates.position ?? existing.position,
      properties: {
        ...existing.properties,
        ...updates.properties
      },
      popup: updates.popup
        ? { ...(existing.popup ?? {}), ...updates.popup }
        : existing.popup
    };
  }

  private createMarkerIcon(marker: AzureMapsMarker, isLive: boolean): L.DivIcon {
    const color = marker.properties?.color || (isLive ? '#1faa00' : '#d32f2f');
    const pulseClass = isLive ? ' map-marker-live' : '';

    return L.divIcon({
      className: 'map-marker-icon',
      html: `<span class="map-marker${pulseClass}" style="background:${color}"></span>`,
      iconSize: [18, 18],
      iconAnchor: [9, 18],
      popupAnchor: [0, -18]
    });
  }

  private emitMarkerState(isLive: boolean): void {
    if (isLive) {
      this.liveMarkersSubject.next(Array.from(this.liveMarkerData.values()));
    } else {
      this.markersSubject.next(Array.from(this.staticMarkerData.values()));
    }
  }

  private getMarkerCollections(markerId: string): {
    dataMap: Map<string, AzureMapsMarker> | Map<string, LiveMarker> | null;
    markerMap: Map<string, L.Marker> | null;
    layer: L.LayerGroup | null;
    isLive: boolean;
  } {
    if (this.liveMarkerData.has(markerId)) {
      return {
        dataMap: this.liveMarkerData,
        markerMap: this.liveLeafletMarkers,
        layer: this.liveLayer,
        isLive: true
      };
    }

    if (this.staticMarkerData.has(markerId)) {
      return {
        dataMap: this.staticMarkerData,
        markerMap: this.staticLeafletMarkers,
        layer: this.staticLayer,
        isLive: false
      };
    }

    return {
      dataMap: null,
      markerMap: null,
      layer: null,
      isLive: false
    };
  }
}
