import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

// Shared Material Module
import { SharedMaterialModule } from '../../shared-material.module';

// Shared Components Module
import { SharedComponentsModule } from '../shared/shared-components.module';

// Mobile Shared Module (for TimeTrackerComponent without routes)
import { MobileSharedModule } from '../mobile/mobile-shared.module';

// Job Components
import { JobListComponent } from './job-list/job-list.component';
import { JobDetailComponent } from './job-detail/job-detail.component';
import { JobFormComponent } from './job-form/job-form.component';
import { JobNotesComponent } from './job-notes/job-notes.component';
import { JobStatusTimelineComponent } from './job-status-timeline/job-status-timeline.component';

const routes: Routes = [
  {
    path: '',
    component: JobListComponent,
    data: { 
      title: 'Jobs',
      breadcrumb: 'Jobs'
    }
  },
  {
    path: 'new',
    component: JobFormComponent,
    data: { 
      title: 'New Job',
      breadcrumb: 'New'
    }
  },
  {
    path: ':id',
    component: JobDetailComponent,
    data: { 
      title: 'Job Detail',
      breadcrumb: 'Detail'
    }
  },
  {
    path: ':id/edit',
    component: JobFormComponent,
    data: { 
      title: 'Edit Job',
      breadcrumb: 'Edit'
    }
  }
];

/**
 * Jobs Feature Module
 * 
 * Lazy-loaded module for job management functionality.
 * Includes list, detail, and form components for managing jobs,
 * work orders, and job assignments.
 */
@NgModule({
  declarations: [
    JobListComponent,
    JobDetailComponent,
    JobFormComponent,
    JobNotesComponent,
    JobStatusTimelineComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedMaterialModule,
    SharedComponentsModule,
    MobileSharedModule,
    RouterModule.forChild(routes)
  ]
})
export class JobsModule { }
