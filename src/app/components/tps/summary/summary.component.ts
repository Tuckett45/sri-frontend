import { Component, OnInit, AfterViewInit, ViewChildren, QueryList } from '@angular/core';
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

  startDate: Date | null = null;
  endDate: Date | null = null;
  // filter selections for charts
  selectedVendorOverspent: string | null = null;
  selectedSegmentOverspent: string | null = null;
  selectedVendorSegmentChart: string | null = null;
  selectedSegmentSegmentChart: string | null = null;
  selectedVendorAllIn: string | null = null;
  selectedSegmentAllIn: string | null = null;
  vendorOptions: SelectItem[] = [];
  segmentOptions: SelectItem[] = [];

  private violations: WPViolation[] = [];
  private cities: CityScorecard[] = [];

  violationsChartData: any;
  cityAllInChartData: any;
  violationsBySegmentChartData: any;
  hhChartData: any;
  dollarPerHhpChartData: any;
  linearFootChartData: any;

  @ViewChildren(UIChart) charts!: QueryList<UIChart>;

  violationChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: {
      labels: {
        color: '#000'
      }
    },
    tooltip: {
      mode: 'index',
      intersect: false,
      callbacks: {
        label: (ctx: any) => {
          const label = ctx.dataset.label || '';
          const value = ctx.parsed.y ?? ctx.parsed;
          return `${label}: $${value.toLocaleString()}`;
        }
      }
    }
  },
  scales: {
    y: {
      type: 'linear',
      display: true,
      position: 'left',
      ticks: {
        color: '#000',
        callback: (val: any) => '$' + Number(val).toLocaleString()
      },
      grid: { color: '#ebedef' }
    },
    y1: {
      type: 'linear',
      display: true,
      position: 'right',
      ticks: {
        color: '#000',
        callback: (val: any) => '$' + Number(val).toLocaleString()
      },
      grid: {
        drawOnChartArea: false // Keep the line clean
      }
    },
    x: {
      ticks: { color: '#000' },
      grid: { color: '#ebedef' }
    }
  }
};

  doughnutChartOptions = {
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#000'
        }
      },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const label = ctx.label || '';
            const value = ctx.parsed ?? 0;
            const total = ctx.dataset.data.reduce((acc: number, val: number) => acc + val, 0);
            const percentage = total ? ((value / total) * 100).toFixed(1) : '0.0';
            return `${label}: $${value.toLocaleString()} (${percentage}%)`;
          }
        }
      }
    }
  };


  chartOptions = {
    maintainAspectRatio: false,
    aspectRatio: 1,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        labels: {
          color: '#000'
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: (ctx: any) => {
            const label = ctx.dataset.label || '';
            const value = ctx.parsed.y ?? ctx.parsed;
            return `${label}: $${value.toLocaleString()}`;
          }
        }
      }
    },
    scales: {
      x: {
        ticks: { color: '#000' },
        grid: { color: '#ebedef' }
      },
      y: {
        ticks: {
          color: '#000',
          callback: (val: number | string) => '$' + Number(val).toLocaleString()
        },
        grid: { color: '#ebedef' }
      }
    }
  };

  constructor(private tpsService: TpsService) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.charts.forEach(c => c.reinit()));
  }

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

    const metricsViolations = filterViolations(null, null);
    this.violationsCount = metricsViolations.length;
    this.totalOverspent = metricsViolations.reduce((sum, v) => sum + this.calculateOverspent(v), 0);
    const overspentValues = metricsViolations.map(v => this.calculateOverspent(v));
    this.minOverspent = overspentValues.length ? Math.min(...overspentValues) : 0;
    this.maxOverspent = overspentValues.length ? Math.max(...overspentValues) : 0;

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
          data: Array.from(vendorMap.values()),
          backgroundColor: '#42A5F5',
          borderColor: '#1E88E5',
          borderWidth: 1
        }
      ]
    };

    const segmentViolations = filterViolations(this.selectedVendorSegmentChart, this.selectedSegmentSegmentChart);
    this.violationsBySegmentChartData = {
      labels: segmentViolations.map(v => v.segment || 'Unknown'),
      datasets: [
        {
          type: 'bar',
          label: 'Conlog Planned Amount',
          data: segmentViolations.map(v => v.conlogPlannedAmount ?? 0),
          backgroundColor: '#42A5F5',
          borderColor: '#1E88E5',
          borderWidth: 1
        },
        {
          type: 'bar',
          label: 'Planned with Contingency',
          data: segmentViolations.map(v => v.planWithContingency ?? 0),
          backgroundColor: '#FFA726',
          borderColor: '#FB8C00',
          borderWidth: 1
        },
        {
          type: 'line',
          label: 'Actual Cost',
          data: segmentViolations.map(v => v.actualCost ?? 0),
          borderColor: '#4CAF50',
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.3,
          fill: false,
          pointBackgroundColor: '#4CAF50'
        }
      ]
    };

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
    this.forecastedAllInTotal = filteredCities.reduce((sum, c) => sum + (c.forecastedAllIn ?? 0), 0);
    this.actualAllInTotal = filteredCities.reduce((sum, c) => sum + (c.actualAllIn ?? 0), 0);

    this.avgOverspent = this.violationsCount ? this.totalOverspent / this.violationsCount : 0;
    this.avgActualAllIn = this.cityCount ? this.actualAllInTotal / this.cityCount : 0;
    this.avgForecastedAllIn = this.cityCount ? this.forecastedAllInTotal / this.cityCount : 0;
    this.allInDifference = this.actualAllInTotal - this.forecastedAllInTotal;

    const totalForecastedHHP = filteredCities.reduce((sum, c) => sum + (c.forecastedHHP ?? 0), 0);
    const totalActualHHP = filteredCities.reduce((sum, c) => sum + (c.actualHHP ?? 0), 0);
    this.percentChangeHHP = this.getPercentChange(totalForecastedHHP, totalActualHHP);

    const totalForecastedDollarPerHHP = filteredCities.reduce((sum, c) => sum + (c.forecastedDollarPerHHP ?? 0), 0);
    const totalActualDollarPerHHP = filteredCities.reduce((sum, c) => sum + (c.actualDollarPerHHP ?? 0), 0);
    this.percentChangeDollarPerHHP = this.getPercentChange(totalForecastedDollarPerHHP, totalActualDollarPerHHP);

    const totalForecastedDollarPerLFT = filteredCities.reduce((sum, c) => sum + (c.forecastedDollarPerLFT ?? 0), 0);
    const totalActualDollarPerLFT = filteredCities.reduce((sum, c) => sum + (c.actualDollarPerLFT ?? 0), 0);
    this.percentChangeDollarPerLFT = this.getPercentChange(totalActualDollarPerLFT, totalForecastedDollarPerLFT);

    this.hhChartData = {
      labels: ['Actual HHP', 'Forecasted HHP'],
      datasets: [{
        data: [totalForecastedHHP, totalActualHHP],
        backgroundColor: ['#42A5F5', '#FFA726']
      }]
    };

    this.dollarPerHhpChartData = {
      labels: ['Actual $/HHP', 'Forecasted $/HHP'],
      datasets: [{
        data: [totalForecastedDollarPerHHP, totalActualDollarPerHHP],
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

    this.cityAllInChartData = {
      labels: filteredCities.map(c => c.city),
      datasets: [
        {
          label: 'Forecasted All-In',
          data: filteredCities.map(c => c.forecastedAllIn),
          backgroundColor: '#66BB6A',
          borderColor: '#43A047',
          borderWidth: 1
        },
        {
          label: 'Actual All-In',
          data: filteredCities.map(c => c.actualAllIn),
          backgroundColor: '#FFA726',
          borderColor: '#FB8C00',
          borderWidth: 1
        },
        {
          label: 'Remaining All-In',
          data: filteredCities.map(c =>
            (c.forecastedAllIn ?? 0) - (c.actualAllIn ?? 0)
          ),
          backgroundColor: filteredCities.map(c =>
            ((c.forecastedAllIn ?? 0) - (c.actualAllIn ?? 0)) >= 0
              ? '#42A5F5'
              : '#EF5350' 
          ),
          borderColor: filteredCities.map(c =>
            ((c.forecastedAllIn ?? 0) - (c.actualAllIn ?? 0)) >= 0
              ? '#1d1e1fff' 
              : '#C62828' 
          ),
          borderWidth: 1
        }
      ]
    };

    setTimeout(() => this.charts.forEach(c => c.reinit()));
  }

  private getPercentChange(forecasted: number, actual: number): number {
    if (forecasted === 0) return 0;
    return ((actual - forecasted) / forecasted) * 100;
  }

  calculateOverspent(v: WPViolation): number {
    const plan = v.planWithContingency ?? 0;
    const cost = v.actualCost ?? 0;
    return Math.max(0, cost - plan);
  }

  calculateOverspentPercent(v: WPViolation): number {
    const plan = v.planWithContingency ?? 0;
    const cost = v.actualCost ?? 0;
    const percentage = plan ? (cost - plan) / plan : 0;
    return Math.max(0, percentage);
  }
}
