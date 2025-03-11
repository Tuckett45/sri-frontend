import { Component, OnInit } from '@angular/core';
import { DashboardService } from 'src/app/services/dashboard.service';
import { ChartModule } from 'primeng/chart';
import { StatsComponent } from "../../stats/stats.component";

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

  // Date range for filtering data
  startDate!: Date;
  endDate!: Date;

  // User role, which might be fetched from authentication
  userRole: string = 'PM'; // This is an example, replace with actual logic to fetch role

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.fetchDashboardData();
  }

  fetchDashboardData(): void {
    // Fetch data for the dashboard with optional parameters (e.g., startDate, endDate, userRole)
    this.dashboardService.getSRIDashboardData().subscribe(
      (data: { TotalCount: any; ResolvedCount: any; UnresolvedCount: any; }) => {
        // Assuming the response contains the following fields for the dashboard data
        this.sriData = {
          labels: ['Total Punch Lists', 'Resolved Punch Lists', 'Unresolved Punch Lists'],  // Modify based on your API's structure
          datasets: [
            {
              label: 'Punch List Status',
              data: [
                data.TotalCount,      // Total count from backend response
                data.ResolvedCount,   // Resolved count from backend response
                data.UnresolvedCount, // Unresolved count from backend response
              ],
              backgroundColor: ['#FF2D2D', '#4CAF50', '#FFD700'],
              hoverBackgroundColor: ['#FF6F6F', '#66BB6A', '#FFEB3B'],
              borderColor: '#000000',
              borderWidth: 1,
            },
          ],
        };

        this.sriOptions = {
          responsive: true,
          plugins: {
            legend: {
              position: 'top',
            },
            tooltip: {
              callbacks: {
                label: (tooltipItem: { label: any; raw: any; }) => {
                  return `${tooltipItem.label}: ${tooltipItem.raw}`;  // Display number along with label
                },
              },
            },
          },
        };
      },
      (error: any) => {
        console.error('Error fetching dashboard data:', error);
      }
    );
  }

  // Method to apply filters based on date range change
  onDateChange(startDate: Date, endDate: Date): void {
    this.startDate = startDate;
    this.endDate = endDate;
    this.fetchDashboardData(); // Fetch updated data with new date range
  }

  // Method to change role and re-fetch data based on new role
  onRoleChange(role: string): void {
    this.userRole = role;
    this.fetchDashboardData(); // Fetch updated data with new role
  }
}
