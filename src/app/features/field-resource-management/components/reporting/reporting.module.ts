import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

// Shared Material Module
import { SharedMaterialModule } from '../../shared-material.module';

// Shared Components Module
import { SharedComponentsModule } from '../shared/shared-components.module';

// Mobile Shared Module (for TimeTrackerComponent without routes)
import { MobileSharedModule } from '../mobile/mobile-shared.module';

// Reporting Components
import { DashboardComponent } from './dashboard/dashboard.component';
import { UtilizationReportComponent } from './utilization-report/utilization-report.component';
import { JobPerformanceReportComponent } from './job-performance-report/job-performance-report.component';
import { KPICardComponent } from './kpi-card/kpi-card.component';
import { TimecardDashboardComponent } from './timecard-dashboard/timecard-dashboard.component';
import { TimecardWeeklyViewComponent } from './timecard-weekly-view/timecard-weekly-view.component';
import { TimecardManagerViewComponent } from './timecard-manager-view/timecard-manager-view.component';
import { CMDashboardComponent } from './cm-dashboard/cm-dashboard.component';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';
import { JobCostReportComponent } from './job-cost-report/job-cost-report.component';
import { BudgetDashboardComponent } from './budget-dashboard/budget-dashboard.component';

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
  },
  {
    path: 'budget-dashboard',
    component: BudgetDashboardComponent,
    data: {
      title: 'Budget Dashboard',
      breadcrumb: 'Budget Dashboard'
    }
  },
  {
    path: 'job-cost/:jobId',
    component: JobCostReportComponent,
    data: {
      title: 'Job Cost Report',
      breadcrumb: 'Job Cost'
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
    TimecardWeeklyViewComponent,
    TimecardManagerViewComponent,
    CMDashboardComponent,
    AdminDashboardComponent,
    JobCostReportComponent,
    BudgetDashboardComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SharedMaterialModule,
    SharedComponentsModule,
    MobileSharedModule,
    RouterModule.forChild(routes)
  ],
  exports: [
    TimecardDashboardComponent,
    TimecardManagerViewComponent,
    CMDashboardComponent,
    AdminDashboardComponent,
    JobCostReportComponent,
    BudgetDashboardComponent
  ]
})
export class ReportingModule { }
