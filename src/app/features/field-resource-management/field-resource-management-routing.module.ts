import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Guards
import { AdminGuard } from './guards/admin.guard';
import { DispatcherGuard } from './guards/dispatcher.guard';
import { TechnicianGuard } from './guards/technician.guard';
import { CMGuard } from '../../guards/cm.guard';
import { EnhancedRoleGuard } from '../../guards/enhanced-role.guard';
import { UserRole } from '../../models/role.enum';

// Components - Dashboard
import { DashboardComponent } from './components/reporting/dashboard/dashboard.component';

// Components - Technicians
import { TechnicianListComponent } from './components/technicians/technician-list/technician-list.component';
import { TechnicianDetailComponent } from './components/technicians/technician-detail/technician-detail.component';
import { TechnicianFormComponent } from './components/technicians/technician-form/technician-form.component';

// Components - Jobs
import { JobListComponent } from './components/jobs/job-list/job-list.component';
import { JobDetailComponent } from './components/jobs/job-detail/job-detail.component';
import { JobFormComponent } from './components/jobs/job-form/job-form.component';

// Components - Scheduling
import { CalendarViewComponent } from './components/scheduling/calendar-view/calendar-view.component';
import { ConflictResolverComponent } from './components/scheduling/conflict-resolver/conflict-resolver.component';
import { TechnicianScheduleComponent } from './components/scheduling/technician-schedule/technician-schedule.component';

// Components - Mobile
import { DailyViewComponent } from './components/mobile/daily-view/daily-view.component';

// Components - Reporting
import { UtilizationReportComponent } from './components/reporting/utilization-report/utilization-report.component';
import { JobPerformanceReportComponent } from './components/reporting/job-performance-report/job-performance-report.component';
import { TimecardDashboardComponent } from './components/reporting/timecard-dashboard/timecard-dashboard.component';
import { CMDashboardComponent } from './components/reporting/cm-dashboard/cm-dashboard.component';
import { AdminDashboardComponent } from './components/reporting/admin-dashboard/admin-dashboard.component';

// Components - Admin
import { AuditLogViewerComponent } from './components/admin/audit-log-viewer/audit-log-viewer.component';
import { SystemConfigurationComponent } from './components/admin/system-configuration/system-configuration.component';
import { JobTemplateManagerComponent } from './components/admin/job-template-manager/job-template-manager.component';
import { RegionManagerComponent } from './components/admin/region-manager/region-manager.component';

// Components - Approvals
import { ApprovalQueueComponent } from './components/approvals/approval-queue/approval-queue.component';
import { ApprovalDetailComponent } from './components/approvals/approval-detail/approval-detail.component';

// Components - User Management
import { UserManagementComponent } from './components/admin/user-management/user-management.component';

/**
 * Field Resource Management Routing Module
 * 
 * Defines lazy-loaded routes for the Field Resource Management feature.
 * Routes are protected by role-based guards:
 * - AdminGuard: Admin-only routes
 * - DispatcherGuard: Dispatcher and Admin routes
 * - TechnicianGuard: Technician routes
 * - CMGuard: CM and Admin routes
 * - EnhancedRoleGuard: Configurable role-based and market-based access control
 * 
 * Route Structure:
 * - /field-resource-management/dashboard - Dashboard overview (All authenticated)
 * - /field-resource-management/cm/dashboard - CM Dashboard (CM and Admin)
 * - /field-resource-management/admin/dashboard - Admin Dashboard (Admin only)
 * - /field-resource-management/technicians - Technician management (Dispatcher)
 * - /field-resource-management/jobs - Job management (Dispatcher)
 * - /field-resource-management/schedule - Calendar scheduling (Dispatcher)
 * - /field-resource-management/mobile/daily - Mobile daily view (Technician)
 * - /field-resource-management/reports - Reporting (Dispatcher)
 * - /field-resource-management/admin - Admin settings (Admin)
 * 
 * Requirements: 3.7, 4.7, 15.1, 15.2
 */
const routes: Routes = [
  // Default redirect to dashboard
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },

  // Dashboard - All authenticated users
  {
    path: 'dashboard',
    component: DashboardComponent,
    data: { 
      title: 'Dashboard',
      breadcrumb: 'Dashboard'
    }
  },

  // CM Dashboard - CM and Admin access
  {
    path: 'cm',
    children: [
      {
        path: 'dashboard',
        component: CMDashboardComponent,
        canActivate: [CMGuard],
        data: { 
          title: 'CM Dashboard',
          breadcrumb: 'CM Dashboard'
        }
      }
    ]
  },

  // Admin Dashboard - Admin only
  {
    path: 'admin-dashboard',
    component: AdminDashboardComponent,
    canActivate: [EnhancedRoleGuard],
    data: { 
      title: 'Admin Dashboard',
      breadcrumb: 'Admin Dashboard',
      roleGuard: {
        allowedRoles: [UserRole.Admin]
      }
    }
  },

  // Timecard - All authenticated users (technicians and dispatchers)
  {
    path: 'timecard',
    component: TimecardDashboardComponent,
    data: { 
      title: 'My Timecard',
      breadcrumb: 'Timecard'
    }
  },

  // Technician Management Routes - Dispatcher access with market validation
  {
    path: 'technicians',
    canActivate: [DispatcherGuard],
    children: [
      {
        path: '',
        component: TechnicianListComponent,
        data: { 
          title: 'Technicians',
          breadcrumb: 'Technicians'
        }
      },
      {
        path: 'new',
        component: TechnicianFormComponent,
        data: { 
          title: 'New Technician',
          breadcrumb: 'New'
        }
      },
      {
        path: ':id',
        component: TechnicianDetailComponent,
        data: { 
          title: 'Technician Detail',
          breadcrumb: 'Detail'
        }
      },
      {
        path: ':id/edit',
        component: TechnicianFormComponent,
        data: { 
          title: 'Edit Technician',
          breadcrumb: 'Edit'
        }
      }
    ]
  },

  // Job Management Routes - Dispatcher access with market validation
  {
    path: 'jobs',
    canActivate: [DispatcherGuard],
    children: [
      {
        path: '',
        component: JobListComponent,
        data: { 
          title: 'Jobs',
          breadcrumb: 'Jobs'
        }
      },
      {
        path: 'new',
        component: JobFormComponent,
        data: { 
          title: 'New Job',
          breadcrumb: 'New'
        }
      },
      {
        path: ':id',
        component: JobDetailComponent,
        data: { 
          title: 'Job Detail',
          breadcrumb: 'Detail'
        }
      },
      {
        path: ':id/edit',
        component: JobFormComponent,
        data: { 
          title: 'Edit Job',
          breadcrumb: 'Edit'
        }
      }
    ]
  },

  // Scheduling Routes - Dispatcher access with market validation for resource routes
  {
    path: 'schedule',
    canActivate: [DispatcherGuard],
    children: [
      {
        path: '',
        component: CalendarViewComponent,
        data: { 
          title: 'Schedule',
          breadcrumb: 'Schedule'
        }
      },
      {
        path: 'conflicts',
        component: ConflictResolverComponent,
        data: { 
          title: 'Resolve Conflicts',
          breadcrumb: 'Conflicts'
        }
      },
      {
        path: 'technician/:id',
        component: TechnicianScheduleComponent,
        data: { 
          title: 'Technician Schedule',
          breadcrumb: 'Technician Schedule'
        }
      }
    ]
  },

  // Mobile Routes - Technician access
  {
    path: 'mobile',
    canActivate: [TechnicianGuard],
    children: [
      {
        path: '',
        redirectTo: 'daily',
        pathMatch: 'full'
      },
      {
        path: 'daily',
        component: DailyViewComponent,
        data: { 
          title: 'My Daily Schedule',
          breadcrumb: 'Daily View'
        }
      }
    ]
  },

  // Reporting Routes - Dispatcher access
  {
    path: 'reports',
    canActivate: [DispatcherGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        component: DashboardComponent,
        data: { 
          title: 'Reports Dashboard',
          breadcrumb: 'Dashboard'
        }
      },
      {
        path: 'utilization',
        component: UtilizationReportComponent,
        data: { 
          title: 'Utilization Report',
          breadcrumb: 'Utilization'
        }
      },
      {
        path: 'performance',
        component: JobPerformanceReportComponent,
        data: { 
          title: 'Job Performance Report',
          breadcrumb: 'Performance'
        }
      }
    ]
  },

  // Approval Routes - CM and Admin access
  {
    path: 'approvals',
    canActivate: [CMGuard],
    children: [
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
    ]
  },

  // Admin Routes - Admin access only
  {
    path: 'admin',
    canActivate: [AdminGuard],
    children: [
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
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FieldResourceManagementRoutingModule { }
