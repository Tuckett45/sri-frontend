import { Component, OnInit } from '@angular/core';
import { StreetSheetService } from 'src/app/services/street-sheet.service'; // Adjust the import path as needed
import * as L from 'leaflet';

@Component({
  selector: 'street-sheet-map',
  templateUrl: './street-sheet-map.component.html',
  styleUrls: ['./street-sheet-map.component.scss']
})
export class StreetSheetMapComponent implements OnInit {
  private map: L.Map | undefined;

  constructor(private streetSheetService: StreetSheetService) {}

  ngOnInit(): void {
    this.initMap();
    this.loadStreetSheets();
  }

  private initMap(): void {
    this.map = L.map('map').setView([37.138556308643494, -92.26058157648076], 13); // Set the default center and zoom level

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(this.map);
  }

  private loadStreetSheets(): void {
    this.streetSheetService.getStreetSheets().subscribe(streetSheets => {
      streetSheets.forEach((sheet: any) => {
        this.addMarker(sheet);
      });
    });
  }

  public addMarker(sheet: any): void {
    // Make sure your sheet object has latitude and longitude properties
    const marker = L.marker([37.138556308643494, -92.26058157648076]).addTo(this.map!);
    
    // Create a popup with details
    marker.bindPopup(`
      <b>Vendor Name:</b> SCI<br>
      <b>Street Address:</b> 1103 Julia Ave Mountain Grove, MO 65711<br>
      <b>Deployment:</b> Micro trenching<br>
      <b>Date:</b> ${new Date(sheet.date).toLocaleDateString()}<br>
    `);

    // <b>Vendor Name:</b> ${sheet.vendorName}<br>
    //   <b>Street Address:</b> ${sheet.streetAddress}<br>
    //   <b>Deployment:</b> ${sheet.deployment}<br>
    //   <b>Date:</b> ${new Date(sheet.date).toLocaleDateString()}<br>
  }
}
