import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminDashboardComponent } from './admin-dashboard.component';
import { AuthService } from '../../../../../services/auth.service';
import { WorkflowService } from '../../../../../services/workflow.service';
import { UserManagementService } from '../../../../../services/user-management.service';
import { of, throwError } from 'rxjs';
import { skip, take } from 'rxjs/operators';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('AdminDashboardComponent', () => {
  let component: AdminDashboardComponent;
  let fixture: ComponentFixture<AdminDashboardComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockWorkflowService: jasmine.SpyObj<WorkflowService>;
  let mockUserManagementService: jasmine.SpyObj<UserManagementService>;

  beforeEach(async () => {
    mockAuthService = jasmine.createSpyObj('AuthService', [
      'isAdmin',
      'getUser',
      'approveUser',
      'rejectUser',
      'getLoginStatus'
    ]);
    mockWorkflowService = jasmine.createSpyObj('WorkflowService', [
      'getAllApprovalTasks'
    ]);
    mockUserManagementService = jasmine.createSpyObj('UserManagementService', [
      'getUsers'
    ]);

    // Default mock implementations
    mockAuthService.isAdmin.and.returnValue(true);
    mockAuthService.getUser.and.returnValue({
      id: 'admin-1',
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'Admin',
      market: 'All'
    });
    mockAuthService.getLoginStatus.and.returnValue(of(true));
    mockWorkflowService.getAllApprovalTasks.and.returnValue(of([]));
    mockUserManagementService.getUsers.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      declarations: [AdminDashboardComponent],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: WorkflowService, useValue: mockWorkflowService },
        { provide: UserManagementService, useValue: mockUserManagementService }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminDashboardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should verify admin access on init', () => {
    fixture.detectChanges();
    expect(mockAuthService.isAdmin).toHaveBeenCalled();
  });

  it('should set error message if user is not admin', () => {
    mockAuthService.isAdmin.and.returnValue(false);
    fixture.detectChanges();
    expect(component.error).toBe('Access denied. Admin privileges required.');
  });

  it('should load dashboard data on init for admin user', () => {
    fixture.detectChanges();
    expect(component.dashboardData$).toBeDefined();
  });

  it('should load pending user approvals', (done) => {
    const mockUsers = [
      {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'CM',
        market: 'North',
        createdDate: new Date(),
        password: '',
        company: '',
        isApproved: false
      }
    ];
    mockUserManagementService.getUsers.and.returnValue(of(mockUsers));

    // Enable user approvals loading
    (component as any).userApprovalsLoaded = true;
    
    fixture.detectChanges();

    // Skip the first emission from startWith() and take only the second emission with actual data
    component.dashboardData$.pipe(
      skip(1), // Skip the empty startWith emission
      take(1)  // Take only the first real emission
    ).subscribe(data => {
      expect(data.pendingUserApprovals.length).toBe(1);
      expect(data.pendingUserApprovals[0].name).toBe('Test User');
      done();
    });
  });

  it('should load escalated approvals', (done) => {
    const mockApprovals = [
      {
        id: 'approval-1',
        type: 'street_sheet' as const,
        entityId: 'entity-1',
        submittedBy: 'user-1',
        submittedByName: 'Test User',
        submittedAt: new Date(),
        currentApprover: 'admin-1',
        approvalLevel: 2,
        status: 'escalated' as const,
        market: 'North',
        comments: []
      }
    ];
    mockWorkflowService.getAllApprovalTasks.and.returnValue(of(mockApprovals));

    // Enable escalated approvals loading
    (component as any).escalatedApprovalsLoaded = true;
    
    fixture.detectChanges();

    // Skip the first emission from startWith() and take only the second emission with actual data
    component.dashboardData$.pipe(
      skip(1), // Skip the empty startWith emission
      take(1)  // Take only the first real emission
    ).subscribe(data => {
      expect(data.escalatedApprovals.length).toBe(1);
      expect(data.escalatedApprovals[0].status).toBe('escalated');
      done();
    });
  });

  it('should filter by market', () => {
    spyOn(component, 'loadDashboardData');
    component.filterByMarket('North');
    expect(component.selectedMarket).toBe('North');
    expect(component.loadDashboardData).toHaveBeenCalled();
  });

  it('should refresh metrics', () => {
    spyOn(component, 'loadDashboardData');
    component.refreshMetrics();
    expect(component.loadDashboardData).toHaveBeenCalled();
  });

  it('should approve user', () => {
    mockAuthService.approveUser.and.returnValue(of({}));
    spyOn(component, 'loadDashboardData');

    component.approveUser('user-1');

    expect(mockAuthService.approveUser).toHaveBeenCalledWith('user-1');
    expect(component.loadDashboardData).toHaveBeenCalled();
  });

  it('should reject user', () => {
    mockAuthService.rejectUser.and.returnValue(of({}));
    spyOn(component, 'loadDashboardData');

    component.rejectUser('user-1', 'Test reason');

    expect(mockAuthService.rejectUser).toHaveBeenCalledWith('user-1', 'Test reason');
    expect(component.loadDashboardData).toHaveBeenCalled();
  });

  it('should handle error when approving user fails', () => {
    mockAuthService.approveUser.and.returnValue(throwError(() => new Error('API error')));

    component.approveUser('user-1');

    expect(component.error).toBe('Failed to approve user');
  });

  it('should handle error when rejecting user fails', () => {
    mockAuthService.rejectUser.and.returnValue(throwError(() => new Error('API error')));

    component.rejectUser('user-1', 'Test reason');

    expect(component.error).toBe('Failed to reject user');
  });

  it('should get correct utilization color', () => {
    expect(component.getUtilizationColor(85)).toBe('success');
    expect(component.getUtilizationColor(70)).toBe('accent');
    expect(component.getUtilizationColor(50)).toBe('warn');
  });

  it('should get correct market performance indicator', () => {
    expect(component.getMarketPerformanceIndicator(85)).toBe('Excellent');
    expect(component.getMarketPerformanceIndicator(75)).toBe('Good');
    expect(component.getMarketPerformanceIndicator(65)).toBe('Fair');
    expect(component.getMarketPerformanceIndicator(50)).toBe('Needs Attention');
  });

  it('should format relative time correctly', () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    expect(component.formatRelativeTime(now)).toBe('Just now');
    expect(component.formatRelativeTime(oneHourAgo)).toContain('h ago');
    expect(component.formatRelativeTime(oneDayAgo)).toContain('d ago');
  });

  it('should extract available markets from metrics', (done) => {
    fixture.detectChanges();

    // Skip the first emission from startWith() and take only the second emission with actual data
    component.dashboardData$.pipe(
      skip(1), // Skip the empty startWith emission
      take(1)  // Take only the first real emission
    ).subscribe(data => {
      expect(component.availableMarkets.length).toBeGreaterThan(0);
      done();
    });
  });

  it('should prepare market comparison data', (done) => {
    fixture.detectChanges();

    // Skip the first emission from startWith() and take only the second emission with actual data
    component.dashboardData$.pipe(
      skip(1), // Skip the empty startWith emission
      take(1)  // Take only the first real emission
    ).subscribe(() => {
      expect(component.marketComparisonData.length).toBeGreaterThan(0);
      done();
    });
  });

  it('should cleanup on destroy', () => {
    spyOn(component['destroy$'], 'next');
    spyOn(component['destroy$'], 'complete');

    component.ngOnDestroy();

    expect(component['destroy$'].next).toHaveBeenCalled();
    expect(component['destroy$'].complete).toHaveBeenCalled();
  });
});
