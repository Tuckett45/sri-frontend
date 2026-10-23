import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  NewHireOnboardingService,
  NewHireOnboardingRequest,
  NewHireOnboardingResult
} from './new-hire-onboarding.service';

@Component({
  selector: 'app-new-hire-onboarding',
  templateUrl: './new-hire-onboarding.component.html',
  styleUrls: ['./new-hire-onboarding.component.scss']
})
export class NewHireOnboardingComponent implements OnInit {
  form!: FormGroup;

  submitting = false;
  result: NewHireOnboardingResult | null = null;
  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private onboardingService: NewHireOnboardingService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group(
      {
        // Identify the technician by email (preferred) or technician id.
        email: ['', [Validators.email]],
        technicianId: [''],
        // E.164 phone, optional — falls back to the technician's number on record.
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
    this.onboardingService.provision(request).subscribe({
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
