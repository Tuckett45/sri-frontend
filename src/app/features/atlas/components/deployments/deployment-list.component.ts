/**
 * Deployment List Component
 *
 * Displays a paginated, filterable table of Atlas deployments.
 * Dispatches NgRx actions and subscribes to the deployment slice of state.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.9, 3.11
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// PrimeNG
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';

// Models
import { DeploymentDto, DeploymentType } from '../../models/deployment.model';
import { LifecycleState } from '../../models/approval.model';

// State
import * as DeploymentActions from '../../state/deployments/deployment.actions';
import * as DeploymentSelectors from '../../state/deployments/deployment.selectors';

@Component({
  selector: 'app-deployment-list',
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
    ToastModule,
    InputTextModule
  ],
  templateUrl: './deployment-list.component.html',
  styleUrls: ['./deployment-list.component.scss']
})
export class DeploymentListComponent implements OnInit, OnDestroy {
  deployments: DeploymentDto[] = [];
  loading = false;
  error: string | null = null;
  totalCount = 0;
  pageSize = 25;
  currentPage = 1;
  sortField = 'updatedAt';
  sortOrder = -1;

  // Filter state
  searchTerm = '';
  selectedState: string | null = null;
  selectedType: string | null = null;
  assignedToMe = false;

  readonly stateOptions = Object.values(LifecycleState).map((s) => ({
    label: s.replace(/_/g, ' '),
    value: s
  }));

  readonly typeOptions = Object.values(DeploymentType).map((t) => ({
    label: t,
    value: t
  }));

  private destroy$ = new Subject<void>();

  constructor(private store: Store, private router: Router) {}

  ngOnInit(): void {
    this.store
      .select(DeploymentSelectors.selectAllDeployments)
      .pipe(takeUntil(this.destroy$))
      .subscribe((d) => (this.deployments = d));

    this.store
      .select(DeploymentSelectors.selectDeploymentsLoading)
      .pipe(takeUntil(this.destroy$))
      .subscribe((l) => (this.loading = l));

    this.store
      .select(DeploymentSelectors.selectDeploymentsError)
      .pipe(takeUntil(this.destroy$))
      .subscribe((e) => (this.error = e));

    this.store
      .select(DeploymentSelectors.selectDeploymentPagination)
      .pipe(takeUntil(this.destroy$))
      .subscribe((p) => {
        if (p) this.totalCount = p.totalCount;
      });

    this.loadDeployments();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDeployments(): void {
    this.store.dispatch(
      DeploymentActions.loadDeployments({
        filters: {
          state: this.selectedState ?? undefined,
          type: this.selectedType ?? undefined,
          search: this.searchTerm || undefined,
          assignedToMe: this.assignedToMe || undefined
        }
      })
    );
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.loadDeployments();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadDeployments();
  }

  toggleAssignedToMe(): void {
    this.assignedToMe = !this.assignedToMe;
    this.onFilterChange();
  }

  hasActiveFilters(): boolean {
    return !!(this.searchTerm || this.selectedState || this.selectedType || this.assignedToMe);
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedState = null;
    this.selectedType = null;
    this.assignedToMe = false;
    this.store.dispatch(DeploymentActions.clearDeploymentFilters());
    this.loadDeployments();
  }

  onPageChange(event: any): void {
    this.currentPage = event.page + 1;
    this.loadDeployments();
  }

  onSort(event: any): void {
    this.sortField = event.field;
    this.sortOrder = event.order;
  }

  onRetry(): void {
    this.loadDeployments();
  }

  onRowClick(deployment: DeploymentDto): void {
    this.router.navigate(['/atlas/deployments', deployment.id]);
  }

  onViewDeployment(deployment: DeploymentDto): void {
    this.router.navigate(['/atlas/deployments', deployment.id]);
  }

  onEditDeployment(deployment: DeploymentDto): void {
    this.router.navigate(['/atlas/deployments', deployment.id, 'edit']);
  }

  onCreateDeployment(): void {
    this.router.navigate(['/atlas/deployments/new']);
  }

  getStateSeverity(
    state: LifecycleState
  ): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (state) {
      case LifecycleState.DRAFT:
        return 'secondary';
      case LifecycleState.SUBMITTED:
      case LifecycleState.INTAKE_REVIEW:
      case LifecycleState.PLANNING:
        return 'info';
      case LifecycleState.READY:
        return 'success';
      case LifecycleState.IN_PROGRESS:
      case LifecycleState.EXECUTION_COMPLETE:
      case LifecycleState.QA_REVIEW:
        return 'warn';
      case LifecycleState.APPROVED_FOR_CLOSEOUT:
      case LifecycleState.CLOSED:
        return 'success';
      case LifecycleState.ON_HOLD:
        return 'warn';
      case LifecycleState.CANCELLED:
      case LifecycleState.REWORK_REQUIRED:
        return 'danger';
      default:
        return 'secondary';
    }
  }

  formatStateLabel(state: LifecycleState): string {
    return state.replace(/_/g, ' ');
  }

  formatDate(date: Date | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  }
}
