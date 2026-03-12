import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Technician, TechnicianRole, EmploymentType, SkillLevel, CertificationStatus, Skill, Certification, Availability } from '../models/technician.model';
import { Job, JobType, Priority, JobStatus, Address, ContactInfo, JobNote, Attachment } from '../models/job.model';
import { Crew, CrewStatus } from '../models/crew.model';
import { TimeEntry, GeoLocation } from '../models/time-entry.model';
import { Assignment, AssignmentStatus } from '../models/assignment.model';
import { DashboardMetrics, KPI, Trend, KPIStatus, ActivityItem, TechnicianUtilization, UtilizationReport, TechnicianPerformance, PerformanceReport } from '../models/reporting.model';
import { loadTechniciansSuccess } from '../state/technicians/technician.actions';
import { loadJobsSuccess } from '../state/jobs/job.actions';
import { loadCrewsSuccess } from '../state/crews/crew.actions';
import { clockInSuccess } from '../state/time-entries/time-entry.actions';
import { loadAssignmentsSuccess } from '../state/assignments/assignment.actions';
import { loadDashboardSuccess, loadKPIsSuccess, loadUtilizationSuccess, loadJobPerformanceSuccess } from '../state/reporting/reporting.actions';

/**
 * Mock Data Service
 * 
 * Provides comprehensive demo data for all FRM features including:
 * - Technicians with skills, certifications, and locations
 * - Jobs with various statuses and priorities
 * - Crews with members and assignments
 * - Time entries for timecard testing
 * - Assignments linking technicians/crews to jobs
 * - Geographic data for map visualization
 * 
 * This service populates the NgRx store with realistic data for demos.
 */
@Injectable({
  providedIn: 'root'
})
export class MockDataService {
  constructor(private store: Store) {}

  /**
   * Initialize all mock data
   */
  initializeAllMockData(): void {
    console.log('Initializing mock data for demo...');
    
    const technicians = this.generateTechnicians();
    const jobs = this.generateJobs();
    const crews = this.generateCrews(technicians);
    const timeEntries = this.generateTimeEntries(technicians, jobs);
    const assignments = this.generateAssignments(technicians, crews, jobs);
    const reportingData = this.generateReportingData(technicians, jobs, timeEntries, assignments);

    // Dispatch to store with correct action names (plural)
    this.store.dispatch(loadTechniciansSuccess({ technicians }));
    this.store.dispatch(loadJobsSuccess({ jobs }));
    this.store.dispatch(loadCrewsSuccess({ crews }));
    this.store.dispatch(loadAssignmentsSuccess({ assignments }));

    // Dispatch time entries individually using clockInSuccess
    timeEntries.forEach(entry => {
      this.store.dispatch(clockInSuccess({ timeEntry: entry }));
    });

    // Dispatch reporting data
    this.store.dispatch(loadDashboardSuccess({ dashboard: reportingData.dashboard }));
    this.store.dispatch(loadKPIsSuccess({ kpis: reportingData.kpis }));
    this.store.dispatch(loadUtilizationSuccess({ utilization: reportingData.utilization }));
    this.store.dispatch(loadJobPerformanceSuccess({ performance: reportingData.performance }));

    console.log(`Mock data initialized: ${technicians.length} technicians, ${jobs.length} jobs, ${crews.length} crews, ${timeEntries.length} time entries, ${assignments.length} assignments, reporting metrics loaded`);
  }

  /**
   * Generate mock technicians with realistic data
   */
  private generateTechnicians(): Technician[] {
    const skillTemplates = [
      { id: 's1', name: 'Fiber Optic Installation', category: 'Installation', level: SkillLevel.Expert },
      { id: 's2', name: 'Copper Cable Installation', category: 'Installation', level: SkillLevel.Advanced },
      { id: 's3', name: 'Network Configuration', category: 'Configuration', level: SkillLevel.Intermediate },
      { id: 's4', name: 'Troubleshooting', category: 'Maintenance', level: SkillLevel.Expert },
      { id: 's5', name: 'Equipment Testing', category: 'Testing', level: SkillLevel.Advanced },
      { id: 's6', name: 'Safety Compliance', category: 'Safety', level: SkillLevel.Expert }
    ];

    const certificationTemplates = [
      { id: 'c1', name: 'OSHA 10', issueDate: new Date('2023-01-15'), expirationDate: new Date('2026-01-15'), status: CertificationStatus.Active },
      { id: 'c2', name: 'Fiber Optic Technician', issueDate: new Date('2022-06-01'), expirationDate: new Date('2025-06-01'), status: CertificationStatus.Active },
      { id: 'c3', name: 'Network+ Certification', issueDate: new Date('2023-03-20'), expirationDate: new Date('2026-03-20'), status: CertificationStatus.Active }
    ];

    const locations = [
      { latitude: 32.7767, longitude: -96.7970 }, // Dallas
      { latitude: 32.8207, longitude: -96.8722 }, // Irving
      { latitude: 32.9537, longitude: -96.8236 }, // Plano
      { latitude: 32.7357, longitude: -97.1081 }, // Fort Worth
      { latitude: 33.0198, longitude: -96.6989 }, // McKinney
      { latitude: 32.6099, longitude: -96.8489 }, // Duncanville
      { latitude: 32.9126, longitude: -96.9778 }, // Carrollton
      { latitude: 32.8551, longitude: -96.9489 }, // Farmers Branch
      { latitude: 32.9483, longitude: -96.7299 }, // Richardson
      { latitude: 32.8140, longitude: -96.9489 }  // Grand Prairie
    ];

    const technicians: Technician[] = [];
    const firstNames = ['John', 'Sarah', 'Michael', 'Emily', 'David', 'Jessica', 'Robert', 'Amanda', 'James', 'Lisa'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
    const roles = [TechnicianRole.Lead, TechnicianRole.Level3, TechnicianRole.Level2, TechnicianRole.Level1, TechnicianRole.Installer];

    for (let i = 0; i < 15; i++) {
      const firstName = firstNames[i % firstNames.length];
      const lastName = lastNames[Math.floor(i / firstNames.length) % lastNames.length];
      const location = locations[i % locations.length];
      const techId = `tech-${i + 1}`;
      
      const availability: Availability[] = [];
      for (let d = 0; d < 14; d++) {
        const date = new Date();
        date.setDate(date.getDate() + d);
        availability.push({
          id: `avail-${techId}-${d}`,
          technicianId: techId,
          date,
          isAvailable: Math.random() > 0.2,
          reason: Math.random() > 0.8 ? 'Training' : undefined
        });
      }

      const skills: Skill[] = skillTemplates.slice(0, 2 + (i % 4)).map(s => ({
        ...s,
        verifiedDate: new Date('2023-01-01')
      }));

      const certifications: Certification[] = certificationTemplates.slice(0, 1 + (i % 3));

      technicians.push({
        id: techId,
        technicianId: `T${1000 + i}`,
        firstName,
        lastName,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@company.com`,
        phone: `214-555-${String(1000 + i).padStart(4, '0')}`,
        role: roles[i % roles.length],
        employmentType: i % 3 === 0 ? EmploymentType.Contractor1099 : EmploymentType.W2,
        homeBase: i < 5 ? 'Dallas' : i < 10 ? 'Irving' : 'Fort Worth',
        region: i < 5 ? 'North Dallas' : i < 10 ? 'South Dallas' : 'Fort Worth',
        skills,
        certifications,
        availability,
        hourlyCostRate: 45 + (i % 5) * 5,
        isActive: i % 10 !== 9,
        currentLocation: {
          latitude: location.latitude + (Math.random() - 0.5) * 0.1,
          longitude: location.longitude + (Math.random() - 0.5) * 0.1,
          accuracy: 10,
          timestamp: new Date()
        },
        createdAt: new Date(2020 + (i % 4), i % 12, 1),
        updatedAt: new Date()
      });
    }

    return technicians;
  }

  /**
   * Generate mock jobs with various statuses and priorities
   */
  private generateJobs(): Job[] {
    const jobs: Job[] = [];
    const jobTypes = [JobType.Install, JobType.Decom, JobType.SiteSurvey, JobType.PM];
    const customers = ['AT&T', 'Verizon', 'Spectrum', 'Frontier', 'CenturyLink', 'Cox Communications'];
    const statuses = [JobStatus.NotStarted, JobStatus.EnRoute, JobStatus.OnSite, JobStatus.Completed, JobStatus.Issue];
    const priorities = [Priority.P1, Priority.P2, Priority.Normal];
    
    const locations = [
      { lat: 32.7767, lng: -96.7970, name: 'Downtown Dallas Office Building' },
      { lat: 32.8207, lng: -96.8722, name: 'Irving Business Park' },
      { lat: 32.9537, lng: -96.8236, name: 'Plano Tech Center' },
      { lat: 32.7357, lng: -97.1081, name: 'Fort Worth Distribution Center' },
      { lat: 33.0198, lng: -96.6989, name: 'McKinney Residential Complex' },
      { lat: 32.6099, lng: -96.8489, name: 'Duncanville Shopping Center' },
      { lat: 32.9126, lng: -96.9778, name: 'Carrollton Medical Facility' },
      { lat: 32.8551, lng: -96.9489, name: 'Farmers Branch Corporate HQ' },
      { lat: 32.9483, lng: -96.7299, name: 'Richardson Data Center' },
      { lat: 32.8140, lng: -96.9489, name: 'Grand Prairie Warehouse' },
      { lat: 32.7555, lng: -96.8089, name: 'Oak Cliff Community Center' },
      { lat: 32.8998, lng: -96.7704, name: 'Addison Office Complex' },
      { lat: 32.8484, lng: -96.7514, name: 'University Park Residence' },
      { lat: 32.7876, lng: -96.8089, name: 'Love Field Airport Area' },
      { lat: 32.9756, lng: -96.7028, name: 'Allen Retail Center' }
    ];

    for (let i = 0; i < 25; i++) {
      const location = locations[i % locations.length];
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + (i % 7) - 2);
      scheduledDate.setHours(8 + (i % 8), 0, 0, 0);
      const endDate = new Date(scheduledDate.getTime() + 4 * 60 * 60 * 1000);

      const siteAddress: Address = {
        street: `${100 + i * 50} ${['Main', 'Oak', 'Elm', 'Pine', 'Maple'][i % 5]} St`,
        city: ['Dallas', 'Irving', 'Plano', 'Fort Worth', 'McKinney'][i % 5],
        state: 'TX',
        zipCode: `75${String(200 + i).padStart(3, '0')}`,
        latitude: location.lat,
        longitude: location.lng
      };

      const customerPOC: ContactInfo = {
        name: 'John Doe',
        phone: '555-1234',
        email: 'john.doe@customer.com'
      };

      jobs.push({
        id: `job-${i + 1}`,
        jobId: `JOB-${String(5000 + i).padStart(5, '0')}`,
        client: customers[i % customers.length],
        siteName: location.name,
        siteAddress,
        jobType: jobTypes[i % jobTypes.length],
        priority: priorities[i % priorities.length],
        status: statuses[i % statuses.length],
        scopeDescription: `Complete ${jobTypes[i % jobTypes.length]} at ${location.name}. Includes site assessment, installation, testing, and documentation.`,
        requiredSkills: [], // Empty array for now
        requiredCrewSize: 1 + (i % 3),
        estimatedLaborHours: 4 + (i % 4) * 2,
        scheduledStartDate: scheduledDate,
        scheduledEndDate: endDate,
        actualStartDate: i % 3 === 0 ? scheduledDate : undefined,
        actualEndDate: i % 5 === 0 ? new Date(scheduledDate.getTime() + 5 * 60 * 60 * 1000) : undefined,
        customerPOC: i % 2 === 0 ? customerPOC : undefined,
        attachments: [],
        notes: [],
        market: 'Dallas-Fort Worth',
        company: 'SRI',
        createdBy: 'dispatcher@company.com',
        createdAt: new Date(Date.now() - (7 - i % 7) * 24 * 60 * 60 * 1000),
        updatedAt: new Date()
      });
    }

    return jobs;
  }

  /**
   * Generate mock crews with members
   */
  private generateCrews(technicians: Technician[]): Crew[] {
    const crews: Crew[] = [];
    const crewNames = ['Alpha Team', 'Bravo Squad', 'Charlie Crew', 'Delta Force', 'Echo Unit'];

    for (let i = 0; i < 5; i++) {
      const leadTech = technicians[i * 3];
      const members = technicians.slice(i * 3, i * 3 + 3).map(tech => tech.id);
      
      crews.push({
        id: `crew-${i + 1}`,
        name: crewNames[i],
        leadTechnicianId: leadTech.id,
        memberIds: members,
        market: 'Dallas-Fort Worth',
        company: 'SRI',
        status: i % 3 === 0 ? CrewStatus.Available : i % 3 === 1 ? CrewStatus.OnJob : CrewStatus.Unavailable,
        currentLocation: leadTech.currentLocation,
        activeJobId: i % 3 === 1 ? `job-${i + 1}` : undefined,
        createdAt: new Date(2023, i, 1),
        updatedAt: new Date()
      });
    }

    return crews;
  }

  /**
   * Generate mock time entries for timecard testing
   */
  private generateTimeEntries(technicians: Technician[], jobs: Job[]): TimeEntry[] {
    const entries: TimeEntry[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Generate entries for the past 7 days
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const date = new Date(today);
      date.setDate(date.getDate() - dayOffset);

      // Create entries for first 10 technicians
      for (let techIndex = 0; techIndex < 10; techIndex++) {
        const tech = technicians[techIndex];
        const job = jobs[techIndex % jobs.length];

        // Morning entry
        const clockInTime = new Date(date);
        clockInTime.setHours(8, 0, 0, 0);
        const clockOutTime = new Date(date);
        clockOutTime.setHours(12, 0, 0, 0);

        const clockInLocation: GeoLocation = {
          latitude: job.siteAddress.latitude!,
          longitude: job.siteAddress.longitude!,
          accuracy: 10,
          timestamp: clockInTime
        };

        const clockOutLocation: GeoLocation = {
          latitude: job.siteAddress.latitude!,
          longitude: job.siteAddress.longitude!,
          accuracy: 10,
          timestamp: clockOutTime
        };

        entries.push({
          id: `entry-${entries.length + 1}`,
          technicianId: tech.id,
          jobId: job.id,
          clockInTime,
          clockOutTime: dayOffset === 0 ? undefined : clockOutTime, // Current day has no clock out
          clockInLocation,
          clockOutLocation: dayOffset === 0 ? undefined : clockOutLocation,
          totalHours: dayOffset === 0 ? undefined : 4,
          regularHours: dayOffset === 0 ? undefined : 4,
          overtimeHours: 0,
          mileage: 10 + (techIndex % 5) * 5,
          breakMinutes: 0,
          isManuallyAdjusted: false,
          isLocked: dayOffset > 7, // Lock entries older than 7 days
          createdAt: clockInTime,
          updatedAt: clockOutTime
        });

        // Afternoon entry (only for completed days)
        if (dayOffset > 0) {
          const lunchEnd = new Date(date);
          lunchEnd.setHours(13, 0, 0, 0);
          const dayEnd = new Date(date);
          dayEnd.setHours(17, 0, 0, 0);

          entries.push({
            id: `entry-${entries.length + 1}`,
            technicianId: tech.id,
            jobId: job.id,
            clockInTime: lunchEnd,
            clockOutTime: dayEnd,
            clockInLocation: {
              latitude: job.siteAddress.latitude!,
              longitude: job.siteAddress.longitude!,
              accuracy: 10,
              timestamp: lunchEnd
            },
            clockOutLocation: {
              latitude: job.siteAddress.latitude!,
              longitude: job.siteAddress.longitude!,
              accuracy: 10,
              timestamp: dayEnd
            },
            totalHours: 4,
            regularHours: 4,
            overtimeHours: 0,
            mileage: 5,
            breakMinutes: 0,
            isManuallyAdjusted: false,
            isLocked: dayOffset > 7, // Lock entries older than 7 days
            createdAt: lunchEnd,
            updatedAt: dayEnd
          });
        }
      }
    }

    return entries;
  }

  /**
   * Generate mock expenses for timecard testing
   */
  private generateExpenses(timeEntries: TimeEntry[], jobs: Job[]): any[] {
    const expenses: any[] = [];
    const expenseTypes = ['mileage', 'meals', 'lodging', 'materials', 'tools', 'parking'];
    
    // Generate expenses for some time entries
    timeEntries.forEach((entry, index) => {
      // Add expenses to about 40% of entries
      if (index % 5 < 2) {
        const job = jobs.find(j => j.id === entry.jobId);
        if (!job) return;
        
        // Mileage expense (most common)
        if (entry.mileage && entry.mileage > 0) {
          expenses.push({
            id: `expense-${expenses.length + 1}`,
            timeEntryId: entry.id,
            jobId: entry.jobId,
            technicianId: entry.technicianId,
            type: 'mileage',
            amount: entry.mileage * 0.655, // IRS mileage rate
            currency: 'USD',
            date: entry.clockInTime,
            description: `Mileage for ${job.client}`,
            category: 'Travel',
            isReimbursable: true,
            reimbursementStatus: 'pending',
            createdAt: entry.clockInTime,
            updatedAt: entry.clockInTime
          });
        }
        
        // Meals expense (for longer jobs)
        if (entry.totalHours && entry.totalHours >= 6) {
          expenses.push({
            id: `expense-${expenses.length + 1}`,
            timeEntryId: entry.id,
            jobId: entry.jobId,
            technicianId: entry.technicianId,
            type: 'meals',
            amount: 15 + Math.random() * 20, // $15-35
            currency: 'USD',
            date: entry.clockInTime,
            description: 'Lunch',
            category: 'Meals',
            isReimbursable: true,
            reimbursementStatus: 'pending',
            createdAt: entry.clockInTime,
            updatedAt: entry.clockInTime
          });
        }
        
        // Occasional parking/tolls
        if (index % 10 === 0) {
          expenses.push({
            id: `expense-${expenses.length + 1}`,
            timeEntryId: entry.id,
            jobId: entry.jobId,
            technicianId: entry.technicianId,
            type: 'parking',
            amount: 5 + Math.random() * 15, // $5-20
            currency: 'USD',
            date: entry.clockInTime,
            description: 'Parking',
            category: 'Travel',
            isReimbursable: true,
            reimbursementStatus: 'pending',
            createdAt: entry.clockInTime,
            updatedAt: entry.clockInTime
          });
        }
      }
    });
    
    return expenses;
  }

  /**
   * Generate mock assignments linking technicians/crews to jobs
   */
  private generateAssignments(technicians: Technician[], crews: Crew[], jobs: Job[]): Assignment[] {
    const assignments: Assignment[] = [];

    // Assign first 15 jobs to technicians
    for (let i = 0; i < 15; i++) {
      const tech = technicians[i % technicians.length];
      const job = jobs[i];

      assignments.push({
        id: `assignment-${i + 1}`,
        jobId: job.id,
        technicianId: tech.id,
        assignedBy: 'dispatcher@company.com',
        assignedAt: job.createdAt,
        status: job.status === JobStatus.Completed ? AssignmentStatus.Completed : 
                job.status === JobStatus.OnSite ? AssignmentStatus.InProgress :
                AssignmentStatus.Assigned,
        isActive: job.status !== JobStatus.Completed && job.status !== JobStatus.Cancelled,
        startTime: job.actualStartDate,
        endTime: job.actualEndDate
      });
    }

    // Assign next 5 jobs to crews (via lead technician)
    for (let i = 0; i < 5; i++) {
      const crew = crews[i];
      const job = jobs[15 + i];

      assignments.push({
        id: `assignment-${15 + i + 1}`,
        jobId: job.id,
        technicianId: crew.leadTechnicianId,
        assignedBy: 'dispatcher@company.com',
        assignedAt: job.createdAt,
        status: crew.status === CrewStatus.OnJob ? AssignmentStatus.InProgress : AssignmentStatus.Assigned,
        isActive: crew.status === CrewStatus.OnJob,
        startTime: job.actualStartDate
      });
    }

    return assignments;
  }

  /**
   * Generate mock reporting/analytics data
   */
  private generateReportingData(technicians: Technician[], jobs: Job[], timeEntries: TimeEntry[], assignments: Assignment[]): {
    dashboard: DashboardMetrics;
    kpis: KPI[];
    utilization: UtilizationReport;
    performance: PerformanceReport;
  } {
    // Calculate job statistics
    const jobsByStatus: Record<JobStatus, number> = {
      [JobStatus.NotStarted]: jobs.filter(j => j.status === JobStatus.NotStarted).length,
      [JobStatus.EnRoute]: jobs.filter(j => j.status === JobStatus.EnRoute).length,
      [JobStatus.OnSite]: jobs.filter(j => j.status === JobStatus.OnSite).length,
      [JobStatus.Completed]: jobs.filter(j => j.status === JobStatus.Completed).length,
      [JobStatus.Issue]: jobs.filter(j => j.status === JobStatus.Issue).length,
      [JobStatus.Cancelled]: jobs.filter(j => j.status === JobStatus.Cancelled).length
    };

    const completedJobs = jobsByStatus[JobStatus.Completed];
    const totalJobs = jobs.length;
    const completionRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;

    // Calculate utilization
    const totalEstimatedHours = jobs.reduce((sum, job) => sum + job.estimatedLaborHours, 0);
    const totalWorkedHours = timeEntries.reduce((sum, entry) => sum + (entry.totalHours || 0), 0);
    const availableTechnicians = technicians.filter(t => t.isActive).length;
    const utilizationRate = totalEstimatedHours > 0 ? (totalWorkedHours / totalEstimatedHours) * 100 : 0;

    // Generate KPIs
    const kpis: KPI[] = [
      {
        name: 'Job Completion Rate',
        value: Math.round(completionRate),
        target: 85,
        unit: '%',
        trend: completionRate >= 85 ? Trend.Up : completionRate >= 75 ? Trend.Stable : Trend.Down,
        status: completionRate >= 85 ? KPIStatus.OnTrack : completionRate >= 75 ? KPIStatus.AtRisk : KPIStatus.BelowTarget
      },
      {
        name: 'Technician Utilization',
        value: Math.round(utilizationRate),
        target: 80,
        unit: '%',
        trend: utilizationRate >= 80 ? Trend.Up : utilizationRate >= 70 ? Trend.Stable : Trend.Down,
        status: utilizationRate >= 80 ? KPIStatus.OnTrack : utilizationRate >= 70 ? KPIStatus.AtRisk : KPIStatus.BelowTarget
      },
      {
        name: 'On-Time Completion',
        value: 92,
        target: 90,
        unit: '%',
        trend: Trend.Up,
        status: KPIStatus.OnTrack
      },
      {
        name: 'Average Job Duration',
        value: 4.2,
        target: 4.0,
        unit: 'hrs',
        trend: Trend.Stable,
        status: KPIStatus.AtRisk
      },
      {
        name: 'Active Technicians',
        value: availableTechnicians,
        target: 15,
        unit: 'techs',
        trend: Trend.Stable,
        status: KPIStatus.OnTrack
      },
      {
        name: 'Jobs Requiring Attention',
        value: jobsByStatus[JobStatus.Issue],
        target: 0,
        unit: 'jobs',
        trend: jobsByStatus[JobStatus.Issue] > 2 ? Trend.Up : Trend.Down,
        status: jobsByStatus[JobStatus.Issue] === 0 ? KPIStatus.OnTrack : jobsByStatus[JobStatus.Issue] <= 2 ? KPIStatus.AtRisk : KPIStatus.BelowTarget
      }
    ];

    // Generate recent activity
    const recentActivity: ActivityItem[] = [
      {
        id: 'act-1',
        type: 'Job Completed',
        description: 'John Smith completed JOB-05003',
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        userId: 'tech-1'
      },
      {
        id: 'act-2',
        type: 'Technician Assigned',
        description: 'Sarah Johnson assigned to JOB-05010',
        timestamp: new Date(Date.now() - 45 * 60 * 1000),
        userId: 'tech-2'
      },
      {
        id: 'act-3',
        type: 'Job Started',
        description: 'Michael Williams started JOB-05007',
        timestamp: new Date(Date.now() - 60 * 60 * 1000),
        userId: 'tech-3'
      },
      {
        id: 'act-4',
        type: 'Issue Reported',
        description: 'Equipment issue reported on JOB-05015',
        timestamp: new Date(Date.now() - 90 * 60 * 1000),
        userId: 'tech-5'
      },
      {
        id: 'act-5',
        type: 'Job Completed',
        description: 'Emily Brown completed JOB-05001',
        timestamp: new Date(Date.now() - 120 * 60 * 1000),
        userId: 'tech-4'
      }
    ];

    // Dashboard metrics
    const dashboard: DashboardMetrics = {
      totalActiveJobs: jobs.filter(j => j.status !== JobStatus.Completed && j.status !== JobStatus.Cancelled).length,
      totalAvailableTechnicians: availableTechnicians,
      jobsByStatus,
      averageUtilization: Math.round(utilizationRate),
      jobsRequiringAttention: jobs.filter(j => j.status === JobStatus.Issue).slice(0, 5),
      recentActivity,
      kpis
    };

    // Technician utilization report
    const technicianUtilizations: TechnicianUtilization[] = technicians.slice(0, 10).map((tech, index) => {
      const techTimeEntries = timeEntries.filter(te => te.technicianId === tech.id);
      const workedHours = techTimeEntries.reduce((sum, te) => sum + (te.totalHours || 0), 0);
      const availableHours = 40; // Standard work week
      const jobsCompleted = jobs.filter(j => 
        j.status === JobStatus.Completed && 
        j.actualEndDate && 
        assignments.some(a => a.technicianId === tech.id && a.jobId === j.id)
      ).length;

      return {
        technician: tech,
        availableHours,
        workedHours,
        utilizationRate: availableHours > 0 ? (workedHours / availableHours) * 100 : 0,
        jobsCompleted
      };
    });

    const utilization: UtilizationReport = {
      dateRange: {
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endDate: new Date()
      },
      technicians: technicianUtilizations,
      averageUtilization: technicianUtilizations.reduce((sum, tu) => sum + tu.utilizationRate, 0) / technicianUtilizations.length
    };

    // Job performance report
    const topPerformers: TechnicianPerformance[] = technicians.slice(0, 5).map((tech, index) => {
      const techJobs = jobs.filter(j => 
        j.status === JobStatus.Completed && 
        assignments.some(a => a.technicianId === tech.id && a.jobId === j.id)
      );
      const techTimeEntries = timeEntries.filter(te => te.technicianId === tech.id);
      const totalHours = techTimeEntries.reduce((sum, te) => sum + (te.totalHours || 0), 0);

      return {
        technician: tech,
        jobsCompleted: techJobs.length,
        totalHours,
        averageJobDuration: techJobs.length > 0 ? totalHours / techJobs.length : 0,
        onTimeCompletionRate: 90 + (index * 2) // Mock data: 90%, 92%, 94%, 96%, 98%
      };
    });

    const jobsByType: Record<JobType, number> = {
      [JobType.Install]: jobs.filter(j => j.jobType === JobType.Install).length,
      [JobType.Decom]: jobs.filter(j => j.jobType === JobType.Decom).length,
      [JobType.SiteSurvey]: jobs.filter(j => j.jobType === JobType.SiteSurvey).length,
      [JobType.PM]: jobs.filter(j => j.jobType === JobType.PM).length
    };

    const performance: PerformanceReport = {
      dateRange: {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date()
      },
      totalJobsCompleted: completedJobs,
      totalJobsOpen: jobs.filter(j => j.status !== JobStatus.Completed && j.status !== JobStatus.Cancelled).length,
      averageLaborHours: totalJobs > 0 ? totalEstimatedHours / totalJobs : 0,
      scheduleAdherence: 88, // Mock: 88% schedule adherence
      jobsByType,
      topPerformers
    };

    return {
      dashboard,
      kpis,
      utilization,
      performance
    };
  }

}
