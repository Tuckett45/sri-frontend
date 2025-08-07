import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MarketControllerEntry } from '../../../models/market-controller-entry.model';

@Component({
  selector: 'app-market-controller-modal',
  templateUrl: './market-controller-modal.component.html',
  styleUrls: ['./market-controller-modal.component.scss']
})
export class MarketControllerModalComponent {
  entryForm: FormGroup;
  types: string[] = [
    'POCO',
    'New PO',
    'Close PO',
    'Budget Update',
    'Contract Update',
    'PO Scrub',
    'Invoice Scrub',
    'Directed Work'
  ];
  vendors: string[] = ['Congruex (SCI)', 'Ervin (ECC)', 'Blue Edge (BE)', 'North Star', 'MasTec', 'Bcomm'];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<MarketControllerModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { entry: MarketControllerEntry | null }
  ) {
    const entry = data.entry;
    this.entryForm = this.fb.group({
      type: [entry?.type || '', Validators.required],
      poNumber: [entry?.poNumber || ''],
      vendor: [entry?.vendor || ''],
      segmentReason: [entry?.segmentReason || ''],
      date: [entry?.date ? new Date(entry.date) : new Date(), Validators.required],
      amount: [entry?.amount],
      notes: [entry?.notes || '']
    });
  }

  close(): void {
    this.dialogRef.close(null);
  }

  save(): void {
    if (this.entryForm.valid) {
      this.dialogRef.close(this.entryForm.value);
    } else {
      this.entryForm.markAllAsTouched();
    }
  }
}
