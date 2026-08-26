import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';

import { PtoRequestListComponent } from './pto-request-list.component';
import { AuthService } from '../../../../../services/auth.service';
import { UserRole } from '../../../../../models/role.enum';
import { PtoRequest, RequestStatus } from '../../../models/pto.models';
import { selectAllPtoRequests } from '../../../state/pto/pto.selectors';
import {
  selectAllTeamPtoRequests,
  selectTeamPtoDepartments,
  selectTeamPtoLoading,
  selectTeamPtoError
} from '../../../state/team-requests/team-requests.selectors';
import * as TeamRequestsActions from '../../../state/team-requests/team-requests.actions';

/**
 * Unit Tests for PtoRequestListComponent Enhancements (Team View)
 *
 * Validates:
 * - Requirement 1.2: Non-manager sees Employee View without team controls
 * - Requirement 1.4: Error handling for load failures
 * - Requirement 1.5: Empty state message when no PTO requests exist
 * - Requirement 2.2: Non-managers do not see toggle
 * - Requirement 2.4: Error handling in overtime (pattern applies to PTO too)
 * - Requirement 3.2: Team View shows all direct reports' entries
 * - Requirement 3.5: Employee name column visible in Team View
 * - Requirement 4.2: Team View loads team requests
 * - Requirement 6.3: Empty direct reports info message
 * - Requirement 6.4: Hierarchy failure shows error banner and falls back to Employee View
 */

describe('PtoRequestListComponent', () => {
  let component: PtoRequestListComponent;
  let fixture: ComponentFixture<PtoRequestListComponent>;
  let store: MockStore;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockDialog: jasmine.SpyObj<MatDialog>;

  const mockManagerUser = {
    id: 'manager-1',
    name: 'Test Manager',
    email: 'manager@test.com',
    password: '',
    role: UserRole.Manager,
    market: 'Utah',
    company: 'TestCo',
    createdDate: new Date(),
    isApproved: true
  };

  const mockTechnicianUser = {
    id: 'tech-1',
    name: 'Test Technician',
    email: 'tech@test.com',
    password: '',
    role: UserRole.Technician,
    market: 'Utah',
    company: 'TestCo',
    createdDate: new Date(),
    isApproved: true
  };

  const mockPtoRequests: PtoRequest[] = [
    {
      id: 'req-1',
      employeeId: 'manager-1',
      employeeName: 'Test Manager',
      managerId: 'admin-1',
      managerName: 'Admin User',
      startDate: '2024-03-01',
      endDate: '2024-03-05',
      requestType: 'Vacation',
      reason: 'Family trip',
      status: RequestStatus.Approved,
      createdAt: '2024-02-15',
      updatedAt: '2024-02-16'
    },
    {
      id: 'req-2',
      employeeId: 'manager-1',
      employeeName: 'Test Manager',
      managerId: 'admin-1',
      managerName: 'Admin User',
      startDate: '2024-04-10',
      endDate: '2024-04-12',
      requestType: 'Sick Leave',
      reason: null,
      status: RequestStatus.Pending_Manager_Approval,
      createdAt: '2024-04-01',
      updatedAt: '2024-04-01'
    }
  ];

  const initialState = {
    pto: {
      ids: mockPtoRequests.map(r => r.id),
      entities: mockPtoRequests.reduce((acc, r) => ({ ...acc, [r.id]: r }), {}),
      loading: false,
      error: null,
      selectedRequestId: null,
      leaveTypes: [],
      managerQueue: [],
      backofficeQueue: []
    },
    teamRequests: {
      teamPto: {
        ids: [],
        entities: {},
        loading: false,
        error: null
      },
      teamOvertime: {
        ids: [],
        entities: {},
        loading: false,
        error: null
      },
      directReports: [],
      directReportsLoading: false,
      directReportsError: null
    }
  };

  function configureTestBed(user: any) {
    mockAuthService = jasmine.createSpyObj<AuthService>('AuthService', ['getUser']);
    (mockAuthService.getUser as jasmine.Spy).and.returnValue(user);
    mockRouter = jasmine.createSpyObj<Router>('Router', ['navigate']);
    mockDialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);

    TestBed.configureTestingModule({
      declarations: [PtoRequestListComponent],
      providers: [
        provideMockStore({ initialState }),
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
        { provide: MatDialog, useValue: mockDialog }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    });

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(PtoRequestListComponent);
    component = fixture.componentInstance;
  }

  afterEach(() => {
    fixture?.destroy();
  });

  // ─── Basic Component Tests ──────────────────────────────────────────────────

  describe('Component creation', () => {
    beforeEach(() => {
      configureTestBed(mockManagerUser);
      fixture.detectChanges();
    });

    it('should create the component', () => {
      expect(component).toBeTruthy();
    });
  });

  // ─── Default View Mode Tests (Req 1.2, 3.1, 4.1) ──────────────────────────

  describe('Default view mode', () => {
    beforeEach(() => {
      configureTestBed(mockManagerUser);
      fixture.detectChanges();
    });

    it('should default viewMode to "employee" on init', () => {
      expect(component.viewMode).toBe('employee');
    });

    it('should have Employee View as the active view after initialization', () => {
      expect(component.viewMode).not.toBe('team');
    });
  });

  // ─── Manager Role Detection Tests (Req 1.2, 2.2) ───────────────────────────

  describe('Manager role detection', () => {
    it('should set isManager=true when user has Manager role', () => {
      configureTestBed(mockManagerUser);
      fixture.detectChanges();
      expect(component.isManager).toBe(true);
    });

    it('should set isManager=true when user has Admin role', () => {
      configureTestBed({ ...mockManagerUser, role: UserRole.Admin });
      fixture.detectChanges();
      expect(component.isManager).toBe(true);
    });

    it('should set isManager=true when user has CM role', () => {
      configureTestBed({ ...mockManagerUser, role: UserRole.CM });
      fixture.detectChanges();
      expect(component.isManager).toBe(true);
    });

    it('should set isManager=true when user has PM role', () => {
      configureTestBed({ ...mockManagerUser, role: UserRole.PM });
      fixture.detectChanges();
      expect(component.isManager).toBe(true);
    });

    it('should set isManager=true when user has DCOps role', () => {
      configureTestBed({ ...mockManagerUser, role: UserRole.DCOps });
      fixture.detectChanges();
      expect(component.isManager).toBe(true);
    });

    it('should set isManager=false when user has Technician role', () => {
      configureTestBed(mockTechnicianUser);
      fixture.detectChanges();
      expect(component.isManager).toBe(false);
    });

    it('should set isManager=false when user has User role', () => {
      configureTestBed({ ...mockTechnicianUser, role: UserRole.User });
      fixture.detectChanges();
      expect(component.isManager).toBe(false);
    });
  });

  // ─── Toggle Visibility Tests (Req 1.2, 2.2) ────────────────────────────────

  describe('Toggle visibility based on role', () => {
    it('should not render team view toggle for non-manager roles', () => {
      configureTestBed(mockTechnicianUser);
      fixture.detectChanges();

      const toggleElement = fixture.nativeElement.querySelector('frm-team-view-toggle');
      expect(toggleElement).toBeNull();
    });

    it('should render team view toggle for manager roles', () => {
      configureTestBed(mockManagerUser);
      fixture.detectChanges();

      const toggleElement = fixture.nativeElement.querySelector('frm-team-view-toggle');
      expect(toggleElement).toBeTruthy();
    });
  });

  // ─── Department Filter Visibility Tests ─────────────────────────────────────

  describe('Department filter visibility', () => {
    beforeEach(() => {
      configureTestBed(mockManagerUser);
      fixture.detectChanges();
    });

    it('should not show department filter in employee view', () => {
      expect(component.viewMode).toBe('employee');
      const filterElement = fixture.nativeElement.querySelector('frm-department-filter');
      expect(filterElement).toBeNull();
    });

    it('should show department filter in team view', () => {
      component.viewMode = 'team';
      fixture.detectChanges();

      const filterElement = fixture.nativeElement.querySelector('frm-department-filter');
      expect(filterElement).toBeTruthy();
    });
  });

  // ─── Employee Name Column Visibility Tests (Req 3.5) ───────────────────────

  describe('Employee name column visibility', () => {
    beforeEach(() => {
      configureTestBed(mockManagerUser);
      store.overrideSelector(selectAllPtoRequests, mockPtoRequests);
      store.overrideSelector(selectAllTeamPtoRequests, mockPtoRequests);
      store.overrideSelector(selectTeamPtoLoading, false);
      store.overrideSelector(selectTeamPtoError, null);
      store.refreshState();
      fixture.detectChanges();
    });

    it('should not render Employee column header in employee view', () => {
      component.viewMode = 'employee';
      fixture.detectChanges();

      const headers = fixture.nativeElement.querySelectorAll('th');
      const headerTexts = Array.from(headers).map((h: any) => h.textContent.trim());
      expect(headerTexts).not.toContain('Employee');
    });

    it('should render Employee column header in team view', () => {
      component.viewMode = 'team';
      fixture.detectChanges();

      const headers = fixture.nativeElement.querySelectorAll('th');
      const headerTexts = Array.from(headers).map((h: any) => h.textContent.trim());
      expect(headerTexts).toContain('Employee');
    });
  });

  // ─── Error Banner Tests (Req 6.4) ──────────────────────────────────────────

  describe('Error banner on hierarchy failure', () => {
    beforeEach(() => {
      configureTestBed(mockManagerUser);
      fixture.detectChanges();
    });

    it('should show error banner when teamError$ has a value in team view', () => {
      component.viewMode = 'team';
      store.overrideSelector(selectTeamPtoError, 'Unable to load team. Showing your requests.');
      store.refreshState();
      fixture.detectChanges();

      const errorBanner = fixture.nativeElement.querySelector('.error-banner');
      expect(errorBanner).toBeTruthy();
    });

    it('should display the error message text', () => {
      component.viewMode = 'team';
      store.overrideSelector(selectTeamPtoError, 'Unable to load team. Showing your requests.');
      store.refreshState();
      fixture.detectChanges();

      const errorMessage = fixture.nativeElement.querySelector('.error-message');
      expect(errorMessage?.textContent).toContain('Unable to load team');
    });

    it('should provide a button to fall back to Employee View', () => {
      component.viewMode = 'team';
      store.overrideSelector(selectTeamPtoError, 'Unable to load team. Showing your requests.');
      store.refreshState();
      fixture.detectChanges();

      const fallbackBtn = fixture.nativeElement.querySelector('.error-banner .btn-action');
      expect(fallbackBtn).toBeTruthy();
      expect(fallbackBtn.textContent).toContain('Show My Requests');
    });

    it('should switch to Employee View when fallback button is clicked', () => {
      component.viewMode = 'team';
      store.overrideSelector(selectTeamPtoError, 'Unable to load team. Showing your requests.');
      store.refreshState();
      fixture.detectChanges();

      const fallbackBtn = fixture.nativeElement.querySelector('.error-banner .btn-action');
      fallbackBtn.click();
      fixture.detectChanges();

      expect(component.viewMode).toBe('employee');
    });

    it('should not show error banner in employee view even if teamError has value', () => {
      component.viewMode = 'employee';
      store.overrideSelector(selectTeamPtoError, 'Some error');
      store.refreshState();
      fixture.detectChanges();

      const errorBanner = fixture.nativeElement.querySelector('.error-banner');
      expect(errorBanner).toBeNull();
    });
  });

  // ─── Empty State Message Tests (Req 1.5, 6.3) ──────────────────────────────

  describe('Empty state messages', () => {
    beforeEach(() => {
      configureTestBed(mockManagerUser);
    });

    it('should show empty state message when no requests in employee view', fakeAsync(() => {
      store.overrideSelector(selectAllPtoRequests, []);
      store.overrideSelector(selectTeamPtoLoading, false);
      store.overrideSelector(selectTeamPtoError, null);
      store.refreshState();
      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      const emptyState = fixture.nativeElement.querySelector('.empty-state');
      expect(emptyState).toBeTruthy();
      expect(emptyState.textContent).toContain('No PTO requests found');
    }));

    it('should show team empty state message when no team requests in team view', fakeAsync(() => {
      store.overrideSelector(selectAllTeamPtoRequests, []);
      store.overrideSelector(selectTeamPtoLoading, false);
      store.overrideSelector(selectTeamPtoError, null);
      store.refreshState();
      fixture.detectChanges();

      component.switchToTeamView();
      tick();
      fixture.detectChanges();

      const emptyState = fixture.nativeElement.querySelector('.empty-state');
      expect(emptyState).toBeTruthy();
      expect(emptyState.textContent).toContain('No PTO requests found for your team');
    }));

    it('should show filtered empty state when active filters yield zero results in team view', fakeAsync(() => {
      store.overrideSelector(selectAllTeamPtoRequests, []);
      store.overrideSelector(selectTeamPtoLoading, false);
      store.overrideSelector(selectTeamPtoError, null);
      store.refreshState();
      fixture.detectChanges();

      component.switchToTeamView();
      component.setFilter('Rejected');
      tick();
      fixture.detectChanges();

      const emptyState = fixture.nativeElement.querySelector('.empty-state');
      expect(emptyState).toBeTruthy();
      expect(emptyState.textContent).toContain('No requests match the current filters');
    }));
  });

  // ─── Team View Activation Tests (Req 3.2, 4.2, 6.5) ───────────────────────

  describe('Team View activation', () => {
    beforeEach(() => {
      configureTestBed(mockManagerUser);
      fixture.detectChanges();
      spyOn(store, 'dispatch');
    });

    it('should dispatch loadTeamPtoRequests when switchToTeamView is called', () => {
      component.switchToTeamView();

      expect(store.dispatch).toHaveBeenCalledWith(
        TeamRequestsActions.loadTeamPtoRequests({ managerId: 'manager-1' })
      );
    });

    it('should set viewMode to "team" when switchToTeamView is called', () => {
      component.switchToTeamView();
      expect(component.viewMode).toBe('team');
    });

    it('should reset to employee view and clear department filter on switchToEmployeeView', () => {
      component.switchToTeamView();
      component.setDepartmentFilter('Engineering');

      component.switchToEmployeeView();

      expect(component.viewMode).toBe('employee');
      expect(component.selectedDepartment).toBe('All Departments');
    });
  });

  // ─── Non-Manager Sees No Team Controls (Req 1.2, 2.2) ──────────────────────

  describe('Non-manager user experience', () => {
    beforeEach(() => {
      configureTestBed(mockTechnicianUser);
      fixture.detectChanges();
    });

    it('should not display team view toggle', () => {
      const toggle = fixture.nativeElement.querySelector('frm-team-view-toggle');
      expect(toggle).toBeNull();
    });

    it('should not display department filter', () => {
      const filter = fixture.nativeElement.querySelector('frm-department-filter');
      expect(filter).toBeNull();
    });

    it('should remain in employee view mode', () => {
      expect(component.viewMode).toBe('employee');
      expect(component.isManager).toBe(false);
    });
  });
});
