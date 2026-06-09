import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { PublicOnboardingService, VestSize } from './public-onboarding.service';

const VEST_SIZES: VestSize[] = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];

const US_STATES = [
  { abbreviation: 'AL', name: 'Alabama' },
  { abbreviation: 'AK', name: 'Alaska' },
  { abbreviation: 'AZ', name: 'Arizona' },
  { abbreviation: 'AR', name: 'Arkansas' },
  { abbreviation: 'CA', name: 'California' },
  { abbreviation: 'CO', name: 'Colorado' },
  { abbreviation: 'CT', name: 'Connecticut' },
  { abbreviation: 'DE', name: 'Delaware' },
  { abbreviation: 'FL', name: 'Florida' },
  { abbreviation: 'GA', name: 'Georgia' },
  { abbreviation: 'HI', name: 'Hawaii' },
  { abbreviation: 'ID', name: 'Idaho' },
  { abbreviation: 'IL', name: 'Illinois' },
  { abbreviation: 'IN', name: 'Indiana' },
  { abbreviation: 'IA', name: 'Iowa' },
  { abbreviation: 'KS', name: 'Kansas' },
  { abbreviation: 'KY', name: 'Kentucky' },
  { abbreviation: 'LA', name: 'Louisiana' },
  { abbreviation: 'ME', name: 'Maine' },
  { abbreviation: 'MD', name: 'Maryland' },
  { abbreviation: 'MA', name: 'Massachusetts' },
  { abbreviation: 'MI', name: 'Michigan' },
  { abbreviation: 'MN', name: 'Minnesota' },
  { abbreviation: 'MS', name: 'Mississippi' },
  { abbreviation: 'MO', name: 'Missouri' },
  { abbreviation: 'MT', name: 'Montana' },
  { abbreviation: 'NE', name: 'Nebraska' },
  { abbreviation: 'NV', name: 'Nevada' },
  { abbreviation: 'NH', name: 'New Hampshire' },
  { abbreviation: 'NJ', name: 'New Jersey' },
  { abbreviation: 'NM', name: 'New Mexico' },
  { abbreviation: 'NY', name: 'New York' },
  { abbreviation: 'NC', name: 'North Carolina' },
  { abbreviation: 'ND', name: 'North Dakota' },
  { abbreviation: 'OH', name: 'Ohio' },
  { abbreviation: 'OK', name: 'Oklahoma' },
  { abbreviation: 'OR', name: 'Oregon' },
  { abbreviation: 'PA', name: 'Pennsylvania' },
  { abbreviation: 'RI', name: 'Rhode Island' },
  { abbreviation: 'SC', name: 'South Carolina' },
  { abbreviation: 'SD', name: 'South Dakota' },
  { abbreviation: 'TN', name: 'Tennessee' },
  { abbreviation: 'TX', name: 'Texas' },
  { abbreviation: 'UT', name: 'Utah' },
  { abbreviation: 'VT', name: 'Vermont' },
  { abbreviation: 'VA', name: 'Virginia' },
  { abbreviation: 'WA', name: 'Washington' },
  { abbreviation: 'WV', name: 'West Virginia' },
  { abbreviation: 'WI', name: 'Wisconsin' },
  { abbreviation: 'WY', name: 'Wyoming' },
  { abbreviation: 'DC', name: 'District of Columbia' },
];

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

  // File upload state
  resumeFile: File | null = null;
  headshotFile: File | null = null;
  resumeError = '';
  headshotError = '';

  private readonly MAX_RESUME_SIZE = 10 * 1024 * 1024; // 10 MB
  private readonly MAX_HEADSHOT_SIZE = 5 * 1024 * 1024; // 5 MB
  private readonly ALLOWED_RESUME_EXTENSIONS = ['.pdf', '.doc', '.docx'];
  private readonly ALLOWED_HEADSHOT_EXTENSIONS = ['.jpg', '.jpeg', '.png'];

  vestSizes = VEST_SIZES;
  usStates = US_STATES;

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

    // Check form validity AND required files
    const filesValid = this.validateRequiredFiles();

    if (this.candidateForm.invalid || !filesValid) {
      return;
    }

    this.submitting = true;
    this.submitError = '';

    const formValue = this.candidateForm.value;

    const formData = new FormData();
    formData.append('techName', formValue.techName);
    if (formValue.middleName) formData.append('middleName', formValue.middleName);
    formData.append('techEmail', formValue.techEmail);
    formData.append('techPhone', formValue.techPhone);
    formData.append('vestSize', formValue.vestSize);
    formData.append('homeAddress', formValue.homeAddress);
    formData.append('homeState', formValue.homeState);
    if (formValue.referredBy) formData.append('referredBy', formValue.referredBy);
    formData.append('startDate', formValue.startDate);
    formData.append('drugTestComplete', 'false');
    formData.append('oshaCertified', 'false');
    formData.append('scissorLiftCertified', 'false');
    formData.append('biisciCertified', 'false');
    formData.append('osha10', 'false');
    formData.append('osha30', 'false');
    formData.append('ciKitAssigned', 'false');
    formData.append('fiberKitAssigned', 'false');
    formData.append('labelingKitAssigned', 'false');
    formData.append('powerKitAssigned', 'false');
    formData.append('testingEqptAssigned', 'false');

    // Append required files
    formData.append('resume', this.resumeFile!, this.resumeFile!.name);
    formData.append('headshot', this.headshotFile!, this.headshotFile!.name);

    this.publicOnboardingService.submitCandidateWithFiles(this.token, formData).subscribe({
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

  onResumeSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.resumeError = '';
    this.resumeFile = null;

    if (!file) return;

    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!this.ALLOWED_RESUME_EXTENSIONS.includes(ext)) {
      this.resumeError = 'Invalid file type. Please upload a PDF, DOC, or DOCX file.';
      input.value = '';
      return;
    }

    if (file.size > this.MAX_RESUME_SIZE) {
      this.resumeError = 'File is too large. Maximum size is 10MB.';
      input.value = '';
      return;
    }

    this.resumeFile = file;
  }

  onHeadshotSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.headshotError = '';
    this.headshotFile = null;

    if (!file) return;

    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!this.ALLOWED_HEADSHOT_EXTENSIONS.includes(ext)) {
      this.headshotError = 'Invalid file type. Please upload a JPG or PNG file.';
      input.value = '';
      return;
    }

    if (file.size > this.MAX_HEADSHOT_SIZE) {
      this.headshotError = 'File is too large. Maximum size is 5MB.';
      input.value = '';
      return;
    }

    this.headshotFile = file;
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private validateRequiredFiles(): boolean {
    let valid = true;
    if (!this.resumeFile) {
      valid = false;
    }
    if (!this.headshotFile) {
      valid = false;
    }
    return valid;
  }

  private buildForm(): void {
    this.candidateForm = this.fb.group({
      techName: ['', Validators.required],
      middleName: [''],
      techEmail: ['', [Validators.required, Validators.email]],
      techPhone: ['', [Validators.required, PublicOnboardingComponent.phoneValidator]],
      vestSize: ['', Validators.required],
      homeAddress: ['', Validators.required],
      homeState: ['', Validators.required],
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
