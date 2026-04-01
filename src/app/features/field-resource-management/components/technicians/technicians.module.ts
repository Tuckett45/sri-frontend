import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

// Shared Material Module
import { SharedMaterialModule } from '../../shared-material.module';

// Shared Components Module
import { SharedComponentsModule } from '../shared/shared-components.module';

// Travel Module for travel profile integration
import { TravelSharedModule } from '../travel/travel.module';

// Technician Components
import { TechnicianListComponent } from './technician-list/technician-list.component';
import { TechnicianDetailComponent } from './technician-detail/technician-detail.component';
import { TechnicianFormComponent } from './technician-form/technician-form.component';
import { TechnicianFinancialTabComponent } from './technician-detail/technician-financial-tab/technician-financial-tab.component';

const routes: Routes = [
  {
    path: '',
    component: TechnicianListComponent,
    data: { 
      title: 'Technicians',
      breadcrumb: 'Technicians'
    }
  },
  {
    path: 'new',
    component: TechnicianFormComponent,
    data: { 
      title: 'New Technician',
      breadcrumb: 'New'
    }
  },
  {
    path: ':id',
    component: TechnicianDetailComponent,
    data: { 
      title: 'Technician Detail',
      breadcrumb: 'Detail'
    }
  },
  {
    path: ':id/edit',
    component: TechnicianFormComponent,
    data: { 
      title: 'Edit Technician',
      breadcrumb: 'Edit'
    }
  }
];

/**
 * Technicians Feature Module
 * 
 * Lazy-loaded module for technician management functionality.
 * Includes list, detail, and form components for managing technician profiles,
 * skills, certifications, and availability.
 */
@NgModule({
  declarations: [
    TechnicianListComponent,
    TechnicianDetailComponent,
    TechnicianFormComponent,
    TechnicianFinancialTabComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedMaterialModule,
    SharedComponentsModule,
    TravelSharedModule,
    RouterModule.forChild(routes)
  ]
})
export class TechniciansModule { }
