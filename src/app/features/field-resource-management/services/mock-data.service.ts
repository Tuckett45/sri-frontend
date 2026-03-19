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
import { Material, MaterialCategory, Supplier, PurchaseOrder, PurchaseOrderStatus, PurchaseOrderItem, ReorderRecommendation, ReorderUrgency } from '../models/material.model';
import { loadMaterialsSuccess, loadSuppliersSuccess, loadPurchaseOrdersSuccess, loadReorderRecommendationsSuccess } from '../state/materials/materials.actions';
import { TravelProfile, GeocodingStatus, Address as TravelAddress } from '../models/travel.model';
import { loadAllTravelProfilesSuccess } from '../state/travel/travel.actions';
import { InventoryItem, InventoryCategory, InventoryStatus, LocationType } from '../models/inventory.model';
import { loadInventorySuccess } from '../state/inventory/inventory.actions';
import { JobBudget, BudgetStatus, BudgetAdjustment, BudgetDeduction } from '../models/budget.model';
import { loadBudgetsSuccess, loadAdjustmentHistorySuccess, loadDeductionHistorySuccess } from '../state/budgets/budget.actions';

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

    // Generate and dispatch materials data
    const materialsData = this.generateMaterialsData();
    this.store.dispatch(loadMaterialsSuccess({ materials: materialsData.materials }));
    this.store.dispatch(loadSuppliersSuccess({ suppliers: materialsData.suppliers }));
    this.store.dispatch(loadPurchaseOrdersSuccess({ purchaseOrders: materialsData.purchaseOrders }));
    this.store.dispatch(loadReorderRecommendationsSuccess({ recommendations: materialsData.recommendations }));

    // Generate and dispatch travel data
    const travelProfiles = this.generateTravelData(technicians);
    this.store.dispatch(loadAllTravelProfilesSuccess({ profiles: travelProfiles }));

    // Generate and dispatch inventory data
    const inventoryItems = this.generateInventoryData(technicians, jobs);
    this.store.dispatch(loadInventorySuccess({ items: inventoryItems }));

    // Generate and dispatch budget data
    const budgetData = this.generateBudgetData(jobs, technicians);
    this.store.dispatch(loadBudgetsSuccess({ budgets: budgetData.budgets }));
    budgetData.adjustmentsByJob.forEach((adjustments, jobId) => {
      this.store.dispatch(loadAdjustmentHistorySuccess({ jobId, adjustments }));
    });
    budgetData.deductionsByJob.forEach((deductions, jobId) => {
      this.store.dispatch(loadDeductionHistorySuccess({ jobId, deductions }));
    });

    console.log(`Mock data initialized: ${technicians.length} technicians, ${jobs.length} jobs, ${crews.length} crews, ${timeEntries.length} time entries, ${assignments.length} assignments, ${materialsData.materials.length} materials, ${travelProfiles.length} travel profiles, ${inventoryItems.length} inventory items, ${budgetData.budgets.length} budgets, reporting metrics loaded`);
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

  /**
   * Generate mock materials, suppliers, purchase orders, and reorder recommendations
   */
  private generateMaterialsData(): {
    materials: Material[];
    suppliers: Supplier[];
    purchaseOrders: PurchaseOrder[];
    recommendations: ReorderRecommendation[];
  } {
    const now = new Date();

    const suppliers: Supplier[] = [
      {
        id: 'sup-1', name: 'Graybar Electric', contactName: 'Mike Thompson',
        email: 'mike.t@graybar.com', phone: '800-555-0101',
        address: { street: '1400 Commerce Dr', city: 'Dallas', state: 'TX', postalCode: '75201' },
        automationEnabled: true, apiEndpoint: 'https://api.graybar.com/v2', apiKey: null,
        leadTimeDays: 3, minimumOrderAmount: 250, createdAt: now, updatedAt: now
      },
      {
        id: 'sup-2', name: 'Anixter International', contactName: 'Sarah Chen',
        email: 'sarah.c@anixter.com', phone: '800-555-0202',
        address: { street: '2700 Patriot Blvd', city: 'Glenview', state: 'IL', postalCode: '60026' },
        automationEnabled: false, apiEndpoint: null, apiKey: null,
        leadTimeDays: 5, minimumOrderAmount: 500, createdAt: now, updatedAt: now
      },
      {
        id: 'sup-3', name: 'WESCO Distribution', contactName: 'James Rivera',
        email: 'james.r@wesco.com', phone: '800-555-0303',
        address: { street: '225 W Station Square Dr', city: 'Pittsburgh', state: 'PA', postalCode: '15219' },
        automationEnabled: true, apiEndpoint: 'https://api.wesco.com/orders', apiKey: null,
        leadTimeDays: 4, minimumOrderAmount: 100, createdAt: now, updatedAt: now
      }
    ];

    const materials: Material[] = [
      { id: 'mat-1', materialNumber: 'FBR-SM-1000', name: 'Single-Mode Fiber Cable', description: '12-strand single-mode OS2 fiber optic cable, indoor/outdoor rated', category: MaterialCategory.Cable, unit: 'ft', currentQuantity: 4500, reorderPoint: 2000, reorderQuantity: 5000, unitCost: 0.85, preferredSupplierId: 'sup-1', alternateSupplierIds: ['sup-2'], lastOrderDate: new Date(now.getTime() - 15 * 86400000), lastReceivedDate: new Date(now.getTime() - 12 * 86400000), createdAt: now, updatedAt: now },
      { id: 'mat-2', materialNumber: 'FBR-MM-500', name: 'Multi-Mode Fiber Cable', description: '6-strand multi-mode OM4 fiber optic cable', category: MaterialCategory.Cable, unit: 'ft', currentQuantity: 1200, reorderPoint: 1500, reorderQuantity: 3000, unitCost: 0.65, preferredSupplierId: 'sup-1', alternateSupplierIds: ['sup-3'], lastOrderDate: new Date(now.getTime() - 30 * 86400000), lastReceivedDate: new Date(now.getTime() - 25 * 86400000), createdAt: now, updatedAt: now },
      { id: 'mat-3', materialNumber: 'CAT6A-1000', name: 'Cat6A Ethernet Cable', description: 'Category 6A shielded twisted pair, plenum rated', category: MaterialCategory.Cable, unit: 'ft', currentQuantity: 8200, reorderPoint: 3000, reorderQuantity: 10000, unitCost: 0.42, preferredSupplierId: 'sup-2', alternateSupplierIds: ['sup-1'], lastOrderDate: new Date(now.getTime() - 10 * 86400000), lastReceivedDate: new Date(now.getTime() - 5 * 86400000), createdAt: now, updatedAt: now },
      { id: 'mat-4', materialNumber: 'SC-APC-100', name: 'SC/APC Fiber Connectors', description: 'SC/APC single-mode connectors, pre-polished, 100-pack', category: MaterialCategory.Connectors, unit: 'ea', currentQuantity: 340, reorderPoint: 200, reorderQuantity: 500, unitCost: 3.25, preferredSupplierId: 'sup-1', alternateSupplierIds: [], lastOrderDate: new Date(now.getTime() - 20 * 86400000), lastReceivedDate: new Date(now.getTime() - 17 * 86400000), createdAt: now, updatedAt: now },
      { id: 'mat-5', materialNumber: 'LC-UPC-50', name: 'LC/UPC Duplex Connectors', description: 'LC/UPC duplex connectors for multi-mode, 50-pack', category: MaterialCategory.Connectors, unit: 'ea', currentQuantity: 85, reorderPoint: 100, reorderQuantity: 200, unitCost: 4.50, preferredSupplierId: 'sup-3', alternateSupplierIds: ['sup-1'], lastOrderDate: new Date(now.getTime() - 45 * 86400000), lastReceivedDate: new Date(now.getTime() - 40 * 86400000), createdAt: now, updatedAt: now },
      { id: 'mat-6', materialNumber: 'RACK-42U', name: '42U Server Rack', description: '42U 19-inch server rack enclosure with cable management', category: MaterialCategory.Hardware, unit: 'ea', currentQuantity: 6, reorderPoint: 3, reorderQuantity: 5, unitCost: 1250.00, preferredSupplierId: 'sup-2', alternateSupplierIds: ['sup-3'], lastOrderDate: new Date(now.getTime() - 60 * 86400000), lastReceivedDate: new Date(now.getTime() - 55 * 86400000), createdAt: now, updatedAt: now },
      { id: 'mat-7', materialNumber: 'PATCH-1M', name: 'Fiber Patch Cords 1m', description: 'SC/APC to LC/UPC single-mode patch cord, 1 meter', category: MaterialCategory.Cable, unit: 'ea', currentQuantity: 150, reorderPoint: 100, reorderQuantity: 300, unitCost: 8.75, preferredSupplierId: 'sup-1', alternateSupplierIds: [], lastOrderDate: new Date(now.getTime() - 8 * 86400000), lastReceivedDate: new Date(now.getTime() - 5 * 86400000), createdAt: now, updatedAt: now },
      { id: 'mat-8', materialNumber: 'SPLICE-KIT', name: 'Fusion Splice Kit', description: 'Fiber optic fusion splice protection sleeves, 100-pack', category: MaterialCategory.Consumables, unit: 'box', currentQuantity: 12, reorderPoint: 10, reorderQuantity: 25, unitCost: 45.00, preferredSupplierId: 'sup-3', alternateSupplierIds: ['sup-1'], lastOrderDate: new Date(now.getTime() - 35 * 86400000), lastReceivedDate: new Date(now.getTime() - 30 * 86400000), createdAt: now, updatedAt: now },
      { id: 'mat-9', materialNumber: 'CLEAN-KIT', name: 'Fiber Cleaning Kit', description: 'One-click fiber optic connector cleaner, 500 uses', category: MaterialCategory.Consumables, unit: 'ea', currentQuantity: 3, reorderPoint: 5, reorderQuantity: 10, unitCost: 32.00, preferredSupplierId: 'sup-1', alternateSupplierIds: [], lastOrderDate: new Date(now.getTime() - 50 * 86400000), lastReceivedDate: new Date(now.getTime() - 47 * 86400000), createdAt: now, updatedAt: now },
      { id: 'mat-10', materialNumber: 'LABEL-500', name: 'Cable Labels', description: 'Self-laminating cable labels, 500 per roll', category: MaterialCategory.Consumables, unit: 'roll', currentQuantity: 18, reorderPoint: 8, reorderQuantity: 20, unitCost: 22.50, preferredSupplierId: 'sup-2', alternateSupplierIds: [], lastOrderDate: new Date(now.getTime() - 25 * 86400000), lastReceivedDate: new Date(now.getTime() - 20 * 86400000), createdAt: now, updatedAt: now },
      { id: 'mat-11', materialNumber: 'MOUNT-BRKT', name: 'Wall Mount Brackets', description: 'Indoor fiber distribution wall mount bracket', category: MaterialCategory.Hardware, unit: 'ea', currentQuantity: 22, reorderPoint: 15, reorderQuantity: 30, unitCost: 18.00, preferredSupplierId: 'sup-3', alternateSupplierIds: ['sup-2'], lastOrderDate: new Date(now.getTime() - 18 * 86400000), lastReceivedDate: new Date(now.getTime() - 14 * 86400000), createdAt: now, updatedAt: now },
      { id: 'mat-12', materialNumber: 'RJ45-CAT6', name: 'RJ45 Cat6 Connectors', description: 'Shielded RJ45 connectors for Cat6/6A, 100-pack', category: MaterialCategory.Connectors, unit: 'ea', currentQuantity: 520, reorderPoint: 300, reorderQuantity: 500, unitCost: 0.95, preferredSupplierId: 'sup-2', alternateSupplierIds: ['sup-1'], lastOrderDate: new Date(now.getTime() - 12 * 86400000), lastReceivedDate: new Date(now.getTime() - 8 * 86400000), createdAt: now, updatedAt: now }
    ];

    // Build recommendations from low-stock materials
    const recommendations: ReorderRecommendation[] = materials
      .filter(m => m.currentQuantity <= m.reorderPoint)
      .map(m => {
        const supplier = suppliers.find(s => s.id === m.preferredSupplierId);
        const ratio = m.reorderPoint > 0 ? m.currentQuantity / m.reorderPoint : 0;
        let urgency: ReorderUrgency;
        if (m.currentQuantity === 0) urgency = ReorderUrgency.Critical;
        else if (ratio <= 0.5) urgency = ReorderUrgency.High;
        else if (ratio <= 0.8) urgency = ReorderUrgency.Medium;
        else urgency = ReorderUrgency.Low;

        return {
          materialId: m.id,
          materialName: m.name,
          currentQuantity: m.currentQuantity,
          reorderPoint: m.reorderPoint,
          recommendedQuantity: m.reorderQuantity,
          supplierId: m.preferredSupplierId,
          supplierName: supplier?.name || 'Unknown',
          estimatedCost: m.reorderQuantity * m.unitCost,
          urgency
        };
      });

    const purchaseOrders: PurchaseOrder[] = [
      {
        id: 'po-1', poNumber: 'PO-2026-001', supplierId: 'sup-1', supplierName: 'Graybar Electric',
        items: [
          { materialId: 'mat-1', materialName: 'Single-Mode Fiber Cable', quantity: 5000, unitCost: 0.85, totalCost: 4250 },
          { materialId: 'mat-4', materialName: 'SC/APC Fiber Connectors', quantity: 500, unitCost: 3.25, totalCost: 1625 }
        ],
        totalAmount: 5875, status: PurchaseOrderStatus.Ordered,
        orderDate: new Date(now.getTime() - 5 * 86400000), expectedDeliveryDate: new Date(now.getTime() + 2 * 86400000),
        actualDeliveryDate: null, createdBy: 'user-1', createdByName: 'John Smith',
        createdAt: new Date(now.getTime() - 5 * 86400000), updatedAt: now
      },
      {
        id: 'po-2', poNumber: 'PO-2026-002', supplierId: 'sup-3', supplierName: 'WESCO Distribution',
        items: [
          { materialId: 'mat-8', materialName: 'Fusion Splice Kit', quantity: 25, unitCost: 45.00, totalCost: 1125 }
        ],
        totalAmount: 1125, status: PurchaseOrderStatus.Submitted,
        orderDate: new Date(now.getTime() - 2 * 86400000), expectedDeliveryDate: new Date(now.getTime() + 5 * 86400000),
        actualDeliveryDate: null, createdBy: 'user-2', createdByName: 'Sarah Johnson',
        createdAt: new Date(now.getTime() - 2 * 86400000), updatedAt: now
      },
      {
        id: 'po-3', poNumber: 'PO-2026-003', supplierId: 'sup-2', supplierName: 'Anixter International',
        items: [
          { materialId: 'mat-3', materialName: 'Cat6A Ethernet Cable', quantity: 10000, unitCost: 0.42, totalCost: 4200 },
          { materialId: 'mat-12', materialName: 'RJ45 Cat6 Connectors', quantity: 500, unitCost: 0.95, totalCost: 475 }
        ],
        totalAmount: 4675, status: PurchaseOrderStatus.Received,
        orderDate: new Date(now.getTime() - 15 * 86400000), expectedDeliveryDate: new Date(now.getTime() - 8 * 86400000),
        actualDeliveryDate: new Date(now.getTime() - 7 * 86400000), createdBy: 'user-1', createdByName: 'John Smith',
        createdAt: new Date(now.getTime() - 15 * 86400000), updatedAt: new Date(now.getTime() - 7 * 86400000)
      }
    ];

    return { materials, suppliers, purchaseOrders, recommendations };
  }

  /**
   * Generate mock travel profiles for technicians
   */
  private generateTravelData(technicians: Technician[]): TravelProfile[] {
    const addresses: TravelAddress[] = [
      { street: '1234 Elm St', city: 'Dallas', state: 'TX', postalCode: '75201' },
      { street: '5678 Oak Ave', city: 'Irving', state: 'TX', postalCode: '75038' },
      { street: '910 Pine Rd', city: 'Plano', state: 'TX', postalCode: '75024' },
      { street: '2200 Maple Dr', city: 'Fort Worth', state: 'TX', postalCode: '76102' },
      { street: '3300 Cedar Ln', city: 'McKinney', state: 'TX', postalCode: '75070' },
      { street: '440 Birch Blvd', city: 'Duncanville', state: 'TX', postalCode: '75116' },
      { street: '550 Walnut Way', city: 'Carrollton', state: 'TX', postalCode: '75006' },
      { street: '660 Spruce Ct', city: 'Farmers Branch', state: 'TX', postalCode: '75234' },
      { street: '770 Willow St', city: 'Richardson', state: 'TX', postalCode: '75080' },
      { street: '880 Ash Dr', city: 'Grand Prairie', state: 'TX', postalCode: '75050' },
      { street: '990 Pecan Pl', city: 'Arlington', state: 'TX', postalCode: '76010' },
      { street: '1100 Hickory Rd', city: 'Garland', state: 'TX', postalCode: '75040' },
      { street: '1210 Cypress Ave', city: 'Mesquite', state: 'TX', postalCode: '75149' },
      { street: '1320 Magnolia Blvd', city: 'Denton', state: 'TX', postalCode: '76201' },
      { street: '1430 Poplar Ln', city: 'Lewisville', state: 'TX', postalCode: '75067' }
    ];

    const coords = [
      { latitude: 32.7767, longitude: -96.7970 },
      { latitude: 32.8207, longitude: -96.8722 },
      { latitude: 33.0198, longitude: -96.6989 },
      { latitude: 32.7357, longitude: -97.1081 },
      { latitude: 33.1972, longitude: -96.6150 },
      { latitude: 32.6510, longitude: -96.9083 },
      { latitude: 32.9537, longitude: -96.8900 },
      { latitude: 32.9262, longitude: -96.8961 },
      { latitude: 32.9483, longitude: -96.7299 },
      { latitude: 32.7460, longitude: -96.9978 },
      { latitude: 32.7357, longitude: -97.1081 },
      { latitude: 32.9126, longitude: -96.6389 },
      { latitude: 32.7668, longitude: -96.5992 },
      { latitude: 33.2148, longitude: -97.1331 },
      { latitude: 33.0462, longitude: -96.9942 }
    ];

    return technicians.map((tech, i) => {
      const geocoded = i % 5 !== 4; // 80% geocoded
      const willing = i % 3 !== 2;  // ~67% willing to travel
      const status = geocoded
        ? GeocodingStatus.Success
        : (i % 10 === 9 ? GeocodingStatus.Failed : GeocodingStatus.NotGeocoded);

      return {
        technicianId: tech.id,
        willingToTravel: willing,
        homeAddress: addresses[i % addresses.length],
        homeCoordinates: geocoded ? coords[i % coords.length] : null,
        geocodingStatus: status,
        geocodingError: status === GeocodingStatus.Failed ? 'Address not found' : null,
        lastGeocodedAt: geocoded ? new Date(Date.now() - (i + 1) * 86400000) : null,
        updatedAt: new Date()
      };
    });
  }

  /**
   * Generate mock inventory items (tools, equipment, vehicles, safety gear, test equipment)
   */
  private generateInventoryData(technicians: Technician[], jobs: Job[]): InventoryItem[] {
    const now = new Date();
    const items: InventoryItem[] = [];

    const inventoryDefs: Array<{
      name: string; desc: string; cat: InventoryCategory; unit: number;
      qty: number; minThresh: number; mfr: string; mdl: string; serial: boolean;
    }> = [
      { name: 'Fluke 87V Multimeter', desc: 'Industrial digital multimeter', cat: InventoryCategory.TestEquipment, unit: 389, qty: 8, minThresh: 3, mfr: 'Fluke', mdl: '87V', serial: true },
      { name: 'OTDR Fiber Tester', desc: 'Optical time-domain reflectometer for fiber testing', cat: InventoryCategory.TestEquipment, unit: 12500, qty: 3, minThresh: 1, mfr: 'EXFO', mdl: 'MaxTester 730C', serial: true },
      { name: 'Cable Certifier', desc: 'Cat6/Cat6a cable certification tester', cat: InventoryCategory.TestEquipment, unit: 8750, qty: 4, minThresh: 2, mfr: 'Fluke', mdl: 'DSX-5000', serial: true },
      { name: 'Fusion Splicer', desc: 'Core-alignment fiber fusion splicer', cat: InventoryCategory.Equipment, unit: 15200, qty: 2, minThresh: 1, mfr: 'Fujikura', mdl: '90S+', serial: true },
      { name: 'Bucket Truck #101', desc: '42ft insulated aerial lift truck', cat: InventoryCategory.Vehicles, unit: 85000, qty: 1, minThresh: 0, mfr: 'Altec', mdl: 'AT40G', serial: true },
      { name: 'Bucket Truck #102', desc: '42ft insulated aerial lift truck', cat: InventoryCategory.Vehicles, unit: 85000, qty: 1, minThresh: 0, mfr: 'Altec', mdl: 'AT40G', serial: true },
      { name: 'Service Van #201', desc: 'Ford Transit cargo van, fully outfitted', cat: InventoryCategory.Vehicles, unit: 42000, qty: 1, minThresh: 0, mfr: 'Ford', mdl: 'Transit 250', serial: true },
      { name: 'Service Van #202', desc: 'Ford Transit cargo van, fully outfitted', cat: InventoryCategory.Vehicles, unit: 42000, qty: 1, minThresh: 0, mfr: 'Ford', mdl: 'Transit 250', serial: true },
      { name: 'Service Van #203', desc: 'RAM ProMaster cargo van', cat: InventoryCategory.Vehicles, unit: 38500, qty: 1, minThresh: 0, mfr: 'RAM', mdl: 'ProMaster 2500', serial: true },
      { name: 'Hard Hat (White)', desc: 'ANSI Z89.1 Type I Class E hard hat', cat: InventoryCategory.SafetyGear, unit: 28, qty: 25, minThresh: 10, mfr: 'MSA', mdl: 'V-Gard', serial: false },
      { name: 'Safety Harness', desc: 'Full-body fall protection harness', cat: InventoryCategory.SafetyGear, unit: 185, qty: 12, minThresh: 5, mfr: '3M', mdl: 'DBI-SALA ExoFit', serial: true },
      { name: 'Safety Glasses (Clear)', desc: 'ANSI Z87.1 impact-rated safety glasses', cat: InventoryCategory.SafetyGear, unit: 12, qty: 50, minThresh: 20, mfr: '3M', mdl: 'SecureFit 400', serial: false },
      { name: 'Hi-Vis Vest', desc: 'ANSI Class 2 high-visibility safety vest', cat: InventoryCategory.SafetyGear, unit: 18, qty: 30, minThresh: 10, mfr: 'Ergodyne', mdl: 'GloWear 8210', serial: false },
      { name: 'Cordless Drill Kit', desc: '20V MAX brushless drill/driver kit', cat: InventoryCategory.Tools, unit: 179, qty: 10, minThresh: 4, mfr: 'DeWalt', mdl: 'DCD791D2', serial: true },
      { name: 'Impact Driver', desc: '20V MAX brushless impact driver', cat: InventoryCategory.Tools, unit: 149, qty: 8, minThresh: 3, mfr: 'DeWalt', mdl: 'DCF887', serial: true },
      { name: 'Cable Pulling Kit', desc: 'Fish tape, pull rope, and lubricant set', cat: InventoryCategory.Tools, unit: 245, qty: 6, minThresh: 2, mfr: 'Klein Tools', mdl: '56108', serial: false },
      { name: 'Crimping Tool Set', desc: 'RJ45/RJ11 modular crimping tool with dies', cat: InventoryCategory.Tools, unit: 89, qty: 12, minThresh: 5, mfr: 'Klein Tools', mdl: 'VDV226-110', serial: false },
      { name: 'Fiber Optic Cleaver', desc: 'Precision fiber cleaver for splicer prep', cat: InventoryCategory.Tools, unit: 650, qty: 4, minThresh: 2, mfr: 'Fujikura', mdl: 'CT-08', serial: true },
      { name: 'Portable Generator', desc: '3500W inverter generator', cat: InventoryCategory.Equipment, unit: 1200, qty: 3, minThresh: 1, mfr: 'Honda', mdl: 'EU3000iS', serial: true },
      { name: 'Extension Ladder 28ft', desc: 'Fiberglass extension ladder, 300lb capacity', cat: InventoryCategory.Equipment, unit: 420, qty: 6, minThresh: 2, mfr: 'Werner', mdl: 'D6228-2', serial: false },
      { name: 'Conduit Bender', desc: '1/2" - 1" EMT conduit bender set', cat: InventoryCategory.Tools, unit: 95, qty: 5, minThresh: 2, mfr: 'Klein Tools', mdl: '56207', serial: false },
      { name: 'Tone & Probe Kit', desc: 'Cable tracer and tone generator', cat: InventoryCategory.TestEquipment, unit: 165, qty: 7, minThresh: 3, mfr: 'Fluke', mdl: 'Pro3000', serial: true },
      { name: 'Label Maker', desc: 'Industrial handheld label printer', cat: InventoryCategory.Equipment, unit: 280, qty: 5, minThresh: 2, mfr: 'Brady', mdl: 'BMP21-PLUS', serial: true },
      { name: 'First Aid Kit (Job Site)', desc: 'OSHA-compliant 50-person first aid kit', cat: InventoryCategory.SafetyGear, unit: 65, qty: 8, minThresh: 3, mfr: 'First Aid Only', mdl: '90639', serial: false },
    ];

    const locationPool: Array<{ type: LocationType; id: string; name: string }> = [
      { type: LocationType.Warehouse, id: 'wh-main', name: 'Main Warehouse - Dallas' },
      { type: LocationType.Warehouse, id: 'wh-north', name: 'North Depot - Plano' },
    ];
    technicians.slice(0, 8).forEach(t => {
      locationPool.push({ type: LocationType.Technician, id: t.id, name: `${t.firstName} ${t.lastName}` });
    });
    jobs.slice(0, 5).forEach(j => {
      locationPool.push({ type: LocationType.Job, id: j.id, name: j.siteName.substring(0, 40) });
    });
    locationPool.push({ type: LocationType.Vendor, id: 'vendor-altec', name: 'Altec Service Center' });
    locationPool.push({ type: LocationType.Vendor, id: 'vendor-fluke', name: 'Fluke Calibration Lab' });

    const statuses = [InventoryStatus.Available, InventoryStatus.Assigned, InventoryStatus.InUse, InventoryStatus.Maintenance, InventoryStatus.Retired];

    inventoryDefs.forEach((def, i) => {
      const loc = locationPool[i % locationPool.length];
      const statusIdx = def.cat === InventoryCategory.Vehicles ? (i % 3 === 0 ? 2 : 1) : i % 5;
      const status = statuses[statusIdx];
      const purchaseDate = new Date(now.getTime() - (180 + i * 30) * 86400000);
      const warrantyEnd = def.serial ? new Date(purchaseDate.getTime() + 365 * 3 * 86400000) : null;

      items.push({
        id: `inv-${String(i + 1).padStart(3, '0')}`,
        itemNumber: `INV-${String(1000 + i)}`,
        name: def.name,
        description: def.desc,
        category: def.cat,
        currentLocation: { type: loc.type, id: loc.id, name: loc.name, assignedAt: new Date(now.getTime() - (i + 1) * 3 * 86400000) },
        quantity: def.qty,
        unitCost: def.unit,
        totalValue: def.qty * def.unit,
        minimumThreshold: def.minThresh,
        serialNumber: def.serial ? `SN-${String(100000 + i * 1111)}` : null,
        manufacturer: def.mfr,
        model: def.mdl,
        purchaseDate,
        warrantyExpiration: warrantyEnd,
        status,
        createdAt: purchaseDate,
        updatedAt: new Date(now.getTime() - i * 86400000)
      });
    });

    return items;
  }

  /**
   * Generate mock budget data for all jobs
   */
  private generateBudgetData(jobs: Job[], technicians: Technician[]): {
    budgets: JobBudget[];
    adjustmentsByJob: Map<string, BudgetAdjustment[]>;
    deductionsByJob: Map<string, BudgetDeduction[]>;
  } {
    const budgets: JobBudget[] = [];
    const adjustmentsByJob = new Map<string, BudgetAdjustment[]>();
    const deductionsByJob = new Map<string, BudgetDeduction[]>();
    const now = new Date();

    jobs.forEach((job, i) => {
      const allocated = job.estimatedLaborHours + (i % 3) * 4 + 8;
      let consumed: number;
      let status: BudgetStatus;

      if (i % 5 === 0) {
        consumed = allocated + 2 + (i % 4);
        status = BudgetStatus.OverBudget;
      } else if (i % 5 === 1) {
        consumed = Math.round(allocated * (0.82 + Math.random() * 0.15));
        status = BudgetStatus.Warning;
      } else {
        consumed = Math.round(allocated * (0.3 + Math.random() * 0.4));
        status = BudgetStatus.OnTrack;
      }

      const remaining = allocated - consumed;

      budgets.push({
        id: `budget-${job.id}`,
        jobId: job.id,
        allocatedHours: allocated,
        consumedHours: consumed,
        remainingHours: remaining,
        status,
        createdAt: new Date(now.getTime() - (30 - i) * 86400000),
        updatedAt: now
      });

      if (i % 5 < 2) {
        const adjustments: BudgetAdjustment[] = [];
        const adjCount = 1 + (i % 3);
        for (let a = 0; a < adjCount; a++) {
          const amount = a % 2 === 0 ? 4 + (a * 2) : -(2 + a);
          const prev = allocated - amount;
          const techIdx = i % technicians.length;
          adjustments.push({
            id: `adj-${job.id}-${a}`,
            jobId: job.id,
            amount,
            reason: amount > 0
              ? ['Scope expansion', 'Additional equipment needed', 'Client requested extra work'][a % 3]
              : ['Scope reduction', 'Efficiency improvement'][a % 2],
            adjustedBy: technicians[techIdx].id,
            adjustedByName: `${technicians[techIdx].firstName} ${technicians[techIdx].lastName}`,
            timestamp: new Date(now.getTime() - (15 - a * 3) * 86400000),
            previousBudget: prev,
            newBudget: allocated
          });
        }
        adjustmentsByJob.set(job.id, adjustments);
      }

      if (i % 5 < 3) {
        const deductions: BudgetDeduction[] = [];
        const dedCount = 2 + (i % 3);
        for (let d = 0; d < dedCount; d++) {
          const techIdx = (i + d) % technicians.length;
          deductions.push({
            id: `ded-${job.id}-${d}`,
            jobId: job.id,
            timecardEntryId: `entry-${i * 10 + d + 1}`,
            technicianId: technicians[techIdx].id,
            technicianName: `${technicians[techIdx].firstName} ${technicians[techIdx].lastName}`,
            hoursDeducted: 2 + (d % 4) * 1.5,
            timestamp: new Date(now.getTime() - (10 - d * 2) * 86400000)
          });
        }
        deductionsByJob.set(job.id, deductions);
      }
    });

    return { budgets, adjustmentsByJob, deductionsByJob };
  }

}
