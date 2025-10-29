import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DailyUpdateService } from '../../services/daily-update.service';
import { DailyUpdate, DailyUpdateSummary } from '../../models/daily-update.model';

@Component({
  selector: 'app-daily-update-dashboard',
  templateUrl: './daily-update-dashboard.component.html',
  styleUrls: ['./daily-update-dashboard.component.scss']
})
export class DailyUpdateDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  summary: DailyUpdateSummary = {
    totalReports: 0,
    activeBlockers: 0,
    openRMAs: 0,
    averageInstallProgress: 0,
    averageTestProgress: 0,
    sitesWithIssues: 0,
    completedToday: 0
  };

  recentUpdates: DailyUpdate[] = [];
  updatesWithBlockers: DailyUpdate[] = [];
  updatesWithRMAs: DailyUpdate[] = [];
  
  // Chart data
  progressChartData: any;
  progressChartOptions: any;
  
  blockerChartData: any;
  blockerChartOptions: any;
  
  siteActivityChartData: any;
  siteActivityChartOptions: any;

  loading = true;

  constructor(private dailyUpdateService: DailyUpdateService) {
    this.initializeChartOptions();
  }

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDashboardData(): void {
    this.loading = true;

    // Load summary data
    this.dailyUpdateService.getDailyUpdateSummary()
      .pipe(takeUntil(this.destroy$))
      .subscribe(summary => {
        this.summary = summary;
        this.updateProgressChart();
      });

    // Load recent updates
    this.dailyUpdateService.getRecentUpdates(5)
      .pipe(takeUntil(this.destroy$))
      .subscribe(updates => {
        this.recentUpdates = updates;
      });

    // Load updates with blockers
    this.dailyUpdateService.getUpdatesWithActiveBlockers()
      .pipe(takeUntil(this.destroy$))
      .subscribe(updates => {
        this.updatesWithBlockers = updates;
        this.updateBlockerChart();
      });

    // Load updates with RMAs
    this.dailyUpdateService.getUpdatesWithOpenRMAs()
      .pipe(takeUntil(this.destroy$))
      .subscribe(updates => {
        this.updatesWithRMAs = updates;
      });

    // Load all updates for site activity chart
    this.dailyUpdateService.getDailyUpdates()
      .pipe(takeUntil(this.destroy$))
      .subscribe(updates => {
        this.updateSiteActivityChart(updates);
        this.loading = false;
      });
  }

  private updateProgressChart(): void {
    this.progressChartData = {
      labels: ['Install Progress', 'Test Progress'],
      datasets: [
        {
          label: 'Average Progress (%)',
          data: [this.summary.averageInstallProgress, this.summary.averageTestProgress],
          backgroundColor: ['#42A5F5', '#66BB6A'],
          borderColor: ['#1E88E5', '#43A047'],
          borderWidth: 1
        }
      ]
    };
  }

  private updateBlockerChart(): void {
    const blockerCounts = new Map<string, number>();
    
    this.updatesWithBlockers.forEach(update => {
      update.activeBlockers.forEach(blocker => {
        const category = blocker.category;
        blockerCounts.set(category, (blockerCounts.get(category) || 0) + 1);
      });
    });

    const labels = Array.from(blockerCounts.keys());
    const data = Array.from(blockerCounts.values());

    this.blockerChartData = {
      labels,
      datasets: [
        {
          label: 'Active Blockers by Category',
          data,
          backgroundColor: [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
            '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
          ]
        }
      ]
    };
  }

  private updateSiteActivityChart(updates: DailyUpdate[]): void {
    const siteActivity = new Map<string, number>();
    
    updates.forEach(update => {
      const site = update.site;
      siteActivity.set(site, (siteActivity.get(site) || 0) + 1);
    });

    const sortedSites = Array.from(siteActivity.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8); // Top 8 sites

    this.siteActivityChartData = {
      labels: sortedSites.map(([site]) => site),
      datasets: [
        {
          label: 'Reports per Site',
          data: sortedSites.map(([, count]) => count),
          backgroundColor: '#42A5F5',
          borderColor: '#1E88E5',
          borderWidth: 1
        }
      ]
    };
  }

  private initializeChartOptions(): void {
    this.progressChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            callback: function(value: any) {
              return value + '%';
            }
          }
        }
      }
    };

    this.blockerChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    };

    this.siteActivityChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      }
    };
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

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString();
  }

  refreshDashboard(): void {
    this.loadDashboardData();
  }
}

