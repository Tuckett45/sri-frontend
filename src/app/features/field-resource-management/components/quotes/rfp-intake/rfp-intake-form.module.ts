import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { SharedMaterialModule } from '../../../shared-material.module';
import { SharedComponentsModule } from '../../shared/shared-components.module';
import { RfpIntakeFormComponent } from './rfp-intake-form.component';

/**
 * Shared module for RfpIntakeFormComponent.
 *
 * Imported by both the eagerly-loaded FRM module (for dialog use)
 * and the lazy-loaded QuotesModule (for route/workflow use).
 */
@NgModule({
  declarations: [RfpIntakeFormComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SharedMaterialModule,
    SharedComponentsModule
  ],
  exports: [RfpIntakeFormComponent]
})
export class RfpIntakeFormModule {}
