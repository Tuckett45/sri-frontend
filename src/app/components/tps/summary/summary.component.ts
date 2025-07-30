import { Component, OnInit } from '@angular/core';
import { TpsService } from 'src/app/services/tps.service';

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

  constructor(private tpsService: TpsService) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData() {
    this.tpsService.getViolations().subscribe(res => {
      this.violationsCount = res.length;
      this.totalOverspent = res.reduce((sum, v) => sum + (v.overspentBy ?? 0), 0);
    });
    this.tpsService.getCityScorecard().subscribe(res => {
      this.cityCount = res.length;
      this.forecastedAllInTotal = res.reduce((sum, c) => sum + (c.forecastedAllIn ?? 0), 0);
      this.actualAllInTotal = res.reduce((sum, c) => sum + (c.actualAllIn ?? 0), 0);
    });
  }
}
