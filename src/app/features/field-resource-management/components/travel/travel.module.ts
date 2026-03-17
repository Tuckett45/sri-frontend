import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

import { SharedMaterialModule } from '../../shared-material.module';

import { TechnicianTravelProfileComponent } from './technician-travel-profile/technician-travel-profile.component';
import { TechnicianDistanceListComponent } from './technician-distance-list/technician-distance-list.component';
import { TravelOverviewComponent } from './travel-overview/travel-overview.component';

const routes: Routes = [
  {
    path: '',
    component: TravelOverviewComponent
  }
];

/**
 * Shared Travel Module (no routes) — for embedding travel components in other modules.
 */
@NgModule({
  declarations: [
    TechnicianTravelProfileComponent,
    TechnicianDistanceListComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SharedMaterialModule
  ],
  exports: [
    TechnicianTravelProfileComponent,
    TechnicianDistanceListComponent
  ]
})
export class TravelSharedModule { }

/**
 * Routable Travel Module — lazy-loaded from the FRM routing module.
 */
@NgModule({
  declarations: [
    TravelOverviewComponent
  ],
  imports: [
    CommonModule,
    SharedMaterialModule,
    TravelSharedModule,
    RouterModule.forChild(routes)
  ]
})
export class TravelModule { }
