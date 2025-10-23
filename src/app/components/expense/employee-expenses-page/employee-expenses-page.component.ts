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
  private filtersInitialized = false;
  private baseExpenses: DisplayExpense[] = [];
  private readonly userIdentifier: string | null;

  private currentFilters: ExpenseFilters = {
    startDate: null,
    endDate: null,
    job: '',
    status: '',
    employee: ''
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
    if (!this.filtersInitialized) {
      this.filtersInitialized = true;
      return;
    }

    if (this.hasActiveFilters(filters)) {
      this.searchExpenses();
    } else {
      this.expenses = [...this.baseExpenses];
      this.filteredExpenses = [...this.baseExpenses];
    }
  }

  toggleFilters(): void {
    this.filtersOpen = !this.filtersOpen;
  }

  loadExpenses(): void {
    const employeeId = this.userIdentifier;
    if (!employeeId) {
      this.toastr.error('Unable to determine current user.');
      return;
    }

    this.loading = true;
    const hasFilters = this.hasActiveFilters();
    const params: Parameters<ExpenseApiService['getExpenses']>[0] = {
      includeImages: true,
      page: 1,
      pageSize: 200,
      createdBy: employeeId
    };

    this.expenseApi.getExpenses(params).subscribe({
      next: res => {
        const items = Array.isArray(res?.items) ? res.items : [];
        const mapped = items.map((item: ExpenseListItem) => this.toViewModel(item));
        this.baseExpenses = mapped;
        if (hasFilters) {
          this.loading = false;
          this.searchExpenses();
        } else {
          this.expenses = [...mapped];
          this.filteredExpenses = [...mapped];
          this.loading = false;
        }
      },
      error: () => {
        this.toastr.error('Failed to load expenses');
        this.loading = false;
      }
    });
  }

  private toViewModel(item: ExpenseListItem): DisplayExpense {
    const mapped = {...item,
      job: (item as any).job ?? item.projectId ?? '',      
      notes: (item as any).notes ?? (item as any).description ?? item.descriptionNotes ?? '',
      receiptUrl: item.images?.[0]?.blobUrl ?? (item as any).receiptUrl ?? null,
      date: item.date ?? item.createdDate ?? new Date().toISOString()
    } as DisplayExpense;
    return mapped;
  }

  private toQueryDate(value: Date | string | null): string | undefined {
    if (!value) return undefined;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return undefined;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  private searchExpenses(): void {
    const employeeId = this.userIdentifier;
    if (!employeeId) return;

    const searchRequest = this.buildSearchRequest(employeeId);
    this.loading = true;
    this.expenseApi.searchExpenses(searchRequest).subscribe({
      next: res => {
        const items = Array.isArray(res?.items) ? res.items : [];
        this.expenses = items.map((item: ExpenseListItem) => this.toViewModel(item));
        this.filteredExpenses = [...this.expenses];
        this.loading = false;
      },
      error: () => {
        this.toastr.error('Failed to load expenses');
        this.loading = false;
      }
    });
  }

  private buildSearchRequest(
    employeeId: string
  ): Parameters<ExpenseApiService['searchExpenses']>[0] {
    const request: Parameters<ExpenseApiService['searchExpenses']>[0] = {
      includeImages: true,
      page: 1,
      pageSize: 200,
      employee: employeeId
    };

    const from = this.toQueryDate(this.currentFilters.startDate);
    const to = this.toQueryDate(this.currentFilters.endDate);
    if (from) request.from = from;
    if (to) request.to = to;

    const jobInput = this.currentFilters.job?.trim();
    if (jobInput) request.job = jobInput;

    if (this.currentFilters.status) {
      request.status = this.currentFilters.status as ExpenseStatus;
    }

    return request;
  }

  private hasActiveFilters(filters: ExpenseFilters = this.currentFilters): boolean {
    const hasStart = !!filters.startDate;
    const hasEnd = !!filters.endDate;
    const hasJob = !!filters.job && filters.job.trim().length > 0;
    const hasStatus = !!filters.status;
    return hasStart || hasEnd || hasJob || hasStatus;
  }

  exportCsv(): void {
    if (!this.filteredExpenses.length) {
      this.toastr.info('No expenses to export');
      return;
    }

    const header = ['Date', 'Job', 'Amount', 'Status', 'Notes'];
    const rows = this.filteredExpenses.map(exp => [
      exp.date ? new Date(exp.date).toLocaleDateString() : '',
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
        e.date ? new Date(e.date).toLocaleDateString() : '',
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




