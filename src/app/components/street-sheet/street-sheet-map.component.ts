import { AfterViewInit, Component, OnInit } from '@angular/core';
import * as L from 'leaflet';
import 'leaflet-search';
import 'leaflet-draw';
import 'leaflet.markercluster';
import { MapMarker } from 'src/app/models/map-marker.model';
import { StreetSheet } from 'src/app/models/street-sheet.model';
import { MapMarkerService } from 'src/app/services/map-marker.service';
import { GeocodingService } from 'src/app/services/geocoding.service';
import { StateAbbreviation } from 'src/app/models/state-abbreviation.enum';
import { StreetSheetService } from 'src/app/services/street-sheet.service';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'street-sheet-map',
  templateUrl: './street-sheet-map.component.html',
  styleUrls: ['./street-sheet-map.component.scss'],
  providers: [DatePipe],
  standalone: false
})
export class StreetSheetMapComponent implements AfterViewInit {
  private map!: L.Map;
  streetSheets: StreetSheet[] = [];
  osmLayer!: L.TileLayer;
  markersClusterGroup!: L.MarkerClusterGroup;
  mapMarkers: MapMarker[] = [];
  stateAbbreviations!: StateAbbreviation;
  formattedDate!: string;

  constructor(
    private streetSheetService: StreetSheetService, 
    private mapMarkerService: MapMarkerService,
    private geocodingService: GeocodingService,
    private datePipe: DatePipe
  ) {}

  ngAfterViewInit() {
    this.loadStreetSheets();
    this.initMap();
  }

  public loadStreetSheets(): void {
    this.streetSheetService.getStreetSheets().subscribe(streetSheets => {
      streetSheets.forEach((sheet: StreetSheet) => {
        this.mapMarkerService.getMapMarkersForStreetSheet(sheet.segmentId).subscribe(mapMarkers => {
          sheet.marker = mapMarkers;
          mapMarkers.forEach(marker => {
            if (marker.latitude && marker.longitude) {
              this.addMarker(marker, sheet);
            }
          });
        });
      });
      this.streetSheets = streetSheets;
    });
  }

  getReversedAddress(marker: MapMarker): Promise<any> {
    return new Promise((resolve, reject) => {
      this.geocodingService.reverseGeocode(marker.latitude, marker.longitude).subscribe(suggestion => {
        console.log('Geocode suggestion:', suggestion);
        const address = suggestion.address || {};  
        const streetAddress = address.house_number && address.road 
          ? `${address.house_number} ${address.road}` 
          : address.road || '';
        const city = address.city || address.town || ''; 
        const state = address.state || '';  
        const abbreviatedState = StateAbbreviation[state as keyof typeof StateAbbreviation] || state || ''; 

        resolve({
          street: streetAddress.trim(),
          city: city,
          state: abbreviatedState
        });
      }, error => {
        reject(error);
      });
    });
  }

  public addMarker(marker: MapMarker, streetSheet: StreetSheet): void {
    this.getReversedAddress(marker).then(address => {
      if (marker.latitude && marker.longitude) {
        this.formattedDate = this.datePipe.transform(streetSheet.date, 'MMMM d, yyyy hh:mm') || '';
        const newMarker = L.marker([marker.latitude, marker.longitude]).bindPopup(`
          <b>${streetSheet.vendorName}</b><br>
          Segment ID: ${streetSheet.segmentId}<br>
          Street: ${address.street}<br>
          City: ${address.city}<br>
          State: ${address.state}<br>
          Date Added: <b>${this.formattedDate}</b><br>
          <b>Marker ID:</b> ${marker.id}
        `).openPopup();
        this.markersClusterGroup.addLayer(newMarker); 
      }
    });
  }

  async centerMapOnStreetSheet(streetSheet: StreetSheet): Promise<void> {
    if (this.map && streetSheet.marker && streetSheet.marker.length > 0) {
      const bounds = new L.LatLngBounds(
        new L.LatLng(streetSheet.marker[0].latitude, streetSheet.marker[0].longitude),
        new L.LatLng(streetSheet.marker[0].latitude, streetSheet.marker[0].longitude)
      );

        for (const marker of streetSheet.marker) {
            const latLng = new L.LatLng(marker.latitude, marker.longitude); 
            
            bounds.extend(latLng);

            const reversedAddress = await this.getReversedAddress(marker);  
            const formattedDate = this.datePipe.transform(streetSheet.date, 'MMMM d, yyyy hh:mm') || '';

            L.marker(latLng)
                .addTo(this.map)
                .bindPopup(`
                    <b>${streetSheet.vendorName}</b><br>
                    Segment ID: ${streetSheet.segmentId}<br>
                    Street: ${reversedAddress.street}<br>
                    City: ${reversedAddress.city}<br>
                    State: ${reversedAddress.state}<br>
                    Date Added: <b>${formattedDate}</b><br>
                    <b>Marker ID:</b> ${marker.id}
                `);
        }

        this.map.fitBounds(bounds);
        const zoomLevel = 15;
        const center = bounds.getCenter();

        this.map.flyTo(center, zoomLevel);
    }
  }

  async centerMapOnMarker(marker: MapMarker, streetSheet: StreetSheet): Promise<void> {
    if (this.map) {
      const latLng = new L.LatLng(marker.latitude, marker.longitude);      
      const reversedAddress = await this.getReversedAddress(marker);  
      this.formattedDate = this.datePipe.transform(streetSheet.date, 'MMMM d, yyyy hh:mm') || '';
      this.map.flyTo(latLng, 15, { animate: true, duration: 1 });
      
      L.marker(latLng).addTo(this.map).bindPopup(`
        <b>${streetSheet.vendorName}</b><br>
        Segment ID: ${streetSheet.segmentId}<br>
        Street: ${reversedAddress.street}<br>
        City: ${reversedAddress.city}<br>
        State: ${reversedAddress.state}<br>
        Date Added: <b>${this.formattedDate}</b><br>
        <b>Marker ID:</b> ${marker.id}
      `).openPopup();
    }
  }

  private initMap(): void {
    this.map = L.map('map').setView([37.138556308643494, -92.26058157648076], 13); 

    this.osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: ''
    });

    this.osmLayer.addTo(this.map);

    L.control.layers({
      'OpenStreetMap': this.osmLayer
    }).addTo(this.map);

    this.markersClusterGroup = L.markerClusterGroup().addTo(this.map);
  }
}
