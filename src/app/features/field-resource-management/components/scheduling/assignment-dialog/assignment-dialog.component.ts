import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { Job } from '../../../models/job.model';
import { Technician } from '../../../models/technician.model';
import { TechnicianMatch, Conflict } from '../../../models/assignment.model';
import { TechnicianDistance, PerDiemConfig } from '../../../models/travel.model';
import * as AssignmentActions from '../../../state/assignments/assignment.actions';
import * as TravelActions from '../../../state/travel/travel.actions';
import * as TechnicianActions from '../../../state/technicians/technician.actions';
import { selectQualifiedTechnicians, selectAssignmentConflicts } from '../../../state/assignments/assignment.selectors';
import { selectAllTechnicians } from '../../../state/technicians/technician.selectors';
import { 
  selectTechniciansSortedByDistance, 
  selectPerDiemConfig,
  selectDistanceCalculationLoading 
} from '../../../state/travel/travel.selectors';

/**
 * AssignmentDialogComponent
 * 
 * Modal dialog for assigning technicians to jobs.
 * Displays qualified technicians with skill match percentages, availability status,
 * and conflict warnings. Supports override with justification.
 * 
 * Features:
 * - Job details display
 * - Qualified technicians list with skill match percentage
 * - Availability status indicators
 * - Current workload display
 * - Conflict highlighting with warnings
 * - Skill mismatch warnings
 * - Override checkbox with justification
 * - Assignment confirmation
 */
@Component({
  selector: 'app-assignment-dialog',
  templateUrl: './assignment-dialog.component.html',
  styleUrls: ['./assignment-dialog.component.scss']
})
export class AssignmentDialogComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  job: Job;
  qualifiedTechnicians$: Observable<TechnicianMatch[]>;
  allTechnicians$: Observable<Technician[]>;
  conflicts$: Observable<Conflict[]>;
  techniciansWithDistance$!: Observable<TechnicianDistance[]>;
  perDiemConfig$!: Observable<PerDiemConfig>;
  distanceLoading$!: Observable<boolean>;

  qualifiedTechnicians: TechnicianMatch[] = [];
  allTechnicianMatches: TechnicianMatch[] = [];
  showingAllTechnicians = false;
  selectedTechnician: TechnicianMatch | null = null;
  assignmentForm: FormGroup;
  searchText = '';
  
  // Distance map for quick lookup by technician ID
  distanceMap: Map<string, TechnicianDistance> = new Map();

  // Availability status enum for template
  AvailabilityStatus = {
    Available: 'available',
    PartiallyAvailable: 'partially-available',
    Unavailable: 'unavailable'
  };

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { job: Job },
    private dialogRef: MatDialogRef<AssignmentDialogComponent>,
    private fb: FormBuilder,
    private store: Store
  ) {
    this.job = data.job;
    this.qualifiedTechnicians$ = this.store.select(selectQualifiedTechnicians);
    this.allTechnicians$ = this.store.select(selectAllTechnicians);
    this.conflicts$ = this.store.select(selectAssignmentConflicts);

    this.assignmentForm = this.fb.group({
      technicianId: ['', Validators.required],
      override: [false],
      justification: ['']
    });
  }

  ngOnInit(): void {
    // Ensure technicians are loaded in the store
    this.store.dispatch(TechnicianActions.loadTechnicians({ filters: {} }));
    
    // Load qualified technicians for this job
    this.store.dispatch(AssignmentActions.loadQualifiedTechnicians({ jobId: this.job.id }));
    
    // Calculate distances for this job
    this.store.dispatch(TravelActions.calculateDistances({ jobId: this.job.id }));
    
    // Setup distance observables
    this.techniciansWithDistance$ = this.store.select(
      selectTechniciansSortedByDistance(this.job.id, false)
    );
    this.perDiemConfig$ = this.store.select(selectPerDiemConfig);
    this.distanceLoading$ = this.store.select(selectDistanceCalculationLoading);

    // Subscribe to qualified technicians
    this.qualifiedTechnicians$
      .pipe(takeUntil(this.destroy$))
      .subscribe(technicians => {
        this.qualifiedTechnicians = technicians;
        // If qualified list is populated, use it; otherwise we'll fall back to all technicians
        if (technicians.length > 0) {
          this.showingAllTechnicians = false;
        }
      });

    // Subscribe to all technicians as fallback
    this.allTechnicians$
      .pipe(takeUntil(this.destroy$))
      .subscribe(technicians => {
        this.allTechnicianMatches = technicians
          .filter(t => t.isActive)
          .map(t => this.toTechnicianMatch(t));
        // Auto-show all if qualified list is empty and we have technicians
        if (this.qualifiedTechnicians.length === 0 && this.allTechnicianMatches.length > 0) {
          this.showingAllTechnicians = true;
        }
      });
    
    // Subscribe to distances to build the map
    this.techniciansWithDistance$
      .pipe(takeUntil(this.destroy$))
      .subscribe(distances => {
        this.distanceMap.clear();
        distances.forEach(d => {
          this.distanceMap.set(d.technicianId, d);
        });
      });

    // Watch override checkbox to conditionally require justification
    this.assignmentForm.get('override')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(override => {
        const justificationControl = this.assignmentForm.get('justification');
        if (override) {
          justificationControl?.setValidators([Validators.required, Validators.minLength(10)]);
        } else {
          justificationControl?.clearValidators();
        }
        justificationControl?.updateValueAndValidity();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    // Clear calculated distances when dialog closes
    this.store.dispatch(TravelActions.clearDistances({ jobId: this.job.id }));
  }

  /**
   * Select a technician
   */
  onSelectTechnician(technician: TechnicianMatch): void {
    this.selectedTechnician = technician;
    this.assignmentForm.patchValue({
      technicianId: technician.technician.id
    });

    // Check if conflicts exist and require override
    if (technician.hasConflicts) {
      this.assignmentForm.patchValue({ override: true });
    }
  }

  /**
   * Check if technician is selected
   */
  isSelected(technician: TechnicianMatch): boolean {
    return this.selectedTechnician?.technician.id === technician.technician.id;
  }

  /**
   * Get availability status for a technician
   */
  getAvailabilityStatus(technician: TechnicianMatch): string {
    // Check if technician has availability conflicts
    if (technician.hasConflicts) {
      return this.AvailabilityStatus.Unavailable;
    }

    // Check workload
    if (technician.currentWorkload >= 3) {
      return this.AvailabilityStatus.PartiallyAvailable;
    }

    return this.AvailabilityStatus.Available;
  }

  /**
   * Get availability status label
   */
  getAvailabilityLabel(status: string): string {
    switch (status) {
      case this.AvailabilityStatus.Available:
        return 'Available';
      case this.AvailabilityStatus.PartiallyAvailable:
        return 'Partially Available';
      case this.AvailabilityStatus.Unavailable:
        return 'Unavailable';
      default:
        return 'Unknown';
    }
  }

  /**
   * Get availability status icon
   */
  getAvailabilityIcon(status: string): string {
    switch (status) {
      case this.AvailabilityStatus.Available:
        return 'check_circle';
      case this.AvailabilityStatus.PartiallyAvailable:
        return 'warning';
      case this.AvailabilityStatus.Unavailable:
        return 'cancel';
      default:
        return 'help';
    }
  }

  /**
   * Get skill match color class
   */
  getSkillMatchColor(percentage: number): string {
    if (percentage === 100) {
      return 'match-perfect';
    } else if (percentage >= 75) {
      return 'match-good';
    } else if (percentage >= 50) {
      return 'match-fair';
    } else {
      return 'match-poor';
    }
  }

  /**
   * Check if assignment requires override
   */
  requiresOverride(): boolean {
    if (!this.selectedTechnician) {
      return false;
    }

    return (
      this.selectedTechnician.hasConflicts ||
      this.selectedTechnician.matchPercentage < 100
    );
  }

  /**
   * Check if form is valid for submission
   */
  canAssign(): boolean {
    if (!this.selectedTechnician) {
      return false;
    }

    if (this.requiresOverride() && !this.assignmentForm.get('override')?.value) {
      return false;
    }

    return this.assignmentForm.valid;
  }

  /**
   * Assign technician to job
   */
  onAssign(): void {
    if (!this.canAssign() || !this.selectedTechnician) {
      return;
    }

    const formValue = this.assignmentForm.value;

    // Dispatch assignment action
    this.store.dispatch(AssignmentActions.assignTechnician({
      jobId: this.job.id,
      technicianId: formValue.technicianId,
      override: formValue.override,
      justification: formValue.justification
    }));

    // Close dialog
    this.dialogRef.close({
      assigned: true,
      technicianId: formValue.technicianId
    });
  }

  /**
   * Get the list of technicians to display — qualified if available, all as fallback
   */
  getDisplayedTechnicians(): TechnicianMatch[] {
    const list = this.showingAllTechnicians ? this.allTechnicianMatches : this.qualifiedTechnicians;
    if (!this.searchText.trim()) return list;
    const term = this.searchText.toLowerCase();
    return list.filter(tm => {
      const name = `${tm.technician.firstName} ${tm.technician.lastName}`.toLowerCase();
      return name.includes(term) || tm.technician.role.toLowerCase().includes(term)
        || tm.technician.region?.toLowerCase().includes(term);
    });
  }

  /**
   * Toggle between qualified and all technicians
   */
  toggleShowAll(): void {
    this.showingAllTechnicians = !this.showingAllTechnicians;
    this.selectedTechnician = null;
    this.assignmentForm.patchValue({ technicianId: '', override: false, justification: '' });
  }

  /**
   * Wrap a raw Technician as a TechnicianMatch with defaults
   */
  private toTechnicianMatch(tech: Technician): TechnicianMatch {
    return {
      technician: tech,
      matchPercentage: 100,
      missingSkills: [],
      currentWorkload: 0,
      hasConflicts: false,
      conflicts: []
    };
  }

  /**
   * Cancel assignment
   */
  onCancel(): void {
    this.dialogRef.close({ assigned: false });
  }

  /**
   * Get conflict severity icon
   */
  getConflictIcon(severity: string): string {
    return severity === 'Error' ? 'error' : 'warning';
  }

  /**
   * Get conflict severity color
   */
  getConflictColor(severity: string): string {
    return severity === 'Error' ? 'conflict-error' : 'conflict-warning';
  }

  /**
   * Format time range
   */
  formatTimeRange(start: Date, end: Date): string {
    const startStr = new Date(start).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
    const endStr = new Date(end).toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
    return `${startStr} - ${endStr}`;
  }

  /**
   * Get distance info for a technician
   */
  getDistanceInfo(technicianId: string): TechnicianDistance | null {
    return this.distanceMap.get(technicianId) || null;
  }

  /**
   * Format distance in miles
   */
  formatDistance(miles: number | null): string {
    if (miles === null) return 'N/A';
    return `${miles.toFixed(1)} mi`;
  }

  /**
   * Format driving time
   */
  formatDrivingTime(minutes: number | null): string {
    if (minutes === null) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours === 0) return `${mins} min`;
    if (mins === 0) return `${hours} hr`;
    return `${hours} hr ${mins} min`;
  }

  /**
   * Calculate per diem amount for a technician
   */
  getPerDiemAmount(technicianId: string, config: PerDiemConfig): number {
    const distanceInfo = this.distanceMap.get(technicianId);
    if (!distanceInfo || !distanceInfo.perDiemEligible || distanceInfo.distanceMiles === null) {
      return 0;
    }
    if (config.flatRateAmount !== null) {
      return config.flatRateAmount;
    }
    return distanceInfo.distanceMiles * config.ratePerMile;
  }
}
