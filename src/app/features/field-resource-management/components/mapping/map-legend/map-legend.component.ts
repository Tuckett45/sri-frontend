import { Component, ChangeDetectionStrategy } from '@angular/core';

/**
 * Map Legend Component
 * 
 * Displays a legend/key explaining the map markers and their meanings.
 * Shows different marker types, colors, and what they represent.
 */
@Component({
  selector: 'frm-map-legend',
  templateUrl: './map-legend.component.html',
  styleUrls: ['./map-legend.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MapLegendComponent {
  /**
   * Legend is collapsed by default on mobile
   */
  isCollapsed = false;

  /**
   * Technician marker legend items
   */
  technicianLegend = [
    { color: '#10b981', label: 'Available', shape: 'circle' },
    { color: '#3b82f6', label: 'On Job', shape: 'circle' },
    { color: '#f59e0b', label: 'Unavailable', shape: 'circle' },
    { color: '#6b7280', label: 'Off Duty', shape: 'circle' }
  ];

  /**
   * Crew marker legend items
   */
  crewLegend = [
    { color: '#10b981', label: 'Available', shape: 'square' },
    { color: '#3b82f6', label: 'On Job', shape: 'square' },
    { color: '#f59e0b', label: 'Unavailable', shape: 'square' }
  ];

  /**
   * Job marker legend items
   */
  jobLegend = [
    { color: '#6b7280', label: 'Not Started', shape: 'diamond' },
    { color: '#3b82f6', label: 'En Route', shape: 'diamond' },
    { color: '#8b5cf6', label: 'On Site', shape: 'diamond' },
    { color: '#10b981', label: 'Completed', shape: 'diamond' },
    { color: '#ef4444', label: 'Issue', shape: 'diamond' },
    { color: '#9ca3af', label: 'Cancelled', shape: 'diamond' }
  ];

  /**
   * Job priority legend items
   */
  priorityLegend = [
    { color: '#dc2626', label: 'P1 (Critical)' },
    { color: '#f59e0b', label: 'P2 (High)' },
    { color: '#6b7280', label: 'P3/P4 (Normal/Low)' }
  ];

  /**
   * Toggle legend collapsed state
   */
  toggleCollapsed(): void {
    this.isCollapsed = !this.isCollapsed;
  }
}
