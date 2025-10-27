import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { 
  Issue, 
  IssueCreateDto, 
  IssueUpdateDto, 
  IssuePriority, 
  IssuePriorityLabels,
  IssueStatus,
  IssueStatusLabels
} from '../../models/issue.models';
import { IssueService } from '../../services/issue.service';

@Component({
  selector: 'app-issue-form',
  templateUrl: './issue-form.component.html',
  styleUrls: ['./issue-form.component.scss']
})
export class IssueFormComponent implements OnInit {
  @Input() issue?: Issue;
  @Input() deploymentId?: string;
  @Input() mode: 'create' | 'edit' = 'create';
  @Output() saved = new EventEmitter<Issue>();
  @Output() cancelled = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly issueService = inject(IssueService);
  private readonly toastr = inject(ToastrService);

  form!: FormGroup;
  isSubmitting = false;
  selectedFiles: FileList | null = null;

  // Expose enums to template
  readonly IssuePriority = IssuePriority;
  readonly IssueStatus = IssueStatus;
  readonly priorityOptions = Object.entries(IssuePriorityLabels).map(([value, label]) => ({
    value: parseInt(value),
    label
  }));
  readonly statusOptions = Object.entries(IssueStatusLabels).map(([value, label]) => ({
    value: parseInt(value),
    label
  }));

  ngOnInit(): void {
    this.initializeForm();
  }

  private initializeForm(): void {
    this.form = this.fb.group({
      title: [this.issue?.title || '', [Validators.required, Validators.maxLength(255)]],
      description: [this.issue?.description || '', [Validators.required, Validators.maxLength(2000)]],
      priority: [this.issue?.priority ?? IssuePriority.Medium, [Validators.required]],
      status: [this.issue?.status ?? IssueStatus.Open],
      assignedTo: [this.issue?.assignedTo || ''],
      resolutionNotes: [this.issue?.resolutionNotes || '']
    });

    // Disable status field for create mode
    if (this.mode === 'create') {
      this.form.get('status')?.disable();
      this.form.get('resolutionNotes')?.disable();
    }
  }

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.selectedFiles = target.files;
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isSubmitting = true;

    try {
      if (this.mode === 'create') {
        await this.createIssue();
      } else {
        await this.updateIssue();
      }
    } catch (error) {
      console.error('Error saving issue:', error);
      this.toastr.error('Failed to save issue. Please try again.');
    } finally {
      this.isSubmitting = false;
    }
  }

  private async createIssue(): Promise<void> {
    if (!this.deploymentId) {
      throw new Error('Deployment ID is required for creating issues');
    }

    const formValue = this.form.value;
    const dto: IssueCreateDto = {
      deploymentId: this.deploymentId,
      title: formValue.title,
      description: formValue.description,
      priority: formValue.priority,
      assignedTo: formValue.assignedTo || undefined
    };

    const issueId = await this.issueService.createIssue(dto).toPromise();
    
    // Upload files if any
    if (this.selectedFiles && this.selectedFiles.length > 0 && issueId) {
      await this.issueService.uploadIssueMedia(issueId, this.selectedFiles).toPromise();
    }

    this.toastr.success('Issue created successfully');
    
    // Get the created issue to emit
    const createdIssue = await this.issueService.getIssue(issueId!).toPromise();
    this.saved.emit(createdIssue);
  }

  private async updateIssue(): Promise<void> {
    if (!this.issue) {
      throw new Error('Issue is required for updating');
    }

    const formValue = this.form.value;
    const dto: IssueUpdateDto = {
      title: formValue.title,
      description: formValue.description,
      priority: formValue.priority,
      status: formValue.status,
      assignedTo: formValue.assignedTo || undefined,
      resolutionNotes: formValue.resolutionNotes || undefined
    };

    await this.issueService.updateIssue(this.issue.id, dto).toPromise();

    // Upload files if any
    if (this.selectedFiles && this.selectedFiles.length > 0) {
      await this.issueService.uploadIssueMedia(this.issue.id, this.selectedFiles).toPromise();
    }

    this.toastr.success('Issue updated successfully');
    
    // Get the updated issue to emit
    const updatedIssue = await this.issueService.getIssue(this.issue.id).toPromise();
    this.saved.emit(updatedIssue);
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  private markFormGroupTouched(): void {
    Object.keys(this.form.controls).forEach(key => {
      const control = this.form.get(key);
      control?.markAsTouched();
    });
  }

  // Helper methods for template
  isFieldInvalid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.form.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['maxlength']) return `${fieldName} is too long`;
    }
    return '';
  }

  get isCreateMode(): boolean {
    return this.mode === 'create';
  }

  get isEditMode(): boolean {
    return this.mode === 'edit';
  }

  get canEditStatus(): boolean {
    return this.mode === 'edit';
  }

  get showResolutionNotes(): boolean {
    const status = this.form.get('status')?.value;
    return status === IssueStatus.Resolved || status === IssueStatus.Closed;
  }
}
