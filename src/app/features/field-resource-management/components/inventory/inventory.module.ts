import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

import { SharedMaterialModule } from '../../shared-material.module';

import { InventoryManagerComponent } from './inventory-manager/inventory-manager.component';
import { InventoryAssignmentDialogComponent } from './inventory-assignment-dialog/inventory-assignment-dialog.component';

const routes: Routes = [
  {
    path: '',
    component: InventoryManagerComponent
  }
];

@NgModule({
  declarations: [
    InventoryManagerComponent,
    InventoryAssignmentDialogComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SharedMaterialModule,
    RouterModule.forChild(routes)
  ],
  exports: [
    InventoryManagerComponent,
    InventoryAssignmentDialogComponent
  ]
})
export class InventoryModule { }
