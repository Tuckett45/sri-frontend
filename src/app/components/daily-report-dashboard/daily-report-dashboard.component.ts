import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { saveAs } from 'file-saver';
import { DailyReport, UserSubmissionStatus } from 'src/app/models/daily-report.model';
import { User } from 'src/app/models/user.model';
import { AuthService } from 'src/app/services/auth.service';
import { DailyReportService } from 'src/app/services/daily-report.service';

@Component({
  selector: 'app-daily-report-dashboard',
  templateUrl: './daily-report-dashboard.component.html',
  styleUrls: ['./daily-report-dashboard.component.scss'],
  standalone: false
})
export class DailyReportDashboardComponent implements OnInit, OnChanges {
  selectedDate = new FormControl(new Date());
  userStatuses: UserSubmissionStatus[] = [];
  dailyReports: DailyReport[] = [];
  isLoading = false;
  isValidating: { [key: number]: boolean } = {};
  @Input() marketFilter?: string | null;
  private normalizedMarketFilter: string | null = null;
  user!: User;

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
    public authService: AuthService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.normalizedMarketFilter = this.normalizeMarket(this.marketFilter);
    this.loadDashboardData();
    
    // Reload data when date changes
    this.selectedDate.valueChanges.subscribe(() => {
      this.loadDashboardData();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['marketFilter']) {
      this.normalizedMarketFilter = this.normalizeMarket(changes['marketFilter'].currentValue);
      if (!changes['marketFilter'].firstChange) {
        this.loadDashboardData();
      }
    }
  }

  loadDashboardData(): void {
    const date = this.selectedDate.value || new Date();
    this.isLoading = true;
    this.user = this.authService.getUser();

    // Load user submission status
    this.dailyReportService.getUserSubmissionStatus(date, this.user.market).subscribe({
      next: (statuses) => {
        this.userStatuses = this.applyMarketFilterToStatuses(statuses);
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
        this.dailyReports = this.applyMarketFilterToReports(reports);
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
    if (!this.dailyReports?.length) {
      this.toastr.warning('No reports to export', 'Warning');
      return;
    }

    try {
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

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const dateStr = this.getSelectedDateForExport().toISOString().split('T')[0];
      saveAs(blob, `daily-reports-${dateStr}.csv`);

      this.toastr.success('Reports exported successfully', 'Success');
    } catch (error) {
      console.error('Failed to export CSV', error);
      this.toastr.error('Failed to export reports', 'Error');
    }
  }

  private getSelectedDateForExport(): Date {
    const selected = this.selectedDate.value;
    if (selected instanceof Date) {
      return selected;
    }
    return selected ? new Date(selected) : new Date();
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

  private normalizeMarket(value?: string | null): string | null {
    const trimmed = (value ?? '').trim();
    return trimmed ? trimmed.toUpperCase() : null;
  }

  private applyMarketFilterToStatuses(statuses: UserSubmissionStatus[]): UserSubmissionStatus[] {
    if (!this.normalizedMarketFilter) {
      return statuses;
    }

    return statuses.filter(status => this.normalizeMarket(status.market) === this.normalizedMarketFilter);
  }

  private applyMarketFilterToReports(reports: DailyReport[]): DailyReport[] {
    if (!this.normalizedMarketFilter) {
      return reports;
    }

    return reports.filter(report => this.normalizeMarket(report.market) === this.normalizedMarketFilter);
  }
}
