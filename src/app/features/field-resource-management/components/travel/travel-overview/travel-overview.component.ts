import { Component, ChangeDetectionStrategy } from '@angular/core';

/**
 * Travel Overview Component
 * 
 * Top-level routable page for travel management.
 * Displays travel profiles and distance calculations.
 */
@Component({
  selector: 'app-travel-overview',
  templateUrl: './travel-overview.component.html',
  styleUrls: ['./travel-overview.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TravelOverviewComponent {
  selectedTechnicianId: string | null = null;
  selectedJobId: string | null = null;

  selectTechnician(technicianId: string): void {
    this.selectedTechnicianId = technicianId;
  }

  selectJob(jobId: string): void {
    this.selectedJobId = jobId;
  }
}
