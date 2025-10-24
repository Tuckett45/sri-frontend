import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';
import { 
  AzureMapsConfig,
  AzureMapsSearchResponse,
  AzureMapsReverseGeocodeResult,
  AzureMapsRoute,
  TrafficIncident
} from '../models/azure-maps-config.model';
import { AzureMapsMarker, LiveMarker } from '../models/azure-maps-marker.model';

// Declare Azure Maps types
declare var atlas: any;

@Injectable({
  providedIn: 'root'
})
export class AzureMapsService {
  private map: any = null;
  private dataSource: any = null;
  private symbolLayer: any = null;
  private popup: any = null;
  private config: AzureMapsConfig;
  
  private markersSubject = new BehaviorSubject<AzureMapsMarker[]>([]);
  private liveMarkersSubject = new BehaviorSubject<LiveMarker[]>([]);
  
  public markers$ = this.markersSubject.asObservable();
  public liveMarkers$ = this.liveMarkersSubject.asObservable();

  constructor(private http: HttpClient) {
    this.config = {
      subscriptionKey: environment.azureMaps?.subscriptionKey || '',
      region: 'us',
      language: 'en-US'
    };
  }

  /**
   * Initialize Azure Maps
   */
  public initializeMap(containerId: string, options: any = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.config.subscriptionKey) {
        reject(new Error('Azure Maps subscription key is required'));
        return;
      }

      try {
        // Default map options
        const defaultOptions = {
          center: [-111.8910, 40.7608], // Utah coordinates [longitude, latitude]
          zoom: 10,
          language: this.config.language,
          view: 'Auto',
          authOptions: {
            authType: 'subscriptionKey',
            subscriptionKey: this.config.subscriptionKey
          },
          style: 'road'
        };

        const mapOptions = { ...defaultOptions, ...options };

        // Initialize the map
        this.map = new atlas.Map(containerId, mapOptions);

        // Wait for map to be ready
        this.map.events.add('ready', () => {
          console.log('Azure Maps initialized successfully');
          
          // Create data source for markers
          this.dataSource = new atlas.source.DataSource();
          this.map.sources.add(this.dataSource);

          // Create symbol layer for markers
          this.symbolLayer = new atlas.layer.SymbolLayer(this.dataSource, null, {
            iconOptions: {
              image: 'marker-red',
              anchor: 'bottom',
              allowOverlap: true
            },
            textOptions: {
              textField: ['get', 'title'],
              offset: [0, -2],
              color: '#000000',
              haloColor: '#ffffff',
              haloWidth: 1
            }
          });
          this.map.layers.add(this.symbolLayer);

          // Create popup
          this.popup = new atlas.Popup({
            pixelOffset: [0, -18],
            closeButton: false
          });

          // Add click event for markers
          this.map.events.add('click', this.symbolLayer, (e: any) => {
            if (e.shapes && e.shapes.length > 0) {
              const properties = e.shapes[0].getProperties();
              const coordinates = e.shapes[0].getCoordinates();
              
              this.popup.setOptions({
                content: properties.popupContent || properties.title || 'Marker',
                position: coordinates
              });
              this.popup.open(this.map);
            }
          });

          resolve(this.map);
        });

        this.map.events.add('error', (error: any) => {
          console.error('Azure Maps initialization error:', error);
          reject(error);
        });

      } catch (error) {
        console.error('Error initializing Azure Maps:', error);
        reject(error);
      }
    });
  }

  /**
   * Add marker to the map
   */
  public addMarker(marker: AzureMapsMarker): void {
    if (!this.dataSource) {
      console.error('Map not initialized');
      return;
    }

    const point = new atlas.data.Feature(new atlas.data.Point(marker.position), {
      id: marker.id,
      title: marker.properties?.title || '',
      description: marker.properties?.description || '',
      popupContent: marker.popup?.content || marker.properties?.title || 'Marker',
      ...marker.properties
    });

    this.dataSource.add(point);
    
    // Update markers subject
    const currentMarkers = this.markersSubject.value;
    this.markersSubject.next([...currentMarkers, marker]);
  }

  /**
   * Update existing marker
   */
  public updateMarker(markerId: string, updates: Partial<AzureMapsMarker>): void {
    if (!this.dataSource) return;

    const shapes = this.dataSource.getShapes();
    const markerShape = shapes.find((shape: any) => shape.getProperties().id === markerId);
    
    if (markerShape) {
      const currentProperties = markerShape.getProperties();
      const newProperties = { ...currentProperties, ...updates.properties };
      
      if (updates.position) {
        markerShape.setCoordinates(updates.position);
      }
      
      markerShape.setProperties(newProperties);
      
      // Update markers subject
      const currentMarkers = this.markersSubject.value;
      const updatedMarkers = currentMarkers.map(m => 
        m.id === markerId ? { ...m, ...updates } : m
      );
      this.markersSubject.next(updatedMarkers);
    }
  }

  /**
   * Remove marker from the map
   */
  public removeMarker(markerId: string): void {
    if (!this.dataSource) return;

    const shapes = this.dataSource.getShapes();
    const markerShape = shapes.find((shape: any) => shape.getProperties().id === markerId);
    
    if (markerShape) {
      this.dataSource.remove(markerShape);
      
      // Update markers subject
      const currentMarkers = this.markersSubject.value;
      this.markersSubject.next(currentMarkers.filter(m => m.id !== markerId));
    }
  }

  /**
   * Clear all markers
   */
  public clearMarkers(): void {
    if (this.dataSource) {
      this.dataSource.clear();
      this.markersSubject.next([]);
      this.liveMarkersSubject.next([]);
    }
  }

  /**
   * Add or update live marker (for real-time location tracking)
   */
  public updateLiveMarker(liveMarker: LiveMarker): void {
    const currentLiveMarkers = this.liveMarkersSubject.value;
    const existingIndex = currentLiveMarkers.findIndex(m => m.id === liveMarker.id);
    
    if (existingIndex >= 0) {
      // Update existing live marker
      currentLiveMarkers[existingIndex] = liveMarker;
      this.updateMarker(liveMarker.id, liveMarker);
    } else {
      // Add new live marker
      currentLiveMarkers.push(liveMarker);
      this.addMarker(liveMarker);
    }
    
    this.liveMarkersSubject.next([...currentLiveMarkers]);
  }

  /**
   * Set map center and zoom
   */
  public setView(center: [number, number], zoom?: number): void {
    if (this.map) {
      const options: any = { center };
      if (zoom !== undefined) {
        options.zoom = zoom;
      }
      this.map.setCamera(options);
    }
  }

  /**
   * Fit map to show all markers
   */
  public fitToMarkers(padding: number = 50): void {
    if (!this.map || !this.dataSource) return;

    const shapes = this.dataSource.getShapes();
    if (shapes.length === 0) return;

    const bounds = atlas.data.BoundingBox.fromData(shapes);
    this.map.setCamera({
      bounds: bounds,
      padding: padding
    });
  }

  /**
   * Search addresses using backend API
   */
  public searchAddress(query: string, latitude?: number, longitude?: number, limit: number = 10): Observable<AzureMapsSearchResponse> {
    let params = new HttpParams()
      .set('query', query)
      .set('limit', limit.toString());
    
    if (latitude !== undefined && longitude !== undefined) {
      params = params.set('latitude', latitude.toString()).set('longitude', longitude.toString());
    }

    return this.http.get<AzureMapsSearchResponse>(`${environment.apiUrl}/api/AzureMaps/search`, { params });
  }

  /**
   * Reverse geocode coordinates using backend API
   */
  public reverseGeocode(latitude: number, longitude: number): Observable<AzureMapsReverseGeocodeResult> {
    const params = new HttpParams()
      .set('latitude', latitude.toString())
      .set('longitude', longitude.toString());

    return this.http.get<AzureMapsReverseGeocodeResult>(`${environment.apiUrl}/api/AzureMaps/reverse-geocode`, { params });
  }

  /**
   * Get route between two points using backend API
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
   * Get traffic incidents using backend API
   */
  public getTrafficIncidents(southLat: number, westLon: number, northLat: number, eastLon: number): Observable<TrafficIncident[]> {
    const params = new HttpParams()
      .set('southLat', southLat.toString())
      .set('westLon', westLon.toString())
      .set('northLat', northLat.toString())
      .set('eastLon', eastLon.toString());

    return this.http.get<TrafficIncident[]>(`${environment.apiUrl}/api/AzureMaps/traffic-incidents`, { params });
  }

  /**
   * Get current map instance
   */
  public getMap(): any {
    return this.map;
  }

  /**
   * Check if map is initialized
   */
  public isInitialized(): boolean {
    return this.map !== null;
  }

  /**
   * Destroy map and cleanup resources
   */
  public destroy(): void {
    if (this.popup) {
      this.popup.close();
      this.popup = null;
    }
    
    if (this.map) {
      this.map.dispose();
      this.map = null;
    }
    
    this.dataSource = null;
    this.symbolLayer = null;
    this.markersSubject.next([]);
    this.liveMarkersSubject.next([]);
  }
}
