import { Component } from '@angular/core';
import { ChartDataset, ChartOptions } from 'chart.js';
import { BaseChartDirective  } from 'ng2-charts';

@Component({
  selector: 'app-chart',
  templateUrl: './chart.component.html',
  styleUrls: ['./chart.component.scss']
})
export class ChartComponent {
  public lineChartData: ChartDataset[] = [
    { data: [65, 59, 80, 81, 56, 55, 40], label: 'Sales' },
    { data: [28, 48, 40, 19, 86, 27, 90], label: 'Revenue' }
  ];

  public lineChartLabels: BaseChartDirective ["labels"] = ['January', 'February', 'March', 'April', 'May', 'June', 'July'];

  public lineChartOptions: ChartOptions = {
    responsive: true,
  };

  public lineChartLegend = true;
  public lineChartType = 'line';
}