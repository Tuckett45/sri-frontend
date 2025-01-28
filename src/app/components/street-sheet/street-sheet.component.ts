import { Component, AfterViewInit, ViewChild, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { Select } from 'primeng/select';
import { FloatLabel } from "primeng/floatlabel"
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
import { MatTableDataSource } from '@angular/material/table';
import { StateLocation } from 'src/app/models/state-location.enum';

@Component({
  selector: 'app-street-sheet',
  templateUrl: './street-sheet.component.html',
  styleUrls: ['./street-sheet.component.scss'],
  standalone: false
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
  sidenavOpen: boolean = false;
  searchBarOpen: boolean = false;
  userSearchOpen: boolean = false;
  dateRangeOpen: boolean = false;
  user!: User;
  startDate!: Date;
  endDate!: Date;

  pmOptions: User[] = [];
  filteredStreetSheets: StreetSheet[] = [];
  filteredMapMarkers: MapMarker[] = [];
  filterText: string = '';
  filterUser: string = '';
  filterLocation: string = '';
  filteredLocations: string[] = [];
  uniqueCreatedByUsers: string[] = [];

  @ViewChild(StreetSheetMapComponent) streetSheetMapComponent!: StreetSheetMapComponent;
  dataSource: MatTableDataSource<StreetSheet> = new MatTableDataSource();

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
    this.user = this.authService.getUser();
    this.getStreetSheets();
  }

  getStreetSheets(){
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
            result.sheet.marker.forEach((marker: MapMarker) => {
              this.getReversedAddress(marker).then((reversedAddress) => {
                this.reversedAddresses[marker.id] = reversedAddress;
              });
            }) 
            return result.sheet;
          });
        
        this.streetSheets = filteredStreetSheets;
        this.filteredStreetSheets = this.streetSheets;
        this.getLocationFilter();
        this.getUniqueCreatedByUsers();
      });
    });
  }

  createStreetSheet(): void {
      const dialogRef = this.dialog.open(StreetSheetModalComponent, {
        width: '600px',
        data: { pmOptions: this.pmOptions }
      });
  
      dialogRef.afterClosed().subscribe((result: StreetSheet) => {
        if (result) {
          this.mapMarker = result.marker[result.marker.length - 1]; 
          this.streetSheetMap.addMarker(this.mapMarker, result);
          this.streetSheetMapComponent.centerMapOnMarker(result.marker[0], result);
          this.getStreetSheets();
        }
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

  selectStreetSheet(streetSheet: StreetSheet): void {
    this.selectedStreetSheet = streetSheet;
    this.streetSheetMapComponent.centerMapOnStreetSheet(streetSheet); 
  }

  selectMarker(marker: MapMarker, streetSheet: StreetSheet, sidenav: any): void {
    this.toggleSidePanel(sidenav);
    this.selectedMarker = marker;
    this.getReversedAddress(marker).then((reversedAddress) => {
      this.reversedAddresses[marker.id] = reversedAddress;
      this.streetSheetMapComponent.centerMapOnMarker(marker, streetSheet);
    });
  }

  editStreetSheet(streetSheet: StreetSheet): void {
    const dialogRef = this.dialog.open(StreetSheetModalComponent, {
      width: '600px',
      data: { streetSheet: streetSheet, pmOptions: this.pmOptions }
    });
  
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.streetSheetMap.addMarker(result.marker, result);
        this.getStreetSheets();
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
          this.streetSheetMapComponent.centerMapOnMarker(result, streetSheet);
          this.getStreetSheets();
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

  toggleSearchBar(): void {
    this.searchBarOpen = !this.searchBarOpen;
    if (this.searchBarOpen) {
      this.dateRangeOpen = false;
      this.userSearchOpen = false;
    }
  }
  
  toggleUserSearch(): void {
    this.userSearchOpen = !this.userSearchOpen;
    if (this.userSearchOpen) {
      this.searchBarOpen = false; 
      this.dateRangeOpen = false;
    }
  }
  
  toggleDateRange(): void {
    this.dateRangeOpen = !this.dateRangeOpen;
    if (this.dateRangeOpen) {
      this.searchBarOpen = false;  
      this.userSearchOpen = false; 
    }
  }

  toggleSidePanel(sidenav: any): void {
    sidenav.toggle();
    this.sidenavOpen = !this.sidenavOpen;
  }

  getLocationFilter(): void {
    const locationSet = new Set<string>();

    this.streetSheets.forEach(streetSheet => {
      if (streetSheet.state) {
        locationSet.add(streetSheet.state);
      }
    });

    this.filteredLocations = Array.from(locationSet); 
  }

  goToLocation(location: string): void {
    this.streetSheetMapComponent.goToLocation(location);
  }

  applyDateFilter(): void {
      let filtered = this.streetSheets;

    if (this.startDate && this.endDate) {
      filtered = filtered.filter(streetSheet => {
        const streetSheetDate = new Date(streetSheet.date);
        return streetSheetDate >= this.startDate && streetSheetDate <= this.endDate;
      });
    }
    this.filteredStreetSheets = filtered;
  }

  removeFilter(): void {
    this.filteredStreetSheets = this.streetSheets;
  }

  getUniqueCreatedByUsers(): void {
    const usersSet = new Set<string>();

    // Add 'createdBy' from street sheets
    this.streetSheets.forEach(streetSheet => {
      if (streetSheet.createdBy) {
        usersSet.add(streetSheet.createdBy);
      }
    });

    this.streetSheets.forEach(streetSheet => {
      streetSheet.marker.forEach(marker => {
        if (marker.createdBy) {
          usersSet.add(marker.createdBy);
        }
      });
    });

    this.uniqueCreatedByUsers = Array.from(usersSet); 
  }

  applyUserFilter(): void {
    if (this.filterUser === '') {
      this.filteredStreetSheets = this.streetSheets; 
    } else {
      this.filteredStreetSheets = this.streetSheets.filter(streetSheet =>
        streetSheet.createdBy?.toLowerCase().includes(this.filterUser.toLowerCase()) ||
        streetSheet.marker.some((marker: MapMarker) => 
          marker.createdBy?.toLowerCase().includes(this.filterUser.toLowerCase())
        )
      );
    }
  }
  
  

  applyFilter() {
    if (this.filterText.trim() === '') {
      this.filteredStreetSheets = this.streetSheets;
    } else {
      this.filteredStreetSheets = this.streetSheets.filter(streetSheet =>
        streetSheet.segmentId.toLowerCase().includes(this.filterText.toLowerCase()) ||
        streetSheet.streetAddress.toLowerCase().includes(this.filterText.toLowerCase()) ||
        streetSheet.city.toLowerCase().includes(this.filterText.toLowerCase()) ||
        streetSheet.state.toLowerCase().includes(this.filterText.toLowerCase())
      );
    }
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
