import { Component, Inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
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


  vendors: string[] = [
    'Alarm Control Systems, Inc.',
    'American Residential Services LLC (dba Yes!)',
    'Anixter Inc.',
    'Arizona Blue Stakes Inc. dba Arizona 811',
    'BPG Designs, LLC',
    'Blue Edge Infrastructure',
    'Brungardt Honomichl & Company, P.A. (BHC Rhodes)',
    'Business Oriented Software Solutions, Inc. (BOSS 811)',
    'CHC Consulting, LLC',
    'City of Chandler',
    'City of Mesa',
    'Crown Castle',
    'Ervin Cable',
    'Fibernet USA',
    'James McPeak Inc.',
    'K&B Engineering',
    'Niels Fugal Sons Co, LLC',
    'Northstar Communications, Inc.',
    'Pacific Network Solutions Construction LLC',
    'Prince Telecom',
    'Project Resource Group (PRG)',
    'Right Side Locating',
    'Rocky Mountain West Telecom dba RMWT, Inc.',
    'System Resources Telecom LLC (SRI)',
    'Sorensen, Craig F. Construction Inc. (SCI)',
    'Tower Engineering Services, LLC',
    'Town of Queen Creek',
    'Unified Building Group LLC',
    'Underground Service Alert of Northern California and Nevada',
    'Utah Department of Transportation',
    'WYCO Field Services, LLC',
    'Wyyred Connect, LLC',
    'Pearce Services LLC'
  ];


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
    Object.entries(controls).forEach(([key, control]) => {
      this.entryForm.addControl(key, control);
    });
  }

  private getFormControls(type: string, entry: MarketControllerEntry | null): { [key: string]: FormControl } {
    switch (type) {
      case 'POCO':
        return {
          poNumber: this.fb.control(entry?.poNumber || '', Validators.required),
          vendor: this.fb.control(entry?.vendor || '', Validators.required),
          market: this.fb.control(entry?.market || '', Validators.required),
          segmentReason: this.fb.control(entry?.segmentReason || '', Validators.required),
          date: this.fb.control(entry?.date ? new Date(entry.date) : new Date(), Validators.required),
          amount: this.fb.control(entry?.amount ?? 0, Validators.required),
          notes: this.fb.control(entry?.notes || '')
        };
      case 'New PO':
        return {
          poNumber: this.fb.control(entry?.poNumber || '', Validators.required),
          vendor: this.fb.control(entry?.vendor || '', Validators.required),
          market: this.fb.control(entry?.market || '', Validators.required),
          date: this.fb.control(entry?.date ? new Date(entry.date) : new Date(), Validators.required),
          amount: this.fb.control(entry?.amount ?? 0),
          notes: this.fb.control(entry?.notes || '')
        };
      case 'Close PO':
        return {
          poNumber: this.fb.control(entry?.poNumber || '', Validators.required),
          vendor: this.fb.control(entry?.vendor || '', Validators.required),
          market: this.fb.control(entry?.market || '', Validators.required),
          date: this.fb.control(entry?.date ? new Date(entry.date) : new Date(), Validators.required),
          notes: this.fb.control(entry?.notes || '')
        };
      case 'Budget Update':
      case 'Contract Update':
      case 'Directed Work':
        return {
          market: this.fb.control(entry?.market || '', Validators.required),
          date: this.fb.control(entry?.date ? new Date(entry.date) : new Date(), Validators.required),
          notes: this.fb.control(entry?.notes || '')
        };
      case 'PO Scrub':
        return {
          poNumber: this.fb.control(entry?.poNumber || '', Validators.required),
          market: this.fb.control(entry?.market || '', Validators.required),
          date: this.fb.control(entry?.date ? new Date(entry.date) : new Date(), Validators.required),
          notes: this.fb.control(entry?.notes || '')
        };
      case 'Invoice Scrub':
        return {
          poNumber: this.fb.control(entry?.poNumber || '', Validators.required),
          market: this.fb.control(entry?.market || '', Validators.required),
          segmentReason: this.fb.control(entry?.segmentReason || '', Validators.required),
          date: this.fb.control(entry?.date ? new Date(entry.date) : new Date(), Validators.required),
          notes: this.fb.control(entry?.notes || '')
        };
      default:
        return {};
    }
  }

  getLabel(key: string): string {
    const map: Record<string, string> = {
      poNumber: 'PO Number',
      vendor: 'Vendor',
      market: 'Market',
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
