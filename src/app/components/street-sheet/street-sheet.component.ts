import { Component, AfterViewInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import * as L from 'leaflet';
import { StreetSheetMapComponent } from './street-sheet-map.component';
import { StreetSheetModalComponent } from '../modals/street-sheet-modal/street-sheet-modal.component';
import { MapMarker } from 'src/app/models/map-marker.model';
import { StreetSheet } from 'src/app/models/street-sheet.model';
import { StreetSheetService } from 'src/app/services/street-sheet.service';
import { MapMarkerService } from 'src/app/services/map-marker.service';

@Component({
  selector: 'app-street-sheet',
  templateUrl: './street-sheet.component.html',
  styleUrls: ['./street-sheet.component.scss']
})
export class StreetSheetComponent implements AfterViewInit {
  streetMarkers: any[] = [];  // Store your street markers here
  streetSheets: StreetSheet[] = []
  mapMarker!: MapMarker;
  streetSheetMap!: StreetSheetMapComponent;
  private map: any;  // Leaflet map instance

  constructor(private dialog: MatDialog, private streetSheetService: StreetSheetService, private mapMarkerService: MapMarkerService) {}

  ngAfterViewInit(): void {
  }

  openEntryFormModal(): void {
    const dialogRef = this.dialog.open(StreetSheetModalComponent, {
      width: '600px',
      data: {} 
    });
  
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.streetSheetMap.addMarker(this.mapMarker, result);
      }
    });
  }  

  updateStreetSheet(updatedStreetSheet: StreetSheet): void {
    this.streetSheetService.updateStreetSheet(updatedStreetSheet).subscribe(result => {
      console.log('Street sheet updated:', result);
      this.loadStreetSheets();  // Reload the list after updating
    });
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

  toggleSidePanel(sidenav: any): void {
    sidenav.toggle();
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
