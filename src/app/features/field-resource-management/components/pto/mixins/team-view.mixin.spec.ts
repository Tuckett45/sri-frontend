import { OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { TeamViewMixin, ViewMode, Constructor } from './team-view.mixin';
import { AuthService } from '../../../../../services/auth.service';
import { UserRole } from '../../../../../models/role.enum';

/**
 * Unit tests for TeamViewMixin
 *
 * Validates:
 * - Requirements 1.2: Non-manager roles see Employee View only (no team controls)
 * - Requirements 2.2: Overtime non-manager hides team controls
 * - Requirements 3.1: Manager toggle between Employee/Team View, Employee View default
 * - Requirements 3.7: Switch back to Employee View resets team-specific filters
 * - Requirements 4.1: Overtime manager toggle available
 */

// ─── Test Helpers ────────────────────────────────────────────────────────────

/** Minimal base class implementing OnInit for mixin application */
class BaseComponent implements OnInit {
  ngOnInit(): void {}
}

/** Apply the mixin to get a testable class */
class TestComponent extends TeamViewMixin(BaseComponent) {
  teamViewActivatedCount = 0;

  override onTeamViewActivated(): void {
    this.teamViewActivatedCount++;
  }
}

/** Create a mock AuthService with a configurable user role */
function createMockAuthService(role: string | null, userId = 'user-1'): jasmine.SpyObj<AuthService> {
  const authService = jasmine.createSpyObj<AuthService>('AuthService', ['getUser']);
  if (role === null) {
    (authService.getUser as jasmine.Spy).and.returnValue(null);
  } else {
    (authService.getUser as jasmine.Spy).and.returnValue({
      id: userId,
      name: 'Test User',
      email: 'test@example.com',
      password: '',
      role: role,
      market: 'Dallas',
      company: 'TestCo',
      createdDate: new Date(),
      isApproved: true
    });
  }
  return authService;
}

/** Create a mock NgRx Store */
function createMockStore(): jasmine.SpyObj<Store> {
  return jasmine.createSpyObj<Store>('Store', ['dispatch', 'select']);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('TeamViewMixin', () => {
  let component: TestComponent;
  let mockStore: jasmine.SpyObj<Store>;

  beforeEach(() => {
    component = new TestComponent();
    mockStore = createMockStore();
  });

  describe('Default state', () => {
    it('should have viewMode set to "employee" by default', () => {
      expect(component.viewMode).toBe('employee');
    });

    it('should have isManager set to false by default', () => {
      expect(component.isManager).toBe(false);
    });

    it('should have selectedDepartment set to "All Departments" by default', () => {
      expect(component.selectedDepartment).toBe('All Departments');
    });
  });

  describe('initTeamView - Manager role detection', () => {
    it('should set isManager=true when role is Admin', () => {
      const authService = createMockAuthService(UserRole.Admin);
      component.initTeamView(mockStore, authService);
      expect(component.isManager).toBe(true);
    });

    it('should set isManager=true when role is Manager', () => {
      const authService = createMockAuthService(UserRole.Manager);
      component.initTeamView(mockStore, authService);
      expect(component.isManager).toBe(true);
    });

    it('should set isManager=true when role is CM', () => {
      const authService = createMockAuthService(UserRole.CM);
      component.initTeamView(mockStore, authService);
      expect(component.isManager).toBe(true);
    });

    it('should set isManager=true when role is PM', () => {
      const authService = createMockAuthService(UserRole.PM);
      component.initTeamView(mockStore, authService);
      expect(component.isManager).toBe(true);
    });

    it('should set isManager=true when role is DCOps', () => {
      const authService = createMockAuthService(UserRole.DCOps);
      component.initTeamView(mockStore, authService);
      expect(component.isManager).toBe(true);
    });

    it('should set isManager=false when role is Technician', () => {
      const authService = createMockAuthService(UserRole.Technician);
      component.initTeamView(mockStore, authService);
      expect(component.isManager).toBe(false);
    });

    it('should set isManager=false when role is empty string', () => {
      const authService = createMockAuthService('');
      component.initTeamView(mockStore, authService);
      expect(component.isManager).toBe(false);
    });

    it('should set isManager=false when user is null', () => {
      const authService = createMockAuthService(null);
      component.initTeamView(mockStore, authService);
      expect(component.isManager).toBe(false);
    });
  });

  describe('switchToTeamView', () => {
    beforeEach(() => {
      const authService = createMockAuthService(UserRole.Manager);
      component.initTeamView(mockStore, authService);
    });

    it('should set viewMode to "team"', () => {
      component.switchToTeamView();
      expect(component.viewMode).toBe('team');
    });

    it('should call onTeamViewActivated', () => {
      component.switchToTeamView();
      expect(component.teamViewActivatedCount).toBe(1);
    });

    it('should call onTeamViewActivated on each invocation (no caching)', () => {
      component.switchToTeamView();
      component.switchToTeamView();
      expect(component.teamViewActivatedCount).toBe(2);
    });
  });

  describe('switchToEmployeeView', () => {
    beforeEach(() => {
      const authService = createMockAuthService(UserRole.Manager);
      component.initTeamView(mockStore, authService);
      // First switch to team view to set up state
      component.switchToTeamView();
      component.setDepartmentFilter('Engineering');
    });

    it('should set viewMode to "employee"', () => {
      component.switchToEmployeeView();
      expect(component.viewMode).toBe('employee');
    });

    it('should reset selectedDepartment to "All Departments"', () => {
      component.switchToEmployeeView();
      expect(component.selectedDepartment).toBe('All Departments');
    });
  });

  describe('setDepartmentFilter', () => {
    beforeEach(() => {
      const authService = createMockAuthService(UserRole.Manager);
      component.initTeamView(mockStore, authService);
    });

    it('should update selectedDepartment to the given value', () => {
      component.setDepartmentFilter('Engineering');
      expect(component.selectedDepartment).toBe('Engineering');
    });

    it('should allow setting back to "All Departments"', () => {
      component.setDepartmentFilter('Engineering');
      component.setDepartmentFilter('All Departments');
      expect(component.selectedDepartment).toBe('All Departments');
    });
  });
});
