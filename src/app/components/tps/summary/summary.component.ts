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

  constructor(private tpsService: TpsService) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData() {
    this.tpsService.getViolations().subscribe(res => this.violationsCount = res.length);
    this.tpsService.getCityScorecard().subscribe(res => this.cityCount = res.length);
  }
}
