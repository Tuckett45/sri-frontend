import { Component } from '@angular/core';
import { Router } from '@angular/router';

interface PipelineStage {
  name: string;
  count: number;
  color: string;
  candidates: { name: string; position: string }[];
}

@Component({
  selector: 'app-onboarding-pipeline-dashboard',
  templateUrl: './pipeline-dashboard.component.html',
  styleUrls: ['./pipeline-dashboard.component.scss']
})
export class PipelineDashboardComponent {
  stages: PipelineStage[] = [
    { name: 'Applied', count: 5, color: '#9e9e9e', candidates: [{ name: 'Tom Lee', position: 'Technician' }] },
    { name: 'Screening', count: 3, color: '#2196f3', candidates: [{ name: 'Sarah Kim', position: 'Lead Tech' }] },
    { name: 'Offer', count: 2, color: '#ff9800', candidates: [{ name: 'Carlos M.', position: 'Technician' }] },
    { name: 'Pre-Employment', count: 2, color: '#9c27b0', candidates: [{ name: 'Priya N.', position: 'Specialist' }] },
    { name: 'Onboarding', count: 2, color: '#1976d2', candidates: [{ name: 'John Smith', position: 'Technician' }] },
    { name: 'Active', count: 8, color: '#4caf50', candidates: [{ name: 'Maria G.', position: 'Lead Tech' }] }
  ];

  constructor(private router: Router) {}

  viewCandidates(stage: string): void {
    this.router.navigate(['/field-resource-management/onboarding/candidates'], { queryParams: { status: stage } });
  }
}
