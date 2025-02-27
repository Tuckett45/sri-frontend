import { Component, OnInit } from '@angular/core';
import { ChartModule } from 'primeng/chart';
import { StatsComponent } from '../../stats/stats.component';

@Component({
  selector: 'sri-dashboard',
  templateUrl: './sri-dashboard.component.html',
  styleUrls: ['./sri-dashboard.component.scss'],
  standalone: true,
  imports: [ChartModule, StatsComponent]
})
export class SRIDashboardComponent implements OnInit {
  sriData: any;
  sriOptions: any;

  ngOnInit(): void {
    // Initialize SRI-specific data (e.g., punch lists, issues, street sheets)
    this.initSRIDashboard();
  }

  initSRIDashboard() {
    this.sriData = {
      labels: ['January', 'February', 'March'],
      datasets: [
        { label: 'Number of Punch Lists', data: [12, 15, 20], borderColor: '#FF2D2D' },
        { label: 'Issues Tracked', data: [8, 12, 15], borderColor: '#FFD700' }
      ]
    };

    this.sriOptions = {
      responsive: true,
      // SRI-specific chart options
    };
  }
}
