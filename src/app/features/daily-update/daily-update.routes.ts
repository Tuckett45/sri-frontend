import { Routes } from '@angular/router';
import { DailyUpdateDashboardComponent } from './components/daily-update-dashboard/daily-update-dashboard.component';
import { DailyUpdateFormComponent } from './components/daily-update-form/daily-update-form.component';
import { DailyUpdateListComponent } from './components/daily-update-list/daily-update-list.component';
import { DailyUpdateReportsComponent } from './components/daily-update-reports/daily-update-reports.component';

export const dailyUpdateRoutes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    component: DailyUpdateDashboardComponent,
    data: { title: 'Daily Update Dashboard' }
  },
  {
    path: 'list',
    component: DailyUpdateListComponent,
    data: { title: 'Daily Updates List' }
  },
  {
    path: 'form',
    component: DailyUpdateFormComponent,
    data: { title: 'Create Daily Update' }
  },
  {
    path: 'form/:id',
    component: DailyUpdateFormComponent,
    data: { title: 'Edit Daily Update' }
  },
  {
    path: 'view/:id',
    component: DailyUpdateFormComponent,
    data: { title: 'View Daily Update', readonly: true }
  },
  {
    path: 'reports',
    component: DailyUpdateReportsComponent,
    data: { title: 'Daily Update Reports' }
  }
];

