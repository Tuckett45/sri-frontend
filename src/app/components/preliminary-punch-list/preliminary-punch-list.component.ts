import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PreliminaryPunchListModalComponent } from '../modals/preliminary-punch-list-modal/preliminary-punch-list-modal.component';
import { PreliminaryPunchList } from 'src/app/models/preliminary-punch-list.model';
import { PreliminaryPunchListService } from 'src/app/services/preliminary-punch-list.service';
import { Observable } from 'rxjs';
import { MatTableDataSource } from '@angular/material/table';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/services/auth.service';
import { DeleteConfirmationModalComponent } from '../modals/delete-confirmation-modal/delete-confirmation-modal.component';
import { User } from 'src/app/models/user.model';
import { PreliminaryPunchListResolvedComponent } from './preliminary-punch-list-resolved/preliminary-punch-list-resolved.component';
import { PreliminaryPunchListUnresolvedComponent } from './preliminary-punch-list-unresolved/preliminary-punch-list-unresolved.component';

@Component({
  selector: 'app-preliminary-punch-list',
  templateUrl: './preliminary-punch-list.component.html',
  styleUrls: ['./preliminary-punch-list.component.scss'],
  standalone: false
})
export class PreliminaryPunchListComponent implements OnInit {
  preliminaryPunchList$!: Observable<PreliminaryPunchList[]>;
  isIssueGalleryVisible: boolean = false;
  isResolutionGalleryVisible: boolean = false;
  user!: User;
  activeTab: number = 0;

  selectedFilters: { column: string, values: string[] }[] = [];
  selectedFilter: { column: string, value: string[] } = { column: '', value: [] };
  selectedSegmentIds: string[] = [];
  selectedVendors: string[] = [];
  selectedStates: string[] = [];
  filteredData: PreliminaryPunchList[] = [];
  allData: PreliminaryPunchList[] = [];

  displayedColumns: string[] = [
    'segmentId', 'vendorName','streetAddress', 'city', 'state', 'issues',
    'additionalConcerns', 'createdBy', 'dateReported',
    'issueImageId', 'pmResolved', 'resolutionImageId', 'resolvedDate', 'cmResolved', 'actions'
  ];

  responsiveOptions: any[] = [
    { breakpoint: '1024px', numVisible: 3 },
    { breakpoint: '768px', numVisible: 2 },
    { breakpoint: '560px', numVisible: 1 }
  ];

  dataSource: MatTableDataSource<PreliminaryPunchList> = new MatTableDataSource();
  @ViewChild(PreliminaryPunchListUnresolvedComponent) unresolvedPunchListComponent!: PreliminaryPunchListUnresolvedComponent;
  @ViewChild(PreliminaryPunchListResolvedComponent) resolvedPunchListComponent!: PreliminaryPunchListResolvedComponent;
  @Input() unresolvedPunchListCount: number = 0;
  @Input() resolvedPunchListCount: number = 0;

  galleryImages: any[] = [];

  filterOptions = {
    segmentId: [...new Set(this.dataSource.data.map(item => item.segmentId))],
    vendorName: [...new Set(this.dataSource.data.map(item => item.vendorName))],
    state: [...new Set(this.dataSource.data.map(item => item.state))],
  };
  
  constructor(
    private dialog: MatDialog,
    private punchListService: PreliminaryPunchListService,
    private toastr: ToastrService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getUser();
    // this.loadUnresolvedPunchLists(this.user);
    this.loadPunchLists();
  }

  loadPunchLists(): void {
    this.preliminaryPunchList$ = this.punchListService.getEntries(); 
    this.preliminaryPunchList$.subscribe(data => {
      this.dataSource.data = this.filterData(data);
    });
  }

  filterData(data: PreliminaryPunchList[]): PreliminaryPunchList[] {
    let filteredData = data;

    if (this.user.role === 'PM') {
      filteredData = filteredData.filter(punchList =>
        punchList.vendorName === this.user.company && punchList.state.toUpperCase() === this.user.market);
    } else if (this.user.market && this.user.market !== 'RG') {
      filteredData = filteredData.filter(punchList => punchList.state === this.user.market);
    }
    this.populateFilterOptions(filteredData);
    return filteredData;
  }

  populateFilterOptions(data: PreliminaryPunchList[]): void {
    this.filterOptions = {
      segmentId: [...new Set(data.map(item => item.segmentId))],
      vendorName: [...new Set(data.map(item => item.vendorName))],
      state: [...new Set(data.map(item => item.state))],
    };
  }

  removeChip(filter: { column: string, value: string }): void {
    if (filter.column === 'segmentId') {
      this.selectedSegmentIds = this.selectedSegmentIds.filter(id => id !== filter.value);
    }
    else if (filter.column === 'vendorName') {
      this.selectedVendors = this.selectedVendors.filter(vendor => vendor !== filter.value);
    }
    else if (filter.column === 'state') {
      this.selectedStates = this.selectedStates.filter(state => state !== filter.value);
    }
  
    this.selectedFilters = this.selectedFilters.map(f => {
      if (f.column === filter.column) {
        f.values = f.values.filter(v => v !== filter.value);
      }
      return f;
    }).filter(f => f.values.length > 0);
  
    if (this.selectedFilters.length === 0) {
      this.selectedFilter = { column: '', value: [] }; 
      this.unresolvedPunchListComponent.clearAll();
      this.resolvedPunchListComponent.clearAll();
    }
  
    this.updateChildFilters();
  }
  
  
  clearAll() {
    this.selectedFilters = [];
    this.selectedSegmentIds = [];
    this.selectedVendors = [];
    this.selectedStates = [];
    this.selectedFilter = {column: '', value: []};
    this.unresolvedPunchListComponent.clearAll();
    this.resolvedPunchListComponent.clearAll();
  }

  onUnresolvedCountChange(count: number): void {
    this.unresolvedPunchListCount = count;
  }

  onResolvedCountChange(count: number): void {
    this.resolvedPunchListCount = count;
  }
  

  openModal(data?: PreliminaryPunchList): void {
    const dialogRef = this.dialog.open(PreliminaryPunchListModalComponent, {
      width: '600px',
      data: data || null
    });
  
    dialogRef.afterClosed().subscribe((result: PreliminaryPunchList) => {
      if (result) {
        let punchList = result;
        let action$: Observable<any>;
        
        if (punchList.updatedBy) {
          action$ = this.punchListService.updateEntry(punchList);
        } else {
          action$ = this.punchListService.addEntry(punchList);
        }
    
        action$.subscribe({
          next: () => {
            this.loadPunchLists(); 
            this.toastr.success('Punch List saved');
          },
          error: (err) => {
            this.toastr.error('Error saving Punch List.');
          }
        });
      }
    });
    
  }

  editReport(report: PreliminaryPunchList): void {
    this.openModal(report);
  }

  openDeleteConfirmationDialog(report: PreliminaryPunchList): void {
    const dialogRef = this.dialog.open(DeleteConfirmationModalComponent);
    
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.removeReport(report);
      }
    });
  }

  removeReport(report: PreliminaryPunchList): void {
    const index = this.dataSource.data.findIndex(item => item.id === report.id);
    if (index !== -1) {
        this.dataSource.data.splice(index, 1);
        this.dataSource.data = [...this.dataSource.data];
        this.punchListService.removeEntry(report.id).subscribe(
          () => {
              this.toastr.success('Punch List entry deleted');
          },
          (error) => {
            this.toastr.error(error.error, 'Error');
          }
        );
    }
  }

  refreshTable(): void {    
    const filteredEntries = this.preliminaryPunchList$; 
    filteredEntries?.subscribe(entries => {
      let updatedData = entries;
  
      if (this.user.role === 'PM') {
        updatedData = updatedData.filter(punchList =>
          punchList.vendorName === this.user.company && punchList.state === this.user.market
        );
      } else if (this.user.market !== 'RG') {
        updatedData = updatedData.filter(punchList => punchList.state === this.user.market);
      }
  
      this.dataSource.data = updatedData;
    });
  }

  openGallery(imageType: 'issueImages' | 'resolutionImages', images: string[]): void {
    this.galleryImages = images.map(img => ({
      itemImageSrc: img
    }));
  
    if(imageType == 'issueImages'){
      this.isIssueGalleryVisible = true;
    }else{
      this.isResolutionGalleryVisible = true;
    }
  }
  

  closeImageModal(): void {
    this.isIssueGalleryVisible = false;
    this.isResolutionGalleryVisible = false;
  }
  
  applyFilter(event: Event): void {
    this.resolvedPunchListComponent.searchFilter(event);
    this.unresolvedPunchListComponent.searchFilter(event);
  }

  onFilterChange(filter: { column: string, values: string[] }) {
    if (filter.values.length > 0) {
      if (filter.column === 'segmentId') {
        this.selectedSegmentIds = filter.values;
        this.addOrUpdateFilter(filter);
      } else if (filter.column === 'vendorName') {
        this.selectedVendors = filter.values;
        this.addOrUpdateFilter(filter);
      } else if (filter.column === 'state') {
        this.selectedStates = filter.values;
        this.addOrUpdateFilter(filter);
      }
    } else {
      this.selectedFilters = this.selectedFilters.filter(f => f.column !== filter.column);
      this.clearSelectedValues(filter.column);
    }
  
    this.updateChildFilters();
  }
  
  addOrUpdateFilter(filter: { column: string, values: string[] }) {
    const existingFilterIndex = this.selectedFilters.findIndex(f => f.column === filter.column);
    
    if (existingFilterIndex !== -1) {
      this.selectedFilters[existingFilterIndex].values = filter.values;
    } else {
      this.selectedFilters.push(filter);
    }
  }
  
  clearSelectedValues(column: string) {
    if (column === 'segmentId') {
      this.selectedSegmentIds = [];
    } else if (column === 'vendorName') {
      this.selectedVendors = [];
    } else if (column === 'state') {
      this.selectedStates = [];
    }
  }
  
  getChipLabel(filter: { column: string, value: any }): string {
    if (Array.isArray(filter.value)) {
      return filter.value.join(', ');
    }
    return filter.value || '';
  }

  updateChildFilters() {
    this.resolvedPunchListComponent.applyFilters();
    this.unresolvedPunchListComponent.applyFilters();
  }
}
