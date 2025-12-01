import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { Observable, map, startWith } from 'rxjs';
import { DailyReport, UserSubmissionStatus } from 'src/app/models/daily-report.model';
import { DailyReportService } from 'src/app/services/daily-report.service';
import { AuthService } from 'src/app/services/auth.service';
import { User } from 'src/app/models/user.model';
import { GeocodingService } from 'src/app/services/geocoding.service';
import { StateAbbreviation } from 'src/app/models/state-abbreviation.enum';

@Component({
  selector: 'app-daily-report-modal',
  templateUrl: './daily-report-modal.component.html',
  styleUrls: ['./daily-report-modal.component.scss'],
  standalone: false
})
export class DailyReportModalComponent implements OnInit {
  dailyReportForm!: FormGroup;
  isSubmitting = false;

  // Lookup options for autocomplete fields
  segmentIdOptions: string[] = ['Other'];
  currentLocationOptions: string[] = ['Other'];
  descriptionOfWorkOptions: string[] = [
    'OSP -Open Trench',
    'OSP-Micro trench',
    'OSP-Bore',
    'OSP-SSD Softscape',
    'Backfill',
    'Fiber Installation',
    'Vaults Placement',
    'Mastic/ Sealant',
    'Concrete Restoration',
    'Asphalt Restoration',
    'Conduit Placement',
    'Precon',
    'Utility Strike',
    'Prelim Walk',
    'Duct Placement',
    'Vault Prep',
    'Final Walk',
    'Splicing & Testing',
    'Weather Delay',
    'MxU -Bore',
    'MxU-SSD Softscape',
    'Service Drop',
    'Direct Buried Deployment',
    'OPS Repairs',
    'Design Package',
    'Aerial Cable Placement',
    'OSP General Provioning',
    'Service Drop Repairs',
    'MxU -Cable Placement',
    'ENG- Design Package',
    'Other'
  ];
  forwardProductionOptions: string[] = ['Other'];
  safetyConcernsOptions: string[] = ['Other'];
  incidentDelayOptions: string[] = ['Other'];
  nextStepsOptions: string[] = ['Other'];
  private readonly defaultDescriptionOptions = [...this.descriptionOfWorkOptions];

  // Filtered options for autocomplete
  filteredSegmentIds!: Observable<string[]>;
  filteredLocations!: Observable<string[]>;
  filteredDescriptions!: Observable<string[]>;
  filteredProduction!: Observable<string[]>;
  filteredSafety!: Observable<string[]>;
  filteredIncidents!: Observable<string[]>;
  filteredNextSteps!: Observable<string[]>;
  submissionUserId?: string;
  submissionUserName?: string;
  submissionUserEmail?: string;
  submissionUserMarket?: string | null;
  isSubmittingForAnotherUser = false;
  isLocating = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<DailyReportModalComponent>,
    private dailyReportService: DailyReportService,
    private toastr: ToastrService,
    private authService: AuthService,
    private geocodingService: GeocodingService,
    @Inject(MAT_DIALOG_DATA) public data?: { targetUser?: UserSubmissionStatus | User | any }
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.resolveSubmissionUser();
    this.loadLookupOptions();
    this.setupAutocompleteFilters();
  }

  private initializeForm(): void {
    this.dailyReportForm = this.fb.group({
      segmentId: ['', Validators.required],
      currentLocation: ['', Validators.required],
      descriptionOfWork: ['', Validators.required],
      forwardProductionCompleted: ['', Validators.required],
      safetyConcerns: ['', Validators.required],
      incidentDelayConcerns: ['', Validators.required],
      additionalComments: [''],
      cmPunchListLink: [''],
      nextStepsAndFollowUp: ['', Validators.required]
    });
  }

  private loadLookupOptions(): void {
    // Load lookup options for each field from the backend
    const fields = [
      { name: 'SegmentId', target: 'segmentIdOptions' },
      { name: 'CurrentLocation', target: 'currentLocationOptions' },
      { name: 'DescriptionOfWork', target: 'descriptionOfWorkOptions' },
      { name: 'ForwardProductionCompleted', target: 'forwardProductionOptions' },
      { name: 'SafetyConcerns', target: 'safetyConcernsOptions' },
      { name: 'IncidentDelayConcerns', target: 'incidentDelayOptions' },
      { name: 'NextStepsAndFollowUp', target: 'nextStepsOptions' }
    ];

    fields.forEach(field => {
      this.dailyReportService.getLookupOptions(field.name).subscribe({
        next: (options) => {
          const merged = field.name === 'DescriptionOfWork'
            ? this.mergeOptions(this.defaultDescriptionOptions, options)
            : options;
          (this as any)[field.target] = merged;
        },
        error: (error) => {
          console.error(`Error loading ${field.name} options:`, error);
          // Keep default "Other" option if loading fails
        }
      });
    });
  }

  private setupAutocompleteFilters(): void {
    // Setup filtered observables for each autocomplete field
    this.filteredSegmentIds = this.dailyReportForm.get('segmentId')!.valueChanges.pipe(
      startWith(''),
      map(value => this._filter(value || '', this.segmentIdOptions))
    );

    this.filteredLocations = this.dailyReportForm.get('currentLocation')!.valueChanges.pipe(
      startWith(''),
      map(value => this._filter(value || '', this.currentLocationOptions))
    );

    this.filteredDescriptions = this.dailyReportForm.get('descriptionOfWork')!.valueChanges.pipe(
      startWith(''),
      map(value => this._filter(value || '', this.descriptionOfWorkOptions))
    );

    this.filteredProduction = this.dailyReportForm.get('forwardProductionCompleted')!.valueChanges.pipe(
      startWith(''),
      map(value => this._filter(value || '', this.forwardProductionOptions))
    );

    this.filteredSafety = this.dailyReportForm.get('safetyConcerns')!.valueChanges.pipe(
      startWith(''),
      map(value => this._filter(value || '', this.safetyConcernsOptions))
    );

    this.filteredIncidents = this.dailyReportForm.get('incidentDelayConcerns')!.valueChanges.pipe(
      startWith(''),
      map(value => this._filter(value || '', this.incidentDelayOptions))
    );

    this.filteredNextSteps = this.dailyReportForm.get('nextStepsAndFollowUp')!.valueChanges.pipe(
      startWith(''),
      map(value => this._filter(value || '', this.nextStepsOptions))
    );
  }

  private _filter(value: string, options: string[]): string[] {
    const filterValue = value.toLowerCase();
    return options.filter(option => option.toLowerCase().includes(filterValue));
  }

  private mergeOptions(defaults: string[], incoming: string[]): string[] {
    const seen = new Set<string>();
    const addAll = (arr: string[]) => {
      arr.forEach(opt => {
        const key = opt?.trim();
        if (key && !seen.has(key)) {
          seen.add(key);
        }
      });
    };
    addAll(defaults);
    addAll(incoming);
    return Array.from(seen);
  }

  onSubmit(): void {
    if (this.dailyReportForm.invalid) {
      this.toastr.error('Please fill in all required fields', 'Validation Error');
      return;
    }

    const currentUser = this.authService.getUser();
    if (!this.submissionUserId) {
      this.toastr.error('Unable to identify the user for this report', 'Error');
      return;
    }

    this.isSubmitting = true;
    const report: DailyReport = {
      ...this.dailyReportForm.value,
      userId: this.submissionUserId,
      userName: this.submissionUserName ?? currentUser?.name ?? currentUser?.userName ?? undefined,
      userEmail: this.submissionUserEmail ?? currentUser?.email ?? currentUser?.userEmail ?? undefined,
      market: this.submissionUserMarket ?? currentUser?.market ?? (currentUser as any)?.marketName ?? undefined
    };

    this.dailyReportService.submitDailyReport(report).subscribe({
      next: (response) => {
        this.toastr.success('Daily report submitted successfully!', 'Success');
        this.dialogRef.close(true);
      },
      error: (error) => {
        this.isSubmitting = false;
        const errorMessage = error.error?.message || 'Failed to submit daily report. Please try again.';
        this.toastr.error(errorMessage, 'Error');
        console.error('Error submitting daily report:', error);
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  close(): void {
    this.dialogRef.close();
  }

  // Helper method to check if a field has errors and is touched
  hasError(fieldName: string): boolean {
    const field = this.dailyReportForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  // Helper method to get error message for a field
  getErrorMessage(fieldName: string): string {
    const field = this.dailyReportForm.get(fieldName);
    if (field?.hasError('required')) {
      return 'This field is required';
    }
    return '';
  }

  autofillLocationFromBrowser(): void {
    if (!navigator.geolocation) {
      this.toastr.warning('Geolocation is not supported in this browser.');
      return;
    }

    this.isLocating = true;
    navigator.geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;
        this.geocodingService.reverseGeocode(latitude, longitude).subscribe({
          next: response => {
            this.isLocating = false;
            const display = this.extractCountyStateDisplay(response);
            if (display) {
              this.dailyReportForm.patchValue({ currentLocation: display });
            } else {
              this.toastr.warning('Could not determine your county and state.');
            }
          },
          error: () => {
            this.isLocating = false;
            this.toastr.error('Unable to fetch your location.');
          }
        });
      },
      () => {
        this.isLocating = false;
        this.toastr.warning('Location access was denied.');
      }
    );
  }

  private extractCountyStateDisplay(geoResponse: any): string | null {
    const components = geoResponse?.results?.[0]?.address_components || [];
    const countyComponent = components.find((c: any) => (c.types || []).includes('administrative_area_level_2'));
    const stateComponent = components.find((c: any) => (c.types || []).includes('administrative_area_level_1'));

    const rawCounty = countyComponent?.long_name || '';
    const countyName = rawCounty.replace(/ county$/i, '').trim();
    const stateName = stateComponent?.long_name || '';
    const stateAbbrev = StateAbbreviation[stateName as keyof typeof StateAbbreviation] || stateComponent?.short_name || '';

    if (!countyName || !stateAbbrev) return null;
    return `${countyName}, ${stateAbbrev}`;
  }

  private resolveSubmissionUser(): void {
    const currentUser = this.authService.getUser();
    const target = this.data?.targetUser;

    const resolvedId = target?.userId || target?.id || currentUser?.id;
    this.submissionUserId = resolvedId ?? undefined;
    this.submissionUserName = target?.userName || target?.name || currentUser?.name || currentUser?.userName;
    this.submissionUserEmail = target?.userEmail || target?.email || currentUser?.email || currentUser?.userEmail;
    this.submissionUserMarket = target?.market ?? currentUser?.market ?? (currentUser as any)?.marketName ?? null;
    this.isSubmittingForAnotherUser = !!(target && resolvedId !== currentUser?.id);
  }
}
