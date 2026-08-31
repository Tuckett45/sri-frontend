import { Component, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';

import { OvertimeRequest, OvertimeRequestStatus } from '../../../models/overtime.models';
import * as OvertimeActions from '../../../state/overtime/overtime.actions';
import { selectAllOvertimeRequests, selectOvertimeLoading } from '../../../state/overtime/overtime.selectors';
import { AuthService } from '../../../../../services/auth.service';
import { OvertimeRequestFormComponent } from '../overtime-request-form/overtime-request-form.component';
import { ViewMode } from '../mixins/team-view.mixin';
import { UserRole } from '../../../../../models/role.enum';
import * as TeamRequestsActions from '../../../state/team-requests/team-requests.actions';
import {
  selectAllTeamOvertimeRequests,
  selectTeamOvertimeByDepartment,
  selectTeamOvertimeDepartments,
  selectTeamOvertimeLoading,
  selectTeamOvertimeError
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
 * Overtime Request List Component
 *
 * Displays a list of the employee's overtime requests with status filtering.
 * Supports filter chips for All, Pending, Approved, Rejected, and Cancelled statuses.
 * Provides action buttons for cancel/approve/reject based on user role.
 *
 * Enhanced with Team View for managers:
 * - Toggle between Employee View (own requests) and Team View (direct reports' requests)
 * - Department filtering within Team View
 * - Combined status + department filtering in Team View
 *
 * Requirements: 2.1, 2.2, 4.1, 4.2, 4.3, 4.6, 4.7
 */
@Component({
  selector: 'app-overtime-request-list',
  templateUrl: './overtime-request-list.component.html',
  styleUrls: ['./overtime-request-list.component.scss']
})
export class OvertimeRequestListComponent implements OnInit {
  /** Filter options */
  filterOptions: string[] = ['All', 'Pending', 'Approved', 'Rejected', 'Cancelled'];

  /** Currently active filter */
  activeFilter = 'All';

  /** Reject modal state */
  showRejectModal = false;
  rejectReason = '';
  private rejectingRequestId: string | null = null;

  /** Subject to drive filter changes */
  private filterSubject$ = new BehaviorSubject<string>('All');

  // ─── Team View Properties ───────────────────────────────────────────────────

  /** Current view mode: 'employee' (default) or 'team' */
  viewMode: ViewMode = 'employee';

  /** Whether the current user has a manager role that enables Team View */
  isManager = false;

  /** Currently selected department filter (default 'All Departments') */
  selectedDepartment = 'All Departments';

  /** Observable of available department options derived from loaded team data */
  departmentOptions$!: Observable<string[]>;

  /** Observable indicating whether team data is currently loading */
  teamLoading$!: Observable<boolean>;

  /** Observable containing error message if team data load failed, or null */
  teamError$!: Observable<string | null>;

  /** Subject to drive department filter changes */
  private departmentSubject$ = new BehaviorSubject<string>('All Departments');

  /** Subject to drive view mode changes */
  private viewModeSubject$ = new BehaviorSubject<ViewMode>('employee');

  // ─── Existing Properties ────────────────────────────────────────────────────

  /** All requests from the store */
  requests$!: Observable<OvertimeRequest[]>;

  /** Filtered requests */
  filteredRequests$!: Observable<OvertimeRequest[]>;

  /** Loading state */
  loading$!: Observable<boolean>;

  constructor(
    private store: Store,
    private router: Router,
    private authService: AuthService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    // Load personal overtime requests
    this.store.dispatch(OvertimeActions.loadOvertimeRequests());
    this.requests$ = this.store.select(selectAllOvertimeRequests);
    this.loading$ = this.store.select(selectOvertimeLoading);

    // Detect manager role for team view toggle visibility
    const user = this.authService.getUser();
    this.isManager = MANAGER_ROLES.includes(user?.role || '');

    // Wire up team view observables
    this.departmentOptions$ = this.store.select(selectTeamOvertimeDepartments);
    this.teamLoading$ = this.store.select(selectTeamOvertimeLoading);
    this.teamError$ = this.store.select(selectTeamOvertimeError);

    // Build filtered requests pipeline that responds to view mode, status filter, and department filter
    this.filteredRequests$ = combineLatest([
      this.viewModeSubject$,
      this.filterSubject$,
      this.departmentSubject$
    ]).pipe(
      switchMap(([viewMode, statusFilter, department]) => {
        if (viewMode === 'team') {
          // In Team View: use team overtime requests with department + status filtering
          const teamRequests$ = department === 'All Departments'
            ? this.store.select(selectAllTeamOvertimeRequests)
            : this.store.select(selectTeamOvertimeByDepartment(department));

          return teamRequests$.pipe(
            map(requests => this.applyFilter(requests, statusFilter))
          );
        } else {
          // In Employee View: use personal overtime requests with status filtering only
          return this.requests$.pipe(
            map(requests => this.applyFilter(requests, statusFilter))
          );
        }
      })
    );
  }

  // ─── Team View Methods ──────────────────────────────────────────────────────

  /**
   * Switch to Team View.
   * Sets view mode to 'team' and dispatches load action for team overtime requests.
   * Per Requirement 6.5, this triggers a fresh data fetch each time (no caching).
   */
  switchToTeamView(): void {
    this.viewMode = 'team';
    this.viewModeSubject$.next('team');
    this.onTeamViewActivated();
  }

  /**
   * Switch back to Employee View.
   * Resets view mode to 'employee' and clears department filter per Requirement 3.7 / 5.8.
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
   * Called when Team View is activated. Dispatches the load action for team overtime requests.
   * Re-fetches on each activation per Requirement 6.5.
   */
  private onTeamViewActivated(): void {
    const user = this.authService.getUser();
    if (user?.id) {
      this.store.dispatch(TeamRequestsActions.loadTeamOvertimeRequests({ managerId: user.id }));
    }
  }

  /**
   * Sets the active filter.
   */
  setFilter(filter: string): void {
    this.activeFilter = filter;
    this.filterSubject$.next(filter);
  }

  /**
   * Open new overtime request form as dialog.
   */
  onNewRequest(): void {
    const dialogRef = this.dialog.open(OvertimeRequestFormComponent, {
      width: '800px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: 'overtime-form-dialog',
      disableClose: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        this.store.dispatch(OvertimeActions.loadOvertimeRequests());
      }
    });
  }

  /**
   * Returns a CSS class for the status badge.
   */
  getStatusBadgeClass(status: string): string {
    switch (status) {
      case OvertimeRequestStatus.Pending_Manager_Approval:
        return 'badge-pending';
      case OvertimeRequestStatus.Approved:
        return 'badge-approved';
      case OvertimeRequestStatus.Rejected:
        return 'badge-rejected';
      case OvertimeRequestStatus.Cancelled:
        return 'badge-cancelled';
      default:
        return '';
    }
  }

  /**
   * Returns a human-readable label for the status.
   */
  getStatusLabel(status: string): string {
    switch (status) {
      case OvertimeRequestStatus.Pending_Manager_Approval:
        return 'Pending Approval';
      case OvertimeRequestStatus.Approved:
        return 'Approved';
      case OvertimeRequestStatus.Rejected:
        return 'Rejected';
      case OvertimeRequestStatus.Cancelled:
        return 'Cancelled';
      default:
        return status;
    }
  }

  /**
   * Formats duration to display string.
   */
  formatDuration(request: OvertimeRequest): string {
    const h = request.estimatedHours || request.estimatedDuration?.hours || 0;
    const m = request.estimatedMinutes || request.estimatedDuration?.minutes || 0;
    if (h > 0 && m > 0) {
      return `${h}h ${m}m`;
    } else if (h > 0) {
      return `${h}h`;
    } else {
      return `${m}m`;
    }
  }

  /**
   * TrackBy function for list rendering.
   */
  trackByRequest(_index: number, request: OvertimeRequest): string {
    return request.id;
  }

  // --- Action Buttons ---

  canCancel(request: OvertimeRequest): boolean {
    return request.approvalStatus === OvertimeRequestStatus.Pending_Manager_Approval;
  }

  canDelete(request: OvertimeRequest): boolean {
    return true; // All own requests can be deleted
  }

  canApprove(request: OvertimeRequest): boolean {
    const user = this.authService.getUser();
    const isManagerOrAdmin = user?.role === 'Admin' || user?.role === 'Manager' || user?.role === 'CM';
    return isManagerOrAdmin && request.approvalStatus === OvertimeRequestStatus.Pending_Manager_Approval;
  }

  canReject(request: OvertimeRequest): boolean {
    return this.canApprove(request);
  }

  onCancel(request: OvertimeRequest): void {
    if (confirm('Are you sure you want to cancel this overtime request?')) {
      this.store.dispatch(OvertimeActions.cancelOvertimeRequest({ requestId: request.id }));
    }
  }

  onDelete(request: OvertimeRequest): void {
    if (confirm('Are you sure you want to permanently delete this overtime request? This cannot be undone.')) {
      this.store.dispatch(OvertimeActions.deleteOvertimeRequest({ requestId: request.id }));
    }
  }

  onApprove(request: OvertimeRequest): void {
    this.store.dispatch(OvertimeActions.approveOvertimeRequest({ requestId: request.id }));
  }

  onReject(request: OvertimeRequest): void {
    this.rejectingRequestId = request.id;
    this.rejectReason = '';
    this.showRejectModal = true;
  }

  confirmReject(): void {
    if (this.rejectingRequestId && this.rejectReason.trim()) {
      this.store.dispatch(OvertimeActions.rejectOvertimeRequest({
        requestId: this.rejectingRequestId,
        reason: this.rejectReason.trim()
      }));
      this.showRejectModal = false;
      this.rejectingRequestId = null;
      this.rejectReason = '';
    }
  }

  cancelReject(): void {
    this.showRejectModal = false;
    this.rejectingRequestId = null;
    this.rejectReason = '';
  }

  /**
   * Applies filter to the requests list.
   */
  private applyFilter(requests: OvertimeRequest[], filter: string): OvertimeRequest[] {
    switch (filter) {
      case 'All':
        return requests;
      case 'Pending':
        return requests.filter(r => r.approvalStatus === OvertimeRequestStatus.Pending_Manager_Approval);
      case 'Approved':
        return requests.filter(r => r.approvalStatus === OvertimeRequestStatus.Approved);
      case 'Rejected':
        return requests.filter(r => r.approvalStatus === OvertimeRequestStatus.Rejected);
      case 'Cancelled':
        return requests.filter(r => r.approvalStatus === OvertimeRequestStatus.Cancelled);
      default:
        return requests;
    }
  }
}
