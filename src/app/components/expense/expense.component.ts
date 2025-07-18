import { Component, OnInit } from '@angular/core';
import { ExpenseApiService } from 'src/app/services/expense-api.service';
import { Expense } from 'src/app/models/expense.model';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-expense',
  templateUrl: './expense.component.html',
  styleUrls: ['./expense.component.scss']
})
export class ExpenseComponent implements OnInit {
  expenses: Expense[] = [];
  loading = false;

  constructor(
    private expenseApi: ExpenseApiService,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.loadExpenses();
  }

  loadExpenses() {
    this.loading = true;
    this.expenseApi.getMyExpenses().subscribe({
      next: (res) => {
        this.expenses = res;
        this.loading = false;
      },
      error: () => {
        this.toastr.error('Failed to load expenses');
        this.loading = false;
      }
    });
  }

  onExpenseSubmit(formData: FormData) {
    this.expenseApi.submitExpense(formData).subscribe({
      next: () => {
        this.toastr.success('Expense submitted');
        this.loadExpenses();
      },
      error: () => this.toastr.error('Submission failed')
    });
  }
}
