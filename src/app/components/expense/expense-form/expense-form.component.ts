import {
  Component,
  EventEmitter,
  Output,
  ViewChild,
  ElementRef,
  AfterViewInit
} from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { Expense, ExpenseStatus } from 'src/app/models/expense.model';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-expense-form',
  templateUrl: './expense-form.component.html',
  styleUrls: ['./expense-form.component.scss']
})
export class ExpenseFormComponent implements AfterViewInit {
  @Output() submitted = new EventEmitter<Expense>();

  @ViewChild('descriptionInput') descriptionInput?: ElementRef<HTMLTextAreaElement>;

  categories = ['Travel', 'Food', 'Supplies', 'Entertainment', 'Other'];
  filteredCategories: string[] = [];

  form = this.fb.group({
    date: [new Date(), Validators.required],
    category: ['', Validators.required],
    amount: [null, [Validators.required, Validators.min(0.01)]],
    description: ['', [Validators.required, Validators.maxLength(100)]],
    receipt: [null]
  });

  receiptFile?: File;
  receiptBase64?: string;

  constructor(private fb: FormBuilder, private toastr: ToastrService) {}

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.descriptionInput?.nativeElement.focus();
    });
  }

  searchCategory(event: any) {
    const query = event.query.toLowerCase();
    this.filteredCategories = this.categories.filter(c =>
      c.toLowerCase().includes(query)
    );
  }

  isImage(): boolean {
    return this.receiptFile ? this.receiptFile.type.startsWith('image') : false;
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

  submit() {
    if (this.form.invalid) {
      this.toastr.error('Please fill all required fields');
      return;
    }

    const value = this.form.value;
    const expense = new Expense({
      id: uuidv4(),
      date: value.date!,
      category: value.category!,
      amount: value.amount!,
      description: value.description || '',
      receiptUrl: this.receiptBase64,
      status: ExpenseStatus.Pending
    });

    this.submitted.emit(expense);
  }
}
