import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { MatDialog } from '@angular/material/dialog';
import { MatTabGroup } from '@angular/material/tabs';
import { Observable, Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { DashboardFilters, DashboardQuote, DashboardUser } from '../../../models/quote-workflow.model';
import { RfpIntakeFormComponent } from '../rfp-intake/rfp-intake-form.component';
import { BulkImportDialogComponent } from './bulk-import-dialog/bulk-import-dialog.component';
import * as DashboardActions from '../../../state/quotes/dashboard.actions';
import * as DashboardSelectors from '../../../state/quotes/dashboard.selectors';

@Component({
  selector: 'app-rfp-dashboard',
  templateUrl: './rfp-dashboard.component.html',
  styleUrls: ['./rfp-dashboard.component.scss']
})
export class RfpDashboardComponent implements OnInit, OnDestroy {
  @ViewChild('tabGroup') tabGroup!: MatTabGroup;

  rfpRecords$: Observable<DashboardQuote[]>;
  poTrackingRecords$: Observable<DashboardQuote[]>;
  projectTrackingRecords$: Observable<DashboardQuote[]>;
  loading$: Observable<boolean>;
  users$: Observable<DashboardUser[]>;

  selectedTabIndex = 0;

  filters: DashboardFilters = {
    customer: '',
    dateFrom: null,
    dateTo: null,
    assignedTo: '',
    phase: ''
  };

  private destroy$ = new Subject<void>();
  private customerFilter$ = new Subject<string>();

  constructor(
    private store: Store,
    private dialog: MatDialog,
    private route: ActivatedRoute
  ) {
    this.rfpRecords$ = this.store.select(DashboardSelectors.selectRfpRecords);
    this.poTrackingRecords$ = this.store.select(DashboardSelectors.selectPoTrackingRecords);
    this.projectTrackingRecords$ = this.store.select(DashboardSelectors.selectProjectTrackingRecords);
    this.loading$ = this.store.select(DashboardSelectors.selectDashboardLoading);
    this.users$ = this.store.select(DashboardSelectors.selectDashboardUsers);
  }

  ngOnInit(): void {
    this.store.dispatch(DashboardActions.loadDashboard({ filters: this.filters }));
    this.store.dispatch(DashboardActions.loadUsers());

    this.customerFilter$.pipe(
      debounceTime(400),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.dispatchFilterChange();
    });

    // Handle query params for tab navigation (from "View all items" in pipeline)
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['tab']) {
        this.selectedTabIndex = this.getTabIndex(params['tab']);
      } else if (params['status']) {
        // Map workflow statuses to appropriate tab
        const statuses = params['status'].split(',');
        this.selectedTabIndex = this.getTabFromStatuses(statuses);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onCustomerInput(): void {
    this.customerFilter$.next(this.filters.customer);
  }

  onFilterChange(): void {
    this.dispatchFilterChange();
  }

  clearFilters(): void {
    this.filters = {
      customer: '',
      dateFrom: null,
      dateTo: null,
      assignedTo: '',
      phase: ''
    };
    this.dispatchFilterChange();
  }

  onDateFromChange(event: any): void {
    this.filters.dateFrom = event.value ? event.value.toISOString() : null;
    this.dispatchFilterChange();
  }

  onDateToChange(event: any): void {
    this.filters.dateTo = event.value ? event.value.toISOString() : null;
    this.dispatchFilterChange();
  }

  getActiveFilterCount(): number {
    let count = 0;
    if (this.filters.customer) count++;
    if (this.filters.dateFrom) count++;
    if (this.filters.dateTo) count++;
    if (this.filters.assignedTo) count++;
    if (this.filters.phase) count++;
    return count;
  }

  exportToCSV(): void {
    // TODO: Implement CSV export
  }

  exportToPDF(): void {
    // TODO: Implement PDF export
  }

  openNewRfp(): void {
    const dialogRef = this.dialog.open(RfpIntakeFormComponent, {
      width: '900px',
      maxWidth: '95vw',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        // Refresh the dashboard to show the new record
        this.store.dispatch(DashboardActions.loadDashboard({ filters: this.filters }));
      }
    });
  }

  openBulkImport(): void {
    const dialogRef = this.dialog.open(BulkImportDialogComponent, {
      width: '950px',
      maxWidth: '95vw',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.imported) {
        // Refresh the dashboard after successful import
        this.store.dispatch(DashboardActions.loadDashboard({ filters: this.filters }));
      }
    });
  }

  getPoTotal(): number {
    let total = 0;
    this.poTrackingRecords$.subscribe(records => {
      total = records.reduce((sum, r) => sum + (r.poAmount || 0), 0);
    }).unsubscribe();
    return total;
  }

  getInvoicedCount(): number {
    let count = 0;
    this.projectTrackingRecords$.subscribe(records => {
      count = records.filter(r => !!r.invoiceNumber).length;
    }).unsubscribe();
    return count;
  }

  getCloseoutPendingCount(): number {
    let count = 0;
    this.projectTrackingRecords$.subscribe(records => {
      count = records.filter(r => r.jobComplete && !r.invoiceNumber).length;
    }).unsubscribe();
    return count;
  }

  private dispatchFilterChange(): void {
    this.store.dispatch(DashboardActions.updateFilters({ filters: { ...this.filters } }));
    this.store.dispatch(DashboardActions.loadDashboard({ filters: this.filters }));
  }

  private getTabIndex(tabParam: string): number {
    switch (tabParam) {
      case 'pipeline': return 0;
      case 'rfps': return 1;
      case 'po': return 2;
      case 'projects': return 3;
      default: return 0;
    }
  }

  private getTabFromStatuses(statuses: string[]): number {
    const rfpStatuses = ['Draft', 'Job_Summary_In_Progress'];
    const poStatuses = ['Quote_Assembled', 'Quote_Delivered'];
    const projectStatuses = ['Quote_Converted'];

    if (statuses.some(s => rfpStatuses.includes(s))) return 1;
    if (statuses.some(s => poStatuses.includes(s))) return 2;
    if (statuses.some(s => projectStatuses.includes(s))) return 3;
    return 1; // Default to New RFPs tab
  }
}
