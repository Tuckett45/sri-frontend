import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { W4Change } from '../../../models/payroll.models';
import { PayrollService } from '../../../services/payroll.service';
import { FrmPermissionService } from '../../../services/frm-permission.service';
import { AuthService } from '../../../../../services/auth.service';
import { HasUnsavedChanges } from '../../../guards/unsaved-changes.guard';

@Component({
  selector: 'app-w4',
  styleUrls: ['../payroll-shared.scss'],
  template: `
    <div class="boes-container w4">
      <h2>W-4 Change</h2>

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
      <form [formGroup]="w4Form"
            (ngSubmit)="onSubmit()"
            class="create-form">
        <h3>Submit W-4 Change</h3>

        <div class="form-field">
          <label for="employeeId">Employee ID *</label>
          <input id="employeeId" formControlName="employeeId" placeholder="Enter Employee ID" />
          <span class="field-error"
                *ngIf="w4Form.get('employeeId')?.invalid && w4Form.get('employeeId')?.touched">
            Employee ID is required.
          </span>
        </div>

        <div class="form-field">
          <label for="filingStatus">Filing Status *</label>
          <select id="filingStatus" formControlName="filingStatus">
            <option value="" disabled>Select filing status</option>
            <option value="single_or_married_filing_separately">Single or Married Filing Separately</option>
            <option value="married_filing_jointly">Married Filing Jointly</option>
            <option value="head_of_household">Head of Household</option>
          </select>
          <span class="field-error"
                *ngIf="w4Form.get('filingStatus')?.invalid && w4Form.get('filingStatus')?.touched">
            Filing status is required.
          </span>
        </div>

        <div class="form-field form-field-checkbox">
          <label for="multipleJobsOrSpouseWorks">
            <input id="multipleJobsOrSpouseWorks" type="checkbox" formControlName="multipleJobsOrSpouseWorks" />
            Multiple Jobs or Spouse Works
          </label>
        </div>

        <div class="form-field">
          <label for="claimDependents">Claim Dependents ($) *</label>
          <input id="claimDependents" type="number" formControlName="claimDependents" min="0" placeholder="0" />
          <span class="field-error"
                *ngIf="w4Form.get('claimDependents')?.hasError('required') && w4Form.get('claimDependents')?.touched">
            Claim dependents amount is required.
          </span>
          <span class="field-error"
                *ngIf="w4Form.get('claimDependents')?.hasError('min') && w4Form.get('claimDependents')?.touched">
            Value must be 0 or greater.
          </span>
        </div>

        <div class="form-field">
          <label for="otherIncome">Other Income ($) *</label>
          <input id="otherIncome" type="number" formControlName="otherIncome" min="0" placeholder="0" />
          <span class="field-error"
                *ngIf="w4Form.get('otherIncome')?.hasError('required') && w4Form.get('otherIncome')?.touched">
            Other income amount is required.
          </span>
          <span class="field-error"
                *ngIf="w4Form.get('otherIncome')?.hasError('min') && w4Form.get('otherIncome')?.touched">
            Value must be 0 or greater.
          </span>
        </div>

        <div class="form-field">
          <label for="deductions">Deductions ($) *</label>
          <input id="deductions" type="number" formControlName="deductions" min="0" placeholder="0" />
          <span class="field-error"
                *ngIf="w4Form.get('deductions')?.hasError('required') && w4Form.get('deductions')?.touched">
            Deductions amount is required.
          </span>
          <span class="field-error"
                *ngIf="w4Form.get('deductions')?.hasError('min') && w4Form.get('deductions')?.touched">
            Value must be 0 or greater.
          </span>
        </div>

        <div class="form-field">
          <label for="extraWithholding">Extra Withholding ($) *</label>
          <input id="extraWithholding" type="number" formControlName="extraWithholding" min="0" placeholder="0" />
          <span class="field-error"
                *ngIf="w4Form.get('extraWithholding')?.hasError('required') && w4Form.get('extraWithholding')?.touched">
            Extra withholding amount is required.
          </span>
          <span class="field-error"
                *ngIf="w4Form.get('extraWithholding')?.hasError('min') && w4Form.get('extraWithholding')?.touched">
            Value must be 0 or greater.
          </span>
        </div>

        <button type="submit"
                [disabled]="w4Form.invalid || submitting">
          <span *ngIf="submitting">Submitting...</span>
          <span *ngIf="!submitting">Submit W-4 Change</span>
        </button>
      </form>

      <!-- History Section -->
      <div class="history-section">
        <h3>W-4 History</h3>
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
              <th>Filing Status</th>
              <th>Multiple Jobs</th>
              <th>Dependents</th>
              <th>Other Income</th>
              <th>Deductions</th>
              <th>Extra Withholding</th>
              <th>Submitted By</th>
              <th>Submitted At</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let record of history">
              <td>{{ record.employeeId }}</td>
              <td>{{ record.filingStatus }}</td>
              <td>{{ record.multipleJobsOrSpouseWorks ? 'Yes' : 'No' }}</td>
              <td>{{ record.claimDependents | currency }}</td>
              <td>{{ record.otherIncome | currency }}</td>
              <td>{{ record.deductions | currency }}</td>
              <td>{{ record.extraWithholding | currency }}</td>
              <td>{{ record.submittedBy }}</td>
              <td>{{ record.submittedAt | date:'short' }}</td>
            </tr>
          </tbody>
        </table>
        <p *ngIf="historyLoaded && history.length === 0">No W-4 history found.</p>
      </div>
    </div>
  `
})
export class W4Component implements OnInit, HasUnsavedChanges {
  history: W4Change[] = [];
  historyLoaded = false;
  submitting = false;
  errorMessage = '';
  successMessage = '';

  w4Form!: FormGroup;
  historyForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private payrollService: PayrollService,
    private permissionService: FrmPermissionService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const role = this.authService.getUserRole();
    if (!this.permissionService.hasPermission(role, 'canManageW4')) {
      this.errorMessage = 'You do not have permission to manage W-4 changes.';
    }

    this.w4Form = this.fb.group({
      employeeId: ['', Validators.required],
      filingStatus: ['', Validators.required],
      multipleJobsOrSpouseWorks: [false],
      claimDependents: [0, [Validators.required, Validators.min(0)]],
      otherIncome: [0, [Validators.required, Validators.min(0)]],
      deductions: [0, [Validators.required, Validators.min(0)]],
      extraWithholding: [0, [Validators.required, Validators.min(0)]]
    });

    this.historyForm = this.fb.group({
      employeeId: ['']
    });
  }

  hasUnsavedChanges(): boolean {
    return this.w4Form.dirty;
  }

  loadHistory(): void {
    const employeeId = this.historyForm.get('employeeId')?.value?.trim();
    if (!employeeId) return;

    this.errorMessage = '';
    this.payrollService.getW4History(employeeId).subscribe({
      next: (records) => {
        this.history = records.sort(
          (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
        );
        this.historyLoaded = true;
      },
      error: (err) => {
        this.errorMessage = err?.message || 'Failed to load W-4 history.';
        this.historyLoaded = true;
      }
    });
  }

  onSubmit(): void {
    if (this.w4Form.invalid) {
      this.w4Form.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const formValue = this.w4Form.value;
    const payload = {
      employeeId: formValue.employeeId,
      filingStatus: formValue.filingStatus,
      multipleJobsOrSpouseWorks: formValue.multipleJobsOrSpouseWorks,
      claimDependents: formValue.claimDependents,
      otherIncome: formValue.otherIncome,
      deductions: formValue.deductions,
      extraWithholding: formValue.extraWithholding
    };

    this.payrollService.submitW4Change(payload).subscribe({
      next: () => {
        this.submitting = false;
        const user = this.authService.getUser();
        const submitterName = user?.name || 'Unknown';
        const timestamp = new Date().toLocaleString();
        this.successMessage = `W-4 change submitted by ${submitterName} at ${timestamp}.`;
        this.w4Form.reset({
          employeeId: '',
          filingStatus: '',
          multipleJobsOrSpouseWorks: false,
          claimDependents: 0,
          otherIncome: 0,
          deductions: 0,
          extraWithholding: 0
        });
      },
      error: (err) => {
        this.submitting = false;
        this.errorMessage = err?.message || 'Failed to submit W-4 change.';
      }
    });
  }
}
