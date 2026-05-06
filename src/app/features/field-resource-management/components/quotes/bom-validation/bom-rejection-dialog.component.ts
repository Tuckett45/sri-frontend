import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { FormControl, Validators } from '@angular/forms';

@Component({
  selector: 'app-bom-rejection-dialog',
  template: `
    <h2 mat-dialog-title>Reject BOM</h2>
    <mat-dialog-content>
      <p>Please provide a reason for rejecting this Bill of Materials.</p>
      <mat-form-field appearance="outline" style="width:100%">
        <mat-label>Rejection Reason</mat-label>
        <textarea matInput [formControl]="reason" rows="4" placeholder="Describe why the BOM is being rejected..."></textarea>
        <mat-error *ngIf="reason.hasError('required')">Reason is required</mat-error>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Cancel</button>
      <button mat-raised-button color="warn" (click)="confirm()" [disabled]="reason.invalid">Reject BOM</button>
    </mat-dialog-actions>
  `
})
export class BomRejectionDialogComponent {
  reason = new FormControl('', Validators.required);

  constructor(private dialogRef: MatDialogRef<BomRejectionDialogComponent>) {}

  confirm(): void {
    if (this.reason.valid) {
      this.dialogRef.close(this.reason.value);
    }
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}
