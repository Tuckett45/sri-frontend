import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ExpenseListItem, ExpenseStatus } from 'src/app/models/expense.model';

export interface ExpenseFilters {
  startDate: Date | string | null;
  endDate: Date | string | null;
  job: string;
  employee: string;
  status: ExpenseStatus | 'Pending' | 'Approved' | 'Rejected' | '' | null;
  category: string;
}

@Component({
  selector: 'app-expense-filters',
  templateUrl: './expense-filters.component.html',
  styleUrls: ['./expense-filters.component.scss']
})
export class ExpenseFiltersComponent implements OnInit, OnDestroy {
  @Input() statusOptions: ExpenseStatus[] = [];
  @Input() showEmployeeField = true;
  @Input() categoryOptions: string[] = [];
  @Input() set initialFilters(value: Partial<ExpenseFilters> | null) {
    if (!value) return;
    this.form.patchValue(value);
  }

  @Output() filtersChange = new EventEmitter<ExpenseFilters>();

  form: FormGroup = this.fb.group({
    startDate: [null],
    endDate: [null],
    job: [''],
    employee: [''],
    status: [''],
    category: ['']
  });

  private destroy$ = new Subject<void>();

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.emitFilters());

    this.emitFilters();
  }

  clear(): void {
    this.form.reset({
      startDate: null,
      endDate: null,
      job: '',
      employee: '',
      status: '',
      category: ''
    });
    this.emitFilters();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private emitFilters(): void {
    const { startDate, endDate, job, employee, status, category } = this.form.value as ExpenseFilters;
    this.filtersChange.emit({
      startDate: startDate ?? null,
      endDate: endDate ?? null,
      job: job ?? '',
      employee: employee ?? '',
      status: status ?? '',
      category: category ?? ''
    });
  }
}
