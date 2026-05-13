/**
 * Exception List Component
 * 
 * Displays exceptions for a deployment with status, type, and justification.
 * Supports filtering and provides a button to request new exceptions.
 * 
 * Requirements: 7.1, 7.2, 3.11
 */

import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// PrimeNG imports
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';

// Models
import { ExceptionDto, ExceptionStatus } from '../../models/exception.model';
import { PaginationMetadata } from '../../models/common.model';

// State
import * as ExceptionActions from '../../state/exceptions/exception.actions';
import * as ExceptionSelectors from '../../state/exceptions/exception.selectors';
import { ExceptionFilters } from '../../state/exceptions/exception.state';

// Components
import { ExceptionRequestComponent } from './exception-request.component';

@Component({
  selector: 'app-exception-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    DropdownModule,
    ProgressSpinnerModule,
    MessageModule,
    TooltipModule,
    TagModule,
    ExceptionRequestComponent
  ],
  templateUrl: './exception-list.component.html',
  styleUrls: ['./exception-list.component.scss']
})
export class ExceptionListComponent implements OnInit, OnDestroy {
  @Input() deploymentId?: string;

  // Observables from store
  exceptions$: Observable<ExceptionDto[]>;
  loading$: Observable<boolean>;
  error$: Observable<string | null>;
  pagination$: Observable<PaginationMetadata | null>;
  filters$: Observable<ExceptionFilters>;

  // Local state
  exceptions: ExceptionDto[] = [];
  loading = false;
  error: string | null = null;
  pagination: PaginationMetadata | null = null;
  filters: ExceptionFilters = {};

  // Filter options
  statusOptions = [
    { label: 'All Statuses', value: null },
    { label: 'Pending', value: ExceptionStatus.PENDING },
    { label: 'Approved', value: ExceptionStatus.APPROVED },
    { label: 'Denied', value: ExceptionStatus.DENIED },
    { label: 'Expired', value: ExceptionStatus.EXPIRED }
  ];

  selectedStatus: ExceptionStatus | null = null;

  // Enums for template
  ExceptionStatus = ExceptionStatus;

  // Dialog state
  showRequestDialog = false;

  private destroy$ = new Subject<void>();

  constructor(
    private store: Store,
    private router: Router
  ) {
    // Initialize observables
    this.exceptions$ = this.store.select(ExceptionSelectors.selectAllExceptions);
    this.loading$ = this.store.select(ExceptionSelectors.selectExceptionsLoading);
    this.error$ = this.store.select(ExceptionSelectors.selectExceptionsError);
    this.pagination$ = this.store.select(ExceptionSelectors.selectPagination);
    this.filters$ = this.store.select(ExceptionSelectors.selectFilters);
  }

  ngOnInit(): void {
    // Subscribe to store observables
    this.exceptions$
      .pipe(takeUntil(this.destroy$))
      .subscribe(exceptions => this.exceptions = exceptions);

    this.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => this.loading = loading);

    this.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => this.error = error);

    this.pagination$
      .pipe(takeUntil(this.destroy$))
      .subscribe(pagination => this.pagination = pagination);

    this.filters$
      .pipe(takeUntil(this.destroy$))
      .subscribe(filters => {
        this.filters = filters;
        this.selectedStatus = filters.status || null;
      });

    // Load exceptions
    this.loadExceptions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load exceptions based on current filters
   */
  loadExceptions(): void {
    if (this.deploymentId) {
      // Load exceptions for specific deployment
      this.store.dispatch(ExceptionActions.loadExceptions({
        deploymentId: this.deploymentId,
        page: 1,
        pageSize: 50
      }));
    } else {
      // Load all exceptions with current filters - requires deploymentId
      // This is a fallback that shouldn't happen in normal flow
      console.warn('Exception list requires deploymentId');
    }
  }

  /**
   * Handle status filter change
   */
  onStatusFilterChange(): void {
    this.store.dispatch(ExceptionActions.setExceptionFilters({
      filters: {
        ...this.filters,
        status: this.selectedStatus || undefined,
        deploymentId: this.deploymentId
      }
    }));
    this.loadExceptions();
  }

  /**
   * Handle page change
   */
  onPageChange(event: any): void {
    const page = event.first / event.rows + 1;
    const pageSize = event.rows;
    
    if (this.deploymentId) {
      this.store.dispatch(ExceptionActions.loadExceptions({
        deploymentId: this.deploymentId,
        page,
        pageSize
      }));
    } else {
      console.warn('Exception list requires deploymentId for pagination');
    }
  }

  /**
   * Open request exception dialog
   */
  onRequestException(): void {
    this.showRequestDialog = true;
  }

  /**
   * Close request exception dialog
   */
  onCloseRequestDialog(): void {
    this.showRequestDialog = false;
  }

  /**
   * Handle exception request submitted
   */
  onExceptionRequested(): void {
    this.showRequestDialog = false;
    this.loadExceptions();
  }

  /**
   * View exception details
   */
  onViewException(exception: ExceptionDto): void {
    this.store.dispatch(ExceptionActions.selectException({ id: exception.id }));
    // Navigate to exception detail if needed
    console.log('View exception:', exception.id);
  }

  /**
   * Retry loading exceptions after error
   */
  onRetry(): void {
    this.loadExceptions();
  }

  /**
   * Get severity class for status tag
   */
  getStatusSeverity(status: ExceptionStatus): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case ExceptionStatus.PENDING:
        return 'warn';
      case ExceptionStatus.APPROVED:
        return 'success';
      case ExceptionStatus.DENIED:
        return 'danger';
      case ExceptionStatus.EXPIRED:
        return 'secondary';
      default:
        return 'secondary';
    }
  }

  /**
   * Format status label for display
   */
  formatStatusLabel(status: ExceptionStatus): string {
    return status.charAt(0) + status.slice(1).toLowerCase();
  }

  /**
   * Format date for display
   */
  formatDate(date: Date | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  }

  /**
   * Check if exception is expired
   */
  isExpired(exception: ExceptionDto): boolean {
    if (!exception.expiresAt) return false;
    return new Date(exception.expiresAt) < new Date();
  }

  /**
   * Get total records for pagination
   */
  getTotalRecords(): number {
    return this.pagination?.totalCount || this.exceptions.length;
  }

  /**
   * Get rows per page
   */
  getRowsPerPage(): number {
    return this.pagination?.pageSize || 10;
  }

  /**
   * Get first record index
   */
  getFirst(): number {
    if (!this.pagination) return 0;
    return (this.pagination.currentPage - 1) * this.pagination.pageSize;
  }
}
