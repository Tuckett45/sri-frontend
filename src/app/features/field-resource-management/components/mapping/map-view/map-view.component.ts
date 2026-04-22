import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MapFilters } from '../map-filters/map-filters.component';
import { selectActiveTechnicians } from '../../../state/technicians/technician.selectors';
import { selectAllCrews } from '../../../state/crews/crew.selectors';
import { selectAllJobs } from '../../../state/jobs/job.selectors';
import * as TechnicianActions from '../../../state/technicians/technician.actions';
import * as CrewActions from '../../../state/crews/crew.actions';
import * as JobActions from '../../../state/jobs/job.actions';

/**
 * Map View Component
 * 
 * Main container component for the map page that includes:
 * - Interactive map with markers
 * - Filter panel for controlling visibility
 * - Legend showing marker meanings
 * - Statistics summary
 * 
 * This component orchestrates the map, filters, and legend components.
 * Uses the same direct store selectors as the admin dashboard for stats.
 */
@Component({
  selector: 'frm-map-view',
  templateUrl: './map-view.component.html',
  styleUrls: ['./map-view.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MapViewComponent implements OnInit, OnDestroy {
  /**
   * Current filter settings
   */
  currentFilters: MapFilters = {
    showTechnicians: true,
    showCrews: true,
    showJobs: true,
    technicianStatuses: ['available', 'on-job', 'unavailable', 'off-duty'],
    crewStatuses: ['AVAILABLE', 'ON_JOB', 'UNAVAILABLE'],
    jobStatuses: ['NotStarted', 'EnRoute', 'OnSite', 'Completed', 'Issue', 'Cancelled'],
    jobPriorities: ['P1', 'P2', 'Normal']
  };

  /**
   * Filter panel visibility
   */
  showFilters = true;

  /**
   * Legend visibility
   */
  showLegend = true;

  /**
   * Statistics summary
   */
  stats = {
    technicians: 0,
    crews: 0,
    jobs: 0,
    visible: {
      technicians: 0,
      crews: 0,
      jobs: 0
    }
  };

  /**
   * Subject for component destruction
   */
  private destroy$ = new Subject<void>();

  constructor(
    private cdr: ChangeDetectorRef,
    private store: Store
  ) {}

  ngOnInit(): void {
    // Fetch data from the API — same pattern as admin dashboard
    this.store.dispatch(TechnicianActions.loadTechnicians({ filters: {} }));
    this.store.dispatch(JobActions.loadJobs({ filters: {} }));
    this.store.dispatch(CrewActions.loadCrews({}));

    // Subscribe to store for stats using the same direct selectors as the dashboard
    this.store.select(selectActiveTechnicians)
      .pipe(takeUntil(this.destroy$))
      .subscribe(technicians => {
        this.stats.technicians = technicians.length;
        this.stats.visible.technicians = technicians.length;
        this.cdr.markForCheck();
      });

    this.store.select(selectAllCrews)
      .pipe(takeUntil(this.destroy$))
      .subscribe(crews => {
        this.stats.crews = crews.length;
        this.stats.visible.crews = crews.length;
        this.cdr.markForCheck();
      });

    this.store.select(selectAllJobs)
      .pipe(takeUntil(this.destroy$))
      .subscribe(jobs => {
        const activeJobs = jobs.filter(j =>
          j.status !== 'Completed' && j.status !== 'Cancelled'
        );
        this.stats.jobs = activeJobs.length;
        this.stats.visible.jobs = activeJobs.length;
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Handle filter changes from filter component
   */
  onFiltersChanged(filters: MapFilters): void {
    this.currentFilters = filters;
    this.cdr.markForCheck();
  }

  /**
   * Toggle filter panel visibility
   */
  toggleFilters(): void {
    this.showFilters = !this.showFilters;
    this.cdr.markForCheck();
  }

  /**
   * Toggle legend visibility
   */
  toggleLegend(): void {
    this.showLegend = !this.showLegend;
    this.cdr.markForCheck();
  }

  /**
   * Handle technician selection from map
   */
  onTechnicianSelected(technicianId: string): void {
    console.log('Technician selected:', technicianId);
    // TODO: Navigate to technician detail or show modal
  }

  /**
   * Handle crew selection from map
   */
  onCrewSelected(crewId: string): void {
    console.log('Crew selected:', crewId);
    // TODO: Navigate to crew detail or show modal
  }

  /**
   * Handle job selection from map
   */
  onJobSelected(jobId: string): void {
    console.log('Job selected:', jobId);
    // TODO: Navigate to job detail or show modal
  }
}
