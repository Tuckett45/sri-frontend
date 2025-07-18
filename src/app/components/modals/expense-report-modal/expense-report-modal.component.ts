import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Expense } from 'src/app/models/expense.model';

@Component({
  selector: 'app-expense-report-modal',
  templateUrl: './expense-report-modal.component.html',
  styleUrls: ['./expense-report-modal.component.scss'],
  standalone: false
})
export class ExpenseReportModalComponent {
  expenseForm: FormGroup;
  receiptFile?: File;

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
    }
  }

  save() {
    if (this.expenseForm.invalid) {
      this.expenseForm.markAllAsTouched();
      return;
    }

    const formData = new FormData();
    const value = this.expenseForm.value;
    Object.keys(value).forEach(key => {
      const val = value[key as keyof typeof value];
      if (val !== null && val !== undefined) {
        if (key === 'date' && val) {
          formData.append(key, (val as Date).toISOString());
        } else {
          formData.append(key, val as any);
        }
      }
    });

    if (this.receiptFile) {
      formData.append('receipt', this.receiptFile);
    }

    this.dialogRef.close(formData);
  }

  close() {
    this.dialogRef.close();
  }
}
