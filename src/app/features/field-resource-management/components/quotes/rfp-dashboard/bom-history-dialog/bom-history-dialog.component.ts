import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Store } from '@ngrx/store';
import { BomTracking } from '../../../../models/quote-workflow.model';
import * as DashboardActions from '../../../../state/quotes/dashboard.actions';

export interface BomHistoryDialogData {
  quoteId: string;
  bomTrackings: BomTracking[];
}

@Component({
  selector: 'app-bom-history-dialog',
  templateUrl: './bom-history-dialog.component.html',
  styleUrls: ['./bom-history-dialog.component.scss']
})
export class BomHistoryDialogComponent {
  bomTrackings: BomTracking[];
  quoteId: string;
  addForm: FormGroup;

  displayedColumns: string[] = ['bomDescription', 'orderedDate', 'receivedDate', 'trackingNumber', 'status'];

  constructor(
    private dialogRef: MatDialogRef<BomHistoryDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: BomHistoryDialogData,
    private fb: FormBuilder,
    private store: Store
  ) {
    this.bomTrackings = data.bomTrackings;
    this.quoteId = data.quoteId;
    this.addForm = this.fb.group({
      bomDescription: ['', Validators.required],
      orderedDate: [null],
      receivedDate: [null],
      trackingNumber: [''],
      status: ['Ordered', Validators.required]
    });
  }

  onAdd(): void {
    if (this.addForm.valid) {
      const entry = this.addForm.value;
      if (entry.orderedDate) {
        entry.orderedDate = entry.orderedDate.toISOString();
      }
      if (entry.receivedDate) {
        entry.receivedDate = entry.receivedDate.toISOString();
      }
      this.store.dispatch(DashboardActions.createBomTracking({
        quoteId: this.quoteId,
        entry
      }));
      this.dialogRef.close(true);
    }
  }

  onClose(): void {
    this.dialogRef.close();
  }
}
