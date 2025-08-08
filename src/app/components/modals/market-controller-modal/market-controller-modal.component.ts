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
      type: [entry?.type || '', Validators.required]
    });

    if (entry?.type) {
      this.updateFormFields(entry.type, entry);
    }

    this.entryForm.get('type')!.valueChanges.subscribe((selected: string) => {
      this.updateFormFields(selected, null);
    });
  }

  private updateFormFields(type: string, entry: MarketControllerEntry | null): void {
    // remove existing dynamic controls
    Object.keys(this.entryForm.controls).forEach(key => {
      if (key !== 'type') {
        this.entryForm.removeControl(key);
      }
    });

    const controls = this.getFormControls(type, entry);
    Object.keys(controls).forEach(key => {
      this.entryForm.addControl(key, controls[key]);
    });
  }

  private getFormControls(type: string, entry: MarketControllerEntry | null): { [key: string]: any } {
    switch (type) {
      case 'POCO':
        return {
          poNumber: [entry?.poNumber || '', Validators.required],
          vendor: [entry?.vendor || '', Validators.required],
          segmentReason: [entry?.segmentReason || '', Validators.required],
          date: [entry?.date ? new Date(entry.date) : new Date(), Validators.required],
          amount: [entry?.amount ?? 0, Validators.required],
          notes: [entry?.notes || '']
        };
      case 'New PO':
        return {
          poNumber: [entry?.poNumber || '', Validators.required],
          vendor: [entry?.vendor || '', Validators.required],
          date: [entry?.date ? new Date(entry.date) : new Date(), Validators.required],
          amount: [entry?.amount ?? 0],
          notes: [entry?.notes || '']
        };
      case 'Close PO':
        return {
          poNumber: [entry?.poNumber || '', Validators.required],
          vendor: [entry?.vendor || '', Validators.required],
          date: [entry?.date ? new Date(entry.date) : new Date(), Validators.required],
          notes: [entry?.notes || '']
        };
      case 'Budget Update':
      case 'Contract Update':
      case 'Directed Work':
        return {
          date: [entry?.date ? new Date(entry.date) : new Date(), Validators.required],
          notes: [entry?.notes || '']
        };
      case 'PO Scrub':
        return {
          poNumber: [entry?.poNumber || '', Validators.required],
          date: [entry?.date ? new Date(entry.date) : new Date(), Validators.required],
          notes: [entry?.notes || '']
        };
      case 'Invoice Scrub':
        return {
          poNumber: [entry?.poNumber || '', Validators.required],
          segmentReason: [entry?.segmentReason || '', Validators.required],
          date: [entry?.date ? new Date(entry.date) : new Date(), Validators.required],
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
    return map[key] || key;
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
