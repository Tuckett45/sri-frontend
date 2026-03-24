import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Guards
import { AdminGuard } from './guards/admin.guard';
import { DispatcherGuard } from './guards/dispatcher.guard';
import { TechnicianGuard } from './guards/technician.guard';
import { PMGuard } from './guards/pm.guard';
import { CMGuard } from '../../guards/cm.guard';
import { ManagerGuard } from './guards/manager.guard';
import { HrGuard } from './guards/hr.guard';
import { PayrollGuard } from './guards/payroll.guard';
import { EnhancedRoleGuard } from '../../guards/enhanced-role.guard';
import { UserRole } from '../../models/role.enum';

// Components - Home Dashboard
import { HomeDashboardComponent } from './components/home/home-dashboard.component';

// Components - Reporting (Analytics Dashboard)
import { DashboardComponent } from './components/reporting/dashboard/dashboard.component';

// Components - Reporting (kept for direct routes)
import { TimecardDashboardComponent } from './components/reporting/timecard-dashboard/timecard-dashboard.component';
import { TimecardManagerViewComponent } from './components/reporting/timecard-manager-view/timecard-manager-view.component';
import { CMDashboardComponent } from './components/reporting/cm-dashboard/cm-dashboard.component';
import { AdminDashboardComponent } from './components/reporting/admin-dashboard/admin-dashboard.component';

// Layout Components
import { FrmLayoutComponent } from './components/layout/frm-layout/frm-layout.component';

/**
 * Field Resource Management Routing Module
 * 
 * Defines lazy-loaded routes for the Field Resource Management feature.
 * All feature areas (technicians, jobs, crews, scheduling, mobile, reporting, admin, mapping)
 * are lazy-loaded to optimize initial bundle size and improve performance.
 * 
 * Routes are protected by role-based guards:
 * - AdminGuard: Admin-only routes
 * - DispatcherGuard: Dispatcher and Admin routes
 * - TechnicianGuard: Technician routes
 * - CMGuard: CM and Admin routes
 * - PMGuard: PM and Vendor routes
 * - EnhancedRoleGuard: Configurable role-based and market-based access control
 * 
 * Requirements: 4.1.6 (Lazy loading for feature modules)
 */
const routes: Routes = [
  {
    path: '',
    component: FrmLayoutComponent,
    children: [
      // Default redirect to dashboard (home page)
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },

      // Dashboard - Home page with quick links and summary
      {
        path: 'dashboard',
        component: HomeDashboardComponent,
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

      // Timecard - All authenticated users
      {
        path: 'timecard',
        component: TimecardDashboardComponent,
        data: { 
          title: 'My Timecard',
          breadcrumb: 'Timecard'
        }
      },

      // Timecard Manager View - Manager, HR, and Admin access
      {
        path: 'timecard-manager',
        component: TimecardManagerViewComponent,
        canActivate: [HrGuard],
        data: { 
          title: 'Timecard Management',
          breadcrumb: 'Timecard Management'
        }
      },

      // Technician Management Routes - Lazy Loaded
      {
        path: 'technicians',
        loadChildren: () => import('./components/technicians/technicians.module').then(m => m.TechniciansModule),
        canActivate: [DispatcherGuard]
      },

      // Job Management Routes - Lazy Loaded
      {
        path: 'jobs',
        loadChildren: () => import('./components/jobs/jobs.module').then(m => m.JobsModule),
        canActivate: [DispatcherGuard]
      },

      // Crew Management Routes - Lazy Loaded
      {
        path: 'crews',
        loadChildren: () => import('./components/crews/crews.module').then(m => m.CrewsModule),
        canActivate: [DispatcherGuard]
      },

      // Scheduling Routes - Lazy Loaded
      {
        path: 'schedule',
        loadChildren: () => import('./components/scheduling/scheduling.module').then(m => m.SchedulingModule),
        canActivate: [DispatcherGuard]
      },

      // Mobile Routes - Lazy Loaded
      {
        path: 'mobile',
        loadChildren: () => import('./components/mobile/mobile.module').then(m => m.MobileModule),
        canActivate: [TechnicianGuard]
      },

      // Reporting Routes - Lazy Loaded
      {
        path: 'reports',
        loadChildren: () => import('./components/reporting/reporting.module').then(m => m.ReportingModule),
        canActivate: [DispatcherGuard]
      },

      // Mapping Routes - Lazy Loaded
      {
        path: 'map',
        loadChildren: () => import('./components/mapping/mapping.module').then(m => m.MappingModule),
        canActivate: [DispatcherGuard]
      },

      // Approval Routes - Lazy Loaded
      {
        path: 'approvals',
        loadChildren: () => import('./components/approvals/approvals.module').then(m => m.ApprovalsModule),
        canActivate: [HrGuard]
      },

      // Payroll Routes - Lazy Loaded
      {
        path: 'payroll',
        loadChildren: () => import('./components/payroll/payroll.module').then(m => m.PayrollModule),
        canActivate: [PayrollGuard]
      },

      // Admin Routes - Lazy Loaded
      {
        path: 'admin',
        loadChildren: () => import('./components/admin/admin.module').then(m => m.AdminModule),
        canActivate: [AdminGuard]
      },

      // Inventory Routes - Lazy Loaded
      {
        path: 'inventory',
        loadChildren: () => import('./components/inventory/inventory.module').then(m => m.InventoryModule),
        canActivate: [DispatcherGuard]
      },

      // Travel Routes - Lazy Loaded
      {
        path: 'travel',
        loadChildren: () => import('./components/travel/travel.module').then(m => m.TravelModule),
        canActivate: [DispatcherGuard]
      },

      // Materials Routes - Lazy Loaded
      {
        path: 'materials',
        loadChildren: () => import('./components/materials/materials.module').then(m => m.MaterialsModule),
        canActivate: [DispatcherGuard]
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FieldResourceManagementRoutingModule { }
