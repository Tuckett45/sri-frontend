import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { Observable, map, startWith } from 'rxjs';
import { DailyReport } from 'src/app/models/daily-report.model';
import { DailyReportService } from 'src/app/services/daily-report.service';
import { AuthService } from 'src/app/services/auth.service';

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
  descriptionOfWorkOptions: string[] = ['Other'];
  forwardProductionOptions: string[] = ['Other'];
  safetyConcernsOptions: string[] = ['Other'];
  incidentDelayOptions: string[] = ['Other'];
  nextStepsOptions: string[] = ['Other'];

  // Filtered options for autocomplete
  filteredSegmentIds!: Observable<string[]>;
  filteredLocations!: Observable<string[]>;
  filteredDescriptions!: Observable<string[]>;
  filteredProduction!: Observable<string[]>;
  filteredSafety!: Observable<string[]>;
  filteredIncidents!: Observable<string[]>;
  filteredNextSteps!: Observable<string[]>;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<DailyReportModalComponent>,
    private dailyReportService: DailyReportService,
    private toastr: ToastrService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
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
          (this as any)[field.target] = options;
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

  onSubmit(): void {
    if (this.dailyReportForm.invalid) {
      this.toastr.error('Please fill in all required fields', 'Validation Error');
      return;
    }

    // Get current user ID from auth service
    const currentUser = this.authService.getUser();
    if (!currentUser || !currentUser.id) {
      this.toastr.error('Unable to identify current user', 'Error');
      return;
    }

    this.isSubmitting = true;
    const report: DailyReport = {
      ...this.dailyReportForm.value,
      userId: currentUser.id
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
}
