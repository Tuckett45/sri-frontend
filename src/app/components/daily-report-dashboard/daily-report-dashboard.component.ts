import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { DailyReport, UserSubmissionStatus } from 'src/app/models/daily-report.model';
import { DailyReportService } from 'src/app/services/daily-report.service';

@Component({
  selector: 'app-daily-report-dashboard',
  templateUrl: './daily-report-dashboard.component.html',
  styleUrls: ['./daily-report-dashboard.component.scss'],
  standalone: false
})
export class DailyReportDashboardComponent implements OnInit {
  selectedDate = new FormControl(new Date());
  userStatuses: UserSubmissionStatus[] = [];
  dailyReports: DailyReport[] = [];
  isLoading = false;
  isValidating: { [key: number]: boolean } = {};

  // Summary statistics
  totalUsers = 0;
  submittedCount = 0;
  notSubmittedCount = 0;
  submissionRate = 0;

  // Table columns
  userStatusColumns: string[] = ['userName', 'userEmail', 'status', 'lastSubmission'];
  reportColumns: string[] = ['userName', 'segmentId', 'currentLocation', 'submittedDate', 'isValidated', 'actions'];

  constructor(
    private dailyReportService: DailyReportService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
    
    // Reload data when date changes
    this.selectedDate.valueChanges.subscribe(() => {
      this.loadDashboardData();
    });
  }

  loadDashboardData(): void {
    const date = this.selectedDate.value || new Date();
    this.isLoading = true;

    // Load user submission status
    this.dailyReportService.getUserSubmissionStatus(date).subscribe({
      next: (statuses) => {
        this.userStatuses = statuses;
        this.calculateStatistics();
      },
      error: (error) => {
        console.error('Error loading user statuses:', error);
        this.toastr.error('Failed to load user submission status', 'Error');
      }
    });

    // Load daily reports
    this.dailyReportService.getReportsByDate(date).subscribe({
      next: (reports) => {
        this.dailyReports = reports;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading daily reports:', error);
        this.toastr.error('Failed to load daily reports', 'Error');
        this.isLoading = false;
      }
    });
  }

  calculateStatistics(): void {
    this.totalUsers = this.userStatuses.length;
    this.submittedCount = this.userStatuses.filter(u => u.hasSubmittedToday).length;
    this.notSubmittedCount = this.totalUsers - this.submittedCount;
    this.submissionRate = this.totalUsers > 0 
      ? Math.round((this.submittedCount / this.totalUsers) * 100) 
      : 0;
  }

  validateReport(reportId: number): void {
    if (!reportId) return;

    this.isValidating[reportId] = true;

    this.dailyReportService.validateReport(reportId).subscribe({
      next: (response) => {
        this.toastr.success('Report validated successfully', 'Success');
        this.isValidating[reportId] = false;
        
        // Update the report in the list
        const report = this.dailyReports.find(r => r.id === reportId);
        if (report) {
          report.isValidated = true;
          report.validatedDate = new Date();
        }
      },
      error: (error) => {
        console.error('Error validating report:', error);
        this.toastr.error('Failed to validate report', 'Error');
        this.isValidating[reportId] = false;
      }
    });
  }

  exportToCSV(): void {
    if (this.dailyReports.length === 0) {
      this.toastr.warning('No reports to export', 'Warning');
      return;
    }

    const csvHeaders = [
      'User Name',
      'User Email',
      'Segment ID',
      'Current Location',
      'Description of Work',
      'Forward Production',
      'Safety Concerns',
      'Incident/Delay Concerns',
      'Additional Comments',
      'CM Punch List Link',
      'Next Steps',
      'Submitted Date',
      'Validated',
      'Validated By',
      'Validated Date'
    ];

    const csvRows = this.dailyReports.map(report => [
      this.escapeCsvValue(report.userName || ''),
      this.escapeCsvValue(report.userEmail || ''),
      this.escapeCsvValue(report.segmentId),
      this.escapeCsvValue(report.currentLocation),
      this.escapeCsvValue(report.descriptionOfWork),
      this.escapeCsvValue(report.forwardProductionCompleted),
      this.escapeCsvValue(report.safetyConcerns),
      this.escapeCsvValue(report.incidentDelayConcerns),
      this.escapeCsvValue(report.additionalComments || ''),
      this.escapeCsvValue(report.cmPunchListLink || ''),
      this.escapeCsvValue(report.nextStepsAndFollowUp),
      report.submittedDate ? report.submittedDate.toLocaleString() : '',
      report.isValidated ? 'Yes' : 'No',
      this.escapeCsvValue(report.validatedBy || ''),
      report.validatedDate ? report.validatedDate.toLocaleString() : ''
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const dateStr = (this.selectedDate.value || new Date()).toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `daily-reports-${dateStr}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.toastr.success('Reports exported successfully', 'Success');
  }

  private escapeCsvValue(value: string): string {
    if (!value) return '""';
    
    // Escape double quotes and wrap in quotes if contains comma, newline, or quote
    const escaped = value.replace(/"/g, '""');
    if (escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')) {
      return `"${escaped}"`;
    }
    return escaped;
  }

  getSubmissionStatusClass(hasSubmitted: boolean): string {
    return hasSubmitted ? 'status-submitted' : 'status-not-submitted';
  }

  getSubmissionStatusText(hasSubmitted: boolean): string {
    return hasSubmitted ? 'Submitted' : 'Not Submitted';
  }

  formatDate(date: Date | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  }

  viewReportDetails(report: DailyReport): void {
    // TODO: Implement detail view modal if needed
    console.log('View report details:', report);
  }
}

