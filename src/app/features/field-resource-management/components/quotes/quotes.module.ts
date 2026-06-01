import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';

// Shared Material Module
import { SharedMaterialModule } from '../../shared-material.module';

// Shared Components Module
import { SharedComponentsModule } from '../shared/shared-components.module';

// RFP Intake Form shared module
import { RfpIntakeFormModule } from './rfp-intake/rfp-intake-form.module';

// Quote Components
import { QuoteListComponent } from './quote-list/quote-list.component';
import { QuoteWorkflowComponent } from './quote-workflow/quote-workflow.component';
import { JobSummaryFormComponent } from './job-summary/job-summary-form.component';
import { BomBuilderComponent } from './bom-builder/bom-builder.component';
import { BomValidationComponent } from './bom-validation/bom-validation.component';
import { BomRejectionDialogComponent } from './bom-validation/bom-rejection-dialog.component';
import { QuoteAssemblyComponent } from './quote-assembly/quote-assembly.component';
import { QuoteDeliveryComponent } from './quote-delivery/quote-delivery.component';
import { ConvertToJobComponent } from './convert-to-job/convert-to-job.component';

// Dashboard Components
import { RfpDashboardComponent } from './rfp-dashboard/rfp-dashboard.component';
import { RfpTabComponent } from './rfp-dashboard/rfp-tab/rfp-tab.component';
import { PoTrackingTabComponent } from './rfp-dashboard/po-tracking-tab/po-tracking-tab.component';
import { ProjectTrackingTabComponent } from './rfp-dashboard/project-tracking-tab/project-tracking-tab.component';
import { BomHistoryDialogComponent } from './rfp-dashboard/bom-history-dialog/bom-history-dialog.component';

// Dashboard State
import { dashboardReducer } from '../../state/quotes/dashboard.reducer';
import { DashboardEffects } from '../../state/quotes/dashboard.effects';

const routes: Routes = [
  {
    path: '',
    component: RfpDashboardComponent,
    data: {
      title: 'RFP Dashboard',
      breadcrumb: 'RFP Dashboard'
    }
  },
  {
    path: 'new',
    redirectTo: '',
    pathMatch: 'full'
  },
  {
    path: ':id',
    component: QuoteWorkflowComponent,
    data: {
      title: 'Quote Workflow',
      breadcrumb: 'Workflow'
    }
  }
];

/**
 * Quotes Feature Module
 *
 * Lazy-loaded module for the Quote/RFP Workflow functionality.
 * The default route now renders the RFP Dashboard with 3 tabs:
 * New RFPs, PO Tracking, and Project Tracking.
 *
 * Routes:
 * - '' -> RfpDashboardComponent (3-tab dashboard)
 * - 'new' -> redirect to dashboard
 * - ':id' -> QuoteWorkflowComponent (view/edit existing quote workflow)
 */
@NgModule({
  declarations: [
    QuoteListComponent,
    QuoteWorkflowComponent,
    JobSummaryFormComponent,
    BomBuilderComponent,
    BomValidationComponent,
    BomRejectionDialogComponent,
    QuoteAssemblyComponent,
    QuoteDeliveryComponent,
    ConvertToJobComponent,
    RfpDashboardComponent,
    RfpTabComponent,
    PoTrackingTabComponent,
    ProjectTrackingTabComponent,
    BomHistoryDialogComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedMaterialModule,
    SharedComponentsModule,
    RfpIntakeFormModule,
    StoreModule.forFeature('dashboard', dashboardReducer),
    EffectsModule.forFeature([DashboardEffects]),
    RouterModule.forChild(routes)
  ],
})
export class QuotesModule { }
