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
import { AddTechnicianModalComponent } from './add-technician-modal/add-technician-modal.component';
import { TechnicianFinancialTabComponent } from './technician-detail/technician-financial-tab/technician-financial-tab.component';
import { TechnicianAttachmentsSectionComponent } from './technician-detail/technician-attachments-section/technician-attachments-section.component';
import { AddSkillDialogComponent } from './technician-detail/add-skill-dialog/add-skill-dialog.component';
import { AddCertificationDialogComponent } from './technician-detail/add-certification-dialog/add-certification-dialog.component';

// Shared FRM input directives (name capitalization + phone masking)
import { FrmDirectivesModule } from '../../directives/frm-directives.module';

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
    path: ':id',
    component: TechnicianDetailComponent,
    data: { 
      title: 'Technician Detail',
      breadcrumb: 'Detail'
    }
  }
];

/**
 * Technicians Feature Module
 * 
 * Lazy-loaded module for technician management functionality.
 * Includes list and detail components plus the add/edit modal for managing
 * technician profiles, skills, certifications, and availability.
 */
@NgModule({
  declarations: [
    TechnicianListComponent,
    TechnicianDetailComponent,
    AddTechnicianModalComponent,
    TechnicianFinancialTabComponent,
    TechnicianAttachmentsSectionComponent,
    AddSkillDialogComponent,
    AddCertificationDialogComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedMaterialModule,
    SharedComponentsModule,
    TravelSharedModule,
    FrmDirectivesModule,
    RouterModule.forChild(routes)
  ]
})
export class TechniciansModule { }
