import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MapFilters } from '../map-filters/map-filters.component';

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
    jobPriorities: ['P1', 'P2', 'P3', 'P4']
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
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Component initialization
    // Stats will be updated by child components
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

  /**
   * Update statistics
   */
  updateStats(stats: { technicians: number; crews: number; jobs: number }): void {
    this.stats.visible = stats;
    this.cdr.markForCheck();
  }
}
