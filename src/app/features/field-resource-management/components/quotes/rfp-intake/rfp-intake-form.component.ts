import {
  Component,
  OnInit,
  OnDestroy,
  Input,
  Optional,
  Inject,
  ChangeDetectionStrategy
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { Observable, Subject } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  map,
  startWith,
  take,
  takeUntil
} from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { JobType, Priority } from '../../../models/job.model';
import {
  ClientConfiguration,
  RfpRecord
} from '../../../models/quote-workflow.model';
import { CustomValidators } from '../../../validators/custom-validators';
import { QuoteWorkflowService } from '../../../services/quote-workflow.service';
import { ClientConfigurationService } from '../../../services/client-configuration.service';
import * as QuoteActions from '../../../state/quotes/quote.actions';

/**
 * RFP Intake Form Component
 *
 * Multi-section reactive form for capturing all RFP/RFQ details.
 * Works both as a routed page and as a MatDialog.
 *
 * Requirements: 2.1–2.16, 11.2, 13.1–13.7, 14.1–14.4
 */
@Component({
  selector: 'app-rfp-intake-form',
  templateUrl: './rfp-intake-form.component.html',
  styleUrls: ['./rfp-intake-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RfpIntakeFormComponent implements OnInit, OnDestroy {
  @Input() canEdit = true;
  @Input() quoteId: string | null = null;

  /** True when opened via MatDialog */
  isDialog = false;

  rfpForm!: FormGroup;
  isSubmitting = false;
  draftRestored = false;

  filteredClients$!: Observable<string[]>;
  clientConfiguration: ClientConfiguration | null = null;

  jobTypeOptions = Object.values(JobType);
  priorityOptions = Object.values(Priority);

  states = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ];

  allowedFileTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  maxFileSize = 25 * 1024 * 1024;

  selectedFiles: File[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private store: Store,
    private actions$: Actions,
    private snackBar: MatSnackBar,
    private quoteWorkflowService: QuoteWorkflowService,
    private clientConfigurationService: ClientConfigurationService,
    @Optional() public dialogRef: MatDialogRef<RfpIntakeFormComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public dialogData: any
  ) {
    this.isDialog = !!this.dialogRef;
  }

  ngOnInit(): void {
    this.initializeForm();
    this.setupClientAutocomplete();
    this.restoreDraft();
    this.setupDraftAutoSave();

    if (!this.canEdit) {
      this.rfpForm.disable();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.rfpForm = this.fb.group({
      clientName: ['', [Validators.required, Validators.maxLength(200)]],
      projectName: ['', [Validators.required, Validators.maxLength(200)]],
      siteName: ['', [Validators.required, Validators.maxLength(200)]],
      siteAddress: this.fb.group({
        street: ['', [Validators.required, Validators.maxLength(500)]],
        city: ['', [Validators.required, Validators.maxLength(200)]],
        state: ['', [Validators.required]],
        zipCode: ['', [Validators.required, CustomValidators.zipCode()]]
      }),
      customerContact: this.fb.group({
        name: ['', [Validators.required, Validators.maxLength(200)]],
        phone: ['', [Validators.required, CustomValidators.phoneNumber()]],
        email: ['', [Validators.required, Validators.email]]
      }),
      scopeOfWork: ['', [Validators.required, Validators.maxLength(5000)]],
      materialSpecifications: ['', [Validators.maxLength(5000)]],
      dates: this.fb.group({
        rfpReceivedDate: [null, [Validators.required]],
        requestedCompletionDate: [null]
      }, { validators: CustomValidators.dateRange('rfpReceivedDate', 'requestedCompletionDate') }),
      jobType: [JobType.Install, [Validators.required]],
      priority: [Priority.Normal, [Validators.required]]
    });
  }

  private setupClientAutocomplete(): void {
    const clientNameControl = this.rfpForm.get('clientName');
    if (!clientNameControl) return;

    this.filteredClients$ = clientNameControl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      map(value => this.filterClients(value || ''))
    );
  }

  private filterClients(value: string): string[] {
    return [];
  }

  onClientSelected(clientName: string): void {
    if (!clientName) return;

    this.clientConfigurationService.getClientConfiguration(clientName)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (config) => {
          this.clientConfiguration = config;
        },
        error: () => {
          this.clientConfiguration = this.clientConfigurationService.getDefaultConfiguration();
        }
      });
  }

  private setupDraftAutoSave(): void {
    this.rfpForm.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(3000)
      )
      .subscribe(formValue => {
        if (this.canEdit) {
          this.quoteWorkflowService.saveDraft(this.quoteId, 'rfpIntake', formValue);
        }
      });
  }

  private restoreDraft(): void {
    const draft = this.quoteWorkflowService.restoreDraft(this.quoteId, 'rfpIntake');
    if (draft) {
      this.rfpForm.patchValue(draft);
      this.draftRestored = true;
      this.snackBar.open('Unsaved changes have been restored', 'Dismiss', {
        duration: 5000
      });
    }
  }

  dismissDraftBanner(): void {
    this.draftRestored = false;
  }

  discardDraft(): void {
    this.quoteWorkflowService.clearDraft(this.quoteId, 'rfpIntake');
    this.draftRestored = false;
    this.rfpForm.reset({
      clientName: '',
      projectName: '',
      siteName: '',
      siteAddress: { street: '', city: '', state: '', zipCode: '' },
      customerContact: { name: '', phone: '', email: '' },
      scopeOfWork: '',
      materialSpecifications: '',
      dates: { rfpReceivedDate: null, requestedCompletionDate: null },
      jobType: 'Install',
      priority: 'Normal'
    });
    this.snackBar.open('Draft discarded', 'Close', { duration: 3000 });
  }

  onFilesSelected(files: File[]): void {
    this.selectedFiles = files;
  }

  onSubmit(): void {
    if (this.rfpForm.invalid) {
      this.markFormGroupTouched(this.rfpForm);
      this.snackBar.open('Please fix form errors before submitting', 'Close', {
        duration: 3000
      });
      return;
    }

    if (this.isSubmitting) return;
    this.isSubmitting = true;

    const formValue = this.rfpForm.getRawValue();

    const rfpData: RfpRecord = {
      clientName: formValue.clientName,
      projectName: formValue.projectName,
      siteName: formValue.siteName,
      siteAddress: {
        street: formValue.siteAddress.street,
        city: formValue.siteAddress.city,
        state: formValue.siteAddress.state,
        zipCode: formValue.siteAddress.zipCode
      },
      customerContact: {
        name: formValue.customerContact.name,
        phone: formValue.customerContact.phone,
        email: formValue.customerContact.email
      },
      scopeOfWork: formValue.scopeOfWork,
      materialSpecifications: formValue.materialSpecifications || '',
      rfpReceivedDate: formValue.dates.rfpReceivedDate
        ? new Date(formValue.dates.rfpReceivedDate).toISOString()
        : '',
      requestedCompletionDate: formValue.dates.requestedCompletionDate
        ? new Date(formValue.dates.requestedCompletionDate).toISOString()
        : null,
      jobType: formValue.jobType,
      priority: formValue.priority,
      attachments: []
    };

    this.store.dispatch(QuoteActions.createQuote({ rfpData }));

    this.actions$
      .pipe(
        ofType(QuoteActions.createQuoteSuccess, QuoteActions.createQuoteFailure),
        take(1),
        takeUntil(this.destroy$)
      )
      .subscribe(action => {
        this.isSubmitting = false;

        if (action.type === QuoteActions.createQuoteSuccess.type) {
          const quote = (action as ReturnType<typeof QuoteActions.createQuoteSuccess>).quote;
          this.quoteWorkflowService.clearDraft(this.quoteId, 'rfpIntake');
          this.snackBar.open('Quote created successfully', 'Close', { duration: 3000 });

          if (this.isDialog) {
            this.dialogRef.close({ success: true, quoteId: quote.id });
          }
          this.router.navigate(['/field-resource-management/quotes', quote.id]);
        } else {
          const error = (action as ReturnType<typeof QuoteActions.createQuoteFailure>).error;
          this.snackBar.open(`Error creating quote: ${error}`, 'Close', { duration: 5000 });
        }
      });
  }

  onCancel(): void {
    if (this.isDialog) {
      this.dialogRef.close();
    } else {
      this.router.navigate(['/field-resource-management/quotes']);
    }
  }

  hasError(path: string, errorType: string): boolean {
    const control = this.rfpForm.get(path);
    return !!(control && control.hasError(errorType) && (control.dirty || control.touched));
  }

  getErrorMessage(path: string): string {
    const control = this.rfpForm.get(path);
    if (!control || !control.errors) return '';

    if (control.hasError('required')) return 'This field is required';
    if (control.hasError('email')) return 'Invalid email format';
    if (control.hasError('phoneNumber')) return 'Invalid phone number format (10-digit US number)';
    if (control.hasError('zipCode')) return 'Invalid ZIP code format (e.g., 12345 or 12345-6789)';
    if (control.hasError('maxlength')) {
      return `Maximum length is ${control.errors['maxlength'].requiredLength} characters`;
    }
    if (control.hasError('min')) return `Minimum value is ${control.errors['min'].min}`;
    if (control.hasError('max')) return `Maximum value is ${control.errors['max'].max}`;

    return 'Invalid value';
  }

  get hasDateRangeError(): boolean {
    const datesGroup = this.rfpForm.get('dates');
    return !!(
      datesGroup &&
      datesGroup.hasError('dateRange') &&
      datesGroup.get('rfpReceivedDate')?.touched &&
      datesGroup.get('requestedCompletionDate')?.touched
    );
  }

  getControl(path: string) {
    return this.rfpForm.get(path);
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
}
