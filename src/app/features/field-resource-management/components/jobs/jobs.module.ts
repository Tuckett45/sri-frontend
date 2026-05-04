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

// Budget Module for budget view integration in job detail
import { BudgetModule } from '../budgets/budget.module';

// Job Components
import { JobListComponent } from './job-list/job-list.component';
import { JobDetailComponent } from './job-detail/job-detail.component';
import { JobFormComponent } from './job-form/job-form.component';
import { JobNotesComponent } from './job-notes/job-notes.component';
import { JobStatusTimelineComponent } from './job-status-timeline/job-status-timeline.component';
import { AttachmentPreviewDialogComponent } from './attachment-preview-dialog/attachment-preview-dialog.component';

// Job Setup Workflow Components
import { JobSetupComponent } from './job-setup/job-setup.component';
import { CustomerInfoStepComponent } from './job-setup/steps/customer-info-step.component';
import { PricingBillingStepComponent } from './job-setup/steps/pricing-billing-step.component';
import { SriInternalStepComponent } from './job-setup/steps/sri-internal-step.component';
import { ReviewStepComponent } from './job-setup/steps/review-step.component';

// Deployment Checklist Components
import { DeploymentChecklistComponent } from './deployment-checklist/deployment-checklist.component';
import { ChecklistPrintComponent } from './deployment-checklist/checklist-print.component';
import { JobDetailsPhaseComponent } from './deployment-checklist/phases/job-details-phase.component';
import { PreInstallationPhaseComponent } from './deployment-checklist/phases/pre-installation-phase.component';
import { EodReportPhaseComponent } from './deployment-checklist/phases/eod-report-phase.component';
import { EodEntryFormComponent } from './deployment-checklist/phases/eod-entry-form.component';
import { CloseOutPhaseComponent } from './deployment-checklist/phases/close-out-phase.component';

// Guards
import { CreateJobGuard } from '../../guards/create-job.guard';

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
    component: JobSetupComponent,
    canActivate: [CreateJobGuard],
    data: { 
      title: 'New Job Setup',
      breadcrumb: 'New Job'
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
    JobStatusTimelineComponent,
    AttachmentPreviewDialogComponent,
    JobSetupComponent,
    CustomerInfoStepComponent,
    PricingBillingStepComponent,
    SriInternalStepComponent,
    ReviewStepComponent,
    JobDetailsPhaseComponent,
    PreInstallationPhaseComponent,
    EodReportPhaseComponent,
    EodEntryFormComponent,
    CloseOutPhaseComponent,
    DeploymentChecklistComponent,
    ChecklistPrintComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedMaterialModule,
    SharedComponentsModule,
    MobileSharedModule,
    BudgetModule,
    RouterModule.forChild(routes)
  ]
})
export class JobsModule { }
