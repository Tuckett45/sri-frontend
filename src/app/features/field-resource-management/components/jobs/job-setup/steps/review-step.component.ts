import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { JobSetupFormValue } from '../../../../models/job-setup.models';

/**
 * Review Step Component
 *
 * Final step of the Job Setup Workflow. Displays a read-only summary
 * of all entered data across the three previous steps. Allows the user
 * to navigate back to any section via "Edit" links and handles the
 * submission state (loading indicator, error banner).
 *
 * Requirements: 6.1–6.7
 */
@Component({
  selector: 'app-review-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="step-container">
      <!-- Error Banner -->
      <div class="error-banner" *ngIf="submitError">
        <mat-icon color="warn">error</mat-icon>
        <span>{{ submitError }}</span>
      </div>

      <!-- Customer Information Section -->
      <div class="review-section">
        <div class="section-header">
          <h3 class="section-heading">Customer Information</h3>
          <a mat-button color="primary" (click)="editSection.emit(0)" [disabled]="submitting">Edit</a>
        </div>

        <div class="summary-grid">
          <div class="summary-item">
            <span class="summary-label">Client Name</span>
            <span class="summary-value">{{ formValue?.customerInfo?.clientName || '—' }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Site Name</span>
            <span class="summary-value">{{ formValue?.customerInfo?.siteName || '—' }}</span>
          </div>
          <div class="summary-item full-width">
            <span class="summary-label">Address</span>
            <span class="summary-value">{{ formatAddress() }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Contact Name</span>
            <span class="summary-value">{{ formValue?.customerInfo?.pocName || '—' }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Phone</span>
            <span class="summary-value">{{ formValue?.customerInfo?.pocPhone || '—' }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Email</span>
            <span class="summary-value">{{ formValue?.customerInfo?.pocEmail || '—' }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Target Start Date</span>
            <span class="summary-value">{{ formatDate(formValue?.customerInfo?.targetStartDate) }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Authorization Status</span>
            <span class="summary-value">{{ formatAuthorization() }}</span>
          </div>
          <div class="summary-item" *ngIf="formValue?.customerInfo?.hasPurchaseOrders">
            <span class="summary-label">Purchase Order #</span>
            <span class="summary-value">{{ formValue?.customerInfo?.purchaseOrderNumber || '—' }}</span>
          </div>
        </div>
      </div>

      <mat-divider></mat-divider>

      <!-- Pricing & Billing Section -->
      <div class="review-section">
        <div class="section-header">
          <h3 class="section-heading">Pricing &amp; Billing</h3>
          <a mat-button color="primary" (click)="editSection.emit(1)" [disabled]="submitting">Edit</a>
        </div>

        <div class="summary-grid">
          <div class="summary-item">
            <span class="summary-label">Standard Bill Rate</span>
            <span class="summary-value">{{ formValue?.pricingBilling?.standardBillRate | currency:'USD':'symbol':'1.2-2' }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Overtime Bill Rate</span>
            <span class="summary-value">{{ formValue?.pricingBilling?.overtimeBillRate | currency:'USD':'symbol':'1.2-2' }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Per Diem</span>
            <span class="summary-value">{{ formValue?.pricingBilling?.perDiem | currency:'USD':'symbol':'1.2-2' }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Invoicing Process</span>
            <span class="summary-value">{{ formatInvoicing() }}</span>
          </div>
        </div>
      </div>

      <mat-divider></mat-divider>

      <!-- SRI Internal Section -->
      <div class="review-section">
        <div class="section-header">
          <h3 class="section-heading">SRI Internal</h3>
          <a mat-button color="primary" (click)="editSection.emit(2)" [disabled]="submitting">Edit</a>
        </div>

        <div class="summary-grid">
          <div class="summary-item">
            <span class="summary-label">Project Director</span>
            <span class="summary-value">{{ formValue?.sriInternal?.projectDirector || '—' }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Target Resources</span>
            <span class="summary-value">{{ formValue?.sriInternal?.targetResources ?? '—' }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Biz Dev Contact</span>
            <span class="summary-value">{{ formValue?.sriInternal?.bizDevContact || '—' }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Requested Hours</span>
            <span class="summary-value">{{ formValue?.sriInternal?.requestedHours ?? '—' }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Overtime Required</span>
            <span class="summary-value">{{ formValue?.sriInternal?.overtimeRequired ? 'Yes' : 'No' }}</span>
          </div>
          <div class="summary-item" *ngIf="formValue?.sriInternal?.overtimeRequired">
            <span class="summary-label">Estimated Overtime Hours</span>
            <span class="summary-value">{{ formValue?.sriInternal?.estimatedOvertimeHours ?? '—' }}</span>
          </div>
        </div>
      </div>

      <!-- Loading Indicator -->
      <div class="loading-overlay" *ngIf="submitting">
        <mat-spinner diameter="32"></mat-spinner>
        <span>Submitting job...</span>
      </div>
    </div>
  `,
  styles: [`
    .step-container {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 16px 0;
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background-color: #fdecea;
      border: 1px solid #f5c6cb;
      border-radius: 4px;
      color: #611a15;
      margin-bottom: 16px;
    }

    .review-section {
      padding: 8px 0;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .section-heading {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
      color: rgba(0, 0, 0, 0.7);
    }

    .summary-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .summary-item {
      display: flex;
      flex-direction: column;
    }

    .summary-item.full-width {
      grid-column: 1 / -1;
    }

    .summary-label {
      font-size: 12px;
      color: rgba(0, 0, 0, 0.54);
      margin-bottom: 4px;
    }

    .summary-value {
      font-size: 14px;
      font-weight: 500;
    }

    .loading-overlay {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      margin-top: 16px;
      background-color: #fafafa;
      border-radius: 4px;
    }

    @media (max-width: 600px) {
      .summary-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ReviewStepComponent {
  @Input() formValue!: JobSetupFormValue;
  @Input() submitting = false;
  @Input() submitError: string | null = null;

  @Output() editSection = new EventEmitter<number>();

  /** Invoicing process label map */
  private invoicingLabels: Record<string, string> = {
    'weekly': 'Weekly',
    'bi-weekly': 'Bi-Weekly',
    'monthly': 'Monthly',
    'per-milestone': 'Per Milestone',
    'upon-completion': 'Upon Completion'
  };

  formatAddress(): string {
    const ci = this.formValue?.customerInfo;
    if (!ci) return '—';
    const parts = [ci.street, ci.city, ci.state, ci.zipCode].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : '—';
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  formatAuthorization(): string {
    const status = this.formValue?.customerInfo?.authorizationStatus;
    if (status === 'authorized') return 'Authorized';
    if (status === 'pending') return 'Pending Authorization';
    return '—';
  }

  formatInvoicing(): string {
    const value = this.formValue?.pricingBilling?.invoicingProcess;
    return value ? (this.invoicingLabels[value] || value) : '—';
  }
}
