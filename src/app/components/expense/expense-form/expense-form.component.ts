import { Component, EventEmitter, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { Expense } from 'src/app/models/expense.model';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-expense-form',
  templateUrl: './expense-form.component.html',
  styleUrls: ['./expense-form.component.scss']
})
export class ExpenseFormComponent {
  @Output() submitted = new EventEmitter<Expense>();

  form = this.fb.group({
    date: [new Date(), Validators.required],
    category: ['', Validators.required],
    amount: [null, Validators.required],
    description: [''],
    receipt: [null]
  });

  receiptFile?: File;
  receiptBase64?: string;

  constructor(private fb: FormBuilder, private toastr: ToastrService) {}

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

  submit() {
    if (this.form.invalid) {
      this.toastr.error('Please fill all required fields');
      return;
    }

    const value = this.form.value;
    const expense = new Expense(
      value.date!,
      value.category!,
      value.amount!,
      value.description || '',
      this.receiptBase64
    );

    expense.id = uuidv4();

    this.submitted.emit(expense);
  }
}
