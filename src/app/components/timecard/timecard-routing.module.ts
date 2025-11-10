import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TimeCardComponent } from './timecard.component';
import { HrTimeCardsPageComponent } from './hr-timecards-page/hr-timecards-page.component';
import { EmployeeTimeCardsPageComponent } from './employee-timecards-page/employee-timecards-page.component';
import { TimeCardDashboardComponent } from './timecard-dashboard/timecard-dashboard.component';
import { HrRoleGuard } from 'src/app/guards/hr-role.guard';

const routes: Routes = [
  {
    path: '',
    component: TimeCardComponent,
    children: [
      {
        path: 'hr',
        component: HrTimeCardsPageComponent,
        canActivate: [HrRoleGuard]
      },
      {
        path: 'dashboard',
        component: TimeCardDashboardComponent,
        canActivate: [HrRoleGuard]
      },
      {
        path: 'my',
        component: EmployeeTimeCardsPageComponent
      },
      {
        path: '',
        redirectTo: 'my',
        pathMatch: 'full'
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TimeCardRoutingModule { }

