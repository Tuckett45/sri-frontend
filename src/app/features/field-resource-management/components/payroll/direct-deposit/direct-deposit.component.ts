import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { DirectDepositChange } from '../../../models/payroll.models';
import { PayrollService } from '../../../services/payroll.service';
import { FrmPermissionService } from '../../../services/frm-permission.service';
import { AuthService } from '../../../../../services/auth.service';
import { HasUnsavedChanges } from '../../../guards/unsaved-changes.guard';

@Component({
  selector: 'app-direct-deposit',
  styleUrls: ['../payroll-shared.scss'],
  template: `
    <div class="boes-container direct-deposit">
      <h2>Direct Deposit Change</h2>

      <!-- Error Banner -->
      <div class="error-banner" *ngIf="errorMessage">
        <span>{{ errorMessage }}</span>
        <button type="button" (click)="errorMessage = ''">Dismiss</button>
      </div>

      <!-- Success Banner -->
      <div class="success-banner" *ngIf="successMessage">
        <span>{{ successMessage }}</span>
        <button type="button" (click)="successMessage = ''">Dismiss</button>
      </div>

      <!-- Submit Form -->
      <form [formGroup]="depositForm"
            (ngSubmit)="onSubmit()"
            class="create-form">
        <h3>Submit Direct Deposit Change</h3>

        <div class="form-field">
          <label for="employeeId">Employee ID *</label>
          <input id="employeeId" formControlName="employeeId" placeholder="Enter Employee ID" />
          <span class="field-error"
                *ngIf="depositForm.get('employeeId')?.invalid && depositForm.get('employeeId')?.touched">
            Employee ID is required.
          </span>
        </div>

        <div class="form-field">
          <label for="bankName">Bank Name *</label>
          <input id="bankName" formControlName="bankName" placeholder="Enter Bank Name" />
          <span class="field-error"
                *ngIf="depositForm.get('bankName')?.invalid && depositForm.get('bankName')?.touched">
            Bank name is required.
          </span>
        </div>

        <div class="form-field">
          <label for="accountType">Account Type *</label>
          <select id="accountType" formControlName="accountType">
            <option value="" disabled>Select account type</option>
            <option value="checking">Checking</option>
            <option value="savings">Savings</option>
          </select>
          <span class="field-error"
                *ngIf="depositForm.get('accountType')?.invalid && depositForm.get('accountType')?.touched">
            Account type is required.
          </span>
        </div>

        <div class="form-field">
          <label for="routingNumber">Routing Number *</label>
          <input id="routingNumber" formControlName="routingNumber" placeholder="Enter Routing Number" />
          <span class="field-error"
                *ngIf="depositForm.get('routingNumber')?.invalid && depositForm.get('routingNumber')?.touched">
            Routing number is required.
          </span>
        </div>

        <div class="form-field">
          <label for="accountNumber">Account Number *</label>
          <input id="accountNumber" formControlName="accountNumber" placeholder="Enter Account Number" />
          <span class="field-error"
                *ngIf="depositForm.get('accountNumber')?.invalid && depositForm.get('accountNumber')?.touched">
            Account number is required.
          </span>
        </div>

        <div class="form-field">
          <label for="accountNumberConfirm">Confirm Account Number *</label>
          <input id="accountNumberConfirm" formControlName="accountNumberConfirm" placeholder="Re-enter Account Number" />
          <span class="field-error"
                *ngIf="depositForm.get('accountNumberConfirm')?.invalid && depositForm.get('accountNumberConfirm')?.touched">
            Account number confirmation is required.
          </span>
          <span class="field-error"
                *ngIf="depositForm.hasError('accountNumberMismatch') && depositForm.get('accountNumberConfirm')?.touched">
            Account numbers do not match.
          </span>
        </div>

        <button type="submit"
                [disabled]="depositForm.invalid || submitting">
          <span *ngIf="submitting">Submitting...</span>
          <span *ngIf="!submitting">Submit Change</span>
        </button>
      </form>

      <!-- History Section -->
      <div class="history-section">
        <h3>Direct Deposit History</h3>
        <div class="history-lookup" [formGroup]="historyForm">
          <div class="form-field">
            <label for="historyEmployeeId">Employee ID</label>
            <input id="historyEmployeeId" formControlName="employeeId" placeholder="Enter Employee ID" />
          </div>
          <button type="button" (click)="loadHistory()" [disabled]="!historyForm.get('employeeId')?.value">
            Load History
          </button>
        </div>

        <table *ngIf="history.length > 0">
          <thead>
            <tr>
              <th>Employee ID</th>
              <th>Bank Name</th>
              <th>Account Type</th>
              <th>Account (Last 4)</th>
              <th>Routing (Last 4)</th>
              <th>Submitted By</th>
              <th>Submitted At</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let record of history">
              <td>{{ record.employeeId }}</td>
              <td>{{ record.bankName }}</td>
              <td>{{ record.accountType }}</td>
              <td>****{{ record.bankAccountLast4 }}</td>
              <td>****{{ record.routingNumberLast4 }}</td>
              <td>{{ record.submittedBy }}</td>
              <td>{{ record.submittedAt | date:'short' }}</td>
            </tr>
          </tbody>
        </table>
        <p *ngIf="historyLoaded && history.length === 0">No direct deposit history found.</p>
      </div>
    </div>
  `
})
export class DirectDepositComponent implements OnInit, HasUnsavedChanges {
  history: DirectDepositChange[] = [];
  historyLoaded = false;
  submitting = false;
  errorMessage = '';
  successMessage = '';

  depositForm!: FormGroup;
  historyForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private payrollService: PayrollService,
    private permissionService: FrmPermissionService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const role = this.authService.getUserRole();
    if (!this.permissionService.hasPermission(role, 'canManageDirectDeposit')) {
      this.errorMessage = 'You do not have permission to manage direct deposit changes.';
    }

    this.depositForm = this.fb.group({
      employeeId: ['', Validators.required],
      bankName: ['', Validators.required],
      accountType: ['', Validators.required],
      routingNumber: ['', Validators.required],
      accountNumber: ['', Validators.required],
      accountNumberConfirm: ['', Validators.required]
    }, { validators: this.accountNumberMatchValidator });

    this.historyForm = this.fb.group({
      employeeId: ['']
    });
  }

  hasUnsavedChanges(): boolean {
    return this.depositForm.dirty;
  }

  accountNumberMatchValidator(control: AbstractControl): ValidationErrors | null {
    const accountNumber = control.get('accountNumber')?.value;
    const confirm = control.get('accountNumberConfirm')?.value;
    if (accountNumber && confirm && accountNumber !== confirm) {
      return { accountNumberMismatch: true };
    }
    return null;
  }

  maskNumber(value: string): string {
    if (!value || value.length <= 4) return value;
    return '****' + value.slice(-4);
  }

  loadHistory(): void {
    const employeeId = this.historyForm.get('employeeId')?.value?.trim();
    if (!employeeId) return;

    this.errorMessage = '';
    this.payrollService.getDirectDepositHistory(employeeId).subscribe({
      next: (records) => {
        this.history = records.sort(
          (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
        );
        this.historyLoaded = true;
      },
      error: (err) => {
        this.errorMessage = err?.message || 'Failed to load direct deposit history.';
        this.historyLoaded = true;
      }
    });
  }

  onSubmit(): void {
    if (this.depositForm.invalid) {
      this.depositForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const formValue = this.depositForm.value;
    const payload = {
      employeeId: formValue.employeeId,
      bankName: formValue.bankName,
      accountType: formValue.accountType,
      routingNumber: formValue.routingNumber,
      accountNumber: formValue.accountNumber,
      accountNumberConfirm: formValue.accountNumberConfirm
    };

    this.payrollService.submitDirectDepositChange(payload).subscribe({
      next: () => {
        this.submitting = false;
        const user = this.authService.getUser();
        const submitterName = user?.name || 'Unknown';
        const timestamp = new Date().toLocaleString();
        this.successMessage = `Direct deposit change submitted by ${submitterName} at ${timestamp}.`;
        this.depositForm.reset({ employeeId: '', bankName: '', accountType: '', routingNumber: '', accountNumber: '', accountNumberConfirm: '' });
      },
      error: (err) => {
        this.submitting = false;
        this.errorMessage = err?.message || 'Failed to submit direct deposit change.';
      }
    });
  }
}
