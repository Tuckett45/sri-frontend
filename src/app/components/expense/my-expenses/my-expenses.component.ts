import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Expense, ExpenseStatus } from 'src/app/models/expense.model';
import { ExpenseApiService } from 'src/app/services/expense-api.service';
import { Table } from 'primeng/table';
import { ToastrService } from 'ngx-toastr';
import { MatDialog } from '@angular/material/dialog';
import { ExpenseReportModalComponent } from '../../modals/expense-report-modal/expense-report-modal.component';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { DeleteConfirmationModalComponent } from '../../modals/delete-confirmation-modal/delete-confirmation-modal.component';

@Component({
  selector: 'app-my-expenses',
  templateUrl: './my-expenses.component.html',
  styleUrls: ['./my-expenses.component.scss']
})
export class MyExpensesComponent implements OnInit {
  expenses: Expense[] = [];
  filteredExpenses: Expense[] = [];
  statusOptions = Object.values(ExpenseStatus);

  displayedColumns: string[] = ['date', 'job', 'amount', 'notes', 'status', 'actions'];
  dataSource = new MatTableDataSource<Expense>(this.filteredExpenses);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  isReceiptGalleryVisible = false;
  galleryImages: any[] = [];

  filterForm = this.fb.group({
    startDate: [null],
    endDate: [null],
    job: [''],
    status: ['']
  });

  @ViewChild('dt') table!: Table;

  constructor(
    private expenseApi: ExpenseApiService,
    private fb: FormBuilder,
    private toastr: ToastrService,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.loadExpenses();
    this.filterForm.valueChanges.subscribe(() => this.applyFilters());
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadExpenses() {
    this.expenseApi.getExpenses().subscribe({
      next: res => {
        this.expenses = res;
        this.dataSource.data = this.expenses;
        this.applyFilters();
      },
      error: () => this.toastr.error('Failed to load expenses')
    });
  }

  applyFilters() {
    const { startDate, endDate, job, status } = this.filterForm.value;
    this.filteredExpenses = this.expenses.filter(exp => {
      const matchesStart = startDate ? new Date(exp.date) >= new Date(startDate) : true;
      const matchesEnd = endDate ? new Date(exp.date) <= new Date(endDate) : true;
      const matchesJob = job ? exp.job?.toLowerCase().includes(job.toLowerCase()) : true;
      const matchesStatus = status ? exp.status === status : true;
      return matchesStart && matchesEnd && matchesJob && matchesStatus;
    });
  }

  exportCsv() {
    this.table.exportCSV();
  }

  exportPdf() {
    const doc = new jsPDF();
    autoTable(doc, {
      head: [['Date', 'Job', 'Amount', 'Status']],
      body: this.filteredExpenses.map(e => [
        new Date(e.date).toLocaleDateString(),
        e.job,
        e.amount.toString(),
        e.status
      ])
    });
    doc.save('expenses.pdf');
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
