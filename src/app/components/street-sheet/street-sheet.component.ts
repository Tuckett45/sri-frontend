import { Component, AfterViewInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import * as L from 'leaflet'; // Leaflet library for map
import { StreetSheetModalComponent } from '../modals/street-sheet-modal/street-sheet-modal.component';

@Component({
  selector: 'app-street-sheet',
  templateUrl: './street-sheet.component.html',
  styleUrls: ['./street-sheet.component.scss']
})
export class StreetSheetComponent implements AfterViewInit {
  streetMarkers: any[] = [];  // Store your street markers here
  private map: any;  // Leaflet map instance

  constructor(private dialog: MatDialog) {}

  ngAfterViewInit(): void {
  }

  openEntryFormModal(): void {
    const dialogRef = this.dialog.open(StreetSheetModalComponent, {
      width: '600px',
      data: {} 
    });
  
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.addMarker(result); 
      }
    });
  }
  
  addMarker(markerData: any): void {
    this.streetMarkers.push(markerData); 
    this.addMarkerToMap(markerData);  
  }
  
  private addMarkerToMap(markerData: any): void {
    const { lat, lng, name } = markerData;
    if (lat && lng) {
      L.marker([lat, lng]).addTo(this.map)
        .bindPopup(name)  
        .openPopup();
    }
  }
  

  toggleSidePanel(sidenav: any): void {
    sidenav.toggle();
  }
}
