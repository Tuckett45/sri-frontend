import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

import { SharedMaterialModule } from '../../shared-material.module';

import { MaterialsManagerComponent } from './materials-manager/materials-manager.component';
import { PurchaseOrderDialogComponent } from './purchase-order-dialog/purchase-order-dialog.component';

const routes: Routes = [
  {
    path: '',
    component: MaterialsManagerComponent
  }
];

@NgModule({
  declarations: [
    MaterialsManagerComponent,
    PurchaseOrderDialogComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    SharedMaterialModule,
    RouterModule.forChild(routes)
  ],
  exports: [
    MaterialsManagerComponent,
    PurchaseOrderDialogComponent
  ]
})
export class MaterialsModule { }
