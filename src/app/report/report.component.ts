import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Chart, ChartConfiguration, ChartType } from 'chart.js';

@Component({
  selector: 'app-report',
  templateUrl: './report.component.html',
  styleUrls: ['./report.component.scss']
})
export class ReportComponent implements OnInit {
  
  // Reference to the chart canvas
  @ViewChild('barCanvas', { static: true }) barCanvas!: ElementRef;
  barChart: any;

  // Sample report data to display in the table
  reportData = [
    { name: 'John Doe', date: '2024-09-26', value: 1500 },
    { name: 'Jane Smith', date: '2024-09-25', value: 1800 },
    { name: 'David Jones', date: '2024-09-24', value: 1200 },
    { name: 'Emily Johnson', date: '2024-09-23', value: 1750 }
  ];

  constructor() { }

  ngOnInit(): void {
    this.renderBarChart(); // Call the chart rendering function when the component is initialized
  }

  /**
   * Function to render the bar chart using Chart.js
   */
  renderBarChart(): void {
    // Prepare chart configuration
    debugger;
    const chartConfig: ChartConfiguration = {
      type: 'bar' as ChartType,
      data: {
        labels: this.reportData.map(item => item.name), // Use the names from reportData for chart labels
        datasets: [
          {
            label: 'Report Values',
            data: this.reportData.map(item => item.value), // Use the values from reportData for chart data
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1,
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true // Ensure the Y-axis starts from zero
          }
        }
      }
    };

    // Initialize the chart
    this.barChart = new Chart(this.barCanvas.nativeElement, chartConfig);
  }
}