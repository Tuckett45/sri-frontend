import { Component } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';

/**
 * BOM Rejection Dialog Component
 *
 * A dialog that requires the BOM_Validator to enter rejection comments
 * before completing a BOM rejection. Comments must be non-empty and
 * have a maximum length of 2000 characters.
 *
 * Requirements: 5.8
 */
@Component({
  selector: 'app-bom-rejection-dialog',
  template: `
    <h2 mat-dialog-title>Reject BOM</h2>
    <mat-dialog-content>
      <p>Please provide comments explaining the reason for rejection. These comments will be sent to the quoter.</p>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Rejection Comments</mat-label>
        <textarea
          matInput
          [formControl]="commentsControl"
          rows="5"
          placeholder="Enter rejection comments..."
          maxlength="2000"
        ></textarea>
        <mat-hint align="end">{{ commentsControl.value?.length || 0 }}/2000</mat-hint>
        <mat-error *ngIf="commentsControl.hasError('required')">
          Rejection comments are required
        </mat-error>
        <mat-error *ngIf="commentsControl.hasError('maxlength')">
          Maximum length is 2000 characters
        </mat-error>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button
        mat-raised-button
        color="warn"
        (click)="onSubmit()"
        [disabled]="commentsControl.invalid"
      >
        Reject BOM
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width {
      width: 100%;
    }
    mat-dialog-content {
      min-width: 400px;
    }
    p {
      margin-bottom: 16px;
      color: rgba(0, 0, 0, 0.6);
      font-size: 14px;
    }
  `]
})
export class BomRejectionDialogComponent {
  commentsControl = new FormControl('', [
    Validators.required,
    Validators.maxLength(2000)
  ]);

  constructor(private dialogRef: MatDialogRef<BomRejectionDialogComponent>) {}

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.commentsControl.valid) {
      this.dialogRef.close(this.commentsControl.value);
    } else {
      this.commentsControl.markAsTouched();
    }
  }
}
