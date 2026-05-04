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
  PreInstallationPhaseData,
  ChecklistItem,
  ChecklistItemResponse,
  PRE_INSTALLATION_ITEMS
} from '../../../../models/deployment-checklist.model';
import { DeploymentChecklistService } from '../../../../services/deployment-checklist.service';
import * as ChecklistActions from '../../../../state/deployment-checklist/checklist.actions';

/**
 * Pre-Installation Phase Component
 *
 * Second phase of the Deployment Checklist workflow. Renders 11 fixed checklist
 * items with Yes/No/N/A radio groups, optional notes, playbook reference badges,
 * warning indicators for "No" responses, and a "Mark Phase Complete" toggle.
 *
 * Requirements: 5.1–5.7, 9.3, 13.1, 13.2
 */
@Component({
  selector: 'app-pre-installation-phase',
  templateUrl: './pre-installation-phase.component.html',
  styleUrls: ['./pre-installation-phase.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PreInstallationPhaseComponent implements OnInit, OnChanges, OnDestroy {
  @Input() jobId!: string;
  @Input() data: PreInstallationPhaseData | null = null;
  @Input() canEdit = false;

  @Output() formDirty = new EventEmitter<boolean>();
  @Output() save = new EventEmitter<PreInstallationPhaseData>();

  form!: FormGroup;
  showDraftBanner = false;

  /** Constant reference for the template */
  readonly preInstallationItems = PRE_INSTALLATION_ITEMS;

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
    const itemGroups = PRE_INSTALLATION_ITEMS.map((item, index) =>
      this.fb.group({
        id: [`pre-install-${index}`],
        label: [item.label],
        playbookReference: [item.playbookReference],
        response: [null as ChecklistItemResponse],
        notes: ['', [Validators.maxLength(1000)]]
      })
    );

    this.form = this.fb.group({
      items: this.fb.array(itemGroups),
      markedComplete: [false]
    });
  }

  // ---------------------------------------------------------------------------
  // FormArray Accessor
  // ---------------------------------------------------------------------------

  get items(): FormArray {
    return this.form.get('items') as FormArray;
  }

  /**
   * Returns the FormGroup for a specific checklist item by index.
   */
  getItemGroup(index: number): FormGroup {
    return this.items.at(index) as FormGroup;
  }

  // ---------------------------------------------------------------------------
  // Data Population
  // ---------------------------------------------------------------------------

  private restoreDraftOrData(): void {
    // 1. Try to restore a draft first
    const draft = this.checklistService.restoreDraft(this.jobId, 'preInstallation');
    if (draft) {
      this.patchFormFromData(draft as PreInstallationPhaseData);
      this.showDraftBanner = true;
      return;
    }

    // 2. Populate from @Input() data if available
    if (this.data) {
      this.patchFormFromData(this.data);
    }
  }

  private patchFormFromData(data: PreInstallationPhaseData): void {
    if (data.items && data.items.length > 0) {
      data.items.forEach((item, index) => {
        if (index < this.items.length) {
          const group = this.items.at(index) as FormGroup;
          group.patchValue({
            id: item.id ?? `pre-install-${index}`,
            response: item.response,
            notes: item.notes ?? ''
          }, { emitEvent: false });
        }
      });
    }

    this.form.patchValue({
      markedComplete: data.markedComplete ?? false
    }, { emitEvent: false });
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
          this.checklistService.saveDraft(this.jobId, 'preInstallation', this.getFormValue());
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
      phase: 'preInstallation',
      data: value
    }));

    // Clear draft on save
    this.checklistService.clearDraft(this.jobId, 'preInstallation');
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
    this.checklistService.clearDraft(this.jobId, 'preInstallation');
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

  /**
   * Returns true when the item at the given index has a "No" response.
   * Used in the template to apply warning styling.
   */
  isNoResponse(index: number): boolean {
    const group = this.items.at(index) as FormGroup;
    return group.get('response')?.value === 'No';
  }

  private getFormValue(): PreInstallationPhaseData {
    const raw = this.form.getRawValue();
    return {
      items: raw.items.map((item: any) => ({
        id: item.id,
        label: item.label,
        playbookReference: item.playbookReference,
        response: item.response,
        notes: item.notes
      } as ChecklistItem)),
      markedComplete: raw.markedComplete
    };
  }

  private resetForm(): void {
    this.items.controls.forEach((control) => {
      const group = control as FormGroup;
      group.patchValue({
        response: null,
        notes: ''
      }, { emitEvent: false });
    });
    this.form.patchValue({ markedComplete: false }, { emitEvent: false });
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
