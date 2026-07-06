import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { DashboardQuote } from '../../../../models/quote-workflow.model';
import { RfpIntakeFormComponent } from '../../rfp-intake/rfp-intake-form.component';
import * as DashboardActions from '../../../../state/quotes/dashboard.actions';

export interface TimelineStep {
  label: string;
  completed: boolean;
  active: boolean;
  date: string | null;
}

/**
 * RFP Detail Dialog Component
 *
 * Comprehensive detail view showing:
 * - Visual lifecycle timeline (RFP → PO → Project → Closeout)
 * - Expandable sections for each stage with relevant details
 * - Action buttons to advance the record to the next stage
 */
@Component({
  selector: 'app-rfp-detail-dialog',
  templateUrl: './rfp-detail-dialog.component.html',
  styleUrls: ['./rfp-detail-dialog.component.scss']
})
export class RfpDetailDialogComponent implements OnInit {
  timelineSteps: TimelineStep[] = [];

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

  ngOnInit(): void {
    this.buildTimeline();
  }

  // ─── Timeline ──────────────────────────────────────────────────────────────

  private buildTimeline(): void {
    const r = this.record;

    this.timelineSteps = [
      {
        label: 'RFP Received',
        completed: !!r.rfpReceiveDate,
        active: !r.quoteSubmittedDate && !!r.rfpReceiveDate,
        date: r.rfpReceiveDate
      },
      {
        label: 'Quote Submitted',
        completed: !!r.quoteSubmittedDate,
        active: !!r.quoteSubmittedDate && !r.poNumber,
        date: r.quoteSubmittedDate
      },
      {
        label: 'PO Received',
        completed: !!r.poReceivedDate,
        active: !!r.poNumber && !r.poReceivedDate,
        date: r.poReceivedDate || (r.poNumber ? 'Awaiting receipt' : null)
      },
      {
        label: 'Job In Progress',
        completed: !!r.jobComplete,
        active: !!r.poReceivedDate && !r.jobComplete,
        date: r.jobStart
      },
      {
        label: 'Invoiced',
        completed: !!r.invoiceNumber,
        active: !!r.jobComplete && !r.invoiceNumber,
        date: null
      },
      {
        label: 'Closed Out',
        completed: !!r.invoiceNumber && !!r.jobComplete,
        active: false,
        date: null
      }
    ];
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

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

  // ─── Stage Actions ─────────────────────────────────────────────────────────

  addPoNumber(): void {
    const poNumber = window.prompt('Enter PO Number:');
    if (poNumber && poNumber.trim()) {
      this.store.dispatch(DashboardActions.updateDashboardFields({
        quoteId: this.record.id,
        fields: { poNumber: poNumber.trim() }
      }));
      this.record.poNumber = poNumber.trim();
      this.buildTimeline();
      this.snackBar.open('PO Number added — record moved to PO Tracking', 'Close', { duration: 3000 });
    }
  }

  markPoReceived(): void {
    const today = new Date().toISOString();
    this.store.dispatch(DashboardActions.updateDashboardFields({
      quoteId: this.record.id,
      fields: { poReceivedDate: today }
    }));
    this.record.poReceivedDate = today;
    this.buildTimeline();
    this.snackBar.open('PO marked as received — record moved to Project Tracking', 'Close', { duration: 3000 });
  }

  addProjectDetails(): void {
    // Open a simple prompt flow for project details
    const jobNumber = window.prompt('Job Number:', this.record.jobNumber || '');
    if (jobNumber === null) return; // cancelled

    const fields: Partial<DashboardQuote> = {};
    if (jobNumber.trim()) fields.jobNumber = jobNumber.trim();

    const jobStart = window.prompt('Job Start Date (MM/DD/YYYY):', '');
    if (jobStart) {
      const parsed = new Date(jobStart);
      if (!isNaN(parsed.getTime())) {
        fields.jobStart = parsed.toISOString();
        this.record.jobStart = fields.jobStart;
      }
    }

    const jobComplete = window.prompt('Job Complete Date (MM/DD/YYYY, leave blank if not yet):', '');
    if (jobComplete) {
      const parsed = new Date(jobComplete);
      if (!isNaN(parsed.getTime())) {
        fields.jobComplete = parsed.toISOString();
        this.record.jobComplete = fields.jobComplete;
      }
    }

    const invoice = window.prompt('Invoice Number (leave blank if not yet):', '');
    if (invoice && invoice.trim()) {
      fields.invoiceNumber = invoice.trim();
      this.record.invoiceNumber = fields.invoiceNumber;
    }

    if (Object.keys(fields).length > 0) {
      this.store.dispatch(DashboardActions.updateDashboardFields({
        quoteId: this.record.id,
        fields
      }));
      if (fields.jobNumber) this.record.jobNumber = fields.jobNumber;
      this.buildTimeline();
      this.snackBar.open('Project details updated', 'Close', { duration: 3000 });
    }
  }

  // ─── Dialog Actions ────────────────────────────────────────────────────────

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
