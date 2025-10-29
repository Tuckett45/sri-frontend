import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DailyUpdateService } from '../../services/daily-update.service';
import { DailyUpdate } from '../../models/daily-update.model';

@Component({
  selector: 'app-daily-update-reports',
  templateUrl: './daily-update-reports.component.html',
  styleUrls: ['./daily-update-reports.component.scss']
})
export class DailyUpdateReportsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  loading = true;
  dailyUpdates: DailyUpdate[] = [];
  
  // Chart data
  progressTrendData: any;
  blockerAnalysisData: any;
  sitePerformanceData: any;
  pmProductivityData: any;
  
  // Chart options
  chartOptions: any;
  doughnutOptions: any;

  constructor(private dailyUpdateService: DailyUpdateService) {
    this.initializeChartOptions();
  }

  ngOnInit(): void {
    this.loadReportData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadReportData(): void {
    this.loading = true;
    
    this.dailyUpdateService.getDailyUpdates()
      .pipe(takeUntil(this.destroy$))
      .subscribe(updates => {
        this.dailyUpdates = updates;
        this.generateCharts();
        this.loading = false;
      });
  }

  private generateCharts(): void {
    this.generateProgressTrendChart();
    this.generateBlockerAnalysisChart();
    this.generateSitePerformanceChart();
    this.generatePMProductivityChart();
  }

  private generateProgressTrendChart(): void {
    // Group updates by date and calculate average progress
    const dateGroups = new Map<string, { install: number[], test: number[] }>();
    
    this.dailyUpdates.forEach(update => {
      const dateKey = update.endOfDay.toISOString().split('T')[0];
      if (!dateGroups.has(dateKey)) {
        dateGroups.set(dateKey, { install: [], test: [] });
      }
      
      const installAvg = this.calculateAverageProgress(update.installPercentComplete);
      const testAvg = this.calculateAverageProgress(update.testPercentComplete);
      
      dateGroups.get(dateKey)!.install.push(installAvg);
      dateGroups.get(dateKey)!.test.push(testAvg);
    });

    const sortedDates = Array.from(dateGroups.keys()).sort();
    const installData = sortedDates.map(date => {
      const values = dateGroups.get(date)!.install;
      return values.reduce((sum, val) => sum + val, 0) / values.length;
    });
    const testData = sortedDates.map(date => {
      const values = dateGroups.get(date)!.test;
      return values.reduce((sum, val) => sum + val, 0) / values.length;
    });

    this.progressTrendData = {
      labels: sortedDates.map(date => new Date(date).toLocaleDateString()),
      datasets: [
        {
          label: 'Install Progress',
          data: installData,
          borderColor: '#42A5F5',
          backgroundColor: 'rgba(66, 165, 245, 0.1)',
          tension: 0.4
        },
        {
          label: 'Test Progress',
          data: testData,
          borderColor: '#66BB6A',
          backgroundColor: 'rgba(102, 187, 106, 0.1)',
          tension: 0.4
        }
      ]
    };
  }

  private generateBlockerAnalysisChart(): void {
    const blockerCounts = new Map<string, number>();
    
    this.dailyUpdates.forEach(update => {
      update.activeBlockers.forEach(blocker => {
        const category = blocker.category;
        blockerCounts.set(category, (blockerCounts.get(category) || 0) + 1);
      });
    });

    const labels = Array.from(blockerCounts.keys());
    const data = Array.from(blockerCounts.values());

    this.blockerAnalysisData = {
      labels,
      datasets: [
        {
          data,
          backgroundColor: [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
            '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
          ]
        }
      ]
    };
  }

  private generateSitePerformanceChart(): void {
    const siteStats = new Map<string, { total: number, avgInstall: number, avgTest: number, blockers: number }>();
    
    this.dailyUpdates.forEach(update => {
      const site = update.site;
      if (!siteStats.has(site)) {
        siteStats.set(site, { total: 0, avgInstall: 0, avgTest: 0, blockers: 0 });
      }
      
      const stats = siteStats.get(site)!;
      stats.total++;
      stats.avgInstall += this.calculateAverageProgress(update.installPercentComplete);
      stats.avgTest += this.calculateAverageProgress(update.testPercentComplete);
      stats.blockers += update.activeBlockers.length;
    });

    // Calculate averages
    siteStats.forEach((stats, site) => {
      stats.avgInstall = stats.avgInstall / stats.total;
      stats.avgTest = stats.avgTest / stats.total;
    });

    const sites = Array.from(siteStats.keys()).slice(0, 8); // Top 8 sites
    const installData = sites.map(site => Math.round(siteStats.get(site)!.avgInstall));
    const testData = sites.map(site => Math.round(siteStats.get(site)!.avgTest));

    this.sitePerformanceData = {
      labels: sites,
      datasets: [
        {
          label: 'Avg Install Progress (%)',
          data: installData,
          backgroundColor: '#42A5F5'
        },
        {
          label: 'Avg Test Progress (%)',
          data: testData,
          backgroundColor: '#66BB6A'
        }
      ]
    };
  }

  private generatePMProductivityChart(): void {
    const pmStats = new Map<string, { updates: number, avgProgress: number }>();
    
    this.dailyUpdates.forEach(update => {
      update.pmNames.forEach(pm => {
        if (!pmStats.has(pm)) {
          pmStats.set(pm, { updates: 0, avgProgress: 0 });
        }
        
        const stats = pmStats.get(pm)!;
        stats.updates++;
        stats.avgProgress += this.calculateAverageProgress(update.installPercentComplete);
      });
    });

    // Calculate averages
    pmStats.forEach((stats, pm) => {
      stats.avgProgress = stats.avgProgress / stats.updates;
    });

    const pms = Array.from(pmStats.keys());
    const updatesData = pms.map(pm => pmStats.get(pm)!.updates);
    const progressData = pms.map(pm => Math.round(pmStats.get(pm)!.avgProgress));

    this.pmProductivityData = {
      labels: pms,
      datasets: [
        {
          label: 'Number of Updates',
          data: updatesData,
          backgroundColor: '#FF9F40',
          yAxisID: 'y'
        },
        {
          label: 'Avg Progress (%)',
          data: progressData,
          backgroundColor: '#9966FF',
          yAxisID: 'y1'
        }
      ]
    };
  }

  private calculateAverageProgress(progressArray: { percentage: number }[]): number {
    if (progressArray.length === 0) return 0;
    const sum = progressArray.reduce((acc, item) => acc + item.percentage, 0);
    return sum / progressArray.length;
  }

  private initializeChartOptions(): void {
    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top'
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    };

    this.doughnutOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    };
  }

  refreshReports(): void {
    this.loadReportData();
  }
}

