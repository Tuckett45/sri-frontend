/**
 * Job Effects Unit Tests
 * Tests all effects for job state management
 */

import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable, of, throwError } from 'rxjs';
import { HttpEventType } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { JobEffects } from './job.effects';
import { JobService } from '../../services/job.service';
import * as JobActions from './job.actions';
import { Job, JobStatus, Priority, JobNote, Attachment, JobType } from '../../models/job.model';
import { CreateJobDto, UpdateJobDto } from '../../models/dtos/job.dto';

describe('JobEffects', () => {
  let actions$: Observable<any>;
  let effects: JobEffects;
  let jobService: jasmine.SpyObj<JobService>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  const mockJob: Job = {
    id: 'job-123',    siteName: 'Fiber Installation',
    scopeDescription: 'Install fiber optic cables',
    status: JobStatus.EnRoute,
    priority: Priority.P1,
    region: 'TX',
    company: 'Company A',
    location: {
      address: '123 Main St',
      city: 'Dallas',
      state: 'TX',
      zipCode: '75001',
      coordinates: { latitude: 32.7767, longitude: -96.7970, accuracy: 10 }
    },
    scheduledStartDate: new Date('2024-02-01T08:00:00'),
    scheduledEnd: new Date('2024-02-01T17:00:00'),
    requiredSkills: [],
    assignedTechnicians: [],
    estimatedHours: 8,
    notes: [],
    attachments: [],
    createdAt: new Date(),
    market: 'DALLAS',
    updatedAt: new Date()
  };

  const mockNote: JobNote = {
    id: 'note-1',    text: 'Test note',
    createdAt: new Date()
  };

  const mockAttachment: Attachment = {
    id: 'attach-1',    fileName: 'document.pdf',
    fileSize: 1024,
    mimeType: 'application/pdf',
    uploadedBy: 'user-1',
    uploadedAt: new Date()
  };

  beforeEach(() => {
    const jobServiceSpy = jasmine.createSpyObj('JobService', [
      'getJobs',
      'createJob',
      'updateJob',
      'deleteJob',
      'deleteJobs',
      'updateJobStatus',
      'addJobNote',
      'uploadJobAttachment'
    ]);

    const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    TestBed.configureTestingModule({
      providers: [
        JobEffects,
        provideMockActions(() => actions$),
        { provide: JobService, useValue: jobServiceSpy },
        { provide: MatSnackBar, useValue: snackBarSpy }
      ]
    });

    effects = TestBed.inject(JobEffects);
    jobService = TestBed.inject(JobService) as jasmine.SpyObj<JobService>;
    snackBar = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;
  });

  describe('loadJobs$', () => {
    it('should return loadJobsSuccess action on successful load', (done) => {
      const jobs = [mockJob];
      const filters = { region: 'TX' };
      const action = JobActions.loadJobs({ filters });
      const outcome = JobActions.loadJobsSuccess({ jobs });

      actions$ = of(action);
      jobService.getJobs.and.returnValue(of(jobs));

      effects.loadJobs$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(jobService.getJobs).toHaveBeenCalledWith(filters);
        done();
      });
    });

    it('should return loadJobsFailure action on error', (done) => {
      const filters = { region: 'TX' };
      const action = JobActions.loadJobs({ filters });
      const error = new Error('Failed to load jobs');
      const outcome = JobActions.loadJobsFailure({ 
        error: 'Failed to load jobs' 
      });

      actions$ = of(action);
      jobService.getJobs.and.returnValue(throwError(() => error));

      effects.loadJobs$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(jobService.getJobs).toHaveBeenCalledWith(filters);
        done();
      });
    });

    it('should handle load without filters', (done) => {
      const jobs = [mockJob];
      const action = JobActions.loadJobs({ filters: undefined });
      const outcome = JobActions.loadJobsSuccess({ jobs });

      actions$ = of(action);
      jobService.getJobs.and.returnValue(of(jobs));

      effects.loadJobs$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(jobService.getJobs).toHaveBeenCalledWith(undefined);
        done();
      });
    });

    it('should handle empty job list', (done) => {
      const jobs: Job[] = [];
      const action = JobActions.loadJobs({ filters: undefined });
      const outcome = JobActions.loadJobsSuccess({ jobs });

      actions$ = of(action);
      jobService.getJobs.and.returnValue(of(jobs));

      effects.loadJobs$.subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });
  });

  describe('createJob$', () => {
    it('should return createJobSuccess action on successful creation', (done) => {
      const createDto: CreateJobDto = {
        client: 'Test Client',
        siteName: 'Cable Repair',
        siteAddress: {
          street: '123 Main St',
          city: 'Dallas',
          state: 'TX',
          zipCode: '75001'
        },
        jobType: JobType.Install,
        priority: Priority.P2,
        scopeDescription: 'Repair damaged cables',
        requiredSkills: [],
        requiredCrewSize: 2,
        estimatedLaborHours: 6,
        scheduledStartDate: new Date('2024-02-02T08:00:00'),
        scheduledEndDate: new Date('2024-02-02T17:00:00')
      };
      const action = JobActions.createJob({ job: createDto });
      const outcome = JobActions.createJobSuccess({ job: mockJob });

      actions$ = of(action);
      jobService.createJob.and.returnValue(of(mockJob));

      effects.createJob$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(jobService.createJob).toHaveBeenCalledWith(createDto);
        done();
      });
    });

    it('should return createJobFailure action on error', (done) => {
      const createDto: CreateJobDto = {
        client: 'Test Client',
        siteName: 'Cable Repair',
        siteAddress: {
          street: '123 Main St',
          city: 'Dallas',
          state: 'TX',
          zipCode: '75001'
        },
        jobType: JobType.Install,
        priority: Priority.P2,
        scopeDescription: 'Repair damaged cables',
        requiredSkills: [],
        requiredCrewSize: 2,
        estimatedLaborHours: 6,
        scheduledStartDate: new Date('2024-02-02T08:00:00'),
        scheduledEndDate: new Date('2024-02-02T17:00:00')
      };
      const action = JobActions.createJob({ job: createDto });
      const error = new Error('Failed to create job');
      const outcome = JobActions.createJobFailure({ 
        error: 'Failed to create job' 
      });

      actions$ = of(action);
      jobService.createJob.and.returnValue(throwError(() => error));

      effects.createJob$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(jobService.createJob).toHaveBeenCalledWith(createDto);
        done();
      });
    });

    it('should handle validation errors', (done) => {
      const createDto: CreateJobDto = {
        client: '',
        siteName: '',
        siteAddress: {
          street: '',
          city: '',
          state: '',
          zipCode: ''
        },
        jobType: JobType.Install,
        priority: Priority.P2,
        scopeDescription: '',
        requiredSkills: [],
        requiredCrewSize: 0,
        estimatedLaborHours: 0,
        scheduledStartDate: new Date('2024-02-02T08:00:00'),
        scheduledEndDate: new Date('2024-02-02T17:00:00')
      };
      const action = JobActions.createJob({ job: createDto });
      const error = new Error('Validation failed');
      const outcome = JobActions.createJobFailure({ 
        error: 'Validation failed' 
      });

      actions$ = of(action);
      jobService.createJob.and.returnValue(throwError(() => error));

      effects.createJob$.subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });
  });

  describe('updateJob$', () => {
    it('should return updateJobSuccess action on successful update', (done) => {
      const updateDto: UpdateJobDto = {
        siteName: 'Updated Title',
        scopeDescription: 'Updated description'
      };
      const updatedJob = { ...mockJob, ...updateDto };
      const action = JobActions.updateJob({ 
        id: mockJob.id, 
        job: updateDto 
      });
      const outcome = JobActions.updateJobSuccess({ job: updatedJob });

      actions$ = of(action);
      jobService.updateJob.and.returnValue(of(updatedJob));

      effects.updateJob$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(jobService.updateJob).toHaveBeenCalledWith(mockJob.id, updateDto);
        done();
      });
    });

    it('should return updateJobFailure action on error', (done) => {
      const updateDto = {
        siteName: 'Updated Title',
        scopeDescription: 'Updated description'
      };
      const action = JobActions.updateJob({ 
        id: mockJob.id, 
        job: updateDto 
      });
      const error = new Error('Failed to update job');
      const outcome = JobActions.updateJobFailure({ 
        error: 'Failed to update job' 
      });

      actions$ = of(action);
      jobService.updateJob.and.returnValue(throwError(() => error));

      effects.updateJob$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(jobService.updateJob).toHaveBeenCalledWith(mockJob.id, updateDto);
        done();
      });
    });

    it('should handle permission errors', (done) => {
      const updateDto = {
        siteName: 'Updated Title',
        scopeDescription: 'Updated description'
      };
      const action = JobActions.updateJob({ 
        id: mockJob.id, 
        job: updateDto 
      });
      const error = new Error('Access denied. You do not have permission to perform this action.');
      const outcome = JobActions.updateJobFailure({ 
        error: 'Access denied. You do not have permission to perform this action.' 
      });

      actions$ = of(action);
      jobService.updateJob.and.returnValue(throwError(() => error));

      effects.updateJob$.subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });

    it('should handle not found errors', (done) => {
      const updateDto = {
        siteName: 'Updated Title',
        scopeDescription: 'Updated description'
      };
      const action = JobActions.updateJob({ 
        id: 'non-existent-id', 
        job: updateDto 
      });
      const error = new Error('Job not found.');
      const outcome = JobActions.updateJobFailure({ 
        error: 'Job not found.' 
      });

      actions$ = of(action);
      jobService.updateJob.and.returnValue(throwError(() => error));

      effects.updateJob$.subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });
  });

  describe('deleteJob$', () => {
    it('should return deleteJobSuccess action on successful deletion', (done) => {
      const action = JobActions.deleteJob({ id: mockJob.id });
      const outcome = JobActions.deleteJobSuccess({ id: mockJob.id });

      actions$ = of(action);
      jobService.deleteJob.and.returnValue(of(void 0));

      effects.deleteJob$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(jobService.deleteJob).toHaveBeenCalledWith(mockJob.id);
        done();
      });
    });

    it('should return deleteJobFailure action on error', (done) => {
      const action = JobActions.deleteJob({ id: mockJob.id });
      const error = new Error('Failed to delete job');
      const outcome = JobActions.deleteJobFailure({ 
        error: 'Failed to delete job' 
      });

      actions$ = of(action);
      jobService.deleteJob.and.returnValue(throwError(() => error));

      effects.deleteJob$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(jobService.deleteJob).toHaveBeenCalledWith(mockJob.id);
        done();
      });
    });

    it('should handle permission errors on delete', (done) => {
      const action = JobActions.deleteJob({ id: mockJob.id });
      const error = new Error('Access denied. You do not have permission to perform this action.');
      const outcome = JobActions.deleteJobFailure({ 
        error: 'Access denied. You do not have permission to perform this action.' 
      });

      actions$ = of(action);
      jobService.deleteJob.and.returnValue(throwError(() => error));

      effects.deleteJob$.subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });
  });

  describe('updateJobStatus$', () => {
    it('should return updateJobStatusSuccess action on successful status update', (done) => {
      const action = JobActions.updateJobStatus({ 
        id: mockJob.id, 
        status: JobStatus.OnSite,
        reason: 'Work started'
      });
      const updatedJob = { ...mockJob, status: JobStatus.OnSite };
      const outcome = JobActions.updateJobStatusSuccess({ job: updatedJob });

      actions$ = of(action);
      jobService.updateJobStatus.and.returnValue(of(updatedJob));

      effects.updateJobStatus$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(jobService.updateJobStatus).toHaveBeenCalledWith(
          mockJob.id,
          JobStatus.OnSite,
          'Work started'
        );
        done();
      });
    });

    it('should return updateJobStatusFailure action on error', (done) => {
      const action = JobActions.updateJobStatus({ 
        id: mockJob.id, 
        status: JobStatus.Completed 
      });
      const error = new Error('Failed to update job status');
      const outcome = JobActions.updateJobStatusFailure({ 
        error: 'Failed to update job status' 
      });

      actions$ = of(action);
      jobService.updateJobStatus.and.returnValue(throwError(() => error));

      effects.updateJobStatus$.subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });

    it('should handle status update without reason', (done) => {
      const action = JobActions.updateJobStatus({ 
        id: mockJob.id, 
        status: JobStatus.Completed
      });
      const updatedJob = { ...mockJob, status: JobStatus.Completed };
      const outcome = JobActions.updateJobStatusSuccess({ job: updatedJob });

      actions$ = of(action);
      jobService.updateJobStatus.and.returnValue(of(updatedJob));

      effects.updateJobStatus$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(jobService.updateJobStatus).toHaveBeenCalledWith(
          mockJob.id,
          JobStatus.Completed,
          undefined
        );
        done();
      });
    });
  });

  describe('addJobNote$', () => {
    it('should return addJobNoteSuccess action on successful note addition', (done) => {
      const action = JobActions.addJobNote({ 
        jobId: mockJob.id, 
        note: 'Test note' 
      });
      const outcome = JobActions.addJobNoteSuccess({ 
        jobId: mockJob.id, 
        note: mockNote 
      });

      actions$ = of(action);
      jobService.addJobNote.and.returnValue(of(mockNote));

      effects.addJobNote$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(jobService.addJobNote).toHaveBeenCalledWith(mockJob.id, 'Test note');
        done();
      });
    });

    it('should return addJobNoteFailure action on error', (done) => {
      const action = JobActions.addJobNote({ 
        jobId: mockJob.id, 
        note: 'Test note' 
      });
      const error = new Error('Failed to add job note');
      const outcome = JobActions.addJobNoteFailure({ 
        error: 'Failed to add job note' 
      });

      actions$ = of(action);
      jobService.addJobNote.and.returnValue(throwError(() => error));

      effects.addJobNote$.subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });
  });

  describe('uploadAttachment$', () => {
    it('should return uploadAttachmentSuccess action on successful upload', (done) => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const action = JobActions.uploadAttachment({ 
        jobId: mockJob.id, 
        file 
      });
      const outcome = JobActions.uploadAttachmentSuccess({ 
        jobId: mockJob.id, 
        attachment: mockAttachment 
      });

      const httpEvent = {
        type: HttpEventType.Response,
        body: mockAttachment
      };

      actions$ = of(action);
      jobService.uploadJobAttachment.and.returnValue(of(httpEvent as any));

      effects.uploadAttachment$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(jobService.uploadJobAttachment).toHaveBeenCalledWith(mockJob.id, file);
        done();
      });
    });

    it('should return uploadAttachmentFailure action on error', (done) => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const action = JobActions.uploadAttachment({ 
        jobId: mockJob.id, 
        file 
      });
      const error = new Error('Failed to upload attachment');
      const outcome = JobActions.uploadAttachmentFailure({ 
        error: 'Failed to upload attachment' 
      });

      actions$ = of(action);
      jobService.uploadJobAttachment.and.returnValue(throwError(() => error));

      effects.uploadAttachment$.subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });

    it('should filter out non-response events', (done) => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const action = JobActions.uploadAttachment({ 
        jobId: mockJob.id, 
        file 
      });

      const progressEvent = {
        type: HttpEventType.UploadProgress,
        loaded: 50,
        total: 100
      };

      actions$ = of(action);
      jobService.uploadJobAttachment.and.returnValue(of(progressEvent as any));

      effects.uploadAttachment$.subscribe({
        next: () => {
          fail('Should not emit for progress events');
        },
        complete: () => {
          done();
        }
      });
    });
  });

  describe('batchUpdateStatus$', () => {
    it('should return batchUpdateStatusSuccess action on successful batch update', (done) => {
      const jobIds = ['job-1', 'job-2'];
      const action = JobActions.batchUpdateStatus({ 
        jobIds, 
        status: JobStatus.Completed 
      });
      const results: JobActions.BatchOperationResult[] = [
        { jobId: 'job-1', success: true },
        { jobId: 'job-2', success: true }
      ];
      const outcome = JobActions.batchUpdateStatusSuccess({ results });

      actions$ = of(action);
      jobService.updateJobStatus.and.returnValues(
        of(mockJob),
        of(mockJob)
      );

      effects.batchUpdateStatus$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(jobService.updateJobStatus).toHaveBeenCalledTimes(2);
        done();
      });
    });

    it('should handle partial failures in batch update', (done) => {
      const jobIds = ['job-1', 'job-2'];
      const action = JobActions.batchUpdateStatus({ 
        jobIds, 
        status: JobStatus.Completed 
      });

      actions$ = of(action);
      jobService.updateJobStatus.and.returnValues(
        of(mockJob),
        throwError(() => new Error('Failed'))
      );

      effects.batchUpdateStatus$.subscribe((result) => {
        expect(result.type).toBe('[Job] Batch Update Status Success');
        const results = (result as any).results;
        expect(results[0].success).toBe(true);
        expect(results[1].success).toBe(false);
        expect(results[1].error).toBe('Failed');
        done();
      });
    });

    it('should return batchUpdateStatusFailure action on complete failure', (done) => {
      const jobIds = ['job-1', 'job-2'];
      const action = JobActions.batchUpdateStatus({ 
        jobIds, 
        status: JobStatus.Completed 
      });
      const error = new Error('Complete failure');
      const outcome = JobActions.batchUpdateStatusFailure({ 
        error: 'Complete failure' 
      });

      actions$ = of(action);
      jobService.updateJobStatus.and.returnValue(throwError(() => error));

      effects.batchUpdateStatus$.subscribe((result) => {
        // forkJoin will complete even with errors, so we check the results
        expect(result.type).toBe('[Job] Batch Update Status Success');
        done();
      });
    });
  });

  describe('batchDelete$', () => {
    it('should return batchDeleteSuccess action on successful batch delete', (done) => {
      const jobIds = ['job-1', 'job-2'];
      const action = JobActions.batchDelete({ jobIds });
      const results: JobActions.BatchOperationResult[] = [
        { jobId: 'job-1', success: true },
        { jobId: 'job-2', success: true }
      ];
      const outcome = JobActions.batchDeleteSuccess({ results });

      actions$ = of(action);
      jobService.deleteJobs.and.returnValue(of(void 0));

      effects.batchDelete$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(jobService.deleteJobs).toHaveBeenCalledWith(jobIds);
        done();
      });
    });

    it('should fallback to individual deletes on batch delete failure', (done) => {
      const jobIds = ['job-1', 'job-2'];
      const action = JobActions.batchDelete({ jobIds });

      actions$ = of(action);
      jobService.deleteJobs.and.returnValue(throwError(() => new Error('Batch failed')));
      jobService.deleteJob.and.returnValues(
        of(void 0),
        of(void 0)
      );

      effects.batchDelete$.subscribe((result) => {
        expect(result.type).toBe('[Job] Batch Delete Success');
        expect(jobService.deleteJob).toHaveBeenCalledTimes(2);
        done();
      });
    });

    it('should handle partial failures in individual deletes', (done) => {
      const jobIds = ['job-1', 'job-2'];
      const action = JobActions.batchDelete({ jobIds });

      actions$ = of(action);
      jobService.deleteJobs.and.returnValue(throwError(() => new Error('Batch failed')));
      jobService.deleteJob.and.returnValues(
        of(void 0),
        throwError(() => new Error('Delete failed'))
      );

      effects.batchDelete$.subscribe((result) => {
        expect(result.type).toBe('[Job] Batch Delete Success');
        const results = (result as any).results;
        expect(results[0].success).toBe(true);
        expect(results[1].success).toBe(false);
        done();
      });
    });
  });

  describe('Notification Effects', () => {
    it('should show success notification on createJobSuccess', (done) => {
      const action = JobActions.createJobSuccess({ job: mockJob });
      actions$ = of(action);

      effects.showCreateJobSuccess$.subscribe(() => {
        expect(snackBar.open).toHaveBeenCalledWith(
          'Job created successfully',
          'Close',
          { duration: 3000 }
        );
        done();
      });
    });

    it('should show success notification on updateJobSuccess', (done) => {
      const action = JobActions.updateJobSuccess({ job: mockJob });
      actions$ = of(action);

      effects.showUpdateJobSuccess$.subscribe(() => {
        expect(snackBar.open).toHaveBeenCalledWith(
          'Job updated successfully',
          'Close',
          { duration: 3000 }
        );
        done();
      });
    });

    it('should show success notification on deleteJobSuccess', (done) => {
      const action = JobActions.deleteJobSuccess({ id: mockJob.id });
      actions$ = of(action);

      effects.showDeleteJobSuccess$.subscribe(() => {
        expect(snackBar.open).toHaveBeenCalledWith(
          'Job deleted successfully',
          'Close',
          { duration: 3000 }
        );
        done();
      });
    });

    it('should show error notification on loadJobsFailure', (done) => {
      const error = 'Failed to load jobs';
      const action = JobActions.loadJobsFailure({ error });
      actions$ = of(action);

      effects.showErrorNotification$.subscribe(() => {
        expect(snackBar.open).toHaveBeenCalledWith(
          error,
          'Close',
          { duration: 5000 }
        );
        done();
      });
    });

    it('should show batch update results notification', (done) => {
      const results: JobActions.BatchOperationResult[] = [
        { jobId: 'job-1', success: true },
        { jobId: 'job-2', success: false, error: 'Failed' }
      ];
      const action = JobActions.batchUpdateStatusSuccess({ results });
      actions$ = of(action);

      effects.showBatchUpdateStatusResults$.subscribe(() => {
        expect(snackBar.open).toHaveBeenCalledWith(
          '1 job(s) updated, 1 failed',
          'Close',
          { duration: 7000 }
        );
        done();
      });
    });

    it('should show all success notification for batch update', (done) => {
      const results: JobActions.BatchOperationResult[] = [
        { jobId: 'job-1', success: true },
        { jobId: 'job-2', success: true }
      ];
      const action = JobActions.batchUpdateStatusSuccess({ results });
      actions$ = of(action);

      effects.showBatchUpdateStatusResults$.subscribe(() => {
        expect(snackBar.open).toHaveBeenCalledWith(
          'Successfully updated status for 2 job(s)',
          'Close',
          { duration: 5000 }
        );
        done();
      });
    });
  });
});
