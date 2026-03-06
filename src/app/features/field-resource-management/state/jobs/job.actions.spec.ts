/**
 * Unit tests for Job Actions
 */

import * as JobActions from './job.actions';
import { Job, JobStatus, Priority, JobNote, Attachment } from '../../models/job.model';
import { JobFilters } from '../../models/dtos/filters.dto';
import { CreateJobDto, UpdateJobDto } from '../../models/dtos/job.dto';

describe('Job Actions', () => {
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

  const mockFilters: JobFilters = {
    region: 'TX',
    status: JobStatus.EnRoute,
    priority: Priority.P1
  };

  const mockCreateDto: CreateJobDto = {    siteName: 'Cable Repair',
    scopeDescription: 'Repair damaged cables',
    status: JobStatus.NotStarted,
    priority: Priority.P2,
    region: 'TX',
    company: 'Company A',
    location: {
      address: '456 Oak Ave',
      city: 'Austin',
      state: 'TX',
      zipCode: '78701',
      coordinates: { latitude: 30.2672, longitude: -97.7431, accuracy: 10 }
    },
    scheduledStartDate: new Date('2024-02-02T08:00:00'),
    scheduledEnd: new Date('2024-02-02T17:00:00'),
    requiredSkills: [],
    estimatedHours: 6
  };

  const mockUpdateDto: UpdateJobDto = {
    siteName: 'Updated Title',
    scopeDescription: 'Updated description'
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

  describe('Load Jobs Actions', () => {
    it('should create loadJobs action', () => {
      const action = JobActions.loadJobs({ filters: mockFilters });
      expect(action.type).toBe('[Job] Load Jobs');
      expect(action.filters).toEqual(mockFilters);
    });

    it('should create loadJobs action without filters', () => {
      const action = JobActions.loadJobs({});
      expect(action.type).toBe('[Job] Load Jobs');
      expect(action.filters).toBeUndefined();
    });

    it('should create loadJobsSuccess action', () => {
      const jobs = [mockJob];
      const action = JobActions.loadJobsSuccess({ jobs });
      expect(action.type).toBe('[Job] Load Jobs Success');
      expect(action.jobs).toEqual(jobs);
    });

    it('should create loadJobsFailure action', () => {
      const error = 'Failed to load jobs';
      const action = JobActions.loadJobsFailure({ error });
      expect(action.type).toBe('[Job] Load Jobs Failure');
      expect(action.error).toBe(error);
    });
  });

  describe('Create Job Actions', () => {
    it('should create createJob action', () => {
      const action = JobActions.createJob({ job: mockCreateDto });
      expect(action.type).toBe('[Job] Create Job');
      expect(action.job).toEqual(mockCreateDto);
    });

    it('should create createJobSuccess action', () => {
      const action = JobActions.createJobSuccess({ job: mockJob });
      expect(action.type).toBe('[Job] Create Job Success');
      expect(action.job).toEqual(mockJob);
    });

    it('should create createJobFailure action', () => {
      const error = 'Failed to create job';
      const action = JobActions.createJobFailure({ error });
      expect(action.type).toBe('[Job] Create Job Failure');
      expect(action.error).toBe(error);
    });
  });

  describe('Update Job Actions', () => {
    it('should create updateJob action', () => {
      const action = JobActions.updateJob({ 
        id: mockJob.id, 
        job: mockUpdateDto 
      });
      expect(action.type).toBe('[Job] Update Job');
      expect(action.id).toBe(mockJob.id);
      expect(action.job).toEqual(mockUpdateDto);
    });

    it('should create updateJobSuccess action', () => {
      const action = JobActions.updateJobSuccess({ job: mockJob });
      expect(action.type).toBe('[Job] Update Job Success');
      expect(action.job).toEqual(mockJob);
    });

    it('should create updateJobFailure action', () => {
      const error = 'Failed to update job';
      const action = JobActions.updateJobFailure({ error });
      expect(action.type).toBe('[Job] Update Job Failure');
      expect(action.error).toBe(error);
    });
  });

  describe('Delete Job Actions', () => {
    it('should create deleteJob action', () => {
      const action = JobActions.deleteJob({ id: mockJob.id });
      expect(action.type).toBe('[Job] Delete Job');
      expect(action.id).toBe(mockJob.id);
    });

    it('should create deleteJobSuccess action', () => {
      const action = JobActions.deleteJobSuccess({ id: mockJob.id });
      expect(action.type).toBe('[Job] Delete Job Success');
      expect(action.id).toBe(mockJob.id);
    });

    it('should create deleteJobFailure action', () => {
      const error = 'Failed to delete job';
      const action = JobActions.deleteJobFailure({ error });
      expect(action.type).toBe('[Job] Delete Job Failure');
      expect(action.error).toBe(error);
    });
  });

  describe('Select Job Actions', () => {
    it('should create selectJob action with id', () => {
      const action = JobActions.selectJob({ id: mockJob.id });
      expect(action.type).toBe('[Job] Select Job');
      expect(action.id).toBe(mockJob.id);
    });

    it('should create selectJob action with null', () => {
      const action = JobActions.selectJob({ id: null });
      expect(action.type).toBe('[Job] Select Job');
      expect(action.id).toBeNull();
    });
  });

  describe('Filter Actions', () => {
    it('should create setJobFilters action', () => {
      const action = JobActions.setJobFilters({ filters: mockFilters });
      expect(action.type).toBe('[Job] Set Filters');
      expect(action.filters).toEqual(mockFilters);
    });

    it('should create clearJobFilters action', () => {
      const action = JobActions.clearJobFilters();
      expect(action.type).toBe('[Job] Clear Filters');
    });
  });

  describe('Update Job Status Actions', () => {
    it('should create updateJobStatus action', () => {
      const action = JobActions.updateJobStatus({ 
        id: mockJob.id, 
        status: JobStatus.OnSite,
        reason: 'Work started'
      });
      expect(action.type).toBe('[Job] Update Job Status');
      expect(action.id).toBe(mockJob.id);
      expect(action.status).toBe(JobStatus.OnSite);
      expect(action.reason).toBe('Work started');
    });

    it('should create updateJobStatus action without reason', () => {
      const action = JobActions.updateJobStatus({ 
        id: mockJob.id, 
        status: JobStatus.Completed
      });
      expect(action.type).toBe('[Job] Update Job Status');
      expect(action.id).toBe(mockJob.id);
      expect(action.status).toBe(JobStatus.Completed);
      expect(action.reason).toBeUndefined();
    });

    it('should create updateJobStatusSuccess action', () => {
      const action = JobActions.updateJobStatusSuccess({ job: mockJob });
      expect(action.type).toBe('[Job] Update Job Status Success');
      expect(action.job).toEqual(mockJob);
    });

    it('should create updateJobStatusFailure action', () => {
      const error = 'Failed to update job status';
      const action = JobActions.updateJobStatusFailure({ error });
      expect(action.type).toBe('[Job] Update Job Status Failure');
      expect(action.error).toBe(error);
    });
  });

  describe('Add Job Note Actions', () => {
    it('should create addJobNote action', () => {
      const action = JobActions.addJobNote({ 
        jobId: mockJob.id, 
        note: 'Test note' 
      });
      expect(action.type).toBe('[Job] Add Job Note');
      expect(action.jobId).toBe(mockJob.id);
      expect(action.note).toBe('Test note');
    });

    it('should create addJobNoteSuccess action', () => {
      const action = JobActions.addJobNoteSuccess({ 
        jobId: mockJob.id, 
        note: mockNote 
      });
      expect(action.type).toBe('[Job] Add Job Note Success');
      expect(action.jobId).toBe(mockJob.id);
      expect(action.note).toEqual(mockNote);
    });

    it('should create addJobNoteFailure action', () => {
      const error = 'Failed to add job note';
      const action = JobActions.addJobNoteFailure({ error });
      expect(action.type).toBe('[Job] Add Job Note Failure');
      expect(action.error).toBe(error);
    });
  });

  describe('Upload Attachment Actions', () => {
    it('should create uploadAttachment action', () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const action = JobActions.uploadAttachment({ 
        jobId: mockJob.id, 
        file 
      });
      expect(action.type).toBe('[Job] Upload Attachment');
      expect(action.jobId).toBe(mockJob.id);
      expect(action.file).toBe(file);
    });

    it('should create uploadAttachmentSuccess action', () => {
      const action = JobActions.uploadAttachmentSuccess({ 
        jobId: mockJob.id, 
        attachment: mockAttachment 
      });
      expect(action.type).toBe('[Job] Upload Attachment Success');
      expect(action.jobId).toBe(mockJob.id);
      expect(action.attachment).toEqual(mockAttachment);
    });

    it('should create uploadAttachmentFailure action', () => {
      const error = 'Failed to upload attachment';
      const action = JobActions.uploadAttachmentFailure({ error });
      expect(action.type).toBe('[Job] Upload Attachment Failure');
      expect(action.error).toBe(error);
    });
  });

  describe('Batch Update Status Actions', () => {
    it('should create batchUpdateStatus action', () => {
      const jobIds = ['job-1', 'job-2', 'job-3'];
      const action = JobActions.batchUpdateStatus({ 
        jobIds, 
        status: JobStatus.Completed,
        reason: 'Batch completion'
      });
      expect(action.type).toBe('[Job] Batch Update Status');
      expect(action.jobIds).toEqual(jobIds);
      expect(action.status).toBe(JobStatus.Completed);
      expect(action.reason).toBe('Batch completion');
    });

    it('should create batchUpdateStatus action without reason', () => {
      const jobIds = ['job-1', 'job-2'];
      const action = JobActions.batchUpdateStatus({ 
        jobIds, 
        status: JobStatus.Issue
      });
      expect(action.type).toBe('[Job] Batch Update Status');
      expect(action.jobIds).toEqual(jobIds);
      expect(action.status).toBe(JobStatus.Issue);
      expect(action.reason).toBeUndefined();
    });

    it('should create batchUpdateStatusSuccess action', () => {
      const results: JobActions.BatchOperationResult[] = [
        { jobId: 'job-1', success: true },
        { jobId: 'job-2', success: false, error: 'Failed' }
      ];
      const action = JobActions.batchUpdateStatusSuccess({ results });
      expect(action.type).toBe('[Job] Batch Update Status Success');
      expect(action.results).toEqual(results);
    });

    it('should create batchUpdateStatusFailure action', () => {
      const error = 'Failed to batch update status';
      const action = JobActions.batchUpdateStatusFailure({ error });
      expect(action.type).toBe('[Job] Batch Update Status Failure');
      expect(action.error).toBe(error);
    });
  });

  describe('Batch Reassign Actions', () => {
    it('should create batchReassign action', () => {
      const jobIds = ['job-1', 'job-2', 'job-3'];
      const technicianId = 'tech-123';
      const action = JobActions.batchReassign({ jobIds, technicianId });
      expect(action.type).toBe('[Job] Batch Reassign');
      expect(action.jobIds).toEqual(jobIds);
      expect(action.technicianId).toBe(technicianId);
    });

    it('should create batchReassignSuccess action', () => {
      const results: JobActions.BatchOperationResult[] = [
        { jobId: 'job-1', success: true },
        { jobId: 'job-2', success: true }
      ];
      const action = JobActions.batchReassignSuccess({ results });
      expect(action.type).toBe('[Job] Batch Reassign Success');
      expect(action.results).toEqual(results);
    });

    it('should create batchReassignFailure action', () => {
      const error = 'Failed to batch reassign jobs';
      const action = JobActions.batchReassignFailure({ error });
      expect(action.type).toBe('[Job] Batch Reassign Failure');
      expect(action.error).toBe(error);
    });
  });

  describe('Batch Delete Actions', () => {
    it('should create batchDelete action', () => {
      const jobIds = ['job-1', 'job-2', 'job-3'];
      const action = JobActions.batchDelete({ jobIds });
      expect(action.type).toBe('[Job] Batch Delete');
      expect(action.jobIds).toEqual(jobIds);
    });

    it('should create batchDeleteSuccess action', () => {
      const results: JobActions.BatchOperationResult[] = [
        { jobId: 'job-1', success: true },
        { jobId: 'job-2', success: true },
        { jobId: 'job-3', success: false, error: 'Permission denied' }
      ];
      const action = JobActions.batchDeleteSuccess({ results });
      expect(action.type).toBe('[Job] Batch Delete Success');
      expect(action.results).toEqual(results);
    });

    it('should create batchDeleteFailure action', () => {
      const error = 'Failed to batch delete jobs';
      const action = JobActions.batchDeleteFailure({ error });
      expect(action.type).toBe('[Job] Batch Delete Failure');
      expect(action.error).toBe(error);
    });
  });
});
