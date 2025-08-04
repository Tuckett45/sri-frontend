import { Component, OnInit } from '@angular/core';
import { TpsService } from 'src/app/services/tps.service';
import { WPViolation } from 'src/app/models/wp-violation.model';
import { CityScorecard } from 'src/app/models/city-scorecard.model';

@Component({
  selector: 'app-tps-summary',
  templateUrl: './summary.component.html',
  styleUrls: ['./summary.component.scss']
})
export class SummaryComponent implements OnInit {
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

  startDate: Date | null = null;
  endDate: Date | null = null;

  private violations: WPViolation[] = [];
  private cities: CityScorecard[] = [];

  violationsChartData: any;
  cityAllInChartData: any;
  chartOptions = {
    maintainAspectRatio: false,
    aspectRatio: 1,
    plugins: {
      legend: {
        labels: {
          color: '#000'
        }
      },
      tooltip: {
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

  loadData() {
    this.tpsService.getViolations().subscribe(res => {
      this.violations = res;
      this.applyFilters();

    });

    this.tpsService.getCityScorecard().subscribe(res => {
      this.cities = res;
      this.applyFilters();
    });
  }

  applyFilters() {
    const filteredViolations = this.violations.filter(v => {
      const date = v.monthYear ? new Date(v.monthYear) : null;
      const afterStart = this.startDate ? (date ? date >= this.startDate : false) : true;
      const beforeEnd = this.endDate ? (date ? date <= this.endDate : false) : true;
      return afterStart && beforeEnd;
    });

    this.violationsCount = filteredViolations.length;
    this.totalOverspent = filteredViolations.reduce((sum, v) => sum + this.calculateOverspent(v), 0);
    const overspentValues = filteredViolations.map(v => this.calculateOverspent(v));
    this.minOverspent = overspentValues.length ? Math.min(...overspentValues) : 0;
    this.maxOverspent = overspentValues.length ? Math.max(...overspentValues) : 0;

    const vendorMap = new Map<string, number>();
    filteredViolations.forEach(v => {
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

    const filteredCities = this.cities.filter(c => {
      const date = c.ta_Date ? new Date(c.ta_Date) : null;
      const afterStart = this.startDate ? (date ? date >= this.startDate : false) : true;
      const beforeEnd = this.endDate ? (date ? date <= this.endDate : false) : true;
      return afterStart && beforeEnd;
    });

    this.cityCount = filteredCities.length;
    this.forecastedAllInTotal = filteredCities.reduce((sum, c) => sum + (c.forecastedAllIn ?? 0), 0);
    this.actualAllInTotal = filteredCities.reduce((sum, c) => sum + (c.actualAllIn ?? 0), 0);

    this.avgOverspent = this.violationsCount ? this.totalOverspent / this.violationsCount : 0;
    this.avgActualAllIn = this.cityCount ? this.actualAllInTotal / this.cityCount : 0;
    this.avgForecastedAllIn = this.cityCount ? this.forecastedAllInTotal / this.cityCount : 0;
    this.allInDifference = this.actualAllInTotal - this.forecastedAllInTotal;

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
        }
      ]
    };
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
