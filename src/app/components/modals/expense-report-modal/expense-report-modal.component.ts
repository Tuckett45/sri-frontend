import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Expense, ExpenseStatus } from 'src/app/models/expense.model';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-expense-report-modal',
  templateUrl: './expense-report-modal.component.html',
  styleUrls: ['./expense-report-modal.component.scss'],
  standalone: false
})
export class ExpenseReportModalComponent {
  expenseForm: FormGroup;
  receiptFile?: File;
  receiptBase64?: string;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ExpenseReportModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Partial<Expense> | null
  ) {
    this.expenseForm = this.fb.group({
      date: [data?.date || new Date(), Validators.required],
      category: [data?.category || '', Validators.required],
      amount: [data?.amount || null, Validators.required],
      description: [data?.description || '']
    });
  }

  onFileChange(event: any) {
    const file = event.target.files && event.target.files[0];
    if (file) {
      this.receiptFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.receiptBase64 = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  save() {
    if (this.expenseForm.invalid) {
      this.expenseForm.markAllAsTouched();
      return;
    }

    const value = this.expenseForm.value;
    const expense = new Expense({
      id: this.data?.id || uuidv4(),
      date: value.date,
      category: value.category!,
      amount: value.amount!,
      description: value.description || '',
      receiptUrl: this.receiptBase64,
      status: this.data?.status || ExpenseStatus.Pending
    });

    this.dialogRef.close(expense);
  }

  close() {
    this.dialogRef.close();
  }
}
