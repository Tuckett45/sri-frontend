import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { Expense } from 'src/app/models/expense.model';
import { ExpenseApiService } from 'src/app/services/expense-api.service';
import { DeleteConfirmationModalComponent } from '../../modals/delete-confirmation-modal/delete-confirmation-modal.component';
import { ExpenseReportModalComponent } from '../../modals/expense-report-modal/expense-report-modal.component';

import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';

@Component({
  selector: 'app-expense-form',
  templateUrl: './expense-form.component.html',
  styleUrls: ['./expense-form.component.scss']
})
export class ExpenseFormComponent implements OnInit {
  // Material table
  displayedColumns: string[] = ['date', 'job', 'amount', 'notes', 'receipt', 'status', 'actions'];
  dataSource = new MatTableDataSource<Expense>([]);
  expenses: Expense[] = [];

  loading = false;

  // PrimeNG Galleria state
  isReceiptGalleryVisible = false;
  galleryImages: Array<{ itemImageSrc: string }> = [];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private toastr: ToastrService,
    private expenseApi: ExpenseApiService,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.loadExpenses();
  }

  // ---------- CRUD / dialogs ----------

  openAddExpense() {
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

  openEditExpense(expense: Expense) {
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

  loadExpenses() {
    this.loading = true;
    this.expenseApi.getExpenses().subscribe({
      next: (res) => {
        this.expenses = res ?? [];
        this.dataSource.data = this.expenses;

        // (Re)attach paginator & sort whenever data changes
        if (this.paginator) this.dataSource.paginator = this.paginator;
        if (this.sort) this.dataSource.sort = this.sort;

        this.loading = false;
      },
      error: () => {
        this.toastr.error('Failed to load expenses');
        this.loading = false;
      }
    });
  }

  onExpenseSubmit(expense: Expense) {
    this.expenseApi.submitExpense(expense).subscribe({
      next: () => {
        this.toastr.success('Expense submitted');
        this.loadExpenses();
      },
      error: () => this.toastr.error('Submission failed')
    });
  }

  openDeleteConfirmationDialog(expense: Expense) {
    const dialogRef = this.dialog.open(DeleteConfirmationModalComponent);
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.deleteExpense(expense);
      }
    });
  }

  deleteExpense(expense: Expense) {
    if (!expense.id) return;
    this.expenseApi.deleteExpense(expense.id).subscribe({
      next: () => {
        this.toastr.success('Expense deleted');
        this.loadExpenses();
      },
      error: () => this.toastr.error('Deletion failed')
    });
  }

  // ---------- Receipt helpers ----------

  /** Prefer images[0].blobUrl; fallback to receiptUrl or base64 (prefix if needed). */
  getReceiptUrl(exp: Expense): string | null {
    const blobUrl = (exp as any)?.images?.[0]?.blobUrl as string | undefined;
    if (blobUrl) return blobUrl;

    const url = (exp as any)?.receiptUrl as string | undefined;
    if (!url) return null;

    // already an http(s) or data URL
    if (/^(https?:)?\/\//i.test(url) || /^data:/i.test(url)) return url;

    // if it looks like base64, prefix to a data URL
    const looksBase64 = /^[A-Za-z0-9+/=\s]+$/.test(url);
    return looksBase64 ? `data:image/jpeg;base64,${url.replace(/\s+/g, '')}` : url;
  }

  openGallery(expense: Expense) {
    const url = this.getReceiptUrl(expense);
    if (!url) return;
    this.galleryImages = [{ itemImageSrc: url }];
    this.isReceiptGalleryVisible = true;
  }

  openInNewTab(expense: Expense) {
    const url = this.getReceiptUrl(expense);
    if (!url) return;
    window.open(url, '_blank', 'noopener');
  }

  closeImageModal() {
    this.isReceiptGalleryVisible = false;
  }
}
