import { Component, ViewChild } from '@angular/core';
import { SummaryComponent } from './summary/summary.component';

@Component({
  selector: 'app-tps',
  templateUrl: './tps.component.html',
  styleUrls: ['./tps.component.scss']
})
export class TpsComponent {
  activeTab = 0;

  @ViewChild(SummaryComponent) dashboard?: SummaryComponent;

  onTabChange(index: number | string): void {
    const idx = Number(index);
    this.activeTab = idx;
      if (idx === 0) {
        // Refresh charts when the Dashboard tab is active
        this.dashboard?.refreshCharts();
      }
  }
}
