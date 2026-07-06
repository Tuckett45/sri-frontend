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
import { Observable, Subject, combineLatest, BehaviorSubject } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
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
  DashboardQuote,
  DashboardUser,
  RfpRecord
} from '../../../models/quote-workflow.model';
import { CustomValidators } from '../../../validators/custom-validators';
import { QuoteWorkflowService } from '../../../services/quote-workflow.service';
import { ClientConfigurationService } from '../../../services/client-configuration.service';
import { RfpDashboardService } from '../../../services/rfp-dashboard.service';
import * as QuoteActions from '../../../state/quotes/quote.actions';
import * as DashboardActions from '../../../state/quotes/dashboard.actions';
import * as DashboardSelectors from '../../../state/quotes/dashboard.selectors';

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

  /** True when editing an existing RFP record */
  isEditMode = false;

  /** The existing record being edited (if in edit mode) */
  editRecord: DashboardQuote | null = null;

  rfpForm!: FormGroup;
  isSubmitting = false;
  draftRestored = false;

  filteredClients$!: Observable<string[]>;
  filteredUsers$!: Observable<DashboardUser[]>;
  users$: Observable<DashboardUser[]> = new Observable<DashboardUser[]>();
  private allUsers$ = new BehaviorSubject<DashboardUser[]>([]);
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
    private rfpDashboardService: RfpDashboardService,
    @Optional() public dialogRef: MatDialogRef<RfpIntakeFormComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public dialogData: any
  ) {
    this.isDialog = !!this.dialogRef;
    this.isEditMode = !!this.dialogData?.editRecord;
    this.editRecord = this.dialogData?.editRecord || null;
    if (this.editRecord) {
      this.quoteId = this.editRecord.id;
    }
  }

  ngOnInit(): void {
    this.initializeForm();
    this.setupClientAutocomplete();
    this.users$ = this.store.select(DashboardSelectors.selectDashboardUsers);
    this.setupAssignedUserAutocomplete();

    // If editing an existing record, populate immediately for most fields,
    // then re-patch assignedToQuote once users are loaded so displayWith resolves correctly
    if (this.isEditMode && this.editRecord) {
      this.populateFormForEdit(this.editRecord);

      // Re-trigger the assignedToQuote value once users load so displayWith can resolve the name
      if (this.editRecord.assignedToQuote) {
        this.allUsers$.pipe(
          filter(users => users.length > 0),
          take(1),
          takeUntil(this.destroy$)
        ).subscribe(() => {
          const ctrl = this.rfpForm.get('assignedToQuote');
          if (ctrl) {
            ctrl.setValue(ctrl.value);
          }
        });
      }
    } else {
      this.restoreDraft();
      this.setupDraftAutoSave();
    }

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
      requestorName: ['', [Validators.maxLength(200)]],
      assignedToQuote: [''],
      siteName: ['', [Validators.maxLength(200)]],
      siteAddress: this.fb.group({
        street: ['', [Validators.maxLength(500)]],
        city: ['', [Validators.maxLength(200)]],
        state: [''],
        zipCode: ['']
      }),
      customerContact: this.fb.group({
        name: ['', [Validators.maxLength(200)]],
        phone: [''],
        email: ['']
      }),
      scopeOfWork: ['', [Validators.maxLength(5000)]],
      materialSpecifications: ['', [Validators.maxLength(5000)]],
      dates: this.fb.group({
        rfpReceivedDate: [null, [Validators.required]],
        requestedCompletionDate: [null]
      }, { validators: CustomValidators.dateRange('rfpReceivedDate', 'requestedCompletionDate') }),
      jobType: [JobType.Install],
      priority: [Priority.Normal]
    });
  }

  /**
   * Pre-populate form with existing DashboardQuote data for edit mode.
   */
  private populateFormForEdit(record: DashboardQuote): void {
    this.rfpForm.patchValue({
      clientName: record.customer || '',
      projectName: record.description || '',
      requestorName: record.requestorName || '',
      assignedToQuote: record.assignedToQuote || '',
      dates: {
        rfpReceivedDate: record.rfpReceiveDate ? new Date(record.rfpReceiveDate) : null,
        requestedCompletionDate: record.quoteDueDate ? new Date(record.quoteDueDate) : null
      }
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

  private setupAssignedUserAutocomplete(): void {
    const assignedControl = this.rfpForm.get('assignedToQuote');
    if (!assignedControl) return;

    // Fetch users directly from the service to guarantee they're available
    this.rfpDashboardService.getUsers().pipe(
      takeUntil(this.destroy$)
    ).subscribe(users => {
      this.allUsers$.next(users);
      // Also dispatch to store so other components can use them
      this.store.dispatch(DashboardActions.loadUsersSuccess({ users }));
    });

    this.filteredUsers$ = combineLatest([
      assignedControl.valueChanges.pipe(startWith(assignedControl.value || '')),
      this.allUsers$
    ]).pipe(
      map(([value, users]) => {
        // If value matches a user ID (i.e. we just set it programmatically), show all users
        const isUserId = users.some(u => u.id === value);
        if (!value || isUserId) return users;

        const filterText = (typeof value === 'string' ? value : '').toLowerCase();
        return users.filter(user =>
          user.fullName.toLowerCase().includes(filterText)
        );
      })
    );
  }

  /**
   * Display function for the Assigned to Quote autocomplete.
   * Maps a user ID back to the user's full name for display in the input.
   */
  displayAssignedUser = (userId: string): string => {
    if (!userId) return '';
    const users = this.allUsers$.getValue();
    const user = users.find(u => u.id === userId);
    return user ? user.fullName : userId;
  }

  onAssignedUserSelected(userId: string): void {
    this.rfpForm.get('assignedToQuote')?.setValue(userId);
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

    // ─── Edit Mode: update existing record via dashboard-fields ───────────
    if (this.isEditMode && this.editRecord) {
      const fields: Partial<DashboardQuote> = {
        customer: formValue.clientName,
        description: formValue.projectName,
        requestorName: formValue.requestorName || null,
        assignedToQuote: formValue.assignedToQuote || null,
        rfpReceiveDate: formValue.dates.rfpReceivedDate
          ? new Date(formValue.dates.rfpReceivedDate).toISOString()
          : null,
        quoteDueDate: formValue.dates.requestedCompletionDate
          ? new Date(formValue.dates.requestedCompletionDate).toISOString()
          : null
      };

      this.store.dispatch(DashboardActions.updateDashboardFields({
        quoteId: this.editRecord.id,
        fields
      }));

      this.actions$
        .pipe(
          ofType(DashboardActions.updateDashboardFieldsSuccess, DashboardActions.updateDashboardFieldsFailure),
          take(1),
          takeUntil(this.destroy$)
        )
        .subscribe(action => {
          this.isSubmitting = false;

          if (action.type === DashboardActions.updateDashboardFieldsSuccess.type) {
            this.snackBar.open('RFP updated successfully', 'Close', { duration: 3000 });
            if (this.isDialog) {
              this.dialogRef.close({ success: true, updated: true });
            }
          } else {
            const error = (action as ReturnType<typeof DashboardActions.updateDashboardFieldsFailure>).error;
            this.snackBar.open(`Error updating RFP: ${error}`, 'Close', { duration: 5000 });
          }
        });

      return;
    }

    // ─── Create Mode: create new quote ───────────────────────────────────
    const rfpData: RfpRecord = {
      clientName: formValue.clientName,
      projectName: formValue.projectName,
      requestorName: formValue.requestorName || undefined,
      assignedToQuote: formValue.assignedToQuote || undefined,
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
          this.snackBar.open('RFP created successfully', 'Close', { duration: 3000 });

          if (this.isDialog) {
            this.dialogRef.close({ success: true, quoteId: quote.id });
          } else {
            this.router.navigate(['/field-resource-management/quotes']);
          }
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
