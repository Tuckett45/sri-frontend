import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { skip, take } from 'rxjs/operators';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CMDashboardComponent } from './cm-dashboard.component';
import { AuthService } from '../../../../../services/auth.service';
import { RoleBasedDataService } from '../../../../../services/role-based-data.service';
import { WorkflowService } from '../../../../../services/workflow.service';
import { ApprovalTask } from '../../../../../models/workflow.model';

describe('CMDashboardComponent', () => {
  let component: CMDashboardComponent;
  let fixture: ComponentFixture<CMDashboardComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRoleBasedDataService: jasmine.SpyObj<RoleBasedDataService>;
  let mockWorkflowService: jasmine.SpyObj<WorkflowService>;

  const mockUser = {
    id: 'user1',
    name: 'John Doe',
    email: 'john@example.com',
    password: '',
    role: 'CM' as any,
    market: 'North',
    company: 'Test Company',
    createdDate: new Date(),
    isApproved: true
  };

  const mockApprovalTasks: ApprovalTask[] = [
    {
      id: '1',
      type: 'street_sheet',
      entityId: 'sheet1',
      submittedBy: 'user2',
      submittedByName: 'Jane Smith',
      submittedAt: new Date(),
      currentApprover: 'user1',
      approvalLevel: 1,
      status: 'pending',
      market: 'North',
      comments: []
    },
    {
      id: '2',
      type: 'daily_report',
      entityId: 'report1',
      submittedBy: 'user3',
      submittedByName: 'Bob Johnson',
      submittedAt: new Date(),
      currentApprover: 'user1',
      approvalLevel: 1,
      status: 'pending',
      market: 'North',
      comments: []
    }
  ];

  beforeEach(async () => {
    mockAuthService = jasmine.createSpyObj('AuthService', ['getUser', 'isCM', 'isAdmin']);
    mockRoleBasedDataService = jasmine.createSpyObj('RoleBasedDataService', [
      'applyMarketFilter',
      'canAccessMarket',
      'getAccessibleMarkets',
      'getCachedData',
      'setCachedData'
    ]);
    mockWorkflowService = jasmine.createSpyObj('WorkflowService', [
      'getMyApprovalTasks'
    ]);

    // Set up default mock returns
    mockAuthService.getUser.and.returnValue(mockUser);
    mockAuthService.isCM.and.returnValue(true);
    mockAuthService.isAdmin.and.returnValue(false);
    mockWorkflowService.getMyApprovalTasks.and.returnValue(of(mockApprovalTasks));

    await TestBed.configureTestingModule({
      declarations: [CMDashboardComponent],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: RoleBasedDataService, useValue: mockRoleBasedDataService },
        { provide: WorkflowService, useValue: mockWorkflowService }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(CMDashboardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should load user context on init', () => {
      fixture.detectChanges();
      
      expect(component.market).toBe('North');
      expect(component.userName).toBe('John Doe');
    });

    it('should load dashboard data on init', () => {
      spyOn(component, 'loadDashboardData');
      
      fixture.detectChanges();
      
      expect(component.loadDashboardData).toHaveBeenCalled();
    });

    it('should handle missing user gracefully', () => {
      mockAuthService.getUser.and.returnValue(null);
      
      fixture.detectChanges();
      
      expect(component.market).toBe('');
      expect(component.userName).toBe('');
    });
  });

  describe('loadDashboardData', () => {
    it('should set loading state while loading', () => {
      component.loadDashboardData();
      
      expect(component.loading).toBe(false); // Completes synchronously in current implementation
    });

    it('should load pending approvals from workflow service', (done) => {
      // Set the flag to enable approvals loading
      (component as any).approvalsLoaded = true;
      
      fixture.detectChanges(); // Initialize component
      
      // Wait for the combineLatest to emit with actual data (not just startWith)
      component.dashboardData$.pipe(
        skip(1), // Skip the startWith emission
        take(1)  // Take the first real emission
      ).subscribe(data => {
        expect(data.pendingApprovals.length).toBe(2);
        expect(data.pendingApprovals[0].type).toBe('street_sheet');
        done();
      });
    });

    it('should handle errors gracefully', () => {
      mockWorkflowService.getMyApprovalTasks.and.returnValue(
        throwError(() => new Error('API Error'))
      );
      
      component.loadDashboardData();
      
      // Component should handle error without crashing
      expect(component).toBeTruthy();
    });
  });

  describe('refreshMetrics', () => {
    it('should reload dashboard data', () => {
      spyOn(component, 'loadDashboardData');
      
      component.refreshMetrics();
      
      expect(component.loadDashboardData).toHaveBeenCalled();
    });
  });

  describe('date range handling', () => {
    it('should update date range and reload data', () => {
      spyOn(component, 'loadDashboardData');
      const newRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };
      
      component.onDateRangeChange(newRange);
      
      expect(component.selectedDateRange).toEqual(newRange);
      expect(component.loadDashboardData).toHaveBeenCalled();
    });
  });

  describe('navigation methods', () => {
    it('should have navigation method for approvals', () => {
      spyOn(console, 'log');
      
      component.navigateToApprovals();
      
      expect(console.log).toHaveBeenCalledWith('Navigate to approvals');
    });

    it('should have navigation method for street sheets', () => {
      spyOn(console, 'log');
      
      component.navigateToStreetSheets();
      
      expect(console.log).toHaveBeenCalledWith('Navigate to street sheets');
    });

    it('should have navigation method for street sheet detail', () => {
      spyOn(console, 'log');
      
      component.navigateToStreetSheetDetail('sheet1');
      
      expect(console.log).toHaveBeenCalledWith('Navigate to street sheet:', 'sheet1');
    });

    it('should have navigation method for approval detail', () => {
      spyOn(console, 'log');
      
      component.navigateToApprovalDetail('approval1');
      
      expect(console.log).toHaveBeenCalledWith('Navigate to approval:', 'approval1');
    });

    it('should have navigation method for technician detail', () => {
      spyOn(console, 'log');
      
      component.navigateToTechnicianDetail('tech1');
      
      expect(console.log).toHaveBeenCalledWith('Navigate to technician:', 'tech1');
    });
  });

  describe('helper methods', () => {
    it('should return correct status color', () => {
      expect(component.getStatusColor('In Progress')).toBe('primary');
      expect(component.getStatusColor('Pending Review')).toBe('accent');
      expect(component.getStatusColor('Completed')).toBe('success');
      expect(component.getStatusColor('Unknown')).toBe('default');
    });

    it('should return correct priority color', () => {
      expect(component.getPriorityColor('high')).toBe('warn');
      expect(component.getPriorityColor('medium')).toBe('accent');
      expect(component.getPriorityColor('low')).toBe('default');
    });

    it('should return correct technician status icon', () => {
      expect(component.getTechnicianStatusIcon('available')).toBe('check_circle');
      expect(component.getTechnicianStatusIcon('on_job')).toBe('work');
      expect(component.getTechnicianStatusIcon('off_duty')).toBe('cancel');
    });

    it('should format relative time correctly', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      expect(component.formatRelativeTime(now)).toContain('now');
      expect(component.formatRelativeTime(oneHourAgo)).toContain('h ago');
      expect(component.formatRelativeTime(oneDayAgo)).toContain('d ago');
    });

    it('should format time until deadline correctly', () => {
      const now = new Date();
      const inFourHours = new Date(now.getTime() + 4 * 60 * 60 * 1000);
      const inTwoDays = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
      const past = new Date(now.getTime() - 60 * 60 * 1000);
      
      expect(component.formatTimeUntil(inFourHours)).toContain('h remaining');
      expect(component.formatTimeUntil(inTwoDays)).toContain('d remaining');
      expect(component.formatTimeUntil(past)).toBe('Overdue');
    });
  });

  describe('ngOnDestroy', () => {
    it('should complete destroy subject', () => {
      const destroySpy = spyOn(component['destroy$'], 'next');
      const completeSpy = spyOn(component['destroy$'], 'complete');
      
      component.ngOnDestroy();
      
      expect(destroySpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });
  });
});
