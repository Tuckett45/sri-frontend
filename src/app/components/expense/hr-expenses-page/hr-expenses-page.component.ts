import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { ToastrService } from 'ngx-toastr';
import { Expense, ExpenseListItem, ExpenseListResponse, ExpenseStatus, ExpenseCategory } from 'src/app/models/expense.model';
import { ExpenseApiService } from '../../../services/expense-api.service';
import { ExpenseExportService, ExportOptions } from 'src/app/services/expense-export.service';
import { ExpenseImageExportService } from '../../../services/expense-image-export.service';
import { Inject } from '@angular/core';
import { ExpenseDialogResult, ExpenseReportModalComponent } from '../../modals/expense-report-modal/expense-report-modal.component';
import { ExpenseFilters } from '../shared/expense-filters/expense-filters.component';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { ExpenseStateService } from '../services/expense-state.service';

type DisplayExpense = Expense & {
  job?: string | null;
  notes?: string | null;
  receiptUrl?: string | null;
  date?: string;
};

@Component({
  selector: 'app-hr-expenses-page',
  templateUrl: './hr-expenses-page.component.html',
  styleUrls: ['./hr-expenses-page.component.scss']
})
export class HrExpensesPageComponent implements OnInit {
  expenses: DisplayExpense[] = [];
  totalItems = 0;
  pageIndex = 0;
  pageSize = 10;
  pageSizeOptions: number[] = [10, 25, 50];
  statusOptions = Object.values(ExpenseStatus);
  categoryOptions = Object.values(ExpenseCategory);
  loading = false;
  filtersOpen = false;
  readonly statusUpdatingIds = new Set<string>();
  private filtersInitialized = false;
  private isUsingFilters = false;
  private currentFilters: ExpenseFilters = {
    startDate: null,
    endDate: null,
    job: '',
    employee: '',
    status: '',
    category: ''
  };
  constructor(
    @Inject(ExpenseApiService) private expenseApi: ExpenseApiService,
    private exportService: ExpenseExportService,
    private imageExportService: ExpenseImageExportService,
    private toastr: ToastrService,
    private dialog: MatDialog,
    private readonly expenseState: ExpenseStateService
  ) {}

  ngOnInit(): void {
    this.loadExpenses();
  }

  onFiltersChange(filters: ExpenseFilters): void {
    this.currentFilters = filters;
    const useSearch = this.hasActiveFilters(filters);
    this.isUsingFilters = useSearch;

    if (!this.filtersInitialized) {
      this.filtersInitialized = true;
      if (useSearch) {
        this.searchExpenses(0, this.pageSize);
      }
      return;
    }

    this.pageIndex = 0;
    if (useSearch) {
      this.searchExpenses(0, this.pageSize);
    } else {
      this.loadExpenses(0, this.pageSize);
    }
  }

  toggleFilters(): void {
    this.filtersOpen = !this.filtersOpen;
  }

  onPageChange(event: PageEvent): void {
    if (this.isUsingFilters) {
      this.searchExpenses(event.pageIndex, event.pageSize);
    } else {
      this.loadExpenses(event.pageIndex, event.pageSize);
    }
  }

  loadExpenses(pageIndex: number = this.pageIndex, pageSize: number = this.pageSize): void {
    this.pageIndex = pageIndex;
    this.pageSize = pageSize;

    this.loading = true;
    const params: Parameters<ExpenseApiService['getExpenses']>[0] = {
      includeImages: true,
      page: pageIndex + 1,
      pageSize
    };

    this.expenseApi.getExpenses(params).subscribe({
      next: res => {
        if (this.isUsingFilters) {
          this.loading = false;
          this.searchExpenses(this.pageIndex, this.pageSize);
        } else {
          this.handleResponse(res, pageIndex, pageSize, false);
        }
      },
      error: () => {
        this.toastr.error('Failed to load team expenses');
        this.loading = false;
      }
    });
  }

  private searchExpenses(pageIndex: number, pageSize: number): void {
    const request = this.buildSearchRequest(pageIndex, pageSize);
    this.loading = true;
    this.pageIndex = pageIndex;
    this.pageSize = pageSize;

    this.expenseApi.searchExpenses(request).subscribe({
      next: res => this.handleResponse(res, pageIndex, pageSize, true),
      error: () => {
        this.toastr.error('Failed to load team expenses');
        this.loading = false;
      }
    });
  }

  private buildSearchRequest(
    pageIndex: number,
    pageSize: number
  ): Parameters<ExpenseApiService['searchExpenses']>[0] {
    const request: Parameters<ExpenseApiService['searchExpenses']>[0] = {
      includeImages: true,
      page: pageIndex + 1,
      pageSize
    };

    const from = this.toQueryDate(this.currentFilters.startDate);
    const to = this.toQueryDate(this.currentFilters.endDate);
    if (from) request.from = from;
    if (to) request.to = to;
    if (this.currentFilters.status) {
      request.status = this.currentFilters.status as ExpenseStatus;
    }
    const jobInput = this.currentFilters.job?.trim();
    if (jobInput) {
      request.job = jobInput;
    }
    const employeeInput = this.currentFilters.employee?.trim();
    if (employeeInput) {
      request.employee = employeeInput;
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
    const hasEmployee = !!filters.employee && filters.employee.trim().length > 0;
    const hasStatus = !!filters.status;
    const hasCategory = !!filters.category;
    return hasStart || hasEnd || hasJob || hasEmployee || hasStatus || hasCategory;
  }

  private handleResponse(
    res: ExpenseListResponse | ExpenseListItem[] | null | undefined,
    pageIndex: number,
    pageSize: number,
    fromSearch: boolean
  ): void {
    const response = this.normalizeResponse(res, pageIndex, pageSize);
    const items = response.items ?? [];

    if (!items.length && (response.page ?? 1) > 1) {
      const prevIndex = Math.max(pageIndex - 1, 0);
      if (prevIndex !== pageIndex) {
        if (fromSearch) {
          this.searchExpenses(prevIndex, pageSize);
        } else {
          this.loadExpenses(prevIndex, pageSize);
        }
        return;
      }
    }

    this.expenseState.setHrExpenses(items);

    this.totalItems = this.resolveTotal(response, items.length);
    this.expenses = items.map(item => this.toViewModel(item));
    this.loading = false;
  }

  private toViewModel(item: ExpenseListItem): DisplayExpense {
    const mapped = {
      ...item,
      projectId: item.projectId ?? (item as any).job ?? '',
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

  private normalizeResponse(
    res: ExpenseListResponse | ExpenseListItem[] | null | undefined,
    fallbackPageIndex: number,
    fallbackPageSize: number
  ): ExpenseListResponse {
    const fallback: ExpenseListResponse = {
      page: fallbackPageIndex + 1,
      pageSize: fallbackPageSize,
      items: []
    };

    if (!res) {
      return fallback;
    }

    if (Array.isArray(res)) {
      return { ...fallback, items: res };
    }

    const page = this.toNumber(res.page, fallback.page);
    const pageSize = this.toNumber(res.pageSize, fallback.pageSize);
    const totalValue = this.toNumber(res.total, undefined);
    const total = Number.isFinite(totalValue) ? totalValue : undefined;
    const items = Array.isArray(res.items) ? res.items : fallback.items;

    return {
      page,
      pageSize,
      items,
      total
    };
  }

  private resolveTotal(res: ExpenseListResponse, itemCount: number): number {
    if (Number.isFinite(res.total)) {
      return res.total as number;
    }

    const page = this.toNumber(res.page, 1);
    const pageSize = this.toNumber(res.pageSize, itemCount || this.pageSize);

    const baseCount = (page - 1) * pageSize + itemCount;
    return itemCount >= pageSize ? baseCount + 1 : baseCount;
  }

  private toNumber(value: unknown, fallback: number | undefined): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        return fallback ?? NaN;
      }
      const coerced = Number(trimmed);
      if (Number.isFinite(coerced)) {
        return coerced;
      }
    }

    return fallback ?? NaN;
  }

  exportCsv(groupBy: 'employee' | 'job' | 'category' | 'none' = 'none'): void {
    const exportExpenses = this.resolveExpensesForExport(groupBy);
    if (!exportExpenses) {
      return;
    }

    const options: ExportOptions = {
      groupBy,
      includeSubtotals: groupBy !== 'none',
      includeSummary: true,
      title: 'Team Expenses Report (HR)',
      dateRange: this.getDateRangeFromFilters()
    };

    this.exportService.exportToCSV(exportExpenses, options);
    this.toastr.success('CSV export downloaded');
  }

  exportPdf(groupBy: 'employee' | 'job' | 'category' | 'none' = 'none'): void {
    const exportExpenses = this.resolveExpensesForExport(groupBy);
    if (!exportExpenses) {
      return;
    }

    const options: ExportOptions = {
      groupBy,
      includeSubtotals: groupBy !== 'none',
      includeSummary: true,
      title: 'Team Expenses Report (HR)',
      dateRange: this.getDateRangeFromFilters()
    };

    this.exportService.exportToPDF(exportExpenses, options);
    this.toastr.success('PDF export downloaded');
  }

  private resolveExpensesForExport(
    groupBy: 'employee' | 'job' | 'category' | 'none'
  ): DisplayExpense[] | null {
    if (!this.expenses.length) {
      this.toastr.info('No expenses to export');
      return null;
    }

    if (groupBy !== 'employee') {
      return this.expenses;
    }

    const selectedEmployee = this.currentFilters.employee?.trim();
    if (!selectedEmployee) {
      this.toastr.warning('Select an employee before exporting by employee.');
      this.filtersOpen = true;
      return null;
    }

    const normalized = selectedEmployee.toLowerCase();
    const employeeExpenses = this.expenses.filter(expense => (expense.createdBy ?? '').toLowerCase() === normalized);

    if (!employeeExpenses.length) {
      this.toastr.info(`No expenses found for ${selectedEmployee} on the current page.`);
      return null;
    }

    return employeeExpenses;
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
    if (!this.expenses.length) {
      this.toastr.info('No expenses to export');
      return;
    }

    const expensesWithReceipts = this.imageExportService.getExpensesWithReceiptsCount(this.expenses);
    const totalImages = this.imageExportService.getTotalImageCount(this.expenses);

    if (expensesWithReceipts === 0) {
      this.toastr.info('No expenses with receipts found');
      return;
    }

    // Show confirmation with counts
    this.toastr.info(`Preparing to download ${totalImages} receipt(s) from ${expensesWithReceipts} expense(s)...`, 'Downloading Receipts');

    this.imageExportService.exportExpenseImages(this.expenses).subscribe({
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

  openExpenseDetails(expense: Expense): void {
    const dialogRef = this.dialog.open(ExpenseReportModalComponent, {
      width: '500px',
      data: expense,
      disableClose: true
    });

    dialogRef.afterClosed().subscribe((result: ExpenseDialogResult | undefined) => {
      if (result?.expense) {
        const existingImageIds = (expense.images ?? []).map(img => img.id).filter((id): id is string => !!id);
        const needsCleanup = !!result.file && existingImageIds.length > 0;

        const removeImages$ = needsCleanup
          ? forkJoin(existingImageIds.map(id => this.expenseApi.removeImage(id))).pipe(
              catchError(err => {
                console.warn('Failed to remove existing expense images before update', err);
                this.toastr.warning('Could not remove existing receipt before uploading a new one.');
                return of(null);
              })
            )
          : of(null);

        removeImages$
          .pipe(
            switchMap(() =>
              this.expenseApi.updateExpense(result.expense, result.file ?? undefined, result.receiptData ?? undefined)
            )
          )
          .subscribe({
            next: () => {
              this.toastr.success('Expense updated');
              this.loadExpenses(this.pageIndex, this.pageSize);
            },
            error: () => this.toastr.error('Update failed')
          });
      }
    });
  }

  onApprove(expense: Expense): void {
    this.updateStatus(expense, ExpenseStatus.Approved);
  }

  onReject(expense: Expense): void {
    this.updateStatus(expense, ExpenseStatus.Rejected);
  }

  private updateStatus(expense: Expense, status: ExpenseStatus): void {
    if (!expense.id) {
      this.toastr.error('Expense is missing an identifier');
      return;
    }

    this.statusUpdatingIds.add(expense.id);
    const updated: Expense = { ...expense, status };

    this.expenseApi.updateExpense(updated).subscribe({
      next: () => {
        this.toastr.success(`Expense ${status.toLowerCase()}`);
        if (expense.id) this.statusUpdatingIds.delete(expense.id);
        this.loadExpenses(this.pageIndex, this.pageSize);
      },
      error: () => {
        this.toastr.error('Failed to update expense status');
        if (expense.id) this.statusUpdatingIds.delete(expense.id);
      }
    });
  }
}
