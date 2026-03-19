/**
 * Assignment Selectors
 * Provides memoized selectors for accessing assignment state with conflict detection
 * 
 * All selectors use createSelector for automatic memoization:
 * - Results are cached based on input selector values
 * - Recomputation only occurs when inputs change
 * - Improves performance by avoiding unnecessary recalculations
 * 
 * Conflict Detection:
 * - Time overlaps between assignments for the same technician
 * - Missing skills (technician doesn't have required skills for job)
 * - Excessive distance (technician location too far from job site)
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AssignmentState } from './assignment.state';
import { assignmentAdapter } from './assignment.reducer';
import { Assignment, Conflict, ConflictSeverity, TechnicianMatch } from '../../models/assignment.model';
import { User } from '../../../../models/user.model';
import { DataScope } from '../../services/data-scope.service';
import { selectAllJobs, selectJobEntities } from '../jobs/job.selectors';
import { selectAllTechnicians, selectTechnicianEntities } from '../technicians/technician.selectors';
import { Job } from '../../models/job.model';
import { Technician } from '../../models/technician.model';
import { determineScopeType, calculateDistance, timeRangesOverlap } from '../shared/selector-helpers';

// Feature selector
export const selectAssignmentState = createFeatureSelector<AssignmentState>('assignments');

// Entity adapter selectors
const {
  selectIds,
  selectEntities,
  selectAll,
  selectTotal
} = assignmentAdapter.getSelectors();

// ============================================================================
// BASIC SELECTORS
// ============================================================================

// Select all assignments
export const selectAllAssignments = createSelector(
  selectAssignmentState,
  selectAll
);

// Select assignment entities
export const selectAssignmentEntities = createSelector(
  selectAssignmentState,
  selectEntities
);

// Select assignment by ID
export const selectAssignmentById = (id: string) => createSelector(
  selectAssignmentEntities,
  (entities) => entities[id]
);

// Select loading state
export const selectAssignmentsLoading = createSelector(
  selectAssignmentState,
  (state) => state.loading
);

// Select error state
export const selectAssignmentsError = createSelector(
  selectAssignmentState,
  (state) => state.error
);

// Select conflicts
export const selectAssignmentConflicts = createSelector(
  selectAssignmentState,
  (state) => state.conflicts
);

// Select qualified technicians
export const selectQualifiedTechnicians = createSelector(
  selectAssignmentState,
  (state) => state.qualifiedTechnicians
);

// Select total count
export const selectAssignmentsTotal = createSelector(
  selectAssignmentState,
  selectTotal
);

// Select assignment IDs only (useful for performance)
export const selectAssignmentIds = createSelector(
  selectAssignmentState,
  selectIds
);

// ============================================================================
// FILTERED SELECTORS
// ============================================================================

// Select assignments by technician ID
export const selectAssignmentsByTechnician = (technicianId: string) => createSelector(
  selectAllAssignments,
  (assignments) => assignments.filter(assignment => 
    assignment.technicianId === technicianId && assignment.isActive
  )
);

// Select assignments by job ID
export const selectAssignmentsByJob = (jobId: string) => createSelector(
  selectAllAssignments,
  (assignments) => assignments.filter(assignment => 
    assignment.jobId === jobId && assignment.isActive
  )
);

// Select active assignments
export const selectActiveAssignments = createSelector(
  selectAllAssignments,
  (assignments) => assignments.filter(assignment => assignment.isActive)
);

// Select inactive assignments
export const selectInactiveAssignments = createSelector(
  selectAllAssignments,
  (assignments) => assignments.filter(assignment => !assignment.isActive)
);

// ============================================================================
// ENRICHED SELECTORS (with Job and Technician data)
// ============================================================================

/**
 * Select assignments enriched with job and technician data
 * Joins assignment data with related job and technician entities
 */
export const selectEnrichedAssignments = createSelector(
  selectAllAssignments,
  selectJobEntities,
  selectTechnicianEntities,
  (assignments, jobEntities, technicianEntities) => {
    return assignments.map(assignment => ({
      ...assignment,
      job: jobEntities[assignment.jobId],
      technician: technicianEntities[assignment.technicianId]
    }));
  }
);

/**
 * Select enriched assignments by technician ID
 */
export const selectEnrichedAssignmentsByTechnician = (technicianId: string) => createSelector(
  selectEnrichedAssignments,
  (enrichedAssignments) => enrichedAssignments.filter(assignment =>
    assignment.technicianId === technicianId && assignment.isActive
  )
);

/**
 * Select enriched assignments by job ID
 */
export const selectEnrichedAssignmentsByJob = (jobId: string) => createSelector(
  selectEnrichedAssignments,
  (enrichedAssignments) => enrichedAssignments.filter(assignment =>
    assignment.jobId === jobId && assignment.isActive
  )
);

// ============================================================================
// CONFLICT DETECTION SELECTORS
// ============================================================================

/**
 * Maximum reasonable distance for assignment (in kilometers)
 * Technicians more than 100km away from job site trigger distance conflict
 */
const MAX_REASONABLE_DISTANCE = 100;

/**
 * Detect conflicts for a potential assignment
 * 
 * Checks for:
 * 1. Time overlaps with existing assignments
 * 2. Missing required skills
 * 3. Excessive distance from job site
 * 
 * @param jobId - ID of job to assign
 * @param technicianId - ID of technician to assign
 * @returns Selector that returns array of conflicts
 */
export const selectConflictsForAssignment = (jobId: string, technicianId: string) => createSelector(
  selectAssignmentsByTechnician(technicianId),
  selectJobEntities,
  selectTechnicianEntities,
  (existingAssignments, jobEntities, technicianEntities) => {
    const conflicts: Conflict[] = [];
    const newJob = jobEntities[jobId];
    const technician = technicianEntities[technicianId];
    
    // If job or technician not found, cannot detect conflicts
    if (!newJob || !technician) {
      return conflicts;
    }
    
    // 1. Check for time overlaps with existing assignments
    for (const assignment of existingAssignments) {
      const existingJob = jobEntities[assignment.jobId];
      
      if (!existingJob) {
        continue;
      }
      
      // Check if time ranges overlap
      if (timeRangesOverlap(
        newJob.scheduledStartDate,
        newJob.scheduledEndDate,
        existingJob.scheduledStartDate,
        existingJob.scheduledEndDate
      )) {
        const overlapStart = new Date(Math.max(
          new Date(newJob.scheduledStartDate).getTime(),
          new Date(existingJob.scheduledStartDate).getTime()
        ));
        
        const overlapEnd = new Date(Math.min(
          new Date(newJob.scheduledEndDate).getTime(),
          new Date(existingJob.scheduledEndDate).getTime()
        ));
        
        conflicts.push({
          jobId: newJob.id,
          technicianId: technician.id,
          conflictingJobId: existingJob.id,
          conflictingJobTitle: `${existingJob.jobId} - ${existingJob.siteName}`,
          timeRange: {
            startDate: overlapStart,
            endDate: overlapEnd
          },
          severity: ConflictSeverity.Error
        });
      }
    }
    
    // 2. Check skill requirements
    if (newJob.requiredSkills && newJob.requiredSkills.length > 0) {
      for (const requiredSkill of newJob.requiredSkills) {
        const hasSkill = technician.skills.some(techSkill =>
          techSkill.name === requiredSkill.name
        );
        
        if (!hasSkill) {
          conflicts.push({
            jobId: newJob.id,
            technicianId: technician.id,
            conflictingJobId: '',
            conflictingJobTitle: `Missing skill: ${requiredSkill.name}`,
            timeRange: {
              startDate: newJob.scheduledStartDate,
              endDate: newJob.scheduledEndDate
            },
            severity: ConflictSeverity.Warning
          });
        }
      }
    }
    
    // 3. Check location distance
    if (technician.currentLocation && newJob.siteAddress?.latitude && newJob.siteAddress?.longitude) {
      const distance = calculateDistance(
        technician.currentLocation.latitude,
        technician.currentLocation.longitude,
        newJob.siteAddress.latitude,
        newJob.siteAddress.longitude
      );
      
      if (distance > MAX_REASONABLE_DISTANCE) {
        conflicts.push({
          jobId: newJob.id,
          technicianId: technician.id,
          conflictingJobId: '',
          conflictingJobTitle: `Excessive distance: ${Math.round(distance)}km from job site`,
          timeRange: {
            startDate: newJob.scheduledStartDate,
            endDate: newJob.scheduledEndDate
          },
          severity: ConflictSeverity.Warning
        });
      }
    }
    
    return conflicts;
  }
);

/**
 * Detect all conflicts across all assignments
 * 
 * Analyzes all active assignments and identifies conflicts
 */
export const selectAllAssignmentConflicts = createSelector(
  selectActiveAssignments,
  selectJobEntities,
  selectTechnicianEntities,
  (assignments, jobEntities, technicianEntities) => {
    const conflicts: Conflict[] = [];
    
    // Group assignments by technician
    const assignmentsByTechnician = new Map<string, Assignment[]>();
    for (const assignment of assignments) {
      if (!assignmentsByTechnician.has(assignment.technicianId)) {
        assignmentsByTechnician.set(assignment.technicianId, []);
      }
      assignmentsByTechnician.get(assignment.technicianId)!.push(assignment);
    }
    
    // Check for time overlaps within each technician's assignments
    for (const [technicianId, techAssignments] of assignmentsByTechnician) {
      for (let i = 0; i < techAssignments.length; i++) {
        for (let j = i + 1; j < techAssignments.length; j++) {
          const assignment1 = techAssignments[i];
          const assignment2 = techAssignments[j];
          const job1 = jobEntities[assignment1.jobId];
          const job2 = jobEntities[assignment2.jobId];
          
          if (!job1 || !job2) {
            continue;
          }
          
          if (timeRangesOverlap(
            job1.scheduledStartDate,
            job1.scheduledEndDate,
            job2.scheduledStartDate,
            job2.scheduledEndDate
          )) {
            const overlapStart = new Date(Math.max(
              new Date(job1.scheduledStartDate).getTime(),
              new Date(job2.scheduledStartDate).getTime()
            ));
            
            const overlapEnd = new Date(Math.min(
              new Date(job1.scheduledEndDate).getTime(),
              new Date(job2.scheduledEndDate).getTime()
            ));
            
            conflicts.push({
              jobId: job1.id,
              technicianId: technicianId,
              conflictingJobId: job2.id,
              conflictingJobTitle: `${job2.jobId} - ${job2.siteName}`,
              timeRange: {
                startDate: overlapStart,
                endDate: overlapEnd
              },
              severity: ConflictSeverity.Error
            });
          }
        }
      }
    }
    
    return conflicts;
  }
);

/**
 * Select conflicts by severity
 */
export const selectConflictsBySeverity = (severity: ConflictSeverity) => createSelector(
  selectAssignmentConflicts,
  (conflicts) => conflicts.filter(conflict => conflict.severity === severity)
);

/**
 * Select error conflicts (blocking issues)
 */
export const selectErrorConflicts = createSelector(
  selectAssignmentConflicts,
  (conflicts) => conflicts.filter(conflict => conflict.severity === ConflictSeverity.Error)
);

/**
 * Select warning conflicts (non-blocking issues)
 */
export const selectWarningConflicts = createSelector(
  selectAssignmentConflicts,
  (conflicts) => conflicts.filter(conflict => conflict.severity === ConflictSeverity.Warning)
);

/**
 * Select conflicts for a specific technician
 */
export const selectConflictsForTechnician = (technicianId: string) => createSelector(
  selectAssignmentConflicts,
  (conflicts) => conflicts.filter(conflict => conflict.technicianId === technicianId)
);

/**
 * Select conflicts for a specific job
 */
export const selectConflictsForJob = (jobId: string) => createSelector(
  selectAssignmentConflicts,
  (conflicts) => conflicts.filter(conflict => conflict.jobId === jobId)
);

/**
 * Check if a technician has any conflicts
 */
export const selectTechnicianHasConflicts = (technicianId: string) => createSelector(
  selectConflictsForTechnician(technicianId),
  (conflicts) => conflicts.length > 0
);

/**
 * Check if a job has any conflicts
 */
export const selectJobHasConflicts = (jobId: string) => createSelector(
  selectConflictsForJob(jobId),
  (conflicts) => conflicts.length > 0
);

/**
 * Count conflicts by type
 */
export const selectConflictCounts = createSelector(
  selectAssignmentConflicts,
  (conflicts) => {
    const counts = {
      total: conflicts.length,
      errors: 0,
      warnings: 0,
      timeOverlaps: 0,
      missingSkills: 0,
      excessiveDistance: 0
    };
    
    for (const conflict of conflicts) {
      if (conflict.severity === ConflictSeverity.Error) {
        counts.errors++;
      } else {
        counts.warnings++;
      }
      
      if (conflict.conflictingJobId) {
        counts.timeOverlaps++;
      } else if (conflict.conflictingJobTitle.includes('Missing skill')) {
        counts.missingSkills++;
      } else if (conflict.conflictingJobTitle.includes('Excessive distance')) {
        counts.excessiveDistance++;
      }
    }
    
    return counts;
  }
);

// ============================================================================
// STATISTICS SELECTORS
// ============================================================================

/**
 * Select assignment statistics
 */
export const selectAssignmentStatistics = createSelector(
  selectAllAssignments,
  (assignments) => {
    const total = assignments.length;
    const active = assignments.filter(a => a.isActive).length;
    const inactive = total - active;
    
    return {
      total,
      active,
      inactive
    };
  }
);

/**
 * Select assignments grouped by technician
 */
export const selectAssignmentsGroupedByTechnician = createSelector(
  selectActiveAssignments,
  (assignments) => {
    const grouped: Record<string, Assignment[]> = {};
    
    for (const assignment of assignments) {
      if (!grouped[assignment.technicianId]) {
        grouped[assignment.technicianId] = [];
      }
      grouped[assignment.technicianId].push(assignment);
    }
    
    return grouped;
  }
);

/**
 * Select assignments grouped by job
 */
export const selectAssignmentsGroupedByJob = createSelector(
  selectActiveAssignments,
  (assignments) => {
    const grouped: Record<string, Assignment[]> = {};
    
    for (const assignment of assignments) {
      if (!grouped[assignment.jobId]) {
        grouped[assignment.jobId] = [];
      }
      grouped[assignment.jobId].push(assignment);
    }
    
    return grouped;
  }
);

/**
 * Select technician workload (number of active assignments)
 */
export const selectTechnicianWorkload = (technicianId: string) => createSelector(
  selectAssignmentsByTechnician(technicianId),
  (assignments) => assignments.length
);

/**
 * Select technicians with workload
 */
export const selectTechniciansWithWorkload = createSelector(
  selectActiveAssignments,
  selectAllTechnicians,
  (assignments, technicians) => {
    const workloadMap = new Map<string, number>();
    
    for (const assignment of assignments) {
      const current = workloadMap.get(assignment.technicianId) || 0;
      workloadMap.set(assignment.technicianId, current + 1);
    }
    
    return technicians.map(technician => ({
      technician,
      workload: workloadMap.get(technician.id) || 0
    }));
  }
);

/**
 * Select overloaded technicians (more than 3 active assignments)
 */
export const selectOverloadedTechnicians = createSelector(
  selectTechniciansWithWorkload,
  (techniciansWithWorkload) => techniciansWithWorkload.filter(item => item.workload > 3)
);

/**
 * Select available technicians (0 active assignments)
 */
export const selectAvailableTechniciansForAssignment = createSelector(
  selectTechniciansWithWorkload,
  (techniciansWithWorkload) => techniciansWithWorkload.filter(item => item.workload === 0)
);

// ============================================================================
// VIEW MODEL SELECTORS
// ============================================================================

/**
 * Select assignments view model
 * Combines multiple pieces of state for component consumption
 */
export const selectAssignmentsViewModel = createSelector(
  selectEnrichedAssignments,
  selectAssignmentsLoading,
  selectAssignmentsError,
  selectAssignmentConflicts,
  selectAssignmentsTotal,
  (assignments, loading, error, conflicts, total) => ({
    assignments,
    loading,
    error,
    conflicts,
    total,
    hasConflicts: conflicts.length > 0
  })
);

/**
 * Select technician assignment view model
 * Provides all data needed for technician assignment view
 */
export const selectTechnicianAssignmentViewModel = (technicianId: string) => createSelector(
  selectEnrichedAssignmentsByTechnician(technicianId),
  selectConflictsForTechnician(technicianId),
  selectTechnicianWorkload(technicianId),
  selectAssignmentsLoading,
  selectAssignmentsError,
  (assignments, conflicts, workload, loading, error) => ({
    assignments,
    conflicts,
    workload,
    loading,
    error,
    hasConflicts: conflicts.length > 0
  })
);

/**
 * Select job assignment view model
 * Provides all data needed for job assignment view
 */
export const selectJobAssignmentViewModel = (jobId: string) => createSelector(
  selectEnrichedAssignmentsByJob(jobId),
  selectConflictsForJob(jobId),
  selectAssignmentsLoading,
  selectAssignmentsError,
  (assignments, conflicts, loading, error) => ({
    assignments,
    conflicts,
    loading,
    error,
    hasConflicts: conflicts.length > 0,
    assignedCount: assignments.length
  })
);

// ============================================================================
// SCOPE-FILTERED SELECTORS
// ============================================================================
// These selectors apply role-based data scope filtering according to the
// filterDataByScope algorithm from the design document.
//
// NOTE: Assignment model doesn't have direct 'market' or 'company' fields.
// Scope filtering is applied through related Job and Technician entities.
//
// Usage: Components should inject DataScopeService and pass user + dataScopes
// to these selector factories.
// ============================================================================

/**
 * Select assignments filtered by user's data scope
 * 
 * Applies role-based filtering:
 * - Admin: sees all assignments
 * - CM: sees assignments for jobs/technicians in their market (or all if RG market)
 * - PM/Vendor: sees assignments for jobs/technicians in their company AND market
 * - Technician: sees only their own assignments
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns scope-filtered assignments
 * 
 * Note: Requires job and technician entities to be loaded for proper filtering
 */
export const selectScopedAssignments = (user: User, dataScopes: DataScope[]) => createSelector(
  selectAllAssignments,
  selectJobEntities,
  selectTechnicianEntities,
  (assignments, jobEntities, technicianEntities) => {
    if (!user || !dataScopes || dataScopes.length === 0) {
      console.warn('selectScopedAssignments: invalid user or dataScopes');
      return [];
    }

    // Determine scope type
    const scopeType = determineScopeType(dataScopes);

    // Apply scope filtering
    switch (scopeType) {
      case 'all':
        // Admin: see all assignments
        return assignments;

      case 'market':
        // CM: see assignments for jobs/technicians in their market (or all if RG market)
        if (user.market === 'RG') {
          return assignments;
        }
        // Filter by market through job and technician entities
        return assignments.filter(assignment => {
          const job = jobEntities[assignment.jobId];
          const technician = technicianEntities[assignment.technicianId];
          
          // Include assignment if either job or technician is in user's market
          const jobInMarket = job && job.market === user.market;
          const techInMarket = technician && technician.region === user.market;
          
          return jobInMarket || techInMarket;
        });

      case 'company':
        // PM/Vendor: see assignments for jobs/technicians in their company AND market
        return assignments.filter(assignment => {
          const job = jobEntities[assignment.jobId];
          const technician = technicianEntities[assignment.technicianId];
          
          // Include assignment if both job and technician match company AND market
          const jobMatches = job && 
            job.company === user.company && 
            job.market === user.market;
          
          // Note: Technician model doesn't have company field yet
          // For now, just check market for technician
          const techMatches = technician && technician.region === user.market;
          
          return jobMatches && techMatches;
        });

      case 'self':
        // Technician: see only their own assignments
        return assignments.filter(assignment => 
          assignment.technicianId === user.id
        );

      default:
        console.warn(`selectScopedAssignments: unknown scope type '${scopeType}'`);
        return [];
    }
  }
);

/**
 * Select active assignments with scope filtering
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns active assignments within user's scope
 */
export const selectScopedActiveAssignments = (user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedAssignments(user, dataScopes),
  (assignments) => assignments.filter(assignment => assignment.isActive)
);

/**
 * Select enriched assignments with scope filtering
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns enriched assignments within user's scope
 */
export const selectScopedEnrichedAssignments = (user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedAssignments(user, dataScopes),
  selectJobEntities,
  selectTechnicianEntities,
  (assignments, jobEntities, technicianEntities) => {
    return assignments.map(assignment => ({
      ...assignment,
      job: jobEntities[assignment.jobId],
      technician: technicianEntities[assignment.technicianId]
    }));
  }
);

/**
 * Select assignments by technician with scope filtering
 * 
 * @param technicianId - ID of technician
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns technician's assignments within user's scope
 */
export const selectScopedAssignmentsByTechnician = (technicianId: string, user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedActiveAssignments(user, dataScopes),
  (assignments) => assignments.filter(assignment => 
    assignment.technicianId === technicianId
  )
);

/**
 * Select assignments by job with scope filtering
 * 
 * @param jobId - ID of job
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns job's assignments within user's scope
 */
export const selectScopedAssignmentsByJob = (jobId: string, user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedActiveAssignments(user, dataScopes),
  (assignments) => assignments.filter(assignment => 
    assignment.jobId === jobId
  )
);

/**
 * Select assignment statistics with scope filtering
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns statistics for assignments within user's scope
 */
export const selectScopedAssignmentStatistics = (user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedAssignments(user, dataScopes),
  (assignments) => {
    const total = assignments.length;
    const active = assignments.filter(a => a.isActive).length;
    const inactive = total - active;
    
    return {
      total,
      active,
      inactive
    };
  }
);

/**
 * Select assignments grouped by technician with scope filtering
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns assignments grouped by technician within user's scope
 */
export const selectScopedAssignmentsGroupedByTechnician = (user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedActiveAssignments(user, dataScopes),
  (assignments) => {
    const grouped: Record<string, Assignment[]> = {};
    
    for (const assignment of assignments) {
      if (!grouped[assignment.technicianId]) {
        grouped[assignment.technicianId] = [];
      }
      grouped[assignment.technicianId].push(assignment);
    }
    
    return grouped;
  }
);

/**
 * Select assignments grouped by job with scope filtering
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns assignments grouped by job within user's scope
 */
export const selectScopedAssignmentsGroupedByJob = (user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedActiveAssignments(user, dataScopes),
  (assignments) => {
    const grouped: Record<string, Assignment[]> = {};
    
    for (const assignment of assignments) {
      if (!grouped[assignment.jobId]) {
        grouped[assignment.jobId] = [];
      }
      grouped[assignment.jobId].push(assignment);
    }
    
    return grouped;
  }
);

/**
 * Select technician workload with scope filtering
 * 
 * @param technicianId - ID of technician
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns technician's workload within user's scope
 */
export const selectScopedTechnicianWorkload = (technicianId: string, user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedAssignmentsByTechnician(technicianId, user, dataScopes),
  (assignments) => assignments.length
);

/**
 * Select technicians with workload with scope filtering
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns technicians with workload within user's scope
 */
export const selectScopedTechniciansWithWorkload = (user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedActiveAssignments(user, dataScopes),
  selectAllTechnicians,
  (assignments, technicians) => {
    const workloadMap = new Map<string, number>();
    
    for (const assignment of assignments) {
      const current = workloadMap.get(assignment.technicianId) || 0;
      workloadMap.set(assignment.technicianId, current + 1);
    }
    
    return technicians.map(technician => ({
      technician,
      workload: workloadMap.get(technician.id) || 0
    }));
  }
);

/**
 * Select overloaded technicians with scope filtering
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns overloaded technicians within user's scope
 */
export const selectScopedOverloadedTechnicians = (user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedTechniciansWithWorkload(user, dataScopes),
  (techniciansWithWorkload) => techniciansWithWorkload.filter(item => item.workload > 3)
);

/**
 * Select available technicians for assignment with scope filtering
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns available technicians within user's scope
 */
export const selectScopedAvailableTechniciansForAssignment = (user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedTechniciansWithWorkload(user, dataScopes),
  (techniciansWithWorkload) => techniciansWithWorkload.filter(item => item.workload === 0)
);

/**
 * Select conflicts for assignment with scope filtering
 * 
 * @param jobId - ID of job to assign
 * @param technicianId - ID of technician to assign
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns conflicts within user's scope
 */
export const selectScopedConflictsForAssignment = (jobId: string, technicianId: string, user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedAssignmentsByTechnician(technicianId, user, dataScopes),
  selectJobEntities,
  selectTechnicianEntities,
  (existingAssignments, jobEntities, technicianEntities) => {
    const conflicts: Conflict[] = [];
    const newJob = jobEntities[jobId];
    const technician = technicianEntities[technicianId];
    
    // If job or technician not found, cannot detect conflicts
    if (!newJob || !technician) {
      return conflicts;
    }
    
    // 1. Check for time overlaps with existing assignments
    for (const assignment of existingAssignments) {
      const existingJob = jobEntities[assignment.jobId];
      
      if (!existingJob) {
        continue;
      }
      
      // Check if time ranges overlap
      if (timeRangesOverlap(
        newJob.scheduledStartDate,
        newJob.scheduledEndDate,
        existingJob.scheduledStartDate,
        existingJob.scheduledEndDate
      )) {
        const overlapStart = new Date(Math.max(
          new Date(newJob.scheduledStartDate).getTime(),
          new Date(existingJob.scheduledStartDate).getTime()
        ));
        
        const overlapEnd = new Date(Math.min(
          new Date(newJob.scheduledEndDate).getTime(),
          new Date(existingJob.scheduledEndDate).getTime()
        ));
        
        conflicts.push({
          jobId: newJob.id,
          technicianId: technician.id,
          conflictingJobId: existingJob.id,
          conflictingJobTitle: `${existingJob.jobId} - ${existingJob.siteName}`,
          timeRange: {
            startDate: overlapStart,
            endDate: overlapEnd
          },
          severity: ConflictSeverity.Error
        });
      }
    }
    
    // 2. Check skill requirements
    if (newJob.requiredSkills && newJob.requiredSkills.length > 0) {
      for (const requiredSkill of newJob.requiredSkills) {
        const hasSkill = technician.skills.some(techSkill =>
          techSkill.name === requiredSkill.name
        );
        
        if (!hasSkill) {
          conflicts.push({
            jobId: newJob.id,
            technicianId: technician.id,
            conflictingJobId: '',
            conflictingJobTitle: `Missing skill: ${requiredSkill.name}`,
            timeRange: {
              startDate: newJob.scheduledStartDate,
              endDate: newJob.scheduledEndDate
            },
            severity: ConflictSeverity.Warning
          });
        }
      }
    }
    
    // 3. Check location distance
    if (technician.currentLocation && newJob.siteAddress?.latitude && newJob.siteAddress?.longitude) {
      const distance = calculateDistance(
        technician.currentLocation.latitude,
        technician.currentLocation.longitude,
        newJob.siteAddress.latitude,
        newJob.siteAddress.longitude
      );
      
      if (distance > MAX_REASONABLE_DISTANCE) {
        conflicts.push({
          jobId: newJob.id,
          technicianId: technician.id,
          conflictingJobId: '',
          conflictingJobTitle: `Excessive distance: ${Math.round(distance)}km from job site`,
          timeRange: {
            startDate: newJob.scheduledStartDate,
            endDate: newJob.scheduledEndDate
          },
          severity: ConflictSeverity.Warning
        });
      }
    }
    
    return conflicts;
  }
);

/**
 * Select all assignment conflicts with scope filtering
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns all conflicts within user's scope
 */
export const selectScopedAllAssignmentConflicts = (user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedActiveAssignments(user, dataScopes),
  selectJobEntities,
  selectTechnicianEntities,
  (assignments, jobEntities, technicianEntities) => {
    const conflicts: Conflict[] = [];
    
    // Group assignments by technician
    const assignmentsByTechnician = new Map<string, Assignment[]>();
    for (const assignment of assignments) {
      if (!assignmentsByTechnician.has(assignment.technicianId)) {
        assignmentsByTechnician.set(assignment.technicianId, []);
      }
      assignmentsByTechnician.get(assignment.technicianId)!.push(assignment);
    }
    
    // Check for time overlaps within each technician's assignments
    for (const [technicianId, techAssignments] of assignmentsByTechnician) {
      for (let i = 0; i < techAssignments.length; i++) {
        for (let j = i + 1; j < techAssignments.length; j++) {
          const assignment1 = techAssignments[i];
          const assignment2 = techAssignments[j];
          const job1 = jobEntities[assignment1.jobId];
          const job2 = jobEntities[assignment2.jobId];
          
          if (!job1 || !job2) {
            continue;
          }
          
          if (timeRangesOverlap(
            job1.scheduledStartDate,
            job1.scheduledEndDate,
            job2.scheduledStartDate,
            job2.scheduledEndDate
          )) {
            const overlapStart = new Date(Math.max(
              new Date(job1.scheduledStartDate).getTime(),
              new Date(job2.scheduledStartDate).getTime()
            ));
            
            const overlapEnd = new Date(Math.min(
              new Date(job1.scheduledEndDate).getTime(),
              new Date(job2.scheduledEndDate).getTime()
            ));
            
            conflicts.push({
              jobId: job1.id,
              technicianId: technicianId,
              conflictingJobId: job2.id,
              conflictingJobTitle: `${job2.jobId} - ${job2.siteName}`,
              timeRange: {
                startDate: overlapStart,
                endDate: overlapEnd
              },
              severity: ConflictSeverity.Error
            });
          }
        }
      }
    }
    
    return conflicts;
  }
);

/**
 * Select conflicts for technician with scope filtering
 * 
 * @param technicianId - ID of technician
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns technician's conflicts within user's scope
 */
export const selectScopedConflictsForTechnician = (technicianId: string, user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedAllAssignmentConflicts(user, dataScopes),
  (conflicts) => conflicts.filter(conflict => conflict.technicianId === technicianId)
);

/**
 * Select conflicts for job with scope filtering
 * 
 * @param jobId - ID of job
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns job's conflicts within user's scope
 */
export const selectScopedConflictsForJob = (jobId: string, user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedAllAssignmentConflicts(user, dataScopes),
  (conflicts) => conflicts.filter(conflict => conflict.jobId === jobId)
);

/**
 * Select assignments view model with scope filtering
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns view model with scoped assignments
 */
export const selectScopedAssignmentsViewModel = (user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedEnrichedAssignments(user, dataScopes),
  selectAssignmentsLoading,
  selectAssignmentsError,
  selectScopedAllAssignmentConflicts(user, dataScopes),
  selectScopedAssignments(user, dataScopes),
  (assignments, loading, error, conflicts, allScopedAssignments) => ({
    assignments,
    loading,
    error,
    conflicts,
    total: allScopedAssignments.length,
    hasConflicts: conflicts.length > 0
  })
);

/**
 * Select technician assignment view model with scope filtering
 * 
 * @param technicianId - ID of technician
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns technician assignment view model within user's scope
 */
export const selectScopedTechnicianAssignmentViewModel = (technicianId: string, user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedAssignmentsByTechnician(technicianId, user, dataScopes),
  selectJobEntities,
  selectTechnicianEntities,
  selectScopedConflictsForTechnician(technicianId, user, dataScopes),
  selectScopedTechnicianWorkload(technicianId, user, dataScopes),
  selectAssignmentsLoading,
  selectAssignmentsError,
  (assignments, jobEntities, technicianEntities, conflicts, workload, loading, error) => {
    const enrichedAssignments = assignments.map(assignment => ({
      ...assignment,
      job: jobEntities[assignment.jobId],
      technician: technicianEntities[assignment.technicianId]
    }));
    
    return {
      assignments: enrichedAssignments,
      conflicts,
      workload,
      loading,
      error,
      hasConflicts: conflicts.length > 0
    };
  }
);

/**
 * Select job assignment view model with scope filtering
 * 
 * @param jobId - ID of job
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns job assignment view model within user's scope
 */
export const selectScopedJobAssignmentViewModel = (jobId: string, user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedAssignmentsByJob(jobId, user, dataScopes),
  selectJobEntities,
  selectTechnicianEntities,
  selectScopedConflictsForJob(jobId, user, dataScopes),
  selectAssignmentsLoading,
  selectAssignmentsError,
  (assignments, jobEntities, technicianEntities, conflicts, loading, error) => {
    const enrichedAssignments = assignments.map(assignment => ({
      ...assignment,
      job: jobEntities[assignment.jobId],
      technician: technicianEntities[assignment.technicianId]
    }));
    
    return {
      assignments: enrichedAssignments,
      conflicts,
      loading,
      error,
      hasConflicts: conflicts.length > 0,
      assignedCount: assignments.length
    };
  }
);

/**
 * Check if user can access a specific assignment
 * 
 * @param assignmentId - ID of assignment to check
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns boolean indicating if user can access assignment
 */
export const selectCanAccessAssignment = (assignmentId: string, user: User, dataScopes: DataScope[]) => createSelector(
  selectAssignmentById(assignmentId),
  selectJobEntities,
  selectTechnicianEntities,
  (assignment, jobEntities, technicianEntities) => {
    if (!assignment || !user || !dataScopes || dataScopes.length === 0) {
      return false;
    }

    const scopeType = determineScopeType(dataScopes);
    const job = jobEntities[assignment.jobId];
    const technician = technicianEntities[assignment.technicianId];

    switch (scopeType) {
      case 'all':
        return true;

      case 'market':
        if (user.market === 'RG') {
          return true;
        }
        const jobInMarket = job && job.market === user.market;
        const techInMarket = technician && technician.region === user.market;
        return jobInMarket || techInMarket;

      case 'company':
        const jobMatches = job && 
          job.company === user.company && 
          job.market === user.market;
        const techMatches = technician && technician.region === user.market;
        return jobMatches && techMatches;

      case 'self':
        return assignment.technicianId === user.id;

      default:
        return false;
    }
  }
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
// Note: Helper functions (determineScopeType, calculateDistance, timeRangesOverlap)
// have been moved to shared/selector-helpers.ts to avoid code duplication across selector files.

