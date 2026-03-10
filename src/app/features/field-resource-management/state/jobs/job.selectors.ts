/**
 * Job Selectors
 * Provides memoized selectors for accessing job state
 * 
 * All selectors use createSelector for automatic memoization:
 * - Results are cached based on input selector values
 * - Recomputation only occurs when inputs change
 * - Improves performance by avoiding unnecessary recalculations
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { JobState } from './job.state';
import { jobAdapter } from './job.reducer';
import { Job, JobStatus, Priority } from '../../models/job.model';
import { User } from '../../../../models/user.model';
import { DataScope } from '../../services/data-scope.service';
import { determineScopeType } from '../shared/selector-helpers';

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
        job.scopeDescription.toLowerCase().includes(searchLower)
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

    // Filter by region/market
    if (filters.region) {
      filtered = filtered.filter(job => job.market === filters.region);
    }

    // Filter by date range
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      filtered = filtered.filter(job => 
        new Date(job.scheduledStartDate) >= startDate
      );
    }

    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      filtered = filtered.filter(job => 
        new Date(job.scheduledEndDate) <= endDate
      );
    }

    // Filter by assigned technician (requires assignment data)
    // Note: This would typically be done by joining with assignment state
    // For now, we'll leave this as a placeholder that can be implemented
    // when assignment relationships are available in the selector context
    if (filters.technicianId) {
      // This will be implemented when we have access to assignment data
      // in the selector context (e.g., via a combined selector)
    }

    return filtered;
  }
);

// Select jobs by status
export const selectJobsByStatus = (status: JobStatus) => createSelector(
  selectAllJobs,
  (jobs) => jobs.filter(job => job.status === status)
);

// Select jobs by priority
export const selectJobsByPriority = (priority: Priority) => createSelector(
  selectAllJobs,
  (jobs) => jobs.filter(job => job.priority === priority)
);

// Select jobs by market/region
export const selectJobsByRegion = (region: string) => createSelector(
  selectAllJobs,
  (jobs) => jobs.filter(job => job.market === region)
);

// Select jobs by company
export const selectJobsByCompany = (company: string) => createSelector(
  selectAllJobs,
  (jobs) => jobs.filter(job => job.company === company)
);

// Select jobs by market and company (for PM/Vendor scoping)
export const selectJobsByMarketAndCompany = (market: string, company: string) => createSelector(
  selectAllJobs,
  (jobs) => jobs.filter(job => job.market === market && job.company === company)
);

// Select jobs by client
export const selectJobsByClient = (client: string) => createSelector(
  selectAllJobs,
  (jobs) => jobs.filter(job => job.client === client)
);

// Select not started jobs
export const selectNotStartedJobs = createSelector(
  selectAllJobs,
  (jobs) => jobs.filter(job => job.status === JobStatus.NotStarted)
);

// Select en route jobs
export const selectEnRouteJobs = createSelector(
  selectAllJobs,
  (jobs) => jobs.filter(job => job.status === JobStatus.EnRoute)
);

// Select on site jobs
export const selectOnSiteJobs = createSelector(
  selectAllJobs,
  (jobs) => jobs.filter(job => job.status === JobStatus.OnSite)
);

// Select completed jobs
export const selectCompletedJobs = createSelector(
  selectAllJobs,
  (jobs) => jobs.filter(job => job.status === JobStatus.Completed)
);

// Select cancelled jobs
export const selectCancelledJobs = createSelector(
  selectAllJobs,
  (jobs) => jobs.filter(job => job.status === JobStatus.Cancelled)
);

// Select jobs with issues
export const selectJobsWithIssues = createSelector(
  selectAllJobs,
  (jobs) => jobs.filter(job => job.status === JobStatus.Issue)
);

// Select P1 priority jobs
export const selectP1Jobs = createSelector(
  selectAllJobs,
  (jobs) => jobs.filter(job => job.priority === Priority.P1)
);

// Select P2 priority jobs
export const selectP2Jobs = createSelector(
  selectAllJobs,
  (jobs) => jobs.filter(job => job.priority === Priority.P2)
);

// Memoized date boundaries selector for today - reused by multiple selectors
// Optimized: Calculate once and share across selectors
const selectTodayBoundaries = createSelector(
  () => true, // Dummy input to trigger memoization
  () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowTime = tomorrow.getTime();
    
    return { todayTime, tomorrowTime };
  }
);

// Select jobs scheduled for today
// Optimized: Reuses memoized date boundaries
export const selectTodaysJobs = createSelector(
  selectAllJobs,
  selectTodayBoundaries,
  (jobs, { todayTime, tomorrowTime }) => {
    return jobs.filter(job => {
      const scheduledStartTime = new Date(job.scheduledStartDate).getTime();
      return scheduledStartTime >= todayTime && scheduledStartTime < tomorrowTime;
    });
  }
);

// Memoized week boundaries selector - reused by multiple selectors
// Optimized: Calculate once and share across selectors
const selectWeekBoundaries = createSelector(
  () => true, // Dummy input to trigger memoization
  () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);
    const startOfWeekTime = startOfWeek.getTime();
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    const endOfWeekTime = endOfWeek.getTime();
    
    return { startOfWeekTime, endOfWeekTime };
  }
);

// Select jobs scheduled for this week
// Optimized: Reuses memoized week boundaries
export const selectThisWeeksJobs = createSelector(
  selectAllJobs,
  selectWeekBoundaries,
  (jobs, { startOfWeekTime, endOfWeekTime }) => {
    return jobs.filter(job => {
      const scheduledStartTime = new Date(job.scheduledStartDate).getTime();
      return scheduledStartTime >= startOfWeekTime && scheduledStartTime < endOfWeekTime;
    });
  }
);

// Memoized current timestamp selector for jobs - reused by multiple selectors
// Optimized: Calculate once and share across selectors
const selectCurrentTimestampForJobs = createSelector(
  () => true, // Dummy input to trigger memoization
  () => new Date().getTime()
);

// Select overdue jobs (scheduled start date passed but not completed)
// Optimized: Reuses memoized current timestamp
export const selectOverdueJobs = createSelector(
  selectAllJobs,
  selectCurrentTimestampForJobs,
  (jobs, nowTime) => {
    return jobs.filter(job => 
      job.status !== JobStatus.Completed &&
      job.status !== JobStatus.Cancelled &&
      new Date(job.scheduledStartDate).getTime() < nowTime
    );
  }
);

// Memoized upcoming date boundaries selector - reused by multiple selectors
// Optimized: Calculate once and share across selectors
const selectUpcomingDateBoundaries = createSelector(
  () => true, // Dummy input to trigger memoization
  () => {
    const now = new Date();
    const nowTime = now.getTime();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(now.getDate() + 7);
    const sevenDaysTime = sevenDaysFromNow.getTime();
    
    return { nowTime, sevenDaysTime };
  }
);

// Select upcoming jobs (scheduled within next 7 days)
// Optimized: Reuses memoized date boundaries
export const selectUpcomingJobs = createSelector(
  selectAllJobs,
  selectUpcomingDateBoundaries,
  (jobs, { nowTime, sevenDaysTime }) => {
    return jobs.filter(job => {
      const scheduledStartTime = new Date(job.scheduledStartDate).getTime();
      return scheduledStartTime >= nowTime && scheduledStartTime <= sevenDaysTime;
    });
  }
);

/**
 * Select jobs by technician
 * Note: This selector requires assignment data to be loaded in the store.
 * It will return an empty array if assignments are not available.
 * For a complete implementation, use this in combination with assignment selectors.
 */
export const selectJobsByTechnician = (technicianId: string) => createSelector(
  selectAllJobs,
  (jobs) => {
    // This is a placeholder that returns empty array
    // The proper implementation would require joining with assignment state:
    // 1. Get all assignments for the technician from assignment state
    // 2. Extract job IDs from those assignments
    // 3. Filter jobs by those IDs
    // 
    // Example implementation when assignment state is available:
    // const assignmentJobIds = assignments
    //   .filter(a => a.technicianId === technicianId && a.isActive)
    //   .map(a => a.jobId);
    // return jobs.filter(job => assignmentJobIds.includes(job.id));
    
    return [];
  }
);

// Select jobs with specific skill requirement
export const selectJobsRequiringSkill = (skillName: string) => createSelector(
  selectAllJobs,
  (jobs) => jobs.filter(job =>
    job.requiredSkills.some(skill => skill.name === skillName)
  )
);

// Select jobs count by status
export const selectJobsCountByStatus = createSelector(
  selectAllJobs,
  (jobs) => {
    const counts: Record<JobStatus, number> = {
      [JobStatus.NotStarted]: 0,
      [JobStatus.EnRoute]: 0,
      [JobStatus.OnSite]: 0,
      [JobStatus.Completed]: 0,
      [JobStatus.Issue]: 0,
      [JobStatus.Cancelled]: 0
    };
    jobs.forEach(job => {
      counts[job.status] = (counts[job.status] || 0) + 1;
    });
    return counts;
  }
);

// Select jobs count by priority
export const selectJobsCountByPriority = createSelector(
  selectAllJobs,
  (jobs) => {
    const counts: Record<Priority, number> = {
      [Priority.P1]: 0,
      [Priority.P2]: 0,
      [Priority.Normal]: 0
    };
    jobs.forEach(job => {
      counts[job.priority] = (counts[job.priority] || 0) + 1;
    });
    return counts;
  }
);

// Select jobs count by client
export const selectJobsCountByClient = createSelector(
  selectAllJobs,
  (jobs) => {
    const counts: Record<string, number> = {};
    jobs.forEach(job => {
      counts[job.client] = (counts[job.client] || 0) + 1;
    });
    return counts;
  }
);

// Select jobs grouped by status
export const selectJobsGroupedByStatus = createSelector(
  selectAllJobs,
  (jobs) => {
    const grouped: Record<JobStatus, Job[]> = {
      [JobStatus.NotStarted]: [],
      [JobStatus.EnRoute]: [],
      [JobStatus.OnSite]: [],
      [JobStatus.Completed]: [],
      [JobStatus.Issue]: [],
      [JobStatus.Cancelled]: []
    };
    jobs.forEach(job => {
      if (!grouped[job.status]) {
        grouped[job.status] = [];
      }
      grouped[job.status].push(job);
    });
    return grouped;
  }
);

// Select jobs grouped by priority
export const selectJobsGroupedByPriority = createSelector(
  selectAllJobs,
  (jobs) => {
    const grouped: Record<Priority, Job[]> = {
      [Priority.P1]: [],
      [Priority.P2]: [],
      [Priority.Normal]: []
    };
    jobs.forEach(job => {
      if (!grouped[job.priority]) {
        grouped[job.priority] = [];
      }
      grouped[job.priority].push(job);
    });
    return grouped;
  }
);

// Select jobs grouped by client
export const selectJobsGroupedByClient = createSelector(
  selectAllJobs,
  (jobs) => {
    const grouped: Record<string, Job[]> = {};
    jobs.forEach(job => {
      if (!grouped[job.client]) {
        grouped[job.client] = [];
      }
      grouped[job.client].push(job);
    });
    return grouped;
  }
);

// Select all unique clients
export const selectAllUniqueClients = createSelector(
  selectAllJobs,
  (jobs) => {
    const clients = new Set<string>();
    jobs.forEach(job => clients.add(job.client));
    return Array.from(clients).sort();
  }
);

// Select job statistics
// Optimized: Single pass through jobs array, reuses memoized timestamp
export const selectJobStatistics = createSelector(
  selectAllJobs,
  selectCurrentTimestampForJobs,
  (jobs, nowTime) => {
    const total = jobs.length;
    
    const byStatus: Record<JobStatus, number> = {
      [JobStatus.NotStarted]: 0,
      [JobStatus.EnRoute]: 0,
      [JobStatus.OnSite]: 0,
      [JobStatus.Completed]: 0,
      [JobStatus.Issue]: 0,
      [JobStatus.Cancelled]: 0
    };
    
    const byPriority: Record<Priority, number> = {
      [Priority.P1]: 0,
      [Priority.P2]: 0,
      [Priority.Normal]: 0
    };
    
    let overdue = 0;
    
    // Single pass through jobs
    for (const job of jobs) {
      byStatus[job.status] = (byStatus[job.status] || 0) + 1;
      byPriority[job.priority] = (byPriority[job.priority] || 0) + 1;
      
      if (job.status !== JobStatus.Completed &&
          job.status !== JobStatus.Cancelled &&
          new Date(job.scheduledStartDate).getTime() < nowTime) {
        overdue++;
      }
    }

    const completionRate = total > 0
      ? ((byStatus[JobStatus.Completed] || 0) / total) * 100
      : 0;

    return {
      total,
      byStatus,
      byPriority,
      overdue,
      completionRate: Math.round(completionRate * 100) / 100
    };
  }
);

// Select jobs with location (for map display)
export const selectJobsForMap = createSelector(
  selectAllJobs,
  (jobs) => jobs
    .filter(job => job.siteAddress && job.siteAddress.latitude && job.siteAddress.longitude)
    .map(job => ({
      id: job.id,
      jobId: job.jobId,
      siteName: job.siteName,
      location: {
        latitude: job.siteAddress.latitude!,
        longitude: job.siteAddress.longitude!
      },
      status: job.status,
      priority: job.priority,
      scheduledStartDate: job.scheduledStartDate
    }))
);

// Select job IDs only (useful for performance)
export const selectJobIds = createSelector(
  selectJobState,
  selectIds
);

// Select if any jobs are loading
export const selectHasJobsLoading = createSelector(
  selectJobsLoading,
  (loading) => loading
);

// Select if jobs have error
export const selectHasJobsError = createSelector(
  selectJobsError,
  (error) => error !== null
);

// Select jobs view model (combines multiple pieces of state)
export const selectJobsViewModel = createSelector(
  selectFilteredJobs,
  selectJobsLoading,
  selectJobsError,
  selectJobFilters,
  selectJobsTotal,
  (jobs, loading, error, filters, total) => ({
    jobs,
    loading,
    error,
    filters,
    total,
    filteredCount: jobs.length
  })
);

// Select jobs needing attention (overdue or P1 priority)
export const selectJobsNeedingAttention = createSelector(
  selectOverdueJobs,
  selectP1Jobs,
  (overdue, p1) => {
    const overdueIds = new Set(overdue.map(j => j.id));
    const p1Ids = new Set(p1.map(j => j.id));
    const allIds = new Set([...overdueIds, ...p1Ids]);
    
    return {
      count: allIds.size,
      overdueCount: overdueIds.size,
      p1Count: p1Ids.size,
      jobs: [...overdue, ...p1.filter(j => !overdueIds.has(j.id))]
    };
  }
);

// Select jobs by date range
export const selectJobsByDateRange = (startDate: Date, endDate: Date) => createSelector(
  selectAllJobs,
  (jobs) => jobs.filter(job => {
    const scheduledStart = new Date(job.scheduledStartDate);
    return scheduledStart >= startDate && scheduledStart <= endDate;
  })
);

// Select active jobs (not completed or cancelled)
export const selectActiveJobs = createSelector(
  selectAllJobs,
  (jobs) => jobs.filter(job =>
    job.status !== JobStatus.Completed &&
    job.status !== JobStatus.Cancelled
  )
);

// Select jobs with notes
export const selectJobsWithNotes = createSelector(
  selectAllJobs,
  (jobs) => jobs.filter(job => job.notes && job.notes.length > 0)
);

// Select jobs with attachments
export const selectJobsWithAttachments = createSelector(
  selectAllJobs,
  (jobs) => jobs.filter(job => job.attachments && job.attachments.length > 0)
);

// ============================================================================
// SCOPE-FILTERED SELECTORS
// ============================================================================
// These selectors apply role-based data scope filtering according to the
// filterDataByScope algorithm from the design document.
//
// NOTE: The current Job model does not have 'market' or 'company' fields yet.
// These selectors are prepared for when those fields are added to the Job model.
// Until then, scope filtering will be limited.
//
// Usage: Components should inject DataScopeService and pass user + dataScopes
// to these selector factories.
// ============================================================================

/**
 * Select jobs filtered by user's data scope
 * 
 * Applies role-based filtering:
 * - Admin: sees all jobs
 * - CM: sees jobs in their market (or all if RG market)
 * - PM/Vendor: sees jobs in their company AND market
 * - Technician: sees only jobs assigned to them
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns scope-filtered jobs
 */
export const selectScopedJobs = (user: User, dataScopes: DataScope[]) => createSelector(
  selectAllJobs,
  (jobs) => {
    if (!user || !dataScopes || dataScopes.length === 0) {
      console.warn('selectScopedJobs: invalid user or dataScopes');
      return [];
    }

    // Determine scope type
    const scopeType = determineScopeType(dataScopes);

    // Apply scope filtering
    switch (scopeType) {
      case 'all':
        // Admin: see all jobs
        return jobs;

      case 'market':
        // CM: see jobs in their market (or all if RG market)
        if (user.market === 'RG') {
          return jobs;
        }
        return jobs.filter(job => job.market === user.market);

      case 'company':
        // PM/Vendor: see jobs in their company AND market
        return jobs.filter(job =>
          job.company === user.company && job.market === user.market
        );

      case 'self':
        // Technician: see only jobs assigned to them
        // Note: This requires assignment data to be available
        // For now, returns empty array as assignments need to be joined
        // Proper implementation would filter jobs based on assignment relationship
        console.warn('selectScopedJobs: self-based filtering requires assignment data - returning empty array');
        return [];

      default:
        console.warn(`selectScopedJobs: unknown scope type '${scopeType}'`);
        return [];
    }
  }
);

/**
 * Select filtered jobs with scope filtering applied
 * 
 * Combines UI filters (search, status, priority, etc.) with role-based scope filtering
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns filtered and scoped jobs
 */
export const selectFilteredScopedJobs = (user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedJobs(user, dataScopes),
  selectJobFilters,
  (scopedJobs, filters) => {
    let filtered = scopedJobs;

    // Apply UI filters on top of scope filtering
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(job =>
        job.jobId.toLowerCase().includes(searchLower) ||
        job.client.toLowerCase().includes(searchLower) ||
        job.siteName.toLowerCase().includes(searchLower) ||
        job.scopeDescription.toLowerCase().includes(searchLower)
      );
    }

    if (filters.status) {
      filtered = filtered.filter(job => job.status === filters.status);
    }

    if (filters.priority) {
      filtered = filtered.filter(job => job.priority === filters.priority);
    }

    if (filters.jobType) {
      filtered = filtered.filter(job => job.jobType === filters.jobType);
    }

    if (filters.client) {
      filtered = filtered.filter(job => job.client === filters.client);
    }

    if (filters.region) {
      filtered = filtered.filter(job => job.market === filters.region);
    }

    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      filtered = filtered.filter(job => 
        new Date(job.scheduledStartDate) >= startDate
      );
    }

    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      filtered = filtered.filter(job => 
        new Date(job.scheduledEndDate) <= endDate
      );
    }

    if (filters.technicianId) {
      // Note: This requires assignment data to properly filter
      // For now, this filter is not applied
      // Proper implementation would join with assignment state
    }

    return filtered;
  }
);

/**
 * Select active jobs with scope filtering
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns active jobs within user's scope
 */
export const selectScopedActiveJobs = (user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedJobs(user, dataScopes),
  (jobs) => jobs.filter(job =>
    job.status !== JobStatus.Completed &&
    job.status !== JobStatus.Cancelled
  )
);

/**
 * Select not started jobs with scope filtering
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns not started jobs within user's scope
 */
export const selectScopedNotStartedJobs = (user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedJobs(user, dataScopes),
  (jobs) => jobs.filter(job => job.status === JobStatus.NotStarted)
);

/**
 * Select overdue jobs with scope filtering
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns overdue jobs within user's scope
 */
export const selectScopedOverdueJobs = (user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedJobs(user, dataScopes),
  (jobs) => {
    const now = new Date();
    return jobs.filter(job =>
      job.status !== JobStatus.Completed &&
      job.status !== JobStatus.Cancelled &&
      new Date(job.scheduledStartDate) < now
    );
  }
);

/**
 * Select jobs for map display with scope filtering
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns jobs with location within user's scope
 */
export const selectScopedJobsForMap = (user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedJobs(user, dataScopes),
  (jobs) => jobs
    .filter(job => job.siteAddress && job.siteAddress.latitude && job.siteAddress.longitude)
    .map(job => ({
      id: job.id,
      jobId: job.jobId,
      siteName: job.siteName,
      location: {
        latitude: job.siteAddress.latitude!,
        longitude: job.siteAddress.longitude!
      },
      status: job.status,
      priority: job.priority,
      scheduledStartDate: job.scheduledStartDate
    }))
);

/**
 * Select job statistics with scope filtering
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns statistics for jobs within user's scope
 */
export const selectScopedJobStatistics = (user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedJobs(user, dataScopes),
  (jobs) => {
    const total = jobs.length;
    const byStatus = jobs.reduce((acc, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1;
      return acc;
    }, {} as Record<JobStatus, number>);

    const byPriority = jobs.reduce((acc, job) => {
      acc[job.priority] = (acc[job.priority] || 0) + 1;
      return acc;
    }, {} as Record<Priority, number>);

    const now = new Date();
    const overdue = jobs.filter(job =>
      job.status !== JobStatus.Completed &&
      job.status !== JobStatus.Cancelled &&
      new Date(job.scheduledStartDate) < now
    ).length;

    const completionRate = total > 0
      ? ((byStatus[JobStatus.Completed] || 0) / total) * 100
      : 0;

    return {
      total,
      byStatus,
      byPriority,
      overdue,
      completionRate: Math.round(completionRate * 100) / 100
    };
  }
);

/**
 * Select jobs view model with scope filtering
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns view model with scoped jobs
 */
export const selectScopedJobsViewModel = (user: User, dataScopes: DataScope[]) => createSelector(
  selectFilteredScopedJobs(user, dataScopes),
  selectJobsLoading,
  selectJobsError,
  selectJobFilters,
  selectScopedJobs(user, dataScopes),
  (jobs, loading, error, filters, allScopedJobs) => ({
    jobs,
    loading,
    error,
    filters,
    total: allScopedJobs.length,
    filteredCount: jobs.length
  })
);

/**
 * Check if user can access a specific job
 * 
 * @param jobId - ID of job to check
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns boolean indicating if user can access job
 */
export const selectCanAccessJob = (jobId: string, user: User, dataScopes: DataScope[]) => createSelector(
  selectJobById(jobId),
  (job) => {
    if (!job || !user || !dataScopes || dataScopes.length === 0) {
      return false;
    }

    const scopeType = determineScopeType(dataScopes);

    switch (scopeType) {
      case 'all':
        return true;

      case 'market':
        if (user.market === 'RG') {
          return true;
        }
        return job.market === user.market;

      case 'company':
        return job.company === user.company && job.market === user.market;

      case 'self':
        return job.company === user.company && job.market === user.market;

      case 'self':
        // Technician: can only access jobs assigned to them
        // Note: This requires assignment data to check
        // For now, returns false as proper implementation needs assignment relationship
        console.warn('selectCanAccessJob: self-based access check requires assignment data');
        return false;

      default:
        return false;
    }
  }
);

/**
 * Select today's jobs with scope filtering
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns today's jobs within user's scope
 */
export const selectScopedTodaysJobs = (user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedJobs(user, dataScopes),
  (jobs) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return jobs.filter(job => {
      const scheduledStart = new Date(job.scheduledStartDate);
      return scheduledStart >= today && scheduledStart < tomorrow;
    });
  }
);

/**
 * Select upcoming jobs with scope filtering
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns upcoming jobs within user's scope
 */
export const selectScopedUpcomingJobs = (user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedJobs(user, dataScopes),
  (jobs) => {
    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(now.getDate() + 7);

    return jobs.filter(job => {
      const scheduledStart = new Date(job.scheduledStartDate);
      return scheduledStart >= now && scheduledStart <= sevenDaysFromNow;
    });
  }
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
// Note: determineScopeType helper function has been moved to shared/selector-helpers.ts
// to avoid code duplication across selector files.


// Select total jobs count
export const selectTotalJobs = createSelector(
  selectAllJobs,
  (jobs) => jobs.length
);

// Select active jobs count (not completed or cancelled)
export const selectActiveJobsCount = createSelector(
  selectAllJobs,
  (jobs) => jobs.filter(job => 
    job.status !== JobStatus.Completed && 
    job.status !== JobStatus.Cancelled
  ).length
);

// Select recent jobs (last 10, sorted by creation date)
export const selectRecentJobs = createSelector(
  selectAllJobs,
  (jobs) => {
    return [...jobs]
      .sort((a, b) => {
        const dateA = new Date(a.createdAt || a.scheduledStartDate).getTime();
        const dateB = new Date(b.createdAt || b.scheduledStartDate).getTime();
        return dateB - dateA;
      })
      .slice(0, 10);
  }
);
