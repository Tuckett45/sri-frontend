import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';

import { JobFormComponent } from './job-form.component';
import { JobType, Priority } from '../../../models/job.model';
import { SkillLevel } from '../../../models/technician.model';

describe('JobFormComponent', () => {
  let component: JobFormComponent;
  let fixture: ComponentFixture<JobFormComponent>;
  let store: MockStore;

  const initialState = {
    jobs: {
      entities: {},
      ids: [],
      selectedId: null,
      loading: false,
      error: null,
      filters: {}
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [JobFormComponent],
      imports: [
        ReactiveFormsModule,
        RouterTestingModule,
        NoopAnimationsModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatButtonModule,
        MatIconModule,
        MatSnackBarModule,
        MatProgressSpinnerModule
      ],
      providers: [
        provideMockStore({ initialState }),
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ id: 'new' }),
            queryParams: of({})
          }
        }
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(JobFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with default values', () => {
    expect(component.jobForm).toBeDefined();
    expect(component.jobForm.get('jobType')?.value).toBe(JobType.Install);
    expect(component.jobForm.get('priority')?.value).toBe(Priority.Normal);
    expect(component.jobForm.get('requiredCrewSize')?.value).toBe(1);
    expect(component.jobForm.get('estimatedLaborHours')?.value).toBe(8);
  });

  it('should validate required fields', () => {
    const form = component.jobForm;
    
    expect(form.get('client')?.hasError('required')).toBe(true);
    expect(form.get('siteName')?.hasError('required')).toBe(true);
    expect(form.get('scopeDescription')?.hasError('required')).toBe(true);
    expect(form.get('scheduledStartDate')?.hasError('required')).toBe(true);
    expect(form.get('scheduledEndDate')?.hasError('required')).toBe(true);
  });

  it('should validate email format', () => {
    const emailControl = component.jobForm.get('customerPOC.email');
    
    emailControl?.setValue('invalid-email');
    expect(emailControl?.hasError('email')).toBe(true);
    
    emailControl?.setValue('valid@example.com');
    expect(emailControl?.hasError('email')).toBe(false);
  });

  it('should validate phone format', () => {
    const phoneControl = component.jobForm.get('customerPOC.phone');
    
    phoneControl?.setValue('invalid');
    expect(phoneControl?.hasError('pattern')).toBe(true);
    
    phoneControl?.setValue('555-123-4567');
    expect(phoneControl?.hasError('pattern')).toBe(false);
  });

  it('should validate ZIP code format', () => {
    const zipControl = component.jobForm.get('siteAddress.zipCode');
    
    zipControl?.setValue('invalid');
    expect(zipControl?.hasError('pattern')).toBe(true);
    
    zipControl?.setValue('12345');
    expect(zipControl?.hasError('pattern')).toBe(false);
    
    zipControl?.setValue('12345-6789');
    expect(zipControl?.hasError('pattern')).toBe(false);
  });

  it('should validate date range', () => {
    const form = component.jobForm;
    const startDate = new Date('2024-01-20');
    const endDate = new Date('2024-01-15');
    
    form.patchValue({
      scheduledStartDate: startDate,
      scheduledEndDate: endDate
    });
    
    expect(form.hasError('dateRangeInvalid')).toBe(true);
    
    form.patchValue({
      scheduledStartDate: new Date('2024-01-15'),
      scheduledEndDate: new Date('2024-01-20')
    });
    
    expect(form.hasError('dateRangeInvalid')).toBeFalsy();
  });

  it('should validate crew size range', () => {
    const crewSizeControl = component.jobForm.get('requiredCrewSize');
    
    crewSizeControl?.setValue(0);
    expect(crewSizeControl?.hasError('min')).toBe(true);
    
    crewSizeControl?.setValue(25);
    expect(crewSizeControl?.hasError('max')).toBe(true);
    
    crewSizeControl?.setValue(5);
    expect(crewSizeControl?.valid).toBe(true);
  });

  it('should validate estimated hours range', () => {
    const hoursControl = component.jobForm.get('estimatedLaborHours');
    
    hoursControl?.setValue(0);
    expect(hoursControl?.hasError('min')).toBe(true);
    
    hoursControl?.setValue(250);
    expect(hoursControl?.hasError('max')).toBe(true);
    
    hoursControl?.setValue(8);
    expect(hoursControl?.valid).toBe(true);
  });

  it('should handle skills change', () => {
    const skills = [
      { id: '1', name: 'Cat6', category: 'Cabling', level: SkillLevel.Intermediate },
      { id: '2', name: 'Fiber', category: 'Cabling', level: SkillLevel.Intermediate }
    ];
    
    component.onSkillsChange(skills);
    
    expect(component.jobForm.get('requiredSkills')?.value).toEqual(skills);
  });

  it('should handle files selected', () => {
    const files = [new File(['content'], 'test.pdf', { type: 'application/pdf' })];
    
    component.onFilesSelected(files);
    
    expect(component.selectedFiles).toEqual(files);
  });

  it('should not submit invalid form', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    
    component.onSubmit();
    
    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('should submit valid form in create mode', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    
    component.jobForm.patchValue({
      client: 'Test Client',
      siteName: 'Test Site',
      siteAddress: {
        street: '123 Main St',
        city: 'Test City',
        state: 'CA',
        zipCode: '12345'
      },
      jobType: JobType.Install,
      priority: Priority.P1,
      scopeDescription: 'Test description',
      requiredSkills: [],
      requiredCrewSize: 2,
      estimatedLaborHours: 8,
      scheduledStartDate: new Date('2024-01-15'),
      scheduledEndDate: new Date('2024-01-15')
    });
    
    component.onSubmit();
    
    expect(dispatchSpy).toHaveBeenCalled();
  });

  it('should get form title for create mode', () => {
    component.isEditMode = false;
    expect(component.formTitle).toBe('Create New Job');
  });

  it('should get form title for edit mode', () => {
    component.isEditMode = true;
    expect(component.formTitle).toBe('Edit Job');
  });

  it('should get submit button text for create mode', () => {
    component.isEditMode = false;
    expect(component.submitButtonText).toBe('Create Job');
  });

  it('should get submit button text for edit mode', () => {
    component.isEditMode = true;
    expect(component.submitButtonText).toBe('Update Job');
  });

  it('should navigate back on cancel', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate');
    
    component.onCancel();
    
    expect(navigateSpy).toHaveBeenCalled();
  });

  it('should get error message for required field', () => {
    const control = component.jobForm.get('client');
    control?.markAsTouched();
    
    const message = component.getErrorMessage('client');
    
    expect(message).toBe('This field is required');
  });

  it('should get error message for email field', () => {
    const control = component.jobForm.get('customerPOC.email');
    control?.setValue('invalid');
    control?.markAsTouched();
    
    const message = component.getErrorMessage('customerPOC.email');
    
    expect(message).toBe('Invalid email format');
  });

  it('should check if field has error', () => {
    const control = component.jobForm.get('client');
    control?.markAsTouched();
    
    expect(component.hasError('client', 'required')).toBe(true);
  });

  it('should check date range error', () => {
    component.jobForm.patchValue({
      scheduledStartDate: new Date('2024-01-20'),
      scheduledEndDate: new Date('2024-01-15')
    });
    
    component.jobForm.get('scheduledStartDate')?.markAsTouched();
    component.jobForm.get('scheduledEndDate')?.markAsTouched();
    
    expect(component.hasDateRangeError).toBe(true);
  });
});
