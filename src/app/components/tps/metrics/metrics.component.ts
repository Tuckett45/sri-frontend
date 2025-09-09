import { Component, OnInit } from '@angular/core';
import { TpsService } from 'src/app/services/tps.service';
import { CityScorecard } from 'src/app/models/city-scorecard.model';

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

  constructor(private tpsService: TpsService) {}

  ngOnInit(): void {
    this.tpsService.getCityScorecard().subscribe({
      next: cities => {
        const withHhp = cities.filter(c => (c.forecastedHHP ?? 0) > 0);
        const withoutHhp = cities.filter(c => (c.forecastedHHP ?? 0) <= 0);
        this.metrics2025 = this.buildMetrics(withHhp);
        this.metrics2025NonHhhp = this.buildMetrics(withoutHhp);
      },
      error: _ => {
        this.metrics2025 = [];
        this.metrics2025NonHhhp = [];
      }
    });
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

    const forecastedHhp = nums(rows.map(r => r.forecastedDollarPerHHP));
    const actualHhp = nums(rows.map(r => r.actualDollarPerHHP));
    const forecastedLft = nums(rows.map(r => r.forecastedDollarPerLFT));
    const actualLft = nums(rows.map(r => r.actualDollarPerLFT));
    const forecastedAllIn = nums(rows.map(r => r.forecastedAllIn));
    const actualAllIn = nums(rows.map(r => r.actualAllIn));
    const totalLabor = actualAllIn.reduce((a, b) => a + b, 0);

    return [
      { label: 'Total Segments', value: String(rows.length) },
      { label: 'Planned Avg SHMP', value: currency(avg(forecastedHhp)) },
      { label: 'Labor Cost', value: currency(totalLabor) },
      { label: 'Plan - Avg SHMP', value: currency(avg(forecastedHhp)) },
      { label: 'Plan - Avg $/FT', value: currency(avg(forecastedLft)) },
      { label: 'Plan - All In $/FT', value: currency(avg(forecastedAllIn)) },
      { label: 'Actual to Date - Avg SHMP', value: currency(avg(actualHhp)) },
      { label: 'Actual to Date - Avg $/FT', value: currency(avg(actualLft)) },
      { label: 'Plan - Median SHMP', value: currency(median(forecastedHhp)) },
      { label: 'Plan - Median $/FT', value: currency(median(forecastedLft)) },
      { label: 'Actual to Date - Median SHMP', value: currency(median(actualHhp)) },
      { label: 'Actual to Date - Median $/FT', value: currency(median(actualLft)) }
    ];
  }
}
