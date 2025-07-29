import { Component, OnInit } from '@angular/core';
import { ExpenseApiService } from 'src/app/services/expense-api.service';
import { Expense } from 'src/app/models/expense.model';
import { ToastrService } from 'ngx-toastr';
import { MatDialog } from '@angular/material/dialog';
import { ExpenseReportModalComponent } from '../modals/expense-report-modal/expense-report-modal.component';
import { DeleteConfirmationModalComponent } from '../modals/delete-confirmation-modal/delete-confirmation-modal.component';

@Component({
  selector: 'app-expense',
  templateUrl: './expense.component.html',
  styleUrls: ['./expense.component.scss']
})
export class ExpenseComponent implements OnInit {
  expenses: Expense[] = [];
  loading = false;
  isReceiptGalleryVisible = false;
  galleryImages: any[] = [];
  activeTab = 0;

  constructor(
    private expenseApi: ExpenseApiService,
    private toastr: ToastrService,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    // this.loadExpenses();
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
}
