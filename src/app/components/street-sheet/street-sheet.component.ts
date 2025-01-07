import { Component, AfterViewInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import * as L from 'leaflet';
import { StreetSheetMapComponent } from './street-sheet-map.component';
import { StreetSheetModalComponent } from '../modals/street-sheet-modal/street-sheet-modal.component';
import { MapMarker } from 'src/app/models/map-marker.model';
import { StreetSheet } from 'src/app/models/street-sheet.model';
import { StreetSheetService } from 'src/app/services/street-sheet.service';
import { MapMarkerService } from 'src/app/services/map-marker.service';
import { forkJoin, map } from 'rxjs';
import { DeleteConfirmationModalComponent } from '../modals/delete-confirmation-modal/delete-confirmation-modal.component';
import { ToastrService } from 'ngx-toastr';
import { MapMarkerModalComponent } from '../modals/map-marker-modal/map-marker-modal.component';

@Component({
  selector: 'app-street-sheet',
  templateUrl: './street-sheet.component.html',
  styleUrls: ['./street-sheet.component.scss']
})
export class StreetSheetComponent implements AfterViewInit {
  streetMarkers: any[] = []; 
  mapMarkers: MapMarker[] = [];
  streetSheets: StreetSheet[] = []
  mapMarker!: MapMarker;
  streetSheetMap!: StreetSheetMapComponent;
  selectedStreetSheet: StreetSheet | null = null;
  selectedMarker: MapMarker | null = null;

  filteredStreetSheets: StreetSheet[] = [];
  filteredMapMarkers: MapMarker[] = [];
  searchTerm: string = '';

  @ViewChild(StreetSheetMapComponent) streetSheetMapComponent!: StreetSheetMapComponent;

  constructor(
    private dialog: MatDialog, 
    private streetSheetService: StreetSheetService, 
    private mapMarkerService: MapMarkerService,
    private toastr: ToastrService,
  ) {}

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
      this.streetSheetMap.loadStreetSheets(); 
    });
  }

  filterStreetSheets(): void {
    const lowerSearchTerm = this.searchTerm.toLowerCase();
    this.filteredStreetSheets = this.streetSheets.filter(sheet =>
      sheet.vendorName.toLowerCase().includes(lowerSearchTerm) ||
      sheet.segmentId.toLowerCase().includes(lowerSearchTerm)
    );
  }

  // filterMapMarkers(): void {
  //   const lowerSearchTerm = this.searchTerm.toLowerCase();
  //   this.filteredMapMarkers = this.mapMarkers.filter(sheet =>
  //     sheet.vendorName.toLowerCase().includes(lowerSearchTerm) ||
  //     sheet.segmentId.toLowerCase().includes(lowerSearchTerm)
  //   );
  // }

  selectStreetSheet(streetSheet: StreetSheet): void {
    this.selectedStreetSheet = streetSheet;
    const firstMarker = streetSheet.marker[0];
    if (firstMarker) {
      this.selectedMarker = firstMarker;
      this.streetSheetMapComponent.centerMapOnMarker(firstMarker, streetSheet); 
    }
  }

  selectMarker(marker: MapMarker, streetSheet: StreetSheet): void {
    this.selectedMarker = marker;
    this.streetSheetMapComponent.centerMapOnMarker(marker, streetSheet); 
  }

  editStreetSheet(streetSheet: StreetSheet): void {
    const dialogRef = this.dialog.open(StreetSheetModalComponent, {
      width: '600px',
      data: streetSheet 
    });
  
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        debugger;
        this.streetSheetMap.addMarker(this.mapMarker, result);
      }
    });
  }

  addMapMarker(): void {
    const dialogRef = this.dialog.open(MapMarkerModalComponent, {
      width: '600px',
      data: {} 
    });
  
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.streetSheetMap.addMarker(this.mapMarker, result);
      }
    });
  }

  openDeleteConfirmationDialog(streetSheet: StreetSheet): void {
    const dialogRef = this.dialog.open(DeleteConfirmationModalComponent);
    
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.deleteStreetSheet(streetSheet);
      }
    });
  }

  deleteStreetSheet(streetSheet: StreetSheet): void {
    this.streetSheetService.deleteStreetSheet(streetSheet).subscribe(() => {
      this.streetSheets = this.streetSheets.filter(sheet => sheet.id !== streetSheet.id);
      this.toastr.success('Street sheet entry deleted');
    },
    (error) => {
      this.toastr.error(error.error, 'Error');
    });
  }

  editMarker(marker: MapMarker): void {
  }

  deleteMarker(marker: MapMarker): void {
    this.mapMarkerService.deleteMapMarker(marker).subscribe(() => {
      this.mapMarkers = this.mapMarkers.filter(marker => marker.id !== marker.id);
    });
  }

  toggleSidePanel(sidenav: any): void {
    sidenav.toggle();
  
    this.streetSheetService.getStreetSheets().subscribe(streetSheets => {
      forkJoin(
        streetSheets.map((sheet: StreetSheet) =>
          this.mapMarkerService.getMapMarkersForStreetSheet(sheet.segmentId).pipe(
            map((mapMarkers: MapMarker[]) => ({ sheet, mapMarkers })) 
          )
        )
      ).subscribe(results => {
        const filteredStreetSheets = results.filter((result: any) => result.mapMarkers.length > 0)
          .map((result: any) => {
            result.sheet.marker = result.mapMarkers; 
            return result.sheet;
          });
  
        this.streetSheets = filteredStreetSheets;
      });
    });
  }
  
  
}
