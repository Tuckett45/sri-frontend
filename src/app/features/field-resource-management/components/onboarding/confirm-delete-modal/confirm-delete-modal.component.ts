import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface ConfirmDeleteModalData {
  title: string;
  message: string;
  itemName: string;
}

@Component({
  selector: 'app-confirm-delete-modal',
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <p class="confirm-message">{{ data.message }}</p>
      <p class="item-name">{{ data.itemName }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="warn" (click)="onConfirm()">Delete</button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      padding: 0 24px;
      min-width: 360px;
    }

    .confirm-message {
      font-size: 0.9375rem;
      color: #424242;
      margin: 0 0 8px;
    }

    .item-name {
      font-size: 0.875rem;
      font-weight: 600;
      color: #d32f2f;
      margin: 0;
      padding: 8px 12px;
      background: #ffebee;
      border-radius: 4px;
    }

    mat-dialog-actions {
      padding: 16px 24px;
    }
  `]
})
export class ConfirmDeleteModalComponent {
  constructor(
    private dialogRef: MatDialogRef<ConfirmDeleteModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDeleteModalData
  ) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
