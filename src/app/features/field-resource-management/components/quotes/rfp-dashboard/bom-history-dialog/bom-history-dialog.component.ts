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
  entryForm: FormGroup;
  hasChanged = false;

  /** When editing, holds the id of the entry being edited */
  editingId: string | null = null;

  displayedColumns: string[] = ['bomDescription', 'status', 'actions'];

  constructor(
    private dialogRef: MatDialogRef<BomHistoryDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: BomHistoryDialogData,
    private fb: FormBuilder,
    private store: Store
  ) {
    this.bomTrackings = [...data.bomTrackings];
    this.quoteId = data.quoteId;
    this.entryForm = this.fb.group({
      bomDescription: ['', Validators.required],
      orderedDate: [null],
      receivedDate: [null],
      trackingNumber: [''],
      status: ['Ordered', Validators.required]
    });
  }

  /** True when the form is in edit mode */
  get isEditing(): boolean {
    return this.editingId !== null;
  }

  /** Populate the form with an existing entry for editing */
  startEdit(entry: BomTracking): void {
    this.editingId = entry.id;
    this.entryForm.patchValue({
      bomDescription: entry.bomDescription,
      orderedDate: entry.orderedDate ? new Date(entry.orderedDate) : null,
      receivedDate: entry.receivedDate ? new Date(entry.receivedDate) : null,
      trackingNumber: entry.trackingNumber || '',
      status: entry.status
    });
  }

  /** Cancel editing and reset the form */
  cancelEdit(): void {
    this.editingId = null;
    this.entryForm.reset({ status: 'Ordered' });
  }

  /** Submit handler — creates or updates depending on mode */
  onSubmit(): void {
    if (this.entryForm.invalid) return;

    if (this.isEditing) {
      this.saveEdit();
    } else {
      this.addEntry();
    }
  }

  private addEntry(): void {
    const entry = { ...this.entryForm.value };
    if (entry.orderedDate instanceof Date) {
      entry.orderedDate = entry.orderedDate.toISOString();
    }
    if (entry.receivedDate instanceof Date) {
      entry.receivedDate = entry.receivedDate.toISOString();
    }

    this.store.dispatch(DashboardActions.createBomTracking({
      quoteId: this.quoteId,
      entry
    }));

    // Optimistically add to local list
    this.bomTrackings = [
      ...this.bomTrackings,
      {
        id: 'temp-' + Date.now(),
        quoteId: this.quoteId,
        bomDescription: entry.bomDescription,
        orderedDate: entry.orderedDate || null,
        receivedDate: entry.receivedDate || null,
        trackingNumber: entry.trackingNumber || null,
        status: entry.status
      } as BomTracking
    ];
    this.entryForm.reset({ status: 'Ordered' });
    this.hasChanged = true;
  }

  private saveEdit(): void {
    const values = this.entryForm.value;
    const updatedEntry: Partial<BomTracking> = {
      bomDescription: values.bomDescription,
      orderedDate: values.orderedDate instanceof Date ? values.orderedDate.toISOString() : values.orderedDate || null,
      receivedDate: values.receivedDate instanceof Date ? values.receivedDate.toISOString() : values.receivedDate || null,
      trackingNumber: values.trackingNumber || null,
      status: values.status
    };

    this.store.dispatch(DashboardActions.updateBomTracking({
      quoteId: this.quoteId,
      trackingId: this.editingId!,
      entry: updatedEntry
    }));

    // Optimistically update local list
    this.bomTrackings = this.bomTrackings.map(b =>
      b.id === this.editingId ? { ...b, ...updatedEntry } : b
    );
    this.editingId = null;
    this.entryForm.reset({ status: 'Ordered' });
    this.hasChanged = true;
  }

  deleteEntry(entry: BomTracking): void {
    if (!entry.id) return;
    const confirmed = window.confirm(`Delete BOM entry "${entry.bomDescription}"?`);
    if (confirmed) {
      this.store.dispatch(DashboardActions.deleteBomTracking({
        quoteId: this.quoteId,
        trackingId: entry.id
      }));
      this.bomTrackings = this.bomTrackings.filter(b => b.id !== entry.id);
      this.hasChanged = true;

      // If we were editing this entry, cancel
      if (this.editingId === entry.id) {
        this.cancelEdit();
      }
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Ordered': return 'status-ordered';
      case 'Shipped': return 'status-shipped';
      case 'Received': return 'status-received';
      case 'Backordered': return 'status-backordered';
      case 'N/A': return 'status-na';
      default: return '';
    }
  }

  onClose(): void {
    this.dialogRef.close(this.hasChanged);
  }
}
