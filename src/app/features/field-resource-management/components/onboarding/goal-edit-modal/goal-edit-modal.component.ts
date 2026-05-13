import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { PRCGoal, PRCGoalStatus } from '../../../models/prc.model';

export interface GoalEditModalData {
  mode: 'add' | 'edit';
  prcId: string;
  goal?: PRCGoal;
}

@Component({
  selector: 'app-goal-edit-modal',
  template: `
    <h2 mat-dialog-title>{{ data.mode === 'add' ? 'Add Goal' : 'Edit Goal' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="modal-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Description</mat-label>
          <input matInput formControlName="description" required />
          <mat-error *ngIf="form.get('description')?.hasError('required')">Description is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Target Date</mat-label>
          <input matInput type="date" formControlName="targetDate" required />
          <mat-error *ngIf="form.get('targetDate')?.hasError('required')">Target date is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width" *ngIf="data.mode === 'edit'">
          <mat-label>Status</mat-label>
          <mat-select formControlName="status">
            <mat-option value="not_started">Not Started</mat-option>
            <mat-option value="in_progress">In Progress</mat-option>
            <mat-option value="completed">Completed</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width" *ngIf="data.mode === 'edit' && form.get('status')?.value === 'completed'">
          <mat-label>Completion Notes</mat-label>
          <textarea matInput formControlName="completionNotes" rows="3"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" (click)="onSave()" [disabled]="form.invalid">Save</button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      padding: 0 24px;
      min-width: 432px;
    }

    .modal-form {
      display: flex;
      flex-direction: column;
      padding-top: 8px;
    }

    .full-width {
      width: 100%;
    }

    mat-dialog-actions {
      padding: 8px 24px 16px;
    }
  `]
})
export class GoalEditModalComponent {
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<GoalEditModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: GoalEditModalData
  ) {
    const goal = data.goal;

    this.form = this.fb.group({
      description: [goal?.description || '', Validators.required],
      targetDate: [goal?.targetDate || '', Validators.required],
      status: [goal?.status || 'not_started'],
      completionNotes: [goal?.completionNotes || '']
    });
  }

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.value;
    const result: any = {
      description: value.description.trim(),
      targetDate: value.targetDate
    };

    if (this.data.mode === 'edit') {
      result.status = value.status;
      if (value.status === 'completed' && value.completionNotes?.trim()) {
        result.completionNotes = value.completionNotes.trim();
      }
    }

    this.dialogRef.close(result);
  }
}
