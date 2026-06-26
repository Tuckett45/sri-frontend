import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { catchError, of } from 'rxjs';
import { PublicOnboardingService, VestSize } from './public-onboarding.service';
import { GeocodingService } from 'src/app/services/geocoding.service';
import { StateAbbreviation } from 'src/app/models/state-abbreviation.enum';

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

  // File uploads
  resumeFile: File | null = null;
  headshotFile: File | null = null;
  resumeError = '';
  headshotError = '';

  // Address autocomplete
  filteredAddresses: any[] = [];
  isAddressLoading = false;
  showAddressSuggestions = false;

  vestSizes = VEST_SIZES;
  usStates = US_STATES;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private publicOnboardingService: PublicOnboardingService,
    private geocodingService: GeocodingService
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

    // Validate file uploads
    this.resumeError = !this.resumeFile ? 'Resume is required.' : '';
    this.headshotError = !this.headshotFile ? 'Headshot is required.' : '';

    if (this.candidateForm.invalid || !this.resumeFile || !this.headshotFile) {
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
      homeState: formValue.homeState,
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
      next: (response) => {
        const candidateId = response?.candidateId || response?.id;
        if (candidateId && this.resumeFile && this.headshotFile) {
          this.uploadFiles(candidateId);
        } else {
          this.submitting = false;
          this.submitted = true;
        }
      },
      error: (err) => {
        this.submitting = false;
        this.submitError = err?.message || 'Failed to submit your application. Please try again.';
      }
    });
  }

  onResumeSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    if (file) {
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        this.resumeError = 'Resume must be a PDF, DOC, or DOCX file.';
        this.resumeFile = null;
        input.value = '';
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        this.resumeError = 'Resume must be less than 10MB.';
        this.resumeFile = null;
        input.value = '';
        return;
      }
      this.resumeFile = file;
      this.resumeError = '';
    }
  }

  onHeadshotSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        this.headshotError = 'Headshot must be a JPG or PNG image.';
        this.headshotFile = null;
        input.value = '';
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        this.headshotError = 'Headshot must be less than 5MB.';
        this.headshotFile = null;
        input.value = '';
        return;
      }
      this.headshotFile = file;
      this.headshotError = '';
    }
  }

  private uploadFiles(candidateId: string): void {
    import('rxjs').then(({ forkJoin }) => {
      const uploads = [];
      if (this.resumeFile) {
        uploads.push(this.publicOnboardingService.uploadCandidateFile(this.token, candidateId, 'resume', this.resumeFile));
      }
      if (this.headshotFile) {
        uploads.push(this.publicOnboardingService.uploadCandidateFile(this.token, candidateId, 'headshot', this.headshotFile));
      }
      if (uploads.length > 0) {
        forkJoin(uploads).subscribe({
          next: () => {
            this.submitting = false;
            this.submitted = true;
          },
          error: () => {
            // Candidate was created but file upload failed
            this.submitting = false;
            this.submitted = true;
          }
        });
      } else {
        this.submitting = false;
        this.submitted = true;
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Phone mask
  // ---------------------------------------------------------------------------

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 10);
    let formatted = '';
    if (digits.length === 0) {
      formatted = '';
    } else if (digits.length <= 3) {
      formatted = `(${digits}`;
    } else if (digits.length <= 6) {
      formatted = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else {
      formatted = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    input.value = formatted;
    this.candidateForm.get('techPhone')?.setValue(formatted, { emitEvent: false });
  }

  // ---------------------------------------------------------------------------
  // Name capitalization
  // ---------------------------------------------------------------------------

  onNameBlur(controlName: string): void {
    const control = this.candidateForm.get(controlName);
    if (!control || !control.value || !control.value.trim()) return;
    const capitalized = this.toTitleCase(control.value);
    if (capitalized !== control.value) {
      control.setValue(capitalized, { emitEvent: true });
    }
    control.markAsTouched();
  }

  private toTitleCase(text: string): string {
    return text
      .toLowerCase()
      .replace(/(?:^|\s|[-'])\S/g, (match) => match.toUpperCase());
  }

  // ---------------------------------------------------------------------------
  // Address autocomplete (Google Geocoding)
  // ---------------------------------------------------------------------------

  onAddressInput(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    if (query && query.length > 5) {
      this.isAddressLoading = true;
      this.geocodingService.geocodeAddress(query).pipe(
        catchError(() => {
          this.isAddressLoading = false;
          return of({ results: [] });
        })
      ).subscribe((response: any) => {
        this.filteredAddresses = (response.results || []).map((result: any) => {
          const address = result.address_components || [];
          const streetNumber = address.find((c: any) => c.types.includes('street_number'))?.long_name || '';
          const route = address.find((c: any) => c.types.includes('route'))?.long_name || '';
          const streetAddress = `${streetNumber} ${route}`.trim();

          const city = address.find((c: any) => c.types.includes('locality'))?.long_name || '';
          const state = address.find((c: any) => c.types.includes('administrative_area_level_1'))?.long_name || '';
          const abbreviatedState = StateAbbreviation[state as keyof typeof StateAbbreviation] || state || '';
          const zip = address.find((c: any) => c.types.includes('postal_code'))?.long_name || '';

          const formattedAddress = [streetAddress, city, abbreviatedState, zip].filter(Boolean).join(', ');

          return {
            formattedAddress,
            streetAddress,
            city,
            state: abbreviatedState,
            zip,
            original: result
          };
        });
        this.showAddressSuggestions = this.filteredAddresses.length > 0;
        this.isAddressLoading = false;
      });
    } else {
      this.filteredAddresses = [];
      this.showAddressSuggestions = false;
    }
  }

  selectAddress(suggestion: any): void {
    this.candidateForm.patchValue({
      homeAddress: suggestion.formattedAddress,
      homeState: suggestion.state
    });
    this.filteredAddresses = [];
    this.showAddressSuggestions = false;
  }

  hideAddressSuggestions(): void {
    // Delay to allow click event to fire on suggestion
    setTimeout(() => {
      this.showAddressSuggestions = false;
    }, 200);
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
    // Count only digit characters — require exactly 10 for masked phone
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
