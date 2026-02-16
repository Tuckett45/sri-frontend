/**
 * Job Reducer
 * Manages job state updates using EntityAdapter for normalized state
 */

import { createReducer, on } from '@ngrx/store';
import { EntityAdapter, createEntityAdapter } from '@ngrx/entity';
import { Job } from '../../models/job.model';
import { JobState } from './job.state';
import * as JobActions from './job.actions';

// Entity adapter for normalized state management
export const jobAdapter: EntityAdapter<Job> = createEntityAdapter<Job>({
  selectId: (job: Job) => job.id,
  sortComparer: (a: Job, b: Job) => 
    new Date(b.scheduledStartDate).getTime() - new Date(a.scheduledStartDate).getTime()
});

// Initial state
export const initialState: JobState = jobAdapter.getInitialState({
  selectedId: null,
  loading: false,
  error: null,
  filters: {}
});

// Reducer
export const jobReducer = createReducer(
  initialState,

  // Load Jobs
  on(JobActions.loadJobs, (state, { filters }) => ({
    ...state,
    loading: true,
    error: null,
    filters: filters || state.filters
  })),

  on(JobActions.loadJobsSuccess, (state, { jobs }) =>
    jobAdapter.setAll(jobs, {
      ...state,
      loading: false,
      error: null
    })
  ),

  on(JobActions.loadJobsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Create Job
  on(JobActions.createJob, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(JobActions.createJobSuccess, (state, { job }) =>
    jobAdapter.addOne(job, {
      ...state,
      loading: false,
      error: null
    })
  ),

  on(JobActions.createJobFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Update Job
  on(JobActions.updateJob, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(JobActions.updateJobSuccess, (state, { job }) =>
    jobAdapter.updateOne(
      { id: job.id, changes: job },
      {
        ...state,
        loading: false,
        error: null
      }
    )
  ),

  on(JobActions.updateJobFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Delete Job
  on(JobActions.deleteJob, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(JobActions.deleteJobSuccess, (state, { id }) =>
    jobAdapter.removeOne(id, {
      ...state,
      loading: false,
      error: null,
      selectedId: state.selectedId === id ? null : state.selectedId
    })
  ),

  on(JobActions.deleteJobFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Update Job Status
  on(JobActions.updateJobStatus, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(JobActions.updateJobStatusSuccess, (state, { job }) =>
    jobAdapter.updateOne(
      { id: job.id, changes: job },
      {
        ...state,
        loading: false,
        error: null
      }
    )
  ),

  on(JobActions.updateJobStatusFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Select Job
  on(JobActions.selectJob, (state, { id }) => ({
    ...state,
    selectedId: id
  })),

  // Add Job Note
  on(JobActions.addJobNote, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(JobActions.addJobNoteSuccess, (state, { jobId, note }) => {
    const job = state.entities[jobId];
    if (!job) return state;

    return jobAdapter.updateOne(
      {
        id: jobId,
        changes: {
          notes: [...job.notes, note]
        }
      },
      {
        ...state,
        loading: false,
        error: null
      }
    );
  }),

  on(JobActions.addJobNoteFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Upload Attachment
  on(JobActions.uploadAttachment, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(JobActions.uploadAttachmentSuccess, (state, { jobId, attachment }) => {
    const job = state.entities[jobId];
    if (!job) return state;

    return jobAdapter.updateOne(
      {
        id: jobId,
        changes: {
          attachments: [...job.attachments, attachment]
        }
      },
      {
        ...state,
        loading: false,
        error: null
      }
    );
  }),

  on(JobActions.uploadAttachmentFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Set Filters
  on(JobActions.setJobFilters, (state, { filters }) => ({
    ...state,
    filters
  })),

  // Clear Filters
  on(JobActions.clearJobFilters, (state) => ({
    ...state,
    filters: {}
  })),

  // Batch Update Status
  on(JobActions.batchUpdateStatus, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(JobActions.batchUpdateStatusSuccess, (state, { results }) => {
    // Update jobs that succeeded
    const updates = results
      .filter(r => r.success)
      .map(r => ({
        id: r.jobId,
        changes: { status: state.entities[r.jobId]?.status } // Status already updated by effect
      }));

    return jobAdapter.updateMany(updates, {
      ...state,
      loading: false,
      error: null
    });
  }),

  on(JobActions.batchUpdateStatusFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Batch Reassign
  on(JobActions.batchReassign, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(JobActions.batchReassignSuccess, (state) => ({
    ...state,
    loading: false,
    error: null
  })),

  on(JobActions.batchReassignFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Batch Delete
  on(JobActions.batchDelete, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(JobActions.batchDeleteSuccess, (state, { results }) => {
    // Remove jobs that were successfully deleted
    const idsToRemove = results
      .filter(r => r.success)
      .map(r => r.jobId);

    return jobAdapter.removeMany(idsToRemove, {
      ...state,
      loading: false,
      error: null
    });
  }),

  on(JobActions.batchDeleteFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  }))
);
