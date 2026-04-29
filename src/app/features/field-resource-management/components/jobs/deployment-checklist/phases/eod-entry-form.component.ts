import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy
} from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, distinctUntilChanged } from 'rxjs/operators';

import { EodEntry, DailyProgress } from '../../../../models/deployment-checklist.model';

/**
 * EOD Entry Form Component
 *
 * Standalone form for creating a single End of Day report entry.
 * Pre-populates the date with the current date, validates all required fields,
 * and emits the completed entry via the save output.
 *
 * Requirements: 6.2–6.11, 9.1–9.4
 */
@Component({
  selector: 'app-eod-entry-form',
  templateUrl: './eod-entry-form.component.html',
  styleUrls: ['./eod-entry-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EodEntryFormComponent implements OnInit, OnDestroy {
  @Input() jobId!: string;

  @Output() formDirty = new EventEmitter<boolean>();
  @Output() save = new EventEmitter<EodEntry>();
  @Output() cancel = new EventEmitter<void>();

  form!: FormGroup;

  /** Labels for the six daily progress percentage fields */
  readonly progressFields: { key: keyof DailyProgress; label: string }[] = [
    { key: 'devicesRacked', label: 'Devices Racked' },
    { key: 'devicesPowered', label: 'Devices Powered' },
    { key: 'cablingInstalledDressed', label: 'Cabling Installed / Dressed' },
    { key: 'cablesTested', label: 'Cables Tested' },
    { key: 'labelsInstalled', label: 'Labels Installed' },
    { key: 'customerValidation', label: 'Customer Validation' }
  ];

  private destroy$ = new Subject<void>();

  constructor(private fb: FormBuilder) {}

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  ngOnInit(): void {
    this.buildForm();
    this.setupDirtyTracking();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ---------------------------------------------------------------------------
  // Form Construction
  // ---------------------------------------------------------------------------

  private buildForm(): void {
    const today = new Date().toISOString().split('T')[0];

    this.form = this.fb.group({
      date: [today, [Validators.required]],
      personnelOnSite: ['', [Validators.required]],
      technicalLeadName: ['', [Validators.required]],
      technicianNames: ['', [Validators.required]],
      timeIn: ['', [Validators.required]],
      timeOut: ['', [Validators.required]],
      customerNotificationName: ['', [Validators.required]],
      customerNotificationMethod: ['', [Validators.required]],

      // Daily Progress (0–100 integer)
      dailyProgress: this.fb.group({
        devicesRacked: [0, [Validators.required, Validators.min(0), Validators.max(100), Validators.pattern('^[0-9]*$')]],
        devicesPowered: [0, [Validators.required, Validators.min(0), Validators.max(100), Validators.pattern('^[0-9]*$')]],
        cablingInstalledDressed: [0, [Validators.required, Validators.min(0), Validators.max(100), Validators.pattern('^[0-9]*$')]],
        cablesTested: [0, [Validators.required, Validators.min(0), Validators.max(100), Validators.pattern('^[0-9]*$')]],
        labelsInstalled: [0, [Validators.required, Validators.min(0), Validators.max(100), Validators.pattern('^[0-9]*$')]],
        customerValidation: [0, [Validators.required, Validators.min(0), Validators.max(100), Validators.pattern('^[0-9]*$')]]
      }),

      // Yes/No toggles
      dailyPicturesProvided: [false],
      edpRedlineRequired: [false],

      // Narrative fields
      workCompletedToday: ['', [Validators.maxLength(3000)]],
      issuesRoadblocks: ['', [Validators.maxLength(3000)]],
      planForTomorrow: ['', [Validators.maxLength(3000)]]
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
  // Form Accessors
  // ---------------------------------------------------------------------------

  get dailyProgressGroup(): FormGroup {
    return this.form.get('dailyProgress') as FormGroup;
  }

  // ---------------------------------------------------------------------------
  // Save
  // ---------------------------------------------------------------------------

  onSave(): void {
    this.markAllTouched(this.form);

    if (this.form.invalid) {
      return;
    }

    const raw = this.form.getRawValue();

    const entry: EodEntry = {
      id: Date.now().toString(),
      date: raw.date,
      personnelOnSite: raw.personnelOnSite,
      technicalLeadName: raw.technicalLeadName,
      technicianNames: raw.technicianNames,
      timeIn: raw.timeIn,
      timeOut: raw.timeOut,
      customerNotificationName: raw.customerNotificationName,
      customerNotificationMethod: raw.customerNotificationMethod,
      dailyProgress: {
        devicesRacked: Number(raw.dailyProgress.devicesRacked),
        devicesPowered: Number(raw.dailyProgress.devicesPowered),
        cablingInstalledDressed: Number(raw.dailyProgress.cablingInstalledDressed),
        cablesTested: Number(raw.dailyProgress.cablesTested),
        labelsInstalled: Number(raw.dailyProgress.labelsInstalled),
        customerValidation: Number(raw.dailyProgress.customerValidation)
      },
      dailyPicturesProvided: raw.dailyPicturesProvided,
      edpRedlineRequired: raw.edpRedlineRequired,
      workCompletedToday: raw.workCompletedToday,
      issuesRoadblocks: raw.issuesRoadblocks,
      planForTomorrow: raw.planForTomorrow,
      submittedBy: '',   // Set by the effect/service layer
      submittedAt: new Date().toISOString()
    };

    this.save.emit(entry);
  }

  // ---------------------------------------------------------------------------
  // Cancel
  // ---------------------------------------------------------------------------

  onCancel(): void {
    this.cancel.emit();
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

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
