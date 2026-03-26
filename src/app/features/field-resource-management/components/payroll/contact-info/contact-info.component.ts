import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { ContactInfoChange } from '../../../models/payroll.models';
import { PayrollService } from '../../../services/payroll.service';
import { FrmPermissionService } from '../../../services/frm-permission.service';
import { AuthService } from '../../../../../services/auth.service';
import { HasUnsavedChanges } from '../../../guards/unsaved-changes.guard';

@Component({
  selector: 'app-contact-info',
  styleUrls: ['../payroll-shared.scss'],
  template: `
    <div class="boes-container contact-info">
      <h2>Contact Information Update</h2>

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
      <form [formGroup]="contactForm"
            (ngSubmit)="onSubmit()"
            class="create-form">
        <h3>Submit Contact Info Change</h3>

        <div class="form-field">
          <label for="employeeId">Employee ID *</label>
          <input id="employeeId" formControlName="employeeId" placeholder="Enter Employee ID" />
          <span class="field-error"
                *ngIf="contactForm.get('employeeId')?.invalid && contactForm.get('employeeId')?.touched">
            Employee ID is required.
          </span>
        </div>

        <div class="form-field">
          <label for="address">Address</label>
          <input id="address" formControlName="address" placeholder="Enter Address" />
        </div>

        <div class="form-field">
          <label for="phone">Phone</label>
          <input id="phone" formControlName="phone" placeholder="Enter Phone Number" />
          <span class="field-error"
                *ngIf="contactForm.get('phone')?.hasError('invalidPhone') && contactForm.get('phone')?.touched">
            Phone must contain only digits, spaces, hyphens, parentheses, and + with at least 10 digits.
          </span>
        </div>

        <div class="form-field">
          <label for="email">Email</label>
          <input id="email" type="email" formControlName="email" placeholder="Enter Email" />
          <span class="field-error"
                *ngIf="contactForm.get('email')?.hasError('email') && contactForm.get('email')?.touched">
            Please enter a valid email address.
          </span>
        </div>

        <span class="field-error"
              *ngIf="contactForm.hasError('atLeastOneRequired') && contactForm.touched">
          At least one contact field (address, phone, or email) must be provided.
        </span>

        <button type="submit"
                [disabled]="contactForm.invalid || submitting">
          <span *ngIf="submitting">Submitting...</span>
          <span *ngIf="!submitting">Submit Change</span>
        </button>
      </form>

      <!-- History Section -->
      <div class="history-section">
        <h3>Contact Info History</h3>
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
              <th>Address</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Fields Changed</th>
              <th>Updated By</th>
              <th>Updated At</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let record of history">
              <td>{{ record.employeeId }}</td>
              <td>{{ record.address || '-' }}</td>
              <td>{{ record.phone || '-' }}</td>
              <td>{{ record.email || '-' }}</td>
              <td>{{ record.fieldsChanged.join(', ') || '-' }}</td>
              <td>{{ record.updatedBy }}</td>
              <td>{{ record.updatedAt | date:'short' }}</td>
            </tr>
          </tbody>
        </table>
        <p *ngIf="historyLoaded && history.length === 0">No contact info history found.</p>
      </div>
    </div>
  `
})
export class ContactInfoComponent implements OnInit, HasUnsavedChanges {
  history: ContactInfoChange[] = [];
  historyLoaded = false;
  submitting = false;
  errorMessage = '';
  successMessage = '';

  contactForm!: FormGroup;
  historyForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private payrollService: PayrollService,
    private permissionService: FrmPermissionService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const role = this.authService.getUserRole();
    if (!this.permissionService.hasPermission(role, 'canManageContactInfo')) {
      this.errorMessage = 'You do not have permission to manage contact information.';
    }

    this.contactForm = this.fb.group({
      employeeId: ['', Validators.required],
      address: [''],
      phone: ['', this.phoneValidator],
      email: ['', Validators.email]
    }, { validators: this.atLeastOneContactFieldValidator });

    this.historyForm = this.fb.group({
      employeeId: ['']
    });
  }

  hasUnsavedChanges(): boolean {
    return this.contactForm.dirty;
  }

  phoneValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value || !value.trim()) {
      return null; // phone is optional
    }
    // Only allow digits, spaces, hyphens, parentheses, and +
    const allowedPattern = /^[\d\s\-\(\)\+]+$/;
    if (!allowedPattern.test(value)) {
      return { invalidPhone: true };
    }
    // Count only digit characters — require at least 10
    const digitCount = (value.match(/\d/g) || []).length;
    if (digitCount < 10) {
      return { invalidPhone: true };
    }
    return null;
  }

  atLeastOneContactFieldValidator(control: AbstractControl): ValidationErrors | null {
    const address = control.get('address')?.value?.trim();
    const phone = control.get('phone')?.value?.trim();
    const email = control.get('email')?.value?.trim();
    if (!address && !phone && !email) {
      return { atLeastOneRequired: true };
    }
    return null;
  }

  loadHistory(): void {
    const employeeId = this.historyForm.get('employeeId')?.value?.trim();
    if (!employeeId) return;

    this.errorMessage = '';
    this.payrollService.getContactInfoHistory(employeeId).subscribe({
      next: (records) => {
        this.history = records.sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        this.historyLoaded = true;
      },
      error: (err) => {
        this.errorMessage = err?.message || 'Failed to load contact info history.';
        this.historyLoaded = true;
      }
    });
  }

  onSubmit(): void {
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const formValue = this.contactForm.value;
    const payload: any = {
      employeeId: formValue.employeeId
    };
    if (formValue.address?.trim()) payload.address = formValue.address.trim();
    if (formValue.phone?.trim()) payload.phone = formValue.phone.trim();
    if (formValue.email?.trim()) payload.email = formValue.email.trim();

    this.payrollService.submitContactInfoChange(payload).subscribe({
      next: () => {
        this.submitting = false;
        const user = this.authService.getUser();
        const submitterName = user?.name || 'Unknown';
        const timestamp = new Date().toLocaleString();
        this.successMessage = `Contact info change submitted by ${submitterName} at ${timestamp}.`;
        this.contactForm.reset({ employeeId: '', address: '', phone: '', email: '' });
      },
      error: (err) => {
        this.submitting = false;
        this.errorMessage = err?.message || 'Failed to submit contact info change.';
      }
    });
  }
}
