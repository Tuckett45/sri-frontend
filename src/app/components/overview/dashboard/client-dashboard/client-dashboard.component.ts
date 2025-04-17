import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from 'src/app/services/dashboard.service';
import { ChartModule } from 'primeng/chart';
import { DividerModule } from 'primeng/divider';
import { DashboardData } from 'src/app/models/dashboard.model';
import { AuthService } from 'src/app/services/auth.service';
import { User } from 'src/app/models/user.model';
import { VendorIssueStats } from 'src/app/models/vendor-issue-stats.model';

@Component({
  selector: 'client-dashboard',
  templateUrl: './client-dashboard.component.html',
  styleUrls: ['./client-dashboard.component.scss'],
  standalone: true,
  imports: [ChartModule, CommonModule, DividerModule]
})
export class ClientDashboardComponent implements OnInit {
  dashboardData!: DashboardData;
  user!: User;
  totalVendorIssueChartData: any;
  vendorIssueChartData: any;
  vendorPunchListChartData: any;
  userPunchListChartData: any;
  segmentIdPunchListChartData: any;
  monthlyPunchListChartData: any;
  streetSheetStats: any;
  clientOptions: any;
  issuesOptions: any;

  unresolvedTotalCount!: number;

  constructor(private dashboardService: DashboardService,
              private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getUser();
    this.fetchDashboardData();
  }


  fetchDashboardData(): void {
    if(this.user.role === 'CM' || this.user.role === 'Client' || this.user.role === 'Admin'){
      this.dashboardService.getClientStats().subscribe(
        (data: DashboardData) => {
          this.dashboardData = data;
          this.getUnresolvedTotal();
          this.totalVendorIssueChartData = {
            
            labels: data.totalVendorIssueStats.map(stat => stat.area),
            datasets: [
              {
                type: 'bar',
                label: 'Blue Edge',
                data: data.totalVendorIssueStats.map(stat => stat.blueEdgeIssues),
                backgroundColor: '#207bc5',
                borderColor: '#000000',
                borderWidth: 1
              },
              {
                type: 'bar',
                label: 'Congruex',
                data: data.totalVendorIssueStats.map(stat => stat.congruexIssues),
                backgroundColor: '#4CAF50',
                borderColor: '#000000',
                borderWidth: 1
              },
              {
                type: 'bar',
                label: 'Ervin',
                data: data.totalVendorIssueStats.map(stat => stat.ervinIssues),
                backgroundColor: '#FF2D2D',
                borderColor: '#000000',
                borderWidth: 1
              },
              {
                type: 'bar',
                label: 'North Star',
                data: data.totalVendorIssueStats.map(stat => stat.northStarIssues),
                backgroundColor: '#FFD700',
                borderColor: '#000000',
                borderWidth: 1
              }
            ]
          };
  
          this.vendorPunchListChartData = {
            labels: data.vendorPunchListStats.map(stat => stat.vendorName),
            datasets: [
              {
                label: 'Total Punch Lists',
                data: data.vendorPunchListStats.map(stat => stat.totalCount),
                backgroundColor: '#4CAF50',
                borderColor: '#000000',
                borderWidth: 1
              },
              {
                label: 'Resolved Punch Lists',
                data: data.vendorPunchListStats.map(stat => stat.resolvedCount),
                backgroundColor: '#FFD700',
                borderColor: '#000000',
                borderWidth: 1
              },
              {
                label: 'Unresolved Punch Lists',
                data: data.vendorPunchListStats.map(stat => stat.unresolvedCount),
                backgroundColor: '#FF2D2D',
                borderColor: '#000000',
                borderWidth: 1
              }
            ]
          };
  
          this.userPunchListChartData = {
            labels: data.userPunchListStats.map(stat => stat.name),
            datasets: [
              {
                label: 'Total Punch Lists',
                data: data.userPunchListStats.map(stat => stat.totalCountByUser),
                backgroundColor: '#207bc5',
                borderColor: '#000000',
                borderWidth: 1
              },
              {
                label: 'Resolved Punch Lists',
                data: data.userPunchListStats.map(stat => stat.resolvedCountByUser),
                backgroundColor: '#4CAF50',
                borderColor: '#000000',
                borderWidth: 1
              },
              {
                label: 'Unresolved Punch Lists',
                data: data.userPunchListStats.map(stat => stat.unresolvedCountByUser),
                backgroundColor: '#FF2D2D',
                borderColor: '#000000',
                borderWidth: 1
              }
            ]
          };

          this.segmentIdPunchListChartData = {
            labels: data.statePunchListStats.map(stat => stat.state),
            datasets: [
              {
                label: 'Total Punch Lists',
                data: data.statePunchListStats.map(stat => stat.totalCountByState),
                backgroundColor: '#207bc5',
                borderColor: '#000000',
                borderWidth: 1
              },
              {
                label: 'Resolved Punch Lists',
                data: data.statePunchListStats.map(stat => stat.resolvedCountByState),
                backgroundColor: '#4CAF50',
                borderColor: '#000000',
                borderWidth: 1
              },
              {
                label: 'Unresolved Punch Lists',
                data: data.statePunchListStats.map(stat => stat.unresolvedCountByState),
                backgroundColor: '#FF2D2D',
                borderColor: '#000000',
                borderWidth: 1
              }
            ]
          };
  
          this.monthlyPunchListChartData = {
            labels: ['Monthly Punch List Count'],
            datasets: [
              {
                label: 'Monthly Punch List Count',
                data: [data.monthlyPunchListCount],
                backgroundColor: '#FFB200',
                borderColor: '#000000',
                borderWidth: 1
              }
            ]
          };

          this.streetSheetStats = {
            labels: data.streetSheetStats.map(stat => stat.name),
            datasets: [
              {
                label: 'Total Punch Lists',
                data: data.streetSheetStats.map(stat => stat.streetSheetCount),
                backgroundColor: '#e18a25',
                borderColor: '#000000',
                borderWidth: 1
              }
            ]
          };

          this.clientOptions = {
            maintainAspectRatio: false,
            aspectRatio: 0.8,
            plugins: {
              tooltip: {
                mode: 'index',
                intersect: false,
                callbacks: {
                  label: (ctx: any) => {
                    const { datasetIndex, dataIndex, dataset, raw } = ctx;
                    const label = dataset.label;
                    const value = raw;
                    const total = ctx.chart.data.datasets[0].data[dataIndex];
          
                    if (datasetIndex === 0) {
                      return `${label}: ${value} (100%)`;
                    }

                    const pct = total
                      ? ((value / total) * 100).toFixed(1)
                      : '0';
                    return `${label}: ${value} (${pct}%)`;
                  }
                }
              },
              legend: {
                labels: {
                  color: '#000000', // Set legend text color to black
                }
              }
            },
            // scales: {
            //   x: {
            //     stacked: true, // Enable stacking on the x-axis
            //     ticks: {
            //       color: '#000000', // Set x-axis ticks color to black
            //     },
            //     grid: {
            //       color: '#000000', // Set grid color to black
            //       drawBorder: true, // Ensure border is drawn on the x-axis grid
            //     }
            //   },
            //   y: {
            //     stacked: true, // Enable stacking on the y-axis
            //     ticks: {
            //       color: '#000000', // Set y-axis ticks color to black
            //     },
            //     grid: {
            //       color: '#000000', // Set grid color to black
            //       drawBorder: true, // Ensure border is drawn on the y-axis grid
            //     }
            //   }
            // },
            borderColor: '#000000', // Set chart border color to black
            borderWidth: 1, // Optional: Set chart border width if needed
          };
          
          this.issuesOptions = {
            maintainAspectRatio: false,
            aspectRatio: 0.8,
            plugins: {
              tooltip: {
                mode: 'index',
                intersect: false,
                callbacks: {
                  label: (ctx: any) => {
                    const { datasetIndex, dataIndex, dataset, raw } = ctx;
                    const label = dataset.label;
                    const value = raw;
                    const total = ctx.chart.data.datasets[0].data[dataIndex];
          
                    if (datasetIndex === 0) {
                      return `${label}: ${value} (100%)`;
                    }

                    const pct = total
                      ? ((value / total) * 100).toFixed(1)
                      : '0';
                    return `${label}: ${value} (${pct}%)`;
                  }
                }
              },
              legend: {
                labels: {
                  color: '#000000', // Set legend text color to black
                }
              }
            },
            scales: {
              x: {
                stacked: true, // Enable stacking on the x-axis
                ticks: {
                  color: '#000000', // Set x-axis ticks color to black
                },
                grid: {
                  color: '#000000', // Set grid color to black
                  drawBorder: true, // Ensure border is drawn on the x-axis grid
                }
              },
              y: {
                stacked: true, // Enable stacking on the y-axis
                ticks: {
                  color: '#000000', // Set y-axis ticks color to black
                },
                grid: {
                  color: '#000000', // Set grid color to black
                  drawBorder: true, // Ensure border is drawn on the y-axis grid
                }
              }
            },
            borderColor: '#000000', // Set chart border color to black
            borderWidth: 1, // Optional: Set chart border width if needed
          };
          
        },
        (error) => {
          console.error('Error fetching dashboard data:', error);
        }
      );
    }
  }

  getUnresolvedTotal() {
    return this.dashboardData.vendorPunchListStats.reduce((total, vendorStat) => {
      return total + vendorStat.unresolvedCount;
    }, 0);
  }
}