import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { EquipmentAssignment, EquipmentAssetType, EquipmentStatus } from '../../../models/equipment.model';

export interface EquipmentEditModalData {
  mode: 'add' | 'edit';
  technicianId: string;
  equipment?: EquipmentAssignment;
}

@Component({
  selector: 'app-equipment-edit-modal',
  template: `
    <h2 mat-dialog-title>{{ data.mode === 'add' ? 'Assign Equipment' : 'Edit Equipment' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="modal-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Asset Type</mat-label>
          <mat-select formControlName="assetType" required>
            <mat-option value="badge">Badge</mat-option>
            <mat-option value="laptop">Laptop</mat-option>
            <mat-option value="other">Other</mat-option>
          </mat-select>
          <mat-error *ngIf="form.get('assetType')?.hasError('required')">Asset type is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Asset Identifier</mat-label>
          <input matInput formControlName="assetIdentifier" required />
          <mat-error *ngIf="form.get('assetIdentifier')?.hasError('required')">Asset identifier is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width" *ngIf="data.mode === 'edit'">
          <mat-label>Status</mat-label>
          <mat-select formControlName="status">
            <mat-option value="assigned">Assigned</mat-option>
            <mat-option value="returned">Returned</mat-option>
            <mat-option value="lost">Lost</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width" *ngIf="data.mode === 'edit' && form.get('status')?.value === 'returned'">
          <mat-label>Return Date</mat-label>
          <input matInput type="date" formControlName="returnDate" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Notes</mat-label>
          <textarea matInput formControlName="notes" rows="3"></textarea>
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
export class EquipmentEditModalComponent {
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<EquipmentEditModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EquipmentEditModalData
  ) {
    const eq = data.equipment;

    this.form = this.fb.group({
      assetType: [eq?.assetType || '', Validators.required],
      assetIdentifier: [eq?.assetIdentifier || '', Validators.required],
      status: [eq?.status || 'assigned'],
      returnDate: [eq?.returnDate || ''],
      notes: [eq?.notes || '']
    });
  }

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.value;
    const result: any = {
      assetType: value.assetType,
      assetIdentifier: value.assetIdentifier.trim(),
      notes: value.notes?.trim() || undefined
    };

    if (this.data.mode === 'edit') {
      result.status = value.status;
      if (value.status === 'returned' && value.returnDate) {
        result.returnDate = value.returnDate;
      }
    }

    this.dialogRef.close(result);
  }
}
