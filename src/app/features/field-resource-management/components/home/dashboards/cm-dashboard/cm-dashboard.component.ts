import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../../../../../services/auth.service';
import { QuickAction } from '../../../../models/dashboard.models';
import { ManagerTeamService, TeamStatusResponse } from '../../../../services/manager-team.service';
import { CreateJobFromQuoteDialogComponent } from '../../../quotes/create-job-from-quote-dialog/create-job-from-quote-dialog.component';
import { RfpIntakeFormComponent } from '../../../quotes/rfp-intake/rfp-intake-form.component';

@Component({
  selector: 'app-cm-dashboard',
  templateUrl: './cm-dashboard.component.html',
  styleUrls: ['./cm-dashboard.component.scss']
})
export class CmDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  quickActions: QuickAction[] = [
    { label: 'New Job', icon: 'add_circle', action: 'newJob', color: 'orange', visible: true },
    { label: 'Create Job from Quote', icon: 'work', action: 'createJob', color: 'orange', visible: true },
    { label: 'Create Quote', icon: 'request_quote', action: 'createQuote', color: 'green', visible: true },
    { label: 'View All Jobs', icon: 'work', route: '/field-resource-management/jobs', color: 'primary', visible: true },
    { label: 'Open Schedule', icon: 'calendar_today', route: '/field-resource-management/schedule', color: 'primary', visible: true },
    { label: 'View Map', icon: 'map', route: '/field-resource-management/map', color: 'primary', visible: true },
    { label: 'My Timecard', icon: 'schedule', route: '/field-resource-management/timecard', color: 'primary', visible: true }
  ];

  marketFilter: string | null = null;
  myTeamEnabled = false;
  teamStatus: TeamStatusResponse | null = null;
  teamTechnicianIds: string[] = [];
  currentUserId = '';

  constructor(
    private router: Router,
    private authService: AuthService,
    private dialog: MatDialog,
    private managerTeamService: ManagerTeamService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getUser();
    this.marketFilter = user?.market ?? null;
    this.currentUserId = user?.id ?? '';

    if (!this.marketFilter) {
      console.warn('CmDashboardComponent: CM user market is null or empty — showing all jobs unfiltered');
    }

    // Subscribe to "My Team" toggle state
    this.managerTeamService.myTeamEnabled$
      .pipe(takeUntil(this.destroy$))
      .subscribe(enabled => {
        this.myTeamEnabled = enabled;
        if (enabled && this.currentUserId) {
          this.loadTeamData();
        }
      });

    // Initial load if toggle was already on (persisted from session)
    if (this.managerTeamService.isMyTeamEnabled && this.currentUserId) {
      this.loadTeamData();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Toggle "My Team" filter on/off.
   */
  toggleMyTeam(): void {
    this.managerTeamService.setMyTeamEnabled(!this.myTeamEnabled);
  }

  onJobSelected(jobId: string): void {
    this.router.navigate(['/field-resource-management/jobs', jobId]);
  }

  onTechnicianSelected(technicianId: string): void {
    this.router.navigate(['/field-resource-management/technicians', technicianId]);
  }

  onQuickAction(actionName: string): void {
    if (actionName === 'newJob') {
      this.router.navigate(['/field-resource-management/jobs'], { queryParams: { action: 'create' } });
    } else if (actionName === 'createJob') {
      this.dialog.open(CreateJobFromQuoteDialogComponent, {
        width: '520px',
        maxHeight: '80vh'
      });
    } else if (actionName === 'createQuote') {
      this.dialog.open(RfpIntakeFormComponent, {
        width: '900px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        disableClose: false,
        autoFocus: false,
        panelClass: 'rfp-intake-dialog'
      });
    }
  }

  /**
   * Load team status and technician IDs for the current manager.
   */
  private loadTeamData(): void {
    this.managerTeamService.getTeamStatus(this.currentUserId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (status) => {
          this.teamStatus = status;
          this.teamTechnicianIds = status.teamMembers.map(m => m.id);
        },
        error: (err) => {
          console.warn('Failed to load team status:', err);
          this.teamStatus = null;
          this.teamTechnicianIds = [];
        }
      });
  }
}
