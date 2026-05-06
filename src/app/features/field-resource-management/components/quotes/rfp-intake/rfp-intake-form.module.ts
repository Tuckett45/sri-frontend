import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SharedMaterialModule } from '../../../shared-material.module';
import { RfpIntakeFormComponent } from './rfp-intake-form.component';

@NgModule({
  declarations: [RfpIntakeFormComponent],
  imports: [CommonModule, ReactiveFormsModule, FormsModule, SharedMaterialModule, RouterModule],
  exports: [RfpIntakeFormComponent]
})
export class RfpIntakeFormModule {}
