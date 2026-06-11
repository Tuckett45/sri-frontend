import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, interval } from 'rxjs';
import { takeUntil, switchMap, startWith } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../../../../services/auth.service';
import { ManagerTeamService, TeamStatusResponse, TeamMemberStatus, TeamActiveEntry } from '../../services/manager-team.service';
import { TimecardApiService, TimecardDto } from '../../services/timecard-api.service';

/**
 * My Team Component
 *
 * Dedicated page for managers to see their direct reports at a glance:
 * - Team summary (total, clocked in, available)
 * - List of team members with real-time status
 * - Active time entries (who's working on what right now)
 * - Pending timecards from team members
 *
 * Route: /field-resource-management/my-team
 * Guard: ManagerGuard (Manager, CM, Admin, PM roles)
 */
@Component({
  selector: 'app-my-team',
  templateUrl: './my-team.component.html',
  styleUrls: ['./my-team.component.scss']
})
export class MyTeamComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  currentUserId = '';
  teamStatus: TeamStatusResponse | null = null;
  pendingTimecards: TimecardDto[] = [];
  loading = true;
  error: string | null = null;

  constructor(
    private authService: AuthService,
    private managerTeamService: ManagerTeamService,
    private timecardApiService: TimecardApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.authService.getUser()?.id || '';
    if (!this.currentUserId) {
      this.error = 'Unable to determine current user.';
      this.loading = false;
      return;
    }

    // Load team status immediately and refresh every 30 seconds
    interval(30000).pipe(
      startWith(0),
      takeUntil(this.destroy$),
      switchMap(() => this.managerTeamService.getTeamStatus(this.currentUserId))
    ).subscribe({
      next: (status) => {
        this.teamStatus = status;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load team status:', err);
        this.error = 'Unable to load team data. You may not have direct reports assigned.';
        this.loading = false;
      }
    });

    // Load pending timecards for this manager's team
    this.timecardApiService.getPendingTimecards(undefined, 1, 20)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.pendingTimecards = result.items;
        },
        error: () => {
          // Non-critical - don't show error
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getElapsedTime(clockInTime: string): string {
    const start = new Date(clockInTime).getTime();
    const diff = Math.floor((Date.now() - start) / 1000);
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    return `${h}h ${m}m`;
  }

  getStatusClass(member: TeamMemberStatus): string {
    if (member.isClockedIn) return 'status-clocked-in';
    if (member.isAvailable) return 'status-available';
    return 'status-offline';
  }

  getStatusLabel(member: TeamMemberStatus): string {
    if (member.isClockedIn) return 'Working';
    if (member.isAvailable) return 'Available';
    return 'Offline';
  }

  navigateToTechnician(id: string): void {
    this.router.navigate(['/field-resource-management/technicians', id]);
  }

  navigateToJob(jobId: string): void {
    this.router.navigate(['/field-resource-management/jobs', jobId]);
  }

  navigateToTimecard(): void {
    this.router.navigate(['/field-resource-management/timecard-manager']);
  }

  formatPeriod(start: string, end: string): string {
    const s = new Date(start);
    const e = new Date(end);
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }
}
