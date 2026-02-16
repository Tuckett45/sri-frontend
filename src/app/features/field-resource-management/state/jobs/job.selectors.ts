/**
 * Job Selectors
 * Provides memoized selectors for accessing job state
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { JobState } from './job.state';
import { jobAdapter } from './job.reducer';
import { JobStatus } from '../../models/job.model';

// Feature selector
export const selectJobState = createFeatureSelector<JobState>('jobs');

// Entity adapter selectors
const {
  selectIds,
  selectEntities,
  selectAll,
  selectTotal
} = jobAdapter.getSelectors();

// Select all jobs
export const selectAllJobs = createSelector(
  selectJobState,
  selectAll
);

// Select job entities
export const selectJobEntities = createSelector(
  selectJobState,
  selectEntities
);

// Select job by ID
export const selectJobById = (id: string) => createSelector(
  selectJobEntities,
  (entities) => entities[id]
);

// Select selected job ID
export const selectSelectedJobId = createSelector(
  selectJobState,
  (state) => state.selectedId
);

// Select selected job
export const selectSelectedJob = createSelector(
  selectJobEntities,
  selectSelectedJobId,
  (entities, selectedId) => selectedId ? entities[selectedId] : null
);

// Select loading state
export const selectJobsLoading = createSelector(
  selectJobState,
  (state) => state.loading
);

// Select error state
export const selectJobsError = createSelector(
  selectJobState,
  (state) => state.error
);

// Select filters
export const selectJobFilters = createSelector(
  selectJobState,
  (state) => state.filters
);

// Select total count
export const selectJobsTotal = createSelector(
  selectJobState,
  selectTotal
);

// Select filtered jobs
export const selectFilteredJobs = createSelector(
  selectAllJobs,
  selectJobFilters,
  (jobs, filters) => {
    let filtered = jobs;

    // Filter by search term
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(job =>
        job.jobId.toLowerCase().includes(searchLower) ||
        job.client.toLowerCase().includes(searchLower) ||
        job.siteName.toLowerCase().includes(searchLower) ||
        job.siteAddress.street.toLowerCase().includes(searchLower) ||
        job.siteAddress.city.toLowerCase().includes(searchLower)
      );
    }

    // Filter by status
    if (filters.status) {
      filtered = filtered.filter(job => job.status === filters.status);
    }

    // Filter by priority
    if (filters.priority) {
      filtered = filtered.filter(job => job.priority === filters.priority);
    }

    // Filter by job type
    if (filters.jobType) {
      filtered = filtered.filter(job => job.jobType === filters.jobType);
    }

    // Filter by client
    if (filters.client) {
      filtered = filtered.filter(job => job.client === filters.client);
    }

    // Filter by date range
    if (filters.dateRange) {
      const startDate = new Date(filters.dateRange.startDate);
      const endDate = new Date(filters.dateRange.endDate);
      filtered = filtered.filter(job => {
        const jobDate = new Date(job.scheduledStartDate);
        return jobDate >= startDate && jobDate <= endDate;
      });
    }

    // Filter by region
    if (filters.region) {
      filtered = filtered.filter(job => 
        job.siteAddress.state === filters.region || 
        job.siteAddress.city === filters.region
      );
    }

    return filtered;
  }
);

// Select jobs by technician
export const selectJobsByTechnician = (technicianId: string) => createSelector(
  selectAllJobs,
  (jobs) => jobs.filter(job => 
    // Note: This assumes assignments are embedded in the job
    // In a real implementation, this might need to join with assignment state
    true // Placeholder - will be properly implemented when assignments are available
  )
);

// Select jobs by status
export const selectJobsByStatus = (status: JobStatus) => createSelector(
  selectAllJobs,
  (jobs) => jobs.filter(job => job.status === status)
);

// Select active jobs (not completed or cancelled)
export const selectActiveJobs = createSelector(
  selectAllJobs,
  (jobs) => jobs.filter(job => 
    job.status !== JobStatus.Completed && 
    job.status !== JobStatus.Cancelled
  )
);

// Select completed jobs
export const selectCompletedJobs = createSelector(
  selectAllJobs,
  (jobs) => jobs.filter(job => job.status === JobStatus.Completed)
);

// Select jobs requiring attention (Issue status)
export const selectJobsRequiringAttention = createSelector(
  selectAllJobs,
  (jobs) => jobs.filter(job => job.status === JobStatus.Issue)
);

// Select jobs by priority
export const selectJobsByPriority = (priority: string) => createSelector(
  selectAllJobs,
  (jobs) => jobs.filter(job => job.priority === priority)
);

// Select overdue jobs
export const selectOverdueJobs = createSelector(
  selectAllJobs,
  (jobs) => {
    const now = new Date();
    return jobs.filter(job => 
      job.status !== JobStatus.Completed &&
      job.status !== JobStatus.Cancelled &&
      new Date(job.scheduledEndDate) < now
    );
  }
);

// Select today's jobs
export const selectTodaysJobs = createSelector(
  selectAllJobs,
  (jobs) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return jobs.filter(job => {
      const jobDate = new Date(job.scheduledStartDate);
      return jobDate >= today && jobDate < tomorrow;
    });
  }
);

// Select jobs by date range
export const selectJobsByDateRange = (startDate: Date, endDate: Date) => createSelector(
  selectAllJobs,
  (jobs) => jobs.filter(job => {
    const jobDate = new Date(job.scheduledStartDate);
    return jobDate >= startDate && jobDate <= endDate;
  })
);
