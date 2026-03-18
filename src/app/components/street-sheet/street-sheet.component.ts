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

interface CmDashboardRow {
  user: Partial<User>;
  sheetCount: number;
  lastSubmitted?: Date;
}

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
  vendorOptions: string[] = [];
  pmNameOptions: string[] = [];
  marketOptions: string[] = [];

  @ViewChild(StreetSheetMapComponent) streetSheetMapComponent!: StreetSheetMapComponent;
  dataSource: MatTableDataSource<StreetSheet> = new MatTableDataSource();

  // Dashboard state
  isAdmin = false;
  tabIndex = 0;
  dashboardStartDate!: Date;
  dashboardEndDate!: Date;
  dashboardVendorFilter = '';
  dashboardPmFilter = '';
  dashboardMarketFilter = '';
  dashboardCmFilter = '';
  dashboardStreetSheets: StreetSheet[] = [];
  cmsWithEntries: CmDashboardRow[] = [];
  cmsWithoutEntries: CmDashboardRow[] = [];
  cmUsers: User[] = [];
  dashboardMetrics = { total: 0, withEntries: 0, withoutEntries: 0, lastRefreshed: new Date() };
  showDashboardFilters = true;
  pageSize = 5;
  pageIndex = 0;
  submittedPageSize = 5;
  submittedPageIndex = 0;
  missingPageSize = 5;
  missingPageIndex = 0;
  sortField: keyof StreetSheet | '' = '';
  sortDirection: 'asc' | 'desc' = 'asc';

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
    this.isAdmin = this.user?.role === 'Admin';
    this.dashboardStartDate = this.startOfDay(new Date());
    this.dashboardEndDate = this.endOfDay(new Date());
    if (this.isAdmin) {
      this.loadCmUsers();
    } else if (this.user) {
      this.cmUsers = [this.user];
    }
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
            const filteredStreetSheets = results.map((result: any) => {
                    result.sheet.marker = result.mapMarkers;
                    result.sheet.marker.forEach((marker: MapMarker) => {
                        this.getReversedAddress(marker).then((reversedAddress) => {
                            this.reversedAddresses[marker.id] = reversedAddress;
                            this.streetSheetMapComponent.addMarker(marker, result.sheet)
                        });
                    })
                    return result.sheet;
                });

            this.streetSheets = filteredStreetSheets;
            this.filteredStreetSheets = this.streetSheets;
            this.getLocationFilter();
            this.getUniqueCreatedByUsers();
            this.refreshLookupOptions();
            this.refreshDashboardData();
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
        })
        .catch(() => {
            const fallback = this.reversedAddresses[marker.id];
            if (fallback) {
                return fallback;
            }

            return {
                street: '',
                city: '',
                state: ''
            };
        });
  }

  createStreetSheet(): void {
      const dialogRef = this.dialog.open(StreetSheetModalComponent, {
        width: '600px',
        data: { pmOptions: this.pmOptions }
      });
  
      dialogRef.afterClosed().subscribe((result: StreetSheet) => {
        if (result) {
          // Refresh the street sheets list to show the new entry
          this.getStreetSheets();
        }
      });
  }

  fetchPMOptions(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.authService.getUserByRole('PM').subscribe({
        next: (users) => {
          this.pmOptions = users;
          this.pmNameOptions = users.map(pm => pm.name).filter(name => !!name);
          resolve(users);
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  }

  private loadCmUsers(): void {
    this.authService.getUserByRole('CM').subscribe({
      next: users => {
        this.cmUsers = users || [];
        this.setMarketOptions();
        this.refreshDashboardData();
      },
      error: () => {
        this.cmUsers = [];
      }
    });
  }

  updateStreetSheet(updatedStreetSheet: StreetSheet): void {
    this.streetSheetService.updateStreetSheet(updatedStreetSheet).subscribe(result => {
      this.streetSheetMapComponent.loadStreetSheets(); 
    });
  }

  selectStreetSheet(streetSheet: StreetSheet): void {
    if (!streetSheet) {
      return;
    }
    this.selectedStreetSheet = streetSheet;
    this.streetSheetMapComponent.centerMapOnStreetSheet(streetSheet); 
    this.streetSheetMapComponent.openStreetSheetPopup(streetSheet);
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

  private refreshLookupOptions(): void {
    const vendors = new Set<string>();
    const markets = new Set<string>(this.marketOptions.map(m => m.toUpperCase()));

    this.streetSheets.forEach(streetSheet => {
      if (streetSheet.vendorName) {
        vendors.add(streetSheet.vendorName);
      }
      if (streetSheet.state) {
        markets.add((streetSheet.state || '').toUpperCase());
      }
    });

    this.cmUsers.forEach(user => {
      if (user.market) {
        markets.add((user.market || '').toUpperCase());
      }
    });

    this.vendorOptions = Array.from(vendors);
    this.marketOptions = Array.from(markets);
  }

  private setMarketOptions(): void {
    const markets = new Set<string>(this.marketOptions.map(m => m.toUpperCase()));
    this.cmUsers.forEach(cm => {
      if (cm.market) {
        markets.add(cm.market.toUpperCase());
      }
    });
    this.marketOptions = Array.from(markets);
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
    if (this.startDate && this.endDate) {
      this.streetSheetMapComponent.clearAllMapMarkers();
      this.streetSheetService.getStreetSheets(this.user, this.startDate, this.endDate).subscribe(streetSheets => {
        forkJoin(
            streetSheets.map((sheet: StreetSheet) =>
                this.mapMarkerService.getMapMarkersForStreetSheet(sheet.id).pipe(
                    map((mapMarkers: MapMarker[]) => ({ sheet, mapMarkers }))
                )
            )
        ).subscribe(results => {
            const filteredStreetSheets = results.map((result: any) => {
                    result.sheet.marker = result.mapMarkers;
                    result.sheet.marker.forEach((marker: MapMarker) => {
                        this.getReversedAddress(marker).then((reversedAddress) => {
                            this.reversedAddresses[marker.id] = reversedAddress;
                            this.streetSheetMapComponent.addMarker(marker, result.sheet)
                        });
                    })
                    return result.sheet;
                });

            this.streetSheets = filteredStreetSheets;
            this.filteredStreetSheets = this.streetSheets;
            this.getLocationFilter();
            this.getUniqueCreatedByUsers();
            this.refreshLookupOptions();
            this.refreshDashboardData();
        });
    });
    } else {
      this.applyLocalFilters();
    }
  }
  
  applyLocalFilters(): void {
    let filteredStreetSheets = this.streetSheets;
  
    if (this.filterUser) {
      filteredStreetSheets = filteredStreetSheets.filter(streetSheet =>
        streetSheet.createdBy?.toLowerCase().includes(this.filterUser.toLowerCase()) ||
        streetSheet.marker?.some((marker: MapMarker) =>
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

  applyDashboardFilters(): void {
    this.dashboardStreetSheets = this.applyDashboardFiltersInternal();
    this.pageIndex = 0;
    this.submittedPageIndex = 0;
    this.missingPageIndex = 0;
    this.sortDashboardSheets();
    this.loadCmStats();
  }

  onDashboardDateChange(): void {
    if (this.dashboardStartDate) {
      this.dashboardStartDate = this.startOfDay(this.dashboardStartDate);
    }
    if (this.dashboardEndDate) {
      this.dashboardEndDate = this.endOfDay(this.dashboardEndDate);
    }
    this.pageIndex = 0;
    this.submittedPageIndex = 0;
    this.missingPageIndex = 0;
    this.applyDashboardFilters();
  }

  clearDashboardFilters(): void {
    this.dashboardVendorFilter = '';
    this.dashboardPmFilter = '';
    this.dashboardMarketFilter = '';
    this.dashboardCmFilter = '';
    this.dashboardStartDate = this.startOfDay(new Date());
    this.dashboardEndDate = this.endOfDay(new Date());
    this.pageIndex = 0;
    this.submittedPageIndex = 0;
    this.missingPageIndex = 0;
    this.applyDashboardFilters();
  }

  toggleDashboardFilters(): void {
    this.showDashboardFilters = !this.showDashboardFilters;
  }

  private refreshDashboardData(): void {
    this.dashboardStreetSheets = this.applyDashboardFiltersInternal();
    this.sortDashboardSheets();
    this.loadCmStats();
  }

  private applyDashboardFiltersInternal(): StreetSheet[] {
    if (!this.streetSheets) {
      return [];
    }
    let filtered = [...this.streetSheets];

    if (!this.isAdmin && this.user) {
      filtered = filtered.filter(sheet => this.sheetCreatedByUser(sheet, this.user));
    }

    filtered = filtered.filter(streetSheet =>
      this.isWithinRange(streetSheet.date, this.dashboardStartDate, this.dashboardEndDate)
    );

    if (this.dashboardVendorFilter) {
      filtered = filtered.filter(sheet => (sheet.vendorName || '').toLowerCase() === this.dashboardVendorFilter.toLowerCase());
    }

    if (this.dashboardPmFilter) {
      filtered = filtered.filter(sheet => (sheet.pm || '').toLowerCase() === this.dashboardPmFilter.toLowerCase());
    }

    if (this.dashboardMarketFilter) {
      filtered = filtered.filter(sheet => (sheet.state || '').toLowerCase() === this.dashboardMarketFilter.toLowerCase());
    }

    if (this.dashboardCmFilter) {
      const cm = this.cmUsers.find(user => user.id === this.dashboardCmFilter);
      if (cm) {
        filtered = filtered.filter(sheet => this.sheetCreatedByUser(sheet, cm));
      }
    }

    return filtered;
  }

  private loadCmStats(): void {
    if (this.isAdmin && this.dashboardStartDate && this.dashboardEndDate) {
      const filters = {
        market: this.dashboardMarketFilter || undefined,
        vendor: this.dashboardVendorFilter || undefined,
        pm: this.dashboardPmFilter || undefined,
        cmId: this.dashboardCmFilter || undefined
      };

      this.streetSheetService.getCmSubmissionStats(this.dashboardStartDate, this.dashboardEndDate, filters).subscribe({
        next: stats => {
          const submitted = stats?.submittedCms || [];
          const notSubmitted = stats?.notSubmittedCms || [];

          this.cmsWithEntries = submitted.map((cm: any) => ({
            user: { id: cm.id, name: cm.name, market: cm.market },
            sheetCount: cm.sheetCount ?? 1,
            lastSubmitted: cm.lastSubmitted ? new Date(cm.lastSubmitted) : undefined
          }));

          this.cmsWithoutEntries = (notSubmitted as any[]).map((cm: any) => ({
            user: { id: cm.id, name: cm.name, market: cm.market },
            sheetCount: 0
          }));

          this.mergeCmOptionsFromStats([...submitted, ...notSubmitted]);

          const withCount = stats?.submittedCount ?? this.cmsWithEntries.length;
          const withoutCount = stats?.notSubmittedCount ?? this.cmsWithoutEntries.length;
          const totalSheets = stats?.totalSheetCount ?? this.dashboardStreetSheets.length;

          this.submittedPageIndex = 0;
          this.missingPageIndex = 0;

          // Merge PMs returned from stats (if present) into the PM filter options
          if (Array.isArray(stats?.pms)) {
            const merged = new Set<string>(this.pmNameOptions);
            stats.pms.filter((p: string) => !!p).forEach((p: string) => merged.add(p));
            this.pmNameOptions = Array.from(merged);
          }

          this.dashboardMetrics = {
            total: totalSheets,
            withEntries: withCount,
            withoutEntries: withoutCount,
            lastRefreshed: new Date()
          };
        },
        error: () => {
          this.computeCmMetrics();
        }
      });
      return;
    }
    this.computeCmMetrics();
  }

  changeSort(field: keyof StreetSheet): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.sortDashboardSheets();
  }

  private sortDashboardSheets(): void {
    if (!this.sortField) {
      return;
    }
    const dir = this.sortDirection === 'asc' ? 1 : -1;
    this.dashboardStreetSheets = [...this.dashboardStreetSheets].sort((a, b) => {
      const field = this.sortField as keyof StreetSheet;
      const aVal = this.getSortableValue(a, field);
      const bVal = this.getSortableValue(b, field);
      if (aVal < bVal) { return -1 * dir; }
      if (aVal > bVal) { return 1 * dir; }
      return 0;
    });
  }

  private getSortableValue(sheet: StreetSheet, field: keyof StreetSheet): any {
    const val = (sheet as any)[field];
    if (field === 'date') {
      const d = this.toDate(val);
      return d ? d.getTime() : 0;
    }
    return (val ?? '').toString().toLowerCase();
  }

  get pagedDashboardStreetSheets(): StreetSheet[] {
    const start = this.pageIndex * this.pageSize;
    return this.dashboardStreetSheets.slice(start, start + this.pageSize);
  }

  get pageCount(): number {
    return this.dashboardStreetSheets.length
      ? Math.ceil(this.dashboardStreetSheets.length / this.pageSize)
      : 1;
  }

  nextPage(): void {
    if ((this.pageIndex + 1) < this.pageCount) {
      this.pageIndex += 1;
    }
  }

  prevPage(): void {
    if (this.pageIndex > 0) {
      this.pageIndex -= 1;
    }
  }

  get pagedMissing(): CmDashboardRow[] {
    const start = this.missingPageIndex * this.missingPageSize;
    return this.cmsWithoutEntries.slice(start, start + this.missingPageSize);
  }

  get missingPageCount(): number {
    return this.cmsWithoutEntries.length
      ? Math.ceil(this.cmsWithoutEntries.length / this.missingPageSize)
      : 1;
  }

  nextMissingPage(): void {
    if ((this.missingPageIndex + 1) < this.missingPageCount) {
      this.missingPageIndex += 1;
    }
  }

  prevMissingPage(): void {
    if (this.missingPageIndex > 0) {
      this.missingPageIndex -= 1;
    }
  }

  get pagedSubmitted(): CmDashboardRow[] {
    const start = this.submittedPageIndex * this.submittedPageSize;
    return this.cmsWithEntries.slice(start, start + this.submittedPageSize);
  }

  get submittedPageCount(): number {
    return this.cmsWithEntries.length
      ? Math.ceil(this.cmsWithEntries.length / this.submittedPageSize)
      : 1;
  }

  nextSubmittedPage(): void {
    if ((this.submittedPageIndex + 1) < this.submittedPageCount) {
      this.submittedPageIndex += 1;
    }
  }

  prevSubmittedPage(): void {
    if (this.submittedPageIndex > 0) {
      this.submittedPageIndex -= 1;
    }
  }

  private computeCmMetrics(): void {
    if (!this.isAdmin) {
      return;
    }

    const cmPool = this.filteredCmOptions;
    const sheets = this.dashboardStreetSheets;
    const withEntries: CmDashboardRow[] = [];
    const withoutEntries: CmDashboardRow[] = [];

    cmPool.forEach(cm => {
      const userSheets = sheets.filter(sheet => this.sheetCreatedByUser(sheet, cm));
      if (userSheets.length) {
        withEntries.push({
          user: cm,
          sheetCount: userSheets.length,
          lastSubmitted: this.getLatestDate(userSheets)
        });
      } else {
        withoutEntries.push({ user: cm, sheetCount: 0 });
      }
    });

    withEntries.sort((a, b) => {
      if (b.sheetCount !== a.sheetCount) {
        return b.sheetCount - a.sheetCount;
      }
      const bTime = b.lastSubmitted ? b.lastSubmitted.getTime() : 0;
      const aTime = a.lastSubmitted ? a.lastSubmitted.getTime() : 0;
      return bTime - aTime;
    });
    withoutEntries.sort((a, b) => (a.user.name || '').localeCompare(b.user.name || ''));

    this.cmsWithEntries = withEntries;
    this.cmsWithoutEntries = withoutEntries;
    this.submittedPageIndex = 0;
    this.missingPageIndex = 0;
    this.dashboardMetrics = {
      total: sheets.length,
      withEntries: withEntries.length,
      withoutEntries: withoutEntries.length,
      lastRefreshed: new Date()
    };
  }

  private mergeCmOptionsFromStats(cms: any[]): void {
    if (!Array.isArray(cms) || !cms.length) {
      return;
    }
    const existing = new Map<string, Partial<User>>();
    this.cmUsers.forEach(cm => {
      const key = (cm.id || cm.email || cm.name || '').toLowerCase();
      if (key) {
        existing.set(key, cm);
      }
    });

    cms.forEach(cm => {
      const key = (cm.id || cm.email || cm.name || '').toLowerCase();
      if (!key) {
        return;
      }
      if (!existing.has(key)) {
        existing.set(key, { id: cm.id, name: cm.name, market: cm.market });
      }
    });

    this.cmUsers = Array.from(existing.values()) as User[];
    this.setMarketOptions();
  }

  get filteredCmOptions(): User[] {
    if (!this.dashboardMarketFilter) {
      return this.cmUsers;
    }
    return this.cmUsers.filter(cm => (cm.market || '').toLowerCase() === this.dashboardMarketFilter.toLowerCase());
  }

  private sheetCreatedByUser(sheet: StreetSheet, user: Partial<User>): boolean {
    const createdBy = (sheet.createdBy || '').toLowerCase();
    return createdBy === (user.id || '').toLowerCase()
      || createdBy === (user.email || '').toLowerCase()
      || createdBy === (user.name || '').toLowerCase();
  }

  private isWithinRange(dateValue: any, start?: Date, end?: Date): boolean {
    const date = this.toDate(dateValue);
    if (!date) {
      return false;
    }

    if (start && date < this.startOfDay(start)) {
      return false;
    }
    if (end && date > this.endOfDay(end)) {
      return false;
    }
    return true;
  }

  private toDate(value: any): Date | null {
    if (!value) {
      return null;
    }
    const date = value instanceof Date ? value : new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }

  private startOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private endOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  private getLatestDate(sheets: StreetSheet[]): Date | undefined {
    const dates = sheets
      .map(sheet => this.toDate(sheet.date))
      .filter((d): d is Date => !!d)
      .map(d => d.getTime());
    if (!dates.length) {
      return undefined;
    }
    return new Date(Math.max(...dates));
  }
  
  
}
