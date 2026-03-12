import { Component, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

/**
 * Map filter configuration interface
 */
export interface MapFilters {
  showTechnicians: boolean;
  showCrews: boolean;
  showJobs: boolean;
  technicianStatuses: string[];
  crewStatuses: string[];
  jobStatuses: string[];
  jobPriorities: string[];
}

/**
 * Map Filters Component
 * 
 * Provides filtering controls for the map view to show/hide different entity types
 * and filter by status and priority.
 * 
 * Features:
 * - Toggle visibility of technicians, crews, and jobs
 * - Filter by technician status (available, on-job, unavailable, off-duty)
 * - Filter by crew status (available, on-job, unavailable)
 * - Filter by job status (not started, en route, on site, completed, issue, cancelled)
 * - Filter by job priority (P1, P2, P3, P4)
 */
@Component({
  selector: 'frm-map-filters',
  templateUrl: './map-filters.component.html',
  styleUrls: ['./map-filters.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MapFiltersComponent {
  /**
   * Emits when filter settings change
   */
  @Output() filtersChanged = new EventEmitter<MapFilters>();

  /**
   * Current filter state
   */
  filters: MapFilters = {
    showTechnicians: true,
    showCrews: true,
    showJobs: true,
    technicianStatuses: ['available', 'on-job', 'unavailable', 'off-duty'],
    crewStatuses: ['AVAILABLE', 'ON_JOB', 'UNAVAILABLE'],
    jobStatuses: ['NotStarted', 'EnRoute', 'OnSite', 'Completed', 'Issue', 'Cancelled'],
    jobPriorities: ['P1', 'P2', 'P3', 'P4']
  };

  /**
   * Available technician statuses
   */
  technicianStatusOptions = [
    { value: 'available', label: 'Available', color: '#10b981' },
    { value: 'on-job', label: 'On Job', color: '#3b82f6' },
    { value: 'unavailable', label: 'Unavailable', color: '#f59e0b' },
    { value: 'off-duty', label: 'Off Duty', color: '#6b7280' }
  ];

  /**
   * Available crew statuses
   */
  crewStatusOptions = [
    { value: 'AVAILABLE', label: 'Available', color: '#10b981' },
    { value: 'ON_JOB', label: 'On Job', color: '#3b82f6' },
    { value: 'UNAVAILABLE', label: 'Unavailable', color: '#f59e0b' }
  ];

  /**
   * Available job statuses
   */
  jobStatusOptions = [
    { value: 'NotStarted', label: 'Not Started', color: '#6b7280' },
    { value: 'EnRoute', label: 'En Route', color: '#3b82f6' },
    { value: 'OnSite', label: 'On Site', color: '#8b5cf6' },
    { value: 'Completed', label: 'Completed', color: '#10b981' },
    { value: 'Issue', label: 'Issue', color: '#ef4444' },
    { value: 'Cancelled', label: 'Cancelled', color: '#9ca3af' }
  ];

  /**
   * Available job priorities
   */
  jobPriorityOptions = [
    { value: 'P1', label: 'P1 (Critical)', color: '#dc2626' },
    { value: 'P2', label: 'P2 (High)', color: '#f59e0b' },
    { value: 'P3', label: 'P3 (Normal)', color: '#6b7280' },
    { value: 'P4', label: 'P4 (Low)', color: '#6b7280' }
  ];

  /**
   * Toggle visibility of entity type
   */
  toggleEntityType(type: 'technicians' | 'crews' | 'jobs'): void {
    switch (type) {
      case 'technicians':
        this.filters.showTechnicians = !this.filters.showTechnicians;
        break;
      case 'crews':
        this.filters.showCrews = !this.filters.showCrews;
        break;
      case 'jobs':
        this.filters.showJobs = !this.filters.showJobs;
        break;
    }
    this.emitFilters();
  }

  /**
   * Toggle technician status filter
   */
  toggleTechnicianStatus(status: string): void {
    const index = this.filters.technicianStatuses.indexOf(status);
    if (index > -1) {
      this.filters.technicianStatuses.splice(index, 1);
    } else {
      this.filters.technicianStatuses.push(status);
    }
    this.emitFilters();
  }

  /**
   * Toggle crew status filter
   */
  toggleCrewStatus(status: string): void {
    const index = this.filters.crewStatuses.indexOf(status);
    if (index > -1) {
      this.filters.crewStatuses.splice(index, 1);
    } else {
      this.filters.crewStatuses.push(status);
    }
    this.emitFilters();
  }

  /**
   * Toggle job status filter
   */
  toggleJobStatus(status: string): void {
    const index = this.filters.jobStatuses.indexOf(status);
    if (index > -1) {
      this.filters.jobStatuses.splice(index, 1);
    } else {
      this.filters.jobStatuses.push(status);
    }
    this.emitFilters();
  }

  /**
   * Toggle job priority filter
   */
  toggleJobPriority(priority: string): void {
    const index = this.filters.jobPriorities.indexOf(priority);
    if (index > -1) {
      this.filters.jobPriorities.splice(index, 1);
    } else {
      this.filters.jobPriorities.push(priority);
    }
    this.emitFilters();
  }

  /**
   * Check if status is selected
   */
  isStatusSelected(type: 'technician' | 'crew' | 'job', status: string): boolean {
    switch (type) {
      case 'technician':
        return this.filters.technicianStatuses.includes(status);
      case 'crew':
        return this.filters.crewStatuses.includes(status);
      case 'job':
        return this.filters.jobStatuses.includes(status);
      default:
        return false;
    }
  }

  /**
   * Check if priority is selected
   */
  isPrioritySelected(priority: string): boolean {
    return this.filters.jobPriorities.includes(priority);
  }

  /**
   * Reset all filters to default
   */
  resetFilters(): void {
    this.filters = {
      showTechnicians: true,
      showCrews: true,
      showJobs: true,
      technicianStatuses: ['available', 'on-job', 'unavailable', 'off-duty'],
      crewStatuses: ['AVAILABLE', 'ON_JOB', 'UNAVAILABLE'],
      jobStatuses: ['NotStarted', 'EnRoute', 'OnSite', 'Completed', 'Issue', 'Cancelled'],
      jobPriorities: ['P1', 'P2', 'P3', 'P4']
    };
    this.emitFilters();
  }

  /**
   * Emit current filter state
   */
  private emitFilters(): void {
    this.filtersChanged.emit({ ...this.filters });
  }
}
