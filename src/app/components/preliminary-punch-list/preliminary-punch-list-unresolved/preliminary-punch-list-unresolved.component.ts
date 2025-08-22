import { AfterViewInit, ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSort } from '@angular/material/sort';
import { PreliminaryPunchListModalComponent } from '../../modals/preliminary-punch-list-modal/preliminary-punch-list-modal.component';
import { PreliminaryPunchList } from 'src/app/models/preliminary-punch-list.model';
import { PreliminaryPunchListService, PagedResponse } from 'src/app/services/preliminary-punch-list.service';
import { BehaviorSubject, Observable } from 'rxjs';
import { MatTableDataSource } from '@angular/material/table';
import { ToastrService } from 'ngx-toastr';
import { MatPaginator } from '@angular/material/paginator';
import { AuthService } from 'src/app/services/auth.service';
import { DeleteConfirmationModalComponent } from '../../modals/delete-confirmation-modal/delete-confirmation-modal.component';
import { User } from 'src/app/models/user.model';
import { DatePipe } from '@angular/common';
import { PreliminaryPunchListResolvedComponent } from '../preliminary-punch-list-resolved/preliminary-punch-list-resolved.component';

@Component({
  selector: 'preliminary-punch-list-unresolved',
  templateUrl: './preliminary-punch-list-unresolved.component.html',
  styleUrls: ['./preliminary-punch-list-unresolved.component.scss'],
  standalone: false
})
export class PreliminaryPunchListUnresolvedComponent implements OnInit, AfterViewInit {
  public unresolvedPreliminaryPunchList$: BehaviorSubject<PreliminaryPunchList[]> =
    new BehaviorSubject<PreliminaryPunchList[]>([]);
  unresolvedPreliminaryPunchLists: PreliminaryPunchList[] = [];
  isIssueGalleryVisible = false;
  isResolutionGalleryVisible = false;
  user!: User;
  filteredData: PreliminaryPunchList[] = [];

  displayedColumns: string[] = [
    'segmentId', 'vendorName', 'streetAddress', 'city', 'state', 'issues',
    'additionalConcerns', 'createdBy', 'dateReported',
    'issueImageId', 'pmResolved', 'resolutionImageId', 'resolvedDate', 'cmResolved', 'actions'
  ];

  responsiveOptions: any[] = [
    { breakpoint: '1024px', numVisible: 3 },
    { breakpoint: '768px', numVisible: 2 },
    { breakpoint: '560px', numVisible: 1 }
  ];

  dataSource: MatTableDataSource<PreliminaryPunchList> = new MatTableDataSource<PreliminaryPunchList>();
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  @Input('PreliminaryPunchListResolvedComponent') resolvedPunchListComponent!: PreliminaryPunchListResolvedComponent;
  @Input() selectedFilters: { column: string, values: string[] }[] = [];
  @Output() unresolvedCountChange = new EventEmitter<number>();

  galleryImages: any[] = [];
  private isInitialized = false;

  constructor(
    private dialog: MatDialog,
    private punchListService: PreliminaryPunchListService,
    private toastr: ToastrService,
    public authService: AuthService,
    public datePipe: DatePipe,
    private cdRef: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getUser();
    this.punchListService.refresh$.subscribe(() => {
      this.loadUnresolvedPunchLists(this.user);
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    // fix: watch the correct @Input name
    if (changes['selectedFilters']) {
      this.applyFilters();
    }
  }

  ngAfterViewInit(): void {
    if (!this.isInitialized) {
      this.loadUnresolvedPunchLists(this.user);
      this.isInitialized = true;
    }
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadUnresolvedPunchLists(user: User): void {
    this.punchListService.getUnresolvedPunchLists(user).subscribe({
      next: (response: PagedResponse<PreliminaryPunchList>) => {
        const items = response.items ?? [];

        // clone + normalize
        const results = items.map(p => ({
          ...p,
          issues: (p.issues || []).map(issue => ({ ...issue }))
        }));

        // keep date fields as Date objects; add optional display fields if you want
        for (const pl of results) {
          pl.dateReported = new Date((pl.dateReported as any) + 'Z');
          if (pl.resolvedDate) {
            pl.resolvedDate = new Date((pl.resolvedDate as any) + 'Z');
          }
          (pl as any).dateReportedDisplay =
            this.datePipe.transform(pl.dateReported as Date, 'MM/dd/yy hh:mm a', 'America/Denver') ?? '';
          (pl as any).resolvedDateDisplay =
            pl.resolvedDate
              ? this.datePipe.transform(pl.resolvedDate as Date, 'MM/dd/yy hh:mm a', 'America/Denver') ?? ''
              : '';
        }

        // dedupe by id
        const deduped = results.filter((item, index, self) =>
          index === self.findIndex(t => t.id === item.id)
        );

        // push into subject + table
        this.unresolvedPreliminaryPunchList$.next(deduped);
        this.unresolvedPreliminaryPunchLists = deduped;
        this.dataSource.data = this.filterData(deduped);

        if (this.selectedFilters?.length) {
          this.applyFilters();
        }

        this.updateUnresolvedCount();
      },
      error: (err) => {
        this.toastr.error('Error fetching unresolved punch lists', err);
      }
    });
  }

  updateUnresolvedCount(): void {
    if (this.dataSource.filter) {
      this.unresolvedCountChange.emit(this.dataSource.filteredData.length);
    } else {
      this.unresolvedCountChange.emit(this.dataSource.data.length);
    }
  }

  filterData(data: PreliminaryPunchList[]): PreliminaryPunchList[] {
    const userVendor = this.user.company?.trim().toLowerCase();
    const userMarket = this.user.market?.trim().toLowerCase();

    return data.filter(p => {
      const listVendor = p.vendorName?.trim().toLowerCase();
      const listMarket = p.state?.trim().toLowerCase();

      if (this.user.role === 'PM') {
        return listVendor === userVendor && listMarket === userMarket;
      }
      if (this.user.role === 'CM' && userMarket !== 'rg') {
        return listMarket === userMarket;
      }
      return true;
    });
  }

  openModal(data?: PreliminaryPunchList): void {
    const dialogRef = this.dialog.open(PreliminaryPunchListModalComponent, {
      width: '600px',
      data: data || null
    });

    dialogRef.afterClosed().subscribe((result: PreliminaryPunchList) => {
      if (!result) return;

      const punchList = result;
      let action$: Observable<any>;
      if (punchList.updatedBy) {
        action$ = this.punchListService.updateEntry(punchList);
      } else {
        action$ = this.punchListService.addEntry(punchList);
      }

      action$.subscribe({
        next: () => {
          this.toastr.success('Punch List saved');
          this.punchListService.triggerRefresh();
        },
        error: () => {
          this.toastr.error('Error saving Punch List.');
        }
      });
    });
  }

  refreshPunchLists(): void {
    this.loadUnresolvedPunchLists(this.user);
    this.punchListService.getResolvedPunchLists(this.user).subscribe(); // kick off other cache if needed
  }

  editReport(report: PreliminaryPunchList): void {
    this.openModal(report);
  }

  openDeleteConfirmationDialog(report: PreliminaryPunchList): void {
    const dialogRef = this.dialog.open(DeleteConfirmationModalComponent);
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.removeReport(report);
    });
  }

  removeReport(report: PreliminaryPunchList): void {
    const idx = this.dataSource.data.findIndex(item => item.id === report.id);
    if (idx === -1) return;

    this.dataSource.data.splice(idx, 1);
    this.dataSource.data = [...this.dataSource.data];

    this.punchListService.removeEntry(report.id).subscribe({
      next: () => {
        this.toastr.success('Punch List entry deleted');
        this.updateUnresolvedCount();
      },
      error: (error) => {
        this.toastr.error(error.error, 'Error');
      }
    });
  }

  rejectResolution(punchList: PreliminaryPunchList): void {
    const updatedPunchList: PreliminaryPunchList = {
      ...punchList,
      dateReported: punchList.dateReported instanceof Date
        ? punchList.dateReported
        : new Date(punchList.dateReported as any),
      pmResolved: false,
      resolvedDate: null
    };

    this.punchListService.updateEntry(updatedPunchList).subscribe({
      next: () => {
        this.refreshPunchLists();
        this.toastr.success(`Resolution Rejected. Sent back to ${punchList.vendorName}`);
      },
      error: (err) => {
        console.error('Reject resolution failed:', err);
        this.toastr.error('Failed to reject resolution');
      }
    });
  }

  // Use current BehaviorSubject value instead of subscribing to it repeatedly
  refreshTable(): void {
    const entries = this.unresolvedPreliminaryPunchList$.value || [];
    const updatedData = this.filterData(entries);
    this.dataSource.data = updatedData;
    this.updateUnresolvedCount();
  }

  openGallery(imageType: 'issueImages' | 'resolutionImages', images: string[]): void {
    this.galleryImages = images.map(img => ({ itemImageSrc: img }));
    if (imageType === 'issueImages') {
      this.isIssueGalleryVisible = true;
    } else {
      this.isResolutionGalleryVisible = true;
    }
  }

  closeImageModal(): void {
    this.isIssueGalleryVisible = false;
    this.isResolutionGalleryVisible = false;
  }

  searchFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value.trim().toLowerCase();

    this.dataSource.filterPredicate = (data: PreliminaryPunchList, filter: string) => {
      const transformedFilter = filter.trim().toLowerCase();
      const dataStr = `${data.segmentId} ${data.vendorName} ${data.streetAddress} ${data.city} ${data.state} ${data.createdBy} ${data.cmResolved} ${data.pmResolved}`.toLowerCase();
      return dataStr.includes(transformedFilter);
    };

    this.dataSource.filter = filterValue;
    this.updateUnresolvedCount();
  }

  applyFilters(): void {
    const entries = this.unresolvedPreliminaryPunchList$.value || [];
    let updatedData = this.filterData(entries);

    this.selectedFilters.forEach(filter => {
      if (filter.column === 'dateReported') {
        const startDateObj = new Date(filter.values[0]);
        const endDateObj = new Date(filter.values[1]);
        updatedData = updatedData.filter(p => {
          const d = new Date(p.dateReported as any);
          return d >= startDateObj && d <= endDateObj;
        });
      } else if (filter.column === 'resolvedDate') {
        const startDateObj = new Date(filter.values[0]);
        const endDateObj = new Date(filter.values[1]);
        updatedData = updatedData.filter(p => {
          if (!p.resolvedDate) return false;
          const d = new Date(p.resolvedDate as any);
          return d >= startDateObj && d <= endDateObj;
        });
      } else if (filter.column && filter.values) {
        if (Array.isArray(filter.values)) {
          updatedData = updatedData.filter(p =>
            filter.values.some(val =>
              (p[filter.column as keyof PreliminaryPunchList] ?? '')
                .toString()
                .toLowerCase()
                .includes(val.toLowerCase())
            )
          );
        } else {
          updatedData = updatedData.filter(p =>
            (p[filter.column as keyof PreliminaryPunchList] ?? '')
              .toString()
              .toLowerCase()
              .includes((filter.values as any).toLowerCase())
          );
        }
      }
    });

    this.filteredData = updatedData;
    this.dataSource.data = this.filteredData;
    this.updateUnresolvedCount();
  }

  clearAll(): void {
    this.selectedFilters = [];
    const entries = this.unresolvedPreliminaryPunchList$.value || [];
    const updatedData = this.filterData(entries);
    this.dataSource.data = updatedData;
    this.updateUnresolvedCount();
  }
}
