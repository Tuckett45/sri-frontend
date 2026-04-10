import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  ChangeDetectionStrategy
} from '@angular/core';
import { Store } from '@ngrx/store';
import { combineLatest, Subject } from 'rxjs';
import { takeUntil, filter, debounceTime, throttleTime } from 'rxjs/operators';
import * as L from 'leaflet';
import 'leaflet.markercluster';
import { Technician } from '../../../models/technician.model';
import { Crew } from '../../../models/crew.model';
import { Job, JobStatus, Priority } from '../../../models/job.model';
import { selectScopedTechnicians } from '../../../state/technicians/technician.selectors';
import { selectScopedCrewsForMap } from '../../../state/crews/crew.selectors';
import { selectScopedJobsForMap } from '../../../state/jobs/job.selectors';
import { PermissionService } from '../../../../../services/permission.service';
import { GeoLocation } from '../../../models/time-entry.model';
import { FrmSignalRService, LocationUpdate, CrewLocationUpdate } from '../../../services/frm-signalr.service';

/**
 * Map configuration interface
 */
export interface MapConfig {
  center: [number, number]; // [latitude, longitude]
  zoom: number;
  minZoom?: number;
  maxZoom?: number;
  scrollWheelZoom?: boolean;
  dragging?: boolean;
}

/**
 * Map click event interface
 */
export interface MapClickEvent {
  latlng: L.LatLng;
  originalEvent: MouseEvent;
}

/**
 * Map zoom event interface
 */
export interface MapZoomEvent {
  zoom: number;
}

/**
 * Map component for displaying interactive maps with Leaflet
 * 
 * This component provides a foundation for geographic mapping features including:
 * - Interactive map with zoom and pan controls
 * - Configurable center position and zoom level
 * - Event emissions for map interactions
 * - Lifecycle management for proper cleanup
 * 
 * @example
 * <frm-map
 *   [config]="mapConfig"
 *   (mapClick)="onMapClick($event)"
 *   (zoomChange)="onZoomChange($event)">
 * </frm-map>
 */
@Component({
  selector: 'frm-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MapComponent implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef<HTMLDivElement>;

  /**
   * Map configuration including center position and zoom level
   */
  @Input() config: MapConfig = {
    center: [39.8283, -98.5795], // Geographic center of USA
    zoom: 4,
    minZoom: 3,
    maxZoom: 18,
    scrollWheelZoom: true,
    dragging: true
  };

  /**
   * Filter settings for controlling marker visibility
   */
  @Input() filters: any = {
    showTechnicians: true,
    showCrews: true,
    showJobs: true,
    technicianStatuses: ['available', 'on-job', 'unavailable', 'off-duty'],
    crewStatuses: ['AVAILABLE', 'ON_JOB', 'UNAVAILABLE'],
    jobStatuses: ['NotStarted', 'EnRoute', 'OnSite', 'Completed', 'Issue', 'Cancelled'],
    jobPriorities: ['P1', 'P2', 'P3', 'P4']
  };

  /**
   * Emits when the map is clicked
   */
  @Output() mapClick = new EventEmitter<MapClickEvent>();

  /**
   * Emits when the map zoom level changes
   */
  @Output() zoomChange = new EventEmitter<MapZoomEvent>();

  /**
   * Emits when the map center changes (pan)
   */
  @Output() centerChange = new EventEmitter<L.LatLng>();

  /**
   * Emits when the map is ready and initialized
   */
  @Output() mapReady = new EventEmitter<L.Map>();

  /**
   * Emits when a technician marker is clicked
   */
  @Output() technicianSelected = new EventEmitter<string>();

  /**
   * Emits when a crew marker is clicked
   */
  @Output() crewSelected = new EventEmitter<string>();

  /**
   * Emits when a job marker is clicked
   */
  @Output() jobSelected = new EventEmitter<string>();

  /**
   * The Leaflet map instance
   */
  private map: L.Map | null = null;

  /**
   * Flag to track if map has been initialized
   */
  private initialized = false;

  /**
   * Map of technician markers by technician ID
   */
  private technicianMarkers: Map<string, L.Marker> = new Map();

  /**
   * Map of crew markers by crew ID
   */
  private crewMarkers: Map<string, L.Marker> = new Map();

  /**
   * Map of job markers by job ID
   */
  private jobMarkers: Map<string, L.Marker> = new Map();

  /**
   * Map of active animations by marker ID (to cancel ongoing animations)
   */
  private activeAnimations: Map<string, number> = new Map();

  /**
   * Cache for marker icons to avoid recreating identical icons
   */
  private iconCache: Map<string, L.Icon> = new Map();

  /**
   * Cache for SVG data URLs to avoid recreating identical SVGs
   */
  private svgCache: Map<string, string> = new Map();

  /**
   * Current map bounds for viewport-based filtering
   */
  private currentBounds: L.LatLngBounds | null = null;

  /**
   * Debounce timer for bounds updates
   */
  private boundsUpdateTimer: any = null;

  /**
   * Marker cluster group for technicians
   */
  private technicianClusterGroup: L.MarkerClusterGroup | null = null;

  /**
   * Marker cluster group for crews
   */
  private crewClusterGroup: L.MarkerClusterGroup | null = null;

  /**
   * Marker cluster group for jobs
   */
  private jobClusterGroup: L.MarkerClusterGroup | null = null;

  /**
   * Subject for component destruction
   */
  private destroy$ = new Subject<void>();

  /**
   * Cached technician data for filter updates
   */
  private cachedTechnicians: Technician[] = [];

  /**
   * Cached crew data for filter updates
   */
  private cachedCrews: Array<{
    id: string;
    name: string;
    location: GeoLocation;
    status: string;
    activeJobId?: string;
    memberCount: number;
  }> = [];

  /**
   * Cached job data for filter updates
   */
  private cachedJobs: Array<{
    id: string;
    jobId: string;
    siteName: string;
    location: {
      latitude: number;
      longitude: number;
    };
    status: JobStatus;
    priority: Priority;
    scheduledStartDate: Date;
  }> = [];

  constructor(
    private store: Store,
    private permissionService: PermissionService,
    private signalRService: FrmSignalRService
  ) {}

  ngOnInit(): void {
    // Component initialization
    // Map will be initialized in ngAfterViewInit when DOM is ready
    
    // Subscribe to technician data with scope filtering
    this.setupTechnicianSubscription();
    
    // Subscribe to crew data with scope filtering
    this.setupCrewSubscription();
    
    // Subscribe to job data with scope filtering
    this.setupJobSubscription();
    
    // Subscribe to SignalR real-time location updates
    this.setupSignalRLocationSubscriptions();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // React to filter changes
    if (changes['filters'] && !changes['filters'].firstChange) {
      // Re-apply filters to cached data
      this.updateTechnicianMarkers(this.cachedTechnicians);
      this.updateCrewMarkers(this.cachedCrews);
      this.updateJobMarkers(this.cachedJobs);
    }
  }

  ngAfterViewInit(): void {
    // Initialize map after view is ready
    this.initializeMap();
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    this.destroy$.next();
    this.destroy$.complete();
    
    // Clean up map instance
    this.destroyMap();
  }

  /**
   * Initialize the Leaflet map
   */
  private initializeMap(): void {
    if (this.initialized || !this.mapContainer) {
      return;
    }

    try {
      // Create map instance
      this.map = L.map(this.mapContainer.nativeElement, {
        center: this.config.center,
        zoom: this.config.zoom,
        minZoom: this.config.minZoom,
        maxZoom: this.config.maxZoom,
        scrollWheelZoom: this.config.scrollWheelZoom,
        dragging: this.config.dragging
      });

      // Add tile layer (OpenStreetMap)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(this.map);

      // Initialize marker cluster groups
      this.initializeClusterGroups();

      // Set up event listeners
      this.setupEventListeners();

      this.initialized = true;

      // Emit map ready event
      this.mapReady.emit(this.map);
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }

  /**
   * Initialize marker cluster groups for different entity types
   */
  private initializeClusterGroups(): void {
    if (!this.map) {
      return;
    }

    // Create technician cluster group with custom styling
    this.technicianClusterGroup = L.markerClusterGroup({
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        let size = 'small';
        if (count >= 100) {
          size = 'large';
        } else if (count >= 10) {
          size = 'medium';
        }

        return L.divIcon({
          html: `<div><span>${count}</span></div>`,
          className: `marker-cluster marker-cluster-${size} marker-cluster-technician`,
          iconSize: L.point(40, 40)
        });
      },
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      maxClusterRadius: 80
    });

    // Create crew cluster group with custom styling
    this.crewClusterGroup = L.markerClusterGroup({
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        let size = 'small';
        if (count >= 100) {
          size = 'large';
        } else if (count >= 10) {
          size = 'medium';
        }

        return L.divIcon({
          html: `<div><span>${count}</span></div>`,
          className: `marker-cluster marker-cluster-${size} marker-cluster-crew`,
          iconSize: L.point(40, 40)
        });
      },
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      maxClusterRadius: 80
    });

    // Create job cluster group with custom styling
    this.jobClusterGroup = L.markerClusterGroup({
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        let size = 'small';
        if (count >= 100) {
          size = 'large';
        } else if (count >= 10) {
          size = 'medium';
        }

        return L.divIcon({
          html: `<div><span>${count}</span></div>`,
          className: `marker-cluster marker-cluster-${size} marker-cluster-job`,
          iconSize: L.point(40, 40)
        });
      },
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      maxClusterRadius: 80
    });

    // Add cluster groups to map
    this.map.addLayer(this.technicianClusterGroup);
    this.map.addLayer(this.crewClusterGroup);
    this.map.addLayer(this.jobClusterGroup);
  }

  /**
   * Set up event listeners for map interactions
   */
  private setupEventListeners(): void {
    if (!this.map) {
      return;
    }

    // Map click event
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.mapClick.emit({
        latlng: e.latlng,
        originalEvent: e.originalEvent
      });
    });

    // Zoom change event
    this.map.on('zoomend', () => {
      if (this.map) {
        this.zoomChange.emit({
          zoom: this.map.getZoom()
        });
        this.updateCurrentBounds();
      }
    });

    // Center change event (moveend fires after pan)
    this.map.on('moveend', () => {
      if (this.map) {
        this.centerChange.emit(this.map.getCenter());
        this.updateCurrentBounds();
      }
    });
  }

  /**
   * Update current map bounds for viewport-based filtering
   * Debounced to avoid excessive updates during rapid panning/zooming
   */
  private updateCurrentBounds(): void {
    if (this.boundsUpdateTimer) {
      clearTimeout(this.boundsUpdateTimer);
    }

    this.boundsUpdateTimer = setTimeout(() => {
      if (this.map) {
        this.currentBounds = this.map.getBounds();
      }
    }, 100); // 100ms debounce
  }

  /**
   * Destroy the map instance and clean up resources
   */
  private destroyMap(): void {
    // Clear debounce timer
    if (this.boundsUpdateTimer) {
      clearTimeout(this.boundsUpdateTimer);
      this.boundsUpdateTimer = null;
    }

    // Cancel all active animations
    this.activeAnimations.forEach((animationId) => {
      cancelAnimationFrame(animationId);
    });
    this.activeAnimations.clear();
    
    // Clean up all technician markers
    this.clearAllMarkers();
    
    // Clean up all crew markers
    this.clearAllCrewMarkers();
    
    // Clean up all job markers
    this.clearAllJobMarkers();

    // Clear caches
    this.iconCache.clear();
    this.svgCache.clear();

    // Clean up cluster groups
    if (this.technicianClusterGroup && this.map) {
      this.map.removeLayer(this.technicianClusterGroup);
      this.technicianClusterGroup = null;
    }

    if (this.crewClusterGroup && this.map) {
      this.map.removeLayer(this.crewClusterGroup);
      this.crewClusterGroup = null;
    }

    if (this.jobClusterGroup && this.map) {
      this.map.removeLayer(this.jobClusterGroup);
      this.jobClusterGroup = null;
    }
    
    if (this.map) {
      this.map.remove();
      this.map = null;
      this.initialized = false;
    }
  }

  /**
   * Get the current map instance
   * @returns The Leaflet map instance or null if not initialized
   */
  public getMap(): L.Map | null {
    return this.map;
  }

  /**
   * Set the map center position
   * @param center - [latitude, longitude]
   * @param zoom - Optional zoom level
   */
  public setCenter(center: [number, number], zoom?: number): void {
    if (this.map) {
      if (zoom !== undefined) {
        this.map.setView(center, zoom);
      } else {
        this.map.setView(center);
      }
    }
  }

  /**
   * Set the map zoom level
   * @param zoom - Zoom level
   */
  public setZoom(zoom: number): void {
    if (this.map) {
      this.map.setZoom(zoom);
    }
  }

  /**
   * Fit the map to specific bounds
   * @param bounds - Leaflet LatLngBounds
   */
  public fitBounds(bounds: L.LatLngBounds): void {
    if (this.map) {
      this.map.fitBounds(bounds);
    }
  }

  /**
   * Invalidate map size (call after container size changes)
   */
  public invalidateSize(): void {
    if (this.map) {
      this.map.invalidateSize();
    }
  }

  /**
   * Setup subscription to technician data with scope filtering
   * Debounced to reduce excessive marker updates during rapid data changes
   */
  private setupTechnicianSubscription(): void {
    combineLatest([
      this.permissionService.getCurrentUser(),
      this.permissionService.getCurrentUserDataScopes()
    ]).pipe(
      takeUntil(this.destroy$),
      filter(([user, dataScopes]) => !!user && !!dataScopes && dataScopes.length > 0)
    ).subscribe(([user, dataScopes]) => {
      // Subscribe to scoped technicians with debouncing for performance
      this.store.select(selectScopedTechnicians(user, dataScopes))
        .pipe(
          takeUntil(this.destroy$),
          debounceTime(150) // Debounce rapid updates
        )
        .subscribe(technicians => {
          this.cachedTechnicians = technicians;
          this.updateTechnicianMarkers(technicians);
        });
    });
  }

  /**
   * Update technician markers on the map
   * @param technicians - Array of technicians to display
   */
  private updateTechnicianMarkers(technicians: Technician[]): void {
    if (!this.map || !this.technicianClusterGroup) {
      return;
    }

    // Check if technicians should be shown
    if (!this.filters.showTechnicians) {
      // Remove all technician markers if filter is off
      this.clearAllMarkers();
      return;
    }

    // Filter technicians with valid locations and matching status filter
    const techniciansWithLocation = technicians.filter(tech => {
      if (tech.lastKnownLatitude == null || tech.lastKnownLongitude == null) {
        return false;
      }
      
      if (!this.isValidCoordinate({ latitude: tech.lastKnownLatitude, longitude: tech.lastKnownLongitude, accuracy: 0 })) {
        return false;
      }
      
      // Check if technician status matches filter
      const status = this.getTechnicianStatus(tech);
      return this.filters.technicianStatuses.includes(status);
    });

    // Get current marker IDs
    const currentMarkerIds = new Set(this.technicianMarkers.keys());
    const newTechnicianIds = new Set(techniciansWithLocation.map(t => t.id));

    // Remove markers for technicians no longer in the list or without location
    currentMarkerIds.forEach(id => {
      if (!newTechnicianIds.has(id)) {
        this.removeMarker(id);
      }
    });

    // Add or update markers for technicians with location
    techniciansWithLocation.forEach(technician => {
      this.addOrUpdateMarker(technician);
    });
  }

  /**
   * Validate geographic coordinates
   * @param location - GeoLocation to validate
   * @returns true if coordinates are valid
   */
  private isValidCoordinate(location: GeoLocation): boolean {
    return (
      location.latitude >= -90 && 
      location.latitude <= 90 &&
      location.longitude >= -180 && 
      location.longitude <= 180
    );
  }

  /**
   * Add or update a marker for a technician
   * @param technician - Technician to display
   */
  private addOrUpdateMarker(technician: Technician): void {
    if (!this.map || technician.lastKnownLatitude == null || technician.lastKnownLongitude == null || !this.technicianClusterGroup) {
      return;
    }

    const existingMarker = this.technicianMarkers.get(technician.id);
    const latlng: L.LatLngExpression = [
      technician.lastKnownLatitude,
      technician.lastKnownLongitude
    ];

    if (existingMarker) {
      // Update existing marker position and popup
      existingMarker.setLatLng(latlng);
      existingMarker.setIcon(this.getMarkerIcon(technician));
      existingMarker.setPopupContent(this.createPopupContent(technician));
    } else {
      // Create new marker
      const marker = L.marker(latlng, {
        icon: this.getMarkerIcon(technician),
        title: `${technician.firstName} ${technician.lastName}`
      });

      marker.bindPopup(this.createPopupContent(technician));
      
      // Add click event handler
      marker.on('click', () => {
        this.technicianSelected.emit(technician.id);
      });
      
      // Add to cluster group instead of directly to map
      this.technicianClusterGroup.addLayer(marker);

      this.technicianMarkers.set(technician.id, marker);
    }
  }

  /**
   * Remove a marker from the map
   * @param technicianId - ID of technician whose marker to remove
   */
  private removeMarker(technicianId: string): void {
    const marker = this.technicianMarkers.get(technicianId);
    if (marker && this.technicianClusterGroup) {
      this.technicianClusterGroup.removeLayer(marker);
      this.technicianMarkers.delete(technicianId);
    }
  }

  /**
   * Clear all markers from the map
   */
  private clearAllMarkers(): void {
    if (this.technicianClusterGroup) {
      this.technicianMarkers.forEach((marker) => {
        this.technicianClusterGroup!.removeLayer(marker);
      });
    }
    this.technicianMarkers.clear();
  }

  /**
   * Get marker icon based on technician status
   * Uses caching to avoid recreating identical icons
   * @param technician - Technician to get icon for
   * @returns Leaflet icon
   */
  private getMarkerIcon(technician: Technician): L.Icon {
    const status = this.getTechnicianStatus(technician);
    const color = this.getStatusColor(status);
    
    // Create cache key based on status/color
    const cacheKey = `tech-${status}-${color}`;
    
    // Return cached icon if available
    const cachedIcon = this.iconCache.get(cacheKey);
    if (cachedIcon) {
      return cachedIcon;
    }

    // Get or create cached SVG
    let svgDataUrl = this.svgCache.get(cacheKey);
    if (!svgDataUrl) {
      svgDataUrl = `data:image/svg+xml;base64,${btoa(this.createMarkerSvg(color))}`;
      this.svgCache.set(cacheKey, svgDataUrl);
    }

    // Create new icon with cached SVG
    const icon = L.icon({
      iconUrl: svgDataUrl,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    });
    
    // Cache the icon for reuse
    this.iconCache.set(cacheKey, icon);
    
    return icon;
  }

  /**
   * Get technician status based on availability
   * @param technician - Technician to check status for
   * @returns Status string
   */
  private getTechnicianStatus(technician: Technician): 'available' | 'on-job' | 'unavailable' | 'off-duty' {
    if (!technician.isActive) {
      return 'off-duty';
    }

    if (!technician.isAvailable) {
      return 'unavailable';
    }

    // TODO: Check assignment data to determine if on-job
    // For now, default to available
    return 'available';
  }

  /**
   * Get color for status
   * @param status - Technician status
   * @returns Hex color code
   */
  private getStatusColor(status: string): string {
    switch (status) {
      case 'available':
        return '#10b981'; // Green
      case 'on-job':
        return '#3b82f6'; // Blue
      case 'unavailable':
        return '#f59e0b'; // Orange
      case 'off-duty':
        return '#6b7280'; // Gray
      default:
        return '#6b7280'; // Gray
    }
  }

  /**
   * Format timestamp to user-friendly relative time or absolute time
   * @param timestamp - Date to format
   * @returns Formatted string like "Updated 2 minutes ago" or "Last seen: 3:45 PM"
   */
  private formatLocationTimestamp(timestamp: Date | undefined): string {
    if (!timestamp) {
      return 'Location timestamp unavailable';
    }

    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // If timestamp is in the future or invalid, show absolute time
    if (diffMs < 0) {
      return `Last seen: ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }

    // Less than 1 minute ago
    if (diffMinutes < 1) {
      return 'Updated just now';
    }

    // Less than 1 hour ago
    if (diffMinutes < 60) {
      return `Updated ${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
    }

    // Less than 24 hours ago
    if (diffHours < 24) {
      return `Updated ${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    }

    // More than 24 hours ago - show absolute time
    if (diffDays === 1) {
      return `Last seen yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }

    // More than 1 day ago
    return `Last seen ${diffDays} days ago`;
  }

  /**
   * Check if location timestamp is stale (older than 5 minutes)
   * @param timestamp - Date to check
   * @returns True if timestamp is stale or missing
   */
  private isLocationStale(timestamp: Date | undefined): boolean {
    if (!timestamp) {
      return true;
    }

    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    // Consider stale if older than 5 minutes
    return diffMinutes > 5;
  }

  /**
   * Create SVG marker with specified color
   * @param color - Hex color code
   * @returns SVG string
   */
  private createMarkerSvg(color: string): string {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
        <path fill="${color}" stroke="#ffffff" stroke-width="1.5" 
          d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
        <circle cx="12" cy="9" r="2.5" fill="#ffffff"/>
      </svg>
    `;
  }

  /**
   * Create popup content for technician marker
   * Optimized with lazy rendering - only creates full content when popup is opened
   * @param technician - Technician to create popup for
   * @returns HTML string for popup
   */
  private createPopupContent(technician: Technician): string {
    const status = this.getTechnicianStatus(technician);
    const statusColor = this.getStatusColor(status);
    const statusLabel = status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());

    const skills = 'No skills data';
    const moreSkills = '';

    // Format location timestamp
    const locationTimestamp = this.formatLocationTimestamp(technician.locationUpdatedAt);
    const isStale = this.isLocationStale(technician.locationUpdatedAt);
    const timestampColor = isStale ? '#ef4444' : '#6b7280'; // Red if stale, gray if fresh

    return `
      <div style="min-width: 200px; font-family: system-ui, -apple-system, sans-serif;">
        <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">
          ${technician.firstName} ${technician.lastName}
        </h3>
        <div style="margin-bottom: 8px;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; 
            background-color: ${statusColor}; color: white; font-size: 12px; font-weight: 500;">
            ${statusLabel}
          </span>
        </div>
        <div style="font-size: 14px; color: #4b5563;">
          <div style="margin-bottom: 4px;">
            <strong>Role:</strong> ${technician.role}
          </div>
          <div style="margin-bottom: 4px;">
            <strong>Region:</strong> ${technician.region}
          </div>
          <div style="margin-bottom: 4px;">
            <strong>Skills:</strong> ${skills}${moreSkills}
          </div>
          <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
            <div style="font-size: 12px; color: ${timestampColor}; font-style: italic;">
              📍 ${locationTimestamp}
            </div>
          </div>
          <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">
            ID: ${technician.id}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Setup subscription to crew data with scope filtering
   * Debounced to reduce excessive marker updates during rapid data changes
   */
  private setupCrewSubscription(): void {
    combineLatest([
      this.permissionService.getCurrentUser(),
      this.permissionService.getCurrentUserDataScopes()
    ]).pipe(
      takeUntil(this.destroy$),
      filter(([user, dataScopes]) => !!user && !!dataScopes && dataScopes.length > 0)
    ).subscribe(([user, dataScopes]) => {
      // Subscribe to scoped crews for map display with debouncing
      this.store.select(selectScopedCrewsForMap(user, dataScopes))
        .pipe(
          takeUntil(this.destroy$),
          debounceTime(150) // Debounce rapid updates
        )
        .subscribe(crews => {
          this.cachedCrews = crews;
          this.updateCrewMarkers(crews);
        });
    });
  }

  /**
   * Update crew markers on the map
   * @param crews - Array of crews to display (already filtered with location)
   */
  private updateCrewMarkers(crews: Array<{
    id: string;
    name: string;
    location: GeoLocation;
    status: string;
    activeJobId?: string;
    memberCount: number;
  }>): void {
    if (!this.map || !this.crewClusterGroup) {
      return;
    }

    // Check if crews should be shown
    if (!this.filters.showCrews) {
      // Remove all crew markers if filter is off
      this.clearAllCrewMarkers();
      return;
    }

    // Filter crews by status
    const filteredCrews = crews.filter(crew => 
      this.filters.crewStatuses.includes(crew.status)
    );

    // Get current marker IDs
    const currentMarkerIds = new Set(this.crewMarkers.keys());
    const newCrewIds = new Set(filteredCrews.map(c => c.id));

    // Remove markers for crews no longer in the list
    currentMarkerIds.forEach(id => {
      if (!newCrewIds.has(id)) {
        this.removeCrewMarker(id);
      }
    });

    // Add or update markers for crews
    filteredCrews.forEach(crew => {
      this.addOrUpdateCrewMarker(crew);
    });
  }

  /**
   * Add or update a marker for a crew
   * @param crew - Crew to display
   */
  private addOrUpdateCrewMarker(crew: {
    id: string;
    name: string;
    location: GeoLocation;
    status: string;
    activeJobId?: string;
    memberCount: number;
  }): void {
    if (!this.map || !this.crewClusterGroup) {
      return;
    }

    const existingMarker = this.crewMarkers.get(crew.id);
    const latlng: L.LatLngExpression = [
      crew.location.latitude,
      crew.location.longitude
    ];

    if (existingMarker) {
      // Update existing marker position and popup
      existingMarker.setLatLng(latlng);
      existingMarker.setIcon(this.getCrewMarkerIcon(crew.status));
      existingMarker.setPopupContent(this.createCrewPopupContent(crew));
    } else {
      // Create new marker
      const marker = L.marker(latlng, {
        icon: this.getCrewMarkerIcon(crew.status),
        title: crew.name
      });

      marker.bindPopup(this.createCrewPopupContent(crew));
      
      // Add click event handler
      marker.on('click', () => {
        this.crewSelected.emit(crew.id);
      });
      
      // Add to cluster group instead of directly to map
      this.crewClusterGroup.addLayer(marker);

      this.crewMarkers.set(crew.id, marker);
    }
  }

  /**
   * Remove a crew marker from the map
   * @param crewId - ID of crew whose marker to remove
   */
  private removeCrewMarker(crewId: string): void {
    const marker = this.crewMarkers.get(crewId);
    if (marker && this.crewClusterGroup) {
      this.crewClusterGroup.removeLayer(marker);
      this.crewMarkers.delete(crewId);
    }
  }

  /**
   * Clear all crew markers from the map
   */
  private clearAllCrewMarkers(): void {
    if (this.crewClusterGroup) {
      this.crewMarkers.forEach((marker) => {
        this.crewClusterGroup!.removeLayer(marker);
      });
    }
    this.crewMarkers.clear();
  }

  /**
   * Get marker icon for crew based on status
   * Uses caching to avoid recreating identical icons
   * @param status - Crew status
   * @returns Leaflet icon
   */
  private getCrewMarkerIcon(status: string): L.Icon {
    const color = this.getCrewStatusColor(status);
    
    // Create cache key based on status/color
    const cacheKey = `crew-${status}-${color}`;
    
    // Return cached icon if available
    const cachedIcon = this.iconCache.get(cacheKey);
    if (cachedIcon) {
      return cachedIcon;
    }

    // Get or create cached SVG
    let svgDataUrl = this.svgCache.get(cacheKey);
    if (!svgDataUrl) {
      svgDataUrl = `data:image/svg+xml;base64,${btoa(this.createCrewMarkerSvg(color))}`;
      this.svgCache.set(cacheKey, svgDataUrl);
    }

    // Create new icon with cached SVG
    const icon = L.icon({
      iconUrl: svgDataUrl,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    });
    
    // Cache the icon for reuse
    this.iconCache.set(cacheKey, icon);
    
    return icon;
  }

  /**
   * Get color for crew status
   * @param status - Crew status
   * @returns Hex color code
   */
  private getCrewStatusColor(status: string): string {
    switch (status) {
      case 'AVAILABLE':
        return '#10b981'; // Green
      case 'ON_JOB':
        return '#3b82f6'; // Blue
      case 'UNAVAILABLE':
        return '#f59e0b'; // Orange
      default:
        return '#6b7280'; // Gray
    }
  }

  /**
   * Create SVG marker for crew with specified color (square shape to differentiate from technicians)
   * @param color - Hex color code
   * @returns SVG string
   */
  private createCrewMarkerSvg(color: string): string {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
        <rect x="4" y="4" width="16" height="16" rx="2" fill="${color}" stroke="#ffffff" stroke-width="1.5"/>
        <path fill="#ffffff" d="M12 8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 8c-1.7 0-3.2-.9-4-2.3.8-.7 1.9-1.2 3-1.2h2c1.1 0 2.2.5 3 1.2-.8 1.4-2.3 2.3-4 2.3z"/>
      </svg>
    `;
  }

  /**
   * Create popup content for crew marker
   * @param crew - Crew to create popup for
   * @returns HTML string for popup
   */
  private createCrewPopupContent(crew: {
    id: string;
    name: string;
    location: GeoLocation;
    status: string;
    activeJobId?: string;
    memberCount: number;
  }): string {
    const statusColor = this.getCrewStatusColor(crew.status);
    const statusLabel = crew.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    const jobInfo = crew.activeJobId 
      ? `<div style="margin-bottom: 4px;">
           <strong>Active Job:</strong> ${crew.activeJobId}
         </div>`
      : '';

    // Format location timestamp
    const locationTimestamp = this.formatLocationTimestamp(crew.location.timestamp);
    const isStale = this.isLocationStale(crew.location.timestamp);
    const timestampColor = isStale ? '#ef4444' : '#6b7280'; // Red if stale, gray if fresh

    return `
      <div style="min-width: 200px; font-family: system-ui, -apple-system, sans-serif;">
        <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">
          ${crew.name}
        </h3>
        <div style="margin-bottom: 8px;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; 
            background-color: ${statusColor}; color: white; font-size: 12px; font-weight: 500;">
            ${statusLabel}
          </span>
          <span style="display: inline-block; margin-left: 8px; padding: 2px 8px; border-radius: 4px; 
            background-color: #6b7280; color: white; font-size: 12px; font-weight: 500;">
            Crew
          </span>
        </div>
        <div style="font-size: 14px; color: #4b5563;">
          <div style="margin-bottom: 4px;">
            <strong>Members:</strong> ${crew.memberCount}
          </div>
          ${jobInfo}
          <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
            <div style="font-size: 12px; color: ${timestampColor}; font-style: italic;">
              📍 ${locationTimestamp}
            </div>
          </div>
          <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">
            ID: ${crew.id}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Setup subscription to job data with scope filtering
   * Debounced to reduce excessive marker updates during rapid data changes
   */
  private setupJobSubscription(): void {
    combineLatest([
      this.permissionService.getCurrentUser(),
      this.permissionService.getCurrentUserDataScopes()
    ]).pipe(
      takeUntil(this.destroy$),
      filter(([user, dataScopes]) => !!user && !!dataScopes && dataScopes.length > 0)
    ).subscribe(([user, dataScopes]) => {
      // Subscribe to scoped jobs for map display with debouncing
      this.store.select(selectScopedJobsForMap(user, dataScopes))
        .pipe(
          takeUntil(this.destroy$),
          debounceTime(150) // Debounce rapid updates
        )
        .subscribe(jobs => {
          this.cachedJobs = jobs;
          this.updateJobMarkers(jobs);
        });
    });
  }

  /**
   * Setup subscriptions to SignalR real-time location updates
   * Subscribes to both technician and crew location updates
   * Updates markers directly for immediate visual feedback
   * Throttled to prevent overwhelming the rendering pipeline
   */
  private setupSignalRLocationSubscriptions(): void {
    // Subscribe to technician location updates with throttling
    this.signalRService.locationUpdate$
      .pipe(
        takeUntil(this.destroy$),
        filter((update): update is LocationUpdate => update !== null),
        throttleTime(100, undefined, { leading: true, trailing: true }) // Throttle to max 10 updates/sec
      )
      .subscribe(update => {
        console.log('Map component received technician location update', {
          technicianId: update.technicianId,
          location: update.location,
          timestamp: update.timestamp
        });
        
        // Update marker position in real-time
        this.updateTechnicianMarkerPosition(update.technicianId, update.location);
      });

    // Subscribe to crew location updates with throttling
    this.signalRService.crewLocationUpdate$
      .pipe(
        takeUntil(this.destroy$),
        filter((update): update is CrewLocationUpdate => update !== null),
        throttleTime(100, undefined, { leading: true, trailing: true }) // Throttle to max 10 updates/sec
      )
      .subscribe(update => {
        console.log('Map component received crew location update', {
          crewId: update.crewId,
          location: update.location,
          timestamp: update.timestamp
        });
        
        // Update crew marker position in real-time
        this.updateCrewMarkerPosition(update.crewId, update.location);
      });

    // Monitor connection status for visual feedback
    this.signalRService.connectionStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        console.log('SignalR connection status changed in map component:', status);
        
        // Optionally handle connection status changes
        // For example, show a visual indicator on the map when disconnected
        if (status === 'disconnected') {
          console.warn('Map component: SignalR disconnected - real-time updates paused');
        } else if (status === 'connected') {
          console.log('Map component: SignalR connected - real-time updates active');
        }
      });
  }

  /**
   * Update technician marker position in real-time
   * This provides immediate visual feedback without waiting for store updates
   * @param technicianId - ID of technician to update
   * @param location - New location coordinates
   */
  private updateTechnicianMarkerPosition(technicianId: string, location: GeoLocation): void {
    const marker = this.technicianMarkers.get(technicianId);
    
    if (!marker) {
      // Marker doesn't exist yet - it will be created when store updates
      console.log(`Marker for technician ${technicianId} not found - will be created on next store update`);
      return;
    }

    // Validate coordinates before updating
    if (!this.isValidCoordinate(location)) {
      console.warn(`Invalid coordinates for technician ${technicianId}:`, location);
      return;
    }

    const newLatLng: L.LatLngExpression = [location.latitude, location.longitude];
    
    // Animate the marker movement with smooth transition
    this.animateMarkerMovement(marker, newLatLng, `tech-${technicianId}`);
    
    console.log(`Updated marker position for technician ${technicianId}`, {
      latitude: location.latitude,
      longitude: location.longitude
    });
  }

  /**
   * Animate marker movement to new position with smooth transition
   * 
   * Features:
   * - Smooth interpolation using requestAnimationFrame for optimal performance
   * - Ease-out cubic easing for natural movement
   * - Cancels previous animation if new update arrives (handles rapid updates)
   * - Completes within 1 second per requirement 4.1.2
   * - Skips animation for negligible movements (< 10 meters)
   * 
   * @param marker - Leaflet marker to animate
   * @param newLatLng - Target position
   * @param markerId - Unique identifier for this marker (to track animations)
   */
  private animateMarkerMovement(
    marker: L.Marker, 
    newLatLng: L.LatLngExpression, 
    markerId: string
  ): void {
    // Get current and target positions
    const currentLatLng = marker.getLatLng();
    const targetLatLng = L.latLng(newLatLng as [number, number]);
    
    // Calculate distance to determine if animation is needed
    const distance = currentLatLng.distanceTo(targetLatLng);
    
    // Skip animation for negligible movements (< 10 meters)
    if (distance < 10) {
      marker.setLatLng(targetLatLng);
      return;
    }
    
    // Cancel any existing animation for this marker
    const existingAnimationId = this.activeAnimations.get(markerId);
    if (existingAnimationId !== undefined) {
      cancelAnimationFrame(existingAnimationId);
      this.activeAnimations.delete(markerId);
    }
    
    // Animation parameters
    const duration = 800; // 800ms animation (well within 1 second requirement)
    const startTime = performance.now();
    
    // Animation function using requestAnimationFrame for smooth 60fps animation
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1); // Clamp to [0, 1]
      
      // Ease-out cubic easing for natural deceleration
      // Formula: 1 - (1 - t)^3
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      // Interpolate position using easing
      const lat = currentLatLng.lat + (targetLatLng.lat - currentLatLng.lat) * easeProgress;
      const lng = currentLatLng.lng + (targetLatLng.lng - currentLatLng.lng) * easeProgress;
      
      // Update marker position
      marker.setLatLng([lat, lng]);
      
      // Continue animation if not complete
      if (progress < 1) {
        const animationId = requestAnimationFrame(animate);
        this.activeAnimations.set(markerId, animationId);
      } else {
        // Animation complete - ensure final position is exact
        marker.setLatLng(targetLatLng);
        this.activeAnimations.delete(markerId);
      }
    };
    
    // Start animation
    const animationId = requestAnimationFrame(animate);
    this.activeAnimations.set(markerId, animationId);
  }

  /**
   * Update crew marker position in real-time
   * This provides immediate visual feedback without waiting for store updates
   * @param crewId - ID of crew to update
   * @param location - New location coordinates
   */
  private updateCrewMarkerPosition(crewId: string, location: GeoLocation): void {
    const marker = this.crewMarkers.get(crewId);
    
    if (!marker) {
      // Marker doesn't exist yet - it will be created when store updates
      console.log(`Marker for crew ${crewId} not found - will be created on next store update`);
      return;
    }

    // Validate coordinates before updating
    if (!this.isValidCoordinate(location)) {
      console.warn(`Invalid coordinates for crew ${crewId}:`, location);
      return;
    }

    const newLatLng: L.LatLngExpression = [location.latitude, location.longitude];
    
    // Animate the marker movement with smooth transition
    this.animateMarkerMovement(marker, newLatLng, `crew-${crewId}`);
    
    console.log(`Updated marker position for crew ${crewId}`, {
      latitude: location.latitude,
      longitude: location.longitude
    });
  }

  /**
   * Update job markers on the map
   * @param jobs - Array of jobs to display (already filtered with location)
   */
  private updateJobMarkers(jobs: Array<{
    id: string;
    jobId: string;
    siteName: string;
    location: {
      latitude: number;
      longitude: number;
    };
    status: JobStatus;
    priority: Priority;
    scheduledStartDate: Date;
  }>): void {
    if (!this.map || !this.jobClusterGroup) {
      return;
    }

    // Check if jobs should be shown
    if (!this.filters.showJobs) {
      // Remove all job markers if filter is off
      this.clearAllJobMarkers();
      return;
    }

    // Filter jobs by status and priority
    const filteredJobs = jobs.filter(job => 
      this.filters.jobStatuses.includes(job.status) &&
      this.filters.jobPriorities.includes(job.priority)
    );

    // Get current marker IDs
    const currentMarkerIds = new Set(this.jobMarkers.keys());
    const newJobIds = new Set(filteredJobs.map(j => j.id));

    // Remove markers for jobs no longer in the list
    currentMarkerIds.forEach(id => {
      if (!newJobIds.has(id)) {
        this.removeJobMarker(id);
      }
    });

    // Add or update markers for jobs
    filteredJobs.forEach(job => {
      this.addOrUpdateJobMarker(job);
    });
  }

  /**
   * Add or update a marker for a job
   * @param job - Job to display
   */
  private addOrUpdateJobMarker(job: {
    id: string;
    jobId: string;
    siteName: string;
    location: {
      latitude: number;
      longitude: number;
    };
    status: JobStatus;
    priority: Priority;
    scheduledStartDate: Date;
  }): void {
    if (!this.map || !this.jobClusterGroup) {
      return;
    }

    const existingMarker = this.jobMarkers.get(job.id);
    const latlng: L.LatLngExpression = [
      job.location.latitude,
      job.location.longitude
    ];

    if (existingMarker) {
      // Update existing marker position and popup
      existingMarker.setLatLng(latlng);
      existingMarker.setIcon(this.getJobMarkerIcon(job.status, job.priority));
      existingMarker.setPopupContent(this.createJobPopupContent(job));
    } else {
      // Create new marker
      const marker = L.marker(latlng, {
        icon: this.getJobMarkerIcon(job.status, job.priority),
        title: job.siteName
      });

      marker.bindPopup(this.createJobPopupContent(job));
      
      // Add click event handler
      marker.on('click', () => {
        this.jobSelected.emit(job.id);
      });
      
      // Add to cluster group instead of directly to map
      this.jobClusterGroup.addLayer(marker);

      this.jobMarkers.set(job.id, marker);
    }
  }

  /**
   * Remove a job marker from the map
   * @param jobId - ID of job whose marker to remove
   */
  private removeJobMarker(jobId: string): void {
    const marker = this.jobMarkers.get(jobId);
    if (marker && this.jobClusterGroup) {
      this.jobClusterGroup.removeLayer(marker);
      this.jobMarkers.delete(jobId);
    }
  }

  /**
   * Clear all job markers from the map
   */
  private clearAllJobMarkers(): void {
    if (this.jobClusterGroup) {
      this.jobMarkers.forEach((marker) => {
        this.jobClusterGroup!.removeLayer(marker);
      });
    }
    this.jobMarkers.clear();
  }

  /**
   * Get marker icon for job based on status and priority
   * Uses caching to avoid recreating identical icons
   * @param status - Job status
   * @param priority - Job priority
   * @returns Leaflet icon
   */
  private getJobMarkerIcon(status: JobStatus, priority: Priority): L.Icon {
    const color = this.getJobStatusColor(status, priority);
    
    // Create cache key based on status/priority/color
    const cacheKey = `job-${status}-${priority}-${color}`;
    
    // Return cached icon if available
    const cachedIcon = this.iconCache.get(cacheKey);
    if (cachedIcon) {
      return cachedIcon;
    }

    // Get or create cached SVG
    let svgDataUrl = this.svgCache.get(cacheKey);
    if (!svgDataUrl) {
      svgDataUrl = `data:image/svg+xml;base64,${btoa(this.createJobMarkerSvg(color))}`;
      this.svgCache.set(cacheKey, svgDataUrl);
    }

    // Create new icon with cached SVG
    const icon = L.icon({
      iconUrl: svgDataUrl,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    });
    
    // Cache the icon for reuse
    this.iconCache.set(cacheKey, icon);
    
    return icon;
  }

  /**
   * Get color for job status and priority
   * @param status - Job status
   * @param priority - Job priority
   * @returns Hex color code
   */
  private getJobStatusColor(status: JobStatus, priority: Priority): string {
    // Priority takes precedence for visual urgency
    if (priority === Priority.P1) {
      return '#dc2626'; // Red for P1 (critical)
    }
    if (priority === Priority.P2) {
      return '#f59e0b'; // Orange for P2 (high)
    }

    // Status-based colors for normal priority
    switch (status) {
      case JobStatus.NotStarted:
        return '#6b7280'; // Gray
      case JobStatus.EnRoute:
        return '#3b82f6'; // Blue
      case JobStatus.OnSite:
        return '#8b5cf6'; // Purple
      case JobStatus.Completed:
        return '#10b981'; // Green
      case JobStatus.Issue:
        return '#ef4444'; // Red
      case JobStatus.Cancelled:
        return '#9ca3af'; // Light gray
      default:
        return '#6b7280'; // Gray
    }
  }

  /**
   * Create SVG marker for job with specified color (diamond/pin shape to differentiate from technicians and crews)
   * @param color - Hex color code
   * @returns SVG string
   */
  private createJobMarkerSvg(color: string): string {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
        <path fill="${color}" stroke="#ffffff" stroke-width="1.5" 
          d="M12 2L4 10h6v10h4V10h6z"/>
        <circle cx="12" cy="8" r="2" fill="#ffffff"/>
      </svg>
    `;
  }

  /**
   * Create popup content for job marker
   * @param job - Job to create popup for
   * @returns HTML string for popup
   */
  private createJobPopupContent(job: {
    id: string;
    jobId: string;
    siteName: string;
    location: {
      latitude: number;
      longitude: number;
    };
    status: JobStatus;
    priority: Priority;
    scheduledStartDate: Date;
  }): string {
    const statusColor = this.getJobStatusColor(job.status, job.priority);
    const statusLabel = job.status.replace(/([A-Z])/g, ' $1').trim();
    const priorityLabel = job.priority;

    const scheduledDate = new Date(job.scheduledStartDate);
    const formattedDate = scheduledDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
      <div style="min-width: 200px; font-family: system-ui, -apple-system, sans-serif;">
        <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">
          ${job.siteName}
        </h3>
        <div style="margin-bottom: 8px;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; 
            background-color: ${statusColor}; color: white; font-size: 12px; font-weight: 500;">
            ${statusLabel}
          </span>
          <span style="display: inline-block; margin-left: 8px; padding: 2px 8px; border-radius: 4px; 
            background-color: ${job.priority === Priority.P1 ? '#dc2626' : job.priority === Priority.P2 ? '#f59e0b' : '#6b7280'}; 
            color: white; font-size: 12px; font-weight: 500;">
            ${priorityLabel}
          </span>
        </div>
        <div style="font-size: 14px; color: #4b5563;">
          <div style="margin-bottom: 4px;">
            <strong>Job ID:</strong> ${job.jobId}
          </div>
          <div style="margin-bottom: 4px;">
            <strong>Scheduled:</strong> ${formattedDate}
          </div>
          <div style="font-size: 12px; color: #6b7280; margin-top: 8px;">
            ID: ${job.id}
          </div>
        </div>
      </div>
    `;
  }
}
