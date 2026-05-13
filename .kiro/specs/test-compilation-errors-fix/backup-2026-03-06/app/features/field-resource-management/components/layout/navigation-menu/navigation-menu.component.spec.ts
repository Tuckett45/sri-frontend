import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';
import { NavigationMenuComponent } from './navigation-menu.component';
import { AuthService } from '../../../../../services/auth.service';
import { PermissionService } from '../../../../../services/permission.service';
import { User } from '../../../../../models/user.model';
import { UserRole } from '../../../../../models/role.enum';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('NavigationMenuComponent', () => {
  let component: NavigationMenuComponent;
  let fixture: ComponentFixture<NavigationMenuComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockPermissionService: jasmine.SpyObj<PermissionService>;
  let mockRouter: any;
  let routerEventsSubject: Subject<any>;

  const createMockUser = (role: UserRole, market: string = 'DALLAS', company: string = 'ACME'): User => {
    return new User(
      'user-123',
      'Test User',
      'test@example.com',
      'password',
      role,
      market,
      company,
      new Date(),
      true
    );
  };

  beforeEach(async () => {
    routerEventsSubject = new Subject();

    mockAuthService = jasmine.createSpyObj('AuthService', ['getUser']);
    mockPermissionService = jasmine.createSpyObj('PermissionService', ['checkPermission']);
    mockRouter = {
      url: '/frm/dashboard',
      events: routerEventsSubject.asObservable(),
      navigate: jasmine.createSpy('navigate')
    };

    await TestBed.configureTestingModule({
      declarations: [NavigationMenuComponent],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: PermissionService, useValue: mockPermissionService },
        { provide: Router, useValue: mockRouter }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(NavigationMenuComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    routerEventsSubject.complete();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should load current user on init', () => {
      const mockUser = createMockUser(UserRole.Admin);
      mockAuthService.getUser.and.returnValue(mockUser);
      mockPermissionService.checkPermission.and.returnValue(true);

      component.ngOnInit();

      expect(mockAuthService.getUser).toHaveBeenCalled();
      expect(component.currentUser).toEqual(mockUser);
    });

    it('should build menu items on init', () => {
      const mockUser = createMockUser(UserRole.Admin);
      mockAuthService.getUser.and.returnValue(mockUser);
      mockPermissionService.checkPermission.and.returnValue(true);

      component.ngOnInit();

      expect(component.menuItems.length).toBeGreaterThan(0);
    });

    it('should set active route on init', () => {
      const mockUser = createMockUser(UserRole.Admin);
      mockAuthService.getUser.and.returnValue(mockUser);
      mockPermissionService.checkPermission.and.returnValue(true);

      component.ngOnInit();

      expect(component.activeRoute).toBe('/frm/dashboard');
    });
  });

  describe('Role-Based Menu Filtering', () => {
    it('should show all menu items for Admin role', () => {
      const mockUser = createMockUser(UserRole.Admin);
      mockAuthService.getUser.and.returnValue(mockUser);
      mockPermissionService.checkPermission.and.returnValue(true);

      component.ngOnInit();

      const menuLabels = component.menuItems.map(item => item.label);
      expect(menuLabels).toContain('Dashboard');
      expect(menuLabels).toContain('Technicians');
      expect(menuLabels).toContain('Crews');
      expect(menuLabels).toContain('Jobs');
      expect(menuLabels).toContain('Scheduling');
      expect(menuLabels).toContain('Reports');
      expect(menuLabels).toContain('KPIs');
      expect(menuLabels).toContain('System Config');
    });

    it('should show CM-appropriate menu items', () => {
      const mockUser = createMockUser(UserRole.CM);
      mockAuthService.getUser.and.returnValue(mockUser);
      mockPermissionService.checkPermission.and.returnValue(true);

      component.ngOnInit();

      const menuLabels = component.menuItems.map(item => item.label);
      expect(menuLabels).toContain('Dashboard');
      expect(menuLabels).toContain('Technicians');
      expect(menuLabels).toContain('Crews');
      expect(menuLabels).toContain('Jobs');
      expect(menuLabels).toContain('Scheduling');
      expect(menuLabels).toContain('Reports');
      expect(menuLabels).toContain('KPIs');
      expect(menuLabels).not.toContain('System Config');
      expect(menuLabels).not.toContain('My Assignments');
    });

    it('should show PM-appropriate menu items', () => {
      const mockUser = createMockUser(UserRole.PM);
      mockAuthService.getUser.and.returnValue(mockUser);
      
      // PM has limited permissions
      mockPermissionService.checkPermission.and.callFake((user, resource, action) => {
        return ['jobs', 'technicians', 'reports'].includes(resource);
      });

      component.ngOnInit();

      const menuLabels = component.menuItems.map(item => item.label);
      expect(menuLabels).toContain('Jobs');
      expect(menuLabels).toContain('Technicians');
      expect(menuLabels).toContain('Reports');
      expect(menuLabels).not.toContain('System Config');
      expect(menuLabels).not.toContain('My Assignments');
    });

    it('should show Technician-specific menu items', () => {
      const mockUser = createMockUser(UserRole.Technician);
      mockAuthService.getUser.and.returnValue(mockUser);
      
      // Technician has limited permissions
      mockPermissionService.checkPermission.and.callFake((user, resource, action) => {
        return ['assignments', 'technicians'].includes(resource);
      });

      component.ngOnInit();

      const menuLabels = component.menuItems.map(item => item.label);
      expect(menuLabels).toContain('My Assignments');
      expect(menuLabels).toContain('My Schedule');
      expect(menuLabels).toContain('My Profile');
      expect(menuLabels).not.toContain('System Config');
      expect(menuLabels).not.toContain('Crews');
    });

    it('should hide System Config from non-Admin users', () => {
      const mockUser = createMockUser(UserRole.CM);
      mockAuthService.getUser.and.returnValue(mockUser);
      mockPermissionService.checkPermission.and.returnValue(true);

      component.ngOnInit();

      const menuLabels = component.menuItems.map(item => item.label);
      expect(menuLabels).not.toContain('System Config');
    });

    it('should return empty menu when no user is logged in', () => {
      mockAuthService.getUser.and.returnValue(null);

      component.ngOnInit();

      expect(component.menuItems.length).toBe(0);
    });
  });

  describe('Permission-Based Filtering', () => {
    it('should filter menu items based on permission checks', () => {
      const mockUser = createMockUser(UserRole.CM);
      mockAuthService.getUser.and.returnValue(mockUser);
      
      // Only allow technicians and jobs
      mockPermissionService.checkPermission.and.callFake((user, resource, action) => {
        return ['technicians', 'jobs'].includes(resource);
      });

      component.ngOnInit();

      const menuLabels = component.menuItems.map(item => item.label);
      expect(menuLabels).toContain('Technicians');
      expect(menuLabels).toContain('Jobs');
      expect(menuLabels).not.toContain('Reports');
      expect(menuLabels).not.toContain('KPIs');
    });

    it('should call permission service for each menu item', () => {
      const mockUser = createMockUser(UserRole.Admin);
      mockAuthService.getUser.and.returnValue(mockUser);
      mockPermissionService.checkPermission.and.returnValue(true);

      component.ngOnInit();

      expect(mockPermissionService.checkPermission).toHaveBeenCalled();
    });

    it('should handle permission check failures gracefully', () => {
      const mockUser = createMockUser(UserRole.CM);
      mockAuthService.getUser.and.returnValue(mockUser);
      mockPermissionService.checkPermission.and.returnValue(false);

      component.ngOnInit();

      // Should still initialize without errors
      expect(component.menuItems).toBeDefined();
    });
  });

  describe('Active Route Tracking', () => {
    it('should mark current route as active', () => {
      const mockUser = createMockUser(UserRole.Admin);
      mockAuthService.getUser.and.returnValue(mockUser);
      mockPermissionService.checkPermission.and.returnValue(true);
      mockRouter.url = '/frm/technicians';

      component.ngOnInit();

      expect(component.isActive('/frm/technicians')).toBe(true);
      expect(component.isActive('/frm/jobs')).toBe(false);
    });

    it('should update active route on navigation', () => {
      const mockUser = createMockUser(UserRole.Admin);
      mockAuthService.getUser.and.returnValue(mockUser);
      mockPermissionService.checkPermission.and.returnValue(true);

      component.ngOnInit();

      // Simulate navigation
      routerEventsSubject.next(new NavigationEnd(1, '/frm/jobs', '/frm/jobs'));

      expect(component.activeRoute).toBe('/frm/jobs');
      expect(component.isActive('/frm/jobs')).toBe(true);
    });

    it('should handle route with query parameters', () => {
      const mockUser = createMockUser(UserRole.Admin);
      mockAuthService.getUser.and.returnValue(mockUser);
      mockPermissionService.checkPermission.and.returnValue(true);
      mockRouter.url = '/frm/technicians?filter=active';

      component.ngOnInit();

      expect(component.isActive('/frm/technicians')).toBe(true);
    });
  });

  describe('Navigation', () => {
    it('should navigate to route when menu item is clicked', () => {
      const mockUser = createMockUser(UserRole.Admin);
      mockAuthService.getUser.and.returnValue(mockUser);
      mockPermissionService.checkPermission.and.returnValue(true);

      component.ngOnInit();
      component.navigate('/frm/jobs');

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/frm/jobs']);
    });

    it('should emit navigationClick event on navigation', () => {
      const mockUser = createMockUser(UserRole.Admin);
      mockAuthService.getUser.and.returnValue(mockUser);
      mockPermissionService.checkPermission.and.returnValue(true);

      component.ngOnInit();

      spyOn(component.navigationClick, 'emit');
      component.navigate('/frm/jobs');

      expect(component.navigationClick.emit).toHaveBeenCalled();
    });
  });

  describe('Hierarchical Menu Support', () => {
    it('should detect menu items with children', () => {
      const itemWithChildren = {
        label: 'Parent',
        icon: 'folder',
        children: [
          { label: 'Child', icon: 'file', route: '/child' }
        ]
      };

      expect(component.hasChildren(itemWithChildren)).toBe(true);
    });

    it('should detect menu items without children', () => {
      const itemWithoutChildren = {
        label: 'Single',
        icon: 'file',
        route: '/single'
      };

      expect(component.hasChildren(itemWithoutChildren)).toBe(false);
    });

    it('should toggle expansion state', () => {
      component.toggleExpanded('Parent');
      expect(component.isExpanded('Parent')).toBe(true);

      component.toggleExpanded('Parent');
      expect(component.isExpanded('Parent')).toBe(false);
    });

    it('should maintain separate expansion states for different items', () => {
      component.toggleExpanded('Parent1');
      component.toggleExpanded('Parent2');

      expect(component.isExpanded('Parent1')).toBe(true);
      expect(component.isExpanded('Parent2')).toBe(true);

      component.toggleExpanded('Parent1');

      expect(component.isExpanded('Parent1')).toBe(false);
      expect(component.isExpanded('Parent2')).toBe(true);
    });
  });

  describe('Responsive Behavior', () => {
    it('should emit navigationClick for mobile sidebar close', () => {
      const mockUser = createMockUser(UserRole.Admin);
      mockAuthService.getUser.and.returnValue(mockUser);
      mockPermissionService.checkPermission.and.returnValue(true);

      component.ngOnInit();

      spyOn(component.navigationClick, 'emit');
      component.navigate('/frm/jobs');

      expect(component.navigationClick.emit).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null user gracefully', () => {
      mockAuthService.getUser.and.returnValue(null);

      expect(() => component.ngOnInit()).not.toThrow();
      expect(component.menuItems.length).toBe(0);
    });

    it('should handle undefined user role', () => {
      const mockUser = createMockUser(UserRole.Admin);
      mockUser.role = undefined as any;
      mockAuthService.getUser.and.returnValue(mockUser);
      mockPermissionService.checkPermission.and.returnValue(true);

      expect(() => component.ngOnInit()).not.toThrow();
    });

    it('should handle permission service errors', () => {
      const mockUser = createMockUser(UserRole.Admin);
      mockAuthService.getUser.and.returnValue(mockUser);
      mockPermissionService.checkPermission.and.throwError('Permission error');

      expect(() => component.ngOnInit()).toThrow();
    });

    it('should clean up subscriptions on destroy', () => {
      const mockUser = createMockUser(UserRole.Admin);
      mockAuthService.getUser.and.returnValue(mockUser);
      mockPermissionService.checkPermission.and.returnValue(true);

      component.ngOnInit();
      
      spyOn(component['destroy$'], 'next');
      spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(component['destroy$'].next).toHaveBeenCalled();
      expect(component['destroy$'].complete).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes in template', () => {
      const mockUser = createMockUser(UserRole.Admin);
      mockAuthService.getUser.and.returnValue(mockUser);
      mockPermissionService.checkPermission.and.returnValue(true);

      component.ngOnInit();
      fixture.detectChanges();

      const nav = fixture.nativeElement.querySelector('nav');
      expect(nav.getAttribute('role')).toBe('navigation');
      expect(nav.getAttribute('aria-label')).toBe('Main navigation');
    });

    it('should support keyboard navigation', () => {
      const mockUser = createMockUser(UserRole.Admin);
      mockAuthService.getUser.and.returnValue(mockUser);
      mockPermissionService.checkPermission.and.returnValue(true);

      component.ngOnInit();
      fixture.detectChanges();

      const menuLinks = fixture.nativeElement.querySelectorAll('.menu-link');
      menuLinks.forEach((link: HTMLElement) => {
        expect(link.getAttribute('tabindex')).toBe('0');
      });
    });
  });

  describe('Integration with Store', () => {
    it('should work with real user data structure', () => {
      const realUser = new User(
        'real-user-id',
        'John Doe',
        'john@example.com',
        'hashedPassword',
        UserRole.CM,
        'DALLAS',
        'ACME_CORP',
        new Date(),
        true
      );

      mockAuthService.getUser.and.returnValue(realUser);
      mockPermissionService.checkPermission.and.returnValue(true);

      component.ngOnInit();

      expect(component.currentUser).toEqual(realUser);
      expect(component.menuItems.length).toBeGreaterThan(0);
    });
  });
});
