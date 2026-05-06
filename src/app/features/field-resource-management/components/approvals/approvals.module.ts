import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { SharedMaterialModule } from '../../shared-material.module';
import { ApprovalQueueComponent } from './approval-queue/approval-queue.component';
import { ApprovalDetailComponent } from './approval-detail/approval-detail.component';

const routes: Routes = [
  { path: '', component: ApprovalQueueComponent },
  { path: ':id', component: ApprovalDetailComponent }
];

@NgModule({
  declarations: [ApprovalQueueComponent, ApprovalDetailComponent],
  imports: [CommonModule, ReactiveFormsModule, SharedMaterialModule, RouterModule.forChild(routes)]
})
export class ApprovalsModule {}
