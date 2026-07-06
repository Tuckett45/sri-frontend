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
  editingProject = false;
  projectForm = {
    jobNumber: '',
    customerEquipment: '',
    jobStart: null as Date | null,
    jobComplete: null as Date | null,
    invoiceNumber: ''
  };

  editingRfp = false;
  rfpForm = {
    customer: '',
    description: '',
    requestorName: '',
    assignedToQuote: '',
    rfpReceiveDate: null as Date | null,
    quoteDueDate: null as Date | null,
    quoteSubmittedDate: null as Date | null,
    quoteNumber: '',
    poNumber: ''
  };

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
    this.startRfpEdit();
  }

  startRfpEdit(): void {
    this.rfpForm = {
      customer: this.record.customer || '',
      description: this.record.description || '',
      requestorName: this.record.requestorName || '',
      assignedToQuote: this.record.assignedToQuote || '',
      rfpReceiveDate: this.record.rfpReceiveDate ? new Date(this.record.rfpReceiveDate) : null,
      quoteDueDate: this.record.quoteDueDate ? new Date(this.record.quoteDueDate) : null,
      quoteSubmittedDate: this.record.quoteSubmittedDate ? new Date(this.record.quoteSubmittedDate) : null,
      quoteNumber: this.record.quoteNumber || '',
      poNumber: this.record.poNumber || ''
    };
    this.editingRfp = true;
  }

  cancelRfpEdit(): void {
    this.editingRfp = false;
  }

  saveRfpDetails(): void {
    const fields: Partial<DashboardQuote> = {};

    if (this.rfpForm.customer !== (this.record.customer || '')) {
      fields.customer = this.rfpForm.customer || '';
    }
    if (this.rfpForm.description !== (this.record.description || '')) {
      fields.description = this.rfpForm.description || '';
    }
    if (this.rfpForm.requestorName !== (this.record.requestorName || '')) {
      fields.requestorName = this.rfpForm.requestorName || '';
    }
    if (this.rfpForm.assignedToQuote !== (this.record.assignedToQuote || '')) {
      fields.assignedToQuote = this.rfpForm.assignedToQuote || null;
    }
    if (this.rfpForm.rfpReceiveDate) {
      const iso = new Date(this.rfpForm.rfpReceiveDate).toISOString();
      if (iso !== this.record.rfpReceiveDate) fields.rfpReceiveDate = iso;
    } else if (this.record.rfpReceiveDate) {
      fields.rfpReceiveDate = null;
    }
    if (this.rfpForm.quoteDueDate) {
      const iso = new Date(this.rfpForm.quoteDueDate).toISOString();
      if (iso !== this.record.quoteDueDate) fields.quoteDueDate = iso;
    } else if (this.record.quoteDueDate) {
      fields.quoteDueDate = null;
    }
    if (this.rfpForm.quoteSubmittedDate) {
      const iso = new Date(this.rfpForm.quoteSubmittedDate).toISOString();
      if (iso !== this.record.quoteSubmittedDate) fields.quoteSubmittedDate = iso;
    } else if (this.record.quoteSubmittedDate) {
      fields.quoteSubmittedDate = null;
    }
    if (this.rfpForm.quoteNumber !== (this.record.quoteNumber || '')) {
      fields.quoteNumber = this.rfpForm.quoteNumber || null;
    }
    if (this.rfpForm.poNumber !== (this.record.poNumber || '')) {
      fields.poNumber = this.rfpForm.poNumber || null;
    }

    if (Object.keys(fields).length > 0) {
      this.store.dispatch(DashboardActions.updateDashboardFields({
        quoteId: this.record.id,
        fields
      }));

      // Update local record immediately so the view refreshes
      if (fields.customer !== undefined) this.record.customer = fields.customer as string;
      if (fields.description !== undefined) this.record.description = fields.description as string;
      if (fields.requestorName !== undefined) this.record.requestorName = fields.requestorName as string;
      if (fields.assignedToQuote !== undefined) this.record.assignedToQuote = fields.assignedToQuote;
      if (fields.rfpReceiveDate !== undefined) this.record.rfpReceiveDate = fields.rfpReceiveDate;
      if (fields.quoteDueDate !== undefined) this.record.quoteDueDate = fields.quoteDueDate;
      if (fields.quoteSubmittedDate !== undefined) this.record.quoteSubmittedDate = fields.quoteSubmittedDate;
      if (fields.quoteNumber !== undefined) this.record.quoteNumber = fields.quoteNumber;
      if (fields.poNumber !== undefined) this.record.poNumber = fields.poNumber;

      // Refresh the record reference to trigger change detection
      this.data.record = { ...this.record };
      this.buildTimeline();

      // Reload dashboard data so the table behind updates
      this.store.dispatch(DashboardActions.loadDashboard({}));

      this.snackBar.open('RFP details updated', 'Close', { duration: 3000 });
    }

    this.editingRfp = false;
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
    this.startProjectEdit();
  }

  startProjectEdit(): void {
    this.projectForm = {
      jobNumber: this.record.jobNumber || '',
      customerEquipment: this.record.customerEquipment || '',
      jobStart: this.record.jobStart ? new Date(this.record.jobStart) : null,
      jobComplete: this.record.jobComplete ? new Date(this.record.jobComplete) : null,
      invoiceNumber: this.record.invoiceNumber || ''
    };
    this.editingProject = true;
  }

  cancelProjectEdit(): void {
    this.editingProject = false;
  }

  saveProjectDetails(): void {
    const fields: Partial<DashboardQuote> = {};

    if (this.projectForm.jobNumber !== (this.record.jobNumber || '')) {
      fields.jobNumber = this.projectForm.jobNumber || null;
    }
    if (this.projectForm.customerEquipment !== (this.record.customerEquipment || '')) {
      fields.customerEquipment = this.projectForm.customerEquipment || null;
    }
    if (this.projectForm.jobStart) {
      const iso = new Date(this.projectForm.jobStart).toISOString();
      if (iso !== this.record.jobStart) fields.jobStart = iso;
    } else if (this.record.jobStart) {
      fields.jobStart = null;
    }
    if (this.projectForm.jobComplete) {
      const iso = new Date(this.projectForm.jobComplete).toISOString();
      if (iso !== this.record.jobComplete) fields.jobComplete = iso;
    } else if (this.record.jobComplete) {
      fields.jobComplete = null;
    }
    if (this.projectForm.invoiceNumber !== (this.record.invoiceNumber || '')) {
      fields.invoiceNumber = this.projectForm.invoiceNumber || null;
    }

    if (Object.keys(fields).length > 0) {
      this.store.dispatch(DashboardActions.updateDashboardFields({
        quoteId: this.record.id,
        fields
      }));

      // Update local record immediately
      if (fields.jobNumber !== undefined) this.record.jobNumber = fields.jobNumber;
      if (fields.customerEquipment !== undefined) this.record.customerEquipment = fields.customerEquipment;
      if (fields.jobStart !== undefined) this.record.jobStart = fields.jobStart;
      if (fields.jobComplete !== undefined) this.record.jobComplete = fields.jobComplete;
      if (fields.invoiceNumber !== undefined) this.record.invoiceNumber = fields.invoiceNumber;

      // Refresh the record reference to trigger change detection
      this.data.record = { ...this.record };
      this.buildTimeline();

      // Reload dashboard data so the table behind updates
      this.store.dispatch(DashboardActions.loadDashboard({}));

      this.snackBar.open('Project details updated', 'Close', { duration: 3000 });
    }

    this.editingProject = false;
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
