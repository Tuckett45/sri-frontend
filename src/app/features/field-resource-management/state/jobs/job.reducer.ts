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
  sortComparer: (a: Job, b: Job) => {
    // Sort by priority first (P1 > P2 > Normal), then by scheduled start date
    const priorityOrder = { P1: 0, P2: 1, Normal: 2 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    return new Date(a.scheduledStartDate).getTime() - new Date(b.scheduledStartDate).getTime();
  }
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

  // Select Job
  on(JobActions.selectJob, (state, { id }) => ({
    ...state,
    selectedId: id
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

  // Add Job Note
  on(JobActions.addJobNote, (state) => ({
    ...state,
    error: null
  })),

  on(JobActions.addJobNoteSuccess, (state, { jobId, note }) => {
    const job = state.entities[jobId];
    if (!job) {
      return state;
    }
    return jobAdapter.updateOne(
      {
        id: jobId,
        changes: {
          notes: [...job.notes, note],
          updatedAt: new Date()
        }
      },
      {
        ...state,
        error: null
      }
    );
  }),

  on(JobActions.addJobNoteFailure, (state, { error }) => ({
    ...state,
    error
  })),

  // Upload Attachment
  on(JobActions.uploadAttachment, (state) => ({
    ...state,
    error: null
  })),

  on(JobActions.uploadAttachmentSuccess, (state, { jobId, attachment }) => {
    const job = state.entities[jobId];
    if (!job) {
      return state;
    }
    return jobAdapter.updateOne(
      {
        id: jobId,
        changes: {
          attachments: [...job.attachments, attachment],
          updatedAt: new Date()
        }
      },
      {
        ...state,
        error: null
      }
    );
  }),

  on(JobActions.uploadAttachmentFailure, (state, { error }) => ({
    ...state,
    error
  })),

  // Load Job Attachments
  on(JobActions.loadJobAttachmentsSuccess, (state, { jobId, attachments }) => {
    const job = state.entities[jobId];
    if (!job) {
      return state;
    }
    return jobAdapter.updateOne(
      {
        id: jobId,
        changes: { attachments }
      },
      {
        ...state,
        error: null
      }
    );
  }),

  on(JobActions.loadJobAttachmentsFailure, (state, { error }) => ({
    ...state,
    error
  })),

  // Load Job Notes
  on(JobActions.loadJobNotesSuccess, (state, { jobId, notes }) => {
    const job = state.entities[jobId];
    if (!job) {
      return state;
    }
    return jobAdapter.updateOne(
      {
        id: jobId,
        changes: { notes }
      },
      {
        ...state,
        error: null
      }
    );
  }),

  on(JobActions.loadJobNotesFailure, (state, { error }) => ({
    ...state,
    error
  })),

  // Batch Update Status
  on(JobActions.batchUpdateStatus, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(JobActions.batchUpdateStatusSuccess, (state, { results }) => {
    const successfulIds = results.filter(r => r.success).map(r => r.jobId);
    const updates = successfulIds.map(id => ({
      id,
      changes: { updatedAt: new Date() }
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

  on(JobActions.batchReassignSuccess, (state, { results }) => {
    const successfulIds = results.filter(r => r.success).map(r => r.jobId);
    const updates = successfulIds.map(id => ({
      id,
      changes: { updatedAt: new Date() }
    }));
    return jobAdapter.updateMany(updates, {
      ...state,
      loading: false,
      error: null
    });
  }),

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
    const successfulIds = results.filter(r => r.success).map(r => r.jobId);
    return jobAdapter.removeMany(successfulIds, {
      ...state,
      loading: false,
      error: null
    });
  }),

  on(JobActions.batchDeleteFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Optimistic Update Handlers
  on(JobActions.updateJobOptimistic, (state, { id, changes }) =>
    jobAdapter.updateOne(
      { id, changes },
      {
        ...state,
        error: null
      }
    )
  ),

  on(JobActions.rollbackJobUpdate, (state, { id, originalData }) =>
    jobAdapter.updateOne(
      { id, changes: originalData },
      {
        ...state,
        error: 'Update failed - changes reverted'
      }
    )
  ),

  on(JobActions.updateJobStatusOptimistic, (state, { id, status, reason }) =>
    jobAdapter.updateOne(
      { id, changes: { status, updatedAt: new Date() } },
      {
        ...state,
        error: null
      }
    )
  ),

  on(JobActions.rollbackJobStatusUpdate, (state, { id, originalData }) =>
    jobAdapter.updateOne(
      { id, changes: originalData },
      {
        ...state,
        error: 'Status update failed - changes reverted'
      }
    )
  ),

  on(JobActions.deleteJobOptimistic, (state, { id }) =>
    jobAdapter.removeOne(id, {
      ...state,
      error: null
    })
  ),

  on(JobActions.rollbackJobDelete, (state, { originalData }) =>
    jobAdapter.addOne(originalData, {
      ...state,
      error: 'Delete failed - changes reverted'
    })
  )
);
