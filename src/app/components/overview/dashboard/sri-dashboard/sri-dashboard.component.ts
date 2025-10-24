import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from 'src/app/services/dashboard.service';
import { ChartModule } from 'primeng/chart';
import { DividerModule } from 'primeng/divider';
import { DashboardData } from 'src/app/models/dashboard.model';
import { AuthService } from 'src/app/services/auth.service';
import { User } from 'src/app/models/user.model';
import { VendorIssueStats } from 'src/app/models/vendor-issue-stats.model';
import { FormsModule } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';

@Component({
  selector: 'sri-dashboard',
  templateUrl: './sri-dashboard.component.html',
  styleUrls: ['./sri-dashboard.component.scss'],
  standalone: true,
  imports: [ChartModule, CommonModule, DividerModule, FormsModule, DropdownModule]
})
export class SRIDashboardComponent implements OnInit {
  dashboardData!: DashboardData;
  user!: User;
  errorCodeChartData: any;
  selectedErrorCodeFilter: string = '';
  selectedAreaFilter: string = '';
  selectedSubCategoryFilter: string = '';
  selectedVendorFilter: string = '';
  errorCodeFilterOptions: { label: string; value: string; }[] = [];
  areaFilterOptions: { label: string; value: string }[] = [];
  subCategoryFilterOptions: { label: string; value: string }[] = [];
  vendorFilterOptions: { label: string; value: string }[] = [];
  totalVendorIssueChartData: any;
  vendorIssueSelectedFilter: string = '';
  vendorIssueFilterOptions: { label: string; value: string; }[] = [];
  vendorPunchListChartData: any;
  vendorPunchListSelectedFilter: string = '';
  vendorPunchListFilterOptions: { label: string; value: string; }[] = [];
  userPunchListChartData: any;
  segmentIdPunchListChartData: any;
  segmentIdPunchListSelectedFilter: string = '';
  segmentIdPunchListFilterOptions: { label: string; value: string; }[] = [];
  monthlyPunchListChartData: any;
  streetSheetStats: any;
  sriOptions: any;
  issuesOptions: any;
  errorCodeOptions: any;

  rawErrorCodeStats: {
    vendorName: string;
    state: string;
    dateReported: string; // or Date
    area: string;
    subCategory: string;
    errorCode: string;
    criticality: string;
  }[] = [];

  rawIssueAreas: {
    area: string;
    state: string;
    vendorName: string;
  }[] = [];

  vendorRawStats: {
    vendorName: string;
    state: string;
    pmResolved: boolean;
    cmResolved: boolean;
  }[] = [];

  stateRawStats: {
    state: string;
    vendorName: string;
    pmResolved: boolean;
    cmResolved: boolean;
  }[] = [];

  areaLabels = [
    'Bored Conduit',
    'Direct Buried Deployment',
    'Hardscape Shallow Duct',
    'Open Trenched Conduit',
    'OSP General Provisions',
    'OSP Repairs',
    'OSP Technical Services',
    'Safety Issues',
    'Softscape Shallow Duct',
    'Underground Cable Placement',
    'Vault Installation'
  ];

  unresolvedTotalCount!: number;

  constructor(private dashboardService: DashboardService,
              private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getUser();
    this.fetchDashboardData();
  }

  ngAfterInIt(): void {
    
  }

  fetchDashboardData(): void {
    if(this.user.role === 'CM' || this.user.role === 'Admin'){
      this.dashboardService.getSRIStats().subscribe(
        (data: DashboardData) => {
          this.dashboardData = data;
          this.rawIssueAreas = data.rawIssueAreas;
          this.vendorRawStats = data.rawVendorPunchLists;
          this.stateRawStats = data.rawStatePunchList;
          this.rawErrorCodeStats = data.errorCodeRawData;
          this.getUnresolvedTotal();

          const vendors = data.errorCodeStats;

          this.errorCodeChartData = {
            labels: this.areaLabels,
            datasets: vendors.map(vendor => ({
              label: vendor.vendorName,
              data: [
                vendor.boredConduitIssues,
                vendor.directBuriedIssues,
                vendor.hardscapeIssues,
                vendor.openTrenchedIssues,
                vendor.oSPGeneralIssues,
                vendor.oSPRepairsIssues,
                vendor.oSPTechnicalIssues,
                vendor.safetyIssues,
                vendor.softscapeIssues,
                vendor.undergroundCableIssues,
                vendor.vaultIssues
              ],
              backgroundColor: this.getVendorColor(vendor.vendorName),
              borderColor: '#000000',
              borderWidth: 1
            }))
          };

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

          this.sriOptions = {
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
                  color: '#000000',
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
                  
                    const total = ctx.chart.data.datasets
                      .map((d: any) => d.data[dataIndex] || 0)
                      .reduce((sum: number, val: number) => sum + val, 0);
                  
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

          this.errorCodeOptions = {
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
                  
                    const total = ctx.chart.data.datasets
                      .map((d: any) => d.data[dataIndex] || 0)
                      .reduce((sum: number, val: number) => sum + val, 0);
                  
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
          
          this.vendorIssueFilterOptions = [
            { label: 'All States', value: '' },
            ...Array.from(new Set(this.dashboardData.rawIssueAreas.map(stat => stat.state)))
              .map(state => ({ label: state, value: state }))
          ];

          this.vendorPunchListFilterOptions = [
            { label: 'All States', value: '' },
            ...Array.from(new Set(this.dashboardData.rawVendorPunchLists.map(stat => stat.state)))
              .map(state => ({ label: state, value: state }))
          ];

          this.segmentIdPunchListFilterOptions = [
            { label: 'All Vendors', value: '' },
            ...Array.from(new Set(this.dashboardData.rawStatePunchList.map(stat => stat.vendorName)))
              .map(name => ({ label: name, value: name }))
          ];

          this.errorCodeFilterOptions = [
            { label: 'All Error Codes', value: '' },
            ...Array.from(new Set(this.dashboardData.errorCodeRawData.map(stat => stat.errorCode)))
              .map(name => ({ label: name, value: name }))
          ];

          this.areaFilterOptions = [
            { label: 'All Areas', value: '' },
            ...Array.from(new Set(this.dashboardData.errorCodeRawData.map(stat => stat.area)))
              .map(area => ({ label: area, value: area }))
          ];
          
          this.subCategoryFilterOptions = [
            { label: 'All Subcategories', value: '' },
            ...Array.from(new Set(this.dashboardData.errorCodeRawData.map(stat => stat.subCategory)))
              .map(sub => ({ label: sub, value: sub }))
          ];

          this.vendorFilterOptions = [
            { label: 'All Vendors', value: '' },
            ...Array.from(new Set(this.dashboardData.errorCodeRawData.map(stat => stat.vendorName)))
              .map(sub => ({ label: sub, value: sub }))
          ];
          
        },
        (error) => {
          console.error('Error fetching dashboard data:', error);
        }
      );
    }
  }

  filterVendorIssueChart(): void {
    const filtered = this.vendorIssueSelectedFilter
      ? this.rawIssueAreas.filter(area => area.state === this.vendorIssueSelectedFilter)
      : this.rawIssueAreas;
  
    const grouped = new Map<string, {
      blueEdgeIssues: number;
      congruexIssues: number;
      ervinIssues: number;
      northStarIssues: number;
    }>();
  
    filtered.forEach(item => {
      const area = item.area;
      if (!grouped.has(area)) {
        grouped.set(area, {
          blueEdgeIssues: 0,
          congruexIssues: 0,
          ervinIssues: 0,
          northStarIssues: 0
        });
      }
  
      const entry = grouped.get(area)!;
  
      switch (item.vendorName) {
        case 'Blue Edge (BE)': entry.blueEdgeIssues++; break;
        case 'Congruex (SCI)': entry.congruexIssues++; break;
        case 'Ervin (ECC)': entry.ervinIssues++; break;
        case 'North Star': entry.northStarIssues++; break;
      }
    });
  
    const areas = Array.from(grouped.keys());
    const values = Array.from(grouped.values());
  
    this.totalVendorIssueChartData = {
      labels: areas,
      datasets: [
        {
          type: 'bar',
          label: 'Blue Edge',
          data: values.map(v => v.blueEdgeIssues),
          backgroundColor: '#207bc5',
          borderColor: '#000000',
          borderWidth: 1
        },
        {
          type: 'bar',
          label: 'Congruex',
          data: values.map(v => v.congruexIssues),
          backgroundColor: '#4CAF50',
          borderColor: '#000000',
          borderWidth: 1
        },
        {
          type: 'bar',
          label: 'Ervin',
          data: values.map(v => v.ervinIssues),
          backgroundColor: '#FF2D2D',
          borderColor: '#000000',
          borderWidth: 1
        },
        {
          type: 'bar',
          label: 'North Star',
          data: values.map(v => v.northStarIssues),
          backgroundColor: '#FFD700',
          borderColor: '#000000',
          borderWidth: 1
        }
      ]
    };
  }
  
  filterVendorPunchListChart(): void {
    const filtered = this.vendorRawStats.filter(stat =>
      !this.vendorPunchListSelectedFilter || stat.state === this.vendorPunchListSelectedFilter
    );
  
    const grouped = new Map<string, { total: number, resolved: number, unresolved: number }>();
  
    filtered.forEach(item => {
      const vendor = item.vendorName;
      if (!grouped.has(vendor)) {
        grouped.set(vendor, { total: 0, resolved: 0, unresolved: 0 });
      }
  
      const entry = grouped.get(vendor)!;
      entry.total++;
  
      if (item.pmResolved && item.cmResolved) {
        entry.resolved++;
      } else {
        entry.unresolved++;
      }
    });
  
    const vendors = Array.from(grouped.keys());
    const values = Array.from(grouped.values());
  
    this.vendorPunchListChartData = {
      labels: vendors,
      datasets: [
        {
          label: 'Total Punch Lists',
          data: values.map(v => v.total),
          backgroundColor: '#4CAF50',
          borderColor: '#000000',
          borderWidth: 1
        },
        {
          label: 'Resolved Punch Lists',
          data: values.map(v => v.resolved),
          backgroundColor: '#FFD700',
          borderColor: '#000000',
          borderWidth: 1
        },
        {
          label: 'Unresolved Punch Lists',
          data: values.map(v => v.unresolved),
          backgroundColor: '#FF2D2D',
          borderColor: '#000000',
          borderWidth: 1
        }
      ]
    };
  }
  

  filterStatePunchListChart(): void {
    const filtered = this.segmentIdPunchListSelectedFilter
      ? this.stateRawStats.filter(stat => stat.vendorName === this.segmentIdPunchListSelectedFilter)
      : this.stateRawStats;
  
    const grouped = new Map<string, { total: number, resolved: number, unresolved: number }>();
  
    filtered.forEach(item => {
      const state = item.state;
      if (!grouped.has(state)) {
        grouped.set(state, { total: 0, resolved: 0, unresolved: 0 });
      }
  
      const entry = grouped.get(state)!;
      entry.total++;
  
      if (item.pmResolved && item.cmResolved) {
        entry.resolved++;
      } else {
        entry.unresolved++;
      }
    });
  
    const states = Array.from(grouped.keys());
    const values = Array.from(grouped.values());
  
    this.segmentIdPunchListChartData = {
      labels: states,
      datasets: [
        {
          label: 'Total Punch Lists',
          data: values.map(v => v.total),
          backgroundColor: '#207bc5',
          borderColor: '#000000',
          borderWidth: 1
        },
        {
          label: 'Resolved Punch Lists',
          data: values.map(v => v.resolved),
          backgroundColor: '#4CAF50',
          borderColor: '#000000',
          borderWidth: 1
        },
        {
          label: 'Unresolved Punch Lists',
          data: values.map(v => v.unresolved),
          backgroundColor: '#FF2D2D',
          borderColor: '#000000',
          borderWidth: 1
        }
      ]
    };
  }

  filterErrorCodeChart(): void {
    const filtered = this.rawErrorCodeStats.filter(stat =>
      (!this.selectedErrorCodeFilter || stat.errorCode === this.selectedErrorCodeFilter) &&
      (!this.selectedAreaFilter || stat.area === this.selectedAreaFilter) &&
      (!this.selectedSubCategoryFilter || stat.subCategory === this.selectedSubCategoryFilter) &&
      (!this.selectedVendorFilter || stat.vendorName === this.selectedVendorFilter)
    );
  
    // Group by Area, counting per vendor
    const grouped = new Map<string, {
      blueEdgeIssues: number;
      congruexIssues: number;
      ervinIssues: number;
      northStarIssues: number;
    }>();
  
    filtered.forEach(item => {
      const area = item.area;
      if (!grouped.has(area)) {
        grouped.set(area, {
          blueEdgeIssues: 0,
          congruexIssues: 0,
          ervinIssues: 0,
          northStarIssues: 0
        });
      }
  
      const entry = grouped.get(area)!;
  
      switch (item.vendorName) {
        case 'Blue Edge (BE)': entry.blueEdgeIssues++; break;
        case 'Congruex (SCI)': entry.congruexIssues++; break;
        case 'Ervin (ECC)': entry.ervinIssues++; break;
        case 'North Star': entry.northStarIssues++; break;
      }
    });
  
    const areas = Array.from(grouped.keys());
    const values = Array.from(grouped.values());
  
    this.errorCodeChartData = {
      labels: areas,
      datasets: [
        {
          type: 'bar',
          label: 'Blue Edge',
          data: values.map(v => v.blueEdgeIssues),
          backgroundColor: '#207bc5',
          borderColor: '#000000',
          borderWidth: 1
        },
        {
          type: 'bar',
          label: 'Congruex',
          data: values.map(v => v.congruexIssues),
          backgroundColor: '#4CAF50',
          borderColor: '#000000',
          borderWidth: 1
        },
        {
          type: 'bar',
          label: 'Ervin',
          data: values.map(v => v.ervinIssues),
          backgroundColor: '#FF2D2D',
          borderColor: '#000000',
          borderWidth: 1
        },
        {
          type: 'bar',
          label: 'North Star',
          data: values.map(v => v.northStarIssues),
          backgroundColor: '#FFD700',
          borderColor: '#000000',
          borderWidth: 1
        }
      ]
    };
  }

  getVendorColor(name: string): string {
    switch (name) {
      case 'Congruex (SCI)': return '#4CAF50';
      case 'Ervin (ECC)': return '#FF2D2D';
      case 'Blue Edge (BE)': return '#207bc5';
      case 'North Star': return '#FFD700';
      default: return '#888888';
    }
  }

  getUnresolvedTotal(): number {
    const stats = this.dashboardData?.vendorPunchListStats ?? [];
    return stats.reduce((total, s) => total + (Number(s?.unresolvedCount) || 0), 0);
  }
}