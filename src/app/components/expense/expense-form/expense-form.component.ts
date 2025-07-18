import { Component, EventEmitter, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-expense-form',
  templateUrl: './expense-form.component.html',
  styleUrls: ['./expense-form.component.scss']
})
export class ExpenseFormComponent {
  @Output() submitted = new EventEmitter<FormData>();

  form = this.fb.group({
    date: [new Date(), Validators.required],
    category: ['', Validators.required],
    amount: [null, Validators.required],
    description: [''],
    receipt: [null]
  });

  receiptFile?: File;

  constructor(private fb: FormBuilder, private toastr: ToastrService) {}

  onFileChange(event: any) {
    const file = event.target.files && event.target.files[0];
    if (file) {
      this.receiptFile = file;
    }
  }

  submit() {
    if (this.form.invalid) {
      this.toastr.error('Please fill all required fields');
      return;
    }

    const formData = new FormData();
    Object.entries(this.form.value).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        if (key === 'date' && value) {
          formData.append(key, (value as Date).toISOString());
        } else if (key !== 'receipt') {
          formData.append(key, value as any);
        }
      }
    });

    if (this.receiptFile) {
      formData.append('receipt', this.receiptFile);
    }

    this.submitted.emit(formData);
  }
}
