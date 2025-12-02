import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource } from '@angular/material/table';
import { FormBuilder } from '@angular/forms';
import { CityScorecard } from 'src/app/models/city-scorecard.model';
import { TpsService } from 'src/app/services/tps.service';
import { MatSort } from '@angular/material/sort';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-city-scorecard',
  templateUrl: './city-scorecard.component.html',
  styleUrls: ['./city-scorecard.component.scss']
})
export class CityScorecardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
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
    'closedDate',
    'score',
    'notes'
  ];
  dataSource = new MatTableDataSource<CityScorecard>();
  @ViewChild(MatSort) sort!: MatSort;

  scorecards: CityScorecard[] = [];
  filteredScorecards: CityScorecard[] = [];

  filterForm = this.fb.group({
    startDate: [null as Date | null],
    endDate: [null as Date | null],
    city: ['']
  });

  constructor(private tpsService: TpsService, private fb: FormBuilder) {}

  ngOnInit(): void {
    this.loadScorecard();
    
    // Subscribe to city changes
    this.tpsService.selectedCity$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadScorecard();
      });
    
    this.filterForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.applyFilters());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadScorecard() {
    const segmentPrefix = this.tpsService.selectedCity.segmentPrefix;
    this.tpsService.getCityScorecard(segmentPrefix).subscribe(res => {
      this.scorecards = res;
      this.applyFilters();
    });
  }

  applyFilters() {
    const { startDate, endDate, city } = this.filterForm.value;
    this.filteredScorecards = this.scorecards.filter(c => {
      const date = c.ta_Date ? new Date(c.ta_Date) : null;
      const matchesStart = startDate ? (date ? date >= startDate : false) : true;
      const matchesEnd = endDate ? (date ? date <= endDate : false) : true;
      const matchesCity = city ? c.city?.toLowerCase().includes(city.toLowerCase()) : true;
      return matchesStart && matchesEnd && matchesCity;
    });
    this.dataSource.data = this.filteredScorecards;
    this.dataSource.sort = this.sort;
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
