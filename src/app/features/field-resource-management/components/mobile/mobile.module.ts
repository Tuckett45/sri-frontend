import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

// Shared Material Module
import { SharedMaterialModule } from '../../shared-material.module';

// Shared Components Module
import { SharedComponentsModule } from '../shared/shared-components.module';

// Mobile Shared Module (for TimeTrackerComponent)
import { MobileSharedModule } from './mobile-shared.module';

// Mobile Components
import { DailyViewComponent } from './daily-view/daily-view.component';
import { JobCardComponent } from './job-card/job-card.component';
import { JobCompletionFormComponent } from './job-completion-form/job-completion-form.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'daily',
    pathMatch: 'full'
  },
  {
    path: 'daily',
    component: DailyViewComponent,
    data: { 
      title: 'My Daily Schedule',
      breadcrumb: 'Daily View'
    }
  }
];

/**
 * Mobile Feature Module
 * 
 * Lazy-loaded module for mobile technician views.
 * Includes daily schedule view, job cards, time tracking,
 * and job completion forms optimized for mobile devices.
 */
@NgModule({
  declarations: [
    DailyViewComponent,
    JobCardComponent,
    JobCompletionFormComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SharedMaterialModule,
    SharedComponentsModule,
    MobileSharedModule,
    RouterModule.forChild(routes)
  ],
  exports: [
    MobileSharedModule
  ]
})
export class MobileModule { }
