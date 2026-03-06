import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MapComponent } from './map/map.component';
import { LocationTrackingToggleComponent } from './location-tracking-toggle/location-tracking-toggle.component';

// Guards
import { DispatcherGuard } from '../../guards/dispatcher.guard';

const routes: Routes = [
  {
    path: '',
    component: MapComponent,
    data: { 
      title: 'Map View',
      breadcrumb: 'Map'
    }
  }
];

/**
 * Mapping Feature Module
 * 
 * Lazy-loaded module for geographic mapping functionality.
 * Provides components for displaying interactive maps with technician locations,
 * crew positions, and job sites with real-time updates.
 */
@NgModule({
  declarations: [
    MapComponent,
    LocationTrackingToggleComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    MatSlideToggleModule,
    MatIconModule,
    RouterModule.forChild(routes)
  ],
  exports: [
    MapComponent,
    LocationTrackingToggleComponent
  ]
})
export class MappingModule { }
