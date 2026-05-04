import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

// Shared Material Module
import { SharedMaterialModule } from '../../shared-material.module';

// Shared Components Module
import { SharedComponentsModule } from '../shared/shared-components.module';

// Admin Components
import { JobTemplateManagerComponent } from './job-template-manager/job-template-manager.component';
import { RegionManagerComponent } from './region-manager/region-manager.component';
import { AuditLogViewerComponent } from './audit-log-viewer/audit-log-viewer.component';
import { SystemConfigurationComponent } from './system-configuration/system-configuration.component';
import { UserManagementComponent } from './user-management/user-management.component';
import { ClientConfigListComponent } from './client-config/client-config-list.component';
import { ClientConfigFormComponent } from './client-config/client-config-form.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'configuration',
    pathMatch: 'full'
  },
  {
    path: 'configuration',
    component: SystemConfigurationComponent,
    data: { 
      title: 'System Configuration',
      breadcrumb: 'Configuration'
    }
  },
  {
    path: 'templates',
    component: JobTemplateManagerComponent,
    data: { 
      title: 'Job Templates',
      breadcrumb: 'Templates'
    }
  },
  {
    path: 'regions',
    component: RegionManagerComponent,
    data: { 
      title: 'Region Management',
      breadcrumb: 'Regions'
    }
  },
  {
    path: 'audit-log',
    component: AuditLogViewerComponent,
    data: { 
      title: 'Audit Log',
      breadcrumb: 'Audit Log'
    }
  },
  {
    path: 'users',
    component: UserManagementComponent,
    data: { 
      title: 'User Management',
      breadcrumb: 'Users'
    }
  },
  {
    path: 'client-configurations',
    component: ClientConfigListComponent,
    data: {
      title: 'Client Configurations',
      breadcrumb: 'Client Configurations'
    }
  }
];

/**
 * Admin Feature Module
 * 
 * Lazy-loaded module for admin functionality.
 * Includes system configuration, job templates, region management,
 * audit logs, and user management for Admin users only.
 */
@NgModule({
  declarations: [
    JobTemplateManagerComponent,
    RegionManagerComponent,
    AuditLogViewerComponent,
    SystemConfigurationComponent,
    ClientConfigListComponent,
    ClientConfigFormComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SharedMaterialModule,
    SharedComponentsModule,
    RouterModule.forChild(routes),
    // Import standalone component
    UserManagementComponent
  ],
  exports: [
    JobTemplateManagerComponent,
    RegionManagerComponent,
    AuditLogViewerComponent,
    SystemConfigurationComponent,
    UserManagementComponent,
    ClientConfigListComponent,
    ClientConfigFormComponent
  ]
})
export class AdminModule { }
