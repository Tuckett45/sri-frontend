import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TechnicianService } from '../../../services/technician.service';
import { OnboardingService } from '../../../services/onboarding.service';
import { Certification, CertificationStatus } from '../../../models/technician.model';
import { CredentialType } from '../../../models/credential-types.model';
import { CREDENTIAL_TYPE_REGISTRY, CredentialTypeConfig, CredentialFieldConfig, getCredentialTypeConfig } from '../../../config/credential-type-registry';
import { ssnLastFourValidator } from '../../../utils/ssn-validation.util';
import { computeCredentialStatus } from '../../../utils/credential-status.util';
import { HasUnsavedChanges } from '../../../guards/unsaved-changes.guard';

@Component({
  selector: 'app-credential-form',
  template: `
    <div class="credential-form-container">
      <h2 class="credential-form-title">{{ isEditMode ? 'Edit Credential' : 'Add Credential' }}</h2>

      <div *ngIf="saveErrorMessage" class="error-state">
        <p class="error-message">{{ saveErrorMessage }}</p>
        <button class="retry-button" (click)="onSubmit()">Retry</button>
      </div>

      <form [formGroup]="credentialForm" (ngSubmit)="onSubmit()" class="credential-form">
        <div class="form-field">
          <label for="credentialType" class="form-label">Credential Type</label>
          <select
            id="credentialType"
            formControlName="credentialType"
            class="form-input form-select"
          >
            <option value="">Select a credential type</option>
            <option *ngFor="let typeConfig of credentialTypeOptions" [value]="typeConfig.type">
              {{ typeConfig.label }}
            </option>
          </select>
          <span
            *ngIf="credentialForm.get('credentialType')?.touched && credentialForm.get('credentialType')?.hasError('required')"
            class="field-error"
          >
            Credential type is required.
          </span>
        </div>

        <div class="form-field">
          <label for="name" class="form-label">Name</label>
          <input
            id="name"
            type="text"
            formControlName="name"
            class="form-input"
            placeholder="Enter credential name"
          />
          <span
            *ngIf="credentialForm.get('name')?.touched && credentialForm.get('name')?.hasError('required')"
            class="field-error"
          >
            Name is required.
          </span>
        </div>

        <!-- Dynamic type-specific fields -->
        <ng-container *ngIf="selectedTypeConfig">
          <div *ngFor="let field of selectedTypeConfig.fields" class="form-field">
            <label [for]="field.name" class="form-label">{{ field.label }}</label>

            <!-- Text input -->
            <ng-container *ngIf="field.type === 'text' && field.name !== 'lastFourDigits'">
              <input
                [id]="field.name"
                type="text"
                [formControlName]="field.name"
                class="form-input"
                [placeholder]="'Enter ' + field.label.toLowerCase()"
              />
            </ng-container>

            <!-- SSN Last Four input with masking -->
            <ng-container *ngIf="field.name === 'lastFourDigits'">
              <input
                [id]="field.name"
                [type]="ssnMasked ? 'password' : 'text'"
                [formControlName]="field.name"
                class="form-input"
                placeholder="Enter last 4 digits of SSN"
                maxlength="4"
                (focus)="onSSNFocus()"
                (blur)="onSSNBlur()"
              />
              <span
                *ngIf="credentialForm.get('lastFourDigits')?.touched && credentialForm.get('lastFourDigits')?.hasError('ssnLastFour')"
                class="field-error"
              >
                Must be exactly 4 numeric digits.
              </span>
            </ng-container>

            <!-- Date input -->
            <ng-container *ngIf="field.type === 'date'">
              <input
                [id]="field.name"
                type="date"
                [formControlName]="field.name"
                class="form-input"
              />
            </ng-container>

            <!-- Select input -->
            <ng-container *ngIf="field.type === 'select'">
              <select
                [id]="field.name"
                [formControlName]="field.name"
                class="form-input form-select"
              >
                <option value="">Select {{ field.label.toLowerCase() }}</option>
                <option *ngFor="let option of field.options" [value]="option">
                  {{ option }}
                </option>
              </select>
            </ng-container>

            <!-- Validation errors for required fields -->
            <span
              *ngIf="credentialForm.get(field.name)?.touched && credentialForm.get(field.name)?.hasError('required') && field.name !== 'lastFourDigits'"
              class="field-error"
            >
              {{ field.label }} is required.
            </span>
          </div>
        </ng-container>

        <!-- Cross-field date validation error -->
        <div
          *ngIf="credentialForm.hasError('dateRange') && (credentialForm.get('expirationDate')?.touched || credentialForm.get('issueDate')?.touched)"
          class="cross-field-error"
        >
          <span class="field-error">
            Expiration date must be after issue date.
          </span>
        </div>

        <div *ngIf="credentialStatus" class="status-preview">
          <span class="status-label">Status Preview:</span>
          <span class="status-badge" [ngClass]="getStatusBadgeClass(credentialStatus)">
            {{ credentialStatus }}
          </span>
        </div>

        <div class="form-actions">
          <button
            type="submit"
            class="save-button"
            [disabled]="credentialForm.invalid || isSaving"
          >
            {{ isSaving ? 'Saving...' : 'Save' }}
          </button>
          <button
            type="button"
            class="cancel-button"
            (click)="onCancel()"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .credential-form-container {
      padding: 1.5rem;
      background-color: #f5f7fa;
      min-height: 100%;
    }

    .credential-form-title {
      margin: 0 0 1.5rem 0;
      font-size: 1.5rem;
      font-weight: 600;
      color: #212121;
    }

    .credential-form {
      background: #ffffff;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      padding: 1.5rem;
      max-width: 600px;
    }

    .form-field {
      margin-bottom: 1.25rem;
    }

    .form-label {
      display: block;
      margin-bottom: 0.375rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: #424242;
    }

    .form-input {
      width: 100%;
      padding: 0.5rem 0.75rem;
      border: 1px solid #bdbdbd;
      border-radius: 4px;
      font-size: 0.875rem;
      color: #212121;
      box-sizing: border-box;
      transition: border-color 0.2s;
    }

    .form-input:focus {
      outline: none;
      border-color: #1976d2;
      box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.1);
    }

    .form-select {
      appearance: auto;
      background-color: #ffffff;
    }

    .field-error {
      display: block;
      margin-top: 0.25rem;
      font-size: 0.75rem;
      color: #d32f2f;
    }

    .cross-field-error {
      margin-bottom: 1.25rem;
    }

    .status-preview {
      margin-bottom: 1.25rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .status-label {
      font-size: 0.875rem;
      font-weight: 500;
      color: #424242;
    }

    .status-badge {
      display: inline-block;
      padding: 0.125rem 0.5rem;
      border-radius: 12px;
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .status-badge.badge-active {
      background-color: #e8f5e9;
      color: #2e7d32;
    }

    .status-badge.badge-expiring-soon {
      background-color: #fff3e0;
      color: #e65100;
    }

    .status-badge.badge-expired {
      background-color: #ffebee;
      color: #c62828;
    }

    .form-actions {
      display: flex;
      gap: 0.75rem;
      padding-top: 0.75rem;
    }

    .save-button {
      padding: 0.5rem 1.25rem;
      background-color: #1976d2;
      color: #ffffff;
      border: none;
      border-radius: 4px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .save-button:hover:not(:disabled) {
      background-color: #1565c0;
    }

    .save-button:disabled {
      background-color: #90caf9;
      cursor: not-allowed;
    }

    .cancel-button {
      padding: 0.5rem 1.25rem;
      background-color: transparent;
      color: #616161;
      border: 1px solid #bdbdbd;
      border-radius: 4px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .cancel-button:hover {
      background-color: #f5f5f5;
    }

    .error-state {
      padding: 1rem;
      margin-bottom: 1rem;
      background: #ffebee;
      border: 1px solid #ef9a9a;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .error-message {
      color: #c62828;
      margin: 0;
      font-size: 0.875rem;
    }

    .retry-button {
      padding: 0.5rem 1.25rem;
      background-color: #1976d2;
      color: #ffffff;
      border: none;
      border-radius: 4px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
      white-space: nowrap;
    }

    .retry-button:hover {
      background-color: #1565c0;
    }

    @media (max-width: 768px) {
      .credential-form-container {
        padding: 1rem;
      }

      .credential-form {
        padding: 1rem;
      }
    }
  `]
})
export class CredentialFormComponent implements OnInit, OnDestroy, HasUnsavedChanges {
  credentialForm!: FormGroup;
  isEditMode = false;
  isSaving = false;
  saveErrorMessage = '';
  credentialStatus: CertificationStatus | null = null;
  credentialTypeOptions = CREDENTIAL_TYPE_REGISTRY;
  selectedTypeConfig: CredentialTypeConfig | null = null;
  ssnMasked = false;

  private technicianId = '';
  private credentialId = '';
  private submitted = false;
  private destroy$ = new Subject<void>();
  private currentTypeFields: string[] = [];

  constructor(
    private fb: FormBuilder,
    private technicianService: TechnicianService,
    private onboardingService: OnboardingService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.technicianId = this.route.snapshot.paramMap.get('candidateId') || '';
    this.credentialId = this.route.snapshot.paramMap.get('credentialId') || '';
    this.isEditMode = !!this.credentialId;

    this.initForm();

    if (this.isEditMode) {
      this.loadCredential();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  hasUnsavedChanges(): boolean {
    return this.credentialForm.dirty && !this.submitted;
  }

  onSSNFocus(): void {
    this.ssnMasked = false;
  }

  onSSNBlur(): void {
    const control = this.credentialForm.get('lastFourDigits');
    if (control && control.value) {
      this.ssnMasked = true;
    }
  }

  onSubmit(): void {
    if (this.credentialForm.invalid) {
      this.credentialForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    this.saveErrorMessage = '';

    const formValue = this.credentialForm.value;
    const selectedType: CredentialType = formValue.credentialType;

    // Build the credential data based on type
    const certificationData: any = {
      name: formValue.name,
      credentialType: selectedType
    };

    // Add type-specific fields
    if (this.selectedTypeConfig) {
      for (const field of this.selectedTypeConfig.fields) {
        if (formValue[field.name] !== undefined && formValue[field.name] !== '') {
          certificationData[field.name] = formValue[field.name];
        }
      }
    }

    // Compute status if expirationDate is present
    if (certificationData.expirationDate) {
      certificationData.status = computeCredentialStatus(new Date(certificationData.expirationDate));
    } else {
      certificationData.status = CertificationStatus.Active;
    }

    if (this.isEditMode) {
      this.technicianService.updateTechnicianCertification(this.technicianId, this.credentialId, certificationData)
        .subscribe({
          next: () => {
            this.submitted = true;
            this.updateLegacyBooleanFields(selectedType);
            this.navigateBack();
          },
          error: () => {
            this.isSaving = false;
            this.saveErrorMessage = 'Failed to save credential. Please try again.';
          }
        });
    } else {
      this.technicianService.addTechnicianCertification(this.technicianId, certificationData)
        .subscribe({
          next: () => {
            this.submitted = true;
            this.updateLegacyBooleanFields(selectedType);
            this.navigateBack();
          },
          error: () => {
            this.isSaving = false;
            this.saveErrorMessage = 'Failed to save credential. Please try again.';
          }
        });
    }
  }

  onCancel(): void {
    this.navigateBack();
  }

  getStatusBadgeClass(status: CertificationStatus | null): string {
    switch (status) {
      case CertificationStatus.Active:
        return 'badge-active';
      case CertificationStatus.ExpiringSoon:
        return 'badge-expiring-soon';
      case CertificationStatus.Expired:
        return 'badge-expired';
      default:
        return '';
    }
  }

  private initForm(): void {
    this.credentialForm = this.fb.group({
      credentialType: ['', Validators.required],
      name: ['', Validators.required]
    });

    // Listen for credential type changes to dynamically add/remove fields
    this.credentialForm.get('credentialType')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((type: CredentialType | '') => {
        this.onCredentialTypeChange(type);
      });
  }

  private onCredentialTypeChange(type: CredentialType | ''): void {
    // Remove previously added type-specific fields
    for (const fieldName of this.currentTypeFields) {
      this.credentialForm.removeControl(fieldName);
    }
    this.currentTypeFields = [];
    this.selectedTypeConfig = null;
    this.credentialStatus = null;

    // Remove the cross-field validator
    this.credentialForm.setValidators(null);

    if (!type) {
      this.credentialForm.updateValueAndValidity();
      return;
    }

    // Get the config for the selected type
    this.selectedTypeConfig = getCredentialTypeConfig(type);

    // Add form controls for each field in the type config
    let hasIssueDate = false;
    let hasExpirationDate = false;

    for (const field of this.selectedTypeConfig.fields) {
      const validators = [];

      if (field.required) {
        validators.push(Validators.required);
      }

      // Add SSN validator for lastFourDigits field
      if (field.name === 'lastFourDigits') {
        validators.push(ssnLastFourValidator);
      }

      this.credentialForm.addControl(field.name, new FormControl('', validators));
      this.currentTypeFields.push(field.name);

      if (field.name === 'issueDate') hasIssueDate = true;
      if (field.name === 'expirationDate') hasExpirationDate = true;
    }

    // Add cross-field date range validator if both issueDate and expirationDate are present
    if (hasIssueDate && hasExpirationDate) {
      this.credentialForm.setValidators(this.dateRangeValidator);

      // Listen for expirationDate changes to compute status preview
      this.credentialForm.get('expirationDate')!.valueChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe(value => {
          if (value) {
            this.credentialStatus = computeCredentialStatus(new Date(value));
          } else {
            this.credentialStatus = null;
          }
        });
    }

    this.credentialForm.updateValueAndValidity();
  }

  private dateRangeValidator(control: AbstractControl): ValidationErrors | null {
    const issueDate = control.get('issueDate')?.value;
    const expirationDate = control.get('expirationDate')?.value;

    if (issueDate && expirationDate) {
      const issue = new Date(issueDate);
      const expiration = new Date(expirationDate);
      if (expiration <= issue) {
        return { dateRange: true };
      }
    }

    return null;
  }

  private loadCredential(): void {
    this.technicianService.getTechnicianCertifications(this.technicianId).subscribe({
      next: (certifications) => {
        const credential = certifications.find(c => c.id === this.credentialId);
        if (credential) {
          this.populateForm(credential);
        }
      },
      error: () => {
        // Silently handle load error - form remains empty
      }
    });
  }

  private populateForm(credential: any): void {
    // Set the credential type first to trigger dynamic field creation
    const credentialType = credential.credentialType || '';
    if (credentialType) {
      this.credentialForm.patchValue({ credentialType });
      // Manually trigger the type change to add fields
      this.onCredentialTypeChange(credentialType);
    }

    // Patch common fields
    const patchData: any = { name: credential.name };

    // Patch type-specific fields
    if (this.selectedTypeConfig) {
      for (const field of this.selectedTypeConfig.fields) {
        if (credential[field.name] !== undefined) {
          let value = credential[field.name];
          // Format dates for input fields
          if (field.type === 'date' && value) {
            value = this.formatDateForInput(new Date(value));
          }
          patchData[field.name] = value;
        }
      }
    }

    this.credentialForm.patchValue(patchData);
    this.credentialForm.markAsPristine();

    // Compute status if expirationDate is present
    if (credential.expirationDate) {
      this.credentialStatus = computeCredentialStatus(new Date(credential.expirationDate));
    }

    // Mask SSN if it's an SSN type
    if (credentialType === 'SSN_Last_Four' && credential.lastFourDigits) {
      this.ssnMasked = true;
    }
  }

  private formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Fire-and-forget update of legacy boolean fields on the Candidate record.
   * When a Drug_Screen credential is saved, sets drugTestComplete to true.
   * When an OSHA_Training_Cert credential is saved, sets oshaCertified to true.
   * This ensures backward compatibility with existing onboarding pipeline views.
   */
  private updateLegacyBooleanFields(credentialType: CredentialType): void {
    if (credentialType === 'Drug_Screen') {
      this.onboardingService.updateCandidate(this.technicianId, { drugTestComplete: true })
        .subscribe({
          next: () => {},
          error: () => {} // Fire-and-forget: don't block navigation on failure
        });
    } else if (credentialType === 'OSHA_Training_Cert') {
      this.onboardingService.updateCandidate(this.technicianId, { oshaCertified: true })
        .subscribe({
          next: () => {},
          error: () => {} // Fire-and-forget: don't block navigation on failure
        });
    }
  }

  private navigateBack(): void {
    this.router.navigate([`../../${this.technicianId}`], { relativeTo: this.route });
  }
}
