import { Component, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, combineLatest, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';

import { PtoRequest, RequestStatus } from '../../../models/pto.models';
import * as PtoActions from '../../../state/pto/pto.actions';
import { selectAllPtoRequests } from '../../../state/pto/pto.selectors';
import { AuthService } from '../../../../../services/auth.service';
import { PtoRequestFormComponent } from '../pto-request-form/pto-request-form.component';
import { ViewMode } from '../mixins/team-view.mixin';
import { UserRole } from '../../../../../models/role.enum';
import * as TeamRequestsActions from '../../../state/team-requests/team-requests.actions';
import {
  selectAllTeamPtoRequests,
  selectTeamPtoByDepartment,
  selectTeamPtoDepartments,
  selectTeamPtoLoading,
  selectTeamPtoError
} from '../../../state/team-requests/team-requests.selectors';

/** Roles that grant access to Team View */
const MANAGER_ROLES: string[] = [
  UserRole.Admin,
  UserRole.Manager,
  UserRole.CM,
  UserRole.PM,
  UserRole.DCOps
];

/**
 * PTO Request List Component
 *
 * Displays a list of the employee's own PTO requests with status filtering.
 * Supports filter chips for All, Pending, Approved, Rejected, and Cancelled statuses.
 * Navigates to the detail view when a row is clicked.
 *
 * For managers (Admin, Manager, CM, PM, DCOps), provides a Team View toggle
 * that shows PTO requests from all direct reports alongside the manager's own.
 *
 * Requirements: 1.1, 1.2, 2.1, 2.2, 2.4, 3.1
 */
@Component({
  selector: 'app-pto-request-list',
  templateUrl: './pto-request-list.component.html',
  styleUrls: ['./pto-request-list.component.scss']
})
export class PtoRequestListComponent implements OnInit {
  /** All filter options available */
  filterOptions: string[] = ['All', 'Pending', 'Approved', 'Rejected', 'Cancelled'];

  /** Currently active filter */
  activeFilter = 'All';

  /** Reject modal state */
  showRejectModal = false;
  rejectReason = '';
  private rejectingRequestId: string | null = null;

  /** Subject to drive filter changes */
  private filterSubject$ = new BehaviorSubject<string>('All');

  /** All requests from the store */
  requests$!: Observable<PtoRequest[]>;

  /** Filtered requests based on active filter */
  filteredRequests$!: Observable<PtoRequest[]>;

  // ─── Team View Properties (from TeamViewMixin pattern) ────────────────────────

  /** Current view mode: 'employee' (default) or 'team' */
  viewMode: ViewMode = 'employee';

  /** Whether the current user has a manager role that enables Team View */
  isManager = false;

  /** Currently selected department filter (default 'All Departments') */
  selectedDepartment = 'All Departments';

  /** Observable of available department options derived from loaded team data */
  departmentOptions$: Observable<string[]> = of([]);

  /** Observable indicating whether team data is currently loading */
  teamLoading$: Observable<boolean> = of(false);

  /** Observable containing error message if team data load failed, or null */
  teamError$: Observable<string | null> = of(null);

  /** Subject to drive department filter changes */
  private departmentSubject$ = new BehaviorSubject<string>('All Departments');

  /** Subject to drive view mode changes */
  private viewModeSubject$ = new BehaviorSubject<ViewMode>('employee');

  constructor(
    private store: Store,
    private router: Router,
    private authService: AuthService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    // Load personal PTO requests
    this.store.dispatch(PtoActions.loadRequests());
    this.requests$ = this.store.select(selectAllPtoRequests);

    // Detect manager role for team view access
    this.isManager = this._detectManagerRole();

    // Wire up team view observables if the user is a manager
    if (this.isManager) {
      this.departmentOptions$ = this.store.select(selectTeamPtoDepartments);
      this.teamLoading$ = this.store.select(selectTeamPtoLoading);
      this.teamError$ = this.store.select(selectTeamPtoError);
    }

    // Build filtered requests pipeline that responds to view mode, status filter, and department filter
    this.filteredRequests$ = combineLatest([
      this.viewModeSubject$,
      this.filterSubject$,
      this.departmentSubject$
    ]).pipe(
      switchMap(([viewMode, statusFilter, department]) => {
        if (viewMode === 'team' && this.isManager) {
          // In Team View: use team PTO requests with department + status filtering
          const teamRequests$ = department === 'All Departments'
            ? this.store.select(selectAllTeamPtoRequests)
            : this.store.select(selectTeamPtoByDepartment(department));

          return teamRequests$.pipe(
            map(requests => this.applyFilter(requests, statusFilter))
          );
        } else {
          // In Employee View: use personal PTO requests with status filtering only
          return this.requests$.pipe(
            map(requests => this.applyFilter(requests, statusFilter))
          );
        }
      })
    );
  }

  /**
   * Sets the active filter and emits the new value.
   */
  setFilter(filter: string): void {
    this.activeFilter = filter;
    this.filterSubject$.next(filter);
  }

  /**
   * Navigates to the detail view for the selected request.
   */
  onRowClick(request: PtoRequest): void {
    this.router.navigate(['/field-resource-management/pto', request.id]);
  }

  /**
   * Opens the PTO request form as a dialog.
   */
  openNewRequestDialog(): void {
    const dialogRef = this.dialog.open(PtoRequestFormComponent, {
      width: '800px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: 'pto-form-dialog',
      disableClose: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        this.store.dispatch(PtoActions.loadRequests());
      }
    });
  }

  /**
   * Returns a CSS class for the status badge based on the request status.
   */
  getStatusBadgeClass(status: string): string {
    switch (status) {
      case RequestStatus.Pending_Manager_Approval:
      case RequestStatus.Pending_Backoffice_Approval:
      case 'Pending':
        return 'badge-pending';
      case RequestStatus.Approved:
      case 'Approved':
        return 'badge-approved';
      case RequestStatus.Rejected:
      case 'Rejected':
        return 'badge-rejected';
      case RequestStatus.Cancelled:
      case 'Cancelled':
        return 'badge-cancelled';
      default:
        return '';
    }
  }

  /**
   * Returns a human-readable label for the request status.
   */
  getStatusLabel(status: string): string {
    switch (status) {
      case RequestStatus.Pending_Manager_Approval:
        return 'Pending Manager';
      case RequestStatus.Pending_Backoffice_Approval:
        return 'Pending Backoffice';
      case RequestStatus.Approved:
      case 'Approved':
        return 'Approved';
      case RequestStatus.Rejected:
      case 'Rejected':
        return 'Rejected';
      case RequestStatus.Cancelled:
      case 'Cancelled':
        return 'Cancelled';
      case 'Pending':
        return 'Pending';
      default:
        return status;
    }
  }

  /**
   * TrackBy function for request list rendering.
   */
  trackByRequest(_index: number, request: PtoRequest): string {
    return request.id;
  }

  // --- Action Buttons ---

  /**
   * Whether the current user can cancel this request (employee can cancel pending requests).
   */
  canCancel(request: PtoRequest): boolean {
    const isPending =
      request.status === RequestStatus.Pending_Manager_Approval ||
      request.status === RequestStatus.Pending_Backoffice_Approval;
    return isPending;
  }

  /**
   * Whether the current user can delete this request (own requests only, any status).
   */
  canDelete(request: PtoRequest): boolean {
    return true; // All own requests can be deleted
  }

  /**
   * Whether the current user can approve this request (manager/admin on pending requests).
   */
  canApprove(request: PtoRequest): boolean {
    const user = this.authService.getUser();
    const isManagerOrAdmin = user?.role === 'Admin' || user?.role === 'Manager' || user?.role === 'CM';
    const isPending =
      request.status === RequestStatus.Pending_Manager_Approval ||
      request.status === RequestStatus.Pending_Backoffice_Approval;
    return isManagerOrAdmin && isPending;
  }

  /**
   * Whether the current user can reject this request (manager/admin on pending requests).
   */
  canReject(request: PtoRequest): boolean {
    return this.canApprove(request);
  }

  /**
   * Cancel a PTO request.
   */
  onCancel(request: PtoRequest): void {
    if (confirm('Are you sure you want to cancel this PTO request?')) {
      this.store.dispatch(PtoActions.cancelRequest({ requestId: request.id }));
    }
  }

  /**
   * Delete a PTO request permanently.
   */
  onDelete(request: PtoRequest): void {
    if (confirm('Are you sure you want to permanently delete this PTO request? This cannot be undone.')) {
      this.store.dispatch(PtoActions.deleteRequest({ requestId: request.id }));
    }
  }

  /**
   * Approve a PTO request.
   */
  onApprove(request: PtoRequest): void {
    this.store.dispatch(PtoActions.managerApprove({ requestId: request.id }));
  }

  /**
   * Open the reject modal for a PTO request.
   */
  onReject(request: PtoRequest): void {
    this.rejectingRequestId = request.id;
    this.rejectReason = '';
    this.showRejectModal = true;
  }

  /**
   * Confirm rejection with reason.
   */
  confirmReject(): void {
    if (this.rejectingRequestId && this.rejectReason.trim()) {
      this.store.dispatch(PtoActions.managerReject({
        requestId: this.rejectingRequestId,
        reason: this.rejectReason.trim()
      }));
      this.showRejectModal = false;
      this.rejectingRequestId = null;
      this.rejectReason = '';
    }
  }

  /**
   * Cancel the reject modal.
   */
  cancelReject(): void {
    this.showRejectModal = false;
    this.rejectingRequestId = null;
    this.rejectReason = '';
  }

  // ─── Team View Methods ────────────────────────────────────────────────────────

  /**
   * Switch to Team View.
   * Sets view mode to 'team' and dispatches loadTeamPtoRequests to fetch
   * direct reports' PTO data. Per Requirement 6.5, this triggers a fresh
   * data fetch each time (no caching between activations).
   */
  switchToTeamView(): void {
    this.viewMode = 'team';
    this.viewModeSubject$.next('team');
    this.onTeamViewActivated();
  }

  /**
   * Switch back to Employee View.
   * Resets view mode to 'employee' and clears the department filter
   * back to 'All Departments' per Requirement 3.7 / 5.8.
   */
  switchToEmployeeView(): void {
    this.viewMode = 'employee';
    this.selectedDepartment = 'All Departments';
    this.viewModeSubject$.next('employee');
    this.departmentSubject$.next('All Departments');
  }

  /**
   * Update the selected department filter value.
   * @param department The department to filter by, or 'All Departments' for no filtering
   */
  setDepartmentFilter(department: string): void {
    this.selectedDepartment = department;
    this.departmentSubject$.next(department);
  }

  /**
   * Called when Team View is activated. Dispatches the loadTeamPtoRequests
   * action with the current user's ID as the managerId.
   * Re-fetches on each activation per Requirement 6.5.
   */
  onTeamViewActivated(): void {
    const user = this.authService.getUser();
    if (user?.id) {
      this.store.dispatch(TeamRequestsActions.loadTeamPtoRequests({ managerId: user.id }));
    }
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────────

  /**
   * Detects whether the current user has a manager role.
   * Manager roles: Admin, Manager, CM, PM, DCOps
   */
  private _detectManagerRole(): boolean {
    const user = this.authService.getUser();
    if (!user) {
      return false;
    }
    const userRole = user.role || '';
    return MANAGER_ROLES.includes(userRole);
  }

  /**
   * Applies the status filter to the requests list.
   * Matches against both the enum values and the backend's simpler status strings.
   */
  private applyFilter(requests: PtoRequest[], filter: string): PtoRequest[] {
    switch (filter) {
      case 'All':
        return requests;
      case 'Pending':
        return requests.filter(
          r => r.status === RequestStatus.Pending_Manager_Approval ||
               r.status === RequestStatus.Pending_Backoffice_Approval
        );
      case 'Approved':
        return requests.filter(
          r => r.status === RequestStatus.Approved
        );
      case 'Rejected':
        return requests.filter(
          r => r.status === RequestStatus.Rejected
        );
      case 'Cancelled':
        return requests.filter(
          r => r.status === RequestStatus.Cancelled
        );
      default:
        return requests;
    }
  }
}
