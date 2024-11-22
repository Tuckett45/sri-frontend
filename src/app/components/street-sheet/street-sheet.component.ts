import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import * as L from 'leaflet';
import { StreetSheet } from '../../models/street-sheet.model';
import { StreetSheetModalComponent } from '../modals/street-sheet-modal/street-sheet-modal.component';

@Component({
  selector: 'app-street-sheet',
  templateUrl: './street-sheet.component.html',
  styleUrls: ['./street-sheet.component.scss']
})
export class StreetSheetComponent {
  streetMarkers: any[] = [];  // Store your street markers here
  
  constructor(private dialog: MatDialog) {}

  // Open the entry form modal
  openEntryFormModal() {
    const dialogRef = this.dialog.open(StreetSheetModalComponent, {
      width: '600px',
      data: { }
    });

    // After closing the modal, handle the new marker
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.addMarker(result);
      }
    });
  }

  // Add a marker to the list and possibly the map
  addMarker(markerData: any) {
    this.streetMarkers.push(markerData);
    // Optionally, you can also add this marker to the Leaflet map here if needed.
    // For example: this.addMarkerToMap(markerData);
  }

  // Toggle the sidenav visibility
  toggleSidePanel(sidenav: any) {
    sidenav.toggle();
  }

  // Optional: You can also add the marker to the map if needed
  addMarkerToMap(markerData: any) {
    const map = L.map('map').setView([51.505, -0.09], 13);  // Ensure this is the correct map initialization

    L.marker([markerData.lat, markerData.lng]).addTo(map)
      .bindPopup(markerData.name)
      .openPopup();
  }
}
