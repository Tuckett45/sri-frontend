import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { JobSetupService } from './job-setup.service';
import { JobSetupFormValue } from '../models/job-setup.models';
import { AuthService } from '../../../services/auth.service';
import { Job, JobStatus, JobType, Priority } from '../models/job.model';
import { Store } from '@ngrx/store';
import { Actions } from '@ngrx/effects';
import { Subject } from 'rxjs';
import * as JobActions from '../state/jobs/job.actions';

const DRAFT_KEY = 'frm_job_setup_draft';

const mockUser = {
  id: 'user-123',
  name: 'Test User',
  email: 'test@example.com',
  role: 'Admin',
};

const mockAuthService = {
  getUser: () => mockUser,
};

const mockFormValue: JobSetupFormValue = {
  customerInfo: {
    clientName: 'Acme Corp',
    siteName: 'Main Site',
    street: '123 Main St',
    city: 'Springfield',
    state: 'IL',
    zipCode: '62701',
    pocName: 'Jane Doe',
    pocPhone: '2175550100',
    pocEmail: 'jane@acme.com',
    targetStartDate: '2025-12-01',
    authorizationStatus: 'authorized',
    hasPurchaseOrders: false,
    purchaseOrderNumber: '',
  },
  pricingBilling: {
    standardBillRate: 75,
    overtimeBillRate: 112.5,
    perDiem: 50,
    invoicingProcess: 'weekly',
  },
  sriInternal: {
    projectDirector: 'Bob Smith',
    targetResources: 5,
    bizDevContact: 'Alice Jones',
    requestedHours: 160,
    overtimeRequired: false,
    estimatedOvertimeHours: null,
  },
};

describe('JobSetupService', () => {
  let service: JobSetupService;
  let actions$: Subject<any>;
  let dispatchSpy: jasmine.Spy;

  beforeEach(() => {
    sessionStorage.clear();
    actions$ = new Subject<any>();
    const mockStore = {
      dispatch: jasmine.createSpy('dispatch'),
    };
    dispatchSpy = mockStore.dispatch;

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Store, useValue: mockStore },
        { provide: Actions, useValue: actions$ },
      ],
    });
    service = TestBed.inject(JobSetupService);
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  describe('restoreDraft', () => {
    it('returns null when no draft is stored', () => {
      expect(service.restoreDraft()).toBeNull();
    });

    it('returns null when stored value is invalid JSON', () => {
      sessionStorage.setItem(DRAFT_KEY, 'not-valid-json{{{');
      expect(service.restoreDraft()).toBeNull();
    });

    it('returns formValue and currentStep from a valid stored draft', () => {
      const draft = {
        formValue: mockFormValue,
        currentStep: 2,
        savedAt: new Date().toISOString(),
      };
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));

      const result = service.restoreDraft();
      expect(result).not.toBeNull();
      expect(result!.currentStep).toBe(2);
      expect(result!.formValue).toEqual(mockFormValue);
    });
  });

  describe('clearDraft', () => {
    it('removes the draft from sessionStorage', () => {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ formValue: mockFormValue, currentStep: 1, savedAt: '' }));
      service.clearDraft();
      expect(sessionStorage.getItem(DRAFT_KEY)).toBeNull();
    });

    it('does not throw when no draft exists', () => {
      expect(() => service.clearDraft()).not.toThrow();
    });
  });

  describe('saveDraft', () => {
    it('writes draft to sessionStorage after 2-second debounce', fakeAsync(() => {
      service.saveDraft(mockFormValue, 1);
      expect(sessionStorage.getItem(DRAFT_KEY)).toBeNull(); // not yet written

      tick(2000);

      const raw = sessionStorage.getItem(DRAFT_KEY);
      expect(raw).not.toBeNull();
      const stored = JSON.parse(raw!);
      expect(stored.currentStep).toBe(1);
      expect(stored.formValue).toEqual(mockFormValue);
      expect(stored.savedAt).toBeTruthy();
    }));

    it('debounces multiple rapid calls and only writes the last value', fakeAsync(() => {
      service.saveDraft(mockFormValue, 0);
      tick(500);
      service.saveDraft(mockFormValue, 1);
      tick(500);
      service.saveDraft(mockFormValue, 2);
      tick(2000);

      const raw = sessionStorage.getItem(DRAFT_KEY);
      expect(raw).not.toBeNull();
      const stored = JSON.parse(raw!);
      expect(stored.currentStep).toBe(2);
    }));

    it('does not write before the debounce period elapses', fakeAsync(() => {
      service.saveDraft(mockFormValue, 0);
      tick(1999);
      expect(sessionStorage.getItem(DRAFT_KEY)).toBeNull();
      tick(1); // complete the debounce
    }));
  });

  describe('round-trip: saveDraft → restoreDraft', () => {
    it('restores the exact formValue and currentStep that were saved', fakeAsync(() => {
      service.saveDraft(mockFormValue, 3);
      tick(2000);

      const result = service.restoreDraft();
      expect(result).not.toBeNull();
      expect(result!.formValue).toEqual(mockFormValue);
      expect(result!.currentStep).toBe(3);
    }));
  });

  describe('mapToCreateJobDto', () => {
    it('maps customerInfo fields correctly', () => {
      const dto = service.mapToCreateJobDto(mockFormValue);

      expect(dto.client).toBe('Acme Corp');
      expect(dto.siteName).toBe('Main Site');
      expect(dto.siteAddress).toEqual({
        street: '123 Main St',
        city: 'Springfield',
        state: 'IL',
        zipCode: '62701',
      });
      expect(dto.customerPOC).toEqual({
        name: 'Jane Doe',
        phone: '2175550100',
        email: 'jane@acme.com',
      });
      expect(dto.scheduledStartDate).toEqual(new Date('2025-12-01'));
      expect(dto.authorizationStatus).toBe('authorized');
      expect(dto.hasPurchaseOrders).toBe(false);
    });

    it('omits purchaseOrderNumber when hasPurchaseOrders is false', () => {
      const dto = service.mapToCreateJobDto(mockFormValue);
      expect(dto.purchaseOrderNumber).toBeUndefined();
    });

    it('includes purchaseOrderNumber when hasPurchaseOrders is true', () => {
      const formWithPO: JobSetupFormValue = {
        ...mockFormValue,
        customerInfo: {
          ...mockFormValue.customerInfo,
          hasPurchaseOrders: true,
          purchaseOrderNumber: 'PO-9999',
        },
      };
      const dto = service.mapToCreateJobDto(formWithPO);
      expect(dto.purchaseOrderNumber).toBe('PO-9999');
    });

    it('maps pricingBilling fields correctly', () => {
      const dto = service.mapToCreateJobDto(mockFormValue);

      expect(dto.standardBillRate).toBe(75);
      expect(dto.overtimeBillRate).toBe(112.5);
      expect(dto.perDiem).toBe(50);
      expect(dto.invoicingProcess).toBe('weekly');
    });

    it('maps sriInternal fields correctly', () => {
      const dto = service.mapToCreateJobDto(mockFormValue);

      expect(dto.projectDirector).toBe('Bob Smith');
      expect(dto.targetResources).toBe(5);
      expect(dto.bizDevContact).toBe('Alice Jones');
      expect(dto.requestedHours).toBe(160);
      expect(dto.overtimeRequired).toBe(false);
      expect(dto.estimatedOvertimeHours).toBeUndefined();
    });

    it('includes estimatedOvertimeHours when overtimeRequired is true', () => {
      const formWithOT: JobSetupFormValue = {
        ...mockFormValue,
        sriInternal: {
          ...mockFormValue.sriInternal,
          overtimeRequired: true,
          estimatedOvertimeHours: 20,
        },
      };
      const dto = service.mapToCreateJobDto(formWithOT);
      expect(dto.estimatedOvertimeHours).toBe(20);
    });

    it('sets sensible defaults for fields not in the form', () => {
      const dto = service.mapToCreateJobDto(mockFormValue);

      expect(dto.jobType).toBe(JobType.Install);
      expect(dto.priority).toBe(Priority.Normal);
      expect(dto.scopeDescription).toBe('');
      expect(dto.requiredSkills).toEqual([]);
      expect(dto.requiredCrewSize).toBe(mockFormValue.sriInternal.targetResources);
      expect(dto.estimatedLaborHours).toBe(mockFormValue.sriInternal.requestedHours);
    });
  });

  describe('submitJob', () => {
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

    it('dispatches createJob action with the mapped DTO', () => {
      service.submitJob(mockFormValue).subscribe();
      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      const dispatchedAction = dispatchSpy.calls.mostRecent().args[0];
      expect(dispatchedAction.type).toBe('[Job] Create Job');
      expect(dispatchedAction.job.client).toBe('Acme Corp');
    });

    it('emits the created Job and completes on createJobSuccess', (done) => {
      service.submitJob(mockFormValue).subscribe({
        next: (job) => {
          expect(job).toEqual(mockJob);
        },
        complete: () => done(),
      });

      actions$.next(JobActions.createJobSuccess({ job: mockJob }));
    });

    it('clears draft on success', () => {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ formValue: mockFormValue, currentStep: 3, savedAt: '' }));

      service.submitJob(mockFormValue).subscribe();
      actions$.next(JobActions.createJobSuccess({ job: mockJob }));

      expect(sessionStorage.getItem(DRAFT_KEY)).toBeNull();
    });

    it('errors on createJobFailure', (done) => {
      service.submitJob(mockFormValue).subscribe({
        error: (err) => {
          expect(err).toBe('Server error');
          done();
        },
      });

      actions$.next(JobActions.createJobFailure({ error: 'Server error' }));
    });

    it('does not clear draft on failure', () => {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ formValue: mockFormValue, currentStep: 3, savedAt: '' }));

      service.submitJob(mockFormValue).subscribe({ error: () => {} });
      actions$.next(JobActions.createJobFailure({ error: 'Server error' }));

      expect(sessionStorage.getItem(DRAFT_KEY)).not.toBeNull();
    });
  });
});
