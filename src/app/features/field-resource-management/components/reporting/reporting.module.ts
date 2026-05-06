import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { SharedMaterialModule } from '../../shared-material.module';
import { SharedComponentsModule } from '../shared/shared-components.module';
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
import { TimeEntryDialogComponent } from './time-entry-dialog/time-entry-dialog.component';

const routes: Routes = [
  { path: 'dashboard', component: DashboardComponent },
  { path: 'utilization', component: UtilizationReportComponent },
  { path: 'performance', component: JobPerformanceReportComponent },
  { path: 'budget-dashboard', component: BudgetDashboardComponent },
  { path: 'job-cost/:jobId', component: JobCostReportComponent },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
];

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
    BudgetDashboardComponent,
    TimeEntryDialogComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedMaterialModule,
    SharedComponentsModule,
    RouterModule.forChild(routes)
  ],
  exports: [
    TimecardDashboardComponent,
    TimecardManagerViewComponent,
    CMDashboardComponent,
    AdminDashboardComponent,
    KPICardComponent
  ]
})
export class ReportingModule {}
