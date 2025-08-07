import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-market-controller-modal',
  templateUrl: './market-controller-modal.component.html',
  styleUrls: ['./market-controller-modal.component.scss']
})
export class MarketControllerModalComponent {
[x: string]: any;
  entryForm: FormGroup;
  type: string;
  vendors: string[] = ['Congruex (SCI)', 'Ervin (ECC)', 'Blue Edge (BE)', 'North Star', 'MasTec', 'Bcomm'];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<MarketControllerModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { type: string; entry: any }
  ) {
    this.type = data.type;
    this.entryForm = this.fb.group(this.getFormControls(this.type, data.entry));
  }

  getFormControls(type: string, entry: any): { [key: string]: any } {
    switch (type) {
      case 'poco':
        return {
          poNumber: [entry?.poNumber || '', Validators.required],
          vendor: [entry?.vendor || '', Validators.required],
          segmentReason: [entry?.segmentReason || '', Validators.required],
          date: [entry?.date || new Date(), Validators.required],
          amount: [entry?.amount ?? 0, Validators.required],
          notes: [entry?.notes || '']
        };
      case 'newPo':
        return {
          poNumber: [entry?.poNumber || '', Validators.required],
          vendor: [entry?.vendor || '', Validators.required],
          date: [entry?.date || new Date(), Validators.required],
          amount: [entry?.amount ?? 0],
          notes: [entry?.notes || '']
        };
      case 'closePo':
        return {
          poNumber: [entry?.poNumber || '', Validators.required],
          vendor: [entry?.vendor || '', Validators.required],
          date: [entry?.date || new Date(), Validators.required],
          notes: [entry?.notes || '']
        };
      case 'budgetUpdate':
        return {
          date: [entry?.date || new Date(), Validators.required],
          notes: [entry?.notes || '']
        };
      case 'contractUpdate':
        return {
          date: [entry?.date || new Date(), Validators.required],
          notes: [entry?.notes || '']
        };
      case 'directedWork':
        return {
          date: [entry?.date || new Date(), Validators.required],
          notes: [entry?.notes || '']
        };
      case 'poScrub':
        return {
          poNumber: [entry?.poNumber || '', Validators.required],
          date: [entry?.date || new Date(), Validators.required],
          notes: [entry?.notes || '']
        };
      case 'invoiceScrub':
        return {
          poNumber: [entry?.poNumber || '', Validators.required],
          segmentReason: [entry?.segmentReason || '', Validators.required],
          date: [entry?.date || new Date(), Validators.required],
          notes: [entry?.notes || '']
        };
      default:
        return {};
    }
  }

  getLabel(key: string): string {
    const map: Record<string, string> = {
      poNumber: 'PO Number',
      vendor: 'Vendor',
      segmentReason: 'Segment / Reason',
      date: 'Date',
      amount: 'Amount',
      notes: 'Notes'
    };
    return map[key] || (key.charAt(0).toUpperCase() + key.slice(1));
  }

  getColSpan(field: string): number {
    switch (field) {
      case 'notes':
        return 4;
      default:
        return 2;
    }
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
