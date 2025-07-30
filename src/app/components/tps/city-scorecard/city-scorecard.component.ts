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
  displayedColumns: string[] = ['city', 'score', 'notes'];
  dataSource = new MatTableDataSource<CityScorecard>();

  constructor(private tpsService: TpsService) {}

  ngOnInit(): void {
    this.loadScorecard();
  }

  loadScorecard() {
    this.tpsService.getCityScorecard().subscribe(res => this.dataSource.data = res);
  }

  exportCsv() {
    const rows = this.dataSource.data.map(c =>
      [c.city, c.score, c.notes].join(',')
    );
    const csv = ['City,Score,Notes', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = window.URL.createObjectURL(blob);
    a.download = 'city-scorecard.csv';
    a.click();
  }
}
