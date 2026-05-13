import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

// Shared Material Module
import { SharedMaterialModule } from '../../shared-material.module';

// Shared Components Module
import { SharedComponentsModule } from '../shared/shared-components.module';

// Approval Components (standalone)
import { ApprovalQueueComponent } from './approval-queue/approval-queue.component';
import { ApprovalDetailComponent } from './approval-detail/approval-detail.component';

const routes: Routes = [
  {
    path: '',
    component: ApprovalQueueComponent,
    data: { 
      title: 'Approval Queue',
      breadcrumb: 'Approvals'
    }
  },
  {
    path: ':id',
    component: ApprovalDetailComponent,
    data: { 
      title: 'Approval Details',
      breadcrumb: 'Details'
    }
  }
];

/**
 * Approvals Feature Module
 * 
 * Lazy-loaded module for approval workflow functionality.
 * Includes approval queue and detail views for CM and Admin users.
 */
@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SharedMaterialModule,
    SharedComponentsModule,
    RouterModule.forChild(routes),
    // Import standalone components
    ApprovalQueueComponent,
    ApprovalDetailComponent
  ]
})
export class ApprovalsModule { }
