import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Job, JobStatus } from '../../../models/job.model';
import { updateJobStatus, uploadAttachment } from '../../../state/jobs/job.actions';
import { SanitizationService } from '../../../services/sanitization.service';
import { ImageCacheService } from '../../../services/image-cache.service';

/**
 * Delay reason options
 */
export enum DelayReason {
  MaterialsUnavailable = 'Materials Unavailable',
  WeatherConditions = 'Weather Conditions',
  SiteAccessIssue = 'Site Access Issue',
  EquipmentFailure = 'Equipment Failure',
  CustomerRequest = 'Customer Request',
  TechnicalComplexity = 'Technical Complexity',
  SafetyConcern = 'Safety Concern',
  Other = 'Other'
}

/**
 * Job Completion Form Component
 * 
 * Mobile form for technicians to complete jobs with notes and photos.
 * 
 * Features:
 * - Displayed when technician marks job as Completed
 * - Completion notes textarea with sanitization
 * - File upload integration for photos
 * - Delay reason dropdown (if job not completed on time)
 * - Submit button
 * - Dispatches updateJobStatus and uploadAttachment actions
 * - XSS protection through input sanitization
 * 
 * Requirements: 9.1-9.7, 9.2
 */
@Component({
  selector: 'frm-job-completion-form',
  templateUrl: './job-completion-form.component.html',
  styleUrls: ['./job-completion-form.component.scss']
})
export class JobCompletionFormComponent implements OnInit {
  @Input() job!: Job;
  @Input() isDelayed = false; // Whether job is being completed late
  @Output() completed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  completionForm!: FormGroup;
  selectedFiles: File[] = [];
  isSubmitting = false;

  // Delay reason options
  delayReasons = Object.values(DelayReason);

  constructor(
    private fb: FormBuilder,
    private store: Store,
    private sanitizationService: SanitizationService,
    private imageCacheService: ImageCacheService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.checkIfDelayed();
  }

  /**
   * Initialize the completion form
   */
  private initializeForm(): void {
    this.completionForm = this.fb.group({
      completionNotes: ['', [Validators.required, Validators.maxLength(2000)]],
      delayReason: [''],
      delayNotes: ['', Validators.maxLength(500)]
    });

    // Add validators for delay fields if job is delayed
    if (this.isDelayed) {
      this.completionForm.get('delayReason')?.setValidators([Validators.required]);
      this.completionForm.get('delayReason')?.updateValueAndValidity();
    }
  }

  /**
   * Check if job is delayed
   */
  private checkIfDelayed(): void {
    if (!this.job.scheduledEndDate) {
      return;
    }

    const scheduledEnd = new Date(this.job.scheduledEndDate);
    const now = new Date();
    
    this.isDelayed = now > scheduledEnd;

    if (this.isDelayed) {
      this.completionForm.get('delayReason')?.setValidators([Validators.required]);
      this.completionForm.get('delayReason')?.updateValueAndValidity();
    }
  }

  /**
   * Handle files selected from file upload component
   */
  onFilesSelected(files: File[]): void {
    this.selectedFiles = files;
  }

  /**
   * Handle form submission
   */
  async onSubmit(): Promise<void> {
    if (this.completionForm.invalid) {
      this.markFormGroupTouched(this.completionForm);
      return;
    }

    this.isSubmitting = true;

    try {
      const formValue = this.completionForm.value;

      // Sanitize completion notes to prevent XSS
      let completionNotes = this.sanitizationService.sanitizeText(formValue.completionNotes);
      
      // Build completion notes with delay information if applicable
      if (this.isDelayed && formValue.delayReason) {
        completionNotes += `\n\nDelay Reason: ${formValue.delayReason}`;
        if (formValue.delayNotes) {
          const sanitizedDelayNotes = this.sanitizationService.sanitizeText(formValue.delayNotes);
          completionNotes += `\nDelay Notes: ${sanitizedDelayNotes}`;
        }
      }

      // Update job status to Completed with notes
      this.store.dispatch(updateJobStatus({
        id: this.job.id,
        status: JobStatus.Completed,
        reason: completionNotes
      }));

      // Upload photos if any
      if (this.selectedFiles.length > 0) {
        await this.uploadPhotos();
      }

      // Emit completion event
      this.completed.emit();

    } catch (error) {
      console.error('Error completing job:', error);
      this.isSubmitting = false;
    }
  }

  /**
   * Upload selected photos with caching support
   */
  private async uploadPhotos(): Promise<void> {
    const uploadPromises = this.selectedFiles.map(file => {
      return new Promise<void>((resolve) => {
        // Cache the image for offline access before uploading
        const identifier = `job-${this.job.id}-photo-${Date.now()}-${file.name}`;
        this.imageCacheService.cacheFile(file, identifier).subscribe({
          next: () => {
            console.log(`[JobCompletion] Cached photo: ${file.name}`);
            
            // Dispatch upload action
            this.store.dispatch(uploadAttachment({
              jobId: this.job.id,
              file
            }));
            
            resolve();
          },
          error: (err) => {
            console.warn(`[JobCompletion] Failed to cache photo: ${file.name}`, err);
            
            // Still attempt to upload even if caching fails
            this.store.dispatch(uploadAttachment({
              jobId: this.job.id,
              file
            }));
            
            resolve();
          }
        });
      });
    });

    await Promise.all(uploadPromises);
  }

  /**
   * Handle cancel
   */
  onCancel(): void {
    this.cancelled.emit();
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
   * Get form control error message
   */
  getErrorMessage(controlName: string): string {
    const control = this.completionForm.get(controlName);
    
    if (!control || !control.errors || !control.touched) {
      return '';
    }

    if (control.errors['required']) {
      return 'This field is required';
    }

    if (control.errors['maxlength']) {
      const maxLength = control.errors['maxlength'].requiredLength;
      return `Maximum length is ${maxLength} characters`;
    }

    return 'Invalid value';
  }

  /**
   * Check if form control has error
   */
  hasError(controlName: string): boolean {
    const control = this.completionForm.get(controlName);
    return !!(control && control.invalid && control.touched);
  }

  /**
   * Get character count for textarea
   */
  getCharacterCount(controlName: string): string {
    const control = this.completionForm.get(controlName);
    const value = control?.value || '';
    const maxLength = controlName === 'completionNotes' ? 2000 : 500;
    return `${value.length} / ${maxLength}`;
  }

  /**
   * Check if submit button should be disabled
   */
  get isSubmitDisabled(): boolean {
    return this.completionForm.invalid || this.isSubmitting;
  }

  /**
   * Get submit button text
   */
  get submitButtonText(): string {
    if (this.isSubmitting) {
      return 'Submitting...';
    }
    return 'Complete Job';
  }

  /**
   * Check if delay section should be shown
   */
  get showDelaySection(): boolean {
    return this.isDelayed;
  }

  /**
   * Get job information summary
   */
  get jobSummary(): string {
    return `${this.job.jobId} - ${this.job.client} - ${this.job.siteName}`;
  }
}
