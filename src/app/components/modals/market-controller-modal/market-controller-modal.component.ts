import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MarketControllerEntry } from 'src/app/models/market-controller-entry.model';

@Component({
  selector: 'app-market-controller-modal',
  templateUrl: './market-controller-modal.component.html',
  styleUrls: ['./market-controller-modal.component.scss']
})
export class MarketControllerModalComponent {
  entryForm: FormGroup;
  type: string;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<MarketControllerModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { type: string; entry: MarketControllerEntry | null }
  ) {
    this.type = data.type;

    this.entryForm = this.fb.group({
      poNumber: [data.entry?.poNumber || '', Validators.required],
      type: [data.entry?.type, Validators.required],
      vendor: [data.entry?.vendor || '', Validators.required],
      segmentReason: [data.entry?.segmentReason || '', Validators.required],
      date: [data.entry?.date || new Date(), Validators.required],
      amount: [data.entry?.amount ?? null, Validators.required],
      notes: [data.entry?.notes || '']
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
