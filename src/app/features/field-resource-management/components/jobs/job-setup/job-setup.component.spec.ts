import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of, throwError } from 'rxjs';

import { JobSetupComponent } from './job-setup.component';
import { JobSetupService } from '../../../services/job-setup.service';
import { Job, JobStatus, JobType, Priority } from '../../../models/job.model';

describe('JobSetupComponent', () => {
  let component: JobSetupComponent;
  let fixture: ComponentFixture<JobSetupComponent>;
  let mockJobSetupService: jasmine.SpyObj<JobSetupService>;
  let mockRouter: jasmine.SpyObj<Router>;

  const mockJob: Job = {
    id: 'job-1',
    jobId: 'JOB-001',
    client: 'Acme Corp',
    siteName: 'Main Site',
    siteAddress: { street: '123 Main St', city: 'Springfield', state: 'IL', zipCode: '62701' },
    jobType: JobType.Install,
    priority: Priority.Normal,
    status: JobStatus.NotStarted,
    scopeDescription: '',
    requiredSkills: [],
    requiredCrewSize: 5,
    estimatedLaborHours: 160,
    scheduledStartDate: new Date('2025-12-01'),
    scheduledEndDate: new Date('2025-12-01'),
    attachments: [],
    notes: [],
    market: 'DALLAS',
    company: 'SRI',
    createdBy: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockJobSetupService = jasmine.createSpyObj('JobSetupService', [
      'submitJob', 'saveDraft', 'restoreDraft', 'clearDraft'
    ]);
    mockJobSetupService.restoreDraft.and.returnValue(null);

    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      declarations: [JobSetupComponent],
      imports: [ReactiveFormsModule, NoopAnimationsModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: JobSetupService, useValue: mockJobSetupService },
        { provide: Router, useValue: mockRouter },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(JobSetupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize wizard at step 0 (Customer Info)', () => {
    expect(component.currentStep).toBe(0);
    expect(component.steps[0].label).toBe('Customer Info');
  });

  it('should have 4 wizard steps', () => {
    expect(component.steps.length).toBe(4);
    expect(component.steps.map(s => s.label)).toEqual([
      'Customer Info', 'Pricing & Billing', 'SRI Internal', 'Review'
    ]);
  });

  it('should build form with customerInfo, pricingBilling, and sriInternal groups', () => {
    expect(component.form).toBeDefined();
    expect(component.customerInfoGroup).toBeDefined();
    expect(component.pricingBillingGroup).toBeDefined();
    expect(component.sriInternalGroup).toBeDefined();
  });

  describe('step navigation', () => {
    it('should not go back from step 0', () => {
      component.currentStep = 0;
      component.back();
      expect(component.currentStep).toBe(0);
    });

    it('should go back from step 1 to step 0', () => {
      component.currentStep = 1;
      component.back();
      expect(component.currentStep).toBe(0);
    });

    it('should not advance past step 3', () => {
      component.currentStep = 3;
      component.next();
      expect(component.currentStep).toBe(3);
    });

    it('should allow goToStep within valid range', () => {
      component.goToStep(2);
      expect(component.currentStep).toBe(2);
    });

    it('should not goToStep outside valid range', () => {
      component.goToStep(5);
      expect(component.currentStep).toBe(0);
    });

    it('should block next() when current step form group is invalid', () => {
      // Step 0 customerInfo group has no validators by default (validators are
      // added by the child step component). Since we use NO_ERRORS_SCHEMA and
      // don't instantiate the child, the group is valid. To test blocking, we
      // manually add a required validator to a control.
      component.customerInfoGroup.get('clientName')?.setValidators([
        (c: any) => c.value ? null : { required: true }
      ]);
      component.customerInfoGroup.get('clientName')?.updateValueAndValidity();

      component.next();
      expect(component.currentStep).toBe(0);
    });

    it('should advance next() when current step form group is valid', () => {
      // All controls have no validators by default (child adds them), so group is valid
      component.next();
      expect(component.currentStep).toBe(1);
    });
  });

  describe('draft persistence', () => {
    it('should restore draft on init if one exists', () => {
      mockJobSetupService.restoreDraft.and.returnValue({
        formValue: {
          customerInfo: {
            clientName: 'Saved Client', siteName: '', street: '', city: '',
            state: '', zipCode: '', pocName: '', pocPhone: '', pocEmail: '',
            targetStartDate: '', authorizationStatus: 'pending' as const, hasPurchaseOrders: false,
            purchaseOrderNumber: ''
          },
          pricingBilling: { standardBillRate: null as any, overtimeBillRate: null as any, perDiem: null as any, invoicingProcess: '' },
          sriInternal: { projectDirector: '', targetResources: null as any, bizDevContact: '', requestedHours: null as any, overtimeRequired: false, estimatedOvertimeHours: null }
        },
        currentStep: 2
      });

      // Re-create component to trigger ngOnInit with the draft
      fixture = TestBed.createComponent(JobSetupComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      expect(component.currentStep).toBe(2);
      expect(component.customerInfoGroup.get('clientName')?.value).toBe('Saved Client');
    });

    it('should auto-save on form value changes', fakeAsync(() => {
      component.customerInfoGroup.get('clientName')?.setValue('New Client');
      tick(0);
      expect(mockJobSetupService.saveDraft).toHaveBeenCalled();
    }));
  });

  describe('cancel', () => {
    it('should clear draft and navigate to jobs list on cancel', () => {
      component.cancel();
      expect(mockJobSetupService.clearDraft).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/field-resource-management/jobs']);
    });
  });

  describe('canDeactivate', () => {
    it('should return true when form is not dirty', () => {
      expect(component.canDeactivate()).toBe(true);
    });

    it('should return true when already submitted', () => {
      component.form.markAsDirty();
      component.submitted = true;
      expect(component.canDeactivate()).toBe(true);
    });
  });

  describe('submission', () => {
    it('should dispatch createJob and navigate on successful submission', () => {
      mockJobSetupService.submitJob.and.returnValue(of(mockJob));

      component.submit();

      expect(mockJobSetupService.submitJob).toHaveBeenCalled();
      expect(component.submitted).toBe(true);
      expect(component.submitting).toBe(false);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/field-resource-management/jobs', 'job-1']);
    });

    it('should retain form data and show error on server failure', () => {
      const formValue = component.formValue;
      mockJobSetupService.submitJob.and.returnValue(
        throwError(() => ({ message: 'Server error occurred' }))
      );

      component.customerInfoGroup.get('clientName')?.setValue('Important Client');
      component.submit();

      expect(component.submitting).toBe(false);
      expect(component.submitError).toBe('Server error occurred');
      expect(component.submitted).toBe(false);
      // Form data is retained
      expect(component.customerInfoGroup.get('clientName')?.value).toBe('Important Client');
    });

    it('should show default error message when error has no message', () => {
      mockJobSetupService.submitJob.and.returnValue(
        throwError(() => ({}))
      );

      component.submit();

      expect(component.submitError).toBe('Unable to reach server. Please try again.');
    });

    it('should not submit when already submitting', () => {
      component.submitting = true;
      component.submit();
      expect(mockJobSetupService.submitJob).not.toHaveBeenCalled();
    });
  });
});
