/**
 * Job Selectors Unit Tests
 * Tests all selectors for job state management including scope filtering
 */

import { Job, JobStatus, Priority, JobType } from '../../models/job.model';
import { SkillLevel } from '../../models/technician.model';
import { JobState } from './job.state';
import { User } from '../../../../models/user.model';
import { DataScope } from '../../services/data-scope.service';
import * as JobSelectors from './job.selectors';

describe('Job Selectors', () => {
  const mockJob1: Job = {
    id: 'job-1',
    jobId: 'J001',
    client: 'Client A',
    siteName: 'Site Alpha',
    siteAddress: {
      street: '123 Main St',
      city: 'Dallas',
      state: 'TX',
      zipCode: '75001',
      latitude: 32.7767,
      longitude: -96.7970
    },
    scopeDescription: 'Fiber installation',
    status: JobStatus.NotStarted,
    priority: Priority.P1,
    jobType: JobType.Install,
    requiredCrewSize: 2,
    estimatedLaborHours: 8,
    scheduledStartDate: new Date('2024-02-01T08:00:00'),
    scheduledEndDate: new Date('2024-02-01T17:00:00'),
    requiredSkills: [
      { id: 'skill-1', name: 'Fiber Splicing', category: 'Installation', level: SkillLevel.Advanced }
    ],
    notes: [],
    attachments: [],
    market: 'DALLAS',
    company: 'TestCompany',
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  };

  const mockJob2: Job = {
    id: 'job-2',
    jobId: 'J002',
    client: 'Client B',
    siteName: 'Site Beta',
    siteAddress: {
      street: '456 Oak Ave',
      city: 'Austin',
      state: 'TX',
      zipCode: '78701',
      latitude: 30.2672,
      longitude: -97.7431
    },
    scopeDescription: 'Cable repair',
    status: JobStatus.OnSite,
    priority: Priority.P2,
    jobType: JobType.Decom,
    requiredCrewSize: 1,
    estimatedLaborHours: 4,
    scheduledStartDate: new Date('2024-02-02T08:00:00'),
    scheduledEndDate: new Date('2024-02-02T17:00:00'),
    requiredSkills: [],
    notes: [
      {
        id: 'note-1',
        jobId: 'job-2',
        text: 'Test note',
        author: 'user-1',
        createdAt: new Date()
      }
    ],
    attachments: [],
    market: 'DALLAS',
    company: 'TestCompany',
    createdBy: 'user-1',
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02')
  };

  const mockJob3: Job = {
    id: 'job-3',
    jobId: 'J003',
    client: 'Client A',
    siteName: 'Site Gamma',
    siteAddress: {
      street: '789 Pine Rd',
      city: 'Houston',
      state: 'TX',
      zipCode: '77001',
      latitude: 29.7604,
      longitude: -95.3698
    },
    scopeDescription: 'Maintenance',
    status: JobStatus.Completed,
    priority: Priority.Normal,
    jobType: JobType.PM,
    requiredCrewSize: 1,
    estimatedLaborHours: 6,
    scheduledStartDate: new Date('2024-01-15T08:00:00'),
    scheduledEndDate: new Date('2024-01-15T17:00:00'),
    requiredSkills: [
      { id: 'skill-1', name: 'Fiber Splicing', category: 'Installation', level: SkillLevel.Advanced }
    ],
    notes: [],
    attachments: [
      {
        id: 'attach-1',
        fileName: 'document.pdf',
        fileSize: 1024,
        fileType: 'application/pdf',
        blobUrl: 'https://example.com/document.pdf',
        uploadedBy: 'user-1',
        uploadedAt: new Date()
      }
    ],
    market: 'DALLAS',
    company: 'TestCompany',
    createdBy: 'user-1',
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-03')
  };

  const mockState: JobState = {
    ids: ['job-1', 'job-2', 'job-3'],
    entities: {
      'job-1': mockJob1,
      'job-2': mockJob2,
      'job-3': mockJob3
    },
    selectedId: null,
    loading: false,
    error: null,
    filters: {}
  };

  const mockAdminUser: User = new User(
    'admin-1',
    'Admin User',
    'admin@example.com',
    'password',
    'Admin',
    'RG',
    'Company A',
    new Date(),
    true
  );

  const mockCMUser: User = new User(
    'cm-1',
    'CM User',
    'cm@example.com',
    'password',
    'CM',
    'TX',
    'Company A',
    new Date(),
    true
  );

  const mockPMUser: User = new User(
    'pm-1',
    'PM User',
    'pm@example.com',
    'password',
    'PM',
    'TX',
    'Company A',
    new Date(),
    true
  );

  const mockTechnicianUser: User = new User(
    'tech-1',
    'Technician User',
    'tech@example.com',
    'password',
    'Technician',
    'TX',
    'Company A',
    new Date(),
    true
  );

  const adminScopes: DataScope[] = [{ scopeType: 'all' }];
  const cmScopes: DataScope[] = [{ scopeType: 'market' }];
  const pmScopes: DataScope[] = [{ scopeType: 'company' }];
  const technicianScopes: DataScope[] = [{ scopeType: 'self' }];

  describe('Basic Selectors', () => {
    it('should select job state', () => {
      const result = JobSelectors.selectJobState.projector(mockState);
      expect(result).toEqual(mockState);
    });

    it('should select all jobs', () => {
      const result = JobSelectors.selectAllJobs.projector(mockState);
      expect(result).toEqual([mockJob1, mockJob2, mockJob3]);
    });

    it('should select job entities', () => {
      const result = JobSelectors.selectJobEntities.projector(mockState);
      expect(result).toEqual(mockState.entities);
    });

    it('should select job by ID', () => {
      const result = JobSelectors.selectJobById('job-1').projector(mockState.entities);
      expect(result).toEqual(mockJob1);
    });

    it('should return undefined for non-existent job ID', () => {
      const result = JobSelectors.selectJobById('non-existent').projector(mockState.entities);
      expect(result).toBeUndefined();
    });

    it('should select selected job ID', () => {
      const stateWithSelection = { ...mockState, selectedId: 'job-1' };
      const result = JobSelectors.selectSelectedJobId.projector(stateWithSelection);
      expect(result).toBe('job-1');
    });

    it('should select selected job', () => {
      const result = JobSelectors.selectSelectedJob.projector(mockState.entities, 'job-1');
      expect(result).toEqual(mockJob1);
    });

    it('should return null when no job is selected', () => {
      const result = JobSelectors.selectSelectedJob.projector(mockState.entities, null);
      expect(result).toBeNull();
    });

    it('should select loading state', () => {
      const result = JobSelectors.selectJobsLoading.projector(mockState);
      expect(result).toBe(false);
    });

    it('should select error state', () => {
      const result = JobSelectors.selectJobsError.projector(mockState);
      expect(result).toBeNull();
    });

    it('should select filters', () => {
      const stateWithFilters = { ...mockState, filters: { status: JobStatus.NotStarted } };
      const result = JobSelectors.selectJobFilters.projector(stateWithFilters);
      expect(result).toEqual({ status: JobStatus.NotStarted });
    });

    it('should select total count', () => {
      const result = JobSelectors.selectJobsTotal.projector(mockState);
      expect(result).toBe(3);
    });

    it('should select job IDs', () => {
      const result = JobSelectors.selectJobIds.projector(mockState);
      expect(result).toEqual(['job-1', 'job-2', 'job-3']);
    });
  });

  describe('Filtered Selectors', () => {
    it('should filter jobs by search term (jobId)', () => {
      const filters = { searchTerm: 'J001' };
      const result = JobSelectors.selectFilteredJobs.projector(
        [mockJob1, mockJob2, mockJob3],
        filters
      );
      expect(result).toEqual([mockJob1]);
    });

    it('should filter jobs by search term (client)', () => {
      const filters = { searchTerm: 'client a' };
      const result = JobSelectors.selectFilteredJobs.projector(
        [mockJob1, mockJob2, mockJob3],
        filters
      );
      expect(result).toEqual([mockJob1, mockJob3]);
    });

    it('should filter jobs by search term (siteName)', () => {
      const filters = { searchTerm: 'beta' };
      const result = JobSelectors.selectFilteredJobs.projector(
        [mockJob1, mockJob2, mockJob3],
        filters
      );
      expect(result).toEqual([mockJob2]);
    });

    it('should filter jobs by search term (scopeDescription)', () => {
      const filters = { searchTerm: 'fiber' };
      const result = JobSelectors.selectFilteredJobs.projector(
        [mockJob1, mockJob2, mockJob3],
        filters
      );
      expect(result).toEqual([mockJob1]);
    });

    it('should filter jobs by status', () => {
      const filters = { status: JobStatus.OnSite };
      const result = JobSelectors.selectFilteredJobs.projector(
        [mockJob1, mockJob2, mockJob3],
        filters
      );
      expect(result).toEqual([mockJob2]);
    });

    it('should filter jobs by priority', () => {
      const filters = { priority: Priority.P1 };
      const result = JobSelectors.selectFilteredJobs.projector(
        [mockJob1, mockJob2, mockJob3],
        filters
      );
      expect(result).toEqual([mockJob1]);
    });

    it('should filter jobs by job type', () => {
      const filters = { jobType: JobType.Decom };
      const result = JobSelectors.selectFilteredJobs.projector(
        [mockJob1, mockJob2, mockJob3],
        filters
      );
      expect(result).toEqual([mockJob2]);
    });

    it('should filter jobs by client', () => {
      const filters = { client: 'Client A' };
      const result = JobSelectors.selectFilteredJobs.projector(
        [mockJob1, mockJob2, mockJob3],
        filters
      );
      expect(result).toEqual([mockJob1, mockJob3]);
    });

    it('should filter jobs by start date', () => {
      const filters = { startDate: new Date('2024-02-01') };
      const result = JobSelectors.selectFilteredJobs.projector(
        [mockJob1, mockJob2, mockJob3],
        filters
      );
      expect(result).toEqual([mockJob1, mockJob2]);
    });

    it('should filter jobs by end date', () => {
      const filters = { endDate: new Date('2024-01-31') };
      const result = JobSelectors.selectFilteredJobs.projector(
        [mockJob1, mockJob2, mockJob3],
        filters
      );
      expect(result).toEqual([mockJob3]);
    });

    it('should apply multiple filters', () => {
      const filters = { client: 'Client A', status: JobStatus.NotStarted };
      const result = JobSelectors.selectFilteredJobs.projector(
        [mockJob1, mockJob2, mockJob3],
        filters
      );
      expect(result).toEqual([mockJob1]);
    });

    it('should return all jobs when no filters applied', () => {
      const filters = {};
      const result = JobSelectors.selectFilteredJobs.projector(
        [mockJob1, mockJob2, mockJob3],
        filters
      );
      expect(result).toEqual([mockJob1, mockJob2, mockJob3]);
    });
  });

  describe('Specialized Selectors', () => {
    it('should select jobs by status', () => {
      const result = JobSelectors.selectJobsByStatus(JobStatus.OnSite).projector(
        [mockJob1, mockJob2, mockJob3]
      );
      expect(result).toEqual([mockJob2]);
    });

    it('should select jobs by priority', () => {
      const result = JobSelectors.selectJobsByPriority(Priority.P1).projector(
        [mockJob1, mockJob2, mockJob3]
      );
      expect(result).toEqual([mockJob1]);
    });

    it('should select jobs by client', () => {
      const result = JobSelectors.selectJobsByClient('Client A').projector(
        [mockJob1, mockJob2, mockJob3]
      );
      expect(result).toEqual([mockJob1, mockJob3]);
    });

    it('should select not started jobs', () => {
      const result = JobSelectors.selectNotStartedJobs.projector(
        [mockJob1, mockJob2, mockJob3]
      );
      expect(result).toEqual([mockJob1]);
    });

    it('should select on site jobs', () => {
      const result = JobSelectors.selectOnSiteJobs.projector(
        [mockJob1, mockJob2, mockJob3]
      );
      expect(result).toEqual([mockJob2]);
    });

    it('should select completed jobs', () => {
      const result = JobSelectors.selectCompletedJobs.projector(
        [mockJob1, mockJob2, mockJob3]
      );
      expect(result).toEqual([mockJob3]);
    });

    it('should select P1 priority jobs', () => {
      const result = JobSelectors.selectP1Jobs.projector(
        [mockJob1, mockJob2, mockJob3]
      );
      expect(result).toEqual([mockJob1]);
    });

    it('should select P2 priority jobs', () => {
      const result = JobSelectors.selectP2Jobs.projector(
        [mockJob1, mockJob2, mockJob3]
      );
      expect(result).toEqual([mockJob2]);
    });

    it('should select active jobs', () => {
      const result = JobSelectors.selectActiveJobs.projector(
        [mockJob1, mockJob2, mockJob3]
      );
      expect(result).toEqual([mockJob1, mockJob2]);
    });

    it('should select jobs with notes', () => {
      const result = JobSelectors.selectJobsWithNotes.projector(
        [mockJob1, mockJob2, mockJob3]
      );
      expect(result).toEqual([mockJob2]);
    });

    it('should select jobs with attachments', () => {
      const result = JobSelectors.selectJobsWithAttachments.projector(
        [mockJob1, mockJob2, mockJob3]
      );
      expect(result).toEqual([mockJob3]);
    });

    it('should select jobs requiring specific skill', () => {
      const result = JobSelectors.selectJobsRequiringSkill('Fiber Splicing').projector(
        [mockJob1, mockJob2, mockJob3]
      );
      expect(result).toEqual([mockJob1, mockJob3]);
    });

    it('should select jobs for map display', () => {
      const result = JobSelectors.selectJobsForMap.projector(
        [mockJob1, mockJob2, mockJob3]
      );
      expect(result.length).toBe(3);
      expect(result[0]).toEqual({
        id: 'job-1',
        jobId: 'J001',
        siteName: 'Site Alpha',
        location: { latitude: 32.7767, longitude: -96.7970, accuracy: 10 },
        status: JobStatus.NotStarted,
        priority: Priority.P1,
        scheduledStartDate: mockJob1.scheduledStartDate
      });
    });

    it('should select today\'s jobs', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const todayJob = { ...mockJob1, scheduledStartDate: today };
      const boundaries = { todayTime: today.getTime(), tomorrowTime: tomorrow.getTime() };
      const result = JobSelectors.selectTodaysJobs.projector([todayJob, mockJob2, mockJob3], boundaries);
      expect(result).toEqual([todayJob]);
    });

    it('should select overdue jobs', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const overdueJob = { ...mockJob1, scheduledStartDate: new Date('2020-01-01') };
      const result = JobSelectors.selectOverdueJobs.projector([overdueJob, mockJob2, mockJob3], today.getTime());
      expect(result).toEqual([overdueJob]);
    });

    it('should select upcoming jobs', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weekFromNow = new Date(today);
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const upcomingJob = { ...mockJob1, scheduledStartDate: tomorrow };
      const boundaries = { todayTime: today.getTime(), weekFromNowTime: weekFromNow.getTime() };
      const result = JobSelectors.selectUpcomingJobs.projector([upcomingJob, mockJob2, mockJob3], boundaries);
      expect(result).toEqual([upcomingJob]);
    });
  });

  describe('Aggregate Selectors', () => {
    it('should count jobs by status', () => {
      const result = JobSelectors.selectJobsCountByStatus.projector(
        [mockJob1, mockJob2, mockJob3]
      );
      expect(result).toEqual({
        [JobStatus.NotStarted]: 1,
        [JobStatus.EnRoute]: 0,
        [JobStatus.OnSite]: 1,
        [JobStatus.Completed]: 1,
        [JobStatus.Issue]: 0,
        [JobStatus.Cancelled]: 0
      });
    });

    it('should count jobs by priority', () => {
      const result = JobSelectors.selectJobsCountByPriority.projector(
        [mockJob1, mockJob2, mockJob3]
      );
      expect(result).toEqual({
        [Priority.P1]: 1,
        [Priority.P2]: 1,
        [Priority.Normal]: 1
      });
    });

    it('should count jobs by client', () => {
      const result = JobSelectors.selectJobsCountByClient.projector(
        [mockJob1, mockJob2, mockJob3]
      );
      expect(result).toEqual({
        'Client A': 2,
        'Client B': 1
      });
    });

    it('should select all unique clients', () => {
      const result = JobSelectors.selectAllUniqueClients.projector(
        [mockJob1, mockJob2, mockJob3]
      );
      expect(result).toEqual(['Client A', 'Client B']);
    });

    it('should group jobs by status', () => {
      const result = JobSelectors.selectJobsGroupedByStatus.projector(
        [mockJob1, mockJob2, mockJob3]
      );
      expect(result[JobStatus.NotStarted]).toEqual([mockJob1]);
      expect(result[JobStatus.OnSite]).toEqual([mockJob2]);
      expect(result[JobStatus.Completed]).toEqual([mockJob3]);
    });

    it('should group jobs by priority', () => {
      const result = JobSelectors.selectJobsGroupedByPriority.projector(
        [mockJob1, mockJob2, mockJob3]
      );
      expect(result[Priority.P1]).toEqual([mockJob1]);
      expect(result[Priority.P2]).toEqual([mockJob2]);
      expect(result[Priority.Normal]).toEqual([mockJob3]);
    });

    it('should group jobs by client', () => {
      const result = JobSelectors.selectJobsGroupedByClient.projector(
        [mockJob1, mockJob2, mockJob3]
      );
      expect(result['Client A']).toEqual([mockJob1, mockJob3]);
      expect(result['Client B']).toEqual([mockJob2]);
    });

    it('should calculate job statistics', () => {
      const nowTime = new Date().getTime();
      const result = JobSelectors.selectJobStatistics.projector(
        [mockJob1, mockJob2, mockJob3],
        nowTime
      );
      expect(result.total).toBe(3);
      expect(result.byStatus[JobStatus.NotStarted]).toBe(1);
      expect(result.byStatus[JobStatus.Completed]).toBe(1);
      expect(result.byPriority[Priority.P1]).toBe(1);
      expect(result.completionRate).toBe(33.33);
    });

    it('should select jobs needing attention', () => {
      const overdueJob = { ...mockJob1, scheduledStartDate: new Date('2020-01-01') };
      const result = JobSelectors.selectJobsNeedingAttention.projector(
        [overdueJob],
        [mockJob1]
      );
      expect(result.count).toBe(2);
      expect(result.overdueCount).toBe(1);
      expect(result.p1Count).toBe(1);
      expect(result.jobs.length).toBe(2);
    });
  });

  describe('View Model Selectors', () => {
    it('should select jobs view model', () => {
      const filters = { status: JobStatus.NotStarted };
      const result = JobSelectors.selectJobsViewModel.projector(
        [mockJob1],
        false,
        null,
        filters,
        3
      );
      expect(result).toEqual({
        jobs: [mockJob1],
        loading: false,
        error: null,
        filters: filters,
        total: 3,
        filteredCount: 1
      });
    });

    it('should handle loading state in view model', () => {
      const result = JobSelectors.selectJobsViewModel.projector(
        [],
        true,
        null,
        {},
        0
      );
      expect(result.loading).toBe(true);
      expect(result.jobs).toEqual([]);
    });

    it('should handle error state in view model', () => {
      const error = 'Failed to load jobs';
      const result = JobSelectors.selectJobsViewModel.projector(
        [],
        false,
        error,
        {},
        0
      );
      expect(result.error).toBe(error);
    });
  });

  describe('Status Selectors', () => {
    it('should check if jobs are loading', () => {
      const result = JobSelectors.selectHasJobsLoading.projector(true);
      expect(result).toBe(true);
    });

    it('should check if jobs have error', () => {
      const result = JobSelectors.selectHasJobsError.projector('Error message');
      expect(result).toBe(true);
    });

    it('should return false when no error', () => {
      const result = JobSelectors.selectHasJobsError.projector(null);
      expect(result).toBe(false);
    });
  });

  describe('Scope-Filtered Selectors', () => {
    describe('selectScopedJobs', () => {
      it('should return all jobs for Admin user', () => {
        const result = JobSelectors.selectScopedJobs(mockAdminUser, adminScopes).projector(
          [mockJob1, mockJob2, mockJob3]
        );
        expect(result).toEqual([mockJob1, mockJob2, mockJob3]);
      });

      it('should return all jobs for CM user (market filtering not yet implemented)', () => {
        spyOn(console, 'warn');
        const result = JobSelectors.selectScopedJobs(mockCMUser, cmScopes).projector(
          [mockJob1, mockJob2, mockJob3]
        );
        expect(result).toEqual([mockJob1, mockJob2, mockJob3]);
        expect(console.warn).toHaveBeenCalled();
      });

      it('should return all jobs for PM user (company filtering not yet implemented)', () => {
        spyOn(console, 'warn');
        const result = JobSelectors.selectScopedJobs(mockPMUser, pmScopes).projector(
          [mockJob1, mockJob2, mockJob3]
        );
        expect(result).toEqual([mockJob1, mockJob2, mockJob3]);
        expect(console.warn).toHaveBeenCalled();
      });

      it('should return empty array for Technician user (self filtering not yet implemented)', () => {
        spyOn(console, 'warn');
        const result = JobSelectors.selectScopedJobs(mockTechnicianUser, technicianScopes).projector(
          [mockJob1, mockJob2, mockJob3]
        );
        expect(result).toEqual([]);
        expect(console.warn).toHaveBeenCalled();
      });

      it('should return empty array for invalid user', () => {
        spyOn(console, 'warn');
        const result = JobSelectors.selectScopedJobs(null as any, adminScopes).projector(
          [mockJob1, mockJob2, mockJob3]
        );
        expect(result).toEqual([]);
      });

      it('should return empty array for empty dataScopes', () => {
        spyOn(console, 'warn');
        const result = JobSelectors.selectScopedJobs(mockAdminUser, []).projector(
          [mockJob1, mockJob2, mockJob3]
        );
        expect(result).toEqual([]);
      });
    });

    describe('selectFilteredScopedJobs', () => {
      it('should apply both scope and UI filters', () => {
        const filters = { status: JobStatus.NotStarted };
        const result = JobSelectors.selectFilteredScopedJobs(mockAdminUser, adminScopes).projector(
          [mockJob1, mockJob2, mockJob3],
          filters
        );
        expect(result).toEqual([mockJob1]);
      });

      it('should apply search filter on scoped jobs', () => {
        const filters = { searchTerm: 'J001' };
        const result = JobSelectors.selectFilteredScopedJobs(mockAdminUser, adminScopes).projector(
          [mockJob1, mockJob2, mockJob3],
          filters
        );
        expect(result).toEqual([mockJob1]);
      });

      it('should apply priority filter on scoped jobs', () => {
        const filters = { priority: Priority.P1 };
        const result = JobSelectors.selectFilteredScopedJobs(mockAdminUser, adminScopes).projector(
          [mockJob1, mockJob2, mockJob3],
          filters
        );
        expect(result).toEqual([mockJob1]);
      });

      it('should apply client filter on scoped jobs', () => {
        const filters = { client: 'Client A' };
        const result = JobSelectors.selectFilteredScopedJobs(mockAdminUser, adminScopes).projector(
          [mockJob1, mockJob2, mockJob3],
          filters
        );
        expect(result).toEqual([mockJob1, mockJob3]);
      });
    });

    describe('selectScopedActiveJobs', () => {
      it('should return active jobs within scope', () => {
        const result = JobSelectors.selectScopedActiveJobs(mockAdminUser, adminScopes).projector(
          [mockJob1, mockJob2, mockJob3]
        );
        expect(result).toEqual([mockJob1, mockJob2]);
      });

      it('should filter out completed jobs', () => {
        const result = JobSelectors.selectScopedActiveJobs(mockAdminUser, adminScopes).projector(
          [mockJob1, mockJob2, mockJob3]
        );
        expect(result).not.toContain(mockJob3);
      });
    });

    describe('selectScopedNotStartedJobs', () => {
      it('should return not started jobs within scope', () => {
        const result = JobSelectors.selectScopedNotStartedJobs(mockAdminUser, adminScopes).projector(
          [mockJob1, mockJob2, mockJob3]
        );
        expect(result).toEqual([mockJob1]);
      });
    });

    describe('selectScopedOverdueJobs', () => {
      it('should return overdue jobs within scope', () => {
        const overdueJob = { ...mockJob1, scheduledStartDate: new Date('2020-01-01') };
        const result = JobSelectors.selectScopedOverdueJobs(mockAdminUser, adminScopes).projector(
          [overdueJob, mockJob2, mockJob3]
        );
        expect(result).toEqual([overdueJob]);
      });

      it('should exclude completed jobs from overdue', () => {
        const overdueCompleted = { ...mockJob3, scheduledStartDate: new Date('2020-01-01') };
        const result = JobSelectors.selectScopedOverdueJobs(mockAdminUser, adminScopes).projector(
          [overdueCompleted, mockJob2]
        );
        expect(result).not.toContain(overdueCompleted);
      });
    });

    describe('selectScopedJobsForMap', () => {
      it('should return jobs with location within scope', () => {
        const result = JobSelectors.selectScopedJobsForMap(mockAdminUser, adminScopes).projector(
          [mockJob1, mockJob2, mockJob3]
        );
        expect(result.length).toBe(3);
        expect(result[0].id).toBe('job-1');
        expect(result[0].location).toEqual({ latitude: 32.7767, longitude: -96.7970, accuracy: 10 });
      });
    });

    describe('selectScopedJobStatistics', () => {
      it('should calculate statistics for scoped jobs', () => {
        const result = JobSelectors.selectScopedJobStatistics(mockAdminUser, adminScopes).projector(
          [mockJob1, mockJob2, mockJob3]
        );
        expect(result.total).toBe(3);
        expect(result.byStatus[JobStatus.NotStarted]).toBe(1);
        expect(result.byStatus[JobStatus.Completed]).toBe(1);
      });
    });

    describe('selectScopedJobsViewModel', () => {
      it('should create view model with scoped data', () => {
        const filters = { status: JobStatus.NotStarted };
        const result = JobSelectors.selectScopedJobsViewModel(mockAdminUser, adminScopes).projector(
          [mockJob1],
          false,
          null,
          filters,
          [mockJob1, mockJob2, mockJob3]
        );
        expect(result.jobs).toEqual([mockJob1]);
        expect(result.total).toBe(3);
        expect(result.filteredCount).toBe(1);
      });
    });

    describe('selectCanAccessJob', () => {
      it('should allow Admin to access any job', () => {
        const result = JobSelectors.selectCanAccessJob('job-1', mockAdminUser, adminScopes).projector(
          mockJob1
        );
        expect(result).toBe(true);
      });

      it('should allow CM to access job (market check not yet implemented)', () => {
        spyOn(console, 'warn');
        const result = JobSelectors.selectCanAccessJob('job-1', mockCMUser, cmScopes).projector(
          mockJob1
        );
        expect(result).toBe(true);
        expect(console.warn).toHaveBeenCalled();
      });

      it('should allow PM to access job (company check not yet implemented)', () => {
        spyOn(console, 'warn');
        const result = JobSelectors.selectCanAccessJob('job-1', mockPMUser, pmScopes).projector(
          mockJob1
        );
        expect(result).toBe(true);
        expect(console.warn).toHaveBeenCalled();
      });

      it('should deny Technician access by default', () => {
        spyOn(console, 'warn');
        const result = JobSelectors.selectCanAccessJob('job-1', mockTechnicianUser, technicianScopes).projector(
          mockJob1
        );
        expect(result).toBe(false);
        expect(console.warn).toHaveBeenCalled();
      });

      it('should return false for null job', () => {
        const result = JobSelectors.selectCanAccessJob('non-existent', mockAdminUser, adminScopes).projector(
          undefined
        );
        expect(result).toBe(false);
      });
    });

    describe('selectScopedTodaysJobs', () => {
      it('should return today\'s jobs within scope', () => {
        const today = new Date();
        const todayJob = { ...mockJob1, scheduledStartDate: today };
        const result = JobSelectors.selectScopedTodaysJobs(mockAdminUser, adminScopes).projector(
          [todayJob, mockJob2, mockJob3]
        );
        expect(result).toEqual([todayJob]);
      });
    });

    describe('selectScopedUpcomingJobs', () => {
      it('should return upcoming jobs within scope', () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const upcomingJob = { ...mockJob1, scheduledStartDate: tomorrow };
        const result = JobSelectors.selectScopedUpcomingJobs(mockAdminUser, adminScopes).projector(
          [upcomingJob, mockJob2, mockJob3]
        );
        expect(result).toEqual([upcomingJob]);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty job list', () => {
      const result = JobSelectors.selectAllJobs.projector({
        ...mockState,
        ids: [],
        entities: {}
      });
      expect(result).toEqual([]);
    });

    it('should handle null selectedId', () => {
      const result = JobSelectors.selectSelectedJob.projector(mockState.entities, null);
      expect(result).toBeNull();
    });

    it('should handle empty filters', () => {
      const result = JobSelectors.selectFilteredJobs.projector(
        [mockJob1, mockJob2, mockJob3],
        {}
      );
      expect(result.length).toBe(3);
    });

    it('should handle jobs with no required skills', () => {
      const result = JobSelectors.selectJobsRequiringSkill('Fiber Splicing').projector(
        [mockJob2]
      );
      expect(result).toEqual([]);
    });

    it('should handle jobs with no notes', () => {
      const result = JobSelectors.selectJobsWithNotes.projector(
        [mockJob1, mockJob3]
      );
      expect(result).toEqual([]);
    });

    it('should handle jobs with no attachments', () => {
      const result = JobSelectors.selectJobsWithAttachments.projector(
        [mockJob1, mockJob2]
      );
      expect(result).toEqual([]);
    });

    it('should handle empty search term', () => {
      const filters = { searchTerm: '' };
      const result = JobSelectors.selectFilteredJobs.projector(
        [mockJob1, mockJob2, mockJob3],
        filters
      );
      expect(result.length).toBe(3);
    });

    it('should handle case-insensitive search', () => {
      const filters = { searchTerm: 'CLIENT A' };
      const result = JobSelectors.selectFilteredJobs.projector(
        [mockJob1, mockJob2, mockJob3],
        filters
      );
      expect(result).toEqual([mockJob1, mockJob3]);
    });

    it('should handle jobs with no location', () => {
      const jobWithoutLocation = { ...mockJob1, siteAddress: { ...mockJob1.siteAddress, latitude: undefined, longitude: undefined } };
      const result = JobSelectors.selectJobsForMap.projector(
        [jobWithoutLocation]
      );
      expect(result).toEqual([]);
    });
  });

  describe('Memoization Behavior', () => {
    it('should memoize selector results', () => {
      const selector = JobSelectors.selectAllJobs;
      const result1 = selector.projector(mockState);
      const result2 = selector.projector(mockState);
      expect(result1).toBe(result2);
    });

    it('should recompute when input changes', () => {
      const selector = JobSelectors.selectFilteredJobs;
      const filters1 = { status: JobStatus.NotStarted };
      const filters2 = { status: JobStatus.Completed };
      
      const result1 = selector.projector([mockJob1, mockJob2, mockJob3], filters1);
      const result2 = selector.projector([mockJob1, mockJob2, mockJob3], filters2);
      
      expect(result1).not.toEqual(result2);
      expect(result1.length).toBe(1);
      expect(result2.length).toBe(1);
    });

    it('should memoize complex selectors', () => {
      const selector = JobSelectors.selectJobStatistics;
      const jobs = [mockJob1, mockJob2, mockJob3];
      
      const result1 = selector.projector(jobs);
      const result2 = selector.projector(jobs);
      
      expect(result1).toBe(result2);
    });
  });
});
