import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { PublicOnboardingService, VestSize } from './public-onboarding.service';

const VEST_SIZES: VestSize[] = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];

@Component({
  selector: 'app-public-onboarding',
  templateUrl: './public-onboarding.component.html',
  styleUrls: ['./public-onboarding.component.scss']
})
export class PublicOnboardingComponent implements OnInit {
  candidateForm!: FormGroup;
  token = '';

  // State flags
  validating = true;
  tokenValid = false;
  tokenErrorMessage = '';
  submitting = false;
  submitted = false;
  submitError = '';
  formSubmitted = false;

  vestSizes = VEST_SIZES;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private publicOnboardingService: PublicOnboardingService
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.params['token'] || '';
    this.buildForm();
    this.validateToken();
  }

  showError(controlName: string): boolean {
    const control = this.candidateForm.get(controlName);
    if (!control) return false;
    return control.invalid && (control.touched || this.formSubmitted);
  }

  markTouched(controlName: string): void {
    this.candidateForm.get(controlName)?.markAsTouched();
  }

  onSubmit(): void {
    this.formSubmitted = true;
    this.candidateForm.markAllAsTouched();

    if (this.candidateForm.invalid) {
      return;
    }

    this.submitting = true;
    this.submitError = '';

    const formValue = this.candidateForm.value;
    const payload = {
      techName: formValue.techName,
      middleName: formValue.middleName || undefined,
      techEmail: formValue.techEmail,
      techPhone: formValue.techPhone,
      vestSize: formValue.vestSize,
      homeAddress: formValue.homeAddress,
      workSite: formValue.workSite,
      referredBy: formValue.referredBy || undefined,
      startDate: formValue.startDate,
      drugTestComplete: false,
      oshaCertified: false,
      scissorLiftCertified: false,
      biisciCertified: false,
      osha10: false,
      osha30: false,
      ciKitAssigned: false,
      fiberKitAssigned: false,
      labelingKitAssigned: false,
      powerKitAssigned: false,
      testingEqptAssigned: false,
    };

    this.publicOnboardingService.submitCandidate(this.token, payload).subscribe({
      next: () => {
        this.submitting = false;
        this.submitted = true;
      },
      error: (err) => {
        this.submitting = false;
        this.submitError = err?.message || 'Failed to submit your application. Please try again.';
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private buildForm(): void {
    this.candidateForm = this.fb.group({
      techName: ['', Validators.required],
      middleName: [''],
      techEmail: ['', [Validators.required, Validators.email]],
      techPhone: ['', [Validators.required, PublicOnboardingComponent.phoneValidator]],
      vestSize: ['', Validators.required],
      homeAddress: ['', Validators.required],
      workSite: ['', Validators.required],
      referredBy: [''],
      startDate: ['', Validators.required],
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
    // Count only digit characters - require at least 10
    const digitCount = (value.match(/\d/g) || []).length;
    if (digitCount < 10) {
      return { invalidPhone: true };
    }
    return null;
  }

  private validateToken(): void {
    if (!this.token) {
      this.validating = false;
      this.tokenValid = false;
      this.tokenErrorMessage = 'No onboarding token was provided. Please check the link you received.';
      return;
    }

    this.publicOnboardingService.validateToken(this.token).subscribe({
      next: (response) => {
        this.validating = false;
        this.tokenValid = response.isValid;
        if (!response.isValid) {
          this.tokenErrorMessage = this.getTokenErrorMessage(response.reason);
        }
      },
      error: () => {
        this.validating = false;
        this.tokenValid = false;
        this.tokenErrorMessage = 'Unable to validate your link. Please try again later or contact your recruiter.';
      }
    });
  }

  private getTokenErrorMessage(reason?: string): string {
    switch (reason) {
      case 'expired':
        return 'This onboarding link has expired. Please contact your recruiter for a new link.';
      case 'used':
        return 'This onboarding link has already been used. If you need to make changes, please contact your recruiter.';
      case 'revoked':
        return 'This onboarding link has been revoked. Please contact your recruiter for assistance.';
      case 'not_found':
        return 'This onboarding link is not valid. Please check the link you received or contact your recruiter.';
      default:
        return 'This onboarding link is not valid. Please contact your recruiter for assistance.';
    }
  }
}
