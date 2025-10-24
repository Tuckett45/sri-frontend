import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { Subject, takeUntil, interval } from 'rxjs';
import { SignalRService } from '../../services/signalr.service';
import { AzureMapsService } from '../../services/azure-maps.service';
import { MapMarkerService } from '../../services/map-marker.service';
import { StreetSheetService } from '../../services/street-sheet.service';
import { 
  ConnectionStatus, 
  LocationUpdate, 
  MarkerEvent 
} from '../../models/signalr-events.model';
import { AzureMapsMarker, LiveMarker } from '../../models/azure-maps-marker.model';
import { MapMarker } from '../../models/map-marker.model';
import { StreetSheet } from '../../models/street-sheet.model';
import { User } from '../../models/user.model';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-live-map',
  templateUrl: './live-map.component.html',
  styleUrls: ['./live-map.component.scss']
})
export class LiveMapComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('azureMapContainer', { static: true }) mapContainer!: ElementRef;

  private destroy$ = new Subject<void>();
  private locationWatchId: number | null = null;
  private locationUpdateInterval: any = null;

  // Component state
  public isLiveMode = false;
  public isLocationTracking = false;
  public connectionStatus: ConnectionStatus = { isConnected: false, reconnectAttempts: 0 };
  public currentLocation: { lat: number, lon: number, accuracy?: number } | null = null;
  public userData!: User;
  public streetSheets: StreetSheet[] = [];
  public liveMarkers: LiveMarker[] = [];
  public staticMarkers: AzureMapsMarker[] = [];

  // UI state
  public showConnectionStatus = true;
  public showLiveMarkers = true;
  public showStaticMarkers = true;
  public autoCenter = true;

  constructor(
    private signalRService: SignalRService,
    public azureMapsService: AzureMapsService,
    private mapMarkerService: MapMarkerService,
    private streetSheetService: StreetSheetService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadUserProfile();
    this.setupSignalRSubscriptions();
    this.loadInitialData();
  }

  ngAfterViewInit(): void {
    this.initializeAzureMap();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopLocationTracking();
    this.signalRService.stopConnection();
    this.azureMapsService.destroy();
  }

  private loadUserProfile(): void {
    const userString = localStorage.getItem('user');
    if (userString) {
      const userObj = JSON.parse(userString);
      this.userData = new User(
        userObj.id,
        userObj.name,
        userObj.email,
        userObj.password,
        userObj.role,
        userObj.market,
        userObj.company,
        new Date(userObj.createdDate),
        userObj.isApproved,
        userObj.approvalToken
      );
    }
  }

  private async initializeAzureMap(): Promise<void> {
    try {
      const mapOptions = {
        center: this.getUserMarketCoordinates(),
        zoom: 10,
        style: 'road'
      };

      await this.azureMapsService.initializeMap('azureMapContainer', mapOptions);
      console.log('Azure Maps initialized successfully');
      
      // Load existing markers after map is ready
      this.loadExistingMarkers();
      
    } catch (error) {
      console.error('Failed to initialize Azure Maps:', error);
      this.toastr.error('Failed to initialize map. Please check your Azure Maps configuration.', 'Map Error');
    }
  }

  private getUserMarketCoordinates(): [number, number] {
    // Default to Utah coordinates, customize based on user market
    const marketCoordinates: { [key: string]: [number, number] } = {
      'UT': [-111.8910, 40.7608], // Utah
      'CO': [-105.0178, 39.7392], // Colorado
      'ID': [-114.7420, 44.0682], // Idaho
      'WY': [-107.2903, 43.0759], // Wyoming
      'RG': [-111.8910, 40.7608]  // Default to Utah
    };

    return marketCoordinates[this.userData?.market] || marketCoordinates['RG'];
  }

  private setupSignalRSubscriptions(): void {
    // Connection status
    this.signalRService.connectionStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        this.connectionStatus = status;
        if (status.isConnected) {
          this.onSignalRConnected();
        }
      });

    // Location updates
    this.signalRService.locationUpdates$
      .pipe(takeUntil(this.destroy$))
      .subscribe(update => {
        this.handleLocationUpdate(update);
      });

    // Marker events
    this.signalRService.markerEvents$
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        this.handleMarkerEvent(event);
      });

    // Street sheet events
    this.signalRService.streetSheetEvents$
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        this.handleStreetSheetEvent(event);
      });
  }

  private async onSignalRConnected(): Promise<void> {
    try {
      // Join market group for relevant updates
      if (this.userData?.market) {
        await this.signalRService.joinMarketGroup(this.userData.market);
      }
      
      this.toastr.success('Connected to live updates', 'Live Map');
    } catch (error) {
      console.error('Error joining groups:', error);
    }
  }

  private loadInitialData(): void {
    if (this.userData) {
      this.streetSheetService.getStreetSheets(this.userData)
        .pipe(takeUntil(this.destroy$))
        .subscribe(streetSheets => {
          this.streetSheets = streetSheets;
        });
    }
  }

  private loadExistingMarkers(): void {
    this.streetSheets.forEach(sheet => {
      this.mapMarkerService.getMapMarkersForStreetSheet(sheet.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe(markers => {
          markers.forEach(marker => {
            this.addStaticMarker(marker, sheet);
          });
        });
    });
  }

  private addStaticMarker(mapMarker: MapMarker, streetSheet: StreetSheet): void {
    const azureMarker: AzureMapsMarker = {
      id: mapMarker.id,
      position: [mapMarker.longitude, mapMarker.latitude],
      properties: {
        title: streetSheet.vendorName,
        description: `Segment: ${streetSheet.segmentId}`,
        color: '#FF0000',
        isStatic: true
      },
      popup: {
        content: `
          <div class="marker-popup">
            <h4>${streetSheet.vendorName}</h4>
            <p><strong>Segment ID:</strong> ${streetSheet.segmentId}</p>
            <p><strong>Created By:</strong> ${streetSheet.createdBy}</p>
            <p><strong>Date:</strong> ${new Date(mapMarker.dateCreated).toLocaleDateString()}</p>
          </div>
        `
      }
    };

    this.azureMapsService.addMarker(azureMarker);
    this.staticMarkers.push(azureMarker);
  }

  private handleLocationUpdate(update: LocationUpdate): void {
    if (!this.isLiveMode) return;

    const liveMarker: LiveMarker = {
      id: `live-${update.userId}`,
      position: [update.longitude, update.latitude],
      properties: {
        title: update.userEmail,
        description: 'Live Location',
        color: '#00FF00',
        icon: 'marker-green'
      },
      popup: {
        content: `
          <div class="live-marker-popup">
            <h4>📍 Live Location</h4>
            <p><strong>User:</strong> ${update.userEmail}</p>
            <p><strong>Accuracy:</strong> ${update.accuracy ? Math.round(update.accuracy) + 'm' : 'Unknown'}</p>
            <p><strong>Updated:</strong> ${new Date(update.timestamp).toLocaleTimeString()}</p>
          </div>
        `
      },
      userId: update.userId,
      userEmail: update.userEmail,
      isLive: true,
      lastUpdated: new Date(update.timestamp),
      accuracy: update.accuracy
    };

    this.azureMapsService.updateLiveMarker(liveMarker);
    
    // Update local live markers array
    const existingIndex = this.liveMarkers.findIndex(m => m.id === liveMarker.id);
    if (existingIndex >= 0) {
      this.liveMarkers[existingIndex] = liveMarker;
    } else {
      this.liveMarkers.push(liveMarker);
    }

    // Auto-center on current user's location
    if (this.autoCenter && update.userId === this.userData?.id) {
      this.azureMapsService.setView([update.longitude, update.latitude], 15);
    }
  }

  private handleMarkerEvent(event: MarkerEvent): void {
    console.log('Marker event received:', event);
    
    switch (event.type) {
      case 'MarkerAdded':
        this.toastr.info('New marker added', 'Live Update');
        // Handle new marker addition
        break;
      case 'MarkerUpdated':
        this.toastr.info('Marker updated', 'Live Update');
        // Handle marker update
        break;
      case 'MarkerRemoved':
        this.toastr.info('Marker removed', 'Live Update');
        // Handle marker removal
        break;
    }
  }

  private handleStreetSheetEvent(event: any): void {
    console.log('Street sheet event received:', event);
    this.toastr.info('Street sheet updated', 'Live Update');
    // Reload street sheets or update specific sheet
  }

  public async toggleLiveMode(): Promise<void> {
    this.isLiveMode = !this.isLiveMode;
    
    if (this.isLiveMode) {
      try {
        await this.signalRService.startConnection();
        this.startLocationTracking();
        this.toastr.success('Live mode enabled', 'Live Map');
      } catch (error) {
        console.error('Failed to start live mode:', error);
        this.isLiveMode = false;
        this.toastr.error('Failed to enable live mode', 'Error');
      }
    } else {
      this.stopLocationTracking();
      this.clearLiveMarkers();
      this.toastr.info('Live mode disabled', 'Live Map');
    }
  }

  public async toggleLocationTracking(): Promise<void> {
    if (this.isLocationTracking) {
      this.stopLocationTracking();
    } else {
      this.startLocationTracking();
    }
  }

  private startLocationTracking(): void {
    if (!navigator.geolocation) {
      this.toastr.error('Geolocation is not supported by this browser', 'Location Error');
      return;
    }

    this.isLocationTracking = true;

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000
    };

    // Watch position changes
    this.locationWatchId = navigator.geolocation.watchPosition(
      (position) => {
        this.currentLocation = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy
        };

        // Send location update via SignalR
        if (this.signalRService.isConnected()) {
          this.signalRService.updateLocation(
            position.coords.latitude,
            position.coords.longitude,
            position.coords.accuracy
          );
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        this.toastr.error('Failed to get location', 'Location Error');
        this.isLocationTracking = false;
      },
      options
    );

    // Also send periodic updates
    this.locationUpdateInterval = setInterval(() => {
      if (this.currentLocation && this.signalRService.isConnected()) {
        this.signalRService.updateLocation(
          this.currentLocation.lat,
          this.currentLocation.lon,
          this.currentLocation.accuracy
        );
      }
    }, 30000); // Every 30 seconds

    this.toastr.success('Location tracking started', 'Live Map');
  }

  private stopLocationTracking(): void {
    this.isLocationTracking = false;

    if (this.locationWatchId !== null) {
      navigator.geolocation.clearWatch(this.locationWatchId);
      this.locationWatchId = null;
    }

    if (this.locationUpdateInterval) {
      clearInterval(this.locationUpdateInterval);
      this.locationUpdateInterval = null;
    }

    this.toastr.info('Location tracking stopped', 'Live Map');
  }

  private clearLiveMarkers(): void {
    this.liveMarkers.forEach(marker => {
      this.azureMapsService.removeMarker(marker.id);
    });
    this.liveMarkers = [];
  }

  public toggleMarkerVisibility(type: 'live' | 'static'): void {
    if (type === 'live') {
      this.showLiveMarkers = !this.showLiveMarkers;
      // Toggle live marker visibility
    } else {
      this.showStaticMarkers = !this.showStaticMarkers;
      // Toggle static marker visibility
    }
  }

  public centerOnCurrentLocation(): void {
    if (this.currentLocation) {
      this.azureMapsService.setView([this.currentLocation.lon, this.currentLocation.lat], 15);
    } else {
      this.toastr.warning('Current location not available', 'Location');
    }
  }

  public fitToAllMarkers(): void {
    this.azureMapsService.fitToMarkers();
  }

  public getConnectionStatusText(): string {
    if (this.connectionStatus.isConnected) {
      return 'Connected';
    } else if (this.connectionStatus.reconnectAttempts > 0) {
      return `Reconnecting... (${this.connectionStatus.reconnectAttempts})`;
    } else {
      return 'Disconnected';
    }
  }

  public getConnectionStatusClass(): string {
    if (this.connectionStatus.isConnected) {
      return 'status-connected';
    } else if (this.connectionStatus.reconnectAttempts > 0) {
      return 'status-reconnecting';
    } else {
      return 'status-disconnected';
    }
  }
}
