import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { SharedMaterialModule } from '../../shared-material.module';

import { BudgetViewComponent } from './budget-view/budget-view.component';
import { BudgetAdjustmentDialogComponent } from './budget-adjustment-dialog/budget-adjustment-dialog.component';

@NgModule({
  declarations: [
    BudgetViewComponent,
    BudgetAdjustmentDialogComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SharedMaterialModule
  ],
  exports: [
    BudgetViewComponent,
    BudgetAdjustmentDialogComponent
  ]
})
export class BudgetModule { }
