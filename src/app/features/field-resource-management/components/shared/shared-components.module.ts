import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// Shared Material Module
import { SharedMaterialModule } from '../../shared-material.module';

// Shared Components
import { SkillSelectorComponent } from './skill-selector/skill-selector.component';
import { StatusBadgeComponent } from './status-badge/status-badge.component';
import { FileUploadComponent } from './file-upload/file-upload.component';
import { DateRangePickerComponent } from './date-range-picker/date-range-picker.component';
import { ConfirmDialogComponent } from './confirm-dialog/confirm-dialog.component';
import { LoadingSpinnerComponent } from './loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from './empty-state/empty-state.component';
import { BatchOperationsToolbarComponent } from './batch-operations-toolbar/batch-operations-toolbar.component';
import { BatchStatusDialogComponent } from './batch-status-dialog/batch-status-dialog.component';
import { BatchTechnicianDialogComponent } from './batch-technician-dialog/batch-technician-dialog.component';
import { FrmNavMenuComponent } from './frm-nav-menu/frm-nav-menu.component';
import { BreadcrumbComponent } from './breadcrumb/breadcrumb.component';
import { StartTimeEntryModalComponent } from './start-time-entry-modal/start-time-entry-modal.component';

// Pipes
import { HighlightPipe } from '../../pipes/highlight.pipe';

/**
 * Shared Components Module
 * 
 * Provides reusable components that can be imported by feature modules.
 * This module is designed to be imported (not lazy-loaded) by feature modules
 * that need access to shared UI components.
 */
@NgModule({
  declarations: [
    SkillSelectorComponent,
    StatusBadgeComponent,
    FileUploadComponent,
    DateRangePickerComponent,
    ConfirmDialogComponent,
    LoadingSpinnerComponent,
    EmptyStateComponent,
    BatchOperationsToolbarComponent,
    BatchStatusDialogComponent,
    BatchTechnicianDialogComponent,
    FrmNavMenuComponent,
    BreadcrumbComponent,
    StartTimeEntryModalComponent,
    HighlightPipe
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    SharedMaterialModule
  ],
  exports: [
    SkillSelectorComponent,
    StatusBadgeComponent,
    FileUploadComponent,
    DateRangePickerComponent,
    ConfirmDialogComponent,
    LoadingSpinnerComponent,
    EmptyStateComponent,
    BatchOperationsToolbarComponent,
    BatchStatusDialogComponent,
    BatchTechnicianDialogComponent,
    FrmNavMenuComponent,
    BreadcrumbComponent,
    StartTimeEntryModalComponent,
    HighlightPipe,
    FormsModule,
    RouterModule
  ]
})
export class SharedComponentsModule { }
