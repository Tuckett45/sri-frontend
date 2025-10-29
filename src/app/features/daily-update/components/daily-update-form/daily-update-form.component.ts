import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { DailyUpdateService } from '../../services/daily-update.service';
import { 
  DailyUpdate, 
  BlockerCategory, 
  BlockerSeverity, 
  RMAStatus,
  ScopeProgress,
  Blocker,
  RMAEntry
} from '../../models/daily-update.model';

@Component({
  selector: 'app-daily-update-form',
  templateUrl: './daily-update-form.component.html',
  styleUrls: ['./daily-update-form.component.scss']
})
export class DailyUpdateFormComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  dailyUpdateForm: FormGroup;
  isEditMode = false;
  updateId: string | null = null;
  loading = false;
  saving = false;

  // Dropdown options
  blockerCategories = Object.values(BlockerCategory);
  blockerSeverities = Object.values(BlockerSeverity);
  rmaStatuses = Object.values(RMAStatus);

  // Available PMs and sites for dropdowns
  availablePMs: string[] = [
    'John Smith', 'Sarah Johnson', 'Mike Davis', 'Lisa Chen',
    'Robert Wilson', 'Emily Brown', 'David Martinez', 'Jennifer Taylor'
  ];

  availableSites: string[] = [
    'TUL40-1-2', 'DAL35-2-1', 'HOU42-3-4', 'ATL28-1-3', 
    'MIA33-2-2', 'NYC15-4-1', 'LAX55-1-1', 'CHI22-3-2'
  ];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private dailyUpdateService: DailyUpdateService,
    private messageService: MessageService
  ) {
    this.dailyUpdateForm = this.createForm();
  }

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['id']) {
        this.isEditMode = true;
        this.updateId = params['id'];
        this.loadDailyUpdate(params['id']);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      bugNumber: ['', [Validators.required, Validators.pattern(/^B\/\d+$/)]],
      endOfDay: [new Date(), Validators.required],
      site: ['', Validators.required],
      pmNames: [[], Validators.required],
      sow: ['', Validators.required],
      siteRackLocation: ['', Validators.required],
      installBegin: [null],
      googleExpectedCompleteDate: [null],
      trackingCompleteDate: [null],
      installPercentComplete: this.fb.array([]),
      testPercentComplete: this.fb.array([]),
      completedActivity: ['', Validators.required],
      plannedActivity: ['', Validators.required],
      activeBlockers: this.fb.array([]),
      openRMA: this.fb.array([]),
      notes: [''],
      resolvedBlockers: this.fb.array([]),
      rmaLog: this.fb.array([])
    });
  }

  private loadDailyUpdate(id: string): void {
    this.loading = true;
    this.dailyUpdateService.getDailyUpdateById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (update) => {
          if (update) {
            this.populateForm(update);
          } else {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Daily update not found'
            });
            this.router.navigate(['/daily-updates']);
          }
          this.loading = false;
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load daily update'
          });
          this.loading = false;
        }
      });
  }

  private populateForm(update: DailyUpdate): void {
    this.dailyUpdateForm.patchValue({
      bugNumber: update.bugNumber,
      endOfDay: new Date(update.endOfDay),
      site: update.site,
      pmNames: update.pmNames,
      sow: update.sow,
      siteRackLocation: update.siteRackLocation,
      installBegin: update.installBegin ? new Date(update.installBegin) : null,
      googleExpectedCompleteDate: update.googleExpectedCompleteDate ? new Date(update.googleExpectedCompleteDate) : null,
      trackingCompleteDate: update.trackingCompleteDate ? new Date(update.trackingCompleteDate) : null,
      completedActivity: update.completedActivity,
      plannedActivity: update.plannedActivity,
      notes: update.notes
    });

    // Populate arrays
    this.setFormArray('installPercentComplete', update.installPercentComplete);
    this.setFormArray('testPercentComplete', update.testPercentComplete);
    this.setFormArray('activeBlockers', update.activeBlockers);
    this.setFormArray('openRMA', update.openRMA);
  }

  private setFormArray(controlName: string, items: any[]): void {
    const formArray = this.dailyUpdateForm.get(controlName) as FormArray;
    formArray.clear();
    
    items.forEach(item => {
      if (controlName === 'installPercentComplete' || controlName === 'testPercentComplete') {
        formArray.push(this.createScopeProgressGroup(item));
      } else if (controlName === 'activeBlockers') {
        formArray.push(this.createBlockerGroup(item));
      } else if (controlName === 'openRMA') {
        formArray.push(this.createRMAGroup(item));
      }
    });
  }

  // Form Array Getters
  get installPercentComplete(): FormArray {
    return this.dailyUpdateForm.get('installPercentComplete') as FormArray;
  }

  get testPercentComplete(): FormArray {
    return this.dailyUpdateForm.get('testPercentComplete') as FormArray;
  }

  get activeBlockers(): FormArray {
    return this.dailyUpdateForm.get('activeBlockers') as FormArray;
  }

  get openRMA(): FormArray {
    return this.dailyUpdateForm.get('openRMA') as FormArray;
  }

  // Form Array Creators
  createScopeProgressGroup(progress?: ScopeProgress): FormGroup {
    return this.fb.group({
      scope: [progress?.scope || '', Validators.required],
      percentage: [progress?.percentage || 0, [Validators.required, Validators.min(0), Validators.max(100)]],
      description: [progress?.description || '']
    });
  }

  createBlockerGroup(blocker?: Blocker): FormGroup {
    return this.fb.group({
      id: [blocker?.id || `blocker-${Date.now()}`],
      description: [blocker?.description || '', Validators.required],
      ticketNumber: [blocker?.ticketNumber || ''],
      category: [blocker?.category || BlockerCategory.MATERIAL, Validators.required],
      severity: [blocker?.severity || BlockerSeverity.MEDIUM, Validators.required],
      reportedDate: [blocker?.reportedDate ? new Date(blocker.reportedDate) : new Date(), Validators.required]
    });
  }

  createRMAGroup(rma?: RMAEntry): FormGroup {
    return this.fb.group({
      id: [rma?.id || `rma-${Date.now()}`],
      equipmentType: [rma?.equipmentType || '', Validators.required],
      serialNumber: [rma?.serialNumber || ''],
      failureDescription: [rma?.failureDescription || '', Validators.required],
      reportedDate: [rma?.reportedDate ? new Date(rma.reportedDate) : new Date(), Validators.required],
      status: [rma?.status || RMAStatus.PENDING, Validators.required]
    });
  }

  // Form Array Methods
  addScopeProgress(arrayName: string): void {
    const formArray = this.dailyUpdateForm.get(arrayName) as FormArray;
    formArray.push(this.createScopeProgressGroup());
  }

  removeScopeProgress(arrayName: string, index: number): void {
    const formArray = this.dailyUpdateForm.get(arrayName) as FormArray;
    formArray.removeAt(index);
  }

  addBlocker(): void {
    this.activeBlockers.push(this.createBlockerGroup());
  }

  removeBlocker(index: number): void {
    this.activeBlockers.removeAt(index);
  }

  addRMA(): void {
    this.openRMA.push(this.createRMAGroup());
  }

  removeRMA(index: number): void {
    this.openRMA.removeAt(index);
  }

  onSubmit(): void {
    if (this.dailyUpdateForm.valid) {
      this.saving = true;
      const formValue = this.dailyUpdateForm.value;
      
      const dailyUpdate = {
        ...formValue,
        createdBy: 'Current User' // This would come from auth service
      };

      const operation = this.isEditMode 
        ? this.dailyUpdateService.updateDailyUpdate(this.updateId!, dailyUpdate)
        : this.dailyUpdateService.createDailyUpdate(dailyUpdate);

      operation.pipe(takeUntil(this.destroy$)).subscribe({
        next: (result) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: `Daily update ${this.isEditMode ? 'updated' : 'created'} successfully`
          });
          this.router.navigate(['/daily-updates']);
          this.saving = false;
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: `Failed to ${this.isEditMode ? 'update' : 'create'} daily update`
          });
          this.saving = false;
        }
      });
    } else {
      this.markFormGroupTouched(this.dailyUpdateForm);
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please fill in all required fields'
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/daily-updates']);
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else if (control instanceof FormArray) {
        control.controls.forEach(arrayControl => {
          if (arrayControl instanceof FormGroup) {
            this.markFormGroupTouched(arrayControl);
          }
        });
      }
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.dailyUpdateForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.dailyUpdateForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['pattern']) return `${fieldName} format is invalid`;
      if (field.errors['min']) return `${fieldName} must be at least ${field.errors['min'].min}`;
      if (field.errors['max']) return `${fieldName} must be at most ${field.errors['max'].max}`;
    }
    return '';
  }
}

