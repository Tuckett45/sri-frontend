import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

import { SharedMaterialModule } from '../../shared-material.module';

import { TechnicianTravelProfileComponent } from './technician-travel-profile/technician-travel-profile.component';
import { TechnicianDistanceListComponent } from './technician-distance-list/technician-distance-list.component';
import { TravelOverviewComponent } from './travel-overview/travel-overview.component';
import { TravelProfileDialogComponent } from './travel-profile-dialog/travel-profile-dialog.component';
import { CreateTravelProfileDialogComponent } from './create-travel-profile-dialog/create-travel-profile-dialog.component';

const routes: Routes = [
  {
    path: '',
    component: TravelOverviewComponent,
    data: { breadcrumb: 'Travel' }
  }
];

/**
 * Shared Travel Module (no routes) — for embedding travel components in other modules.
 */
@NgModule({
  declarations: [
    TechnicianTravelProfileComponent,
    TechnicianDistanceListComponent,
    CreateTravelProfileDialogComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SharedMaterialModule
  ],
  exports: [
    TechnicianTravelProfileComponent,
    TechnicianDistanceListComponent,
    CreateTravelProfileDialogComponent
  ]
})
export class TravelSharedModule { }

/**
 * Routable Travel Module — lazy-loaded from the FRM routing module.
 */
@NgModule({
  declarations: [
    TravelOverviewComponent,
    TravelProfileDialogComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedMaterialModule,
    TravelSharedModule,
    RouterModule.forChild(routes)
  ]
})
export class TravelModule { }
