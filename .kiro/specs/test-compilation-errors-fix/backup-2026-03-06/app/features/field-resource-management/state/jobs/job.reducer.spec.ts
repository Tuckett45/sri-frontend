/**
 * Job Reducer Tests
 * Unit tests for job state reducer
 */

import { jobReducer, initialState, jobAdapter } from './job.reducer';
import * as JobActions from './job.actions';
import { Job, JobStatus, JobPriority, JobNote, Attachment } from '../../models/job.model';

describe('JobReducer', () => {
  const mockJob: Job = {
    id: 'job-1',
    jobId: 'J001',
    title: 'Fiber Installation',
    description: 'Install fiber optic cables',
    status: JobStatus.Scheduled,
    priority: JobPriority.High,
    region: 'TX',
    company: 'Company A',
    location: {
      address: '123 Main St',
      city: 'Dallas',
      state: 'TX',
      zipCode: '75001',
      coordinates: { latitude: 32.7767, longitude: -96.7970 }
    },
    scheduledStart: new Date('2024-02-01T08:00:00'),
    scheduledEnd: new Date('2024-02-01T17:00:00'),
    requiredSkills: [],
    assignedTechnicians: [],
    estimatedHours: 8,
    notes: [],
    attachments: [],
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  };

  const mockNote: JobNote = {
    id: 'note-1',
    jobId: 'job-1',
    content: 'Test note',
    createdBy: 'user-1',
    createdAt: new Date()
  };

  const mockAttachment: Attachment = {
    id: 'attach-1',
    jobId: 'job-1',
    fileName: 'document.pdf',
    fileUrl: 'https://example.com/document.pdf',
    fileSize: 1024,
    mimeType: 'application/pdf',
    uploadedBy: 'user-1',
    uploadedAt: new Date()
  };

  describe('Initial State', () => {
    it('should return the initial state', () => {
      const action = { type: 'Unknown' };
      const state = jobReducer(undefined, action);

      expect(state).toEqual(initialState);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.selectedId).toBeNull();
      expect(state.filters).toEqual({});
    });
  });

  describe('Load Jobs', () => {
    it('should set loading to true on loadJobs', () => {
      const action = JobActions.loadJobs({ filters: {} });
      const state = jobReducer(initialState, action);

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should set filters on loadJobs', () => {
      const filters = { region: 'TX', status: JobStatus.Scheduled };
      const action = JobActions.loadJobs({ filters });
      const state = jobReducer(initialState, action);

      expect(state.filters).toEqual(filters);
    });

    it('should add all jobs on loadJobsSuccess', () => {
      const jobs = [mockJob];
      const action = JobActions.loadJobsSuccess({ jobs });
      const state = jobReducer(initialState, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.ids.length).toBe(1);
      expect(state.entities[mockJob.id]).toEqual(mockJob);
    });

    it('should set error on loadJobsFailure', () => {
      const error = 'Failed to load jobs';
      const action = JobActions.loadJobsFailure({ error });
      const state = jobReducer(initialState, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBe(error);
    });
  });

  describe('Create Job', () => {
    it('should set loading to true on createJob', () => {
      const action = JobActions.createJob({ 
        job: { title: 'New Job', description: 'Test' } as any 
      });
      const state = jobReducer(initialState, action);

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should add job on createJobSuccess', () => {
      const action = JobActions.createJobSuccess({ job: mockJob });
      const state = jobReducer(initialState, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.ids.length).toBe(1);
      expect(state.entities[mockJob.id]).toEqual(mockJob);
    });

    it('should set error on createJobFailure', () => {
      const error = 'Failed to create job';
      const action = JobActions.createJobFailure({ error });
      const state = jobReducer(initialState, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBe(error);
    });
  });

  describe('Update Job', () => {
    let stateWithJob: any;

    beforeEach(() => {
      stateWithJob = jobAdapter.addOne(mockJob, initialState);
    });

    it('should set loading to true on updateJob', () => {
      const action = JobActions.updateJob({ 
        id: mockJob.id, 
        job: { title: 'Updated Title' } as any 
      });
      const state = jobReducer(stateWithJob, action);

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should update job on updateJobSuccess', () => {
      const updatedJob = { ...mockJob, title: 'Updated Title' };
      const action = JobActions.updateJobSuccess({ job: updatedJob });
      const state = jobReducer(stateWithJob, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.entities[mockJob.id]?.title).toBe('Updated Title');
    });

    it('should set error on updateJobFailure', () => {
      const error = 'Failed to update job';
      const action = JobActions.updateJobFailure({ error });
      const state = jobReducer(stateWithJob, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBe(error);
    });
  });

  describe('Delete Job', () => {
    let stateWithJob: any;

    beforeEach(() => {
      stateWithJob = jobAdapter.addOne(mockJob, initialState);
    });

    it('should set loading to true on deleteJob', () => {
      const action = JobActions.deleteJob({ id: mockJob.id });
      const state = jobReducer(stateWithJob, action);

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should remove job on deleteJobSuccess', () => {
      const action = JobActions.deleteJobSuccess({ id: mockJob.id });
      const state = jobReducer(stateWithJob, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.ids.length).toBe(0);
      expect(state.entities[mockJob.id]).toBeUndefined();
    });

    it('should clear selectedId if deleted job was selected', () => {
      const stateWithSelection = { ...stateWithJob, selectedId: mockJob.id };
      const action = JobActions.deleteJobSuccess({ id: mockJob.id });
      const state = jobReducer(stateWithSelection, action);

      expect(state.selectedId).toBeNull();
    });

    it('should preserve selectedId if different job was deleted', () => {
      const stateWithSelection = { ...stateWithJob, selectedId: 'other-id' };
      const action = JobActions.deleteJobSuccess({ id: mockJob.id });
      const state = jobReducer(stateWithSelection, action);

      expect(state.selectedId).toBe('other-id');
    });

    it('should set error on deleteJobFailure', () => {
      const error = 'Failed to delete job';
      const action = JobActions.deleteJobFailure({ error });
      const state = jobReducer(stateWithJob, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBe(error);
    });
  });

  describe('Select Job', () => {
    it('should set selectedId on selectJob', () => {
      const action = JobActions.selectJob({ id: mockJob.id });
      const state = jobReducer(initialState, action);

      expect(state.selectedId).toBe(mockJob.id);
    });

    it('should clear selectedId when null is passed', () => {
      const stateWithSelection = { ...initialState, selectedId: mockJob.id };
      const action = JobActions.selectJob({ id: null });
      const state = jobReducer(stateWithSelection, action);

      expect(state.selectedId).toBeNull();
    });
  });

  describe('Filters', () => {
    it('should set filters on setJobFilters', () => {
      const filters = { region: 'TX', status: JobStatus.InProgress };
      const action = JobActions.setJobFilters({ filters });
      const state = jobReducer(initialState, action);

      expect(state.filters).toEqual(filters);
    });

    it('should clear filters on clearJobFilters', () => {
      const stateWithFilters = { ...initialState, filters: { region: 'TX' } };
      const action = JobActions.clearJobFilters();
      const state = jobReducer(stateWithFilters, action);

      expect(state.filters).toEqual({});
    });
  });

  describe('Update Job Status', () => {
    let stateWithJob: any;

    beforeEach(() => {
      stateWithJob = jobAdapter.addOne(mockJob, initialState);
    });

    it('should set loading to true on updateJobStatus', () => {
      const action = JobActions.updateJobStatus({ 
        id: mockJob.id, 
        status: JobStatus.InProgress 
      });
      const state = jobReducer(stateWithJob, action);

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should update job status on updateJobStatusSuccess', () => {
      const updatedJob = { ...mockJob, status: JobStatus.Completed };
      const action = JobActions.updateJobStatusSuccess({ job: updatedJob });
      const state = jobReducer(stateWithJob, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.entities[mockJob.id]?.status).toBe(JobStatus.Completed);
    });

    it('should set error on updateJobStatusFailure', () => {
      const error = 'Failed to update job status';
      const action = JobActions.updateJobStatusFailure({ error });
      const state = jobReducer(stateWithJob, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBe(error);
    });
  });

  describe('Add Job Note', () => {
    let stateWithJob: any;

    beforeEach(() => {
      stateWithJob = jobAdapter.addOne(mockJob, initialState);
    });

    it('should set loading to true on addJobNote', () => {
      const action = JobActions.addJobNote({ 
        jobId: mockJob.id, 
        note: 'Test note' 
      });
      const state = jobReducer(stateWithJob, action);

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should add note to job on addJobNoteSuccess', () => {
      const action = JobActions.addJobNoteSuccess({ 
        jobId: mockJob.id, 
        note: mockNote 
      });
      const state = jobReducer(stateWithJob, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.entities[mockJob.id]?.notes.length).toBe(1);
      expect(state.entities[mockJob.id]?.notes[0]).toEqual(mockNote);
    });

    it('should set error on addJobNoteFailure', () => {
      const error = 'Failed to add job note';
      const action = JobActions.addJobNoteFailure({ error });
      const state = jobReducer(stateWithJob, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBe(error);
    });
  });

  describe('Upload Attachment', () => {
    let stateWithJob: any;

    beforeEach(() => {
      stateWithJob = jobAdapter.addOne(mockJob, initialState);
    });

    it('should set loading to true on uploadAttachment', () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const action = JobActions.uploadAttachment({ 
        jobId: mockJob.id, 
        file 
      });
      const state = jobReducer(stateWithJob, action);

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should add attachment to job on uploadAttachmentSuccess', () => {
      const action = JobActions.uploadAttachmentSuccess({ 
        jobId: mockJob.id, 
        attachment: mockAttachment 
      });
      const state = jobReducer(stateWithJob, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.entities[mockJob.id]?.attachments.length).toBe(1);
      expect(state.entities[mockJob.id]?.attachments[0]).toEqual(mockAttachment);
    });

    it('should set error on uploadAttachmentFailure', () => {
      const error = 'Failed to upload attachment';
      const action = JobActions.uploadAttachmentFailure({ error });
      const state = jobReducer(stateWithJob, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBe(error);
    });
  });

  describe('Batch Update Status', () => {
    let stateWithJobs: any;

    beforeEach(() => {
      const job1 = { ...mockJob, id: 'job-1' };
      const job2 = { ...mockJob, id: 'job-2' };
      stateWithJobs = jobAdapter.addMany([job1, job2], initialState);
    });

    it('should set loading to true on batchUpdateStatus', () => {
      const action = JobActions.batchUpdateStatus({ 
        jobIds: ['job-1', 'job-2'], 
        status: JobStatus.Completed 
      });
      const state = jobReducer(stateWithJobs, action);

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should set loading to false on batchUpdateStatusSuccess', () => {
      const results: JobActions.BatchOperationResult[] = [
        { jobId: 'job-1', success: true },
        { jobId: 'job-2', success: true }
      ];
      const action = JobActions.batchUpdateStatusSuccess({ results });
      const state = jobReducer(stateWithJobs, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should set error on batchUpdateStatusFailure', () => {
      const error = 'Failed to batch update status';
      const action = JobActions.batchUpdateStatusFailure({ error });
      const state = jobReducer(stateWithJobs, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBe(error);
    });
  });

  describe('Batch Reassign', () => {
    let stateWithJobs: any;

    beforeEach(() => {
      const job1 = { ...mockJob, id: 'job-1' };
      const job2 = { ...mockJob, id: 'job-2' };
      stateWithJobs = jobAdapter.addMany([job1, job2], initialState);
    });

    it('should set loading to true on batchReassign', () => {
      const action = JobActions.batchReassign({ 
        jobIds: ['job-1', 'job-2'], 
        technicianId: 'tech-123' 
      });
      const state = jobReducer(stateWithJobs, action);

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should set loading to false on batchReassignSuccess', () => {
      const results: JobActions.BatchOperationResult[] = [
        { jobId: 'job-1', success: true },
        { jobId: 'job-2', success: true }
      ];
      const action = JobActions.batchReassignSuccess({ results });
      const state = jobReducer(stateWithJobs, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should set error on batchReassignFailure', () => {
      const error = 'Failed to batch reassign jobs';
      const action = JobActions.batchReassignFailure({ error });
      const state = jobReducer(stateWithJobs, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBe(error);
    });
  });

  describe('Batch Delete', () => {
    let stateWithJobs: any;

    beforeEach(() => {
      const job1 = { ...mockJob, id: 'job-1' };
      const job2 = { ...mockJob, id: 'job-2' };
      const job3 = { ...mockJob, id: 'job-3' };
      stateWithJobs = jobAdapter.addMany([job1, job2, job3], initialState);
    });

    it('should set loading to true on batchDelete', () => {
      const action = JobActions.batchDelete({ 
        jobIds: ['job-1', 'job-2'] 
      });
      const state = jobReducer(stateWithJobs, action);

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should remove successful deletions on batchDeleteSuccess', () => {
      const results: JobActions.BatchOperationResult[] = [
        { jobId: 'job-1', success: true },
        { jobId: 'job-2', success: true },
        { jobId: 'job-3', success: false, error: 'Permission denied' }
      ];
      const action = JobActions.batchDeleteSuccess({ results });
      const state = jobReducer(stateWithJobs, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.ids.length).toBe(1);
      expect(state.entities['job-1']).toBeUndefined();
      expect(state.entities['job-2']).toBeUndefined();
      expect(state.entities['job-3']).toBeDefined();
    });

    it('should clear selectedId if deleted job was selected', () => {
      const stateWithSelection = { ...stateWithJobs, selectedId: 'job-1' };
      const results: JobActions.BatchOperationResult[] = [
        { jobId: 'job-1', success: true }
      ];
      const action = JobActions.batchDeleteSuccess({ results });
      const state = jobReducer(stateWithSelection, action);

      expect(state.selectedId).toBeNull();
    });

    it('should set error on batchDeleteFailure', () => {
      const error = 'Failed to batch delete jobs';
      const action = JobActions.batchDeleteFailure({ error });
      const state = jobReducer(stateWithJobs, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBe(error);
    });
  });

  describe('Entity Adapter', () => {
    it('should sort jobs by scheduledStart date', () => {
      const job1: Job = { ...mockJob, id: '1', scheduledStart: new Date('2024-02-03') };
      const job2: Job = { ...mockJob, id: '2', scheduledStart: new Date('2024-02-01') };
      const job3: Job = { ...mockJob, id: '3', scheduledStart: new Date('2024-02-02') };

      const action = JobActions.loadJobsSuccess({ 
        jobs: [job1, job3, job2] 
      });
      const state = jobReducer(initialState, action);

      // Should be sorted by scheduledStart: job2, job3, job1
      expect(state.ids[0]).toBe('2');
      expect(state.ids[1]).toBe('3');
      expect(state.ids[2]).toBe('1');
    });
  });
});
