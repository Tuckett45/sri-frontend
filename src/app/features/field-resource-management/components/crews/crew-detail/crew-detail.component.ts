import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject, of } from 'rxjs';
import { takeUntil, filter, map, take } from 'rxjs/operators';
import { Actions, ofType } from '@ngrx/effects';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { Crew, CrewStatus } from '../../../models/crew.model';
import { Technician } from '../../../models/technician.model';
import { Job } from '../../../models/job.model';
import { LocationHistoryEntry } from '../../../models/location-history.model';
import * as CrewActions from '../../../state/crews/crew.actions';
import * as CrewSelectors from '../../../state/crews/crew.selectors';
import * as TechnicianActions from '../../../state/technicians/technician.actions';
import * as TechnicianSelectors from '../../../state/technicians/technician.selectors';
import * as JobActions from '../../../state/jobs/job.actions';
import * as JobSelectors from '../../../state/jobs/job.selectors';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';

/**
 * Crew Detail Component
 * 
 * Displays comprehensive information about a crew including:
 * - Crew information (name, status, market, company)
 * - Lead technician details
 * - Crew members list
 * - Active job information
 * - Location history
 * 
 * Features:
 * - View crew details
 * - Edit crew (with permission check)
 * - Delete crew (with permission check)
 * - Navigate to related entities (technicians, jobs)
 * - Integration with NgRx store
 * - Role-based access control
 * 
 * Requirements: 1.3.1-1.3.6, 8.3.1-8.3.5
 */
@Component({
  selector: 'frm-crew-detail',
  templateUrl: './crew-detail.component.html',
  styleUrls: ['./crew-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CrewDetailComponent implements OnInit, OnDestroy {
  crew$: Observable<Crew | null | undefined>;
  loading$: Observable<boolean>;
  error$: Observable<string | null>;
  
  // Related entities
  leadTechnician$: Observable<Technician | undefined>;
  crewMembers$: Observable<Technician[]>;
  activeJob$: Observable<Job | undefined>;
  
  // Location history
  locationHistory$: Observable<LocationHistoryEntry[]>;
  locationHistoryLoading$: Observable<boolean>;
  locationHistoryError$: Observable<string | null>;
  
  // Permissions - simplified for now (will be enhanced with proper RBAC)
  canEdit$: Observable<boolean> = of(true);
  canDelete$: Observable<boolean> = of(true);
  
  // Add member state
  showAddMember = false;
  availableTechnicians$: Observable<Technician[]> = of([]);
  
  // Enum references for template
  CrewStatus = CrewStatus;
  
  private destroy$ = new Subject<void>();
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private store: Store,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private actions$: Actions
  ) {
    this.crew$ = this.store.select(CrewSelectors.selectSelectedCrew);
    this.loading$ = this.store.select(CrewSelectors.selectCrewsLoading);
    this.error$ = this.store.select(CrewSelectors.selectCrewsError);
    
    // Initialize location history observables
    this.locationHistory$ = new Observable();
    this.locationHistoryLoading$ = this.store.select(CrewSelectors.selectLocationHistoryLoading);
    this.locationHistoryError$ = this.store.select(CrewSelectors.selectLocationHistoryError);
    
    // Initialize related entity observables
    this.leadTechnician$ = new Observable();
    this.crewMembers$ = new Observable();
    this.activeJob$ = new Observable();
  }
  
  ngOnInit(): void {
    // Load all necessary data from the store
    // These actions will trigger effects that fetch data from the backend if needed
    this.store.dispatch(CrewActions.loadCrews({ filters: {} }));
    this.store.dispatch(TechnicianActions.loadTechnicians({ filters: {} }));
    this.store.dispatch(JobActions.loadJobs({ filters: {} }));
    
    // Get crew ID from route params and select crew
    this.route.params
      .pipe(
        takeUntil(this.destroy$),
        filter(params => params['id'])
      )
      .subscribe(params => {
        const crewId = params['id'];
        
        // Select the crew in the store
        this.store.dispatch(CrewActions.selectCrew({ id: crewId }));
      });
    
    // Load crew data and related entities
    this.crew$
      .pipe(
        takeUntil(this.destroy$),
        filter(crew => !!crew)
      )
      .subscribe(crew => {
        if (crew) {
          this.loadRelatedEntities(crew);
          this.loadLocationHistory(crew.id);
        }
      });
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    // Clear selected crew when leaving the component
    this.store.dispatch(CrewActions.selectCrew({ id: null }));
  }
  
  /**
   * Load related entities (lead technician, members, active job)
   */
  private loadRelatedEntities(crew: Crew): void {
    // Load lead technician
    this.leadTechnician$ = this.store.select(TechnicianSelectors.selectTechnicianById(crew.leadTechnicianId));
    
    // Load crew members (excluding lead technician to avoid duplication)
    this.crewMembers$ = this.store.select(TechnicianSelectors.selectAllTechnicians).pipe(
      map(technicians => {
        // Filter members and exclude lead technician
        const memberIds = crew.memberIds || [];
        const members = technicians.filter(t => 
          memberIds.includes(t.id) && t.id !== crew.leadTechnicianId
        );
        // Sort by name for consistent display
        return members.sort((a, b) => 
          `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
        );
      })
    );
    
    // Load active job if exists
    if (crew.activeJobId) {
      this.activeJob$ = this.store.select(JobSelectors.selectJobById(crew.activeJobId));
    }
  }
  
  /**
   * Load location history for the crew
   */
  private loadLocationHistory(crewId: string): void {
    // Dispatch action to load location history from backend
    this.store.dispatch(CrewActions.loadCrewLocationHistory({
      filters: {
        entityId: crewId,
        entityType: 'crew',
        limit: 50 // Load last 50 location entries
      }
    }));
    
    // Subscribe to location history for this crew
    this.locationHistory$ = this.store.select(CrewSelectors.selectCrewLocationHistory(crewId));
  }
  
  /**
   * Get status badge CSS class
   */
  getStatusBadgeClass(status: CrewStatus): string {
    const classMap: Record<CrewStatus, string> = {
      [CrewStatus.Available]: 'status-available',
      [CrewStatus.OnJob]: 'status-on-job',
      [CrewStatus.Unavailable]: 'status-unavailable'
    };
    return classMap[status] || '';
  }
  
  /**
   * Get technician full name
   */
  getTechnicianFullName(technician: Technician): string {
    return `${technician.firstName} ${technician.lastName}`;
  }
  
  /**
   * Get technician role display text
   */
  getTechnicianRoleDisplay(technician: Technician): string {
    return technician.role;
  }
  
  /**
   * Get technician status display
   */
  getTechnicianStatus(technician: Technician): string {
    return technician.isActive ? 'Active' : 'Inactive';
  }
  
  /**
   * Get technician status badge class
   */
  getTechnicianStatusClass(technician: Technician): string {
    return technician.isActive ? 'status-active' : 'status-inactive';
  }
  
  /**
   * Check if technician is the lead
   */
  isLeadTechnician(technicianId: string, crew: Crew): boolean {
    return technicianId === crew.leadTechnicianId;
  }
  
  /**
   * Get member count (excluding lead if they're also in memberIds)
   */
  getMemberCount(crew: Crew): number {
    // Count members excluding lead technician to avoid duplication
    return (crew.memberIds || []).filter(id => id !== crew.leadTechnicianId).length;
  }
  
  /**
   * Format location coordinates
   */
  formatLocation(location: { latitude: number; longitude: number }): string {
    return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
  }
  
  /**
   * Navigate to edit crew
   */
  editCrew(): void {
    this.crew$.pipe(takeUntil(this.destroy$)).subscribe(crew => {
      if (crew) {
        this.router.navigate(['../', crew.id, 'edit'], { relativeTo: this.route });
      }
    });
  }
  
  /**
   * Delete crew with confirmation
   */
  deleteCrew(crew: Crew): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete Crew',
        message: `Are you sure you want to delete crew "${crew.name}"? This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        confirmColor: 'warn'
      }
    });
    
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.store.dispatch(CrewActions.deleteCrew({ id: crew.id }));
        this.snackBar.open('Crew deleted successfully', 'Close', { duration: 3000 });
        this.router.navigate(['../'], { relativeTo: this.route });
      }
    });
  }
  
  /**
   * Navigate to technician detail
   */
  viewTechnician(technicianId: string): void {
    this.router.navigate(['/field-resource-management/technicians', technicianId]);
  }
  
  /**
   * Navigate to job detail
   */
  viewJob(jobId: string): void {
    this.router.navigate(['/field-resource-management/jobs', jobId]);
  }
  
  /**
   * Go back to crew list
   */
  goBack(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }
  
  /**
   * Format date for display
   */
  formatDate(date: Date): string {
    return new Date(date).toLocaleString();
  }
  
  /**
   * Format time for display
   */
  formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString();
  }
  
  /**
   * TrackBy function for member list performance
   */
  trackByMemberId(_index: number, member: Technician): string {
    return member.id;
  }

  /**
   * Toggle the add member panel
   */
  toggleAddMember(): void {
    this.showAddMember = !this.showAddMember;
    if (this.showAddMember) {
      this.updateAvailableTechnicians();
    }
  }

  /**
   * Update the list of technicians available to add (not already in crew)
   */
  private updateAvailableTechnicians(): void {
    this.crew$.pipe(
      takeUntil(this.destroy$),
      filter(crew => !!crew),
      take(1)
    ).subscribe(crew => {
      if (crew) {
        const existingIds = new Set([crew.leadTechnicianId, ...(crew.memberIds || [])]);
        this.availableTechnicians$ = this.store.select(TechnicianSelectors.selectAllTechnicians).pipe(
          map(technicians => technicians
            .filter(t => !existingIds.has(t.id) && t.isActive)
            .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`))
          )
        );
      }
    });
  }

  /**
   * Add a technician to the crew
   */
  addMemberToCrew(technicianId: string): void {
    this.crew$.pipe(
      takeUntil(this.destroy$),
      filter(crew => !!crew),
      take(1)
    ).subscribe(crew => {
      if (crew) {
        this.store.dispatch(CrewActions.addCrewMember({ crewId: crew.id, technicianId }));
        
        this.actions$.pipe(
          ofType(CrewActions.addCrewMemberSuccess),
          takeUntil(this.destroy$),
          take(1)
        ).subscribe(() => {
          this.snackBar.open('Member added to crew', 'Close', { duration: 3000 });
          this.showAddMember = false;
        });

        this.actions$.pipe(
          ofType(CrewActions.addCrewMemberFailure),
          takeUntil(this.destroy$),
          take(1)
        ).subscribe(({ error }) => {
          this.snackBar.open(`Failed to add member: ${error}`, 'Close', { duration: 5000 });
        });
      }
    });
  }

  /**
   * Remove a member from the crew
   */
  removeMemberFromCrew(event: Event, technicianId: string): void {
    event.stopPropagation();
    
    this.crew$.pipe(
      takeUntil(this.destroy$),
      filter(crew => !!crew),
      take(1)
    ).subscribe(crew => {
      if (crew) {
        const tech = this.getTechnicianFullName;
        const dialogRef = this.dialog.open(ConfirmDialogComponent, {
          width: '400px',
          data: {
            title: 'Remove Member',
            message: 'Are you sure you want to remove this technician from the crew?',
            confirmText: 'Remove',
            cancelText: 'Cancel',
            confirmColor: 'warn'
          }
        });

        dialogRef.afterClosed().subscribe(result => {
          if (result) {
            this.store.dispatch(CrewActions.removeCrewMember({ crewId: crew.id, technicianId }));
            this.snackBar.open('Member removed from crew', 'Close', { duration: 3000 });
          }
        });
      }
    });
  }
}
