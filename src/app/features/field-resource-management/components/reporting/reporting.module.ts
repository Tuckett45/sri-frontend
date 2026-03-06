import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

// Shared Material Module
import { SharedMaterialModule } from '../../shared-material.module';

// Shared Components Module
import { SharedComponentsModule } from '../shared/shared-components.module';

// Mobile Module (for TimeTrackerComponent)
import { MobileModule } from '../mobile/mobile.module';

// Reporting Components
import { DashboardComponent } from './dashboard/dashboard.component';
import { UtilizationReportComponent } from './utilization-report/utilization-report.component';
import { JobPerformanceReportComponent } from './job-performance-report/job-performance-report.component';
import { KPICardComponent } from './kpi-card/kpi-card.component';
import { TimecardDashboardComponent } from './timecard-dashboard/timecard-dashboard.component';
import { CMDashboardComponent } from './cm-dashboard/cm-dashboard.component';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';

const routes: Routes = [
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
];

/**
 * Reporting Feature Module
 * 
 * Lazy-loaded module for reporting and analytics functionality.
 * Includes dashboards, KPI cards, utilization reports, and performance metrics.
 */
@NgModule({
  declarations: [
    DashboardComponent,
    UtilizationReportComponent,
    JobPerformanceReportComponent,
    KPICardComponent,
    TimecardDashboardComponent,
    CMDashboardComponent,
    AdminDashboardComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SharedMaterialModule,
    SharedComponentsModule,
    MobileModule,
    RouterModule.forChild(routes)
  ],
  exports: [
    TimecardDashboardComponent,
    CMDashboardComponent,
    AdminDashboardComponent
  ]
})
export class ReportingModule { }
