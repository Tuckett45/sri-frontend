import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-budget-adjustment-dialog',
  templateUrl: './budget-adjustment-dialog.component.html',
  styleUrls: ['./budget-adjustment-dialog.component.scss']
})
export class BudgetAdjustmentDialogComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  adjustmentForm!: FormGroup;

  categories = ['Labor', 'Materials', 'Travel', 'Misc'];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<BudgetAdjustmentDialogComponent>
  ) {}

  ngOnInit(): void {
    this.adjustmentForm = this.fb.group({
      category: ['', Validators.required],
      amount: [0, [Validators.required]],
      reason: ['', Validators.required]
    });
  }

  onSave(): void {
    if (this.adjustmentForm.valid) {
      this.dialogRef.close(this.adjustmentForm.value);
    }
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
