import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ChangeDetectionStrategy
} from '@angular/core';
import { FormBuilder, FormGroup, FormArray, FormControl, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';
import { takeUntil, distinctUntilChanged } from 'rxjs/operators';

import { Job } from '../../../../models/job.model';
import { JobDetailsPhaseData, ChecklistContact } from '../../../../models/deployment-checklist.model';
import { CustomValidators } from '../../../../validators/custom-validators';
import { DeploymentChecklistService } from '../../../../services/deployment-checklist.service';
import * as ChecklistActions from '../../../../state/deployment-checklist/checklist.actions';

/**
 * Job Details Phase Component
 *
 * First phase of the Deployment Checklist workflow. Captures SRI job numbers,
 * customer job numbers, change tickets, site access tickets, site information,
 * team contacts, and statement of work.
 *
 * Requirements: 4.1–4.16, 9.1–9.7, 13.1, 13.2
 */
@Component({
  selector: 'app-job-details-phase',
  templateUrl: './job-details-phase.component.html',
  styleUrls: ['./job-details-phase.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JobDetailsPhaseComponent implements OnInit, OnChanges, OnDestroy {
  @Input() jobId!: string;
  @Input() job!: Job;
  @Input() data: JobDetailsPhaseData | null = null;
  @Input() canEdit = false;

  @Output() formDirty = new EventEmitter<boolean>();
  @Output() save = new EventEmitter<JobDetailsPhaseData>();

  form!: FormGroup;
  showDraftBanner = false;

  private destroy$ = new Subject<void>();
  private initialized = false;

  constructor(
    private fb: FormBuilder,
    private store: Store,
    private checklistService: DeploymentChecklistService
  ) {}

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  ngOnInit(): void {
    this.buildForm();
    this.restoreDraftOrData();
    this.setupDirtyTracking();
    this.setupDraftAutoSave();
    this.applyEditability();
    this.initialized = true;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.initialized) {
      return;
    }

    if (changes['data'] && changes['data'].currentValue && !changes['data'].firstChange) {
      this.patchFormFromData(changes['data'].currentValue);
    }

    if (changes['canEdit']) {
      this.applyEditability();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ---------------------------------------------------------------------------
  // Form Construction
  // ---------------------------------------------------------------------------

  private buildForm(): void {
    this.form = this.fb.group({
      sriJobNumbers: this.fb.array([this.createStringControl()]),
      customerJobNumbers: this.fb.array([this.createStringControl()]),
      changeTickets: this.fb.array([this.createStringControl()]),
      siteAccessTickets: this.fb.array([this.createStringControl()]),
      jobStartDate: [null, [Validators.required]],
      jobCompleteDate: [null],
      siteName: [''],
      suiteNumber: [''],
      street: [''],
      cityState: [''],
      zipCode: [''],
      proposedValidationDateTime: [null],
      technicalLead: this.createContactGroup(true),
      technician1: this.createContactGroup(),
      technician2: this.createContactGroup(),
      sriProjectLead: this.createContactGroup(),
      primaryCustomerContact: this.createContactGroup(),
      secondaryCustomerContact: this.createContactGroup(),
      statementOfWork: ['', [Validators.maxLength(5000)]]
    });
  }

  private createContactGroup(nameRequired = false): FormGroup {
    return this.fb.group({
      name: ['', nameRequired ? [Validators.required] : []],
      phone: ['', [CustomValidators.phoneNumber()]],
      email: ['', [Validators.email]]
    });
  }

  private createStringControl(): FormControl {
    return this.fb.control('');
  }

  // ---------------------------------------------------------------------------
  // FormArray Accessors
  // ---------------------------------------------------------------------------

  get sriJobNumbers(): FormArray {
    return this.form.get('sriJobNumbers') as FormArray;
  }

  get customerJobNumbers(): FormArray {
    return this.form.get('customerJobNumbers') as FormArray;
  }

  get changeTickets(): FormArray {
    return this.form.get('changeTickets') as FormArray;
  }

  get siteAccessTickets(): FormArray {
    return this.form.get('siteAccessTickets') as FormArray;
  }

  // ---------------------------------------------------------------------------
  // Dynamic Array Add / Remove
  // ---------------------------------------------------------------------------

  addItem(arrayName: 'sriJobNumbers' | 'customerJobNumbers' | 'changeTickets' | 'siteAccessTickets'): void {
    (this.form.get(arrayName) as FormArray).push(this.createStringControl());
  }

  removeItem(arrayName: 'sriJobNumbers' | 'customerJobNumbers' | 'changeTickets' | 'siteAccessTickets', index: number): void {
    const arr = this.form.get(arrayName) as FormArray;
    if (arr.length > 1) {
      arr.removeAt(index);
    }
  }

  // ---------------------------------------------------------------------------
  // Data Population
  // ---------------------------------------------------------------------------

  private restoreDraftOrData(): void {
    // 1. Try to restore a draft first
    const draft = this.checklistService.restoreDraft(this.jobId, 'jobDetails');
    if (draft) {
      this.patchFormFromData(draft as JobDetailsPhaseData);
      this.showDraftBanner = true;
      return;
    }

    // 2. Populate from @Input() data if available
    if (this.data) {
      this.patchFormFromData(this.data);
    }

    // 3. Pre-populate site info from Job if fields are empty
    this.prePopulateSiteInfo();
  }

  private patchFormFromData(data: JobDetailsPhaseData): void {
    // Rebuild FormArrays to match data length
    this.rebuildFormArray('sriJobNumbers', data.sriJobNumbers);
    this.rebuildFormArray('customerJobNumbers', data.customerJobNumbers);
    this.rebuildFormArray('changeTickets', data.changeTickets);
    this.rebuildFormArray('siteAccessTickets', data.siteAccessTickets);

    this.form.patchValue({
      jobStartDate: data.jobStartDate,
      jobCompleteDate: data.jobCompleteDate,
      siteName: data.siteName ?? '',
      suiteNumber: data.suiteNumber ?? '',
      street: data.street ?? '',
      cityState: data.cityState ?? '',
      zipCode: data.zipCode ?? '',
      proposedValidationDateTime: data.proposedValidationDateTime,
      technicalLead: data.technicalLead ?? { name: '', phone: '', email: '' },
      technician1: data.technician1 ?? { name: '', phone: '', email: '' },
      technician2: data.technician2 ?? { name: '', phone: '', email: '' },
      sriProjectLead: data.sriProjectLead ?? { name: '', phone: '', email: '' },
      primaryCustomerContact: data.primaryCustomerContact ?? { name: '', phone: '', email: '' },
      secondaryCustomerContact: data.secondaryCustomerContact ?? { name: '', phone: '', email: '' },
      statementOfWork: data.statementOfWork ?? ''
    }, { emitEvent: false });
  }

  private rebuildFormArray(arrayName: string, values: string[] | undefined): void {
    const arr = this.form.get(arrayName) as FormArray;
    arr.clear();
    const items = values && values.length > 0 ? values : [''];
    items.forEach(val => arr.push(this.fb.control(val)));
  }

  /**
   * Pre-populate site info from Job.siteAddress.
   * Only fills fields that are currently empty.
   */
  private prePopulateSiteInfo(): void {
    if (!this.job?.siteAddress) {
      return;
    }

    const fields: { formField: string; value: string }[] = [
      { formField: 'siteName', value: this.job.siteName ?? '' },
      { formField: 'street', value: this.job.siteAddress.street ?? '' },
      {
        formField: 'cityState',
        value: [this.job.siteAddress.city, this.job.siteAddress.state].filter(Boolean).join(', ')
      },
      { formField: 'zipCode', value: this.job.siteAddress.zipCode ?? '' }
    ];

    fields.forEach(({ formField, value }) => {
      const control = this.form.get(formField);
      if (control && !control.value) {
        control.setValue(value, { emitEvent: false });
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Dirty Tracking
  // ---------------------------------------------------------------------------

  private setupDirtyTracking(): void {
    this.form.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        distinctUntilChanged()
      )
      .subscribe(() => {
        this.formDirty.emit(this.form.dirty);
      });
  }

  // ---------------------------------------------------------------------------
  // Draft Auto-Save
  // ---------------------------------------------------------------------------

  private setupDraftAutoSave(): void {
    this.form.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.canEdit) {
          this.checklistService.saveDraft(this.jobId, 'jobDetails', this.getFormValue());
        }
      });
  }

  // ---------------------------------------------------------------------------
  // Save
  // ---------------------------------------------------------------------------

  onSave(): void {
    // Mark all controls as touched to trigger validation display
    this.markAllTouched(this.form);

    if (this.form.invalid) {
      return;
    }

    const value = this.getFormValue();
    this.save.emit(value);

    // Dispatch save action to the NgRx store
    this.store.dispatch(ChecklistActions.savePhase({
      jobId: this.jobId,
      phase: 'jobDetails',
      data: value
    }));

    // Clear draft on save
    this.checklistService.clearDraft(this.jobId, 'jobDetails');
    this.showDraftBanner = false;
    this.form.markAsPristine();
    this.formDirty.emit(false);
  }

  // ---------------------------------------------------------------------------
  // Draft Banner
  // ---------------------------------------------------------------------------

  dismissDraftBanner(): void {
    this.showDraftBanner = false;
  }

  discardDraft(): void {
    this.checklistService.clearDraft(this.jobId, 'jobDetails');
    this.showDraftBanner = false;

    // Reload from store data
    if (this.data) {
      this.patchFormFromData(this.data);
    } else {
      this.form.reset();
      this.rebuildFormArray('sriJobNumbers', ['']);
      this.rebuildFormArray('customerJobNumbers', ['']);
      this.rebuildFormArray('changeTickets', ['']);
      this.rebuildFormArray('siteAccessTickets', ['']);
      this.prePopulateSiteInfo();
    }

    this.form.markAsPristine();
    this.formDirty.emit(false);
  }

  // ---------------------------------------------------------------------------
  // Editability
  // ---------------------------------------------------------------------------

  private applyEditability(): void {
    if (!this.form) {
      return;
    }

    if (this.canEdit) {
      this.form.enable({ emitEvent: false });
    } else {
      this.form.disable({ emitEvent: false });
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private getFormValue(): JobDetailsPhaseData {
    const raw = this.form.getRawValue();
    return {
      sriJobNumbers: raw.sriJobNumbers,
      customerJobNumbers: raw.customerJobNumbers,
      changeTickets: raw.changeTickets,
      siteAccessTickets: raw.siteAccessTickets,
      jobStartDate: raw.jobStartDate ? new Date(raw.jobStartDate).toISOString() : null,
      jobCompleteDate: raw.jobCompleteDate ? new Date(raw.jobCompleteDate).toISOString() : null,
      siteName: raw.siteName,
      suiteNumber: raw.suiteNumber,
      street: raw.street,
      cityState: raw.cityState,
      zipCode: raw.zipCode,
      proposedValidationDateTime: raw.proposedValidationDateTime
        ? new Date(raw.proposedValidationDateTime).toISOString()
        : null,
      technicalLead: raw.technicalLead,
      technician1: raw.technician1,
      technician2: raw.technician2,
      sriProjectLead: raw.sriProjectLead,
      primaryCustomerContact: raw.primaryCustomerContact,
      secondaryCustomerContact: raw.secondaryCustomerContact,
      statementOfWork: raw.statementOfWork
    };
  }

  private markAllTouched(group: FormGroup | FormArray): void {
    Object.values(group.controls).forEach(control => {
      if (control instanceof FormGroup || control instanceof FormArray) {
        this.markAllTouched(control);
      } else {
        control.markAsTouched();
      }
    });
  }

  /**
   * Helper to get a contact FormGroup for template binding.
   */
  getContactGroup(name: string): FormGroup {
    return this.form.get(name) as FormGroup;
  }
}
