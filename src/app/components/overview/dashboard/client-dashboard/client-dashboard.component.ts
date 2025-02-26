import { Component, OnInit } from '@angular/core';
import { ChartModule } from 'primeng/chart';

@Component({
  selector: 'client-dashboard',
  templateUrl: './client-dashboard.component.html',
  styleUrls: ['./client-dashboard.component.scss'],
  standalone: true,
  imports: [ChartModule]
})
export class ClientDashboardComponent implements OnInit {
  // Add Client-specific dashboard data and options
  clientData: any;
  clientOptions: any;

  ngOnInit(): void {
    // Initialize Client-specific data and options for charts or stats
    this.initClientDashboard();
  }

  initClientDashboard() {
    // Define Client-specific data (e.g., high-level stats, trends, etc.)
    this.clientData = {
      labels: ['January', 'February', 'March'],
      datasets: [
        { label: 'Client Metric 1', data: [60, 70, 80], borderColor: '#00B5B8' },
        { label: 'Client Metric 2', data: [40, 60, 90], borderColor: '#FFB200' }
      ]
    };

    this.clientOptions = {
      responsive: true,
      // More client-specific chart options
    };
  }
}
