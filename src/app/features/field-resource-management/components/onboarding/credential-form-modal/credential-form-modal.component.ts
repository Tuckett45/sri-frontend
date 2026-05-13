import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TechnicianService } from '../../../services/technician.service';
import { OnboardingService } from '../../../services/onboarding.service';
import { Technician, CertificationStatus } from '../../../models/technician.model';
import { CredentialType } from '../../../models/credential-types.model';
import { CREDENTIAL_TYPE_REGISTRY, CredentialTypeConfig, getCredentialTypeConfig } from '../../../config/credential-type-registry';
import { ssnLastFourValidator } from '../../../utils/ssn-validation.util';
import { computeCredentialStatus } from '../../../utils/credential-status.util';

export interface CredentialFormModalData {
  technicianId: string;
  technician?: Technician;
  credential?: any;  // Existing credential for edit mode
}

@Component({
  selector: 'app-credential-form-modal',
  template: `
    <h2 mat-dialog-title>{{ data.credential ? 'Edit' : 'Add' }} Credential{{ data.technician ? ' \u2014 ' + data.technician.firstName + ' ' + data.technician.lastName : '' }}</h2>

    <mat-dialog-content>
      <div *ngIf="saveErrorMessage" class="error-state">
        <p class="error-message">{{ saveErrorMessage }}</p>
      </div>

      <form [formGroup]="credentialForm" (ngSubmit)="onSubmit()" class="credential-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Credential Type</mat-label>
          <mat-select formControlName="credentialType">
            <mat-option value="">Select a credential type</mat-option>
            <mat-option *ngFor="let typeConfig of credentialTypeOptions" [value]="typeConfig.type">
              {{ typeConfig.label }}
            </mat-option>
          </mat-select>
          <mat-error *ngIf="credentialForm.get('credentialType')?.hasError('required')">
            Credential type is required.
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Name</mat-label>
          <input matInput formControlName="name" placeholder="Enter credential name" />
          <mat-error *ngIf="credentialForm.get('name')?.hasError('required')">
            Name is required.
          </mat-error>
        </mat-form-field>

        <!-- Dynamic type-specific fields -->
        <ng-container *ngIf="selectedTypeConfig">
          <div *ngFor="let field of selectedTypeConfig.fields">

            <!-- Text input -->
            <mat-form-field appearance="outline" class="full-width"
              *ngIf="field.type === 'text' && field.name !== 'lastFourDigits'">
              <mat-label>{{ field.label }}</mat-label>
              <input matInput [formControlName]="field.name" [placeholder]="'Enter ' + field.label.toLowerCase()" />
              <mat-error *ngIf="credentialForm.get(field.name)?.hasError('required')">
                {{ field.label }} is required.
              </mat-error>
            </mat-form-field>

            <!-- SSN Last Four input -->
            <mat-form-field appearance="outline" class="full-width"
              *ngIf="field.name === 'lastFourDigits'">
              <mat-label>{{ field.label }}</mat-label>
              <input matInput
                [type]="ssnMasked ? 'password' : 'text'"
                [formControlName]="field.name"
                placeholder="Enter last 4 digits of SSN"
                maxlength="4"
                (focus)="onSSNFocus()"
                (blur)="onSSNBlur()" />
              <mat-error *ngIf="credentialForm.get('lastFourDigits')?.hasError('ssnLastFour')">
                Must be exactly 4 numeric digits.
              </mat-error>
            </mat-form-field>

            <!-- Date input -->
            <mat-form-field appearance="outline" class="full-width" *ngIf="field.type === 'date'">
              <mat-label>{{ field.label }}</mat-label>
              <input matInput type="date" [formControlName]="field.name" />
              <mat-error *ngIf="credentialForm.get(field.name)?.hasError('required')">
                {{ field.label }} is required.
              </mat-error>
            </mat-form-field>

            <!-- Select input -->
            <mat-form-field appearance="outline" class="full-width" *ngIf="field.type === 'select'">
              <mat-label>{{ field.label }}</mat-label>
              <mat-select [formControlName]="field.name">
                <mat-option value="">Select {{ field.label.toLowerCase() }}</mat-option>
                <mat-option *ngFor="let option of field.options" [value]="option">
                  {{ option }}
                </mat-option>
              </mat-select>
              <mat-error *ngIf="credentialForm.get(field.name)?.hasError('required')">
                {{ field.label }} is required.
              </mat-error>
            </mat-form-field>
          </div>
        </ng-container>

        <!-- Cross-field date validation error -->
        <div
          *ngIf="credentialForm.hasError('dateRange') && (credentialForm.get('expirationDate')?.touched || credentialForm.get('issueDate')?.touched)"
          class="cross-field-error"
        >
          <span class="field-error">Expiration date must be after issue date.</span>
        </div>

        <div *ngIf="credentialStatus" class="status-preview">
          <span class="status-label">Status Preview:</span>
          <span class="status-badge" [ngClass]="getStatusBadgeClass(credentialStatus)">
            {{ credentialStatus }}
          </span>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary"
        [disabled]="credentialForm.invalid || isSaving"
        (click)="onSubmit()">
        {{ isSaving ? 'Saving...' : 'Save' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .credential-form {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 450px;
      padding-top: 8px;
    }

    .full-width {
      width: 100%;
    }

    .error-state {
      padding: 0.75rem 1rem;
      margin-bottom: 0.75rem;
      background: #ffebee;
      border: 1px solid #ef9a9a;
      border-radius: 4px;
    }

    .error-message {
      color: #c62828;
      margin: 0;
      font-size: 0.875rem;
    }

    .cross-field-error {
      margin-bottom: 0.5rem;
    }

    .field-error {
      font-size: 0.75rem;
      color: #d32f2f;
    }

    .status-preview {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.5rem;
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

    @media (max-width: 600px) {
      .credential-form {
        min-width: unset;
      }
    }
  `]
})
export class CredentialFormModalComponent implements OnInit, OnDestroy {
  credentialForm!: FormGroup;
  isSaving = false;
  saveErrorMessage = '';
  credentialStatus: CertificationStatus | null = null;
  credentialTypeOptions = CREDENTIAL_TYPE_REGISTRY;
  selectedTypeConfig: CredentialTypeConfig | null = null;
  ssnMasked = false;

  private destroy$ = new Subject<void>();
  private currentTypeFields: string[] = [];

  constructor(
    private fb: FormBuilder,
    private technicianService: TechnicianService,
    private onboardingService: OnboardingService,
    private dialogRef: MatDialogRef<CredentialFormModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CredentialFormModalData
  ) {}

  ngOnInit(): void {
    this.initForm();

    // Pre-fill form if editing an existing credential
    if (this.data.credential) {
      const cred = this.data.credential;
      if (cred.credentialType) {
        this.credentialForm.patchValue({ credentialType: cred.credentialType });
        this.onCredentialTypeChange(cred.credentialType);
      }
      this.credentialForm.patchValue({ name: cred.name || '' });

      // Patch type-specific fields after they've been added
      if (this.selectedTypeConfig) {
        const patchData: any = {};
        for (const field of this.selectedTypeConfig.fields) {
          if (cred[field.name] !== undefined) {
            patchData[field.name] = cred[field.name];
          }
        }
        this.credentialForm.patchValue(patchData);
      }
      this.credentialForm.markAsPristine();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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

    const certificationData: any = {
      name: formValue.name,
      credentialType: selectedType
    };

    if (this.selectedTypeConfig) {
      for (const field of this.selectedTypeConfig.fields) {
        if (formValue[field.name] !== undefined && formValue[field.name] !== '') {
          certificationData[field.name] = formValue[field.name];
        }
      }
    }

    if (certificationData.expirationDate) {
      certificationData.status = computeCredentialStatus(new Date(certificationData.expirationDate));
    } else {
      certificationData.status = CertificationStatus.Active;
    }

    this.technicianService.addTechnicianCertification(this.data.technicianId, certificationData)
      .subscribe({
        next: () => {
          this.updateLegacyBooleanFields(selectedType);
          this.dialogRef.close(true);
        },
        error: () => {
          this.isSaving = false;
          this.saveErrorMessage = 'Failed to save credential. Please try again.';
        }
      });
  }

  onCancel(): void {
    this.dialogRef.close(null);
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

    this.credentialForm.get('credentialType')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((type: CredentialType | '') => {
        this.onCredentialTypeChange(type);
      });
  }

  private onCredentialTypeChange(type: CredentialType | ''): void {
    for (const fieldName of this.currentTypeFields) {
      this.credentialForm.removeControl(fieldName);
    }
    this.currentTypeFields = [];
    this.selectedTypeConfig = null;
    this.credentialStatus = null;
    this.credentialForm.setValidators(null);

    if (!type) {
      this.credentialForm.updateValueAndValidity();
      return;
    }

    this.selectedTypeConfig = getCredentialTypeConfig(type);

    let hasIssueDate = false;
    let hasExpirationDate = false;

    for (const field of this.selectedTypeConfig.fields) {
      const validators = [];
      if (field.required) {
        validators.push(Validators.required);
      }
      if (field.name === 'lastFourDigits') {
        validators.push(ssnLastFourValidator);
      }
      this.credentialForm.addControl(field.name, new FormControl('', validators));
      this.currentTypeFields.push(field.name);

      if (field.name === 'issueDate') hasIssueDate = true;
      if (field.name === 'expirationDate') hasExpirationDate = true;
    }

    if (hasIssueDate && hasExpirationDate) {
      this.credentialForm.setValidators(this.dateRangeValidator);

      this.credentialForm.get('expirationDate')!.valueChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe(value => {
          this.credentialStatus = value ? computeCredentialStatus(new Date(value)) : null;
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

  private updateLegacyBooleanFields(credentialType: CredentialType): void {
    if (credentialType === 'Drug_Screen') {
      this.onboardingService.updateCandidate(this.data.technicianId, { drugTestComplete: true })
        .subscribe({ next: () => {}, error: () => {} });
    } else if (credentialType === 'OSHA_Training_Cert') {
      this.onboardingService.updateCandidate(this.data.technicianId, { oshaCertified: true })
        .subscribe({ next: () => {}, error: () => {} });
    }
  }
}
