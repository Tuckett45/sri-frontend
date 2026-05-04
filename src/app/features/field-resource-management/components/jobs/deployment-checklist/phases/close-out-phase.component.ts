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
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';
import { takeUntil, distinctUntilChanged } from 'rxjs/operators';

import {
  CloseOutPhaseData,
  ChecklistItem,
  ChecklistItemResponse,
  REQUIRED_PICTURES_ITEMS,
  FINAL_INSPECTION_ITEMS
} from '../../../../models/deployment-checklist.model';
import { CustomValidators } from '../../../../validators/custom-validators';
import { DeploymentChecklistService } from '../../../../services/deployment-checklist.service';
import * as ChecklistActions from '../../../../state/deployment-checklist/checklist.actions';

/**
 * Close-Out Phase Component
 *
 * Fourth and final phase of the Deployment Checklist workflow. Covers equipment
 * hand-off validation, required photography documentation, final inspection
 * items, and site acceptance sign-off.
 *
 * Requirements: 7.1–7.11, 9.1–9.7, 13.1, 13.2
 */
@Component({
  selector: 'app-close-out-phase',
  templateUrl: './close-out-phase.component.html',
  styleUrls: ['./close-out-phase.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CloseOutPhaseComponent implements OnInit, OnChanges, OnDestroy {
  @Input() jobId!: string;
  @Input() data: CloseOutPhaseData | null = null;
  @Input() canEdit = false;

  @Output() formDirty = new EventEmitter<boolean>();
  @Output() save = new EventEmitter<CloseOutPhaseData>();

  form!: FormGroup;
  showDraftBanner = false;

  /** Constant references for the template */
  readonly requiredPicturesItems = REQUIRED_PICTURES_ITEMS;
  readonly finalInspectionItems = FINAL_INSPECTION_ITEMS;

  private destroy$ = new Subject<void>();
  private initialized = false;

  /** Cached picture categories for template use */
  private _pictureCategories: string[] | null = null;

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
    // Required Pictures checklist items
    const pictureGroups = REQUIRED_PICTURES_ITEMS.map((item, index) =>
      this.fb.group({
        id: [`req-pic-${index}`],
        label: [item.label],
        playbookReference: [null],
        category: [item.category],
        response: [null as ChecklistItemResponse],
        notes: ['', [Validators.maxLength(1000)]]
      })
    );

    // Final Inspection checklist items
    const inspectionGroups = FINAL_INSPECTION_ITEMS.map((label, index) =>
      this.fb.group({
        id: [`final-inspect-${index}`],
        label: [label],
        playbookReference: [null],
        response: [null as ChecklistItemResponse],
        notes: ['', [Validators.maxLength(1000)]]
      })
    );

    this.form = this.fb.group({
      sriLead: this.fb.group({
        company: [''],
        date: [null],
        name: ['']
      }),
      customerLead: this.fb.group({
        company: [''],
        date: [null],
        name: ['']
      }),
      otherParticipants: [''],
      requiredPictures: this.fb.array(pictureGroups),
      finalInspectionItems: this.fb.array(inspectionGroups),
      siteAcceptance: this.fb.group({
        customerName: [''],
        customerEmail: ['', [Validators.email]],
        customerPhone: ['', [CustomValidators.phoneNumber()]],
        dateTimeSiteAccepted: [null]
      })
    });
  }

  // ---------------------------------------------------------------------------
  // FormArray Accessors
  // ---------------------------------------------------------------------------

  get requiredPictures(): FormArray {
    return this.form.get('requiredPictures') as FormArray;
  }

  get finalInspection(): FormArray {
    return this.form.get('finalInspectionItems') as FormArray;
  }

  get siteAcceptance(): FormGroup {
    return this.form.get('siteAcceptance') as FormGroup;
  }

  get sriLead(): FormGroup {
    return this.form.get('sriLead') as FormGroup;
  }

  get customerLead(): FormGroup {
    return this.form.get('customerLead') as FormGroup;
  }

  /**
   * Returns the FormGroup for a specific required picture item by index.
   */
  getPictureItemGroup(index: number): FormGroup {
    return this.requiredPictures.at(index) as FormGroup;
  }

  /**
   * Returns the FormGroup for a specific final inspection item by index.
   */
  getInspectionItemGroup(index: number): FormGroup {
    return this.finalInspection.at(index) as FormGroup;
  }

  // ---------------------------------------------------------------------------
  // Category Helpers for Required Pictures
  // ---------------------------------------------------------------------------

  /**
   * Returns unique categories from REQUIRED_PICTURES_ITEMS, preserving order.
   */
  getPictureCategories(): string[] {
    if (!this._pictureCategories) {
      const seen = new Set<string>();
      this._pictureCategories = [];
      for (const item of REQUIRED_PICTURES_ITEMS) {
        if (!seen.has(item.category)) {
          seen.add(item.category);
          this._pictureCategories.push(item.category);
        }
      }
    }
    return this._pictureCategories;
  }

  /**
   * Returns the indices of items in REQUIRED_PICTURES_ITEMS that belong to the given category.
   */
  getPictureItemsByCategory(category: string): number[] {
    const indices: number[] = [];
    REQUIRED_PICTURES_ITEMS.forEach((item, index) => {
      if (item.category === category) {
        indices.push(index);
      }
    });
    return indices;
  }

  // ---------------------------------------------------------------------------
  // Data Population
  // ---------------------------------------------------------------------------

  private restoreDraftOrData(): void {
    // 1. Try to restore a draft first
    const draft = this.checklistService.restoreDraft(this.jobId, 'closeOut');
    if (draft) {
      this.patchFormFromData(draft as CloseOutPhaseData);
      this.showDraftBanner = true;
      return;
    }

    // 2. Populate from @Input() data if available
    if (this.data) {
      this.patchFormFromData(this.data);
    }
  }

  private patchFormFromData(data: CloseOutPhaseData): void {
    // Equipment Hand-off
    if (data.sriLead) {
      this.sriLead.patchValue({
        company: data.sriLead.company ?? '',
        date: data.sriLead.date,
        name: data.sriLead.name ?? ''
      }, { emitEvent: false });
    }

    if (data.customerLead) {
      this.customerLead.patchValue({
        company: data.customerLead.company ?? '',
        date: data.customerLead.date,
        name: data.customerLead.name ?? ''
      }, { emitEvent: false });
    }

    this.form.patchValue({
      otherParticipants: data.otherParticipants ?? ''
    }, { emitEvent: false });

    // Required Pictures
    if (data.requiredPictures && data.requiredPictures.length > 0) {
      data.requiredPictures.forEach((item, index) => {
        if (index < this.requiredPictures.length) {
          const group = this.requiredPictures.at(index) as FormGroup;
          group.patchValue({
            id: item.id ?? `req-pic-${index}`,
            response: item.response,
            notes: item.notes ?? ''
          }, { emitEvent: false });
        }
      });
    }

    // Final Inspection Items
    if (data.finalInspectionItems && data.finalInspectionItems.length > 0) {
      data.finalInspectionItems.forEach((item, index) => {
        if (index < this.finalInspection.length) {
          const group = this.finalInspection.at(index) as FormGroup;
          group.patchValue({
            id: item.id ?? `final-inspect-${index}`,
            response: item.response,
            notes: item.notes ?? ''
          }, { emitEvent: false });
        }
      });
    }

    // Site Acceptance
    if (data.siteAcceptance) {
      this.siteAcceptance.patchValue({
        customerName: data.siteAcceptance.customerName ?? '',
        customerEmail: data.siteAcceptance.customerEmail ?? '',
        customerPhone: data.siteAcceptance.customerPhone ?? '',
        dateTimeSiteAccepted: data.siteAcceptance.dateTimeSiteAccepted
      }, { emitEvent: false });
    }
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
          this.checklistService.saveDraft(this.jobId, 'closeOut', this.getFormValue());
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
      phase: 'closeOut',
      data: value
    }));

    // Clear draft on save
    this.checklistService.clearDraft(this.jobId, 'closeOut');
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
    this.checklistService.clearDraft(this.jobId, 'closeOut');
    this.showDraftBanner = false;

    // Reload from store data
    if (this.data) {
      this.patchFormFromData(this.data);
    } else {
      this.resetForm();
    }

    this.form.markAsPristine();
    this.formDirty.emit(false);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private getFormValue(): CloseOutPhaseData {
    const raw = this.form.getRawValue();
    return {
      sriLead: {
        company: raw.sriLead.company,
        date: raw.sriLead.date,
        name: raw.sriLead.name
      },
      customerLead: {
        company: raw.customerLead.company,
        date: raw.customerLead.date,
        name: raw.customerLead.name
      },
      otherParticipants: raw.otherParticipants,
      requiredPictures: raw.requiredPictures.map((item: any) => ({
        id: item.id,
        label: item.label,
        playbookReference: item.playbookReference,
        response: item.response,
        notes: item.notes
      } as ChecklistItem)),
      finalInspectionItems: raw.finalInspectionItems.map((item: any) => ({
        id: item.id,
        label: item.label,
        playbookReference: item.playbookReference,
        response: item.response,
        notes: item.notes
      } as ChecklistItem)),
      siteAcceptance: {
        customerName: raw.siteAcceptance.customerName,
        customerEmail: raw.siteAcceptance.customerEmail,
        customerPhone: raw.siteAcceptance.customerPhone,
        dateTimeSiteAccepted: raw.siteAcceptance.dateTimeSiteAccepted
      }
    };
  }

  private resetForm(): void {
    // Reset hand-off participants
    this.sriLead.patchValue({ company: '', date: null, name: '' }, { emitEvent: false });
    this.customerLead.patchValue({ company: '', date: null, name: '' }, { emitEvent: false });
    this.form.patchValue({ otherParticipants: '' }, { emitEvent: false });

    // Reset required pictures
    this.requiredPictures.controls.forEach((control) => {
      const group = control as FormGroup;
      group.patchValue({ response: null, notes: '' }, { emitEvent: false });
    });

    // Reset final inspection items
    this.finalInspection.controls.forEach((control) => {
      const group = control as FormGroup;
      group.patchValue({ response: null, notes: '' }, { emitEvent: false });
    });

    // Reset site acceptance
    this.siteAcceptance.patchValue({
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      dateTimeSiteAccepted: null
    }, { emitEvent: false });
  }

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

  private markAllTouched(group: FormGroup | FormArray): void {
    Object.values(group.controls).forEach(control => {
      if (control instanceof FormGroup || control instanceof FormArray) {
        this.markAllTouched(control);
      } else {
        control.markAsTouched();
      }
    });
  }
}
