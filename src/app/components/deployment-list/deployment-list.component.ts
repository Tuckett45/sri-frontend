import { 
  Component, 
  OnInit, 
  OnDestroy, 
  ChangeDetectionStrategy, 
  ChangeDetectorRef,
  ViewChild,
  AfterViewInit,
  TrackByFunction
} from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subject, BehaviorSubject, combineLatest, timer } from 'rxjs';
import { 
  takeUntil, 
  debounceTime, 
  distinctUntilChanged, 
  switchMap, 
  startWith,
  tap,
  catchError,
  map
} from 'rxjs/operators';
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { 
  CachedDeploymentService, 
  DeploymentListItem, 
  DeploymentQueryParams,
  DeploymentPerformanceService 
} from '../../services/cached-deployment.service';

@Component({
  selector: 'app-deployment-list',
  templateUrl: './deployment-list.component.html',
  styleUrls: ['./deployment-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeploymentListComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild(CdkVirtualScrollViewport) viewport!: CdkVirtualScrollViewport;

  // Form and filtering
  filterForm: FormGroup;
  
  // Data streams
  deployments$ = this.deploymentService.deployments$;
  loading$ = this.deploymentService.loading$;
  error$ = this.deploymentService.error$;
  
  // Pagination and virtual scrolling
  private readonly pageSize = 50;
  private readonly itemHeight = 80; // Height of each deployment item in pixels
  
  // Performance tracking
  private readonly destroy$ = new Subject<void>();
  private lastLoadTime = 0;
  
  // Filter options (could be loaded from API)
  statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'Planned', label: 'Planned' },
    { value: 'InProgress', label: 'In Progress' },
    { value: 'Complete', label: 'Complete' },
    { value: 'OnHold', label: 'On Hold' }
  ];
  
  dataCenterOptions = [
    { value: '', label: 'All Data Centers' },
    { value: 'DC1', label: 'Data Center 1' },
    { value: 'DC2', label: 'Data Center 2' },
    { value: 'DC3', label: 'Data Center 3' }
  ];
  
  vendorOptions = [
    { value: '', label: 'All Vendors' },
    { value: 'Vendor1', label: 'Vendor 1' },
    { value: 'Vendor2', label: 'Vendor 2' },
    { value: 'Vendor3', label: 'Vendor 3' }
  ];

  // Current state
  currentPage = 1;
  totalItems = 0;
  deployments: DeploymentListItem[] = [];
  
  // Performance metrics
  cacheStats$ = timer(0, 30000).pipe( // Update every 30 seconds
    map(() => this.deploymentService.getCacheStats()),
    startWith({ size: 0, hitRate: 0 })
  );

  constructor(
    private fb: FormBuilder,
    private deploymentService: CachedDeploymentService,
    private performanceService: DeploymentPerformanceService,
    private cdr: ChangeDetectorRef
  ) {
    this.filterForm = this.createFilterForm();
  }

  ngOnInit(): void {
    this.setupFilterSubscription();
    this.setupAutoRefresh();
    this.loadInitialData();
  }

  ngAfterViewInit(): void {
    this.setupVirtualScrolling();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * TrackBy function for ngFor optimization
   */
  trackByDeploymentId: TrackByFunction<DeploymentListItem> = (index, item) => item.id;

  /**
   * Refresh deployments data
   */
  refresh(): void {
    const startTime = performance.now();
    const params = this.getQueryParams();
    
    this.deploymentService.refreshDeployments(params).pipe(
      takeUntil(this.destroy$),
      tap(response => {
        this.totalItems = response.total;
        this.deployments = response.rows;
        this.performanceService.recordOperation('refresh', startTime);
        this.cdr.markForCheck();
      }),
      catchError(error => {
        console.error('Failed to refresh deployments:', error);
        this.performanceService.recordOperation('refresh-error', startTime);
        throw error;
      })
    ).subscribe();
  }

  /**
   * Load more data for infinite scrolling
   */
  loadMore(): void {
    if (this.deployments.length >= this.totalItems) {
      return; // No more data to load
    }

    const startTime = performance.now();
    const nextPage = Math.floor(this.deployments.length / this.pageSize) + 1;
    const params = { ...this.getQueryParams(), page: nextPage };
    
    this.deploymentService.getDeployments(params).pipe(
      takeUntil(this.destroy$),
      tap(response => {
        // Append new items to existing list
        this.deployments = [...this.deployments, ...response.rows];
        this.totalItems = response.total;
        this.performanceService.recordOperation('load-more', startTime);
        this.cdr.markForCheck();
      }),
      catchError(error => {
        console.error('Failed to load more deployments:', error);
        this.performanceService.recordOperation('load-more-error', startTime);
        throw error;
      })
    ).subscribe();
  }

  /**
   * Get performance metrics for debugging
   */
  getPerformanceMetrics(): any {
    return {
      averageResponseTime: this.performanceService.getAverageResponseTime(),
      cacheHitRate: this.performanceService.getCacheHitRate(),
      totalOperations: this.performanceService.getMetrics().length
    };
  }

  clearFilters(): void {
    this.filterForm.reset({
      status: '',
      vendor: '',
      dataCenter: '',
      dateFrom: '',
      dateTo: '',
      search: ''
    });
    // Trigger reload with cleared filters
    this.currentPage = 1;
    this.deployments = [];
    this.loadInitialData();
  }

  formatDate(value?: string | Date | null): string {
    if (!value) {
      return 'N/A';
    }
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString();
  }

  getStatusClass(status: string): string {
    switch ((status || '').toLowerCase()) {
      case 'planned':
        return 'status-planned';
      case 'inprogress':
      case 'in progress':
        return 'status-in-progress';
      case 'complete':
        return 'status-complete';
      case 'onhold':
      case 'on hold':
        return 'status-on-hold';
      default:
        return 'status-default';
    }
  }

  getProgressClass(value: number | null | undefined): string {
    const pct = typeof value === 'number' ? value : 0;
    if (pct >= 80) return 'progress-high';
    if (pct >= 50) return 'progress-medium';
    return 'progress-low';
  }

  // Private methods

  private createFilterForm(): FormGroup {
    return this.fb.group({
      status: [''],
      vendor: [''],
      dataCenter: [''],
      dateFrom: [''],
      dateTo: [''],
      search: ['']
    });
  }

  private setupFilterSubscription(): void {
    this.filterForm.valueChanges.pipe(
      takeUntil(this.destroy$),
      debounceTime(300), // Debounce user input
      distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
      tap(() => {
        this.currentPage = 1;
        this.deployments = []; // Clear existing data
      }),
      switchMap(() => {
        const startTime = performance.now();
        const params = this.getQueryParams();
        
        return this.deploymentService.getDeployments(params).pipe(
          tap(response => {
            this.totalItems = response.total;
            this.deployments = response.rows;
            this.performanceService.recordOperation('filter', startTime);
            this.cdr.markForCheck();
          }),
          catchError(error => {
            console.error('Failed to filter deployments:', error);
            this.performanceService.recordOperation('filter-error', startTime);
            throw error;
          })
        );
      })
    ).subscribe();
  }

  private setupAutoRefresh(): void {
    // Auto-refresh every 5 minutes
    timer(5 * 60 * 1000, 5 * 60 * 1000).pipe(
      takeUntil(this.destroy$),
      switchMap(() => {
        const params = this.getQueryParams();
        return this.deploymentService.refreshDeployments(params);
      }),
      tap(response => {
        this.totalItems = response.total;
        this.deployments = response.rows;
        this.cdr.markForCheck();
      }),
      catchError(error => {
        console.warn('Auto-refresh failed:', error);
        return [];
      })
    ).subscribe();
  }

  private setupVirtualScrolling(): void {
    if (!this.viewport) return;

    // Load more data when scrolling near the end
    this.viewport.elementScrolled().pipe(
      takeUntil(this.destroy$),
      debounceTime(200),
      tap(() => {
        const end = this.viewport.getRenderedRange().end;
        const total = this.viewport.getDataLength();
        
        // Load more when within 10 items of the end
        if (end >= total - 10) {
          this.loadMore();
        }
      })
    ).subscribe();
  }

  private loadInitialData(): void {
    const startTime = performance.now();
    const params = this.getQueryParams();
    
    this.deploymentService.getDeployments(params).pipe(
      takeUntil(this.destroy$),
      tap(response => {
        this.totalItems = response.total;
        this.deployments = response.rows;
        this.performanceService.recordOperation('initial-load', startTime);
        this.cdr.markForCheck();
      }),
      catchError(error => {
        console.error('Failed to load initial data:', error);
        this.performanceService.recordOperation('initial-load-error', startTime);
        throw error;
      })
    ).subscribe();
  }

  private getQueryParams(): DeploymentQueryParams {
    const formValue = this.filterForm.value;
    const params: DeploymentQueryParams = {
      page: this.currentPage,
      pageSize: this.pageSize
    };

    if (formValue.status) params.status = formValue.status;
    if (formValue.vendor) params.vendor = formValue.vendor;
    if (formValue.dataCenter) params.dataCenter = formValue.dataCenter;
    if (formValue.dateFrom) params.from = formValue.dateFrom;
    if (formValue.dateTo) params.to = formValue.dateTo;

    return params;
  }
}
