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
import { marker } from 'leaflet';

@Component({
  selector: 'app-street-sheet',
  templateUrl: './street-sheet.component.html',
  styleUrls: ['./street-sheet.component.scss'],
  standalone: false
})
export class StreetSheetComponent implements OnInit, AfterViewInit {
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
  locationOpen: boolean = false;
  user!: User;
  startDate!: Date;
  endDate!: Date;

  pmOptions: User[] = [];
  filteredStreetSheets: StreetSheet[] = [];
  filteredMapMarkers: MapMarker[] = [];
  filterText: string = '';
  filterUser: string = '';
  filterLocation: string = '';
  filterSheetsByLocation: string = '';
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

  ngAfterViewInit() {
    this.streetSheetMapComponent;
  }

  getStreetSheets() {
    this.streetSheetService.getStreetSheets(this.user).subscribe(streetSheets => {
        forkJoin(
            streetSheets.map((sheet: StreetSheet) =>
                this.mapMarkerService.getMapMarkersForStreetSheet(sheet.id).pipe(
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
  
  getReversedAddress(marker: MapMarker): Promise<any> {
    return this.geocodingService.reverseGeocode(marker.latitude, marker.longitude).toPromise()
        .then(suggestion => {
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

            return this.reversedAddresses[marker.id];
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
          this.streetSheetMapComponent.addMarker(this.mapMarker, result);
          this.getStreetSheets();
          this.streetSheetMapComponent.centerMapOnMarker(result.marker[0], result);
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
      this.streetSheetMapComponent.loadStreetSheets(); 
    });
  }

  selectStreetSheet(streetSheet: StreetSheet): void {
    this.selectedStreetSheet = streetSheet;
    this.streetSheetMapComponent.centerMapOnStreetSheet(streetSheet); 
  }

  selectMarker(marker: MapMarker, streetSheet: StreetSheet, sidenav: any): void {
    this.toggleSidePanel(sidenav);
    this.selectedMarker = marker;
    this.streetSheetMapComponent.centerMapOnMarker(marker, streetSheet);
  }

  editStreetSheet(streetSheet: StreetSheet): void {
    const dialogRef = this.dialog.open(StreetSheetModalComponent, {
      width: '600px',
      data: { streetSheet: streetSheet, pmOptions: this.pmOptions }
    });
  
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.streetSheetMapComponent.addMarker(result.marker, result);
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
          this.streetSheetMapComponent.addMarker(result, streetSheet);
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
      streetSheet.marker.forEach(marker => {
        this.streetSheetMapComponent.removeMarker(marker);
      })
      this.toastr.success('Street sheet entry deleted');
      this.getStreetSheets();
    },
    (error) => {
      this.toastr.error(error.error, 'Error');
    });
  }

  editMarker(marker: MapMarker): void {
  }

  openDeleteConfirmationDialogMapMarker(marker: MapMarker): void {
    const dialogRef = this.dialog.open(DeleteConfirmationModalComponent);
    
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.deleteMarker(marker);
      }
    });
  }

  deleteMarker(marker: MapMarker): void {
    this.mapMarkerService.deleteMapMarker(marker).subscribe(() => {
      this.mapMarkers = this.mapMarkers.filter(marker => marker.id !== marker.id);
      this.streetSheetMapComponent.removeMarker(marker);
      this.toastr.success('Map Marker deleted');
    },
    (error) => {
      this.toastr.error(error.error, 'Error');
    });
  }

  toggleSearchBar(): void {
    this.searchBarOpen = !this.searchBarOpen;
    if (this.searchBarOpen) {
      this.dateRangeOpen = false;
      this.userSearchOpen = false;
      this.locationOpen = false;
    }
  }
  
  toggleUserSearch(): void {
    this.userSearchOpen = !this.userSearchOpen;
    if (this.userSearchOpen) {
      this.searchBarOpen = false; 
      this.dateRangeOpen = false;
      this.locationOpen = false;
    }
  }
  
  toggleDateRange(): void {
    this.dateRangeOpen = !this.dateRangeOpen;
    if (this.dateRangeOpen) {
      this.searchBarOpen = false;  
      this.userSearchOpen = false; 
      this.locationOpen = false;
    }
  }

  toggleLocation(): void {
    this.locationOpen = !this.locationOpen;
    if (this.locationOpen) {
      this.searchBarOpen = false;  
      this.userSearchOpen = false; 
      this.dateRangeOpen = false;
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

  removeFilter(): void {
    this.filteredStreetSheets = this.streetSheets;
  }

  getUniqueCreatedByUsers(): void {
    const usersSet = new Set<string>();
    this.streetSheets.forEach(streetSheet => {
      if (streetSheet.createdBy) {
        usersSet.add(streetSheet.createdBy);
      }
    });

    this.uniqueCreatedByUsers = Array.from(usersSet); 
  }
  
  applyFilters(): void {
    let filteredStreetSheets = this.streetSheets;
  
    if (this.startDate && this.endDate) {
      filteredStreetSheets = filteredStreetSheets.filter(streetSheet => {
        const streetSheetDate = new Date(streetSheet.date);
        return streetSheetDate >= this.startDate && streetSheetDate <= this.endDate;
      });
    }
  
    if (this.filterUser) {
      filteredStreetSheets = filteredStreetSheets.filter(streetSheet =>
        streetSheet.createdBy?.toLowerCase().includes(this.filterUser.toLowerCase()) ||
        streetSheet.marker.some((marker: MapMarker) => 
          marker.createdBy?.toLowerCase().includes(this.filterUser.toLowerCase())
        )
      );
    }
  
    if (this.filterSheetsByLocation) {
      filteredStreetSheets = filteredStreetSheets.filter(streetSheet =>
        streetSheet.state.toLowerCase().includes(this.filterSheetsByLocation.toLowerCase())
      );
    }
  
    if (this.filterText.trim() !== '') {
      filteredStreetSheets = filteredStreetSheets.filter(streetSheet =>
        streetSheet.segmentId.toLowerCase().includes(this.filterText.toLowerCase()) ||
        streetSheet.streetAddress.toLowerCase().includes(this.filterText.toLowerCase()) ||
        streetSheet.city.toLowerCase().includes(this.filterText.toLowerCase()) ||
        streetSheet.state.toLowerCase().includes(this.filterText.toLowerCase())
      );
    }

    this.filteredStreetSheets = filteredStreetSheets;
  }
  
}
