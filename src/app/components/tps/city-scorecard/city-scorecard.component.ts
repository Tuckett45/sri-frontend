import { Component, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { CityScorecard } from 'src/app/models/city-scorecard.model';
import { TpsService } from 'src/app/services/tps.service';

@Component({
  selector: 'app-city-scorecard',
  templateUrl: './city-scorecard.component.html',
  styleUrls: ['./city-scorecard.component.scss']
})
export class CityScorecardComponent implements OnInit {
  displayedColumns: string[] = [
    'city',
    'forecastedHHP',
    'actualHHP',
    'percentChangeHHP',
    'forecastedDollarPerHHP',
    'actualDollarPerHHP',
    'percentChangeDollarPerHHP',
    'forecastedDollarPerLFT',
    'actualDollarPerLFT',
    'percentChangeDollarPerLFT',
    'forecastedAllIn',
    'actualAllIn',
    'percentChangeAllIn',
    'ta_Date',
    'compDate',
    'closedDate'
  ];
  dataSource = new MatTableDataSource<CityScorecard>();

  constructor(private tpsService: TpsService) {}

  ngOnInit(): void {
    this.loadScorecard();
  }

  loadScorecard() {
    this.tpsService.getCityScorecard().subscribe(res => this.dataSource.data = res);
  }

  exportCsv() {
    const headers = [
      'City',
      'ForecastedHHP',
      'ActualHHP',
      'PercentChangeHHP',
      'ForecastedDollarPerHHP',
      'ActualDollarPerHHP',
      'PercentChangeDollarPerHHP',
      'ForecastedDollarPerLFT',
      'ActualDollarPerLFT',
      'PercentChangeDollarPerLFT',
      'ForecastedAllIn',
      'ActualAllIn',
      'PercentChangeAllIn',
      'TA_Date',
      'CompDate',
      'ClosedDate'
    ];
    const rows = this.dataSource.data.map(c =>
      [
        c.city,
        c.forecastedHHP,
        c.actualHHP,
        c.percentChangeHHP,
        c.forecastedDollarPerHHP,
        c.actualDollarPerHHP,
        c.percentChangeDollarPerHHP,
        c.forecastedDollarPerLFT,
        c.actualDollarPerLFT,
        c.percentChangeDollarPerLFT,
        c.forecastedAllIn,
        c.actualAllIn,
        c.percentChangeAllIn,
        c.ta_Date,
        c.compDate,
        c.closedDate
      ].join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = window.URL.createObjectURL(blob);
    a.download = 'city-scorecard.csv';
    a.click();
  }
}
