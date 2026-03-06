/**
 * Job Actions
 * Defines all actions for job state management
 */

import { createAction, props } from '@ngrx/store';
import { Job, JobStatus, JobNote, Attachment } from '../../models/job.model';
import { JobFilters } from '../../models/dtos/filters.dto';
import { CreateJobDto, UpdateJobDto } from '../../models/dtos/job.dto';

// Load Jobs
export const loadJobs = createAction(
  '[Job] Load Jobs',
  props<{ filters?: JobFilters }>()
);

export const loadJobsSuccess = createAction(
  '[Job] Load Jobs Success',
  props<{ jobs: Job[] }>()
);

export const loadJobsFailure = createAction(
  '[Job] Load Jobs Failure',
  props<{ error: string }>()
);

// Create Job
export const createJob = createAction(
  '[Job] Create Job',
  props<{ job: CreateJobDto }>()
);

export const createJobSuccess = createAction(
  '[Job] Create Job Success',
  props<{ job: Job }>()
);

export const createJobFailure = createAction(
  '[Job] Create Job Failure',
  props<{ error: string }>()
);

// Update Job
export const updateJob = createAction(
  '[Job] Update Job',
  props<{ id: string; job: UpdateJobDto }>()
);

export const updateJobSuccess = createAction(
  '[Job] Update Job Success',
  props<{ job: Job }>()
);

export const updateJobFailure = createAction(
  '[Job] Update Job Failure',
  props<{ error: string }>()
);

// Delete Job
export const deleteJob = createAction(
  '[Job] Delete Job',
  props<{ id: string }>()
);

export const deleteJobSuccess = createAction(
  '[Job] Delete Job Success',
  props<{ id: string }>()
);

export const deleteJobFailure = createAction(
  '[Job] Delete Job Failure',
  props<{ error: string }>()
);

// Select Job
export const selectJob = createAction(
  '[Job] Select Job',
  props<{ id: string | null }>()
);

// Set Filters
export const setJobFilters = createAction(
  '[Job] Set Filters',
  props<{ filters: JobFilters }>()
);

// Clear Filters
export const clearJobFilters = createAction(
  '[Job] Clear Filters'
);

// Update Job Status
export const updateJobStatus = createAction(
  '[Job] Update Job Status',
  props<{ id: string; status: JobStatus; reason?: string }>()
);

export const updateJobStatusSuccess = createAction(
  '[Job] Update Job Status Success',
  props<{ job: Job }>()
);

export const updateJobStatusFailure = createAction(
  '[Job] Update Job Status Failure',
  props<{ error: string }>()
);

// Add Job Note
export const addJobNote = createAction(
  '[Job] Add Job Note',
  props<{ jobId: string; note: string }>()
);

export const addJobNoteSuccess = createAction(
  '[Job] Add Job Note Success',
  props<{ jobId: string; note: JobNote }>()
);

export const addJobNoteFailure = createAction(
  '[Job] Add Job Note Failure',
  props<{ error: string }>()
);

// Upload Attachment
export const uploadAttachment = createAction(
  '[Job] Upload Attachment',
  props<{ jobId: string; file: File }>()
);

export const uploadAttachmentSuccess = createAction(
  '[Job] Upload Attachment Success',
  props<{ jobId: string; attachment: Attachment }>()
);

export const uploadAttachmentFailure = createAction(
  '[Job] Upload Attachment Failure',
  props<{ error: string }>()
);

// Batch Operations
export interface BatchOperationResult {
  jobId: string;
  success: boolean;
  error?: string;
}

// Batch Update Status
export const batchUpdateStatus = createAction(
  '[Job] Batch Update Status',
  props<{ jobIds: string[]; status: JobStatus; reason?: string }>()
);

export const batchUpdateStatusSuccess = createAction(
  '[Job] Batch Update Status Success',
  props<{ results: BatchOperationResult[] }>()
);

export const batchUpdateStatusFailure = createAction(
  '[Job] Batch Update Status Failure',
  props<{ error: string }>()
);

// Batch Reassign
export const batchReassign = createAction(
  '[Job] Batch Reassign',
  props<{ jobIds: string[]; technicianId: string }>()
);

export const batchReassignSuccess = createAction(
  '[Job] Batch Reassign Success',
  props<{ results: BatchOperationResult[] }>()
);

export const batchReassignFailure = createAction(
  '[Job] Batch Reassign Failure',
  props<{ error: string }>()
);

// Batch Delete
export const batchDelete = createAction(
  '[Job] Batch Delete',
  props<{ jobIds: string[] }>()
);

export const batchDeleteSuccess = createAction(
  '[Job] Batch Delete Success',
  props<{ results: BatchOperationResult[] }>()
);

export const batchDeleteFailure = createAction(
  '[Job] Batch Delete Failure',
  props<{ error: string }>()
);

// Optimistic Update Actions
export const updateJobOptimistic = createAction(
  '[Job] Update Job Optimistic',
  props<{ id: string; changes: Partial<Job>; originalData: Job }>()
);

export const rollbackJobUpdate = createAction(
  '[Job] Rollback Job Update',
  props<{ id: string; originalData: Job }>()
);

export const updateJobStatusOptimistic = createAction(
  '[Job] Update Job Status Optimistic',
  props<{ id: string; status: JobStatus; reason?: string; originalData: Job }>()
);

export const rollbackJobStatusUpdate = createAction(
  '[Job] Rollback Job Status Update',
  props<{ id: string; originalData: Job }>()
);

export const deleteJobOptimistic = createAction(
  '[Job] Delete Job Optimistic',
  props<{ id: string; originalData: Job }>()
);

export const rollbackJobDelete = createAction(
  '[Job] Rollback Job Delete',
  props<{ originalData: Job }>()
);
