# Geographic Mapping Components

This module provides components for displaying interactive maps with Leaflet, designed for tracking technician locations, crew positions, and job sites in the Field Resource Management system.

## Components

### MapComponent

The `MapComponent` is the foundation component for all geographic mapping features. It provides an interactive Leaflet map with configurable options and event emissions for map interactions.

#### Features

- Interactive map with zoom and pan controls
- Configurable center position and zoom level
- Event emissions for clicks, zoom changes, and center changes
- Proper lifecycle management with cleanup
- Accessibility support with ARIA attributes
- Responsive design

#### Basic Usage

```typescript
import { Component } from '@angular/core';
import { MapConfig, MapClickEvent, MapZoomEvent } from './mapping';
import * as L from 'leaflet';

@Component({
  selector: 'app-example',
  template: `
    <frm-map
      [config]="mapConfig"
      (mapClick)="onMapClick($event)"
      (zoomChange)="onZoomChange($event)"
      (centerChange)="onCenterChange($event)"
      (mapReady)="onMapReady($event)">
    </frm-map>
  `,
  styles: [`
    frm-map {
      display: block;
      height: 600px;
      width: 100%;
    }
  `]
})
export class ExampleComponent {
  mapConfig: MapConfig = {
    center: [39.8283, -98.5795], // Center of USA
    zoom: 4,
    minZoom: 3,
    maxZoom: 18,
    scrollWheelZoom: true,
    dragging: true
  };

  onMapClick(event: MapClickEvent): void {
    console.log('Map clicked at:', event.latlng);
  }

  onZoomChange(event: MapZoomEvent): void {
    console.log('Zoom changed to:', event.zoom);
  }

  onCenterChange(center: L.LatLng): void {
    console.log('Center changed to:', center);
  }

  onMapReady(map: L.Map): void {
    console.log('Map is ready:', map);
    // You can now add markers, layers, etc.
  }
}
```

#### Configuration Options

The `MapConfig` interface supports the following options:

```typescript
interface MapConfig {
  center: [number, number];      // [latitude, longitude]
  zoom: number;                  // Initial zoom level
  minZoom?: number;              // Minimum zoom level (default: 3)
  maxZoom?: number;              // Maximum zoom level (default: 18)
  scrollWheelZoom?: boolean;     // Enable scroll wheel zoom (default: true)
  dragging?: boolean;            // Enable map dragging (default: true)
}
```

#### Public Methods

The component exposes several public methods for programmatic control:

```typescript
// Get the Leaflet map instance
const map = mapComponent.getMap();

// Set center position
mapComponent.setCenter([40.7128, -74.0060]); // New York

// Set center with zoom
mapComponent.setCenter([40.7128, -74.0060], 12);

// Set zoom level
mapComponent.setZoom(10);

// Fit map to bounds
const bounds = L.latLngBounds(
  L.latLng(40, -100),
  L.latLng(42, -98)
);
mapComponent.fitBounds(bounds);

// Invalidate size (call after container resize)
mapComponent.invalidateSize();
```

#### Events

The component emits the following events:

- **mapClick**: Emitted when the map is clicked
  ```typescript
  interface MapClickEvent {
    latlng: L.LatLng;
    originalEvent: MouseEvent;
  }
  ```

- **zoomChange**: Emitted when the zoom level changes
  ```typescript
  interface MapZoomEvent {
    zoom: number;
  }
  ```

- **centerChange**: Emitted when the map center changes (after panning)
  ```typescript
  // Emits L.LatLng
  ```

- **mapReady**: Emitted when the map is initialized and ready
  ```typescript
  // Emits L.Map instance
  ```

#### Adding Markers

Once the map is ready, you can add markers and other Leaflet features:

```typescript
onMapReady(map: L.Map): void {
  // Add a simple marker
  const marker = L.marker([40.7128, -74.0060])
    .addTo(map)
    .bindPopup('New York City');

  // Add a custom marker
  const customIcon = L.icon({
    iconUrl: 'assets/icons/technician-marker.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });

  const technicianMarker = L.marker([40.7580, -73.9855], { icon: customIcon })
    .addTo(map)
    .bindPopup('Technician: John Doe');
}
```

#### Styling

The component includes default styles, but you can customize the appearance:

```scss
frm-map {
  display: block;
  height: 600px;
  width: 100%;
  border: 1px solid #ccc;
  border-radius: 4px;

  // Override Leaflet control styles
  ::ng-deep {
    .leaflet-control-zoom a {
      background-color: #0078d4;
      color: white;
    }
  }
}
```

#### Accessibility

The map component includes accessibility features:

- ARIA role="application" for screen readers
- ARIA label describing the map purpose
- Keyboard-accessible zoom controls
- Focus indicators on interactive elements

#### Next Steps

This component is ready for marker integration in subsequent tasks:
- Task 10.1.2: Display technician location markers ✅ COMPLETED
- Task 10.1.3: Display crew location markers ✅ COMPLETED
- Task 10.1.4: Display job location markers ✅ COMPLETED
- Task 10.1.5: Implement marker clustering ✅ COMPLETED
- Task 10.1.6: Implement marker click events

## Marker Clustering

### Overview

The map component implements marker clustering using `leaflet.markercluster` to improve performance and usability when displaying many markers. Clustering automatically groups nearby markers into clusters at lower zoom levels and expands them as you zoom in.

### Features

- **Separate Cluster Groups**: Technicians, crews, and jobs each have their own cluster group with distinct styling
- **Color-Coded Clusters**: Each entity type has a unique color theme
  - Technicians: Green theme
  - Crews: Blue theme
  - Jobs: Orange theme
- **Size-Based Styling**: Clusters change appearance based on marker count
  - Small: < 10 markers
  - Medium: 10-99 markers
  - Large: 100+ markers
- **Spiderfy Effect**: When you click a cluster at max zoom, markers "spider out" for easy selection
- **Performance Optimized**: Handles 1000+ markers efficiently with configurable cluster radius

### Configuration

Each cluster group is configured with:
```typescript
{
  spiderfyOnMaxZoom: true,        // Expand clusters at max zoom
  showCoverageOnHover: false,     // Don't show coverage polygon on hover
  zoomToBoundsOnClick: true,      // Zoom to cluster bounds on click
  maxClusterRadius: 80            // Maximum radius for clustering (pixels)
}
```

### Visual Styling

Clusters display the count of markers they contain and use color-coded backgrounds:

**Technician Clusters (Green)**
- Small: rgba(16, 185, 129, 0.5-0.7)
- Medium: rgba(16, 185, 129, 0.6-0.8)
- Large: rgba(16, 185, 129, 0.7-0.9)

**Crew Clusters (Blue)**
- Small: rgba(59, 130, 246, 0.5-0.7)
- Medium: rgba(59, 130, 246, 0.6-0.8)
- Large: rgba(59, 130, 246, 0.7-0.9)

**Job Clusters (Orange)**
- Small: rgba(245, 158, 11, 0.5-0.7)
- Medium: rgba(245, 158, 11, 0.6-0.8)
- Large: rgba(245, 158, 11, 0.7-0.9)

### Usage

Clustering is automatically enabled when the map initializes. No additional configuration is required. Markers are automatically added to their respective cluster groups:

```typescript
// Technician markers are added to technicianClusterGroup
this.technicianClusterGroup.addLayer(marker);

// Crew markers are added to crewClusterGroup
this.crewClusterGroup.addLayer(marker);

// Job markers are added to jobClusterGroup
this.jobClusterGroup.addLayer(marker);
```

### Performance Benefits

- Reduces DOM elements when many markers are present
- Improves rendering performance on lower-end devices
- Maintains smooth pan and zoom interactions
- Automatically manages marker visibility based on zoom level

### Customization

To adjust cluster behavior, modify the cluster group configuration in `initializeClusterGroups()`:

```typescript
// Increase cluster radius for more aggressive clustering
maxClusterRadius: 120  // Default: 80

// Disable spiderfy effect
spiderfyOnMaxZoom: false

// Show coverage area on hover
showCoverageOnHover: true
```

## Marker Display Features

### Technician Location Markers

The map component automatically displays markers for technicians with valid locations. Markers are:
- Filtered by user's data scope (role-based access control)
- Color-coded by technician status (available, on-job, unavailable, off-duty)
- Updated in real-time when locations change
- Displayed with pin-shaped icons
- Include popup information with technician details

**Status Colors:**
- Available: Green (#10b981)
- On Job: Blue (#3b82f6)
- Unavailable: Orange (#f59e0b)
- Off Duty: Gray (#6b7280)

**Popup Information:**
- Technician name
- Status badge
- Role
- Region
- Skills
- Technician ID

### Crew Location Markers

The map component automatically displays markers for crews with valid locations. Markers are:
- Filtered by user's data scope (role-based access control)
- Color-coded by crew status (available, on-job, unavailable)
- Updated in real-time when locations change
- Displayed with square-shaped icons (to differentiate from technicians)
- Include popup information with crew details

**Status Colors:**
- Available: Green (#10b981)
- On Job: Blue (#3b82f6)
- Unavailable: Orange (#f59e0b)

**Popup Information:**
- Crew name
- Status badge
- "Crew" badge (to distinguish from technicians)
- Member count
- Active job ID (if applicable)
- Crew ID

**Visual Differentiation:**
- Technicians use pin-shaped markers (teardrop icon)
- Crews use square-shaped markers (rounded rectangle icon)
- Both display appropriate status colors
- Both can be displayed simultaneously on the map

### Job Location Markers

The map component automatically displays markers for jobs with valid locations. Markers are:
- Filtered by user's data scope (role-based access control)
- Color-coded by priority and status
- Updated in real-time when job details change
- Displayed with diamond/pin-shaped icons (to differentiate from technicians and crews)
- Include popup information with job details

**Priority Colors (takes precedence):**
- P1 (Critical): Red (#dc2626)
- P2 (High): Orange (#f59e0b)
- Normal: Status-based colors (see below)

**Status Colors (for Normal priority):**
- Not Started: Gray (#6b7280)
- En Route: Blue (#3b82f6)
- On Site: Purple (#8b5cf6)
- Completed: Green (#10b981)
- Issue: Red (#ef4444)
- Cancelled: Light Gray (#9ca3af)

**Popup Information:**
- Site name
- Status badge
- Priority badge
- Job ID
- Scheduled date and time
- Internal job ID

**Visual Differentiation:**
- Technicians use pin-shaped markers (teardrop icon)
- Crews use square-shaped markers (rounded rectangle icon)
- Jobs use diamond/pin-shaped markers (upward arrow icon)
- All three types can be displayed simultaneously on the map

### Implementation Details

The component subscribes to NgRx selectors that apply role-based filtering:
- Admin: sees all technicians, crews, and jobs
- CM: sees technicians, crews, and jobs in their market (or all if RG market)
- PM/Vendor: sees technicians, crews, and jobs in their company AND market
- Technician: sees only crews they are part of and jobs assigned to them

Markers are automatically:
- Added when new technicians/crews/jobs appear with locations
- Updated when locations or details change
- Removed when technicians/crews/jobs are removed or lose location data
- Validated for coordinate ranges (lat: -90 to 90, lng: -180 to 180)

## Module Import

To use the mapping components in your module:

```typescript
import { MappingModule } from './components/mapping';

@NgModule({
  imports: [
    MappingModule,
    // ... other imports
  ]
})
export class YourModule { }
```

## Dependencies

- **leaflet**: ^1.7.1 (already installed)
- **@types/leaflet**: ^1.9.16 (already installed)
- **leaflet.markercluster**: ^1.5.3 (already installed)
- **@types/leaflet.markercluster**: ^1.5.5 (already installed)

## Testing

The component includes comprehensive unit tests covering:
- Component initialization
- Map configuration
- Map interactions (click, zoom, pan)
- Public methods
- Lifecycle management
- Error handling
- Accessibility

Run tests with:
```bash
npm test -- --include='**/map.component.spec.ts'
```
