import { Component, OnInit } from '@angular/core';
import { Expense, ExpenseStatus } from 'src/app/models/expense.model';
import { ExpenseApiService } from 'src/app/services/expense-api.service';
import { ToastrService } from 'ngx-toastr';
import { MatDialog } from '@angular/material/dialog';
import { ExpenseReportModalComponent } from '../../modals/expense-report-modal/expense-report-modal.component';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DeleteConfirmationModalComponent } from '../../modals/delete-confirmation-modal/delete-confirmation-modal.component';
import { ExpenseFilters } from '../shared/expense-filters/expense-filters.component';

@Component({
  selector: 'app-employee-expenses-page',
  templateUrl: './employee-expenses-page.component.html',
  styleUrls: ['./employee-expenses-page.component.scss']
})
export class EmployeeExpensesPageComponent implements OnInit {
  expenses: Expense[] = [];
  filteredExpenses: Expense[] = [];
  statusOptions = Object.values(ExpenseStatus);
  loading = false;
  filtersOpen = true;

  private currentFilters: ExpenseFilters = {
    startDate: null,
    endDate: null,
    job: '',
    status: ''
  };

  constructor(
    private expenseApi: ExpenseApiService,
    private toastr: ToastrService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadExpenses();
  }

  onFiltersChange(filters: ExpenseFilters): void {
    this.currentFilters = filters;
    this.applyFilters();
  }

  toggleFilters(): void {
    this.filtersOpen = !this.filtersOpen;
  }

  loadExpenses(): void {
    this.loading = true;
    this.expenseApi.getMyExpenses().subscribe({
      next: res => {
        this.expenses = res ?? [];
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.toastr.error('Failed to load expenses');
        this.loading = false;
      }
    });
  }

  private applyFilters(): void {
    const { startDate, endDate, job, status } = this.currentFilters;
    this.filteredExpenses = this.expenses.filter(exp => {
      const expenseDate = new Date(exp.date);
      const matchesStart = startDate ? expenseDate >= new Date(startDate) : true;
      const matchesEnd = endDate ? expenseDate <= new Date(endDate) : true;
      const matchesJob = job ? exp.job?.toLowerCase().includes(job.toLowerCase()) : true;
      const matchesStatus = status ? exp.status === status : true;
      return matchesStart && matchesEnd && matchesJob && matchesStatus;
    });
  }

  exportCsv(): void {
    if (!this.filteredExpenses.length) {
      this.toastr.info('No expenses to export');
      return;
    }

    const header = ['Date', 'Job', 'Amount', 'Status', 'Notes'];
    const rows = this.filteredExpenses.map(exp => [
      new Date(exp.date).toLocaleDateString(),
      exp.job ?? '',
      exp.amount?.toString() ?? '',
      exp.status ?? '',
      exp.notes ?? ''
    ]);

    const csvContent = [header, ...rows]
      .map(row => row.map(value => `"${(value ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'expenses.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  exportPdf(): void {
    if (!this.filteredExpenses.length) {
      this.toastr.info('No expenses to export');
      return;
    }

    const doc = new jsPDF();
    autoTable(doc, {
      head: [['Date', 'Job', 'Amount', 'Status']],
      body: this.filteredExpenses.map(e => [
        new Date(e.date).toLocaleDateString(),
        e.job ?? '',
        e.amount?.toString() ?? '',
        e.status ?? ''
      ])
    });
    doc.save('expenses.pdf');
  }

  openAddExpense(): void {
    const dialogRef = this.dialog.open(ExpenseReportModalComponent, {
      width: '500px',
      data: null
    });

    dialogRef.afterClosed().subscribe((expense: Expense | undefined) => {
      if (expense) {
        this.onExpenseSubmit(expense);
      }
    });
  }

  openEditExpense(expense: Expense): void {
    const dialogRef = this.dialog.open(ExpenseReportModalComponent, {
      width: '500px',
      data: expense
    });

    dialogRef.afterClosed().subscribe((updated: Expense | undefined) => {
      if (updated) {
        this.expenseApi.updateExpense(updated).subscribe({
          next: () => {
            this.toastr.success('Expense updated');
            this.loadExpenses();
          },
          error: () => this.toastr.error('Update failed')
        });
      }
    });
  }

  onExpenseSubmit(expense: Expense): void {
    this.expenseApi.submitExpense(expense).subscribe({
      next: () => {
        this.toastr.success('Expense submitted');
        this.loadExpenses();
      },
      error: () => this.toastr.error('Submission failed')
    });
  }

  openDeleteConfirmationDialog(expense: Expense): void {
    const dialogRef = this.dialog.open(DeleteConfirmationModalComponent);

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.deleteExpense(expense);
      }
    });
  }

  deleteExpense(expense: Expense): void {
    if (!expense.id) return;
    this.expenseApi.deleteExpense(expense.id).subscribe({
      next: () => {
        this.toastr.success('Expense deleted');
        this.loadExpenses();
      },
      error: () => this.toastr.error('Deletion failed')
    });
  }
}




