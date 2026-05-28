import { Component, Inject, Optional } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Candidate } from '../../../models/onboarding.models';

@Component({
  selector: 'app-add-candidate-modal',
  template: `
    <h2 mat-dialog-title>{{ isEditMode ? 'Edit Candidate' : 'Add New Candidate' }}</h2>
    <mat-dialog-content>
      <mat-horizontal-stepper linear #stepper>
        <!-- Step 1: Basic Info -->
        <mat-step [stepControl]="basicInfoForm" label="Basic Info">
          <form [formGroup]="basicInfoForm" class="step-form">
            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>First Name</mat-label>
                <input matInput formControlName="firstName" required />
                <mat-error *ngIf="basicInfoForm.get('firstName')?.hasError('required')">First name is required</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Middle Name</mat-label>
                <input matInput formControlName="middleName" placeholder="Enter middle name (optional)" />
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Last Name</mat-label>
                <input matInput formControlName="lastName" required />
                <mat-error *ngIf="basicInfoForm.get('lastName')?.hasError('required')">Last name is required</mat-error>
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Email</mat-label>
                <input matInput formControlName="email" type="email" required />
                <mat-error *ngIf="basicInfoForm.get('email')?.hasError('required')">Email is required</mat-error>
                <mat-error *ngIf="basicInfoForm.get('email')?.hasError('email')">Invalid email format</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Phone</mat-label>
                <input matInput formControlName="phone" required />
                <mat-error *ngIf="basicInfoForm.get('phone')?.hasError('required')">Phone is required</mat-error>
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Vest Size</mat-label>
                <mat-select formControlName="vestSize">
                  <mat-option *ngFor="let size of vestSizes" [value]="size">{{ size }}</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Home Address</mat-label>
                <input matInput formControlName="homeAddress" required placeholder="Candidate's home address" />
                <mat-error *ngIf="basicInfoForm.get('homeAddress')?.hasError('required')">Home address is required</mat-error>
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Referred By</mat-label>
                <input matInput formControlName="referredBy" placeholder="Referral source (optional)" />
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Work Site</mat-label>
                <input matInput formControlName="workSite" placeholder="Assigned work site (optional)" />
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Start Date</mat-label>
                <input matInput [matDatepicker]="startDatePicker" formControlName="startDate" required />
                <mat-datepicker-toggle matSuffix [for]="startDatePicker"></mat-datepicker-toggle>
                <mat-datepicker #startDatePicker></mat-datepicker>
                <mat-error *ngIf="basicInfoForm.get('startDate')?.hasError('required')">Start date is required</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Offer Status</mat-label>
                <mat-select formControlName="offerStatus">
                  <mat-option value="needs_review">Needs Review</mat-option>
                  <mat-option value="vetted_available">Vetted/Available</mat-option>
                  <mat-option value="offer_extended">Offer Extended</mat-option>
                  <mat-option value="offer_accepted_onboarding">Offer Accepted/Onboarding</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <div class="step-actions">
              <button mat-button mat-dialog-close>Cancel</button>
              <button mat-raised-button color="primary" matStepperNext>Next</button>
            </div>

            <!-- File Uploads Section -->
            <div class="upload-section">
              <h4>File Uploads</h4>
              <div class="upload-row">
                <div class="upload-field">
                  <label>Resume (PDF, DOC, DOCX) *</label>
                  <input type="file" accept=".pdf,.doc,.docx" (change)="onResumeSelected($event)" />
                  <span class="file-info" *ngIf="resumeFile">{{ resumeFile.name }} ({{ formatFileSize(resumeFile.size) }})</span>
                  <span class="upload-hint" *ngIf="!resumeFile && !isEditMode">Required — max 10MB</span>
                </div>
                <div class="upload-field">
                  <label>Headshot (JPG, PNG)</label>
                  <input type="file" accept=".jpg,.jpeg,.png" (change)="onHeadshotSelected($event)" />
                  <span class="file-info" *ngIf="headshotFile">{{ headshotFile.name }} ({{ formatFileSize(headshotFile.size) }})</span>
                  <span class="upload-hint" *ngIf="!headshotFile">Optional — max 5MB</span>
                </div>
              </div>
            </div>
          </form>
        </mat-step>

        <!-- Step 2: Core Qualifications -->
        <mat-step label="Core">
          <form [formGroup]="coreQualificationsForm" class="step-form">
            <div class="toggle-grid">
              <div class="toggle-item">
                <span>Fiber Experience</span>
                <mat-slide-toggle formControlName="fiberExperience"></mat-slide-toggle>
              </div>
              <div class="toggle-item">
                <span>OSHA Certification</span>
                <mat-slide-toggle formControlName="oshaCertification"></mat-slide-toggle>
              </div>
              <div class="toggle-item">
                <span>Lift Certification</span>
                <mat-slide-toggle formControlName="liftCertification"></mat-slide-toggle>
              </div>
              <div class="toggle-item">
                <span>Travel Availability</span>
                <mat-slide-toggle formControlName="travelAvailability"></mat-slide-toggle>
              </div>
              <div class="toggle-item">
                <span>Shift Availability</span>
                <mat-slide-toggle formControlName="shiftAvailability"></mat-slide-toggle>
              </div>
              <div class="toggle-item">
                <span>Background/Drug Screen Complete</span>
                <mat-slide-toggle formControlName="backgroundDrugScreen"></mat-slide-toggle>
              </div>
              <div class="toggle-item">
                <span>Military Background</span>
                <mat-slide-toggle formControlName="militaryBackground"></mat-slide-toggle>
              </div>
            </div>

            <div class="step-actions">
              <button mat-button matStepperPrevious>Back</button>
              <button mat-raised-button color="primary" matStepperNext>Next</button>
            </div>
          </form>
        </mat-step>

        <!-- Step 3: Badges & Access -->
        <mat-step label="Badges">
          <form [formGroup]="badgesAccessForm" class="step-form">
            <div class="toggle-grid">
              <div class="toggle-item">
                <span>AT&T Badge</span>
                <mat-slide-toggle formControlName="attBadge"></mat-slide-toggle>
              </div>
              <div class="toggle-item">
                <span>Lumen Badge</span>
                <mat-slide-toggle formControlName="lumenBadge"></mat-slide-toggle>
              </div>
              <div class="toggle-item">
                <span>AT&T Supplier Training</span>
                <mat-slide-toggle formControlName="attSupplierTraining"></mat-slide-toggle>
              </div>
              <div class="toggle-item">
                <span>Ciena Basic Training</span>
                <mat-slide-toggle formControlName="cienaBasicTraining"></mat-slide-toggle>
              </div>
              <div class="toggle-item">
                <span>Google Red Badge</span>
                <mat-slide-toggle formControlName="googleRedBadge"></mat-slide-toggle>
              </div>
              <div class="toggle-item">
                <span>Google LDAP</span>
                <mat-slide-toggle formControlName="googleLdap"></mat-slide-toggle>
              </div>
              <div class="toggle-item">
                <span>Meta Green Listing</span>
                <mat-slide-toggle formControlName="metaGreenListing"></mat-slide-toggle>
              </div>
            </div>

            <div class="step-actions">
              <button mat-button matStepperPrevious>Back</button>
              <button mat-raised-button color="primary" matStepperNext>Next</button>
            </div>
          </form>
        </mat-step>

        <!-- Step 4: Training & Certs -->
        <mat-step label="Training">
          <form [formGroup]="trainingCertsForm" class="step-form">
            <div class="toggle-grid">
              <div class="toggle-item">
                <span>OBS Training</span>
                <mat-slide-toggle formControlName="obsTraining"></mat-slide-toggle>
              </div>
              <div class="toggle-item">
                <span>Scissor Lift</span>
                <mat-slide-toggle formControlName="scissorLift"></mat-slide-toggle>
              </div>
              <div class="toggle-item">
                <span>OSHA 10</span>
                <mat-slide-toggle formControlName="osha10"></mat-slide-toggle>
              </div>
              <div class="toggle-item">
                <span>OSHA 30</span>
                <mat-slide-toggle formControlName="osha30"></mat-slide-toggle>
              </div>
              <div class="toggle-item">
                <span>Tech Hand Tools</span>
                <mat-slide-toggle formControlName="techHandTools"></mat-slide-toggle>
              </div>
            </div>

            <div class="step-actions">
              <button mat-button matStepperPrevious>Back</button>
              <button mat-raised-button color="primary" matStepperNext>Next</button>
            </div>
          </form>
        </mat-step>

        <!-- Step 5: Equipment Kits -->
        <mat-step label="Equipment">
          <form [formGroup]="equipmentKitsForm" class="step-form">
            <div class="toggle-grid">
              <div class="toggle-item">
                <span>CI Kit Assigned</span>
                <mat-slide-toggle formControlName="ciKitAssigned"></mat-slide-toggle>
              </div>
              <div class="toggle-item">
                <span>Fiber Kit Assigned</span>
                <mat-slide-toggle formControlName="fiberKitAssigned"></mat-slide-toggle>
              </div>
              <div class="toggle-item">
                <span>Labeling Kit Assigned</span>
                <mat-slide-toggle formControlName="labelingKitAssigned"></mat-slide-toggle>
              </div>
              <div class="toggle-item">
                <span>Power Kit Assigned</span>
                <mat-slide-toggle formControlName="powerKitAssigned"></mat-slide-toggle>
              </div>
              <div class="toggle-item">
                <span>Testing Equipment Assigned</span>
                <mat-slide-toggle formControlName="testingEquipmentAssigned"></mat-slide-toggle>
              </div>
            </div>

            <div class="step-actions">
              <button mat-button matStepperPrevious>Back</button>
              <button mat-raised-button color="primary" (click)="onSubmit()" [disabled]="submitting">{{ isEditMode ? 'Update' : 'Submit' }}</button>
            </div>
          </form>
        </mat-step>
      </mat-horizontal-stepper>
    </mat-dialog-content>
  `,
  styles: [`
    :host {
      display: block;
    }

    mat-dialog-content {
      min-width: 700px;
      max-height: 70vh;
      padding: 0 24px;
    }

    ::ng-deep .mat-horizontal-stepper-header-container {
      margin-bottom: 8px;
    }

    ::ng-deep .mat-step-label {
      font-size: 12px !important;
      white-space: nowrap !important;
      overflow: visible !important;
      text-overflow: unset !important;
    }

    ::ng-deep .mat-horizontal-stepper-header {
      padding: 0 12px !important;
    }

    .step-form {
      padding: 16px 0;
    }

    .form-row {
      display: flex;
      gap: 16px;
      margin-bottom: 8px;
    }

    .form-row mat-form-field {
      flex: 1;
    }

    .toggle-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      padding: 8px 0;
    }

    .toggle-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      background: #fafafa;
    }

    .toggle-item span {
      font-size: 0.875rem;
      color: #424242;
    }

    .step-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #e0e0e0;
    }

    @media (max-width: 768px) {
      mat-dialog-content {
        min-width: unset;
      }

      .form-row {
        flex-direction: column;
        gap: 0;
      }

      .toggle-grid {
        grid-template-columns: 1fr;
      }
    }

    .upload-section {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #e0e0e0;
    }

    .upload-section h4 {
      margin: 0 0 12px;
      font-size: 0.875rem;
      font-weight: 600;
      color: #424242;
    }

    .upload-row {
      display: flex;
      gap: 24px;
    }

    .upload-field {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .upload-field label {
      font-size: 0.8125rem;
      font-weight: 500;
      color: #424242;
    }

    .upload-field input[type="file"] {
      font-size: 0.8125rem;
    }

    .file-info {
      font-size: 0.75rem;
      color: #1976d2;
      font-weight: 500;
    }

    .upload-hint {
      font-size: 0.75rem;
      color: #9e9e9e;
    }
  `]
})
export class AddCandidateModalComponent {
  vestSizes = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];
  isEditMode = false;
  submitting = false;
  resumeFile: File | null = null;
  headshotFile: File | null = null;

  basicInfoForm: FormGroup;
  coreQualificationsForm: FormGroup;
  badgesAccessForm: FormGroup;
  trainingCertsForm: FormGroup;
  equipmentKitsForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AddCandidateModalComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: { candidate?: Candidate } | null
  ) {
    const candidate = data?.candidate;
    this.isEditMode = !!candidate;

    let firstName = '';
    let lastName = '';
    if (candidate?.techName) {
      const parts = candidate.techName.split(' ');
      firstName = parts[0] || '';
      lastName = parts.slice(1).join(' ') || '';
    }

    this.basicInfoForm = this.fb.group({
      firstName: [firstName || '', Validators.required],
      middleName: [candidate?.middleName || ''],
      lastName: [lastName || '', Validators.required],
      email: [candidate?.techEmail || '', [Validators.required, Validators.email]],
      phone: [candidate?.techPhone || '', Validators.required],
      vestSize: [candidate?.vestSize || 'L'],
      homeAddress: [candidate?.homeAddress || '', Validators.required],
      workSite: [candidate?.workSite || ''],
      referredBy: [candidate?.referredBy || ''],
      startDate: [candidate?.startDate || '', Validators.required],
      offerStatus: [candidate?.offerStatus || 'needs_review']
    });

    this.coreQualificationsForm = this.fb.group({
      fiberExperience: [false],
      oshaCertification: [candidate?.oshaCertified || false],
      liftCertification: [candidate?.scissorLiftCertified || false],
      travelAvailability: [false],
      shiftAvailability: [false],
      backgroundDrugScreen: [candidate?.drugTestComplete || false],
      militaryBackground: [false]
    });

    this.badgesAccessForm = this.fb.group({
      attBadge: [candidate?.attBadge || false],
      lumenBadge: [candidate?.lumenBadge || false],
      attSupplierTraining: [candidate?.attSupplierTraining || false],
      cienaBasicTraining: [candidate?.cienaBasicTraining || false],
      googleRedBadge: [candidate?.googleRedBadge || false],
      googleLdap: [candidate?.googleLdap || false],
      metaGreenListing: [candidate?.metaGreenListing || false]
    });

    this.trainingCertsForm = this.fb.group({
      obsTraining: [candidate?.obsTraining || false],
      scissorLift: [candidate?.scissorLiftCertified || false],
      osha10: [candidate?.osha10 || false],
      osha30: [candidate?.osha30 || false],
      techHandTools: [candidate?.techHandTools || false]
    });

    this.equipmentKitsForm = this.fb.group({
      ciKitAssigned: [candidate?.ciKitAssigned || false],
      fiberKitAssigned: [candidate?.fiberKitAssigned || false],
      labelingKitAssigned: [candidate?.labelingKitAssigned || false],
      powerKitAssigned: [candidate?.powerKitAssigned || false],
      testingEquipmentAssigned: [candidate?.testingEqptAssigned || false]
    });
  }

  onResumeSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.resumeFile = input.files[0];
    }
  }

  onHeadshotSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.headshotFile = input.files[0];
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  onSubmit(): void {
    if (this.submitting) return;

    if (this.basicInfoForm.invalid) {
      this.basicInfoForm.markAllAsTouched();
      return;
    }

    this.submitting = true;

    const startDateValue = this.basicInfoForm.get('startDate')?.value;
    const startDate = startDateValue instanceof Date
      ? startDateValue.toISOString().split('T')[0]
      : startDateValue;

    const result = {
      basicInfo: {
        ...this.basicInfoForm.value,
        startDate
      },
      coreQualifications: this.coreQualificationsForm.value,
      badgesAccess: this.badgesAccessForm.value,
      trainingCerts: this.trainingCertsForm.value,
      equipmentKits: this.equipmentKitsForm.value,
      files: {
        resume: this.resumeFile,
        headshot: this.headshotFile
      }
    };

    this.dialogRef.close(result);
  }
}
