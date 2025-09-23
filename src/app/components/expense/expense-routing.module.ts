import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ExpenseComponent } from './expense.component';
import { EmployeeExpensesPageComponent } from './employee-expenses-page/employee-expenses-page.component';
import { HrExpensesPageComponent } from './hr-expenses-page/hr-expenses-page.component';

const routes: Routes = [
  { path: '', component: ExpenseComponent },
  { path: 'employee', component: EmployeeExpensesPageComponent },
  { path: 'hr', component: HrExpensesPageComponent },
  { path: 'my', redirectTo: 'employee' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ExpenseRoutingModule {}
