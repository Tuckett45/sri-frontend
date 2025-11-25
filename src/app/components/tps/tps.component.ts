import { Component, ViewChild } from '@angular/core';
import { SummaryComponent } from './summary/summary.component';
import { TpsService, CityOption } from 'src/app/services/tps.service';

@Component({
  selector: 'app-tps',
  templateUrl: './tps.component.html',
  styleUrls: ['./tps.component.scss']
})
export class TpsComponent {
  activeTab = 0;
  cities: CityOption[] = [];
  selectedCity: CityOption | null = null;

  @ViewChild(SummaryComponent) dashboard?: SummaryComponent;

  constructor(public tpsService: TpsService) {
    this.cities = this.tpsService.cities;
    this.selectedCity = this.tpsService.selectedCity;
  }

  onCityChange(city: CityOption): void {
    this.selectedCity = city;
    this.tpsService.setSelectedCity(city);
  }

  onTabChange(index: number | string): void {
    const idx = Number(index);
    this.activeTab = idx;
      if (idx === 0) {
        // Refresh charts when the Dashboard tab is active
        this.dashboard?.refreshCharts();
      }
  }
}
