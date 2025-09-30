import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Expense, ExpenseListItem, ExpenseStatus } from 'src/app/models/expense.model';
import { ExpenseApiService } from 'src/app/services/expense-api.service';
import { ExpenseDialogResult, ExpenseReportModalComponent } from '../../modals/expense-report-modal/expense-report-modal.component';
import { ExpenseFilters } from '../shared/expense-filters/expense-filters.component';

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
  filteredExpenses: DisplayExpense[] = [];
  statusOptions = Object.values(ExpenseStatus);
  loading = false;
  filtersOpen = false;
  readonly statusUpdatingIds = new Set<string>();
  private currentFilters: ExpenseFilters = {
    startDate: null,
    endDate: null,
    job: '',
    phase: '',
    status: 'Pending'
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
    this.expenseApi.getTeamExpenses().subscribe({
      next: res => {
        const expenseArray = Array.isArray(res) ? res : [res];
        this.expenses = expenseArray.map((item: ExpenseListItem) => this.toViewModel(item));
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.toastr.error('Failed to load team expenses');
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

  exportCsv(): void {
    if (!this.filteredExpenses.length) {
      this.toastr.info('No expenses to export');
      return;
    }

    const header = ['Employee', 'Date', 'Job', 'Phase', 'Amount', 'Status', 'Notes'];
    const rows = this.filteredExpenses.map(exp => [
      exp.createdBy ?? '',
      new Date(exp.date).toLocaleDateString(),
      exp.projectId ?? '',
      exp.phase ?? '',
      exp.amount?.toString() ?? '',
      exp.status ?? '',
      exp.descriptionNotes ?? ''
    ]);

    const csvContent = [header, ...rows]
      .map(row => row.map(value => `"${(value ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'team-expenses.csv');
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
      head: [['Employee', 'Date', 'Job', 'Phase', 'Amount', 'Status']],
      body: this.filteredExpenses.map(e => [
        e.createdBy ?? '',
        new Date(e.date).toLocaleDateString(),
        e.projectId ?? '',
        e.phase ?? '',
        e.amount?.toString() ?? '',
        e.status ?? ''
      ])
    });
    doc.save('team-expenses.pdf');
  }

  openExpenseDetails(expense: Expense): void {
    const dialogRef = this.dialog.open(ExpenseReportModalComponent, {
      width: '500px',
      data: expense,
      disableClose: true
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
      next: (saved) => {
        this.toastr.success(`Expense ${status.toLowerCase()}`);
        const target = this.expenses.find(e => e.id === expense.id);
        if (target) target.status = saved.status ?? status; // sync UI
        this.applyFilters();
        if (expense.id) this.statusUpdatingIds.delete(expense.id);
      },
      error: () => {
        this.toastr.error('Failed to update expense status');
        if (expense.id) this.statusUpdatingIds.delete(expense.id);
      }
    });
  }

  private applyFilters(): void {
    const { startDate, endDate, job, status } = this.currentFilters;
    this.filteredExpenses = this.expenses.filter(exp => {
      const expenseDate = new Date(exp.date);
      const matchesStart = startDate ? expenseDate >= new Date(startDate) : true;
      const matchesEnd = endDate ? expenseDate <= new Date(endDate) : true;
      const matchesJob = job ? exp.projectId?.toLowerCase().includes(job.toLowerCase()) : true;
      const matchesStatus = status ? (exp.status === status) : true;
      return matchesStart && matchesEnd && matchesJob && matchesStatus;
    });
  }
}
















