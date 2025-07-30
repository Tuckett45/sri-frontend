import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ExpenseComponent } from './expense.component';
import { MyExpensesComponent } from './my-expenses/my-expenses.component';

const routes: Routes = [
  { path: '', component: ExpenseComponent },
  { path: 'my', component: MyExpensesComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ExpenseRoutingModule {}
