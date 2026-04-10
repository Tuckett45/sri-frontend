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

export interface PunchListSearchParams {
  term?: string;
  resolved: 'resolved' | 'unresolved';
  // role/legacy scope
  state?: string | null;
  company?: string | null;
  // multi-selects packed for API
  segmentIdsCsv?: string;
  vendorsCsv?: string;
  statesCsv?: string;
  // date windows (ISO strings)
  dateReportedStart?: string | null;
  dateReportedEnd?: string | null;
  resolvedStart?: string | null;
  resolvedEnd?: string | null;
  // (optional if you want stronger typing when passing through)
  page?: number;
  pageSize?: number;
}

@Component({
  selector: 'preliminary-punch-list-resolved',
  templateUrl: './preliminary-punch-list-resolved.component.html',
  styleUrls: ['./preliminary-punch-list-resolved.component.scss'],
  standalone: false
})
export class PreliminaryPunchListResolvedComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {
  public resolvedPreliminaryPunchList$ = new BehaviorSubject<PreliminaryPunchList[]>([]);
  resolvedPreliminaryPunchLists: PreliminaryPunchList[] = [];
  isIssueGalleryVisible = false;
  isResolutionGalleryVisible = false;
  user!: User;

  displayedColumns: string[] = [
    'segmentId','vendorName','streetAddress','city','state','issues',
    'additionalConcerns','createdBy','dateReported',
    'issueImageId','pmResolved','resolutionImageId','resolvedDate','cmResolved','actions'
  ];

  responsiveOptions: any[] = [
    { breakpoint: '1024px', numVisible: 3 },
    { breakpoint: '768px', numVisible: 2 },
    { breakpoint: '560px', numVisible: 1 }
  ];

  dataSource: MatTableDataSource<PreliminaryPunchList> = new MatTableDataSource();
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  total = 0;
  pageSize = 25;
  pageIndex = 0; // 0-based
  searchTerm = '';

  @Input() selectedFilters: { column: string, values: string[] }[] = [];
  @Input() searchParams?: PunchListSearchParams;   // parent can push fully-formed params
  @Output() resolvedCountChange = new EventEmitter<number>();

  galleryImages: any[] = [];
  private isInitialized = false;

  // request/rx management
  private destroy$ = new Subject<void>();
  private activeSub?: Subscription;
  private requestSeq = 0;

  constructor(
    private dialog: MatDialog,
    private punchListService: PreliminaryPunchListService,
    private toastr: ToastrService,
    public authService: AuthService,
    public datePipe: DatePipe
  ) {}

  // ---------- helpers ----------
  private norm = (s?: string | null) => (s ?? '').replace(/\u00A0/g, ' ').replace(/\t/g, ' ').trim();
  private normUpper = (s?: string | null) => this.norm(s).toUpperCase();
  private toIsoDate(d: any): string | null {
    if (!d) return null;
    const dt = d instanceof Date ? d : new Date(d);
    return isNaN(dt.getTime()) ? null : dt.toISOString();
  }
  private normalizeDate(value: any): Date | null {
    if (value == null) return null;
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : new Date(value.getTime());
    }
    // API returns UTC dates — ensure the string is parsed as UTC
    let str = String(value).trim();
    if (str && !str.endsWith('Z') && !(/[+-]\d{2}:\d{2}$/).test(str)) {
      str += 'Z';
    }
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : new Date(d.getTime());
  }
  private getFilterValues(col: string): string[] {
    return (this.selectedFilters.find(f => f.column === col)?.values ?? []).slice();
  }

  ngOnInit(): void {
    this.user = this.authService.getUser();
    this.punchListService.refresh$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadResolvedPunchLists(this.pageIndex, this.pageSize));
  }

  ngAfterViewInit(): void {
    if (!this.isInitialized) {
      this.loadResolvedPunchLists(this.pageIndex, this.pageSize);
      this.isInitialized = true;
    }
    this.dataSource.sort = this.sort;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedFilters'] || changes['searchParams']) {
      this.applyFilters();
    }
  }

  ngOnDestroy(): void {
    this.activeSub?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Build params either from parent-provided searchParams or from selectedFilters + searchTerm
  private buildParams(): PunchListSearchParams {
    if (this.searchParams) {
      // Parent already normalized and set role scope; just ensure resolved scope and return.
      return { ...this.searchParams, resolved: 'resolved' };
    }

    // Fallback: derive from this component’s inputs
    const segCsv    = this.getFilterValues('segmentId').map(v => this.norm(v)).filter(Boolean).join(',');
    const vendCsv   = this.getFilterValues('vendorName').map(v => this.norm(v)).filter(Boolean).join(',');
    const statesCsv = this.getFilterValues('state').map(v => this.normUpper(v)).filter(Boolean).join(',');

    // Date chips (if parent encodes ranges as [start, end])
    const drVals = this.getFilterValues('dateReported');
    const rzVals = this.getFilterValues('resolvedDate');

    // Role/market scoping (optional – mirrors earlier UI behavior)
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

    return {
      term: this.searchTerm || '',
      resolved: 'resolved',
      state: roleState,
      company: roleCompany,
      segmentIdsCsv: segCsv || undefined,
      vendorsCsv: vendCsv || undefined,
      statesCsv: statesCsv || undefined,
      dateReportedStart: this.toIsoDate(drVals[0]) ?? null,
      dateReportedEnd:   this.toIsoDate(drVals[1]) ?? null,
      resolvedStart:     this.toIsoDate(rzVals[0]) ?? null,
      resolvedEnd:       this.toIsoDate(rzVals[1]) ?? null
    };
  }

  // Always call the unified search API so server handles paging + combined filters
  private loadResolvedPunchLists(pageNumber: number = 0, pageSize: number = 25): void {
    const reqId = ++this.requestSeq;          // start a new sequence
    this.activeSub?.unsubscribe();            // cancel previous in-flight

    const params = this.buildParams();

    this.activeSub = this.punchListService.searchPunchLists({
      ...params,
      resolved: 'resolved',
      page: pageNumber,      // service translates to pageNumber query (0-based)
      pageSize
    } as any)
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
        this.resolvedCountChange.emit(this.total);

        const items: PreliminaryPunchList[] = Array.isArray(response)
          ? response
          : (response?.items ?? []);

        const results = items.map(p => ({
          ...p,
          issues: (p.issues || []).map(issue => ({ ...issue }))
        }));

        // Normalize dates for display
        for (const pl of results) {
          const dr = this.normalizeDate(pl.dateReported as any); if (dr) pl.dateReported = dr;
          const rd = this.normalizeDate(pl.resolvedDate as any); if (rd) pl.resolvedDate = rd;
          (pl as any).dateReportedDisplay =
            pl.dateReported ? this.datePipe.transform(pl.dateReported as Date, 'MM/dd/yy hh:mm a') ?? '' : '';
          (pl as any).resolvedDateDisplay =
            pl.resolvedDate ? this.datePipe.transform(pl.resolvedDate as Date, 'MM/dd/yy hh:mm a') ?? '' : '';
        }

        this.resolvedPreliminaryPunchLists = results;
        this.resolvedPreliminaryPunchList$.next(results);
        this.dataSource.data = results;
      },
      error: () => this.toastr.error('Error fetching resolved punch lists')
    });
  }

  // -------- UI actions --------
  openModal(data?: PreliminaryPunchList): void {
    const dialogRef = this.dialog.open(PreliminaryPunchListModalComponent, { width: '600px', data: data || null });
    dialogRef.afterClosed().subscribe((result: PreliminaryPunchList) => {
      if (!result) return;
      const action$: Observable<any> = result.updatedBy
        ? this.punchListService.updateEntry(result)
        : this.punchListService.addEntry(result);

      action$.subscribe({
        next: () => { this.toastr.success('Punch List saved'); this.punchListService.triggerRefresh(); },
        error: () => this.toastr.error('Error saving Punch List.')
      });
    });
  }

  refreshPunchLists(): void {
    this.loadResolvedPunchLists(this.pageIndex, this.pageSize);
  }

  openDeleteConfirmationDialog(report: PreliminaryPunchList): void {
    const dialogRef = this.dialog.open(DeleteConfirmationModalComponent);
    dialogRef.afterClosed().subscribe(ok => { if (ok) this.removeReport(report); });
  }

  removeReport(report: PreliminaryPunchList): void {
    const idx = this.dataSource.data.findIndex(item => item.id === report.id);
    if (idx === -1) return;
    this.dataSource.data.splice(idx, 1);
    this.dataSource.data = [...this.dataSource.data];
    this.punchListService.removeEntry(report.id).subscribe({
      next: () => this.toastr.success('Punch List entry deleted'),
      error: (err) => this.toastr.error(err.error, 'Error')
    });
  }

  openGallery(imageType: 'issueImages' | 'resolutionImages', images: string[]): void {
    this.galleryImages = images.map(img => ({ itemImageSrc: img }));
    this.isIssueGalleryVisible = imageType === 'issueImages';
    this.isResolutionGalleryVisible = imageType === 'resolutionImages';
  }
  closeImageModal(): void {
    this.isIssueGalleryVisible = false;
    this.isResolutionGalleryVisible = false;
  }

  // Search box (server-side). Also sync into unified params if present.
  searchFilter(event: Event): void {
    this.searchTerm = (event.target as HTMLInputElement).value.trim();
    if (this.searchParams) this.searchParams = { ...this.searchParams, term: this.searchTerm };
    this.pageIndex = 0;
    try { this.paginator?.firstPage?.(); } catch {}
    this.loadResolvedPunchLists(0, this.pageSize);
  }

  applyFilters(): void {
    this.pageIndex = 0;
    try { this.paginator?.firstPage?.(); } catch {}
    this.loadResolvedPunchLists(0, this.pageSize);
  }

  /** Called by parent when it builds a new combined params bag */
  applyFiltersWithParams(params?: PunchListSearchParams): void {
    if (params) this.searchParams = params;
    this.applyFilters();
  }

  clearAll(): void {
    this.selectedFilters = [];
    this.searchParams = undefined;
    this.searchTerm = '';
    this.pageIndex = 0;
    try { this.paginator?.firstPage?.(); } catch {}
    this.loadResolvedPunchLists(0, this.pageSize);
  }

  onPage(event: any): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadResolvedPunchLists(this.pageIndex, this.pageSize);
  }

  editReport(report: PreliminaryPunchList): void {
    this.openModal(report);
  }
}
