import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

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
const routes: Routes = [
  {
    path: '',
    component: QuoteListComponent,
    data: {
      title: 'Quotes',
      breadcrumb: 'Quotes'
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
 * Manages the full pipeline from RFP intake through labor estimation,
 * BOM creation, internal BOM validation, quote assembly, delivery,
 * and quote-to-job conversion.
 *
 * Routes:
 * - '' → QuoteListComponent (list all quotes)
 * - 'new' → RfpIntakeFormComponent (create new quote, guarded by QuoteCreateGuard)
 * - ':id' → QuoteWorkflowComponent (view/edit existing quote workflow)
 *
 * Requirements: 12.1–12.7
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
    ConvertToJobComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedMaterialModule,
    SharedComponentsModule,
    RfpIntakeFormModule,
    RouterModule.forChild(routes)
  ],
})
export class QuotesModule { }
