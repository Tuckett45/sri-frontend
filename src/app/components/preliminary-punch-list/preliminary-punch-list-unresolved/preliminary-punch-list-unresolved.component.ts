import {
  AfterViewInit,
  Component,
  EventEmitter,
  Input,
  OnInit,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSort } from '@angular/material/sort';
import { PreliminaryPunchListModalComponent } from '../../modals/preliminary-punch-list-modal/preliminary-punch-list-modal.component';
import { PreliminaryPunchList } from 'src/app/models/preliminary-punch-list.model';
import { PreliminaryPunchListService } from 'src/app/services/preliminary-punch-list.service';
import { BehaviorSubject, Observable, Subject, Subscription } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { MatTableDataSource } from '@angular/material/table';
import { ToastrService } from 'ngx-toastr';
import { MatPaginator } from '@angular/material/paginator';
import { AuthService } from 'src/app/services/auth.service';
import { DeleteConfirmationModalComponent } from '../../modals/delete-confirmation-modal/delete-confirmation-modal.component';
import { User } from 'src/app/models/user.model';
import { DatePipe } from '@angular/common';
import { PreliminaryPunchListResolvedComponent } from '../preliminary-punch-list-resolved/preliminary-punch-list-resolved.component';

// Mirror of the parent's params bag (kept local to avoid cross-file deps)
type ChildSearchParams = {
  term?: string;
  resolved: 'resolved' | 'unresolved';
  state?: string | null;
  company?: string | null;
  segmentIdsCsv?: string;
  vendorsCsv?: string;
  statesCsv?: string;
  dateReportedStart?: string | Date | null;
  dateReportedEnd?: string | Date | null;
  resolvedStart?: string | Date | null;
  resolvedEnd?: string | Date | null;
  page?: number;
  pageSize?: number;
};

@Component({
  selector: 'preliminary-punch-list-unresolved',
  templateUrl: './preliminary-punch-list-unresolved.component.html',
  styleUrls: ['./preliminary-punch-list-unresolved.component.scss'],
  standalone: false
})
export class PreliminaryPunchListUnresolvedComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {
  public unresolvedPreliminaryPunchList$: BehaviorSubject<PreliminaryPunchList[]> =
    new BehaviorSubject<PreliminaryPunchList[]>([]);
  unresolvedPreliminaryPunchLists: PreliminaryPunchList[] = [];
  isIssueGalleryVisible = false;
  isResolutionGalleryVisible = false;
  user!: User;

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

  total = 0;
  pageSize = 25;
  pageIndex = 0; // 0-based
  searchTerm = '';

  private destroy$ = new Subject<void>();
  private activeSub?: Subscription;
  private requestSeq = 0;

  // Inputs/Outputs
  @Input('PreliminaryPunchListResolvedComponent') resolvedPunchListComponent!: PreliminaryPunchListResolvedComponent;
  @Input() selectedFilters: { column: string, values: string[] }[] = [];
  @Input() searchParams?: ChildSearchParams; // combined filters from parent (optional)
  @Output() unresolvedCountChange = new EventEmitter<number>();

  galleryImages: any[] = [];
  private isInitialized = false;

  constructor(
    private dialog: MatDialog,
    private punchListService: PreliminaryPunchListService,
    private toastr: ToastrService,
    public authService: AuthService,
    public datePipe: DatePipe
  ) {}

  // -------- Helpers --------
  private norm = (s?: string | null) => (s ?? '').replace(/\u00A0/g, ' ').replace(/\t/g, ' ').trim();
  private normUpper = (s?: string | null) => this.norm(s).toUpperCase();
  private toIsoDate(d: any): string | null {
    if (!d) return null;
    const dt = d instanceof Date ? d : new Date(d);
    return isNaN(dt.getTime()) ? null : dt.toISOString();
  }

  private getVals(col: string): string[] {
    return (this.selectedFilters.find(f => f.column === col)?.values ?? []).slice();
  }

  private normalizeDate(value: any): Date | null {
    if (value == null) return null;
    const d = value instanceof Date ? value : new Date(value);
    return isNaN(d.getTime()) ? null : new Date(d.getTime());
  }

  /** Build unified params for the API. If parent provided searchParams, merge/override. */
  private buildUnifiedParams(pageNumber: number, pageSize: number) {
    // Derive from local filters by default
    const segCsv    = this.getVals('segmentId').map(v => this.norm(v)).filter(Boolean).join(',');
    const vendCsv   = this.getVals('vendorName').map(v => this.norm(v)).filter(Boolean).join(',');
    const statesCsv = this.getVals('state').map(v => this.normUpper(v)).filter(Boolean).join(',');

    const dr = this.getVals('dateReported');
    const rz = this.getVals('resolvedDate');

    // Role/market scoping (optional; mirrors prior behavior)
    let roleState: string | null = null;
    let roleCompany: string | null = null;
    const market = this.user?.market ? this.normUpper(this.user.market) : '';
    const company = this.user?.company ? this.norm(this.user.company) : '';
    if (this.user?.role === 'PM') {
      roleState = market || null;
      roleCompany = company || null;
    } else if (this.user?.role === 'CM' && market !== 'RG') {
      roleState = market || null;
    }

    // Base from local
    let req: ChildSearchParams = {
      term: this.searchTerm || '',
      resolved: 'unresolved',
      state: roleState,
      company: roleCompany,
      segmentIdsCsv: segCsv || undefined,
      vendorsCsv: vendCsv || undefined,
      statesCsv: statesCsv || undefined,
      dateReportedStart: this.toIsoDate(dr[0]),
      dateReportedEnd:   this.toIsoDate(dr[1]),
      resolvedStart:     this.toIsoDate(rz[0]),
      resolvedEnd:       this.toIsoDate(rz[1]),
      page: pageNumber,
      pageSize
    };

    // If parent provided a params bag, override with its values
    if (this.searchParams) {
      req = {
        ...req,
        ...this.searchParams,
        resolved: 'unresolved',
        page: pageNumber,
        pageSize
      };
      // Normalize date types to ISO strings
      req.dateReportedStart = this.toIsoDate(req.dateReportedStart);
      req.dateReportedEnd   = this.toIsoDate(req.dateReportedEnd);
      req.resolvedStart     = this.toIsoDate(req.resolvedStart);
      req.resolvedEnd       = this.toIsoDate(req.resolvedEnd);
    }

    return req;
  }

  ngOnInit(): void {
    this.user = this.authService.getUser();
    this.punchListService.refresh$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadUnresolvedPunchLists(this.user, this.pageIndex, this.pageSize));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedFilters'] || changes['searchParams']) {
      this.applyFilters();
    }
  }

  ngAfterViewInit(): void {
    if (!this.isInitialized) {
      this.loadUnresolvedPunchLists(this.user, this.pageIndex, this.pageSize);
      this.isInitialized = true;
    }
    this.dataSource.sort = this.sort;
  }

  ngOnDestroy(): void {
    this.activeSub?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadUnresolvedPunchLists(user: User, pageNumber: number = 0, pageSize: number = 25): void {
    const reqId = ++this.requestSeq;       // bump request id
    this.activeSub?.unsubscribe();         // cancel previous in-flight call

    const req = this.buildUnifiedParams(pageNumber, pageSize);

    this.activeSub = this.punchListService.searchPunchLists(req as any)
      .pipe(takeUntil(this.destroy$), finalize(() => { /* optional: stop spinner */ }))
      .subscribe({
        next: (response: any) => {
          // Ignore stale responses
          if (reqId !== this.requestSeq) return;

          const respPage = Number(response?.page ?? pageNumber);
          const respSize = Number(response?.pageSize ?? pageSize);
          this.pageIndex = isNaN(respPage) ? pageNumber : Math.max(0, respPage);
          this.pageSize  = isNaN(respSize) ? pageSize : respSize;

          this.total = Number(
            response?.total ?? response?.totalCount ?? response?.count ??
            response?.Total ?? response?.TotalCount ?? 0
          );
          this.unresolvedCountChange.emit(this.total);

          const items: PreliminaryPunchList[] = Array.isArray(response) ? response : (response?.items ?? []);
          const results = items.map(p => ({
            ...p,
            issues: (p.issues || []).map(issue => ({ ...issue }))
          }));

          // Normalize dates
          for (const pl of results) {
            const dr = this.normalizeDate(pl.dateReported as any); if (dr) pl.dateReported = dr;
            const rd = this.normalizeDate(pl.resolvedDate as any); if (rd) pl.resolvedDate = rd;
            (pl as any).dateReportedDisplay =
              pl.dateReported ? this.datePipe.transform(pl.dateReported as Date, 'MM/dd/yy hh:mm a', 'America/Denver') ?? '' : '';
            (pl as any).resolvedDateDisplay =
              pl.resolvedDate ? this.datePipe.transform(pl.resolvedDate as Date, 'MM/dd/yy hh:mm a', 'America/Denver') ?? '' : '';
          }

          this.unresolvedPreliminaryPunchLists = results;
          this.unresolvedPreliminaryPunchList$.next(results);
          this.dataSource.data = results; // trust server order
        },
        error: () => this.toastr.error('Error fetching unresolved punch lists')
      });
  }

  // -------- Paging --------
  onPage(event: any): void {
    this.pageIndex = event.pageIndex; // 0-based
    this.pageSize = event.pageSize;
    this.loadUnresolvedPunchLists(this.user, this.pageIndex, this.pageSize);
  }

  updateUnresolvedCount(): void {
    this.unresolvedCountChange.emit(this.total);
  }

  // -------- Search box (server-side) --------
  searchFilter(event: Event): void {
    const val = (event.target as HTMLInputElement).value?.trim() ?? '';
    this.searchTerm = val;

    // Keep unified params in sync with search box
    if (this.searchParams) this.searchParams = { ...this.searchParams, term: val };

    this.pageIndex = 0;
    try { this.paginator?.firstPage?.(); } catch {}
    this.loadUnresolvedPunchLists(this.user, this.pageIndex, this.pageSize);
  }

  // -------- Client-side fallback scoping (only when not searching/filtering) --------
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

  // -------- CRUD + UI helpers --------
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
    this.loadUnresolvedPunchLists(this.user, this.pageIndex, this.pageSize);
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

  // Use current BehaviorSubject value instead of subscribing repeatedly
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

  // -------- Parent hooks --------
  applyFilters(): void {
    this.pageIndex = 0;
    try { this.paginator?.firstPage?.(); } catch {}
    this.loadUnresolvedPunchLists(this.user, this.pageIndex, this.pageSize);
  }

  /** Called by parent when it builds a new combined params bag */
  applyFiltersWithParams(params?: ChildSearchParams): void {
    if (params) this.searchParams = params;
    this.applyFilters();
  }

  clearAll(): void {
    this.selectedFilters = [];
    this.searchParams = undefined; // clear unified params if parent requests clear
    this.searchTerm = '';
    this.pageIndex = 0;
    try { this.paginator?.firstPage?.(); } catch {}
    this.loadUnresolvedPunchLists(this.user, this.pageIndex, this.pageSize);
  }
}
