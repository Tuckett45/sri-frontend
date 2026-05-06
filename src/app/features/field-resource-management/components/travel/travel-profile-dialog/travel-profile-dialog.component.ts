import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-travel-profile-dialog',
  templateUrl: './travel-profile-dialog.component.html',
  styleUrls: ['./travel-profile-dialog.component.scss']
})
export class TravelProfileDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<TravelProfileDialogComponent>
  ) {}

  close(): void {
    this.dialogRef.close();
  }
}
