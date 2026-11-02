import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  AccountProvisioningService,
  NewHireOnboardingRequest,
  NewHireOnboardingResult
} from '../../../services/account-provisioning.service';

@Component({
  selector: 'app-account-provisioning',
  template: `
    <div class="provisioning-container">
      <div class="provisioning-header">
        <h2 class="provisioning-title">Account Provisioning</h2>
        <p class="provisioning-subtitle">
          Creates a Microsoft 365 account (Exchange Online Kiosk license), optionally a frontend
          login, and texts the new hire their username &amp; temporary password. The technician must
          already exist in ATLAS.
        </p>
      </div>

      <!-- Result panel -->
      <div *ngIf="result" class="result-panel" [class.result-ok]="result.m365UserCreated">
        <h3>Provisioning summary</h3>
        <dl class="result-grid">
          <dt>Technician</dt><dd>{{ result.technicianName }}</dd>
          <dt>Username (UPN)</dt><dd>{{ result.userPrincipalName }}</dd>
          <dt>M365 account</dt><dd>{{ result.m365UserCreated ? 'Created' : 'Not created' }}</dd>
          <dt>Kiosk license</dt><dd>{{ result.licenseAssigned ? 'Assigned' : 'Not assigned' }}</dd>
          <dt>Frontend login</dt><dd>{{ result.sriLoginCreated ? 'Created' : 'Not created' }}</dd>
          <dt>Credentials SMS</dt><dd>{{ result.smsSent ? 'Sent' : 'Not sent' }}</dd>
        </dl>
        <ul class="result-messages">
          <li *ngFor="let msg of result.messages">{{ msg }}</li>
        </ul>
        <p class="result-note">
          The temporary password was sent only by SMS and is never displayed here. The new hire must
          change it at first sign-in.
        </p>
        <button type="button" class="btn btn-secondary" (click)="reset()">Provision another</button>
      </div>

      <!-- Error -->
      <div *ngIf="errorMessage" class="error-banner" role="alert">{{ errorMessage }}</div>

      <!-- Form -->
      <form *ngIf="!result" [formGroup]="form" (ngSubmit)="submit()" class="provisioning-form" novalidate>
        <div class="form-row">
          <label for="email">Technician email</label>
          <input id="email" type="email" formControlName="email" placeholder="jdoe@sritelecom.net" autocomplete="off" />
          <small class="hint">Used to look up the technician in ATLAS.</small>
          <small class="field-error" *ngIf="f['email'].touched && f['email'].errors?.['email']">
            Enter a valid email address.
          </small>
        </div>

        <div class="form-row">
          <label for="technicianId">…or technician ID</label>
          <input id="technicianId" type="text" formControlName="technicianId" placeholder="GUID (optional if email provided)" autocomplete="off" />
        </div>

        <div class="form-row">
          <label for="mobilePhone">Mobile number for SMS</label>
          <input id="mobilePhone" type="tel" formControlName="mobilePhone" placeholder="+15551234567" autocomplete="off" />
          <small class="hint">E.164 format. Leave blank to use the number on the technician's record.</small>
          <small class="field-error" *ngIf="f['mobilePhone'].touched && f['mobilePhone'].errors?.['pattern']">
            Use E.164 format, e.g. +15551234567.
          </small>
        </div>

        <div class="form-row">
          <label for="usageLocation">Usage location</label>
          <input id="usageLocation" type="text" maxlength="2" formControlName="usageLocation" placeholder="US" />
          <small class="hint">Two-letter country code required before a license can be assigned.</small>
        </div>

        <div class="form-row form-row-checkbox">
          <label>
            <input type="checkbox" formControlName="createSriLogin" />
            Also create a frontend (sri-backend) login
          </label>
        </div>

        <div class="form-error" *ngIf="form.touched && form.errors?.['requireEmailOrTechnicianId']">
          Provide either an email or a technician ID.
        </div>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary" [disabled]="submitting">
            {{ submitting ? 'Provisioning…' : 'Provision accounts' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .provisioning-container { max-width: 640px; margin: 0 auto; padding: 1.5rem 1rem; }
    .provisioning-header { margin-bottom: 1.25rem; }
    .provisioning-title { font-size: 1.25rem; font-weight: 600; margin: 0 0 0.25rem; color: #212121; }
    .provisioning-subtitle { color: #6b7280; font-size: 0.875rem; margin: 0; }

    .provisioning-form {
      display: flex; flex-direction: column; gap: 1rem;
      background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 1.5rem;
    }
    .form-row { display: flex; flex-direction: column; gap: 0.25rem; }
    .form-row label { font-weight: 500; font-size: 0.875rem; }
    .form-row input[type='text'],
    .form-row input[type='email'],
    .form-row input[type='tel'] {
      padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.9375rem;
    }
    .form-row input:focus { outline: none; border-color: #1976d2; box-shadow: 0 0 0 2px rgba(25,118,210,0.15); }
    .hint { color: #6b7280; font-size: 0.78rem; }
    .field-error, .form-error { color: #d32f2f; font-size: 0.78rem; }
    .form-row-checkbox label { display: flex; align-items: center; gap: 0.5rem; font-weight: 400; }
    .form-actions { margin-top: 0.25rem; }

    .btn { padding: 0.6rem 1.2rem; border-radius: 6px; border: none; font-size: 0.9375rem; font-weight: 500; cursor: pointer; }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-primary { background: #1976d2; color: #fff; }
    .btn-secondary { background: #f3f4f6; color: #212121; margin-top: 1rem; }

    .error-banner {
      background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c;
      border-radius: 6px; padding: 0.75rem 1rem; margin-bottom: 1rem; font-size: 0.875rem;
    }

    .result-panel {
      background: #fff; border: 1px solid #e0e0e0; border-left: 4px solid #d1d5db;
      border-radius: 8px; padding: 1.5rem;
    }
    .result-panel.result-ok { border-left-color: #2e7d32; }
    .result-panel h3 { font-size: 1.05rem; margin: 0 0 1rem; }
    .result-grid { display: grid; grid-template-columns: max-content 1fr; gap: 0.4rem 1rem; margin: 0 0 1rem; }
    .result-grid dt { font-weight: 500; color: #374151; }
    .result-grid dd { margin: 0; }
    .result-messages { margin: 0 0 1rem; padding-left: 1.1rem; font-size: 0.875rem; color: #374151; }
    .result-note { font-size: 0.8rem; color: #6b7280; font-style: italic; }
  `]
})
export class AccountProvisioningComponent implements OnInit {
  form!: FormGroup;

  submitting = false;
  result: NewHireOnboardingResult | null = null;
  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private provisioningService: AccountProvisioningService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group(
      {
        email: ['', [Validators.email]],
        technicianId: [''],
        mobilePhone: ['', [Validators.pattern(/^\+[1-9]\d{6,14}$/)]],
        usageLocation: ['US', [Validators.pattern(/^[A-Za-z]{2}$/)]],
        createSriLogin: [true]
      },
      { validators: [requireEmailOrTechnicianId] }
    );
  }

  get f() {
    return this.form.controls;
  }

  submit(): void {
    this.errorMessage = null;
    this.result = null;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.value;
    const request: NewHireOnboardingRequest = {
      email: raw.email?.trim() || undefined,
      technicianId: raw.technicianId?.trim() || undefined,
      mobilePhone: raw.mobilePhone?.trim() || undefined,
      usageLocation: raw.usageLocation?.trim() || undefined,
      createSriLogin: !!raw.createSriLogin
    };

    this.submitting = true;
    this.provisioningService.provision(request).subscribe({
      next: res => {
        this.result = res;
        this.submitting = false;
      },
      error: err => {
        this.errorMessage =
          err?.statusCode === 404
            ? 'No active technician found for that email/ID. Create the technician record first, then provision their accounts.'
            : err?.message ?? 'Provisioning failed. Please try again.';
        this.submitting = false;
      }
    });
  }

  reset(): void {
    this.result = null;
    this.errorMessage = null;
    this.form.reset({ usageLocation: 'US', createSriLogin: true });
  }
}

/** Form-level validator: at least one of email or technicianId must be supplied. */
function requireEmailOrTechnicianId(group: FormGroup) {
  const email = (group.get('email')?.value ?? '').trim();
  const id = (group.get('technicianId')?.value ?? '').trim();
  return email || id ? null : { requireEmailOrTechnicianId: true };
}
