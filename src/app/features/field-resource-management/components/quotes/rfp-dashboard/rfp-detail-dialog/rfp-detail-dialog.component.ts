import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { DashboardQuote } from '../../../../models/quote-workflow.model';

/**
 * RFP Detail Dialog Component
 *
 * Read-only detail view showing all RFP record info in a clean card layout.
 * Opens when clicking a row in the RFP tab instead of navigating to the
 * full workflow form.
 */
@Component({
  selector: 'app-rfp-detail-dialog',
  templateUrl: './rfp-detail-dialog.component.html',
  styleUrls: ['./rfp-detail-dialog.component.scss']
})
export class RfpDetailDialogComponent {

  constructor(
    public dialogRef: MatDialogRef<RfpDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { record: DashboardQuote },
    private router: Router
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

  openWorkflow(): void {
    this.dialogRef.close();
    this.router.navigate(['/field-resource-management/quotes', this.record.id]);
  }

  close(): void {
    this.dialogRef.close();
  }
}
