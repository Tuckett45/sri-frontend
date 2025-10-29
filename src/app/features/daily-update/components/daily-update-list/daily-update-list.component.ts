import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DailyUpdateService } from '../../services/daily-update.service';
import { DailyUpdate, DailyUpdateFilter } from '../../models/daily-update.model';

@Component({
  selector: 'app-daily-update-list',
  templateUrl: './daily-update-list.component.html',
  styleUrls: ['./daily-update-list.component.scss']
})
export class DailyUpdateListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  dailyUpdates: DailyUpdate[] = [];
  filteredUpdates: DailyUpdate[] = [];
  loading = true;
  
  // Table configuration
  cols = [
    { field: 'endOfDay', header: 'Date', sortable: true },
    { field: 'bugNumber', header: 'Bug #', sortable: true },
    { field: 'site', header: 'Site', sortable: true },
    { field: 'pmNames', header: 'PM Names', sortable: false },
    { field: 'installProgress', header: 'Install %', sortable: true },
    { field: 'testProgress', header: 'Test %', sortable: true },
    { field: 'activeBlockers', header: 'Blockers', sortable: true },
    { field: 'openRMA', header: 'RMAs', sortable: true },
    { field: 'actions', header: 'Actions', sortable: false }
  ];

  // Filter options
  filterVisible = false;
  availableSites: string[] = [];
  availablePMs: string[] = [];
  selectedSites: string[] = [];
  selectedPMs: string[] = [];
  dateRange: Date[] = [];
  hasBlockersFilter: boolean | undefined = undefined;
  hasRMAsFilter: boolean | undefined = undefined;
  installProgressRange = [0, 100];

  // Pagination
  first = 0;
  rows = 10;
  totalRecords = 0;

  constructor(
    private dailyUpdateService: DailyUpdateService,
    private router: Router,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadDailyUpdates();
    this.loadFilterOptions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDailyUpdates(): void {
    this.loading = true;
    
    const filter: DailyUpdateFilter = {
      sites: this.selectedSites.length > 0 ? this.selectedSites : undefined,
      pmNames: this.selectedPMs.length > 0 ? this.selectedPMs : undefined,
      dateRange: this.dateRange.length === 2 ? {
        start: this.dateRange[0],
        end: this.dateRange[1]
      } : undefined,
      hasBlockers: this.hasBlockersFilter,
      hasOpenRMAs: this.hasRMAsFilter,
      installProgressRange: {
        min: this.installProgressRange[0],
        max: this.installProgressRange[1]
      }
    };

    this.dailyUpdateService.getDailyUpdates(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updates) => {
          this.dailyUpdates = updates;
          this.filteredUpdates = [...updates];
          this.totalRecords = updates.length;
          this.loading = false;
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load daily updates'
          });
          this.loading = false;
        }
      });
  }

  private loadFilterOptions(): void {
    this.dailyUpdateService.getSiteList()
      .pipe(takeUntil(this.destroy$))
      .subscribe(sites => {
        this.availableSites = sites;
      });

    this.dailyUpdateService.getPMList()
      .pipe(takeUntil(this.destroy$))
      .subscribe(pms => {
        this.availablePMs = pms;
      });
  }

  onFilterChange(): void {
    this.loadDailyUpdates();
  }

  clearFilters(): void {
    this.selectedSites = [];
    this.selectedPMs = [];
    this.dateRange = [];
    this.hasBlockersFilter = undefined;
    this.hasRMAsFilter = undefined;
    this.installProgressRange = [0, 100];
    this.loadDailyUpdates();
  }

  toggleFilter(): void {
    this.filterVisible = !this.filterVisible;
  }

  createNew(): void {
    this.router.navigate(['/daily-updates/form']);
  }

  editUpdate(update: DailyUpdate): void {
    this.router.navigate(['/daily-updates/form', update.id]);
  }

  viewUpdate(update: DailyUpdate): void {
    this.router.navigate(['/daily-updates/view', update.id]);
  }

  deleteUpdate(update: DailyUpdate): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete the daily update for ${update.site} on ${this.formatDate(update.endOfDay)}?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.dailyUpdateService.deleteDailyUpdate(update.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (success) => {
              if (success) {
                this.messageService.add({
                  severity: 'success',
                  summary: 'Success',
                  detail: 'Daily update deleted successfully'
                });
                this.loadDailyUpdates();
              } else {
                this.messageService.add({
                  severity: 'error',
                  summary: 'Error',
                  detail: 'Failed to delete daily update'
                });
              }
            },
            error: (error) => {
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to delete daily update'
              });
            }
          });
      }
    });
  }

  onPageChange(event: any): void {
    this.first = event.first;
    this.rows = event.rows;
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString();
  }

  formatPMNames(pmNames: string[]): string {
    return pmNames.join(', ');
  }

  calculateAverageProgress(progressArray: { percentage: number }[]): number {
    if (progressArray.length === 0) return 0;
    const sum = progressArray.reduce((acc, item) => acc + item.percentage, 0);
    return Math.round(sum / progressArray.length);
  }

  getProgressClass(percentage: number): string {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 70) return 'text-blue-600';
    if (percentage >= 50) return 'text-yellow-600';
    if (percentage >= 30) return 'text-orange-600';
    return 'text-red-600';
  }

  getBlockerSeverityClass(severity: string): string {
    switch (severity.toLowerCase()) {
      case 'critical': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-green-500';
      default: return 'text-gray-500';
    }
  }

  getRMAStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'pending': return 'text-yellow-500';
      case 'approved': return 'text-blue-500';
      case 'shipped': return 'text-purple-500';
      case 'received': return 'text-green-500';
      case 'installed': return 'text-green-600';
      case 'cancelled': return 'text-red-500';
      default: return 'text-gray-500';
    }
  }

  exportToCSV(): void {
    // This would typically use a CSV export library
    const csvData = this.filteredUpdates.map(update => ({
      'Bug Number': update.bugNumber,
      'Date': this.formatDate(update.endOfDay),
      'Site': update.site,
      'PM Names': this.formatPMNames(update.pmNames),
      'SOW': update.sow,
      'Install Progress': this.calculateAverageProgress(update.installPercentComplete) + '%',
      'Test Progress': this.calculateAverageProgress(update.testPercentComplete) + '%',
      'Active Blockers': update.activeBlockers.length,
      'Open RMAs': update.openRMA.length,
      'Completed Activity': update.completedActivity,
      'Planned Activity': update.plannedActivity,
      'Notes': update.notes
    }));

    // Simple CSV export implementation
    const csvContent = this.convertToCSV(csvData);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `daily-updates-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);

    this.messageService.add({
      severity: 'success',
      summary: 'Export Complete',
      detail: 'Daily updates exported to CSV successfully'
    });
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    
    const csvRows = data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape quotes and wrap in quotes if contains comma
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    );
    
    return [csvHeaders, ...csvRows].join('\n');
  }
}
