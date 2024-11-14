import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'delete-confirmation-modal',
  templateUrl: './delete-confirmation-modal.component.html',
  styleUrls: ['./delete-confirmation-modal.component.scss']
})
export class DeleteConfirmationModalComponent {

  constructor(public dialogRef: MatDialogRef<DeleteConfirmationModalComponent>) {}

  // Close the dialog and return false (do not delete)
  cancel(): void {
    this.dialogRef.close(false);
  }

  // Close the dialog and return true (proceed with delete)
  confirm(): void {
    this.dialogRef.close(true);
  }
}
