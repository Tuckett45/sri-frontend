/**
 * Job Reducer
 * Manages job state updates using EntityAdapter for normalized state
 */

import { createReducer, on } from '@ngrx/store';
import { EntityAdapter, createEntityAdapter } from '@ngrx/entity';
import { Job, JobStatus, JobType, Priority } from '../../models/job.model';
import { JobState } from './job.state';
import * as JobActions from './job.actions';

// Entity adapter for normalized state management
export const jobAdapter: EntityAdapter<Job> = createEntityAdapter<Job>({
  selectId: (job: Job) => job.id,
  sortComparer: (a: Job, b: Job) => 
    new Date(b.scheduledStartDate).getTime() - new Date(a.scheduledStartDate).getTime()
});

// Dummy jobs for testing
const dummyJobs: Job[] = [
  {
    id: 'job-001',
    jobId: 'JOB-2024-001',
    client: 'Acme Corporation',
    siteName: 'Downtown Office',
    siteAddress: {
      street: '123 Main St',
      city: 'Seattle',
      state: 'WA',
      zipCode: '98101',
      latitude: 47.6062,
      longitude: -122.3321
    },
    jobType: JobType.Install,
    priority: Priority.P1,
    status: JobStatus.NotStarted,
    scopeDescription: 'Install new fiber optic cables and network equipment',
    requiredSkills: [
      { id: 'skill-1', name: 'Fiber Optics', category: 'Installation' },
      { id: 'skill-2', name: 'Network Installation', category: 'Installation' }
    ],
    requiredCrewSize: 2,
    estimatedLaborHours: 8,
    scheduledStartDate: new Date(),
    scheduledEndDate: new Date(Date.now() + 86400000), // Tomorrow
    attachments: [],
    notes: [],
    createdBy: 'admin',
    createdAt: new Date(Date.now() - 172800000), // 2 days ago
    updatedAt: new Date()
  },
  {
    id: 'job-002',
    jobId: 'JOB-2024-002',
    client: 'TechStart Inc',
    siteName: 'Warehouse Facility',
    siteAddress: {
      street: '456 Industrial Blvd',
      city: 'Bellevue',
      state: 'WA',
      zipCode: '98004',
      latitude: 47.6101,
      longitude: -122.2015
    },
    jobType: JobType.PM,
    priority: Priority.Normal,
    status: JobStatus.NotStarted,
    scopeDescription: 'Preventive maintenance on existing network infrastructure',
    requiredSkills: [
      { id: 'skill-3', name: 'Network Maintenance', category: 'Maintenance' },
      { id: 'skill-4', name: 'Testing', category: 'Quality Assurance' }
    ],
    requiredCrewSize: 1,
    estimatedLaborHours: 4,
    scheduledStartDate: new Date(Date.now() + 86400000), // Tomorrow
    scheduledEndDate: new Date(Date.now() + 172800000), // 2 days from now
    attachments: [],
    notes: [],
    createdBy: 'admin',
    createdAt: new Date(Date.now() - 86400000), // Yesterday
    updatedAt: new Date()
  },
  {
    id: 'job-003',
    jobId: 'JOB-2024-003',
    client: 'Global Enterprises',
    siteName: 'Corporate Campus',
    siteAddress: {
      street: '789 Tech Drive',
      city: 'Redmond',
      state: 'WA',
      zipCode: '98052',
      latitude: 47.6740,
      longitude: -122.1215
    },
    jobType: JobType.SiteSurvey,
    priority: Priority.P2,
    status: JobStatus.NotStarted,
    scopeDescription: 'Site survey for upcoming network expansion project',
    requiredSkills: [
      { id: 'skill-5', name: 'Site Survey', category: 'Planning' },
      { id: 'skill-6', name: 'Documentation', category: 'Administration' }
    ],
    requiredCrewSize: 1,
    estimatedLaborHours: 3,
    scheduledStartDate: new Date(Date.now() + 172800000), // 2 days from now
    scheduledEndDate: new Date(Date.now() + 259200000), // 3 days from now
    attachments: [],
    notes: [],
    createdBy: 'admin',
    createdAt: new Date(Date.now() - 43200000), // 12 hours ago
    updatedAt: new Date()
  },
  {
    id: 'job-004',
    jobId: 'JOB-2024-004',
    client: 'Metro Services',
    siteName: 'City Hall',
    siteAddress: {
      street: '321 Government Way',
      city: 'Seattle',
      state: 'WA',
      zipCode: '98104',
      latitude: 47.6038,
      longitude: -122.3301
    },
    jobType: JobType.Decom,
    priority: Priority.Normal,
    status: JobStatus.NotStarted,
    scopeDescription: 'Decommission old network equipment and remove cabling',
    requiredSkills: [
      { id: 'skill-7', name: 'Decommissioning', category: 'Removal' },
      { id: 'skill-8', name: 'Cable Management', category: 'Installation' }
    ],
    requiredCrewSize: 2,
    estimatedLaborHours: 6,
    scheduledStartDate: new Date(Date.now() + 259200000), // 3 days from now
    scheduledEndDate: new Date(Date.now() + 345600000), // 4 days from now
    attachments: [],
    notes: [],
    createdBy: 'admin',
    createdAt: new Date(Date.now() - 21600000), // 6 hours ago
    updatedAt: new Date()
  },
  {
    id: 'job-005',
    jobId: 'JOB-2024-005',
    client: 'Retail Solutions',
    siteName: 'Store #42',
    siteAddress: {
      street: '555 Shopping Center',
      city: 'Tacoma',
      state: 'WA',
      zipCode: '98402',
      latitude: 47.2529,
      longitude: -122.4443
    },
    jobType: JobType.Install,
    priority: Priority.P1,
    status: JobStatus.NotStarted,
    scopeDescription: 'Install point-of-sale network infrastructure',
    requiredSkills: [
      { id: 'skill-2', name: 'Network Installation', category: 'Installation' },
      { id: 'skill-9', name: 'POS Systems', category: 'Specialized' }
    ],
    requiredCrewSize: 2,
    estimatedLaborHours: 5,
    scheduledStartDate: new Date(),
    scheduledEndDate: new Date(Date.now() + 86400000), // Tomorrow
    attachments: [],
    notes: [],
    createdBy: 'admin',
    createdAt: new Date(Date.now() - 7200000), // 2 hours ago
    updatedAt: new Date()
  }
];

// Initial state with dummy jobs
export const initialState: JobState = jobAdapter.getInitialState({
  selectedId: null,
  loading: false,
  error: null,
  filters: {}
});

// Add dummy jobs to initial state
const stateWithDummyJobs = jobAdapter.addMany(dummyJobs, initialState);

// Reducer
export const jobReducer = createReducer(
  stateWithDummyJobs,

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
