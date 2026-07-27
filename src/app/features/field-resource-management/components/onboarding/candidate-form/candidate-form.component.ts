import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { OnboardingService } from '../../../services/onboarding.service';
import { HasUnsavedChanges } from '../../../guards/unsaved-changes.guard';
import { getValidTransitions } from '../../../utils/offer-status.util';
import {
  Candidate,
  OfferStatus,
  VestSize,
} from '../../../models/onboarding.models';

const VEST_SIZES: VestSize[] = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];

const ALL_OFFER_STATUSES: { value: OfferStatus; label: string }[] = [
  { value: 'pre_offer', label: 'Pre Offer' },
  { value: 'offer', label: 'Offer' },
  { value: 'offer_acceptance', label: 'Offer Acceptance' },
];

@Component({
  selector: 'app-candidate-form',
  template: `
    <div class="candidate-form-container">
      <h2>{{ isEditMode ? 'Edit Candidate' : 'Add Candidate' }}</h2>

      <!-- Error Banner -->
      <div class="error-banner" *ngIf="errorMessage" role="alert">
        <span>{{ errorMessage }}</span>
        <button type="button" (click)="errorMessage = ''" aria-label="Dismiss error">Dismiss</button>
      </div>

      <!-- Success Banner -->
      <div class="success-banner" *ngIf="successMessage" role="status">
        <span>{{ successMessage }}</span>
        <button type="button" (click)="successMessage = ''" aria-label="Dismiss success message">Dismiss</button>
      </div>

      <!-- Loading state for edit mode -->
      <div *ngIf="loading" class="loading-indicator">
        <span>Loading candidate data...</span>
      </div>

      <form *ngIf="!loading"
            [formGroup]="candidateForm"
            (ngSubmit)="onSubmit()"
            class="candidate-form"
            novalidate>

        <!-- Tech Name -->
        <div class="form-field">
          <label for="techName">Tech Name *</label>
          <input id="techName"
                 formControlName="techName"
                 placeholder="Enter technician name"
                 (blur)="markTouched('techName')" />
          <span class="field-error"
                *ngIf="showError('techName')">
            Tech Name is required.
          </span>
        </div>

        <!-- Tech Email -->
        <div class="form-field">
          <label for="techEmail">Tech Email *</label>
          <input id="techEmail"
                 type="email"
                 formControlName="techEmail"
                 placeholder="Enter email address"
                 (blur)="markTouched('techEmail')" />
          <span class="field-error"
                *ngIf="showError('techEmail')">
            <ng-container *ngIf="candidateForm.get('techEmail')?.hasError('required')">
              Tech Email is required.
            </ng-container>
            <ng-container *ngIf="!candidateForm.get('techEmail')?.hasError('required') && candidateForm.get('techEmail')?.hasError('email')">
              Please enter a valid email address.
            </ng-container>
          </span>
        </div>

        <!-- Tech Phone -->
        <div class="form-field">
          <label for="techPhone">Tech Phone *</label>
          <input id="techPhone"
                 formControlName="techPhone"
                 placeholder="Enter phone number"
                 (blur)="markTouched('techPhone')" />
          <span class="field-error"
                *ngIf="showError('techPhone')">
            <ng-container *ngIf="candidateForm.get('techPhone')?.hasError('required')">
              Tech Phone is required.
            </ng-container>
            <ng-container *ngIf="!candidateForm.get('techPhone')?.hasError('required') && candidateForm.get('techPhone')?.hasError('invalidPhone')">
              Phone must contain only digits, spaces, hyphens, parentheses, and + with at least 10 digits.
            </ng-container>
          </span>
        </div>

        <!-- Vest Size -->
        <div class="form-field">
          <label for="vestSize">Vest Size *</label>
          <select id="vestSize"
                  formControlName="vestSize"
                  (blur)="markTouched('vestSize')">
            <option value="" disabled>Select vest size</option>
            <option *ngFor="let size of vestSizes" [value]="size">{{ size }}</option>
          </select>
          <span class="field-error"
                *ngIf="showError('vestSize')">
            Vest Size is required.
          </span>
        </div>

        <!-- Work Site -->
        <div class="form-field">
          <label for="workSite">Work Site *</label>
          <input id="workSite"
                 formControlName="workSite"
                 placeholder="Enter work site"
                 (blur)="markTouched('workSite')" />
          <span class="field-error"
                *ngIf="showError('workSite')">
            Work Site is required.
          </span>
        </div>

        <!-- Start Date -->
        <div class="form-field">
          <label for="startDate">Start Date *</label>
          <input id="startDate"
                 type="date"
                 formControlName="startDate"
                 (blur)="markTouched('startDate')" />
          <span class="field-error"
                *ngIf="showError('startDate')">
            Start Date is required.
          </span>
        </div>

        <!-- Offer Status -->
        <div class="form-field">
          <label for="offerStatus">Offer Status *</label>
          <select id="offerStatus"
                  formControlName="offerStatus"
                  (blur)="markTouched('offerStatus')">
            <option value="" disabled>Select offer status</option>
            <option *ngFor="let status of availableStatuses" [value]="status.value">
              {{ status.label }}
            </option>
          </select>
          <span class="field-error"
                *ngIf="showError('offerStatus')">
            Offer Status is required.
          </span>
        </div>

        <!-- Certification & Drug Test checkboxes (edit mode only) -->
        <ng-container *ngIf="isEditMode">
          <div class="form-field checkbox-field">
            <label>
              <input type="checkbox" formControlName="drugTestComplete" />
              Drug Test Complete
            </label>
          </div>

          <div class="form-field checkbox-field">
            <label>
              <input type="checkbox" formControlName="oshaCertified" />
              OSHA Certified
            </label>
          </div>

          <div class="form-field checkbox-field">
            <label>
              <input type="checkbox" formControlName="scissorLiftCertified" />
              Scissor Lift Certified
            </label>
          </div>

          <div class="form-field checkbox-field">
            <label>
              <input type="checkbox" formControlName="biisciCertified" />
              BIISCI Certified
            </label>
          </div>
        </ng-container>

        <!-- Submit Button -->
        <div class="form-actions">
          <button type="submit"
                  [disabled]="submitting"
                  class="submit-btn">
            <span *ngIf="submitting" class="spinner" aria-hidden="true"></span>
            <span *ngIf="submitting">{{ isEditMode ? 'Updating...' : 'Creating...' }}</span>
            <span *ngIf="!submitting">{{ isEditMode ? 'Update Candidate' : 'Create Candidate' }}</span>
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .candidate-form-container {
      max-width: 640px;
      margin: 1.5rem auto;
      padding: 1.5rem;
      background: #ffffff;
      border-radius: 8px;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
    }

    h2 {
      margin: 0 0 1.25rem;
      font-size: 1.25rem;
      font-weight: 600;
      color: #212121;
    }

    .error-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      margin-bottom: 1rem;
      background: #fdecea;
      border: 1px solid #f5c6cb;
      border-radius: 4px;
      color: #b71c1c;
      font-size: 0.875rem;
    }

    .error-banner button {
      background: none;
      border: none;
      color: #b71c1c;
      cursor: pointer;
      font-weight: 600;
      text-decoration: underline;
    }

    .success-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      margin-bottom: 1rem;
      background: #e8f5e9;
      border: 1px solid #c8e6c9;
      border-radius: 4px;
      color: #2e7d32;
      font-size: 0.875rem;
    }

    .success-banner button {
      background: none;
      border: none;
      color: #2e7d32;
      cursor: pointer;
      font-weight: 600;
      text-decoration: underline;
    }

    .loading-indicator {
      text-align: center;
      padding: 2rem;
      color: #757575;
    }

    .candidate-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .form-field label {
      font-size: 0.875rem;
      font-weight: 500;
      color: #424242;
    }

    .form-field input,
    .form-field select {
      padding: 0.5rem 0.75rem;
      border: 1px solid #bdbdbd;
      border-radius: 4px;
      font-size: 0.875rem;
      transition: border-color 0.2s;
    }

    .form-field input:focus,
    .form-field select:focus {
      outline: none;
      border-color: #1976d2;
      box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.2);
    }

    .field-error {
      color: #d32f2f;
      font-size: 0.75rem;
    }

    .checkbox-field {
      flex-direction: row;
      align-items: center;
      gap: 0.5rem;
    }

    .checkbox-field label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
    }

    .checkbox-field input[type="checkbox"] {
      width: 1rem;
      height: 1rem;
    }

    .form-actions {
      margin-top: 0.5rem;
    }

    .submit-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 1.5rem;
      background: #1976d2;
      color: #ffffff;
      border: none;
      border-radius: 4px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }

    .submit-btn:hover:not(:disabled) {
      background: #1565c0;
    }

    .submit-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .spinner {
      display: inline-block;
      width: 1rem;
      height: 1rem;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @media (max-width: 768px) {
      .candidate-form-container {
        margin: 1rem;
        padding: 1rem;
      }
    }
  `]
})
export class CandidateFormComponent implements OnInit, HasUnsavedChanges {
  candidateForm!: FormGroup;
  isEditMode = false;
  candidateId: string | null = null;
  loading = false;
  submitting = false;
  errorMessage = '';
  successMessage = '';
  submitted = false;

  vestSizes = VEST_SIZES;
  availableStatuses = ALL_OFFER_STATUSES;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private onboardingService: OnboardingService
  ) {}

  ngOnInit(): void {
    this.candidateId = this.route.snapshot.params['candidateId'] || null;
    this.isEditMode = !!this.candidateId;

    this.buildForm();

    if (this.isEditMode && this.candidateId) {
      this.loadCandidate(this.candidateId);
    } else {
      // Create mode defaults
      this.candidateForm.patchValue({ offerStatus: 'pre_offer' });
    }
  }

  hasUnsavedChanges(): boolean {
    return this.candidateForm.dirty && !this.submitted;
  }

  showError(controlName: string): boolean {
    const control = this.candidateForm.get(controlName);
    if (!control) return false;
    return control.invalid && (control.touched || this.submitted);
  }

  markTouched(controlName: string): void {
    this.candidateForm.get(controlName)?.markAsTouched();
  }

  onSubmit(): void {
    this.submitted = true;
    this.candidateForm.markAllAsTouched();

    if (this.candidateForm.invalid) {
      return;
    }

    this.submitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    if (this.isEditMode && this.candidateId) {
      this.updateCandidate();
    } else {
      this.createCandidate();
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private buildForm(): void {
    this.candidateForm = this.fb.group({
      techName: ['', Validators.required],
      techEmail: ['', [Validators.required, Validators.email]],
      techPhone: ['', [Validators.required, CandidateFormComponent.phoneValidator]],
      vestSize: ['', Validators.required],
      workSite: ['', Validators.required],
      startDate: ['', Validators.required],
      offerStatus: ['', Validators.required],
      drugTestComplete: [false],
      oshaCertified: [false],
      scissorLiftCertified: [false],
      biisciCertified: [false],
    });
  }

  static phoneValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value || !value.trim()) {
      return null; // let required validator handle empty
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

  private loadCandidate(id: string): void {
    this.loading = true;
    this.errorMessage = '';

    this.onboardingService.getCandidateById(id).subscribe({
      next: (candidate) => {
        this.populateForm(candidate);
        this.updateAvailableStatuses(candidate.offerStatus);
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.message || 'Failed to load candidate data.';
      },
    });
  }

  private populateForm(candidate: Candidate): void {
    this.candidateForm.patchValue({
      techName: candidate.techName,
      techEmail: candidate.techEmail,
      techPhone: candidate.techPhone,
      vestSize: candidate.vestSize,
      workSite: candidate.workSite,
      startDate: candidate.startDate,
      offerStatus: candidate.offerStatus,
      drugTestComplete: candidate.drugTestComplete,
      oshaCertified: candidate.oshaCertified,
      scissorLiftCertified: candidate.scissorLiftCertified,
      biisciCertified: candidate.biisciCertified,
    });
    // Reset dirty state after population
    this.candidateForm.markAsPristine();
  }

  private updateAvailableStatuses(currentStatus: OfferStatus): void {
    const validTargets = getValidTransitions(currentStatus);
    // Include the current status itself plus valid transitions
    const allowedValues = [currentStatus, ...validTargets];
    this.availableStatuses = ALL_OFFER_STATUSES.filter((s) =>
      allowedValues.includes(s.value)
    );
  }

  private createCandidate(): void {
    const formValue = this.candidateForm.value;
    const payload = {
      techName: formValue.techName,
      techEmail: formValue.techEmail,
      techPhone: formValue.techPhone,
      vestSize: formValue.vestSize,
      workSite: formValue.workSite,
      startDate: formValue.startDate,
      offerStatus: formValue.offerStatus,
    };

    this.onboardingService.createCandidate(payload).subscribe({
      next: () => {
        this.submitting = false;
        this.submitted = true;
        this.successMessage = 'Candidate created successfully.';
        this.candidateForm.reset();
        this.candidateForm.markAsPristine();
        this.router.navigate(['../'], { relativeTo: this.route });
      },
      error: (err) => {
        this.submitting = false;
        this.errorMessage = err?.message || 'Failed to create candidate.';
      },
    });
  }

  private updateCandidate(): void {
    const formValue = this.candidateForm.value;
    const payload = {
      techName: formValue.techName,
      techEmail: formValue.techEmail,
      techPhone: formValue.techPhone,
      vestSize: formValue.vestSize,
      workSite: formValue.workSite,
      startDate: formValue.startDate,
      offerStatus: formValue.offerStatus,
      drugTestComplete: formValue.drugTestComplete,
      oshaCertified: formValue.oshaCertified,
      scissorLiftCertified: formValue.scissorLiftCertified,
      biisciCertified: formValue.biisciCertified,
    };

    this.onboardingService.updateCandidate(this.candidateId!, payload).subscribe({
      next: () => {
        this.submitting = false;
        this.submitted = true;
        this.successMessage = 'Candidate updated successfully.';
        this.candidateForm.markAsPristine();
      },
      error: (err) => {
        this.submitting = false;
        this.errorMessage = err?.message || 'Failed to update candidate.';
      },
    });
  }
}
