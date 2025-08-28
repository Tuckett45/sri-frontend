import {
  Component,
  OnInit,
  AfterViewInit,
  ViewChildren,
  QueryList,
  HostListener,
  NgZone
} from '@angular/core';
import { UIChart } from 'primeng/chart';
import { TpsService } from 'src/app/services/tps.service';
import { WPViolation } from 'src/app/models/wp-violation.model';
import { CityScorecard } from 'src/app/models/city-scorecard.model';
import { SelectItem } from 'primeng/api';

@Component({
  selector: 'app-tps-summary',
  templateUrl: './summary.component.html',
  styleUrls: ['./summary.component.scss']
})
export class SummaryComponent implements OnInit, AfterViewInit {
  // ===== KPIs =====
  violationsCount = 0;
  cityCount = 0;
  totalOverspent = 0;
  forecastedAllInTotal = 0;
  actualAllInTotal = 0;
  avgOverspent = 0;
  avgActualAllIn = 0;
  minOverspent = 0;
  maxOverspent = 0;
  avgForecastedAllIn = 0;
  allInDifference = 0;
  percentChangeHHP = 0;
  percentChangeDollarPerHHP = 0;
  percentChangeDollarPerLFT = 0;

  // ===== Filters =====
  startDate: Date | null = null;
  endDate: Date | null = null;
  filtersOpen = false;
  // filter selections for charts
  selectedVendorOverspent: string | null = null;
  selectedSegmentOverspent: string | null = null;

  selectedVendorSegmentChart: string | null = null;
  selectedSegmentSegmentChart: string | null = null;

  selectedVendorAllIn: string | null = null;
  selectedSegmentAllIn: string | null = null;

  vendorOptions: SelectItem[] = [];
  segmentOptions: SelectItem[] = [];

  // ===== Data stores =====
  private violations: WPViolation[] = [];
  private cities: CityScorecard[] = [];

  // ===== Chart data =====
  violationsChartData: any;
  cityAllInChartData: any;
  violationsBySegmentChartData: any;
  hhChartData: any;
  dollarPerHhpChartData: any;
  linearFootChartData: any;

  @ViewChildren(UIChart) charts!: QueryList<UIChart>;

  // ===== Mobile-aware options =====
  isMobile = false;

  // Active options used by template
  violationChartOptions: any;
  doughnutChartOptions: any;
  chartOptions: any;

  // --- Base profile (desktop-ish) ---
  private baseOptions: any = {
    responsive: true,
    maintainAspectRatio: false, // allow container height to control size
    interaction: { mode: 'index', intersect: false },
    parsing: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { color: '#000', usePointStyle: true, boxWidth: 10, boxHeight: 10 }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: (ctx: any) => {
            const label = ctx.dataset?.label || ctx.label || '';
            const v = ctx.parsed?.y ?? ctx.parsed;
            return `${label}: ${this.compactCurrency(Number(v))}`;
          }
        }
      },
      decimation: { enabled: true, algorithm: 'lttb', samples: 200 }
    },
    scales: {
      x: {
        ticks: { color: '#000', autoSkip: true, maxRotation: 0, minRotation: 0 },
        grid: { color: '#ebedef' }
      },
      y: {
        ticks: {
          color: '#000',
          callback: (val: number | string) => this.compactCurrency(Number(val))
        },
        grid: { color: '#ebedef' }
      }
    },
    elements: {
      bar: { borderWidth: 0, borderRadius: 4 },
      line: { tension: 0.25, borderWidth: 2 },
      point: { radius: 2, hoverRadius: 4 }
    },
    categoryPercentage: 0.7,
    barPercentage: 0.7
  };

  private desktopOptions: any = { ...this.baseOptions };

  private mobileOptions: any = {
    ...this.baseOptions,
    plugins: {
      ...this.baseOptions.plugins,
      legend: {
        position: 'bottom',
        labels: { ...this.baseOptions.plugins.legend.labels, boxWidth: 8, boxHeight: 8, padding: 8 }
      },
      tooltip: { ...this.baseOptions.plugins.tooltip, mode: 'nearest', intersect: true }
    },
    scales: {
      x: {
        ...this.baseOptions.scales.x,
        ticks: { ...this.baseOptions.scales.x.ticks, maxTicksLimit: 6, maxRotation: 45 }
      },
      y: {
        ...this.baseOptions.scales.y,
        ticks: { ...this.baseOptions.scales.y.ticks, maxTicksLimit: 4 }
      }
    },
    elements: {
      bar: { borderWidth: 0, borderRadius: 3 },
      line: { tension: 0.2, borderWidth: 2 },
      point: { radius: 0, hoverRadius: 3 } // cleaner on phones
    },
    categoryPercentage: 0.6,
    barPercentage: 0.6
  };

  private desktopDoughnut: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { color: '#000', usePointStyle: true } },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const label = ctx.label || '';
            const value = Number(ctx.parsed ?? 0);
            const data = (ctx.dataset.data || []) as number[];
            const total = data.reduce((a, b) => a + (b || 0), 0);
            const pct = total ? ((value / total) * 100).toFixed(1) : '0.0';
            return `${label}: ${this.compactCurrency(value)} (${pct}%)`;
          }
        }
      }
    }
  };

  private mobileDoughnut: any = {
    ...this.desktopDoughnut,
    plugins: { ...this.desktopDoughnut.plugins, legend: { position: 'bottom', labels: { color: '#000', usePointStyle: true } } }
  };

  constructor(private tpsService: TpsService, private zone: NgZone) {}

  ngOnInit(): void {
    this.setIsMobile();
    this.applyOptionProfiles();
    this.loadData();
  }

  ngAfterViewInit(): void {
    const reinit = () => setTimeout(() => this.charts.forEach(c => c.reinit()));
    reinit();
    this.charts.changes.subscribe(() => reinit());
  }

  toggleFilters(): void {
    this.filtersOpen = !this.filtersOpen;
  }

  refreshCharts(): void {
    setTimeout(() => this.charts.forEach(c => c.reinit()));
  }

  // ===== Data fetching & shaping =====
  loadData() {
    this.tpsService.getViolations().subscribe(res => {
      this.violations = res;
      const vendors = Array.from(new Set(this.violations.map(v => v.vendor).filter(Boolean)));
      const segments = Array.from(new Set(this.violations.map(v => v.segment).filter(Boolean)));
      this.vendorOptions = vendors.map(v => ({ label: v!, value: v! }));
      this.segmentOptions = segments.map(s => ({ label: s!, value: s! }));
      this.applyFilters();
    });

    this.tpsService.getCityScorecard().subscribe(res => {
      this.cities = res;
      this.applyFilters();
    });
  }

  applyFilters() {
    const filterViolations = (vendor: string | null, segment: string | null) =>
      this.violations.filter(v => {
        const date = v.monthYear ? new Date(v.monthYear) : null;
        const afterStart = this.startDate ? (date ? date >= this.startDate : false) : true;
        const beforeEnd = this.endDate ? (date ? date <= this.endDate : false) : true;
        const vendorMatch = vendor ? v.vendor === vendor : true;
        const segmentMatch = segment ? v.segment === segment : true;
        return afterStart && beforeEnd && vendorMatch && segmentMatch;
      });

    // ===== KPI calcs =====
    const metricsViolations = filterViolations(null, null);
    this.violationsCount = metricsViolations.length;
    this.totalOverspent = metricsViolations.reduce((sum, v) => sum + this.calculateOverspent(v), 0);
    const overspentValues = metricsViolations.map(v => this.calculateOverspent(v));
    this.minOverspent = overspentValues.length ? Math.min(...overspentValues) : 0;
    this.maxOverspent = overspentValues.length ? Math.max(...overspentValues) : 0;

    // ===== Chart: Overspent by Vendor =====
    const overspentViolations = filterViolations(this.selectedVendorOverspent, this.selectedSegmentOverspent);
    const vendorMap = new Map<string, number>();
    overspentViolations.forEach(v => {
      const vendor = v.vendor ?? 'Unknown';
      vendorMap.set(vendor, (vendorMap.get(vendor) ?? 0) + this.calculateOverspent(v));
    });
    this.violationsChartData = {
      labels: Array.from(vendorMap.keys()),
      datasets: [
        {
          label: 'Overspent',
          data: Array.from(vendorMap.values()).map(this.num.bind(this)),
          backgroundColor: '#42A5F5',
          borderColor: '#1E88E5',
          borderWidth: 1
        }
      ]
    };

    // ===== Chart: Violations by Segment (combo) =====
    const segmentViolations = filterViolations(this.selectedVendorSegmentChart, this.selectedSegmentSegmentChart);
    this.violationsBySegmentChartData = {
      labels: segmentViolations.map(v => v.segment || 'Unknown'),
      datasets: [
        {
          type: 'bar',
          label: 'Conlog Planned Amount',
          data: segmentViolations.map(v => this.num(v.conlogPlannedAmount)),
          backgroundColor: '#42A5F5',
          borderColor: '#1E88E5',
          borderWidth: 1
        },
        {
          type: 'bar',
          label: 'Planned with Contingency',
          data: segmentViolations.map(v => this.num(v.planWithContingency)),
          backgroundColor: '#FFA726',
          borderColor: '#FB8C00',
          borderWidth: 1
        },
        {
          type: 'line',
          label: 'Actual Cost',
          data: segmentViolations.map(v => this.num(v.actualCost)),
          borderColor: '#4CAF50',
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.3,
          fill: false,
          pointBackgroundColor: '#4CAF50'
        }
      ]
    };

    // ===== City Scorecard filters for All-In chart =====
    const cityFilterViolations = filterViolations(this.selectedVendorAllIn, this.selectedSegmentAllIn);
    const allowedCities = new Set(cityFilterViolations.map(v => v.city).filter(Boolean));

    const filteredCities = this.cities.filter(c => {
      const date = c.ta_Date ? new Date(c.ta_Date) : null;
      const afterStart = this.startDate ? (date ? date >= this.startDate : false) : true;
      const beforeEnd = this.endDate ? (date ? date <= this.endDate : false) : true;
      const matchesCity = allowedCities.size ? allowedCities.has(c.city ?? '') : true;
      return afterStart && beforeEnd && matchesCity;
    });

    this.cityCount = filteredCities.length;
    this.forecastedAllInTotal = filteredCities.reduce((sum, c) => sum + this.num(c.forecastedAllIn), 0);
    this.actualAllInTotal     = filteredCities.reduce((sum, c) => sum + this.num(c.actualAllIn), 0);

    this.avgOverspent = this.violationsCount ? this.totalOverspent / this.violationsCount : 0;
    this.avgActualAllIn = this.cityCount ? this.actualAllInTotal / this.cityCount : 0;
    this.avgForecastedAllIn = this.cityCount ? this.forecastedAllInTotal / this.cityCount : 0;
    this.allInDifference = this.actualAllInTotal - this.forecastedAllInTotal;

    const totalForecastedHHP = filteredCities.reduce((sum, c) => sum + this.num(c.forecastedHHP), 0);
    const totalActualHHP     = filteredCities.reduce((sum, c) => sum + this.num(c.actualHHP), 0);
    this.percentChangeHHP = this.getPercentChange(totalForecastedHHP, totalActualHHP);

    const totalForecastedDollarPerHHP = filteredCities.reduce((sum, c) => sum + this.num(c.forecastedDollarPerHHP), 0);
    const totalActualDollarPerHHP     = filteredCities.reduce((sum, c) => sum + this.num(c.actualDollarPerHHP), 0);
    this.percentChangeDollarPerHHP = this.getPercentChange(totalForecastedDollarPerHHP, totalActualDollarPerHHP);

    const totalForecastedDollarPerLFT = filteredCities.reduce((sum, c) => sum + this.num(c.forecastedDollarPerLFT), 0);
    const totalActualDollarPerLFT     = filteredCities.reduce((sum, c) => sum + this.num(c.actualDollarPerLFT), 0);
    this.percentChangeDollarPerLFT = this.getPercentChange(totalActualDollarPerLFT, totalForecastedDollarPerLFT);

    // ===== Doughnuts =====
    this.hhChartData = {
      labels: ['Actual HHP', 'Forecasted HHP'],
      datasets: [{
        data: [totalActualHHP, totalForecastedHHP],
        backgroundColor: ['#42A5F5', '#FFA726']
      }]
    };

    this.dollarPerHhpChartData = {
      labels: ['Actual $/HHP', 'Forecasted $/HHP'],
      datasets: [{
        data: [totalActualDollarPerHHP, totalForecastedDollarPerHHP],
        backgroundColor: ['#66BB6A', '#EF5350']
      }]
    };

    this.linearFootChartData = {
      labels: ['Actual $/LFT', 'Forecasted $/LFT'],
      datasets: [{
        data: [totalActualDollarPerLFT, totalForecastedDollarPerLFT],
        backgroundColor: ['#FFA000', '#AB47BC']
      }]
    };

    // ===== All-In by City =====
    this.cityAllInChartData = {
      labels: filteredCities.map(c => c.city),
      datasets: [
        {
          type: 'bar',
          label: 'Forecasted All-In',
          data: filteredCities.map(c => this.num(c.forecastedAllIn)),
          backgroundColor: '#66BB6A',
          borderColor: '#43A047',
          borderWidth: 1
        },
        {
          type: 'bar',
          label: 'Actual All-In',
          data: filteredCities.map(c => this.num(c.actualAllIn)),
          backgroundColor: '#FFA726',
          borderColor: '#FB8C00',
          borderWidth: 1
        },
        {
          type: 'bar',
          label: 'Remaining All-In',
          data: filteredCities.map(c => this.num(c.forecastedAllIn) - this.num(c.actualAllIn)),
          backgroundColor: filteredCities.map(c =>
            (this.num(c.forecastedAllIn) - this.num(c.actualAllIn)) >= 0 ? '#42A5F5' : '#EF5350'
          ),
          borderColor: filteredCities.map(c =>
            (this.num(c.forecastedAllIn) - this.num(c.actualAllIn)) >= 0 ? '#1d1e1fff' : '#C62828'
          ),
          borderWidth: 1
        }
      ]
    };

    setTimeout(() => this.charts.forEach(c => c.reinit()));
  }

  clearFilters() {
    this.startDate = null;
    this.endDate = null;
    this.selectedVendorOverspent = null;
    this.selectedSegmentOverspent = null;
    this.selectedVendorSegmentChart = null;
    this.selectedSegmentSegmentChart = null;
    this.selectedVendorAllIn = null;
    this.selectedSegmentAllIn = null;
    this.applyFilters();
  }

  private getPercentChange(forecasted: number, actual: number): number {
    if (forecasted === 0) return 0;
    return ((actual - forecasted) / forecasted) * 100;
  }

  calculateOverspent(v: WPViolation): number {
    const plan = this.num(v.planWithContingency);
    const cost = this.num(v.actualCost);
    return Math.max(0, cost - plan);
  }

  calculateOverspentPercent(v: WPViolation): number {
    const plan = this.num(v.planWithContingency);
    const cost = this.num(v.actualCost);
    const percentage = plan ? (cost - plan) / plan : 0;
    return Math.max(0, percentage);
  }
}
