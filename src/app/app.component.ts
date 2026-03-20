import { Component, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { ConfigurationService } from './services/configuration.service';
import { SecureAuthService } from './services/secure-auth.service';
import { DeploymentNotificationIntegratorService } from './features/deployment/services/deployment-notification-integrator.service';
import { AnalyticsService } from './shared/services/analytics.service';
import { environment } from 'src/environments/environments';
import * as TechnicianActions from './features/field-resource-management/state/technicians/technician.actions';
import * as CrewActions from './features/field-resource-management/state/crews/crew.actions';
import * as JobActions from './features/field-resource-management/state/jobs/job.actions';
import * as AssignmentActions from './features/field-resource-management/state/assignments/assignment.actions';
import { Technician, TechnicianRole, EmploymentType, SkillLevel } from './features/field-resource-management/models/technician.model';
import { Crew, CrewStatus } from './features/field-resource-management/models/crew.model';
import { Job, JobType, Priority, JobStatus } from './features/field-resource-management/models/job.model';
import { Assignment, AssignmentStatus } from './features/field-resource-management/models/assignment.model';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: false
})
export class AppComponent {
  title = 'SRI Tools';
  isUserLoggedIn = false;
  showNavbar = false;
  showConfigStatus = !environment.production; // Show config status in development

  private readonly configService = inject(ConfigurationService);
  private readonly authService = inject(SecureAuthService);
  private readonly notificationIntegrator = inject(DeploymentNotificationIntegratorService);
  private readonly analyticsService = inject(AnalyticsService);
  private readonly store = inject(Store);

  constructor(public router: Router) {}

  async ngOnInit(): Promise<void> {
    // Track the route so we can hide the navbar on auth pages
    this.updateNavbarVisibility(this.router.url);
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.updateNavbarVisibility(event.urlAfterRedirects);
      }
    });

    try {
      // Initialize configuration service first
      console.log('🔧 Initializing application...');
      await this.configService.initialize();

      // Initialize auth service after configuration is ready
      console.log('🔐 Initializing authentication...');
      await this.authService.initialize();

      // Initialize analytics service
      console.log('📊 Initializing analytics...');
      this.analyticsService.initialize();

      // Subscribe to authentication state changes
      this.authService.getAuthState().subscribe(authState => {
        console.log('🔐 Auth state changed:', { isAuthenticated: authState.isAuthenticated });
        this.isUserLoggedIn = authState.isAuthenticated;
        this.updateNavbarVisibility(this.router.url);
        
        // Initialize notification integrator when user is logged in
        if (authState.isAuthenticated) {
          this.notificationIntegrator.initialize().catch(error => {
            console.error('Failed to initialize notifications:', error);
          });

          // Track login event and set user properties for analytics
          this.analyticsService.trackLogin();
          
          // Set user properties (no PII - only role and market)
          const user = authState.user;
          if (user) {
            this.analyticsService.setUserProperties({
              user_role: user.role || 'unknown',
              market: user.market || 'unknown'
            });
          }
        } else {
          // Track logout if user was previously logged in
          if (this.isUserLoggedIn) {
            this.analyticsService.trackLogout();
          }
        }
      });

      console.log('✅ Application initialized successfully');
      
      // Load mock data in development mode
      if (!environment.production) {
        this.loadMockData();
      }
    } catch (error) {
      console.error('❌ Failed to initialize application:', error);
      // Application can still function with degraded capabilities
    }
  }

  private loadMockData(): void {
    console.log('📦 Loading mock data for Field Resource Management...');
    
    // Dispatch success actions with mock data
    this.store.dispatch(TechnicianActions.loadTechniciansSuccess({
      technicians: this.getMockTechnicians()
    }));
    
    this.store.dispatch(CrewActions.loadCrewsSuccess({
      crews: this.getMockCrews()
    }));
    
    this.store.dispatch(JobActions.loadJobsSuccess({
      jobs: this.getMockJobs()
    }));
    
    this.store.dispatch(AssignmentActions.loadAssignmentsSuccess({
      assignments: this.getMockAssignments()
    }));
    
    console.log('✅ Mock data loaded successfully');
  }

  private getMockTechnicians(): Technician[] {
    return [
      {
        id: 'tech-001',
        technicianId: 'T-001',
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@example.com',
        phone: '555-0101',
        role: TechnicianRole.Lead,
        employmentType: EmploymentType.W2,
        homeBase: 'Atlanta, GA',
        region: 'Southeast',
        skills: [
          { id: 's1', name: 'Fiber Splicing', category: 'Installation', level: SkillLevel.Expert, verifiedDate: new Date('2023-01-15') },
          { id: 's2', name: 'OTDR Testing', category: 'Testing', level: SkillLevel.Advanced }
        ],
        certifications: [],
        availability: [],
        hourlyCostRate: 75,
        isActive: true,
        canTravel: true,
        currentLocation: { latitude: 33.7490, longitude: -84.3880, accuracy: 10, timestamp: new Date() },
        createdAt: new Date('2023-01-15'),
        updatedAt: new Date()
      },
      {
        id: 'tech-002',
        technicianId: 'T-002',
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah.johnson@example.com',
        phone: '555-0102',
        role: TechnicianRole.Level3,
        employmentType: EmploymentType.W2,
        homeBase: 'Atlanta, GA',
        region: 'Southeast',
        skills: [
          { id: 's3', name: 'Cable Installation', category: 'Installation', level: SkillLevel.Advanced },
          { id: 's4', name: 'Network Testing', category: 'Testing', level: SkillLevel.Intermediate }
        ],
        certifications: [],
        availability: [],
        hourlyCostRate: 65,
        isActive: true,
        canTravel: true,
        currentLocation: { latitude: 33.7550, longitude: -84.3900, accuracy: 15, timestamp: new Date() },
        createdAt: new Date('2023-02-01'),
        updatedAt: new Date()
      },
      {
        id: 'tech-003',
        technicianId: 'T-003',
        firstName: 'Michael',
        lastName: 'Davis',
        email: 'michael.davis@example.com',
        phone: '555-0103',
        role: TechnicianRole.Level2,
        employmentType: EmploymentType.Contractor1099,
        homeBase: 'Atlanta, GA',
        region: 'Southeast',
        skills: [
          { id: 's5', name: 'Fiber Splicing', category: 'Installation', level: SkillLevel.Intermediate },
          { id: 's6', name: 'Equipment Installation', category: 'Installation', level: SkillLevel.Advanced }
        ],
        certifications: [],
        availability: [],
        isActive: true,
        canTravel: false,
        currentLocation: { latitude: 33.7600, longitude: -84.3950, accuracy: 12, timestamp: new Date() },
        createdAt: new Date('2023-03-10'),
        updatedAt: new Date()
      },
      {
        id: 'tech-004',
        technicianId: 'T-004',
        firstName: 'Emily',
        lastName: 'Wilson',
        email: 'emily.wilson@example.com',
        phone: '555-0104',
        role: TechnicianRole.Level3,
        employmentType: EmploymentType.W2,
        homeBase: 'Dallas, TX',
        region: 'Southwest',
        skills: [
          { id: 's7', name: 'Site Survey', category: 'Planning', level: SkillLevel.Expert },
          { id: 's8', name: 'Documentation', category: 'Administrative', level: SkillLevel.Advanced }
        ],
        certifications: [],
        availability: [],
        hourlyCostRate: 70,
        isActive: true,
        canTravel: true,
        currentLocation: { latitude: 32.7767, longitude: -96.7970, accuracy: 8, timestamp: new Date() },
        createdAt: new Date('2023-01-20'),
        updatedAt: new Date()
      },
      {
        id: 'tech-005',
        technicianId: 'T-005',
        firstName: 'Robert',
        lastName: 'Brown',
        email: 'robert.brown@example.com',
        phone: '555-0105',
        role: TechnicianRole.Installer,
        employmentType: EmploymentType.Contractor1099,
        homeBase: 'Dallas, TX',
        region: 'Southwest',
        skills: [
          { id: 's9', name: 'Cable Installation', category: 'Installation', level: SkillLevel.Beginner },
          { id: 's10', name: 'Basic Testing', category: 'Testing', level: SkillLevel.Beginner }
        ],
        certifications: [],
        availability: [],
        isActive: true,
        canTravel: false,
        currentLocation: { latitude: 32.7800, longitude: -96.8000, accuracy: 20, timestamp: new Date() },
        createdAt: new Date('2024-01-05'),
        updatedAt: new Date()
      }
    ];
  }

  private getMockCrews(): Crew[] {
    return [
      {
        id: 'crew-001',
        name: 'Alpha Team',
        leadTechnicianId: 'tech-001',
        memberIds: ['tech-001', 'tech-002', 'tech-003'],
        market: 'Atlanta',
        company: 'INTERNAL',
        status: CrewStatus.Available,
        currentLocation: { latitude: 33.7490, longitude: -84.3880, accuracy: 10, timestamp: new Date() },
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date()
      },
      {
        id: 'crew-002',
        name: 'Beta Team',
        leadTechnicianId: 'tech-004',
        memberIds: ['tech-004', 'tech-005'],
        market: 'Dallas',
        company: 'INTERNAL',
        status: CrewStatus.OnJob,
        activeJobId: 'job-002',
        currentLocation: { latitude: 32.7767, longitude: -96.7970, accuracy: 8, timestamp: new Date() },
        createdAt: new Date('2023-02-15'),
        updatedAt: new Date()
      },
      {
        id: 'crew-003',
        name: 'Gamma Team',
        leadTechnicianId: 'tech-002',
        memberIds: ['tech-002'],
        market: 'Atlanta',
        company: 'INTERNAL',
        status: CrewStatus.Available,
        currentLocation: { latitude: 33.7550, longitude: -84.3900, accuracy: 15, timestamp: new Date() },
        createdAt: new Date('2023-03-01'),
        updatedAt: new Date()
      }
    ];
  }

  private getMockJobs(): Job[] {
    return [
      {
        id: 'job-001',
        jobId: 'J-2024-001',
        client: 'AT&T',
        siteName: 'Downtown Atlanta Fiber Hub',
        siteAddress: {
          street: '123 Peachtree St',
          city: 'Atlanta',
          state: 'GA',
          zipCode: '30303',
          latitude: 33.7490,
          longitude: -84.3880
        },
        jobType: JobType.Install,
        priority: Priority.P1,
        status: JobStatus.NotStarted,
        scopeDescription: 'Install 5km of fiber optic cable and terminate at central hub',
        requiredSkills: [
          { id: 's1', name: 'Fiber Splicing', category: 'Installation', level: SkillLevel.Expert },
          { id: 's2', name: 'OTDR Testing', category: 'Testing', level: SkillLevel.Advanced }
        ],
        requiredCrewSize: 3,
        estimatedLaborHours: 120,
        scheduledStartDate: new Date('2024-03-15'),
        scheduledEndDate: new Date('2024-03-29'),
        customerPOC: {
          name: 'Jane Cooper',
          phone: '555-1001',
          email: 'jane.cooper@att.com'
        },
        attachments: [],
        notes: [],
        market: 'Atlanta',
        company: 'INTERNAL',
        createdBy: 'admin@dev.local',
        createdAt: new Date('2024-02-15'),
        updatedAt: new Date()
      },
      {
        id: 'job-002',
        jobId: 'J-2024-002',
        client: 'Verizon',
        siteName: 'Dallas Business District',
        siteAddress: {
          street: '456 Commerce St',
          city: 'Dallas',
          state: 'TX',
          zipCode: '75201',
          latitude: 32.7767,
          longitude: -96.7970
        },
        jobType: JobType.Install,
        priority: Priority.Normal,
        status: JobStatus.OnSite,
        scopeDescription: 'Install fiber connections for 10 business locations',
        requiredSkills: [
          { id: 's3', name: 'Cable Installation', category: 'Installation', level: SkillLevel.Advanced }
        ],
        requiredCrewSize: 2,
        estimatedLaborHours: 80,
        scheduledStartDate: new Date('2024-03-10'),
        scheduledEndDate: new Date('2024-03-20'),
        actualStartDate: new Date('2024-03-10'),
        customerPOC: {
          name: 'Tom Anderson',
          phone: '555-2001',
          email: 'tom.anderson@verizon.com'
        },
        attachments: [],
        notes: [
          {
            id: 'note-001',
            jobId: 'job-002',
            text: 'Customer requested early start time (7 AM)',
            author: 'admin@dev.local',
            createdAt: new Date('2024-03-09')
          }
        ],
        market: 'Dallas',
        company: 'INTERNAL',
        createdBy: 'admin@dev.local',
        createdAt: new Date('2024-02-20'),
        updatedAt: new Date()
      },
      {
        id: 'job-003',
        jobId: 'J-2024-003',
        client: 'T-Mobile',
        siteName: 'Buckhead Tower Site',
        siteAddress: {
          street: '789 Peachtree Rd',
          city: 'Atlanta',
          state: 'GA',
          zipCode: '30305',
          latitude: 33.8490,
          longitude: -84.3700
        },
        jobType: JobType.SiteSurvey,
        priority: Priority.P2,
        status: JobStatus.NotStarted,
        scopeDescription: 'Conduct site survey for future fiber installation',
        requiredSkills: [
          { id: 's7', name: 'Site Survey', category: 'Planning', level: SkillLevel.Expert }
        ],
        requiredCrewSize: 1,
        estimatedLaborHours: 16,
        scheduledStartDate: new Date('2024-03-18'),
        scheduledEndDate: new Date('2024-03-19'),
        customerPOC: {
          name: 'Lisa Martinez',
          phone: '555-3001',
          email: 'lisa.martinez@t-mobile.com'
        },
        attachments: [],
        notes: [],
        market: 'Atlanta',
        company: 'INTERNAL',
        createdBy: 'admin@dev.local',
        createdAt: new Date('2024-02-25'),
        updatedAt: new Date()
      },
      {
        id: 'job-004',
        jobId: 'J-2024-004',
        client: 'AT&T',
        siteName: 'Midtown Decommission',
        siteAddress: {
          street: '321 10th St',
          city: 'Atlanta',
          state: 'GA',
          zipCode: '30309',
          latitude: 33.7800,
          longitude: -84.3850
        },
        jobType: JobType.Decom,
        priority: Priority.Normal,
        status: JobStatus.Completed,
        scopeDescription: 'Remove old copper infrastructure and clean up site',
        requiredSkills: [],
        requiredCrewSize: 2,
        estimatedLaborHours: 40,
        scheduledStartDate: new Date('2024-03-01'),
        scheduledEndDate: new Date('2024-03-05'),
        actualStartDate: new Date('2024-03-01'),
        actualEndDate: new Date('2024-03-04'),
        customerPOC: {
          name: 'Mark Thompson',
          phone: '555-4001',
          email: 'mark.thompson@att.com'
        },
        attachments: [],
        notes: [],
        market: 'Atlanta',
        company: 'INTERNAL',
        createdBy: 'admin@dev.local',
        createdAt: new Date('2024-02-10'),
        updatedAt: new Date('2024-03-04')
      },
      {
        id: 'job-005',
        jobId: 'J-2024-005',
        client: 'Verizon',
        siteName: 'Airport Corridor PM',
        siteAddress: {
          street: '100 Airport Blvd',
          city: 'Atlanta',
          state: 'GA',
          zipCode: '30320',
          latitude: 33.6407,
          longitude: -84.4277
        },
        jobType: JobType.PM,
        priority: Priority.P2,
        status: JobStatus.NotStarted,
        scopeDescription: 'Preventive maintenance on existing fiber infrastructure',
        requiredSkills: [
          { id: 's2', name: 'OTDR Testing', category: 'Testing', level: SkillLevel.Advanced }
        ],
        requiredCrewSize: 2,
        estimatedLaborHours: 24,
        scheduledStartDate: new Date('2024-03-22'),
        scheduledEndDate: new Date('2024-03-23'),
        customerPOC: {
          name: 'Rachel Green',
          phone: '555-5001',
          email: 'rachel.green@verizon.com'
        },
        attachments: [],
        notes: [],
        market: 'Atlanta',
        company: 'INTERNAL',
        createdBy: 'admin@dev.local',
        createdAt: new Date('2024-03-01'),
        updatedAt: new Date()
      }
    ];
  }

  private getMockAssignments(): Assignment[] {
    return [
      {
        id: 'assign-001',
        jobId: 'job-001',
        technicianId: 'tech-001',
        assignedBy: 'admin@dev.local',
        assignedAt: new Date('2024-03-01'),
        status: AssignmentStatus.Accepted,
        isActive: true
      },
      {
        id: 'assign-002',
        jobId: 'job-001',
        technicianId: 'tech-002',
        assignedBy: 'admin@dev.local',
        assignedAt: new Date('2024-03-01'),
        status: AssignmentStatus.Accepted,
        isActive: true
      },
      {
        id: 'assign-003',
        jobId: 'job-001',
        technicianId: 'tech-003',
        assignedBy: 'admin@dev.local',
        assignedAt: new Date('2024-03-01'),
        status: AssignmentStatus.Assigned,
        isActive: true
      },
      {
        id: 'assign-004',
        jobId: 'job-002',
        technicianId: 'tech-004',
        assignedBy: 'admin@dev.local',
        assignedAt: new Date('2024-03-05'),
        status: AssignmentStatus.InProgress,
        isActive: true,
        startTime: new Date('2024-03-10T07:00:00')
      },
      {
        id: 'assign-005',
        jobId: 'job-002',
        technicianId: 'tech-005',
        assignedBy: 'admin@dev.local',
        assignedAt: new Date('2024-03-05'),
        status: AssignmentStatus.InProgress,
        isActive: true,
        startTime: new Date('2024-03-10T07:00:00')
      },
      {
        id: 'assign-006',
        jobId: 'job-004',
        technicianId: 'tech-002',
        assignedBy: 'admin@dev.local',
        assignedAt: new Date('2024-02-25'),
        status: AssignmentStatus.Completed,
        isActive: false,
        startTime: new Date('2024-03-01T08:00:00'),
        endTime: new Date('2024-03-04T17:00:00')
      }
    ];
  }

  private updateNavbarVisibility(url: string): void {
    const currentUrl = url || '';
    const isAuthRoute = currentUrl.startsWith('/login') || currentUrl.startsWith('/reset-password');
    this.showNavbar = this.isUserLoggedIn && !isAuthRoute;
  }
}
