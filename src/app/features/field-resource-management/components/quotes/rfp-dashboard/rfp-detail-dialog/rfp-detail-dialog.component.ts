import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DashboardQuote } from '../../../../models/quote-workflow.model';
import { RfpIntakeFormComponent } from '../../rfp-intake/rfp-intake-form.component';
import { BomHistoryDialogComponent } from '../bom-history-dialog/bom-history-dialog.component';
import * as DashboardActions from '../../../../state/quotes/dashboard.actions';

/**
 * RFP Detail Dialog Component
 *
 * Detail view showing all RFP record info with inline editing capability.
 * Includes a lifecycle timeline, notes panel, and inline field editing
 * for quick data updates without leaving the dialog.
 */
@Component({
  selector: 'app-rfp-detail-dialog',
  templateUrl: './rfp-detail-dialog.component.html',
  styleUrls: ['./rfp-detail-dialog.component.scss']
})
export class RfpDetailDialogComponent {

  // ─── Inline Editing State ─────────────────────────────────────────────────
  editingField: string | null = null;
  editValue: string = '';
  editDateValue: Date | null = null;

  constructor(
    public dialogRef: MatDialogRef<RfpDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { record: DashboardQuote },
    private router: Router,
    private dialog: MatDialog,
    private store: Store,
    private snackBar: MatSnackBar
  ) {}

  get record(): DashboardQuote {
    return this.data.record;
  }

  isOverdue(): boolean {
    if (!this.record.quoteDueDate || this.record.quoteSubmittedDate) {
      return false;
    }
    return new Date(this.record.quoteDueDate) < new Date();
  }

  getDaysOverdue(): number {
    if (!this.record.quoteDueDate) return 0;
    const due = new Date(this.record.quoteDueDate);
    const now = new Date();
    return Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  }

  // ─── Inline Editing ─────────────────────────────────────────────────────────

  startInlineEdit(field: string): void {
    this.editingField = field;
    const value = (this.record as any)[field];

    // Determine if this is a date field
    const dateFields = ['rfpReceiveDate', 'quoteDueDate', 'quoteSubmittedDate', 'poReceivedDate'];
    if (dateFields.includes(field)) {
      this.editDateValue = value ? new Date(value) : null;
      this.editValue = value || '';
    } else {
      this.editValue = value != null ? String(value) : '';
      this.editDateValue = null;
    }
  }

  cancelInlineEdit(): void {
    this.editingField = null;
    this.editValue = '';
    this.editDateValue = null;
  }

  onDateFieldChange(event: any): void {
    if (event.value) {
      this.editDateValue = event.value;
      this.editValue = event.value.toISOString();
    }
  }

  saveInlineEdit(): void {
    if (!this.editingField) return;

    const field = this.editingField;
    const currentValue = (this.record as any)[field];

    // Determine actual value based on field type
    const dateFields = ['rfpReceiveDate', 'quoteDueDate', 'quoteSubmittedDate', 'poReceivedDate'];
    const numericFields = ['poAmount'];
    let newValue: any;
    if (dateFields.includes(field)) {
      newValue = this.editDateValue ? this.editDateValue.toISOString() : null;
    } else if (numericFields.includes(field)) {
      const parsed = parseFloat(this.editValue);
      newValue = !isNaN(parsed) ? parsed : null;
    } else {
      newValue = this.editValue;
    }

    // Only dispatch if value changed
    if (newValue !== currentValue) {
      const fields: Partial<DashboardQuote> = {};
      (fields as any)[field] = newValue;

      this.store.dispatch(DashboardActions.updateDashboardFields({
        quoteId: this.record.id,
        fields
      }));

      // Optimistically update the local record
      (this.data.record as any)[field] = newValue;

      this.snackBar.open(`${this.getFieldLabel(field)} updated`, 'Close', { duration: 2000 });
    }

    this.cancelInlineEdit();
  }

  private getFieldLabel(field: string): string {
    const labels: Record<string, string> = {
      customer: 'Customer',
      description: 'Description',
      requestorName: 'Requester',
      rfpReceiveDate: 'RFP Received Date',
      quoteDueDate: 'Quote Due Date',
      assignedToQuote: 'Assigned To',
      quoteSubmittedDate: 'Quote Submitted Date',
      quoteNumber: 'Quote Number',
      poNumber: 'PO Number',
      poAmount: 'PO Amount'
    };
    return labels[field] || field;
  }

  // ─── BOM Tracking ──────────────────────────────────────────────────────────

  openBomHistory(): void {
    const dialogRef = this.dialog.open(BomHistoryDialogComponent, {
      width: '700px',
      data: { quoteId: this.record.id, bomTrackings: this.record.bomTrackings || [] }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Reload notes/data if a BOM was added
        this.store.dispatch(DashboardActions.loadDashboard({ filters: {} as any }));
      }
    });
  }

  // ─── Dialog Actions ─────────────────────────────────────────────────────────

  openWorkflow(): void {
    this.dialogRef.close();
    this.dialog.open(RfpIntakeFormComponent, {
      width: '900px',
      maxWidth: '95vw',
      disableClose: true,
      data: { editRecord: this.record }
    });
  }

  close(): void {
    this.dialogRef.close();
  }

  confirmDelete(): void {
    const confirmed = window.confirm(
      `Are you sure you want to delete this RFP?\n\n"${this.record.description}" (${this.record.customer})\n\nThis action cannot be undone.`
    );
    if (confirmed) {
      this.store.dispatch(DashboardActions.deleteRfp({ quoteId: this.record.id }));
      this.dialogRef.close({ deleted: true });
    }
  }
}
