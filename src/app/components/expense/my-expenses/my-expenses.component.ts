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

@Component({
  selector: 'app-my-expenses',
  templateUrl: './my-expenses.component.html',
  styleUrls: ['./my-expenses.component.scss']
})
export class MyExpensesComponent implements OnInit {
  expenses: Expense[] = [];
  filteredExpenses: Expense[] = [];
  statusOptions = Object.values(ExpenseStatus);

  filterForm = this.fb.group({
    startDate: [null],
    endDate: [null],
    category: [''],
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

  loadExpenses() {
    this.expenseApi.getExpenses().subscribe({
      next: res => {
        this.expenses = res;
        this.applyFilters();
      },
      error: () => this.toastr.error('Failed to load expenses')
    });
  }

  applyFilters() {
    const { startDate, endDate, category, status } = this.filterForm.value;
    this.filteredExpenses = this.expenses.filter(exp => {
      const matchesStart = startDate ? new Date(exp.date) >= new Date(startDate) : true;
      const matchesEnd = endDate ? new Date(exp.date) <= new Date(endDate) : true;
      const matchesCategory = category ? exp.category?.toLowerCase().includes(category.toLowerCase()) : true;
      const matchesStatus = status ? exp.status === status : true;
      return matchesStart && matchesEnd && matchesCategory && matchesStatus;
    });
  }

  exportCsv() {
    this.table.exportCSV();
  }

  exportPdf() {
    const doc = new jsPDF();
    autoTable(doc, {
      head: [['Date', 'Category', 'Amount', 'Status']],
      body: this.filteredExpenses.map(e => [
        new Date(e.date).toLocaleDateString(),
        e.category,
        e.amount.toString(),
        e.status
      ])
    });
    doc.save('expenses.pdf');
  }

  cloneExpense(expense: Expense) {
    const dialogRef = this.dialog.open(ExpenseReportModalComponent, {
      width: '500px',
      data: { ...expense, id: undefined }
    });

    dialogRef.afterClosed().subscribe((cloned: Expense | undefined) => {
      if (cloned) {
        this.expenseApi.submitExpense(cloned).subscribe({
          next: () => {
            this.toastr.success('Expense cloned');
            this.loadExpenses();
          },
          error: () => this.toastr.error('Clone failed')
        });
      }
    });
  }
}
