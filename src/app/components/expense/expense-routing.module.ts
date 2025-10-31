import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ExpenseComponent } from './expense.component';
import { EmployeeExpensesPageComponent } from './employee-expenses-page/employee-expenses-page.component';
import { HrExpensesPageComponent } from './hr-expenses-page/hr-expenses-page.component';
import { HrDashboardComponent } from './hr-dashboard/hr-dashboard.component';
import { HrRoleGuard } from '../../guards/hr-role.guard';

const routes: Routes = [
  { path: '', component: ExpenseComponent },
  { path: 'employee', component: EmployeeExpensesPageComponent },
  { path: 'hr', component: HrExpensesPageComponent, canActivate: [HrRoleGuard] },
  { path: 'hr-dashboard', component: HrDashboardComponent, canActivate: [HrRoleGuard] },
  { path: 'my', redirectTo: 'employee' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ExpenseRoutingModule {}
