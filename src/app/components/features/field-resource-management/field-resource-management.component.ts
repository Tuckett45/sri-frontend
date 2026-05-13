import { Component, OnInit } from '@angular/core';
import { FieldResourceService } from 'src/app/services/field-resource.service';
import { Job, JobStatus, Technician, EmploymentStatus } from 'src/app/models/field-resource.model';

@Component({
  selector: 'app-field-resource-management',
  templateUrl: './field-resource-management.component.html',
  styleUrls: ['./field-resource-management.component.scss'],
  standalone: false
})
export class FieldResourceManagementComponent implements OnInit {
  technicians: Technician[] = [];
  jobs: Job[] = [];
  isLoading = true;
  error: string | null = null;

  totalTechnicians = 0;
  activeTechnicians = 0;
  openJobs = 0;
  completedJobs = 0;

  activeTab = 0;

  readonly JobStatus = JobStatus;

  constructor(private fieldResourceService: FieldResourceService) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.isLoading = true;
    this.error = null;

    this.fieldResourceService.getTechnicians({ pageSize: 100, employmentStatus: EmploymentStatus.Active }).subscribe({
      next: response => {
        this.technicians = response.items ?? [];
        this.totalTechnicians = response.total ?? 0;
        this.activeTechnicians = response.total ?? 0;
      },
      error: err => {
        console.error('Failed to load technicians', err);
        this.error = 'Failed to load field resource data.';
      }
    });

    this.fieldResourceService.getJobs({ pageSize: 50 }).subscribe({
      next: response => {
        this.jobs = response.items ?? [];
        this.openJobs = this.jobs.filter(j => j.status !== JobStatus.Completed).length;
        this.completedJobs = this.jobs.filter(j => j.status === JobStatus.Completed).length;
        this.isLoading = false;
      },
      error: err => {
        console.error('Failed to load jobs', err);
        this.error = 'Failed to load field resource data.';
        this.isLoading = false;
      }
    });
  }

  getStatusClass(status: JobStatus): string {
    const map: Record<JobStatus, string> = {
      [JobStatus.NotStarted]: 'status-not-started',
      [JobStatus.EnRoute]: 'status-en-route',
      [JobStatus.OnSite]: 'status-on-site',
      [JobStatus.Completed]: 'status-completed',
      [JobStatus.Issue]: 'status-issue'
    };
    return map[status] ?? '';
  }

  getStatusLabel(status: JobStatus): string {
    const map: Record<JobStatus, string> = {
      [JobStatus.NotStarted]: 'Not Started',
      [JobStatus.EnRoute]: 'En Route',
      [JobStatus.OnSite]: 'On Site',
      [JobStatus.Completed]: 'Completed',
      [JobStatus.Issue]: 'Issue'
    };
    return map[status] ?? status;
  }
}
