import { Component, AfterViewInit, ViewChild, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
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
import { AuthService } from 'src/app/services/auth.service';
import { User } from 'src/app/models/user.model';
import { StateAbbreviation } from 'src/app/models/state-abbreviation.enum';
import { GeocodingService } from 'src/app/services/geocoding.service';

@Component({
  selector: 'app-street-sheet',
  templateUrl: './street-sheet.component.html',
  styleUrls: ['./street-sheet.component.scss']
})
export class StreetSheetComponent implements OnInit {
  streetMarkers: any[] = []; 
  mapMarkers: MapMarker[] = [];
  streetSheets!: StreetSheet[];
  mapMarker!: MapMarker;
  streetSheetMap!: StreetSheetMapComponent;
  selectedStreetSheet!: StreetSheet;
  selectedMarker!: MapMarker;
  reversedAddresses: { [markerId: string]: { street: string, city: string, state: string } } = {};


  pmOptions: User[] = [];
  filteredStreetSheets: StreetSheet[] = [];
  filteredMapMarkers: MapMarker[] = [];
  searchTerm: string = '';

  @ViewChild(StreetSheetMapComponent) streetSheetMapComponent!: StreetSheetMapComponent;

  constructor(
    private dialog: MatDialog, 
    private streetSheetService: StreetSheetService, 
    private mapMarkerService: MapMarkerService,
    private authService: AuthService,
    private toastr: ToastrService,
    private geocodingService: GeocodingService
  ) {}

  ngOnInit(): void {
    this.fetchPMOptions();
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

  openEntryFormModal(data?: StreetSheet): void {
    this.fetchPMOptions().then(() => {
      const dialogRef = this.dialog.open(StreetSheetModalComponent, {
        width: '600px',
        data: { streetSheet: data || null, pmOptions: this.pmOptions }
      });
  
      dialogRef.afterClosed().subscribe((result: StreetSheet) => {
        if (result) {
          this.mapMarker = result.marker[result.marker.length - 1]; 
          this.streetSheetMap.addMarker(this.mapMarker, result);
        }
      });
    }).catch((err) => {
      this.toastr.error('Error loading PM options');
    });
  }

  fetchPMOptions(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.authService.getUserByRole('PM').subscribe({
        next: (users) => {
          this.pmOptions = users;
          resolve(users);
        },
        error: (error) => {
          reject(error);
        }
      });
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
    this.getReversedAddress(marker).then((reversedAddress) => {
      this.reversedAddresses[marker.id] = reversedAddress;
      this.streetSheetMapComponent.centerMapOnMarker(marker, streetSheet);
    });
  }

  editStreetSheet(streetSheet: StreetSheet): void {
    const dialogRef = this.dialog.open(StreetSheetModalComponent, {
      width: '600px',
      data: {streetSheet: streetSheet }
    });
  
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.streetSheetMap.addMarker(result.marker, result);
      }
    });
  }

  addMapMarker(): void {
    const dialogRef = this.dialog.open(MapMarkerModalComponent, {
      width: '600px',
      data: this.streetSheets
    });
  
    dialogRef.afterClosed().subscribe(result => {
      if (result) {    
        const streetSheet = this.streetSheets.find(sheet => sheet.segmentId === result.segmentId);
        if (streetSheet) { 
          this.streetSheetMap.addMarker(result, streetSheet);
        } else {
          this.toastr.error('Street Sheet not found.');
        }
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

  }

  getReversedAddress(marker: MapMarker): Promise<any> {
    return new Promise((resolve, reject) => {
      this.geocodingService.reverseGeocode(marker.latitude, marker.longitude).subscribe(suggestion => {
        const address = suggestion.address || {};  
        const streetAddress = address.house_number && address.road 
          ? `${address.house_number} ${address.road}` 
          : address.road || '';
  
        const city = address.city || address.town || ''; 
        const state = address.state || '';  
        const abbreviatedState = StateAbbreviation[state as keyof typeof StateAbbreviation] || state || ''; 
        
        // Save the reversed address in the mapping
        this.reversedAddresses[marker.id] = {
          street: streetAddress.trim(),
          city: city,
          state: abbreviatedState
        };
  
        resolve(this.reversedAddresses[marker.id]);
      }, error => {
        reject(error);
      });
    });
  }  
}
