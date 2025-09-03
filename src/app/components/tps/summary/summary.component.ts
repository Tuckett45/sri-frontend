import {
  Component,
  OnInit,
  AfterViewInit,
  ViewChildren,
  QueryList,
  HostListener,
  NgZone,
  ChangeDetectorRef
} from '@angular/core';
import { UIChart } from 'primeng/chart';
import { TpsService } from 'src/app/services/tps.service';
import { WPViolation } from 'src/app/models/wp-violation.model';
import { CityScorecard } from 'src/app/models/city-scorecard.model';
import { SelectItem } from 'primeng/api';
import { combineLatest } from 'rxjs';

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

  // ===== Chart data (safe defaults) =====
  overSpentChartData: any = { labels: [], datasets: [] };
  cityAllInChartData: any = { labels: [], datasets: [] };
  violationsBySegmentChartData: any = { labels: [], datasets: [] };
  hhChartData: any = { labels: [], datasets: [] };
  dollarPerHhpChartData: any = { labels: [], datasets: [] };
  linearFootChartData: any = { labels: [], datasets: [] };

  @ViewChildren(UIChart) charts!: QueryList<UIChart>;

  // ===== Mobile-aware options =====
  isMobile = false;

  // Active options used by template
  violationChartOptions: any;
  doughnutChartOptions: any;
  chartOptions: any;
  refreshTick = 0;

  // --- Base profile (desktop-ish) ---
  private baseOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
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
      }
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
      point: { radius: 0, hoverRadius: 3 }
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

  constructor(
    private tpsService: TpsService,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

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

  @HostListener('window:resize')
  onResize() {
    const wasMobile = this.isMobile;
    this.setIsMobile();
    if (wasMobile !== this.isMobile) {
      this.applyOptionProfiles();
      setTimeout(() => this.charts.forEach(c => c.reinit()));
    }
  }

  private setIsMobile() {
    this.isMobile = window.innerWidth <= 768;
  }

  private applyOptionProfiles() {
    const common = this.isMobile ? this.mobileOptions : this.desktopOptions;

    // For mobile, flip to horizontal bars so category labels are readable.
    const indexAxis: 'x' | 'y' = this.isMobile ? 'y' : 'x';
    const catAxis = indexAxis === 'y' ? 'y' : 'x';
    const valAxis = indexAxis === 'y' ? 'x' : 'y';

    // Base options for standard bar charts (Overspent, All-In)
    this.chartOptions = {
      ...common,
      indexAxis,
      layout: { padding: 0 },
      plugins: {
        ...(common.plugins || {}),
        legend: {
          ...(common.plugins?.legend || {}),
          position: this.isMobile ? 'bottom' : (common.plugins?.legend as any)?.position || 'top',
          labels: {
            ...((common.plugins as any)?.legend?.labels || {}),
            boxWidth: this.isMobile ? 8 : 10,
            boxHeight: this.isMobile ? 8 : 10,
            font: { size: this.isMobile ? 10 : 12 }
          }
        }
      },
      scales: {
        [catAxis]: {
          ...(common.scales?.[catAxis] || {}),
          ticks: {
            ...(common.scales?.[catAxis as 'x' | 'y']?.ticks || {}),
            autoSkip: false,
            font: { size: this.isMobile ? 10 : 11 },
            callback: (value: any, index: number, ticks: any[]) => {
              const label = typeof value === 'string'
                ? value
                : (ticks && ticks[index] && (ticks[index].label ?? ticks[index].value)) ?? String(value);
              return this.wrapLabel(String(label), this.isMobile ? 10 : 18);
            }
          }
        },
        [valAxis]: {
          ...(common.scales?.[valAxis] || {}),
          ticks: {
            ...(common.scales?.[valAxis as 'x' | 'y']?.ticks || {}),
            font: { size: this.isMobile ? 10 : 11 }
          }
        }
      }
    } as any;
    // Mixed bar/line chart behaves better with a horizontal layout on phones
    this.violationChartOptions = {
      ...common,
      indexAxis: 'y',
      scales: {
        x: {
          ...(common.scales?.x || {}),
          ticks: {
            ...(common.scales?.x?.ticks || {}),
            font: { size: this.isMobile ? 10 : 11 }
          }
        },
        y: {
          ...(common.scales?.y || {}),
          ticks: {
            ...(common.scales?.y?.ticks || {}),
            autoSkip: false,
            font: { size: this.isMobile ? 10 : 11 },
            callback: (value: any, index: number, ticks: any[]) => {
              const label = typeof value === 'string'
                ? value
                : (ticks && ticks[index] && (ticks[index].label ?? ticks[index].value)) ?? String(value);
              return this.wrapLabel(String(label), this.isMobile ? 10 : 18);
            }
          }
        }
      }
    };
    this.doughnutChartOptions = this.isMobile ? this.mobileDoughnut : this.desktopDoughnut;
  }

  // ===== Utilities =====
  private compactCurrency(n: number) {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 1
    }).format(n || 0);
  }

  // Insert line breaks into long labels at word boundaries for axis ticks
  private wrapLabel(str: string, width = 18): string {
    if (!str) return '';
    // Prefer breaking at spaces
    const parts = str.match(new RegExp(`.{1,${width}}(\s|$)`, 'g'));
    if (parts) return parts.map(s => s.trim()).join('\n');
    // Fallback: hard break long unspaced strings
    const chunks: string[] = [];
    for (let i = 0; i < str.length; i += width) chunks.push(str.slice(i, i + width));
    return chunks.join('\n');
  }

  // Coerce dollars like "$1,234.56", "($2,345)", "−123.45", "1,234 ft" → number
  private num(v: any): number {
    if (v == null) return 0;
    if (typeof v === 'number') return isFinite(v) ? v : 0;

    let s = String(v).trim();
    if (!s) return 0;

    // normalize unicode minus to ASCII
    s = s.replace(/\u2212/g, '-');

    // accounting negatives "(1234)"
    let sign = 1;
    if (/^\(.*\)$/.test(s)) {
      sign = -1;
      s = s.slice(1, -1);
    }

    // keep digits, one dot, and minus
    s = s.replace(/[^0-9.\-]/g, '');

    // collapse multiple dots
    const firstDot = s.indexOf('.');
    if (firstDot !== -1) {
      s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, '');
    }

    const n = parseFloat(s);
    return isFinite(n) ? sign * n : 0;
  }

  toggleFilters(): void {
    this.filtersOpen = !this.filtersOpen;
  }

  refreshCharts(): void {
    setTimeout(() => this.charts.forEach(c => c.reinit()));
  }

  // ===== Data fetching & shaping =====
  loadData() {
    combineLatest([
      this.tpsService.getViolations(),
      this.tpsService.getCityScorecard()
    ]).subscribe({
      next: ([violations, cities]) => {
        this.violations = violations ?? [];
        this.cities = cities ?? [];

        // build select options once we actually have data
        const vendors = Array.from(new Set(this.violations.map(v => v.vendor).filter(Boolean)));
        const segments = Array.from(new Set(this.violations.map(v => v.segment).filter(Boolean)));
        this.vendorOptions = vendors.map(v => ({ label: v!, value: v! }));
        this.segmentOptions = segments.map(s => ({ label: s!, value: s! }));

        this.applyFilters();
      },
      error: _ => {
        // fall back to empty datasets so charts render a "no data" state
        this.violations = [];
        this.cities = [];
        this.applyFilters();
      }
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

    // ===== Overspent by Vendor (fresh references + numeric) =====
    const overspentViolations = filterViolations(this.selectedVendorOverspent, this.selectedSegmentOverspent);
    const vendorMap = new Map<string, number>();
    overspentViolations.forEach(v => {
      const vendor = v.vendor ?? 'Unknown';
      vendorMap.set(vendor, (vendorMap.get(vendor) ?? 0) + this.calculateOverspent(v));
    });
    const overSpentLabels = Array.from(vendorMap.keys());
    const overSpentValues = Array.from(vendorMap.values()).map(n => Number(n) || 0);

    this.overSpentChartData = {
      labels: [...overSpentLabels],
      datasets: [
        {
          label: 'Overspent',
          data: [...overSpentValues],
          backgroundColor: '#42A5F5',
          borderColor: '#1E88E5',
          borderWidth: 1
        }
      ]
    };

    // ===== Violations by Segment (grouped + mixed bar/line; fresh references) =====
    const segmentViolations = filterViolations(this.selectedVendorSegmentChart, this.selectedSegmentSegmentChart);

    // Group rows by segment, summing numeric fields
    const bySegment = new Map<string, { conlog: number; plan: number; actual: number }>();
    segmentViolations.forEach(v => {
      const key = v.segment || 'Unknown';
      const current = bySegment.get(key) || { conlog: 0, plan: 0, actual: 0 };
      current.conlog += this.num((v as any).conlogPlannedAmount);
      current.plan   += this.num((v as any).planWithContingency);
      current.actual += this.num((v as any).actualCost);
      bySegment.set(key, current);
    });

    const segKeys    = Array.from(bySegment.keys());
    const segLabels  = segKeys.map(k => this.wrapLabel(k, 18));
    const segConlog  = segKeys.map(k => bySegment.get(k)!.conlog);
    const segPlanCty = segKeys.map(k => bySegment.get(k)!.plan);
    const segActual  = segKeys.map(k => bySegment.get(k)!.actual);

    this.violationsBySegmentChartData = {
      labels: [...segLabels],
      datasets: [
        { type: 'bar',  label: 'Conlog Planned Amount',    data: [...segConlog],  backgroundColor: '#42A5F5', borderColor: '#1E88E5', borderWidth: 1 },
        { type: 'bar',  label: 'Planned with Contingency', data: [...segPlanCty], backgroundColor: '#FFA726', borderColor: '#FB8C00', borderWidth: 1 },
        { type: 'line', label: 'Actual Cost',              data: [...segActual],  borderColor: '#4CAF50', backgroundColor: 'transparent', borderWidth: 2, tension: 0.3, fill: false, pointBackgroundColor: '#4CAF50' }
      ]
    };

    // Improve readability: use horizontal bars for many/long labels
    this.violationChartOptions = {
      ...this.chartOptions,
      indexAxis: 'x',
      scales: {
        x: { ...(this.chartOptions?.scales as any)?.x },
        y: {
          ...(this.chartOptions?.scales as any)?.y,
          ticks: {
            ...(this.chartOptions?.scales as any)?.y?.ticks,
            autoSkip: false
          }
        }
      }
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
    this.percentChangeDollarPerLFT = this.getPercentChange(totalForecastedDollarPerLFT, totalActualDollarPerLFT);

    // ===== Doughnuts (numbers only) =====
    this.hhChartData = {
      labels: ['Actual HHP', 'Forecasted HHP'],
      datasets: [{ data: [totalActualHHP, totalForecastedHHP], backgroundColor: ['#42A5F5', '#FFA726'] }]
    };

    this.dollarPerHhpChartData = {
      labels: ['Actual $/HHP', 'Forecasted $/HHP'],
      datasets: [{ data: [totalActualDollarPerHHP, totalForecastedDollarPerHHP], backgroundColor: ['#66BB6A', '#EF5350'] }]
    };

    this.linearFootChartData = {
      labels: ['Actual $/LFT', 'Forecasted $/LFT'],
      datasets: [{ data: [totalActualDollarPerLFT, totalForecastedDollarPerLFT], backgroundColor: ['#FFA000', '#AB47BC'] }]
    };

    // ===== All-In by City (fresh refs) =====
    const allInLabels     = filteredCities.map(c => c.city ?? '');
    const allInForecasted = filteredCities.map(c => this.num(c.forecastedAllIn));
    const allInActual     = filteredCities.map(c => this.num(c.actualAllIn));
    const allInRemaining  = allInForecasted.map((f, i) => f - (allInActual[i] || 0));
    const remBg           = allInRemaining.map(v => v >= 0 ? '#42A5F5' : '#EF5350');
    const remBorder       = allInRemaining.map(v => v >= 0 ? '#1d1e1fff' : '#C62828');

    this.cityAllInChartData = {
      labels: [...allInLabels],
      datasets: [
        { type: 'bar', label: 'Forecasted All-In', data: [...allInForecasted], backgroundColor: '#66BB6A', borderColor: '#43A047', borderWidth: 1 },
        { type: 'bar', label: 'Actual All-In',     data: [...allInActual],     backgroundColor: '#FFA726', borderColor: '#FB8C00', borderWidth: 1 },
        { type: 'bar', label: 'Remaining All-In',  data: [...allInRemaining],  backgroundColor: [...remBg], borderColor: [...remBorder], borderWidth: 1 }
      ]
    };

    // Ensure Angular applies new [data] references, then refresh charts
    this.cdr.detectChanges();
    this.refreshTick++;
    this.zone.runOutsideAngular(() => {
      setTimeout(() => {
        this.charts?.forEach(c => {
          if ((c as any).refresh) { (c as any).refresh(); } else { c.reinit(); }
        });
      }, 0);
    });
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
    const plan = this.num((v as any).planWithContingency);
    const cost = this.num((v as any).actualCost);
    return Math.max(0, cost - plan);
  }

  calculateOverspentPercent(v: WPViolation): number {
    const plan = this.num((v as any).planWithContingency);
    const cost = this.num((v as any).actualCost);
    const percentage = plan ? (cost - plan) / plan : 0;
    return Math.max(0, percentage);
  }
}
