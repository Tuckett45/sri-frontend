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

  violationsChartData: any;
  cityAllInChartData: any;
  chartOptions = {
    maintainAspectRatio: false,
    aspectRatio: 1,
    plugins: {
      legend: {
        labels: {
          color: '#000'
        }
      }
    },
    scales: {
      x: {
        ticks: { color: '#000' },
        grid: { color: '#ebedef' }
      },
      y: {
        ticks: { color: '#000' },
        grid: { color: '#ebedef' }
      }
    }
  };

  constructor(private tpsService: TpsService) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData() {
    this.tpsService.getViolations().subscribe(res => {
      this.violationsCount = res.length;
      this.totalOverspent = res.reduce((sum, v) => sum + (v.overspentBy ?? 0), 0);

      const vendorMap = new Map<string, number>();
      res.forEach(v => {
        const vendor = v.vendor ?? 'Unknown';
        vendorMap.set(vendor, (vendorMap.get(vendor) ?? 0) + (v.overspentBy ?? 0));
      });
      this.violationsChartData = {
        labels: Array.from(vendorMap.keys()),
        datasets: [
          {
            label: 'Overspent',
            data: Array.from(vendorMap.values()),
            backgroundColor: '#42A5F5',
            borderColor: '#1E88E5',
            borderWidth: 1
          }
        ]
      };
    });

    this.tpsService.getCityScorecard().subscribe(res => {
      this.cityCount = res.length;
      this.forecastedAllInTotal = res.reduce((sum, c) => sum + (c.forecastedAllIn ?? 0), 0);
      this.actualAllInTotal = res.reduce((sum, c) => sum + (c.actualAllIn ?? 0), 0);

      this.cityAllInChartData = {
        labels: res.map(c => c.city),
        datasets: [
          {
            label: 'Forecasted All-In',
            data: res.map(c => c.forecastedAllIn),
            backgroundColor: '#66BB6A',
            borderColor: '#43A047',
            borderWidth: 1
          },
          {
            label: 'Actual All-In',
            data: res.map(c => c.actualAllIn),
            backgroundColor: '#FFA726',
            borderColor: '#FB8C00',
            borderWidth: 1
          }
        ]
      };
    });
  }
}
