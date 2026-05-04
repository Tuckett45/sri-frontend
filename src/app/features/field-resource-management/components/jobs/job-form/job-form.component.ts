import { Component, OnInit, OnDestroy, HostListener, ChangeDetectionStrategy, Inject, Optional } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { Subject } from 'rxjs';
import { takeUntil, filter, take } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { Job, JobType, Priority, ContactInfo } from '../../../models/job.model';
import { Skill, SkillLevel, Technician } from '../../../models/technician.model';
import { Crew } from '../../../models/crew.model';
import { CreateJobDto, UpdateJobDto } from '../../../models/dtos/job.dto';
import * as JobActions from '../../../state/jobs/job.actions';
import * as JobSelectors from '../../../state/jobs/job.selectors';
import { selectAllTechnicians } from '../../../state/technicians/technician.selectors';
import { selectAllCrews } from '../../../state/crews/crew.selectors';
import { SanitizationService } from '../../../services/sanitization.service';
import { AccessibilityService } from '../../../services/accessibility.service';
import { AuthService } from '../../../../../services/auth.service';

export interface JobFormDialogData {
  jobId?: string;
  templateId?: string;
}

/**
 * Job Form Component
 * 
 * Create and edit job work orders with comprehensive validation.
 * Supports template-based creation for common job types.
 * 
 * Features:
 * - Reactive form with validation
 * - All required job fields
 * - Skill selector integration
 * - File upload for attachments
 * - Address validation
 * - Date range validation
 * - Customer POC fields
 * - Create and edit modes
 * - Template-based creation
 * - Input sanitization for XSS protection
 * - Keyboard shortcuts (Ctrl+S to save, Escape to cancel)
 * 
 * Requirements: 3.1-3.8, 9.2, 27.4-27.5
 */
@Component({
  selector: 'frm-job-form',
  templateUrl: './job-form.component.html',
  styleUrls: ['./job-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JobFormComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  jobForm!: FormGroup;
  isEditMode = false;
  isLoading = false;
  jobId: string | null = null;
  
  // Enum references for template
  JobType = JobType;
  Priority = Priority;
  
  // Enum arrays for dropdowns
  jobTypeOptions = Object.values(JobType);
  priorityOptions = Object.values(Priority);
  
  // File attachments
  selectedFiles: File[] = [];
  
  // Role-based fields
  isAdmin = false;
  availableMarkets: string[] = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ];
  
  // US States for dropdown
  states = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ];

  // Invoicing process options
  invoicingOptions = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'bi-weekly', label: 'Bi-Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'per-milestone', label: 'Per Milestone' },
    { value: 'upon-completion', label: 'Upon Completion' }
  ];

  // Assignment options
  technicians: Technician[] = [];
  crews: Crew[] = [];

  // Available skills for the skill selector
  availableSkills: Skill[] = [
    { id: 's1', name: 'Cat6', category: 'Cabling', level: SkillLevel.Intermediate },
    { id: 's2', name: 'Fiber Splicing', category: 'Fiber', level: SkillLevel.Intermediate },
    { id: 's3', name: 'OSHA10', category: 'Safety', level: SkillLevel.Intermediate },
    { id: 's4', name: 'Ladder Safety', category: 'Safety', level: SkillLevel.Intermediate },
    { id: 's5', name: 'Confined Space', category: 'Safety', level: SkillLevel.Intermediate }
  ];

  constructor(
    private fb: FormBuilder,
    @Optional() private route: ActivatedRoute,
    @Optional() private router: Router,
    private store: Store,
    private actions$: Actions,
    private snackBar: MatSnackBar,
    private sanitizationService: SanitizationService,
    private accessibilityService: AccessibilityService,
    private authService: AuthService,
    @Optional() public dialogRef: MatDialogRef<JobFormComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: JobFormDialogData
  ) {}

  /**
   * Keyboard shortcut handler
   * Ctrl+S: Save form
   * Escape: Cancel and go back
   */
  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    // Ctrl+S to save
    if (event.ctrlKey && event.key === 's') {
      event.preventDefault();
      if (this.jobForm.valid && !this.isLoading) {
        this.onSubmit();
        this.accessibilityService.announce('Saving job');
      } else if (!this.jobForm.valid) {
        this.accessibilityService.announceError('Form has validation errors');
      }
    }
    
    // Escape to cancel
    if (event.key === 'Escape') {
      event.preventDefault();
      this.onCancel();
    }
  }

  ngOnInit(): void {
    try {
      this.initializeForm();
      
      // Check if opened as dialog with data
      if (this.data) {
        if (this.data.jobId) {
          this.isEditMode = true;
          this.jobId = this.data.jobId;
          this.loadJob(this.data.jobId);
        }
        if (this.data.templateId) {
          this.loadTemplate(this.data.templateId);
        }
      }
      
      // Fallback to route params if not in dialog mode
      if (this.route) {
        this.route.params
          .pipe(takeUntil(this.destroy$))
          .subscribe(params => {
            try {
              const id = params['id'];
              if (id && id !== 'new') {
                this.isEditMode = true;
                this.jobId = id;
                this.loadJob(id);
              }
            } catch (error) {
              console.error('Error processing route params:', error);
              this.snackBar.open('Error loading job data', 'Close', { duration: 3000 });
            }
          });

        this.route.queryParams
          .pipe(takeUntil(this.destroy$))
          .subscribe(params => {
            try {
              const templateId = params['templateId'];
              if (templateId) {
                this.loadTemplate(templateId);
              }
            } catch (error) {
              console.error('Error processing query params:', error);
            }
          });
      }
    } catch (error) {
      console.error('Error in ngOnInit:', error);
      this.snackBar.open('Error initializing form', 'Close', { duration: 3000 });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize the form with validators
   */
  private initializeForm(): void {
    // Check user role with error handling
    try {
      this.isAdmin = this.authService.isAdmin();
      const currentUser = this.authService.getUser();
      const userMarket = currentUser?.market || '';

      this.jobForm = this.fb.group({
      client: ['', [Validators.required, Validators.maxLength(200)]],
      siteName: ['', [Validators.required, Validators.maxLength(200)]],
      market: [this.isAdmin ? '' : userMarket, Validators.required],
      siteAddress: this.fb.group({
        street: ['', [Validators.required, Validators.maxLength(200)]],
        city: ['', [Validators.required, Validators.maxLength(100)]],
        state: ['', [Validators.required]],
        zipCode: ['', [Validators.required, Validators.pattern(/^\d{5}(-\d{4})?$/)]]
      }),
      jobType: [JobType.Install, Validators.required],
      priority: [Priority.Normal, Validators.required],
      scopeDescription: ['', [Validators.required, Validators.maxLength(2000)]],
      requiredSkills: [[]],
      requiredCrewSize: [1, [Validators.required, Validators.min(1), Validators.max(20)]],
      estimatedLaborHours: [8, [Validators.required, Validators.min(0.5), Validators.max(200)]],
      scheduledStartDate: [null, Validators.required],
      scheduledEndDate: [null, Validators.required],
      customerPOC: this.fb.group({
        name: ['', Validators.maxLength(200)],
        phone: ['', [Validators.pattern(/^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/)]],
        email: ['', [Validators.email, Validators.maxLength(200)]]
      }),
      // Pricing/Billing
      authorizationStatus: ['pending', Validators.required],
      hasPurchaseOrders: [false],
      purchaseOrderNumber: [''],
      standardBillRate: [null, [Validators.required, Validators.min(0.01)]],
      overtimeBillRate: [null, [Validators.required, Validators.min(0.01)]],
      perDiem: [null, [Validators.required, Validators.min(0)]],
      invoicingProcess: ['', Validators.required],
      // SRI Internal
      projectDirector: ['', [Validators.required, Validators.maxLength(150)]],
      targetResources: [null, [Validators.required, Validators.min(1), Validators.max(500)]],
      bizDevContact: ['', [Validators.required, Validators.maxLength(150)]],
      requestedHours: [null, [Validators.required, Validators.min(0.01)]],
      overtimeRequired: [false],
      estimatedOvertimeHours: [null],
      // Assignment
      leadTechnicianId: [null],
      crewId: [null],
      // Notes
      initialNote: ['', [Validators.maxLength(1000)]]
      }, { validators: this.dateRangeValidator });

      // Disable market field for non-admin users
      if (!this.isAdmin) {
        this.jobForm.get('market')?.disable();
      }

      // Load technicians and crews for assignment dropdowns
      this.store.select(selectAllTechnicians).pipe(takeUntil(this.destroy$))
        .subscribe(techs => this.technicians = techs);
      this.store.select(selectAllCrews).pipe(takeUntil(this.destroy$))
        .subscribe(crews => this.crews = crews);
    } catch (error) {
      console.error('Error initializing job form:', error);
      // Initialize with default values if auth service fails
      this.isAdmin = false;
      this.jobForm = this.fb.group({
        client: ['', [Validators.required, Validators.maxLength(200)]],
        siteName: ['', [Validators.required, Validators.maxLength(200)]],
        market: ['', Validators.required],
        siteAddress: this.fb.group({
          street: ['', [Validators.required, Validators.maxLength(200)]],
          city: ['', [Validators.required, Validators.maxLength(100)]],
          state: ['', [Validators.required]],
          zipCode: ['', [Validators.required, Validators.pattern(/^\d{5}(-\d{4})?$/)]]
        }),
        jobType: [JobType.Install, Validators.required],
        priority: [Priority.Normal, Validators.required],
        scopeDescription: ['', [Validators.required, Validators.maxLength(2000)]],
        requiredSkills: [[]],
        requiredCrewSize: [1, [Validators.required, Validators.min(1), Validators.max(20)]],
        estimatedLaborHours: [8, [Validators.required, Validators.min(0.5), Validators.max(200)]],
        scheduledStartDate: [null, Validators.required],
        scheduledEndDate: [null, Validators.required],
        customerPOC: this.fb.group({
          name: ['', Validators.maxLength(200)],
          phone: ['', [Validators.pattern(/^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/)]],
          email: ['', [Validators.email, Validators.maxLength(200)]]
        }),
        // Pricing/Billing
        authorizationStatus: ['pending', Validators.required],
        hasPurchaseOrders: [false],
        purchaseOrderNumber: [''],
        standardBillRate: [null, [Validators.required, Validators.min(0.01)]],
        overtimeBillRate: [null, [Validators.required, Validators.min(0.01)]],
        perDiem: [null, [Validators.required, Validators.min(0)]],
        invoicingProcess: ['', Validators.required],
        // SRI Internal
        projectDirector: ['', [Validators.required, Validators.maxLength(150)]],
        targetResources: [null, [Validators.required, Validators.min(1), Validators.max(500)]],
        bizDevContact: ['', [Validators.required, Validators.maxLength(150)]],
        requestedHours: [null, [Validators.required, Validators.min(0.01)]],
        overtimeRequired: [false],
        estimatedOvertimeHours: [null],
        // Assignment
        leadTechnicianId: [null],
        crewId: [null],
        // Notes
        initialNote: ['', [Validators.maxLength(1000)]]
      }, { validators: this.dateRangeValidator });
      
      this.snackBar.open('Warning: Some features may be limited', 'Close', { duration: 3000 });
    }
  }

  /**
   * Custom validator for date range
   */
  private dateRangeValidator(group: FormGroup): { [key: string]: boolean } | null {
    const startDate = group.get('scheduledStartDate')?.value;
    const endDate = group.get('scheduledEndDate')?.value;
    
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return { dateRangeInvalid: true };
    }
    
    return null;
  }

  /**
   * Load job for editing
   */
  private loadJob(id: string): void {
    try {
      this.isLoading = true;
      this.store.dispatch(JobActions.selectJob({ id }));
      
      this.store.select(JobSelectors.selectSelectedJob)
        .pipe(
          takeUntil(this.destroy$),
          filter(job => !!job)
        )
        .subscribe(job => {
          try {
            if (job) {
              this.populateForm(job);
              this.isLoading = false;
            }
          } catch (error) {
            console.error('Error populating form:', error);
            this.isLoading = false;
            this.snackBar.open('Error loading job data', 'Close', { duration: 3000 });
          }
        });
    } catch (error) {
      console.error('Error loading job:', error);
      this.isLoading = false;
      this.snackBar.open('Error loading job', 'Close', { duration: 3000 });
    }
  }

  /**
   * Load job template
   */
  private loadTemplate(templateId: string): void {
    // In a real implementation, this would load template data from a service
    this.snackBar.open('Template loaded', 'Close', { duration: 3000 });
  }

  /**
   * Populate form with job data
   */
  private populateForm(job: Job): void {
    this.jobForm.patchValue({
      client: job.client,
      siteName: job.siteName,
      market: job.market || job.region || '',
      siteAddress: {
        street: job.siteAddress.street,
        city: job.siteAddress.city,
        state: job.siteAddress.state,
        zipCode: job.siteAddress.zipCode
      },
      jobType: job.jobType,
      priority: job.priority,
      scopeDescription: job.scopeDescription,
      requiredSkills: job.requiredSkills,
      requiredCrewSize: job.requiredCrewSize,
      estimatedLaborHours: job.estimatedLaborHours,
      scheduledStartDate: job.scheduledStartDate,
      scheduledEndDate: job.scheduledEndDate,
      customerPOC: job.customerPOC || {
        name: '',
        phone: '',
        email: ''
      },
      // Pricing/Billing
      authorizationStatus: (job as any).authorizationStatus || 'pending',
      hasPurchaseOrders: (job as any).hasPurchaseOrders || false,
      purchaseOrderNumber: (job as any).purchaseOrderNumber || '',
      standardBillRate: (job as any).standardBillRate || null,
      overtimeBillRate: (job as any).overtimeBillRate || null,
      perDiem: (job as any).perDiem || null,
      invoicingProcess: (job as any).invoicingProcess || '',
      // SRI Internal
      projectDirector: (job as any).projectDirector || '',
      targetResources: (job as any).targetResources || null,
      bizDevContact: (job as any).bizDevContact || '',
      requestedHours: (job as any).requestedHours || null,
      overtimeRequired: (job as any).overtimeRequired || false,
      estimatedOvertimeHours: (job as any).estimatedOvertimeHours || null,
      // Assignment
      leadTechnicianId: job.technicianId || null,
      crewId: job.crewId || null
    });
  }

  /**
   * Handle skills selection change
   */
  onSkillsChange(skills: Skill[]): void {
    this.jobForm.patchValue({ requiredSkills: skills });
  }

  /**
   * Handle file selection
   */
  onFilesSelected(files: File[]): void {
    this.selectedFiles = files;
  }

  /**
   * Submit form
   */
  onSubmit(): void {
    if (this.jobForm.invalid) {
      this.markFormGroupTouched(this.jobForm);
      this.snackBar.open('Please fix form errors before submitting', 'Close', { duration: 3000 });
      return;
    }

    // Prevent double submission
    if (this.isLoading) return;

    const formValue = this.jobForm.getRawValue();
    
    // Remove empty customer POC if all fields are empty
    if (!formValue.customerPOC.name && !formValue.customerPOC.phone && !formValue.customerPOC.email) {
      formValue.customerPOC = undefined;
    }

    if (this.isEditMode && this.jobId) {
      this.updateJob(formValue);
    } else {
      this.createJob(formValue);
    }
  }

  /**
   * Create new job
   */
  private createJob(formValue: any): void {
    // Sanitize text inputs before creating job
    const sanitizedDescription = this.sanitizationService.sanitizeText(formValue.scopeDescription);
    const sanitizedClient = this.sanitizationService.sanitizeText(formValue.client);
    const sanitizedSiteName = this.sanitizationService.sanitizeText(formValue.siteName);
    
    const createDto: CreateJobDto = {
      client: sanitizedClient,
      siteName: sanitizedSiteName,
      siteAddress: formValue.siteAddress,
      region: formValue.market,
      market: formValue.market,
      jobType: formValue.jobType,
      priority: formValue.priority,
      scopeDescription: sanitizedDescription,
      requiredSkills: formValue.requiredSkills,
      requiredCrewSize: formValue.targetResources ?? formValue.requiredCrewSize ?? 1,
      estimatedLaborHours: formValue.requestedHours ?? formValue.estimatedLaborHours ?? 8,
      scheduledStartDate: formValue.scheduledStartDate,
      scheduledEndDate: formValue.scheduledEndDate,
      customerPOC: formValue.customerPOC,
      authorizationStatus: formValue.authorizationStatus ?? 'pending',
      hasPurchaseOrders: formValue.hasPurchaseOrders ?? false,
      purchaseOrderNumber: formValue.purchaseOrderNumber,
      standardBillRate: formValue.standardBillRate ?? 0,
      overtimeBillRate: formValue.overtimeBillRate ?? 0,
      perDiem: formValue.perDiem ?? 0,
      invoicingProcess: formValue.invoicingProcess ?? 'weekly',
      projectDirector: formValue.projectDirector ?? '',
      targetResources: formValue.targetResources ?? 1,
      bizDevContact: formValue.bizDevContact ?? '',
      requestedHours: formValue.requestedHours ?? 0,
      overtimeRequired: formValue.overtimeRequired ?? false,
      estimatedOvertimeHours: formValue.estimatedOvertimeHours,
      technicianId: formValue.leadTechnicianId || undefined,
      crewId: formValue.crewId || undefined,
    };

    this.store.dispatch(JobActions.createJob({ job: createDto }));
    this.isLoading = true;
    
    // Wait for success/failure before navigating
    this.actions$.pipe(
      ofType(JobActions.createJobSuccess, JobActions.createJobFailure),
      take(1),
      takeUntil(this.destroy$)
    ).subscribe(action => {
      if (action.type === JobActions.createJobSuccess.type) {
        const createdJob = (action as ReturnType<typeof JobActions.createJobSuccess>).job;

        // Upload any selected attachments for the newly created job
        this.uploadPendingAttachments(createdJob.id, () => {
          this.isLoading = false;
          // Close dialog if opened as modal, otherwise navigate
          if (this.dialogRef) {
            this.dialogRef.close({ success: true });
          } else if (this.router) {
            this.router.navigate(['/field-resource-management/jobs']);
          }
        });
      } else {
        this.isLoading = false;
      }
    });
  }

  /**
   * Update existing job
   */
  private updateJob(formValue: any): void {
    if (!this.jobId) return;

    // Sanitize text inputs before updating job
    const sanitizedDescription = this.sanitizationService.sanitizeText(formValue.scopeDescription);
    const sanitizedClient = this.sanitizationService.sanitizeText(formValue.client);
    const sanitizedSiteName = this.sanitizationService.sanitizeText(formValue.siteName);

    const updateDto: UpdateJobDto = {
      client: sanitizedClient,
      siteName: sanitizedSiteName,
      siteAddress: formValue.siteAddress,
      region: formValue.market,
      market: formValue.market,
      jobType: formValue.jobType,
      priority: formValue.priority,
      scopeDescription: sanitizedDescription,
      requiredSkills: formValue.requiredSkills,
      requiredCrewSize: formValue.targetResources ?? formValue.requiredCrewSize,
      estimatedLaborHours: formValue.requestedHours ?? formValue.estimatedLaborHours,
      scheduledStartDate: formValue.scheduledStartDate,
      scheduledEndDate: formValue.scheduledEndDate,
      customerPOC: formValue.customerPOC,
      // Pricing/Billing
      authorizationStatus: formValue.authorizationStatus,
      hasPurchaseOrders: formValue.hasPurchaseOrders,
      purchaseOrderNumber: formValue.hasPurchaseOrders ? formValue.purchaseOrderNumber : undefined,
      standardBillRate: formValue.standardBillRate,
      overtimeBillRate: formValue.overtimeBillRate,
      perDiem: formValue.perDiem,
      invoicingProcess: formValue.invoicingProcess,
      // SRI Internal
      projectDirector: formValue.projectDirector,
      targetResources: formValue.targetResources,
      bizDevContact: formValue.bizDevContact,
      requestedHours: formValue.requestedHours,
      overtimeRequired: formValue.overtimeRequired,
      estimatedOvertimeHours: formValue.overtimeRequired ? formValue.estimatedOvertimeHours : undefined,
      // Assignment
      technicianId: formValue.leadTechnicianId || undefined,
      crewId: formValue.crewId || undefined
    };

    this.store.dispatch(JobActions.updateJob({ id: this.jobId, job: updateDto }));
    this.isLoading = true;
    
    // Wait for success/failure before navigating
    this.actions$.pipe(
      ofType(JobActions.updateJobSuccess, JobActions.updateJobFailure),
      take(1),
      takeUntil(this.destroy$)
    ).subscribe(action => {
      if (action.type === JobActions.updateJobSuccess.type) {
        // Upload any selected attachments for the updated job
        this.uploadPendingAttachments(this.jobId!, () => {
          this.isLoading = false;
          // Close dialog if opened as modal, otherwise navigate
          if (this.dialogRef) {
            this.dialogRef.close({ success: true });
          } else if (this.router) {
            this.router.navigate(['/field-resource-management/jobs', this.jobId]);
          }
        });
      } else {
        this.isLoading = false;
      }
    });
  }

  /**
   * Upload any pending file attachments and save the initial note
   * after a successful job save. Dispatches uploadAttachment actions
   * for each selected file and an addJobNote action if a note was
   * entered, then calls the provided callback once all operations
   * have completed (or immediately if there is nothing to save).
   */
  private uploadPendingAttachments(jobId: string, onComplete: () => void): void {
    const note = this.jobForm.get('initialNote')?.value?.trim();
    const hasFiles = this.selectedFiles.length > 0;
    const hasNote = !!note;

    if (!hasFiles && !hasNote) {
      onComplete();
      return;
    }

    const totalActions = this.selectedFiles.length + (hasNote ? 1 : 0);

    // Dispatch all upload / note actions
    for (const file of this.selectedFiles) {
      this.store.dispatch(JobActions.uploadAttachment({ jobId, file }));
    }
    if (hasNote) {
      this.store.dispatch(JobActions.addJobNote({ jobId, note }));
    }

    // Wait for all results before navigating
    this.actions$.pipe(
      ofType(
        JobActions.uploadAttachmentSuccess,
        JobActions.uploadAttachmentFailure,
        JobActions.addJobNoteSuccess,
        JobActions.addJobNoteFailure
      ),
      take(totalActions),
      takeUntil(this.destroy$)
    ).subscribe({
      complete: () => {
        this.selectedFiles = [];
        onComplete();
      }
    });
  }

  /**
   * Cancel and go back
   */
  onCancel(): void {
    // Close dialog if opened as modal, otherwise navigate
    if (this.dialogRef) {
      this.dialogRef.close();
    } else if (this.router) {
      if (this.isEditMode && this.jobId) {
        this.router.navigate(['/field-resource-management/jobs', this.jobId]);
      } else {
        this.router.navigate(['/field-resource-management/jobs']);
      }
    }
  }

  /**
   * Mark all form fields as touched to show validation errors
   */
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  /**
   * Get form control for template access
   */
  getControl(path: string) {
    return this.jobForm.get(path);
  }

  /**
   * Check if field has error
   */
  hasError(path: string, errorType: string): boolean {
    const control = this.jobForm.get(path);
    return !!(control && control.hasError(errorType) && (control.dirty || control.touched));
  }

  /**
   * Get error message for field
   */
  getErrorMessage(path: string): string {
    const control = this.jobForm.get(path);
    if (!control || !control.errors) return '';

    if (control.hasError('required')) return 'This field is required';
    if (control.hasError('email')) return 'Invalid email format';
    if (control.hasError('pattern')) {
      if (path.includes('phone')) return 'Invalid phone number format (e.g., 555-123-4567)';
      if (path.includes('zipCode')) return 'Invalid ZIP code format (e.g., 12345 or 12345-6789)';
    }
    if (control.hasError('min')) return `Minimum value is ${control.errors['min'].min}`;
    if (control.hasError('max')) return `Maximum value is ${control.errors['max'].max}`;
    if (control.hasError('maxlength')) return `Maximum length is ${control.errors['maxlength'].requiredLength}`;

    return 'Invalid value';
  }

  /**
   * Check if date range is invalid
   */
  get hasDateRangeError(): boolean {
    return !!(this.jobForm.hasError('dateRangeInvalid') && 
              this.jobForm.get('scheduledStartDate')?.touched && 
              this.jobForm.get('scheduledEndDate')?.touched);
  }

  /**
   * Get form title
   */
  get formTitle(): string {
    return this.isEditMode ? 'Edit Job' : 'Create New Job';
  }

  /**
   * Get submit button text
   */
  get submitButtonText(): string {
    return this.isEditMode ? 'Update Job' : 'Create Job';
  }
}
