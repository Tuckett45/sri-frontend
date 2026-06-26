import { Component, OnInit, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { MatDialog } from '@angular/material/dialog';
import { Observable, Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { DashboardFilters, DashboardQuote, DashboardUser } from '../../../models/quote-workflow.model';
import { RfpIntakeFormComponent } from '../rfp-intake/rfp-intake-form.component';
import * as DashboardActions from '../../../state/quotes/dashboard.actions';
import * as DashboardSelectors from '../../../state/quotes/dashboard.selectors';

@Component({
  selector: 'app-rfp-dashboard',
  templateUrl: './rfp-dashboard.component.html',
  styleUrls: ['./rfp-dashboard.component.scss']
})
export class RfpDashboardComponent implements OnInit, OnDestroy {
  rfpRecords$: Observable<DashboardQuote[]>;
  poTrackingRecords$: Observable<DashboardQuote[]>;
  projectTrackingRecords$: Observable<DashboardQuote[]>;
  loading$: Observable<boolean>;
  users$: Observable<DashboardUser[]>;

  filters: DashboardFilters = {
    customer: '',
    dateFrom: null,
    dateTo: null,
    assignedTo: '',
    phase: ''
  };

  private destroy$ = new Subject<void>();
  private customerFilter$ = new Subject<string>();

  constructor(private store: Store, private dialog: MatDialog) {
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
    this.dialog.open(RfpIntakeFormComponent, {
      width: '900px',
      maxWidth: '95vw',
      disableClose: true
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
}
