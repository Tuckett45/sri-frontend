import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { TimeCardApiService } from '../../../services/timecard-api.service';
import { TimeCard, TimeCardListItem, TimeCardStatus, TimeCardSearchParams } from '../../../models/timecard.model';
import { ToastrService } from 'ngx-toastr';
import { SelectionModel } from '@angular/cdk/collections';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface FilterCriteria {
  startDate: Date | null;
  endDate: Date | null;
  employeeName: string;
  jobCode: string;
  projectId: string;
  status: TimeCardStatus | '';
}

@Component({
  selector: 'app-hr-timecards-page',
  templateUrl: './hr-timecards-page.component.html',
  styleUrls: ['./hr-timecards-page.component.scss']
})
export class HrTimeCardsPageComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @Input() showDashboardShortcut = true;

  timecards: TimeCardListItem[] = [];
  loading = false;
  totalItems = 0;
  pageSize = 25;
  currentPage = 0;
  pageSizeOptions = [10, 25, 50, 100];

  // Selection
  selection = new SelectionModel<TimeCardListItem>(true, []);
  statusUpdatingIds = new Set<string>();

  // Filters
  showFilters = false;
  filters: FilterCriteria = {
    startDate: null,
    endDate: null,
    employeeName: '',
    jobCode: '',
    projectId: '',
    status: ''
  };

  // Stats
  pendingApprovalsCount = 0;

  // Status options
  statusOptions: { value: TimeCardStatus | '', label: string }[] = [
    { value: '', label: 'All Statuses' },
    { value: TimeCardStatus.Draft, label: 'Draft' },
    { value: TimeCardStatus.Submitted, label: 'Submitted' },
    { value: TimeCardStatus.Approved, label: 'Approved' },
    { value: TimeCardStatus.Rejected, label: 'Rejected' }
  ];

  constructor(
    private timecardApi: TimeCardApiService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadTimeCards();
    this.loadPendingCount();
  }

  loadTimeCards(): void {
    this.loading = true;
    const params: TimeCardSearchParams = {
      page: this.currentPage + 1,
      pageSize: this.pageSize,
      includeEntries: false
    };

    // Check if we have active filters
    if (this.hasActiveFilters()) {
      this.loadFilteredTimeCards(params);
    } else {
      this.timecardApi.getTimeCards(params).subscribe({
        next: (response) => {
          this.timecards = response.items;
          this.totalItems = response.total || 0;
          this.loading = false;
          this.selection.clear();
        },
        error: (error) => {
          console.error('Error loading timecards:', error);
          this.toastr.error('Failed to load timecards');
          this.loading = false;
        }
      });
    }
  }

  loadFilteredTimeCards(baseParams: TimeCardSearchParams): void {
    const searchParams: TimeCardSearchParams = {
      ...baseParams,
      userName: this.filters.employeeName || undefined,
      jobCode: this.filters.jobCode || undefined,
      projectId: this.filters.projectId || undefined,
      status: this.filters.status || undefined,
      from: this.filters.startDate ? this.filters.startDate.toISOString().split('T')[0] : undefined,
      to: this.filters.endDate ? this.filters.endDate.toISOString().split('T')[0] : undefined
    };

    this.timecardApi.searchTimeCards(searchParams).subscribe({
      next: (response) => {
        this.timecards = response.items;
        this.totalItems = response.total || 0;
        this.loading = false;
        this.selection.clear();
      },
      error: (error) => {
        console.error('Error searching timecards:', error);
        this.toastr.error('Failed to search timecards');
        this.loading = false;
      }
    });
  }

  loadPendingCount(): void {
    this.timecardApi.getPendingApprovalsCount().subscribe({
      next: (count) => {
        this.pendingApprovalsCount = count;
      },
      error: (error) => {
        console.error('Error loading pending count:', error);
      }
    });
  }

  hasActiveFilters(): boolean {
    return !!(
      this.filters.startDate ||
      this.filters.endDate ||
      this.filters.employeeName ||
      this.filters.jobCode ||
      this.filters.projectId ||
      this.filters.status
    );
  }

  onFiltersChange(filters: any): void {
    this.filters = filters;
    this.currentPage = 0;
    this.loadTimeCards();
  }

  clearFilters(): void {
    this.filters = {
      startDate: null,
      endDate: null,
      employeeName: '',
      jobCode: '',
      projectId: '',
      status: ''
    };
    this.currentPage = 0;
    this.loadTimeCards();
  }

  onPageChange(event: any): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadTimeCards();
  }

  // Selection methods
  isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.timecards.filter(tc => tc.status === 'Submitted').length;
    return numSelected === numRows && numRows > 0;
  }

  masterToggle(): void {
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.timecards
        .filter(tc => tc.status === 'Submitted')
        .forEach(tc => this.selection.select(tc));
    }
  }

  canSelect(timecard: TimeCardListItem): boolean {
    return timecard.status === 'Submitted';
  }

  // Bulk actions
  bulkApprove(): void {
    const ids = this.selection.selected.map(tc => tc.id);
    if (ids.length === 0) {
      this.toastr.warning('Please select timecards to approve');
      return;
    }

    if (!confirm(`Are you sure you want to approve ${ids.length} timecard(s)?`)) {
      return;
    }

    this.loading = true;
    this.timecardApi.bulkApprove(ids).subscribe({
      next: () => {
        this.toastr.success(`Approved ${ids.length} timecard(s)`);
        this.loadTimeCards();
        this.loadPendingCount();
      },
      error: (error) => {
        console.error('Error bulk approving:', error);
        this.toastr.error('Failed to approve timecards');
        this.loading = false;
      }
    });
  }

  bulkReject(): void {
    const ids = this.selection.selected.map(tc => tc.id);
    if (ids.length === 0) {
      this.toastr.warning('Please select timecards to reject');
      return;
    }

    const reason = prompt(`Please provide a reason for rejecting ${ids.length} timecard(s):`);
    if (reason === null) {
      return; // User cancelled
    }

    this.loading = true;
    this.timecardApi.bulkReject(ids, reason).subscribe({
      next: () => {
        this.toastr.success(`Rejected ${ids.length} timecard(s)`);
        this.loadTimeCards();
        this.loadPendingCount();
      },
      error: (error) => {
        console.error('Error bulk rejecting:', error);
        this.toastr.error('Failed to reject timecards');
        this.loading = false;
      }
    });
  }

  // Individual actions
  approveTimeCard(timecard: TimeCardListItem): void {
    if (timecard.status !== 'Submitted') {
      this.toastr.warning('Only submitted timecards can be approved');
      return;
    }

    this.statusUpdatingIds.add(timecard.id);
    this.timecardApi.approveTimeCard(timecard.id).subscribe({
      next: () => {
        this.toastr.success('TimeCard approved');
        this.loadTimeCards();
        this.loadPendingCount();
        this.statusUpdatingIds.delete(timecard.id);
      },
      error: (error) => {
        console.error('Error approving timecard:', error);
        this.toastr.error('Failed to approve timecard');
        this.statusUpdatingIds.delete(timecard.id);
      }
    });
  }

  rejectTimeCard(timecard: TimeCardListItem): void {
    if (timecard.status !== 'Submitted') {
      this.toastr.warning('Only submitted timecards can be rejected');
      return;
    }

    const reason = prompt('Please provide a reason for rejection:');
    if (reason === null) {
      return; // User cancelled
    }

    this.statusUpdatingIds.add(timecard.id);
    this.timecardApi.rejectTimeCard(timecard.id, reason).subscribe({
      next: () => {
        this.toastr.success('TimeCard rejected');
        this.loadTimeCards();
        this.loadPendingCount();
        this.statusUpdatingIds.delete(timecard.id);
      },
      error: (error) => {
        console.error('Error rejecting timecard:', error);
        this.toastr.error('Failed to reject timecard');
        this.statusUpdatingIds.delete(timecard.id);
      }
    });
  }

  viewDetails(timecard: TimeCardListItem): void {
    // TODO: Implement details view/modal
    this.toastr.info('Details view coming soon');
  }

  isUpdating(id: string): boolean {
    return this.statusUpdatingIds.has(id);
  }

  // Export functions
  exportToCSV(): void {
    if (this.timecards.length === 0) {
      this.toastr.warning('No timecards to export');
      return;
    }

    const headers = ['Employee', 'Week Ending', 'Total Hours', 'Job Codes', 'Status', 'Submitted Date'];
    const rows = this.timecards.map(tc => [
      tc.userName,
      this.formatDate(tc.weekEnding),
      tc.totalHours.toString(),
      (tc.jobCodes || []).join(', '),
      tc.status,
      tc.submittedDate ? this.formatDate(tc.submittedDate) : 'N/A'
    ]);

    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
      csv += row.map(cell => `"${cell}"`).join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `timecards_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);

    this.toastr.success('Exported to CSV');
  }

  exportToPDF(): void {
    if (this.timecards.length === 0) {
      this.toastr.warning('No timecards to export');
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('TimeCards Report', 14, 20);
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

    const tableData = this.timecards.map(tc => [
      tc.userName,
      this.formatDate(tc.weekEnding),
      tc.totalHours.toString(),
      (tc.jobCodes || []).join(', '),
      tc.status,
      tc.submittedDate ? this.formatDate(tc.submittedDate) : 'N/A'
    ]);

    autoTable(doc, {
      head: [['Employee', 'Week Ending', 'Hours', 'Job Codes', 'Status', 'Submitted']],
      body: tableData,
      startY: 35,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [63, 81, 181] }
    });

    doc.save(`timecards_${new Date().toISOString().split('T')[0]}.pdf`);
    this.toastr.success('Exported to PDF');
  }

  // Utility methods
  formatDate(date: string | Date): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString();
  }

  getStatusClass(status: TimeCardStatus): string {
    const statusMap: Record<TimeCardStatus, string> = {
      'Draft': 'status-draft',
      'Submitted': 'status-submitted',
      'Approved': 'status-approved',
      'Rejected': 'status-rejected'
    };
    return statusMap[status] || '';
  }
}
