import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil, map, startWith } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { Job, JobStatus } from '../../models/job.model';
import { Technician } from '../../models/technician.model';
import * as JobSelectors from '../../state/jobs/job.selectors';
import * as TechnicianSelectors from '../../state/technicians/technician.selectors';
import * as AssignmentSelectors from '../../state/assignments/assignment.selectors';
import { Assignment, AssignmentStatus } from '../../models/assignment.model';
import { AuthService } from '../../../../services/auth.service';
import { UserRole } from '../../../../models/role.enum';
import { JobFormComponent } from '../jobs/job-form/job-form.component';

/**
 * Home Dashboard Component
 * 
 * Simple landing page for Field Resource Management with:
 * - Quick summary metrics
 * - Recent jobs
 * - Quick action links
 * - Role-based shortcuts
 */
@Component({
  selector: 'app-home-dashboard',
  templateUrl: './home-dashboard.component.html',
  styleUrls: ['./home-dashboard.component.scss']
})
export class HomeDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Summary metrics
  totalJobs$: Observable<number>;
  activeJobs$: Observable<number>;
  availableTechnicians$: Observable<number>;
  
  // Recent data
  recentJobs$: Observable<Job[]>;
  
  // Assignments
  myAssignments$: Observable<Assignment[]>;
  
  // User info
  currentUserRole: UserRole | null = null;
  UserRole = UserRole;

  constructor(
    private store: Store,
    private router: Router,
    private authService: AuthService,
    private dialog: MatDialog
  ) {
    this.totalJobs$ = this.store.select(JobSelectors.selectTotalJobs);
    this.activeJobs$ = this.store.select(JobSelectors.selectActiveJobsCount);
    this.availableTechnicians$ = this.store.select(TechnicianSelectors.selectAvailableTechniciansCount);
    this.recentJobs$ = this.store.select(JobSelectors.selectRecentJobs);
    this.myAssignments$ = this.store.select(AssignmentSelectors.selectAllAssignments).pipe(
      takeUntil(this.destroy$),
      map(assignments => assignments.filter(a => a.isActive).slice(0, 5)),
      startWith([] as Assignment[])
    );
  }

  ngOnInit(): void {
    const user = this.authService.getUser();
    this.currentUserRole = user?.role as UserRole || null;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Quick action navigation methods
   */
  navigateToJobs(): void {
    this.router.navigate(['/field-resource-management/jobs']);
  }

  navigateToTechnicians(): void {
    this.router.navigate(['/field-resource-management/technicians']);
  }

  navigateToCrews(): void {
    this.router.navigate(['/field-resource-management/crews']);
  }

  navigateToScheduling(): void {
    this.router.navigate(['/field-resource-management/schedule']);
  }

  navigateToMap(): void {
    this.router.navigate(['/field-resource-management/map']);
  }

  navigateToReports(): void {
    this.router.navigate(['/field-resource-management/reports']);
  }

  navigateToTimecard(): void {
    this.router.navigate(['/field-resource-management/timecard']);
  }

  navigateToAssignments(): void {
    this.router.navigate(['/field-resource-management/mobile/daily']);
  }

  getAssignmentStatusClass(status: AssignmentStatus): string {
    const classMap: Record<string, string> = {
      [AssignmentStatus.Assigned]: 'status-assigned',
      [AssignmentStatus.Accepted]: 'status-accepted',
      [AssignmentStatus.InProgress]: 'status-in-progress',
      [AssignmentStatus.Completed]: 'status-completed',
      [AssignmentStatus.Rejected]: 'status-rejected'
    };
    return classMap[status] || 'status-assigned';
  }

  navigateToJobDetail(jobId: string): void {
    this.router.navigate(['/field-resource-management/jobs', jobId]);
  }

  createNewJob(): void {
    const dialogRef = this.dialog.open(JobFormComponent, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      disableClose: false,
      panelClass: 'job-form-dialog',
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        // Refresh job list or show success message
        // The store is already updated by the component
      }
    });
  }

  /**
   * Get status badge color
   */
  getStatusColor(status: JobStatus): string {
    const colorMap: Record<JobStatus, string> = {
      [JobStatus.NotStarted]: 'gray',
      [JobStatus.EnRoute]: 'blue',
      [JobStatus.OnSite]: 'orange',
      [JobStatus.Completed]: 'green',
      [JobStatus.Issue]: 'red',
      [JobStatus.Cancelled]: 'gray'
    };
    return colorMap[status] || 'gray';
  }

  /**
   * Format date for display
   */
  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString();
  }
}
