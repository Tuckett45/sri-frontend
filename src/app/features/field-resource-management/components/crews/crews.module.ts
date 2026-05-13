import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

// Shared Material Module
import { SharedMaterialModule } from '../../shared-material.module';

// Shared Components Module
import { SharedComponentsModule } from '../shared/shared-components.module';

// Crew Components
import { CrewListComponent } from './crew-list/crew-list.component';
import { CrewFormComponent } from './crew-form/crew-form.component';
import { CrewDetailComponent } from './crew-detail/crew-detail.component';

const routes: Routes = [
  {
    path: '',
    component: CrewListComponent,
    data: { 
      title: 'Crews',
      breadcrumb: 'Crews'
    }
  },
  {
    path: 'new',
    component: CrewFormComponent,
    data: { 
      title: 'New Crew',
      breadcrumb: 'New'
    }
  },
  {
    path: ':id',
    component: CrewDetailComponent,
    data: { 
      title: 'Crew Detail',
      breadcrumb: 'Detail'
    }
  },
  {
    path: ':id/edit',
    component: CrewFormComponent,
    data: { 
      title: 'Edit Crew',
      breadcrumb: 'Edit'
    }
  }
];

/**
 * Crews Feature Module
 * 
 * Lazy-loaded module for crew management functionality.
 * Includes list, detail, and form components for managing crews,
 * crew members, and crew assignments.
 */
@NgModule({
  declarations: [
    CrewListComponent,
    CrewFormComponent,
    CrewDetailComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SharedMaterialModule,
    SharedComponentsModule,
    RouterModule.forChild(routes)
  ]
})
export class CrewsModule { }
