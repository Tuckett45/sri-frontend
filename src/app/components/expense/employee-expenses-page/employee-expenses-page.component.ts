import { Component, OnInit } from '@angular/core';
import { Expense, ExpenseListItem, ExpenseStatus } from 'src/app/models/expense.model';
import { ExpenseApiService } from 'src/app/services/expense-api.service';
import { ToastrService } from 'ngx-toastr';
import { MatDialog } from '@angular/material/dialog';
import { ExpenseDialogResult, ExpenseReportModalComponent } from '../../modals/expense-report-modal/expense-report-modal.component';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DeleteConfirmationModalComponent } from '../../modals/delete-confirmation-modal/delete-confirmation-modal.component';
import { AuthService } from 'src/app/services/auth.service';
import { ExpenseFilters } from '../shared/expense-filters/expense-filters.component';

type DisplayExpense = Expense & {
  job?: string | null;
  notes?: string | null;
  receiptUrl?: string | null;
  date?: string;
};

@Component({
  selector: 'app-employee-expenses-page',
  templateUrl: './employee-expenses-page.component.html',
  styleUrls: ['./employee-expenses-page.component.scss']
})
export class EmployeeExpensesPageComponent implements OnInit {
  expenses: DisplayExpense[] = [];
  filteredExpenses: DisplayExpense[] = [];
  statusOptions = Object.values(ExpenseStatus);
  loading = false;
  filtersOpen = false;
  private readonly userIdentifier: string | null;

  private currentFilters: ExpenseFilters = {
    startDate: null,
    endDate: null,
    job: '',
    phase: '',
    status: ''
  };

  constructor(
    private readonly expenseApi: ExpenseApiService,
    private readonly toastr: ToastrService,
    private readonly dialog: MatDialog,
    private readonly authService: AuthService
  ) {
    const currentUser = this.authService.getUser();
    this.userIdentifier = currentUser?.id ?? null;
  }

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

    if (!this.userIdentifier) {
      this.toastr.error('Unable to determine current user.');
      this.loading = false;
      return;
    }

    this.expenseApi.getMyExpenses(this.userIdentifier, { includeImages: true, page: 1, pageSize: 200 }).subscribe({
      next: items => {
        const expenseArray = Array.isArray(items) ? items : [items];
        this.expenses = expenseArray.map((item: ExpenseListItem) => this.toViewModel(item));
        console.log('Mapped expenses', this.expenses);
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.toastr.error('Failed to load expenses');
        this.loading = false;
      }
    });
  }

  private toViewModel(item: ExpenseListItem): DisplayExpense {
    console.log('toViewModel input', item);
    const mapped = {...item,
      job: (item as any).job ?? item.projectId ?? '',      
      notes: (item as any).notes ?? (item as any).description ?? item.descriptionNotes ?? '',
      receiptUrl: item.images?.[0]?.blobUrl ?? (item as any).receiptUrl ?? null,
      date: item.date ?? item.createdDate ?? new Date().toISOString()
    } as DisplayExpense;
    console.log('toViewModel', mapped);
    return mapped;
  }

  private applyFilters(): void {
    console.log('applyFilters with filters', this.currentFilters, 'source', this.expenses);
    const { startDate, endDate, job, status } = this.currentFilters;
    this.filteredExpenses = this.expenses.filter(exp => {
      console.log('filtering', exp);  
      const expenseDate = exp.date ? new Date(exp.date) : null;
      const matchesStart = startDate ? (expenseDate ? expenseDate >= new Date(startDate) : false) : true;
      const matchesEnd = endDate ? (expenseDate ? expenseDate <= new Date(endDate) : false) : true;
      const jobSource = exp.job ?? '';
      const matchesJob = job ? jobSource.toLowerCase().includes(job.toLowerCase()) : true;
      const matchesStatus = status ? exp.status === status : true;
      const keep = matchesStart && matchesEnd && matchesJob && matchesStatus;
      console.log('matches', { expenseDate, matchesStart, matchesEnd, matchesJob, matchesStatus, keep });
      return matchesStart && matchesEnd && matchesJob && matchesStatus;
    });
  }

  exportCsv(): void {
    if (!this.filteredExpenses.length) {
      this.toastr.info('No expenses to export');
      return;
    }

    const header = ['Date', 'Job', 'Phase', 'Amount', 'Status', 'Notes'];
    const rows = this.filteredExpenses.map(exp => [
      exp.date ? new Date(exp.date).toLocaleDateString() : '',
      exp.job ?? '',
      exp.phase ?? '',
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
      head: [['Date', 'Job', 'Phase', 'Amount', 'Status']],
      body: this.filteredExpenses.map(e => [
        e.date ? new Date(e.date).toLocaleDateString() : '',
        e.job ?? '',
        e.phase ?? '',  
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

    dialogRef.afterClosed().subscribe((result: ExpenseDialogResult | undefined) => {
      if (result?.expense) {
        this.onExpenseSubmit(result);
      }
    });
  }

  openEditExpense(expense: Expense): void {
    const dialogRef = this.dialog.open(ExpenseReportModalComponent, {
      width: '500px',
      data: expense
    });

    dialogRef.afterClosed().subscribe((result: ExpenseDialogResult | undefined) => {
      if (result?.expense) {
        this.expenseApi.updateExpense(result.expense, result.file ?? undefined, result.receiptData ?? undefined).subscribe({
          next: () => {
            this.toastr.success('Expense updated');
            this.loadExpenses();
          },
          error: () => this.toastr.error('Update failed')
        });
      }
    });
  }

  onExpenseSubmit(result: ExpenseDialogResult): void {
    this.expenseApi.submitExpense(result.expense, result.file ?? undefined, result.receiptData ?? undefined).subscribe({
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




