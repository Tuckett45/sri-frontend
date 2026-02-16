import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

// Shared Material Module
import { SharedMaterialModule } from '../../shared-material.module';

// Admin Components
import { JobTemplateManagerComponent } from './job-template-manager/job-template-manager.component';
import { RegionManagerComponent } from './region-manager/region-manager.component';
import { AuditLogViewerComponent } from './audit-log-viewer/audit-log-viewer.component';
import { SystemConfigurationComponent } from './system-configuration/system-configuration.component';

/**
 * Admin Module
 * 
 * Shared module for admin components with all necessary Material imports.
 * This module isolates admin components to ensure proper Material module availability.
 */
@NgModule({
  declarations: [
    JobTemplateManagerComponent,
    RegionManagerComponent,
    AuditLogViewerComponent,
    SystemConfigurationComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SharedMaterialModule
  ],
  exports: [
    JobTemplateManagerComponent,
    RegionManagerComponent,
    AuditLogViewerComponent,
    SystemConfigurationComponent
  ]
})
export class AdminModule { }
