import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { JobCompletionFormComponent, DelayReason } from './job-completion-form.component';
import { Job, JobStatus, JobType, Priority } from '../../../models/job.model';
import { updateJobStatus, uploadAttachment } from '../../../state/jobs/job.actions';

describe('JobCompletionFormComponent', () => {
  let component: JobCompletionFormComponent;
  let fixture: ComponentFixture<JobCompletionFormComponent>;
  let store: MockStore;

  const mockJob: Job = {
    id: '1',
    jobId: 'JOB-001',
    client: 'Test Client',
    siteName: 'Test Site',
    siteAddress: {
      street: '123 Main St',
      city: 'Test City',
      state: 'TS',
      zipCode: '12345'
    },
    jobType: JobType.Install,
    priority: Priority.Normal,
    status: JobStatus.OnSite,
    scopeDescription: 'Test job',
    requiredSkills: [],
    requiredCrewSize: 1,
    estimatedLaborHours: 4,
    scheduledStartDate: new Date('2024-01-01T08:00:00'),
    scheduledEndDate: new Date('2024-01-01T12:00:00'),
    attachments: [],
    notes: [],
    createdBy: 'test-user',
    createdAt: new Date(),
    market: 'DALLAS',
    company: 'TEST_COMPANY',
    updatedAt: new Date()
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [JobCompletionFormComponent],
      imports: [ReactiveFormsModule],
      providers: [
        provideMockStore({})
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(JobCompletionFormComponent);
    component = fixture.componentInstance;
    component.job = mockJob;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form on init', () => {
    component.ngOnInit();
    
    expect(component.completionForm).toBeDefined();
    expect(component.completionForm.get('completionNotes')).toBeDefined();
    expect(component.completionForm.get('delayReason')).toBeDefined();
    expect(component.completionForm.get('delayNotes')).toBeDefined();
  });

  it('should detect delayed job', () => {
    const pastDate = new Date();
    pastDate.setHours(pastDate.getHours() - 2);
    component.job.scheduledEndDate = pastDate;
    
    component.ngOnInit();
    
    expect(component.isDelayed).toBe(true);
  });

  it('should not detect delayed job when on time', () => {
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 2);
    component.job.scheduledEndDate = futureDate;
    
    component.ngOnInit();
    
    expect(component.isDelayed).toBe(false);
  });

  it('should require delay reason when job is delayed', () => {
    component.isDelayed = true;
    component.ngOnInit();
    
    const delayReasonControl = component.completionForm.get('delayReason');
    expect(delayReasonControl?.hasError('required')).toBe(true);
  });

  it('should not require delay reason when job is not delayed', () => {
    component.isDelayed = false;
    component.ngOnInit();
    
    const delayReasonControl = component.completionForm.get('delayReason');
    expect(delayReasonControl?.hasError('required')).toBe(false);
  });

  it('should validate completion notes as required', () => {
    component.ngOnInit();
    
    const notesControl = component.completionForm.get('completionNotes');
    notesControl?.setValue('');
    
    expect(notesControl?.hasError('required')).toBe(true);
  });

  it('should validate completion notes max length', () => {
    component.ngOnInit();
    
    const notesControl = component.completionForm.get('completionNotes');
    const longText = 'a'.repeat(2001);
    notesControl?.setValue(longText);
    
    expect(notesControl?.hasError('maxlength')).toBe(true);
  });

  it('should handle files selected', () => {
    const mockFiles = [
      new File([''], 'photo1.jpg', { type: 'image/jpeg' }),
      new File([''], 'photo2.jpg', { type: 'image/jpeg' })
    ];
    
    component.onFilesSelected(mockFiles);
    
    expect(component.selectedFiles).toEqual(mockFiles);
  });

  it('should submit form with completion notes', async () => {
    component.ngOnInit();
    const dispatchSpy = spyOn(store, 'dispatch');
    
    component.completionForm.patchValue({
      completionNotes: 'Job completed successfully'
    });
    
    await component.onSubmit();
    
    expect(dispatchSpy).toHaveBeenCalledWith(
      updateJobStatus({
        id: mockJob.id,
        status: JobStatus.Completed,
        reason: 'Job completed successfully'
      })
    );
  });

  it('should include delay information in completion notes', async () => {
    component.isDelayed = true;
    component.ngOnInit();
    const dispatchSpy = spyOn(store, 'dispatch');
    
    component.completionForm.patchValue({
      completionNotes: 'Job completed',
      delayReason: DelayReason.MaterialsUnavailable,
      delayNotes: 'Parts arrived late'
    });
    
    await component.onSubmit();
    
    const expectedNotes = 'Job completed\n\nDelay Reason: Materials Unavailable\nDelay Notes: Parts arrived late';
    expect(dispatchSpy).toHaveBeenCalledWith(
      updateJobStatus({
        id: mockJob.id,
        status: JobStatus.Completed,
        reason: expectedNotes
      })
    );
  });

  it('should upload photos on submit', async () => {
    component.ngOnInit();
    const dispatchSpy = spyOn(store, 'dispatch');
    
    const mockFiles = [
      new File([''], 'photo1.jpg', { type: 'image/jpeg' })
    ];
    component.selectedFiles = mockFiles;
    
    component.completionForm.patchValue({
      completionNotes: 'Job completed'
    });
    
    await component.onSubmit();
    
    expect(dispatchSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        type: uploadAttachment.type,
        jobId: mockJob.id
      })
    );
  });

  it('should not submit invalid form', async () => {
    component.ngOnInit();
    const dispatchSpy = spyOn(store, 'dispatch');
    
    // Leave form empty (invalid)
    await component.onSubmit();
    
    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('should emit completed event on successful submit', async () => {
    component.ngOnInit();
    spyOn(component.completed, 'emit');
    
    component.completionForm.patchValue({
      completionNotes: 'Job completed'
    });
    
    await component.onSubmit();
    
    expect(component.completed.emit).toHaveBeenCalled();
  });

  it('should emit cancelled event on cancel', () => {
    spyOn(component.cancelled, 'emit');
    
    component.onCancel();
    
    expect(component.cancelled.emit).toHaveBeenCalled();
  });

  it('should get error message for required field', () => {
    component.ngOnInit();
    
    const notesControl = component.completionForm.get('completionNotes');
    notesControl?.setValue('');
    notesControl?.markAsTouched();
    
    const errorMessage = component.getErrorMessage('completionNotes');
    expect(errorMessage).toBe('This field is required');
  });

  it('should get error message for max length', () => {
    component.ngOnInit();
    
    const notesControl = component.completionForm.get('completionNotes');
    const longText = 'a'.repeat(2001);
    notesControl?.setValue(longText);
    notesControl?.markAsTouched();
    
    const errorMessage = component.getErrorMessage('completionNotes');
    expect(errorMessage).toContain('Maximum length is 2000 characters');
  });

  it('should check if field has error', () => {
    component.ngOnInit();
    
    const notesControl = component.completionForm.get('completionNotes');
    notesControl?.setValue('');
    notesControl?.markAsTouched();
    
    expect(component.hasError('completionNotes')).toBe(true);
  });

  it('should get character count', () => {
    component.ngOnInit();
    
    component.completionForm.patchValue({
      completionNotes: 'Test notes'
    });
    
    const count = component.getCharacterCount('completionNotes');
    expect(count).toBe('10 / 2000');
  });

  it('should disable submit button when form is invalid', () => {
    component.ngOnInit();
    
    // Form is invalid (empty required field)
    expect(component.isSubmitDisabled).toBe(true);
  });

  it('should enable submit button when form is valid', () => {
    component.ngOnInit();
    
    component.completionForm.patchValue({
      completionNotes: 'Job completed successfully'
    });
    
    expect(component.isSubmitDisabled).toBe(false);
  });

  it('should show submitting text when submitting', () => {
    component.isSubmitting = true;
    expect(component.submitButtonText).toBe('Submitting...');
  });

  it('should show complete job text when not submitting', () => {
    component.isSubmitting = false;
    expect(component.submitButtonText).toBe('Complete Job');
  });

  it('should show delay section when job is delayed', () => {
    component.isDelayed = true;
    expect(component.showDelaySection).toBe(true);
  });

  it('should not show delay section when job is not delayed', () => {
    component.isDelayed = false;
    expect(component.showDelaySection).toBe(false);
  });

  it('should get job summary', () => {
    const summary = component.jobSummary;
    expect(summary).toBe('JOB-001 - Test Client - Test Site');
  });

  it('should have all delay reason options', () => {
    expect(component.delayReasons).toContain(DelayReason.MaterialsUnavailable);
    expect(component.delayReasons).toContain(DelayReason.WeatherConditions);
    expect(component.delayReasons).toContain(DelayReason.SiteAccessIssue);
    expect(component.delayReasons).toContain(DelayReason.EquipmentFailure);
    expect(component.delayReasons).toContain(DelayReason.CustomerRequest);
    expect(component.delayReasons).toContain(DelayReason.TechnicalComplexity);
    expect(component.delayReasons).toContain(DelayReason.SafetyConcern);
    expect(component.delayReasons).toContain(DelayReason.Other);
  });

  it('should mark all fields as touched on invalid submit', async () => {
    component.ngOnInit();
    
    // Leave form invalid
    await component.onSubmit();
    
    const notesControl = component.completionForm.get('completionNotes');
    expect(notesControl?.touched).toBe(true);
  });
});
