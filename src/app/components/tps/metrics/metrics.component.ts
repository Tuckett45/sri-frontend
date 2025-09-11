import { Component, HostListener, OnInit } from '@angular/core';
import { TpsService } from 'src/app/services/tps.service';
import { CityScorecard } from 'src/app/models/city-scorecard.model';
import { WPViolation } from 'src/app/models/wp-violation.model';
import { SelectItem } from 'primeng/api';
import { combineLatest } from 'rxjs';

interface Stat {
  label: string;
  value: string;
}

@Component({
  selector: 'app-tps-metrics',
  templateUrl: './metrics.component.html',
  styleUrls: ['./metrics.component.scss']
})
export class MetricsComponent implements OnInit {
  metrics2025: Stat[] = [];
  metrics2025NonHhhp: Stat[] = [];

  // ===== Filters =====
  startDate: Date | null = null;
  endDate: Date | null = null;
  filtersOpen = false;
  isMobile = false;
  selectedVendors: string[] = [];
  selectedSegments: string[] = [];
  selectedCities: string[] = [];

  vendorOptions: SelectItem[] = [];
  segmentOptions: SelectItem[] = [];
  cityOptions: SelectItem[] = [];

  private violations: WPViolation[] = [];
  private cities: CityScorecard[] = [];

  constructor(private tpsService: TpsService) {}

  ngOnInit(): void {
    this.updateIsMobile();
    combineLatest([
      this.tpsService.getViolations(),
      this.tpsService.getCityScorecard()
    ]).subscribe({
      next: ([violations, cities]) => {
        this.violations = violations ?? [];
        this.cities = cities ?? [];

        const vendors = Array.from(new Set(this.violations.map(v => v.vendor).filter(Boolean)));
        const segments = Array.from(new Set(this.violations.map(v => v.segment).filter(Boolean)));
        const cityList = Array.from(new Set(this.cities.map(c => c.city).filter(Boolean)));
        this.vendorOptions = vendors.map(v => ({ label: v!, value: v! }));
        this.segmentOptions = segments.map(s => ({ label: s!, value: s! }));
        this.cityOptions = cityList.map(c => ({ label: c!, value: c! }));

        this.applyFilters();
      },
      error: _ => {
        this.violations = [];
        this.cities = [];
        this.applyFilters();
      }
    });
  }

  @HostListener('window:resize')
  onResize() {
    this.updateIsMobile();
  }

  private updateIsMobile(): void {
    this.isMobile = window.innerWidth <= 768;
    // Optional: auto-open filters on desktop, keep toggle behavior on mobile
    if (!this.isMobile) {
      this.filtersOpen = true;
    }
  }

  toggleFilters(): void {
    this.filtersOpen = !this.filtersOpen;
  }

  clearFilters(): void {
    this.startDate = null;
    this.endDate = null;
    this.selectedVendors = [];
    this.selectedSegments = [];
    this.selectedCities = [];
    this.applyFilters();
  }

  applyFilters(): void {
    const vendorSet = new Set(this.selectedVendors || []);
    const segmentSet = new Set(this.selectedSegments || []);
    const citySet = new Set(this.selectedCities || []);

    const baseViolations = this.violations.filter(v => {
      const date = v.monthYear ? new Date(v.monthYear) : null;
      const afterStart = this.startDate ? (date ? date >= this.startDate : false) : true;
      const beforeEnd = this.endDate ? (date ? date <= this.endDate : false) : true;
      const vendorOk = vendorSet.size ? (v.vendor ? vendorSet.has(v.vendor) : false) : true;
      const segmentOk = segmentSet.size ? (v.segment ? segmentSet.has(v.segment) : false) : true;
      return afterStart && beforeEnd && vendorOk && segmentOk;
    });

    const allowedCities = new Set(baseViolations.map(v => v.city).filter(Boolean));

    const baseCities = this.cities.filter(c => {
      const date = c.ta_Date ? new Date(c.ta_Date) : null;
      const afterStart = this.startDate ? (date ? date >= this.startDate : false) : true;
      const beforeEnd = this.endDate ? (date ? date <= this.endDate : false) : true;
      const cityName = c.city ?? '';
      const cityOk = citySet.size ? citySet.has(cityName) : true;
      const vendorSegOk = (vendorSet.size || segmentSet.size) ? allowedCities.has(cityName) : true;
      return afterStart && beforeEnd && cityOk && vendorSegOk;
    });

    const withHhp = baseCities.filter(c => (c.forecastedHHP ?? 0) > 0);
    const withoutHhp = baseCities.filter(c => (c.forecastedHHP ?? 0) <= 0);
    this.metrics2025 = this.buildMetrics(withHhp);
    this.metrics2025NonHhhp = this.buildMetrics(withoutHhp);
  }

  private buildMetrics(rows: CityScorecard[]): Stat[] {
    if (!rows.length) return [];
    const nums = (vals: (number | undefined | null)[]) => vals.map(v => v ?? 0);
    const avg = (vals: number[]) => (vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0);
    const median = (vals: number[]) => {
      if (!vals.length) return 0;
      const sorted = [...vals].sort((a, b) => a - b);
      const m = Math.floor(sorted.length / 2);
      return sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
    };
    const currency = (n: number) =>
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

    const remainingJobs = rows.filter(r => (r.closedDate ? new Date(r.closedDate) > new Date() : true)).map(r => r.compDate ? 1 : 0).length;
    const forecastedHhp = nums(rows.map(r => r.forecastedDollarPerHHP));
    const actualHhp = nums(rows.map(r => r.actualDollarPerHHP));
    const forecastedLft = nums(rows.map(r => r.forecastedDollarPerLFT));
    const actualLft = nums(rows.map(r => r.actualDollarPerLFT));
    const forecastedAllIn = nums(rows.map(r => r.forecastedAllIn));
    const actualAllIn = nums(rows.map(r => r.actualAllIn));
    const totalLabor = actualAllIn.reduce((a, b) => a + b, 0);

    return [
      { label: 'Remaining Jobs', value: String(remainingJobs) },
      { label: 'Total Segments', value: String(rows.length) },
      { label: 'Forcasted Avg HHP', value: currency(avg(forecastedHhp)) },
      { label: 'Labor Cost', value: currency(totalLabor) },
      { label: 'Forcasted - Avg HHP', value: currency(avg(forecastedHhp)) },
      { label: 'Forcasted - Avg $/FT', value: currency(avg(forecastedLft)) },
      { label: 'Forcasted - All In $/FT', value: currency(avg(forecastedAllIn)) },
      { label: 'Actual to Date - Avg SHMP', value: currency(avg(actualHhp)) },
      { label: 'Actual to Date - Avg $/FT', value: currency(avg(actualLft)) },
      { label: 'Forcasted - Median HHP', value: currency(median(forecastedHhp)) },
      { label: 'Forcasted - Median $/FT', value: currency(median(forecastedLft)) },
      { label: 'Actual to Date - Median HHP', value: currency(median(actualHhp)) },
      { label: 'Actual to Date - Median $/FT', value: currency(median(actualLft)) }
    ];
  }
}
