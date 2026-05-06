import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { SharedMaterialModule } from '../../shared-material.module';
import { TechnicianTravelProfileComponent } from './technician-travel-profile/technician-travel-profile.component';
import { TechnicianDistanceListComponent } from './technician-distance-list/technician-distance-list.component';
import { CreateTravelProfileDialogComponent } from './create-travel-profile-dialog/create-travel-profile-dialog.component';
import { TravelOverviewComponent } from './travel-overview/travel-overview.component';
import { TravelProfileDialogComponent } from './travel-profile-dialog/travel-profile-dialog.component';

@NgModule({
  declarations: [TechnicianTravelProfileComponent, TechnicianDistanceListComponent, CreateTravelProfileDialogComponent],
  imports: [CommonModule, ReactiveFormsModule, FormsModule, SharedMaterialModule],
  exports: [TechnicianTravelProfileComponent, TechnicianDistanceListComponent, CreateTravelProfileDialogComponent]
})
export class TravelSharedModule {}

const routes: Routes = [{ path: '', component: TravelOverviewComponent }];

@NgModule({
  declarations: [TravelOverviewComponent, TravelProfileDialogComponent],
  imports: [CommonModule, SharedMaterialModule, TravelSharedModule, RouterModule.forChild(routes)]
})
export class TravelModule {}
