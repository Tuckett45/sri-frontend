import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Technician } from '../../../models/technician.model';

export interface OnboardingInfoDialogData {
  technician: Technician;
}

@Component({
  selector: 'app-onboarding-info-modal',
  template: `
    <h2 mat-dialog-title>Onboarding Info — {{ data.technician.firstName }} {{ data.technician.lastName }}</h2>

    <mat-dialog-content class="modal-content">
      <form [formGroup]="form" class="onboarding-form">

        <!-- Core Qualifications -->
        <div class="section">
          <h3 class="section-title">Core Qualifications</h3>
          <div class="toggle-row">
            <span class="toggle-label">Fiber Experience</span>
            <mat-slide-toggle formControlName="fiberExperience" color="primary"></mat-slide-toggle>
          </div>
          <div class="toggle-row">
            <span class="toggle-label">OSHA Certification</span>
            <mat-slide-toggle formControlName="oshaCertified" color="primary"></mat-slide-toggle>
          </div>
          <div class="toggle-row">
            <span class="toggle-label">Lift Certification</span>
            <mat-slide-toggle formControlName="liftCertified" color="primary"></mat-slide-toggle>
          </div>
          <div class="toggle-row">
            <span class="toggle-label">Travel Availability</span>
            <mat-slide-toggle formControlName="willingToTravel" color="primary"></mat-slide-toggle>
          </div>
          <div class="toggle-row">
            <span class="toggle-label">Shift</span>
            <mat-select formControlName="shiftAvailable" style="width: 120px;">
              <mat-option value="">None</mat-option>
              <mat-option value="day">Day</mat-option>
              <mat-option value="night">Night</mat-option>
              <mat-option value="both">Day/Night</mat-option>
            </mat-select>
          </div>
          <div class="toggle-row">
            <span class="toggle-label">Background Check</span>
            <mat-slide-toggle formControlName="backgroundCheckComplete" color="primary"></mat-slide-toggle>
          </div>
          <div class="toggle-row">
            <span class="toggle-label">Drug Screen</span>
            <mat-slide-toggle formControlName="drugScreenComplete" color="primary"></mat-slide-toggle>
          </div>
          <div class="toggle-row">
            <span class="toggle-label">Military Background</span>
            <mat-slide-toggle formControlName="isVeteran" color="primary"></mat-slide-toggle>
          </div>
        </div>

        <!-- Badges & Access -->
        <div class="section">
          <h3 class="section-title">Badges & Access</h3>
          <div class="toggle-row">
            <span class="toggle-label">AT&T Badge</span>
            <mat-slide-toggle formControlName="attBadge" color="primary"></mat-slide-toggle>
          </div>
          <div class="toggle-row">
            <span class="toggle-label">Comcast Badge</span>
            <mat-slide-toggle formControlName="comcastBadge" color="primary"></mat-slide-toggle>
          </div>
          <div class="toggle-row">
            <span class="toggle-label">AT&T Supplier Training</span>
            <mat-slide-toggle formControlName="attSupplierTraining" color="primary"></mat-slide-toggle>
          </div>
          <div class="toggle-row">
            <span class="toggle-label">Ciena Basic Training</span>
            <mat-slide-toggle formControlName="cienaBasicTraining" color="primary"></mat-slide-toggle>
          </div>
          <div class="toggle-row">
            <span class="toggle-label">Google Red Badge</span>
            <mat-slide-toggle formControlName="googleRedBadge" color="primary"></mat-slide-toggle>
          </div>
          <div class="toggle-row">
            <span class="toggle-label">Google LDAP</span>
            <mat-slide-toggle formControlName="googleLdap" color="primary"></mat-slide-toggle>
          </div>
          <div class="toggle-row">
            <span class="toggle-label">Meta Green Listing</span>
            <mat-slide-toggle formControlName="metaGreenListing" color="primary"></mat-slide-toggle>
          </div>
        </div>

        <!-- Training & Certs -->
        <div class="section">
          <h3 class="section-title">Training & Certs</h3>
          <div class="toggle-row">
            <span class="toggle-label">OBS Training</span>
            <mat-slide-toggle formControlName="obsTraining" color="primary"></mat-slide-toggle>
          </div>
          <div class="toggle-row">
            <span class="toggle-label">OSHA 10</span>
            <mat-slide-toggle formControlName="osha10" color="primary"></mat-slide-toggle>
          </div>
          <div class="toggle-row">
            <span class="toggle-label">OSHA 30</span>
            <mat-slide-toggle formControlName="osha30" color="primary"></mat-slide-toggle>
          </div>
          <div class="toggle-row">
            <span class="toggle-label">Tech Hand Tools</span>
            <mat-slide-toggle formControlName="techHandTools" color="primary"></mat-slide-toggle>
          </div>
          <div class="toggle-row">
            <span class="toggle-label">BIISCI</span>
            <mat-slide-toggle formControlName="biisciCertified" color="primary"></mat-slide-toggle>
          </div>
        </div>

        <!-- Equipment Kits -->
        <div class="section">
          <h3 class="section-title">Equipment Kits</h3>
          <div class="toggle-row">
            <span class="toggle-label">CI Kit</span>
            <mat-slide-toggle formControlName="ciKitAssigned" color="primary"></mat-slide-toggle>
          </div>
          <div class="toggle-row">
            <span class="toggle-label">Fiber Kit</span>
            <mat-slide-toggle formControlName="fiberKitAssigned" color="primary"></mat-slide-toggle>
          </div>
          <div class="toggle-row">
            <span class="toggle-label">Labeling Kit</span>
            <mat-slide-toggle formControlName="labelingKitAssigned" color="primary"></mat-slide-toggle>
          </div>
          <div class="toggle-row">
            <span class="toggle-label">Power Kit</span>
            <mat-slide-toggle formControlName="powerKitAssigned" color="primary"></mat-slide-toggle>
          </div>
          <div class="toggle-row">
            <span class="toggle-label">Testing Equipment</span>
            <mat-slide-toggle formControlName="testingEqptAssigned" color="primary"></mat-slide-toggle>
          </div>
        </div>

        <!-- Notes -->
        <div class="section">
          <h3 class="section-title">Notes</h3>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Onboarding Notes</mat-label>
            <textarea matInput formControlName="onboardingNotes" rows="3" placeholder="Any additional notes..."></textarea>
          </mat-form-field>
        </div>

      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="onSave()">Save</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .modal-content {
      max-height: 70vh;
      overflow-y: auto;
    }

    .onboarding-form {
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-width: 420px;
      padding-top: 8px;
    }

    .section {
      margin-bottom: 8px;
    }

    .section-title {
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #1976d2;
      margin: 12px 0 4px;
      padding-bottom: 4px;
      border-bottom: 1px solid #e3f2fd;
    }

    .toggle-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #f5f5f5;
    }

    .toggle-row:last-child {
      border-bottom: none;
    }

    .toggle-label {
      font-size: 14px;
      font-weight: 400;
      color: rgba(0, 0, 0, 0.87);
    }

    .full-width {
      width: 100%;
    }

    @media (max-width: 600px) {
      .onboarding-form {
        min-width: unset;
      }
    }
  `]
})
export class OnboardingInfoModalComponent implements OnInit {
  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<OnboardingInfoModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: OnboardingInfoDialogData
  ) {}

  ngOnInit(): void {
    const tech = this.data.technician;

    this.form = this.fb.group({
      // Core Qualifications
      fiberExperience: [!!tech.fiberExperience && tech.fiberExperience !== 'none'],
      oshaCertified: [tech.oshaCertified || false],
      liftCertified: [tech.scissorLiftCertified || false],
      willingToTravel: [tech.willingToTravel || false],
      shiftAvailable: [this.getShiftValue(tech.shiftAvailability)],
      backgroundCheckComplete: [tech.backgroundCheckStatus === 'pass'],
      drugScreenComplete: [tech.drugScreenStatus === 'pass'],
      isVeteran: [tech.isVeteran || false],

      // Badges & Access
      attBadge: [tech.attBadge || false],
      comcastBadge: [tech.comcastBadge || false],
      attSupplierTraining: [tech.attSupplierTraining || false],
      cienaBasicTraining: [tech.cienaBasicTraining || false],
      googleRedBadge: [tech.googleRedBadge || false],
      googleLdap: [tech.googleLdap || false],
      metaGreenListing: [tech.metaGreenListing || false],

      // Training & Certs
      obsTraining: [tech.obsTraining || false],
      osha10: [tech.osha10 || false],
      osha30: [tech.osha30 || false],
      techHandTools: [tech.techHandTools || false],
      biisciCertified: [tech.biisciCertified || false],

      // Equipment Kits
      ciKitAssigned: [tech.ciKitAssigned || false],
      fiberKitAssigned: [tech.fiberKitAssigned || false],
      labelingKitAssigned: [tech.labelingKitAssigned || false],
      powerKitAssigned: [tech.powerKitAssigned || false],
      testingEqptAssigned: [tech.testingEqptAssigned || false],

      // Notes
      onboardingNotes: [tech.onboardingNotes || '']
    });
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }

  onSave(): void {
    const v = this.form.value;

    const result = {
      // Core
      fiberExperience: v.fiberExperience ? '5+_years' : 'none',
      oshaCertified: v.oshaCertified,
      scissorLiftCertified: v.liftCertified,
      liftCertifications: v.liftCertified ? ['scissor_lift'] : [],
      willingToTravel: v.willingToTravel,
      shiftAvailability: this.buildShiftArray(v.shiftAvailable),
      backgroundCheckStatus: v.backgroundCheckComplete ? 'pass' : 'not_started',
      drugScreenStatus: v.drugScreenComplete ? 'pass' : 'not_started',
      isVeteran: v.isVeteran,

      // Badges & Access
      attBadge: v.attBadge,
      comcastBadge: v.comcastBadge,
      attSupplierTraining: v.attSupplierTraining,
      cienaBasicTraining: v.cienaBasicTraining,
      googleRedBadge: v.googleRedBadge,
      googleLdap: v.googleLdap,
      metaGreenListing: v.metaGreenListing,

      // Training & Certs
      obsTraining: v.obsTraining,
      osha10: v.osha10,
      osha30: v.osha30,
      techHandTools: v.techHandTools,
      biisciCertified: v.biisciCertified,

      // Equipment Kits
      ciKitAssigned: v.ciKitAssigned,
      fiberKitAssigned: v.fiberKitAssigned,
      labelingKitAssigned: v.labelingKitAssigned,
      powerKitAssigned: v.powerKitAssigned,
      testingEqptAssigned: v.testingEqptAssigned,

      // Notes
      onboardingNotes: v.onboardingNotes || null
    };

    this.dialogRef.close(result);
  }

  private getShiftValue(shiftAvailability: any): string {
    if (!shiftAvailability || (Array.isArray(shiftAvailability) && shiftAvailability.length === 0)) return '';
    if (Array.isArray(shiftAvailability)) {
      if (shiftAvailability.includes('day') && shiftAvailability.includes('night')) return 'both';
      if (shiftAvailability.includes('day')) return 'day';
      if (shiftAvailability.includes('night')) return 'night';
      return '';
    }
    return String(shiftAvailability).toLowerCase();
  }

  private buildShiftArray(value: string): string[] {
    switch (value) {
      case 'day': return ['day'];
      case 'night': return ['night'];
      case 'both': return ['day', 'night'];
      default: return [];
    }
  }
}
