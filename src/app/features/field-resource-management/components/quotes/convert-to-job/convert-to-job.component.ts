import {
  Component,
  OnInit,
  OnDestroy,
  Input,
  ChangeDetectionStrategy
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { take, takeUntil } from 'rxjs/operators';

import {
  QuoteWorkflow,
  WorkflowStatus,
  LaborTotals
} from '../../../models/quote-workflow.model';
import { BomCalculationService } from '../../../services/bom-calculation.service';
import * as QuoteActions from '../../../state/quotes/quote.actions';

/**
 * Convert to Job Component
 *
 * Provides the interface for converting a delivered quote into a Job.
 * - Available when Workflow_Status is Quote_Delivered
 * - Displays pre-populated job fields from quote data in a read-only summary:
 *   client name, site name, site address, customer contact, job type, priority,
 *   scope of work, estimated hours
 * - PO Number field (text, optional)
 * - SRI Job Number field (text, required)
 * - "Create Job" action dispatches convertToJob action which creates a Job via
 *   the backend, stores Job ID on the quote, updates status to Quote_Converted
 * - Displays link to created Job after conversion
 *
 * Requirements: 10.1–10.10
 */
@Component({
  selector: 'app-convert-to-job',
  templateUrl: './convert-to-job.component.html',
  styleUrls: ['./convert-to-job.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConvertToJobComponent implements OnInit, OnDestroy {
  @Input() canEdit = false;
  @Input() quoteId: string | null = null;
  @Input() quote: QuoteWorkflow | null = null;

  conversionForm!: FormGroup;
  isConverting = false;

  // Computed labor totals
  laborTotals: LaborTotals = { totalHours: 0, totalCost: 0 };

  private destroy$ = new Subject<void>();

  constructor(
    private store: Store,
    private actions$: Actions,
    private snackBar: MatSnackBar,
    private fb: FormBuilder,
    private router: Router,
    private bomCalculationService: BomCalculationService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.computeLaborTotals();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  get isDelivered(): boolean {
    return this.quote?.workflowStatus === WorkflowStatus.Quote_Delivered;
  }

  get isConverted(): boolean {
    return this.quote?.workflowStatus === WorkflowStatus.Quote_Converted;
  }

  get rfpRecord() {
    return this.quote?.rfpRecord ?? null;
  }

  get jobSummary() {
    return this.quote?.jobSummary ?? null;
  }

  get convertedJobId(): string | null {
    return this.quote?.convertedJobId ?? null;
  }

  get siteAddress(): string {
    const addr = this.rfpRecord?.siteAddress;
    if (!addr) return '—';
    return `${addr.street}, ${addr.city}, ${addr.state} ${addr.zipCode}`;
  }

  get customerContact(): string {
    const contact = this.rfpRecord?.customerContact;
    if (!contact) return '—';
    const parts = [contact.name];
    if (contact.phone) parts.push(contact.phone);
    if (contact.email) parts.push(contact.email);
    return parts.join(' · ');
  }

  get estimatedHours(): number {
    return this.laborTotals.totalHours;
  }

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------

  private initForm(): void {
    this.conversionForm = this.fb.group({
      poNumber: ['', [Validators.maxLength(100)]],
      sriJobNumber: ['', [Validators.required, Validators.maxLength(100)]]
    });

    // Pre-populate from quote if already converted
    if (this.quote?.poNumber) {
      this.conversionForm.patchValue({ poNumber: this.quote.poNumber });
    }
    if (this.quote?.sriJobNumber) {
      this.conversionForm.patchValue({ sriJobNumber: this.quote.sriJobNumber });
    }

    // Disable form if already converted or user cannot edit
    if (this.isConverted || !this.canEdit) {
      this.conversionForm.disable();
    }
  }

  private computeLaborTotals(): void {
    if (!this.jobSummary?.laborLineItems) return;
    this.laborTotals = this.bomCalculationService.computeLaborTotal(
      this.jobSummary.laborLineItems
    );
  }

  // ---------------------------------------------------------------------------
  // Create Job Action (Requirements 10.2, 10.3, 10.5, 10.6)
  // ---------------------------------------------------------------------------

  onCreateJob(): void {
    // Mark all fields as touched to show validation errors
    this.conversionForm.markAllAsTouched();

    if (this.isConverting || !this.quoteId || this.conversionForm.invalid) return;

    this.isConverting = true;

    const formValue = this.conversionForm.value;

    this.store.dispatch(QuoteActions.convertToJob({
      quoteId: this.quoteId,
      data: {
        poNumber: formValue.poNumber?.trim() || null,
        sriJobNumber: formValue.sriJobNumber.trim()
      }
    }));

    this.actions$
      .pipe(
        ofType(QuoteActions.convertToJobSuccess, QuoteActions.convertToJobFailure),
        take(1),
        takeUntil(this.destroy$)
      )
      .subscribe(action => {
        this.isConverting = false;

        if (action.type === QuoteActions.convertToJobSuccess.type) {
          this.snackBar.open('Job created successfully from quote.', 'Close', { duration: 3000 });
          this.conversionForm.disable();
        } else {
          const error = (action as ReturnType<typeof QuoteActions.convertToJobFailure>).error;
          this.snackBar.open(`Error creating job: ${error}`, 'Close', { duration: 5000 });
        }
      });
  }

  // ---------------------------------------------------------------------------
  // Navigation (Requirement 10.9)
  // ---------------------------------------------------------------------------

  goToJob(): void {
    if (this.convertedJobId) {
      this.router.navigate(['/field-resource-management/jobs', this.convertedJobId]);
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  formatDate(isoDate: string | null | undefined): string {
    if (!isoDate) return '—';
    const date = new Date(isoDate);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
