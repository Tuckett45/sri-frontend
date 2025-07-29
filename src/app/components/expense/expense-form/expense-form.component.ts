import { Component, EventEmitter, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { Expense, ExpenseStatus } from 'src/app/models/expense.model';
import { ExpenseApiService } from 'src/app/services/expense-api.service';
import { v4 as uuidv4 } from 'uuid';
import { DeleteConfirmationModalComponent } from '../../modals/delete-confirmation-modal/delete-confirmation-modal.component';
import { ExpenseReportModalComponent } from '../../modals/expense-report-modal/expense-report-modal.component';

@Component({
  selector: 'app-expense-form',
  templateUrl: './expense-form.component.html',
  styleUrls: ['./expense-form.component.scss']
})
export class ExpenseFormComponent {
  expenses: Expense[] = [];
  loading = false;
  isReceiptGalleryVisible = false;
  galleryImages: any[] = [];

  constructor(
    private fb: FormBuilder, 
    private toastr: ToastrService,
    private expenseApi: ExpenseApiService,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.loadExpenses();
  }

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
        this.expenses = res;
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

  openGallery(image: string) {
    this.galleryImages = [{ itemImageSrc: image }];
    this.isReceiptGalleryVisible = true;
  }

  closeImageModal() {
    this.isReceiptGalleryVisible = false;
  }
}
