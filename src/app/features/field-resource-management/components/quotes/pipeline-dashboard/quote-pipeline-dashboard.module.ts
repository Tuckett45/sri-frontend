import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SharedMaterialModule } from '../../../shared-material.module';
import { QuotePipelineDashboardComponent } from './quote-pipeline-dashboard.component';

/**
 * Shared module for the Quote Pipeline Dashboard widget.
 *
 * This module exists so the component can be used in both:
 * - The eagerly-loaded FRM home dashboard
 * - The lazy-loaded QuotesModule (RFP Dashboard tabs)
 */
@NgModule({
  declarations: [QuotePipelineDashboardComponent],
  imports: [
    CommonModule,
    RouterModule,
    SharedMaterialModule
  ],
  exports: [QuotePipelineDashboardComponent]
})
export class QuotePipelineDashboardModule {}
