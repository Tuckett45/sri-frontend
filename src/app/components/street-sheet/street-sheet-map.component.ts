import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import * as L from 'leaflet';
import { MapMarker } from 'src/app/models/map-marker.model';
import { StreetSheet } from 'src/app/models/street-sheet.model';
import { StreetSheetService } from 'src/app/services/street-sheet.service';
import { MapMarkerService } from 'src/app/services/map-marker.service';
import { DatePipe } from '@angular/common';
import { User } from 'src/app/models/user.model';
import { StateLocation } from 'src/app/models/state-location.enum';

// Fix Leaflet default icon paths broken by webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'assets/images/marker-icon-2x.png',
  iconUrl: 'assets/images/marker-icon.png',
  shadowUrl: 'assets/images/marker-shadow.png',
});

@Component({
  selector: 'street-sheet-map',
  templateUrl: './street-sheet-map.component.html',
  styleUrls: ['./street-sheet-map.component.scss'],
  providers: [DatePipe],
  standalone: false
})
export class StreetSheetMapComponent implements AfterViewInit {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;

  map!: L.Map;
  streetSheets: StreetSheet[] = [];
  osmLayer!: L.TileLayer;
  mapMarkers: { id: string, marker: L.Marker }[] = [];
  userData!: User;
  private mapReady = false;
  private pendingMarkers: { marker: MapMarker, streetSheet: StreetSheet }[] = [];

  constructor(
    private streetSheetService: StreetSheetService,
    private mapMarkerService: MapMarkerService,
    private datePipe: DatePipe
  ) {}

  ngAfterViewInit(): void {
    this.loadUserProfile();
    this.initMap();
  }

  private loadUserProfile(): void {
    const userString = localStorage.getItem('user');
    if (userString) {
      const userObj = JSON.parse(userString);
      this.userData = new User(
        userObj.id, userObj.name, userObj.email, userObj.password,
        userObj.role, userObj.market, userObj.company,
        new Date(userObj.createdDate), userObj.isApproved, userObj.approvalToken
      );
    }
  }

  public loadStreetSheets(): void {
    this.streetSheetService.getStreetSheets(this.userData).subscribe(streetSheets => {
      this.streetSheets = streetSheets;
      streetSheets.forEach((sheet: StreetSheet) => {
        this.mapMarkerService.getMapMarkersForStreetSheet(sheet.id).subscribe(mapMarkers => {
          sheet.marker = mapMarkers;
          mapMarkers.forEach(marker => {
            if (marker.latitude && marker.longitude) {
              this.addMarker(marker, sheet);
            }
          });
        });
      });
    });
  }

  public addMarker(marker: MapMarker, streetSheet: StreetSheet): void {
    if (!marker.latitude || !marker.longitude) {
      return;
    }

    // Queue markers if map isn't ready yet
    if (!this.mapReady) {
      this.pendingMarkers.push({ marker, streetSheet });
      return;
    }

    const date = marker.dateCreated
      ? this.datePipe.transform(new Date(marker.dateCreated + 'Z'), 'MMM d, yyyy h:mm a', 'America/Denver') || ''
      : '';

    const popupContent = `
      <div style="font-size:13px;line-height:1.6">
        <b>${streetSheet.vendorName || ''}</b><br>
        <b>Segment:</b> ${streetSheet.segmentId || ''}<br>
        <b>Address:</b> ${streetSheet.streetAddress || ''}<br>
        <b>City:</b> ${streetSheet.city || ''}<br>
        <b>State:</b> ${streetSheet.state || ''}<br>
        <b>Deployment:</b> ${streetSheet.deployment || ''}<br>
        <b>PM:</b> ${streetSheet.pm || 'N/A'}<br>
        <b>Date:</b> ${date}<br>
      </div>`;

    const newMarker = L.marker([marker.latitude, marker.longitude])
      .addTo(this.map)
      .bindPopup(popupContent);

    this.mapMarkers.push({ id: marker.id, marker: newMarker });
  }

  public centerMapOnStreetSheet(streetSheet: StreetSheet): void {
    if (!this.map || !streetSheet.marker || streetSheet.marker.length === 0) {
      return;
    }

    const validMarkers = streetSheet.marker.filter(m => m.latitude && m.longitude);
    if (!validMarkers.length) return;

    const bounds = L.latLngBounds(validMarkers.map(m => [m.latitude, m.longitude] as L.LatLngTuple));
    this.map.fitBounds(bounds, { maxZoom: 17, padding: [30, 30] });

    const existing = this.mapMarkers.find(m => m.id === validMarkers[0].id);
    if (existing) {
      setTimeout(() => existing.marker.openPopup(), 400);
    }
  }

  public centerMapOnMarker(marker: MapMarker, _streetSheet: StreetSheet): void {
    if (!this.map) return;
    this.map.flyTo([marker.latitude, marker.longitude], 17, { animate: true, duration: 1 });
    const existing = this.mapMarkers.find(m => m.id === marker.id);
    if (existing) {
      setTimeout(() => existing.marker.openPopup(), 400);
    }
  }

  public openStreetSheetPopup(streetSheet: StreetSheet): void {
    if (!streetSheet?.marker?.length) return;
    const existing = this.mapMarkers.find(m => m.id === streetSheet.marker[0].id);
    if (existing) {
      existing.marker.openPopup();
    }
  }

  public clearAllMapMarkers(): void {
    this.mapMarkers.forEach(entry => {
      if (entry.marker) {
        entry.marker.closePopup();
        this.map.removeLayer(entry.marker);
      }
    });
    this.mapMarkers = [];
  }

  public removeMarker(marker: MapMarker): void {
    const index = this.mapMarkers.findIndex(m => m.id === marker.id);
    if (index !== -1) {
      const entry = this.mapMarkers[index];
      entry.marker.closePopup();
      this.map.removeLayer(entry.marker);
      this.mapMarkers.splice(index, 1);
    }
  }

  public goToLocation(location: string): void {
    const defaultLat = 40.7608;
    const defaultLng = -111.8910;
    if (location) {
      const coords = StateLocation[location as keyof typeof StateLocation];
      if (coords) {
        this.map.flyTo([coords.latitude, coords.longitude], 10, { animate: true, duration: 1 });
        return;
      }
    }
    this.map.flyTo([defaultLat, defaultLng], 10, { animate: true, duration: 1 });
  }

  private initMap(): void {
    let initialLat = 40.7608;
    let initialLng = -111.8910;

    if (this.userData?.market && this.userData.market !== 'RG') {
      const coords = StateLocation[this.userData.market as keyof typeof StateLocation];
      if (coords) {
        initialLat = coords.latitude;
        initialLng = coords.longitude;
      }
    }

    this.map = L.map(this.mapContainer.nativeElement, {
      center: [initialLat, initialLng],
      zoom: 10,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    // Mark ready and flush any markers that arrived before init
    this.mapReady = true;
    this.pendingMarkers.forEach(p => this.addMarker(p.marker, p.streetSheet));
    this.pendingMarkers = [];

    // Leaflet needs a size recalc after CSS grid settles
    setTimeout(() => this.map.invalidateSize(), 300);
  }
}
