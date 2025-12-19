import { Component, OnInit } from '@angular/core';
import { ArkService } from '../../services/ark.service';
import { Job, CreateJobDto } from '../../models/ark.models';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-jobs-list',
  templateUrl: './jobs-list.component.html',
  styleUrls: ['./jobs-list.component.scss']
})
export class JobsListComponent implements OnInit {
  jobs: Job[] = [];
  loading: boolean = false;
  displayDialog: boolean = false;
  isEditing: boolean = false;
  selectedJob?: Job;

  // Filter options
  statuses: string[] = ['Open', 'In Progress', 'Completed', 'Cancelled'];
  priorities: string[] = ['Low', 'Medium', 'High', 'Critical'];
  jobTypes: string[] = ['Installation', 'Repair', 'Maintenance', 'Inspection', 'Emergency'];
  
  // Filter values
  selectedStatus?: string;
  selectedPriority?: string;
  searchCustomer?: string;

  jobForm: CreateJobDto = {
    jobNumber: '',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    jobTitle: '',
    jobDescription: '',
    jobType: 'Installation',
    priority: 'Medium',
    siteAddress: '',
    siteCity: '',
    latitude: undefined,
    longitude: undefined,
    requestedStartDate: undefined,
    requestedCompletionDate: undefined,
    requiredTechnicians: 1,
    estimatedCost: undefined
  };

  constructor(
    private arkService: ArkService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadJobs();
  }

  loadJobs(): void {
    this.loading = true;
    this.arkService.getAllJobs().subscribe({
      next: (data) => {
        this.jobs = data;
        this.loading = false;
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load jobs'
        });
        this.loading = false;
      }
    });
  }

  filterByStatus(): void {
    if (this.selectedStatus) {
      this.loading = true;
      this.arkService.getJobsByStatus(this.selectedStatus).subscribe({
        next: (data) => {
          this.jobs = data;
          this.loading = false;
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to filter jobs by status'
          });
          this.loading = false;
        }
      });
    } else {
      this.loadJobs();
    }
  }

  filterByPriority(): void {
    if (this.selectedPriority) {
      this.loading = true;
      this.arkService.getJobsByPriority(this.selectedPriority).subscribe({
        next: (data) => {
          this.jobs = data;
          this.loading = false;
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to filter jobs by priority'
          });
          this.loading = false;
        }
      });
    } else {
      this.loadJobs();
    }
  }

  searchByCustomer(): void {
    if (this.searchCustomer && this.searchCustomer.trim()) {
      this.loading = true;
      this.arkService.getJobsByCustomer(this.searchCustomer).subscribe({
        next: (data) => {
          this.jobs = data;
          this.loading = false;
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to search jobs by customer'
          });
          this.loading = false;
        }
      });
    } else {
      this.loadJobs();
    }
  }

  clearFilters(): void {
    this.selectedStatus = undefined;
    this.selectedPriority = undefined;
    this.searchCustomer = undefined;
    this.loadJobs();
  }

  showCreateDialog(): void {
    this.isEditing = false;
    this.displayDialog = true;
    this.resetForm();
  }

  showEditDialog(job: Job): void {
    this.isEditing = true;
    this.selectedJob = job;
    this.displayDialog = true;
    this.jobForm = {
      jobNumber: job.jobNumber,
      customerName: job.customerName,
      customerEmail: job.customerEmail,
      customerPhone: job.customerPhone,
      jobTitle: job.jobTitle,
      jobDescription: job.jobDescription,
      jobType: job.jobType,
      priority: job.priority,
      siteAddress: job.siteAddress,
      siteCity: job.siteCity,
      latitude: job.latitude,
      longitude: job.longitude,
      requestedStartDate: job.requestedStartDate,
      requestedCompletionDate: job.requestedCompletionDate,
      requiredTechnicians: job.requiredTechnicians,
      estimatedCost: job.estimatedCost
    };
  }

  saveJob(): void {
    if (this.isEditing && this.selectedJob) {
      this.arkService.updateJob(this.selectedJob.jobId, this.jobForm).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Job updated successfully'
          });
          this.loadJobs();
          this.displayDialog = false;
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to update job'
          });
        }
      });
    } else {
      this.arkService.createJob(this.jobForm).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Job created successfully'
          });
          this.loadJobs();
          this.displayDialog = false;
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to create job'
          });
        }
      });
    }
  }

  deleteJob(job: Job): void {
    if (confirm(`Are you sure you want to delete job ${job.jobNumber}?`)) {
      this.arkService.deleteJob(job.jobId).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Job deleted successfully'
          });
          this.loadJobs();
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to delete job'
          });
        }
      });
    }
  }

  getStatusSeverity(status: string): string {
    const severities: {[key: string]: string} = {
      'Open': 'info',
      'In Progress': 'warning',
      'Completed': 'success',
      'Cancelled': 'danger'
    };
    return severities[status] || 'info';
  }

  getPrioritySeverity(priority: string): string {
    const severities: {[key: string]: string} = {
      'Low': 'success',
      'Medium': 'info',
      'High': 'warning',
      'Critical': 'danger'
    };
    return severities[priority] || 'info';
  }

  resetForm(): void {
    this.jobForm = {
      jobNumber: '',
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      jobTitle: '',
      jobDescription: '',
      jobType: 'Installation',
      priority: 'Medium',
      siteAddress: '',
      siteCity: '',
      latitude: undefined,
      longitude: undefined,
      requestedStartDate: undefined,
      requestedCompletionDate: undefined,
      requiredTechnicians: 1,
      estimatedCost: undefined
    };
  }
}

