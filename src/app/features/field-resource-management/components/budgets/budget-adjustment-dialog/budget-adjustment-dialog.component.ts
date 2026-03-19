import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface BudgetAdjustmentDialogData {
  currentBudget: number;
  consumedHours: number;
  remainingHours: number;
}

@Component({
  selector: 'app-budget-adjustment-dialog',
  templateUrl: './budget-adjustment-dialog.component.html',
  styleUrls: ['./budget-adjustment-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BudgetAdjustmentDialogComponent {
  adjustmentForm: FormGroup;

  constructor(
    private dialogRef: MatDialogRef<BudgetAdjustmentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: BudgetAdjustmentDialogData,
    private fb: FormBuilder
  ) {
    this.adjustmentForm = this.fb.group({
      amount: [0, [Validators.required, Validators.min(-1000), Validators.max(1000)]],
      reason: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  get newBudget(): number {
    const amount = this.adjustmentForm.get('amount')?.value || 0;
    return this.data.currentBudget + amount;
  }

  get newRemaining(): number {
    const amount = this.adjustmentForm.get('amount')?.value || 0;
    return this.data.remainingHours + amount;
  }

  get amountControl() {
    return this.adjustmentForm.get('amount');
  }

  get reasonControl() {
    return this.adjustmentForm.get('reason');
  }

  submit(): void {
    if (this.adjustmentForm.valid) {
      this.dialogRef.close(this.adjustmentForm.value);
    }
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}
