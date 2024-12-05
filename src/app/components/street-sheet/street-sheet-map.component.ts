import { Component, OnInit } from '@angular/core';
import { StreetSheetService } from 'src/app/services/street-sheet.service'; // Adjust the import path as needed
import * as L from 'leaflet';
import { MapMarker } from 'src/app/models/map-marker.model';
import { StreetSheet } from 'src/app/models/street-sheet.model';
import { MapMarkerService } from 'src/app/services/map-marker.service';

@Component({
  selector: 'street-sheet-map',
  templateUrl: './street-sheet-map.component.html',
  styleUrls: ['./street-sheet-map.component.scss']
})
export class StreetSheetMapComponent implements OnInit {
  private map: L.Map | undefined;
  streetSheets: StreetSheet[] = []

  constructor(private streetSheetService: StreetSheetService, private mapMarkerService: MapMarkerService) {}

  ngOnInit(): void {
    this.initMap();
    this.loadStreetSheets();
  }

  private loadStreetSheets(): void {
    this.streetSheetService.getStreetSheets().subscribe(streetSheets => {
      streetSheets.forEach((sheet: StreetSheet) => {
        this.mapMarkerService.getMapMarkersForStreetSheet(sheet.id).subscribe(mapMarkers => {
          sheet.marker = mapMarkers;  
        });
      });
      this.streetSheets = streetSheets;
    });
  }

  private initMap(): void {
    this.map = L.map('map').setView([37.138556308643494, -92.26058157648076], 13);  // Default center
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    }).addTo(this.map);
  }
  
  public addMarker(marker: MapMarker, streetSheet: StreetSheet): void {
    if (marker.latitude && marker.longitude) {
      L.marker([marker.latitude, marker.longitude]).addTo(this.map!)
        .bindPopup(`
          <b>${streetSheet.vendorName}</b><br>
          Street: ${streetSheet.streetAddress}<br>
          City: ${streetSheet.city}<br>
          <b>Marker ID:</b> ${marker.id}
        `)
        .openPopup();
    }
  }
}
