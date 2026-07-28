import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../../../environments/environments';
import { SUPPORTED_MARKETS } from '../../../models/overtime.models';

interface TimeOffReportEntry {
  id: string;
  type: string;
  submissionDate: string;
  employeeName: string;
  emailedLead: string | null;
  approved: string | null;
  startDate: string;
  endDate: string;
  market: string | null;
  outOfOfficeNotifications: string | null;
  coveragePerson: string | null;
  status: string;
  requestType: string | null;
  justification: string | null;
}

interface PaginatedReport {
  items: TimeOffReportEntry[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface ReportFilters {
  startDate: string;
  endDate: string;
  market: string;
  status: string;
  type: string;
  sortBy: string;
  sortDir: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

/**
 * PTO Reports Component
 *
 * Data table view showing all PTO and overtime submissions with:
 * - Column headers matching Google Sheets reference
 * - Filters: date range, market, status, type
 * - Sortable columns
 * - Pagination (25 rows default)
 * - CSV export button
 */
@Component({
  selector: 'app-pto-reports',
  templateUrl: './pto-reports.component.html',
  styleUrls: ['./pto-reports.component.scss']
})
export class PtoReportsComponent implements OnInit {
  private readonly apiUrl = `${environment.atlasApiUrl}/reports/time-off`;

  /** Report data */
  reportData: TimeOffReportEntry[] = [];
  totalCount = 0;
  totalPages = 0;
  loading = false;
  error: string | null = null;
  exporting = false;

  /** Markets for filter */
  markets = SUPPORTED_MARKETS;

  /** Status options */
  statusOptions = ['', 'Pending', 'ManagerApproved', 'Approved', 'Rejected', 'Cancelled'];

  /** Type options */
  typeOptions = [
    { value: '', label: 'All' },
    { value: 'pto', label: 'PTO Only' },
    { value: 'overtime', label: 'Overtime Only' }
  ];

  /** Current filters */
  filters: ReportFilters = {
    startDate: '',
    endDate: '',
    market: '',
    status: '',
    type: '',
    sortBy: 'submissionDate',
    sortDir: 'desc',
    page: 1,
    pageSize: 25
  };

  /** Column definitions for sort */
  columns = [
    { key: 'type', label: 'Type' },
    { key: 'submissionDate', label: 'Timestamp' },
    { key: 'employeeName', label: 'Employee Name' },
    { key: 'emailedLead', label: 'Emailed Lead' },
    { key: 'approved', label: 'Approved' },
    { key: 'startDate', label: 'Start Date' },
    { key: 'endDate', label: 'End Date' },
    { key: 'market', label: 'Market' },
    { key: 'status', label: 'Status' }
  ];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadReport();
  }

  /**
   * Load report data from API
   */
  loadReport(): void {
    this.loading = true;
    this.error = null;

    let params = new HttpParams()
      .set('page', this.filters.page.toString())
      .set('pageSize', this.filters.pageSize.toString())
      .set('sortBy', this.filters.sortBy)
      .set('sortDir', this.filters.sortDir);

    if (this.filters.startDate) params = params.set('startDate', this.filters.startDate);
    if (this.filters.endDate) params = params.set('endDate', this.filters.endDate);
    if (this.filters.market) params = params.set('market', this.filters.market);
    if (this.filters.status) params = params.set('status', this.filters.status);
    if (this.filters.type) params = params.set('type', this.filters.type);

    this.http.get<PaginatedReport>(this.apiUrl, { params }).subscribe({
      next: (result) => {
        this.reportData = result.items;
        this.totalCount = result.totalCount;
        this.totalPages = result.totalPages;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load report data. Please try again.';
        this.loading = false;
      }
    });
  }

  /**
   * Apply filters and reload
   */
  applyFilters(): void {
    this.filters.page = 1;
    this.loadReport();
  }

  /**
   * Reset all filters
   */
  resetFilters(): void {
    this.filters = {
      startDate: '',
      endDate: '',
      market: '',
      status: '',
      type: '',
      sortBy: 'submissionDate',
      sortDir: 'desc',
      page: 1,
      pageSize: 25
    };
    this.loadReport();
  }

  /**
   * Sort by column
   */
  sortBy(column: string): void {
    if (this.filters.sortBy === column) {
      this.filters.sortDir = this.filters.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.filters.sortBy = column;
      this.filters.sortDir = 'asc';
    }
    this.loadReport();
  }

  /**
   * Get sort indicator for column
   */
  getSortIndicator(column: string): string {
    if (this.filters.sortBy !== column) return '';
    return this.filters.sortDir === 'asc' ? ' \u25B2' : ' \u25BC';
  }

  /**
   * Navigate to page
   */
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.filters.page = page;
    this.loadReport();
  }

  /**
   * Export CSV
   */
  exportCsv(): void {
    this.exporting = true;

    let params = new HttpParams()
      .set('sortBy', this.filters.sortBy)
      .set('sortDir', this.filters.sortDir);

    if (this.filters.startDate) params = params.set('startDate', this.filters.startDate);
    if (this.filters.endDate) params = params.set('endDate', this.filters.endDate);
    if (this.filters.market) params = params.set('market', this.filters.market);
    if (this.filters.status) params = params.set('status', this.filters.status);
    if (this.filters.type) params = params.set('type', this.filters.type);

    this.http.get(`${this.apiUrl}/export`, {
      params,
      responseType: 'blob'
    }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `time-off-report-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.exporting = false;
      },
      error: () => {
        this.error = 'Export failed. Please try again.';
        this.exporting = false;
      }
    });
  }

  /**
   * Get page numbers array for pagination
   */
  getPages(): number[] {
    const pages: number[] = [];
    const start = Math.max(1, this.filters.page - 2);
    const end = Math.min(this.totalPages, this.filters.page + 2);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }
}
