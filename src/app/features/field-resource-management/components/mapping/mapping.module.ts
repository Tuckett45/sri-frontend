import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedMaterialModule } from '../../shared-material.module';
import { MapComponent } from './map/map.component';
import { MapViewComponent } from './map-view/map-view.component';
import { MapFiltersComponent } from './map-filters/map-filters.component';
import { MapLegendComponent } from './map-legend/map-legend.component';
import { LocationTrackingToggleComponent } from './location-tracking-toggle/location-tracking-toggle.component';

const routes: Routes = [{ path: '', component: MapViewComponent }];

@NgModule({
  declarations: [
    MapComponent,
    MapViewComponent,
    MapFiltersComponent,
    MapLegendComponent,
    LocationTrackingToggleComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedMaterialModule,
    RouterModule.forChild(routes)
  ]
})
export class MappingModule {}
