import { Component } from '@angular/core';

@Component({
  selector: 'app-tps-metrics',
  templateUrl: './metrics.component.html',
  styleUrls: ['./metrics.component.scss']
})
export class MetricsComponent {
  readonly metrics2025 = [
    { label: 'Total Segments', value: '13' },
    { label: 'Planned Avg SHMP', value: '$8,512.31' },
    { label: 'Labor Cost', value: '$1,312.31' },
    { label: 'Plan - Avg SHMP', value: '$8,512.31' },
    { label: 'Plan - Avg $/FT', value: '$132.68' },
    { label: 'Plan - All In $/FT', value: '$132.68' },
    { label: 'Actual to Date - Avg SHMP', value: '$8,512.31' },
    { label: 'Actual to Date - Avg $/FT', value: '$132.68' },
    { label: 'Plan - Median SHMP', value: '$8,512.31' },
    { label: 'Plan - Median $/FT', value: '$132.68' },
    { label: 'Actual to Date - Median SHMP', value: '$8,512.31' },
    { label: 'Actual to Date - Median $/FT', value: '$132.68' },
  ];

  readonly metrics2025NonHhhp = [
    { label: 'Total Segments', value: '13' },
    { label: 'Planned Avg SHMP', value: '$6,285.61' },
    { label: 'Labor Cost', value: '$157.84' },
    { label: 'Plan - Avg SHMP', value: '$6,285.61' },
    { label: 'Plan - Avg $/FT', value: '$108.55' },
    { label: 'Plan - All In $/FT', value: '$108.55' },
    { label: 'Actual to Date - Avg SHMP', value: '$6,285.61' },
    { label: 'Actual to Date - Avg $/FT', value: '$108.55' },
    { label: 'Plan - Median SHMP', value: '$6,285.61' },
    { label: 'Plan - Median $/FT', value: '$108.55' },
    { label: 'Actual to Date - Median SHMP', value: '$6,285.61' },
    { label: 'Actual to Date - Median $/FT', value: '$108.55' },
  ];
}
