import { Component, OnInit } from '@angular/core';
import { Expense, ExpenseListItem, ExpenseStatus, ExpenseCategory } from 'src/app/models/expense.model';
import { ExpenseApiService } from 'src/app/services/expense-api.service';
import { ExpenseExportService, ExportOptions } from 'src/app/services/expense-export.service';
import { ExpenseImageExportService } from 'src/app/services/expense-image-export.service';
import { ToastrService } from 'ngx-toastr';
import { MatDialog } from '@angular/material/dialog';
import { ExpenseDialogResult, ExpenseReportModalComponent } from '../../modals/expense-report-modal/expense-report-modal.component';
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
  categoryOptions = Object.values(ExpenseCategory);
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
    employee: '',
    category: ''
  };

  constructor(
    private readonly expenseApi: ExpenseApiService,
    private readonly exportService: ExpenseExportService,
    private readonly imageExportService: ExpenseImageExportService,
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
        const list = this.extractItems(res);
        const mapped = list.map((item: ExpenseListItem) => this.toViewModel(item));
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
        const list = this.extractItems(res);
        this.expenses = list.map((item: ExpenseListItem) => this.toViewModel(item));
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
    if (this.currentFilters.category) {
      request.category = this.currentFilters.category as ExpenseCategory;
    }

    return request;
  }

  private hasActiveFilters(filters: ExpenseFilters = this.currentFilters): boolean {
    const hasStart = !!filters.startDate;
    const hasEnd = !!filters.endDate;
    const hasJob = !!filters.job && filters.job.trim().length > 0;
    const hasStatus = !!filters.status;
    const hasCategory = !!filters.category;
    return hasStart || hasEnd || hasJob || hasStatus || hasCategory;
  }

  exportCsv(groupBy: 'employee' | 'job' | 'category' | 'none' = 'none'): void {
    if (!this.filteredExpenses.length) {
      this.toastr.info('No expenses to export');
      return;
    }

    const options: ExportOptions = {
      groupBy,
      includeSubtotals: groupBy !== 'none',
      includeSummary: true,
      title: 'Employee Expenses Report',
      dateRange: this.getDateRangeFromFilters()
    };

    this.exportService.exportToCSV(this.filteredExpenses, options);
    this.toastr.success('CSV export downloaded');
  }

  exportPdf(groupBy: 'employee' | 'job' | 'category' | 'none' = 'none'): void {
    if (!this.filteredExpenses.length) {
      this.toastr.info('No expenses to export');
      return;
    }

    const options: ExportOptions = {
      groupBy,
      includeSubtotals: groupBy !== 'none',
      includeSummary: true,
      title: 'Employee Expenses Report',
      dateRange: this.getDateRangeFromFilters()
    };

    this.exportService.exportToPDF(this.filteredExpenses, options);
    this.toastr.success('PDF export downloaded');
  }

  private getDateRangeFromFilters(): { start: string; end: string } | undefined {
    if (this.currentFilters.startDate && this.currentFilters.endDate) {
      const start = this.currentFilters.startDate instanceof Date 
        ? this.currentFilters.startDate.toISOString().split('T')[0] 
        : this.currentFilters.startDate;
      const end = this.currentFilters.endDate instanceof Date 
        ? this.currentFilters.endDate.toISOString().split('T')[0] 
        : this.currentFilters.endDate;
      return { start, end };
    }
    return undefined;
  }

  exportReceipts(): void {
    if (!this.filteredExpenses.length) {
      this.toastr.info('No expenses to export');
      return;
    }

    const expensesWithReceipts = this.imageExportService.getExpensesWithReceiptsCount(this.filteredExpenses);
    const totalImages = this.imageExportService.getTotalImageCount(this.filteredExpenses);

    if (expensesWithReceipts === 0) {
      this.toastr.info('No expenses with receipts found');
      return;
    }

    // Show confirmation with counts
    this.toastr.info(`Preparing to download ${totalImages} receipt(s) from ${expensesWithReceipts} expense(s)...`, 'Downloading Receipts');

    this.imageExportService.exportExpenseImages(this.filteredExpenses).subscribe({
      next: (result) => {
        if (result.success) {
          const successMsg = `Successfully downloaded ${result.totalImages - result.failedImages} of ${result.totalImages} receipt(s)`;
          if (result.failedImages > 0) {
            this.toastr.warning(`${successMsg}. ${result.failedImages} failed.`, 'Download Complete');
          } else {
            this.toastr.success(successMsg, 'Download Complete');
          }
        } else {
          this.toastr.error('Failed to export receipts. ' + result.errorMessages.join(', '));
        }
      },
      error: (err) => {
        console.error('Error exporting receipts:', err);
        this.toastr.error('An error occurred while exporting receipts');
      }
    });
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

  private extractItems(response: unknown): ExpenseListItem[] {
    if (Array.isArray(response)) {
      return response as ExpenseListItem[];
    }

    const candidates = [response, (response as any)?.data, (response as any)?.result, (response as any)?.results];
    for (const candidate of candidates) {
      if (Array.isArray((candidate as any)?.items)) {
        return ((candidate as any).items as ExpenseListItem[]) ?? [];
      }
    }

    return [];
  }
}
