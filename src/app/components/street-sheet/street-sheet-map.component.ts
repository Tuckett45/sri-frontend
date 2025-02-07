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
import { User } from 'src/app/models/user.model';
import { StateLocation } from 'src/app/models/state-location.enum';

@Component({
  selector: 'street-sheet-map',
  templateUrl: './street-sheet-map.component.html',
  styleUrls: ['./street-sheet-map.component.scss'],
  providers: [DatePipe],
  standalone: false
})
export class StreetSheetMapComponent implements AfterViewInit {
  [x: string]: any;
  map!: L.Map;
  streetSheets: StreetSheet[] = [];
  osmLayer!: L.TileLayer;
  markersClusterGroup!: L.MarkerClusterGroup;
  mapMarkers: { id: string, marker: L.Marker }[] = []; 
  stateAbbreviations!: StateAbbreviation;
  formattedDate!: string;
  userData!: User;

  reversedAddresses: { [markerId: string]: { street: string, city: string, state: string } } = {};

  constructor(
    private streetSheetService: StreetSheetService, 
    private mapMarkerService: MapMarkerService,
    private geocodingService: GeocodingService,
    private datePipe: DatePipe
  ) {}

  ngAfterViewInit() {
    this.loadStreetSheets();
    this.loadUserProfile();
    this.initMap();
  }

  loadUserProfile(): void {
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
        new Date(userObj.createdDate)  
      );
    }
  }

  public loadStreetSheets(): void {
    this.streetSheetService.getStreetSheets().subscribe(streetSheets => {
      this.streetSheets = streetSheets;
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
    });
  }

  getReversedAddress(marker: MapMarker): Promise<any> {
    return new Promise((resolve, reject) => {
      this.geocodingService.reverseGeocode(marker.latitude, marker.longitude).subscribe(suggestion => {
  
        let bestResult = suggestion.results[0];
        for (let result of suggestion.results) {
          if (result.geometry.location_type === 'ROOFTOP') {
            bestResult = result;
            break;
          }
        }
  
        const address = bestResult.address_components || [];
        const formattedAddress = bestResult.formatted_address;
  
        const streetAddress = address.find((component: { types: string | string[]; }) => component.types.includes('street_number'))?.long_name 
                              + ' ' + 
                              address.find((component: { types: string | string[]; }) => component.types.includes('route'))?.long_name || '';
  
        const city = address.find((component: { types: string | string[]; }) => component.types.includes('locality'))?.long_name || ''; 
        const state = address.find((component: { types: string | string[]; }) => component.types.includes('administrative_area_level_1'))?.long_name || '';  
        const abbreviatedState = StateAbbreviation[state as keyof typeof StateAbbreviation] || state || ''; 
  
        this.reversedAddresses[marker.id] = {
          street: streetAddress.trim(),
          city: city,
          state: abbreviatedState,
        };
  
        resolve(this.reversedAddresses[marker.id]);
      }, error => {
        reject(error);
      });
    });
  }

  public addMarker(marker: MapMarker, streetSheet: StreetSheet): void {
    this.getReversedAddress(marker).then(address => {
      if (marker.latitude && marker.longitude) {
        this.formattedDate = this.datePipe.transform(streetSheet.date, 'MMMM d, yyyy hh:mm') || '';

        const customIcon = L.icon({
          iconUrl: 'assets/images/marker-icon-2x.png',
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          shadowUrl: 'assets/images/marker-shadow.png',
          popupAnchor: [0, -32],
          shadowSize: [41, 41],
          shadowAnchor: [12, 41]
        });

        const newMarker = L.marker([marker.latitude, marker.longitude], { icon: customIcon }).addTo(this.map)
        .bindPopup(`
          <b>${streetSheet.vendorName}</b><br>
          <b>Segment ID:</b> ${streetSheet.segmentId}<br>
          <b>Street:</b> ${address.street}<br>
          <b>City:</b> ${address.city}<br>
          <b>State:</b> ${address.state}<br>
          Date Added: <b>${this.formattedDate}</b><br>
          Created By: ${streetSheet.createdBy}<br>
          <b>Marker ID:</b> ${marker.id}
        `);

        this.mapMarkers.push({ id: marker.id, marker: newMarker });
      }
    });
  }

  async centerMapOnStreetSheet(streetSheet: StreetSheet): Promise<void> {
    if (this.map && streetSheet.marker && streetSheet.marker.length > 0) {
      
      const firstMarker = streetSheet.marker[0];
      const bounds = new L.LatLngBounds([firstMarker.latitude, firstMarker.longitude], [firstMarker.latitude, firstMarker.longitude]);
  
      for (const marker of streetSheet.marker) {
        if (marker.latitude && marker.longitude) {
          const latLng = new L.LatLng(marker.latitude, marker.longitude);
          bounds.extend(latLng);
  
          const reversedAddress = await this.getReversedAddress(marker);  
          const formattedDate = this.datePipe.transform(streetSheet.date, 'MMMM d, yyyy hh:mm') || '';
  
          L.marker(latLng)
            .bindPopup(`
              <b>${streetSheet.vendorName}</b><br>
              <b>Segment ID:</b> ${streetSheet.segmentId}<br>
              <b>Street:</b> ${reversedAddress.street}<br>
              <b>City:</b> ${reversedAddress.city}<br>
              <b>State:</b> ${reversedAddress.state}<br>
              Date Added: <b>${formattedDate}</b><br>
              Created By: ${streetSheet.createdBy}<br>
              <b>Marker ID:</b> ${marker.id}
            `);
        }
      }
  
      this.map.fitBounds(bounds);
      const center = bounds.getCenter();
      this.map.flyTo(center, 13, { animate: true, duration: 1 });
    }
  }
  
  async centerMapOnMarker(marker: MapMarker, streetSheet: StreetSheet): Promise<void> {
    if (this.map) {
      const latLng = new L.LatLng(marker.latitude, marker.longitude);
      this.map.flyTo(latLng, 15, { animate: true, duration: 1 });
      const existingMarker = this.mapMarkers.find(m => m.id === marker.id);

      if (existingMarker) {
        existingMarker.marker.openPopup(); 
      }
    }
  }

  removeMarker(marker: MapMarker){
    const existingMarker = this.mapMarkers.find(m => m.id === marker.id);
    if (existingMarker) {
      existingMarker.marker.closePopup();
      this.map.removeLayer(existingMarker.marker);
    }
  }

  goToLocation(location: string): void {
    if(location !== ''){
      const stateCoordinates = StateLocation[location as keyof typeof StateLocation] || '';
      this.map.flyTo([stateCoordinates.latitude, stateCoordinates.longitude], 10, { animate: true, duration: 1 }); 
    }else{
      //utah
      this.map.flyTo([40.7608, -111.8910], 10, { animate: true, duration: 1 }); 
    }
  }

  private initMap(): void {
    if(this.userData.market !== 'RG'){
      const stateCoordinates = StateLocation[this.userData.market as keyof typeof StateLocation] || '';
      this.map = L.map('map').setView([stateCoordinates.latitude, stateCoordinates.longitude], 10); 
    }else{
      //utah
      this.map = L.map('map').setView([40.7608, -111.8910], 10); 
    }

    this.osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: ''
    });

    this.osmLayer.addTo(this.map);

    L.control.layers({
      'OpenStreetMap': this.osmLayer
    }).addTo(this.map);

  }
}
