import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { RouterTestingModule } from '@angular/router/testing';
import { Subject } from 'rxjs';
import { BreadcrumbComponent, BreadcrumbItem } from './breadcrumb.component';

describe('BreadcrumbComponent', () => {
  let component: BreadcrumbComponent;
  let fixture: ComponentFixture<BreadcrumbComponent>;
  let router: Router;
  let routerEventsSubject: Subject<any>;

  beforeEach(async () => {
    routerEventsSubject = new Subject();

    await TestBed.configureTestingModule({
      declarations: [BreadcrumbComponent],
      imports: [
        MatIconModule,
        RouterTestingModule
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BreadcrumbComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);

    // Mock router events
    Object.defineProperty(router, 'events', {
      get: () => routerEventsSubject.asObservable()
    });
  });

  afterEach(() => {
    routerEventsSubject.complete();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Breadcrumb Generation', () => {
    it('should generate breadcrumbs for simple route', () => {
      spyOnProperty(router, 'url', 'get').and.returnValue('/frm/dashboard');
      
      component.ngOnInit();

      expect(component.breadcrumbs.length).toBe(2);
      expect(component.breadcrumbs[0].label).toBe('Field Resource Management');
      expect(component.breadcrumbs[0].url).toBe('/frm');
      expect(component.breadcrumbs[1].label).toBe('Dashboard');
      expect(component.breadcrumbs[1].url).toBe('/frm/dashboard');
    });

    it('should generate breadcrumbs for nested route', () => {
      spyOnProperty(router, 'url', 'get').and.returnValue('/frm/technicians/new');
      
      component.ngOnInit();

      expect(component.breadcrumbs.length).toBe(3);
      expect(component.breadcrumbs[0].label).toBe('Field Resource Management');
      expect(component.breadcrumbs[1].label).toBe('Technicians');
      expect(component.breadcrumbs[2].label).toBe('New');
    });

    it('should handle UUID segments', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      spyOnProperty(router, 'url', 'get').and.returnValue(`/frm/jobs/${uuid}`);
      
      component.ngOnInit();

      expect(component.breadcrumbs.length).toBe(3);
      expect(component.breadcrumbs[2].label).toContain('ID:');
      expect(component.breadcrumbs[2].label).toContain('123e4567');
    });

    it('should format unknown segments', () => {
      spyOnProperty(router, 'url', 'get').and.returnValue('/frm/custom-route');
      
      component.ngOnInit();

      expect(component.breadcrumbs.length).toBe(2);
      expect(component.breadcrumbs[1].label).toBe('Custom Route');
    });

    it('should add icon to first breadcrumb', () => {
      spyOnProperty(router, 'url', 'get').and.returnValue('/frm/dashboard');
      
      component.ngOnInit();

      expect(component.breadcrumbs[0].icon).toBe('home');
      expect(component.breadcrumbs[1].icon).toBeUndefined();
    });

    it('should handle query parameters', () => {
      spyOnProperty(router, 'url', 'get').and.returnValue('/frm/jobs?status=active');
      
      component.ngOnInit();

      expect(component.breadcrumbs.length).toBe(2);
      expect(component.breadcrumbs[1].label).toBe('Jobs');
    });

    it('should handle fragments', () => {
      spyOnProperty(router, 'url', 'get').and.returnValue('/frm/dashboard#section');
      
      component.ngOnInit();

      expect(component.breadcrumbs.length).toBe(2);
      expect(component.breadcrumbs[1].label).toBe('Dashboard');
    });
  });

  describe('Route Change Handling', () => {
    it('should rebuild breadcrumbs on navigation', () => {
      spyOnProperty(router, 'url', 'get').and.returnValue('/frm/dashboard');
      component.ngOnInit();

      expect(component.breadcrumbs.length).toBe(2);

      // Simulate navigation
      spyOnProperty(router, 'url', 'get').and.returnValue('/frm/technicians');
      routerEventsSubject.next(new NavigationEnd(1, '/frm/technicians', '/frm/technicians'));

      expect(component.breadcrumbs.length).toBe(2);
      expect(component.breadcrumbs[1].label).toBe('Technicians');
    });

    it('should not rebuild on non-NavigationEnd events', () => {
      spyOnProperty(router, 'url', 'get').and.returnValue('/frm/dashboard');
      component.ngOnInit();

      const initialBreadcrumbs = [...component.breadcrumbs];

      // Emit non-NavigationEnd event
      routerEventsSubject.next({ type: 'other' });

      expect(component.breadcrumbs).toEqual(initialBreadcrumbs);
    });
  });

  describe('Navigation', () => {
    it('should navigate to breadcrumb URL when clicked', () => {
      const navigateSpy = spyOn(router, 'navigate');
      const breadcrumb: BreadcrumbItem = {
        label: 'Dashboard',
        url: '/frm/dashboard'
      };

      component.breadcrumbs = [
        { label: 'FRM', url: '/frm' },
        breadcrumb,
        { label: 'Details', url: '/frm/dashboard/details' }
      ];

      component.navigateTo(breadcrumb);

      expect(navigateSpy).toHaveBeenCalledWith(['/frm/dashboard']);
    });

    it('should not navigate when clicking current page', () => {
      const navigateSpy = spyOn(router, 'navigate');
      const currentBreadcrumb: BreadcrumbItem = {
        label: 'Details',
        url: '/frm/dashboard/details'
      };

      component.breadcrumbs = [
        { label: 'FRM', url: '/frm' },
        { label: 'Dashboard', url: '/frm/dashboard' },
        currentBreadcrumb
      ];

      component.navigateTo(currentBreadcrumb);

      expect(navigateSpy).not.toHaveBeenCalled();
    });
  });

  describe('Current Page Detection', () => {
    it('should identify last breadcrumb as current page', () => {
      component.breadcrumbs = [
        { label: 'FRM', url: '/frm' },
        { label: 'Dashboard', url: '/frm/dashboard' },
        { label: 'Details', url: '/frm/dashboard/details' }
      ];

      expect(component.isCurrentPage(component.breadcrumbs[0])).toBe(false);
      expect(component.isCurrentPage(component.breadcrumbs[1])).toBe(false);
      expect(component.isCurrentPage(component.breadcrumbs[2])).toBe(true);
    });

    it('should handle single breadcrumb', () => {
      component.breadcrumbs = [
        { label: 'FRM', url: '/frm' }
      ];

      expect(component.isCurrentPage(component.breadcrumbs[0])).toBe(true);
    });
  });

  describe('UUID Detection', () => {
    it('should detect valid UUIDs', () => {
      const validUUIDs = [
        '123e4567-e89b-12d3-a456-426614174000',
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        '00000000-0000-0000-0000-000000000000'
      ];

      validUUIDs.forEach(uuid => {
        spyOnProperty(router, 'url', 'get').and.returnValue(`/frm/jobs/${uuid}`);
        component.ngOnInit();
        
        const lastBreadcrumb = component.breadcrumbs[component.breadcrumbs.length - 1];
        expect(lastBreadcrumb.label).toContain('ID:');
      });
    });

    it('should not detect invalid UUIDs', () => {
      const invalidUUIDs = [
        'not-a-uuid',
        '123',
        'abc-def-ghi'
      ];

      invalidUUIDs.forEach(notUuid => {
        spyOnProperty(router, 'url', 'get').and.returnValue(`/frm/jobs/${notUuid}`);
        component.ngOnInit();
        
        const lastBreadcrumb = component.breadcrumbs[component.breadcrumbs.length - 1];
        expect(lastBreadcrumb.label).not.toContain('ID:');
      });
    });
  });

  describe('Segment Formatting', () => {
    it('should format hyphenated segments', () => {
      spyOnProperty(router, 'url', 'get').and.returnValue('/frm/my-custom-page');
      
      component.ngOnInit();

      const lastBreadcrumb = component.breadcrumbs[component.breadcrumbs.length - 1];
      expect(lastBreadcrumb.label).toBe('My Custom Page');
    });

    it('should use predefined labels when available', () => {
      const routes = [
        { path: '/frm/system-config', expected: 'System Configuration' },
        { path: '/frm/my-assignments', expected: 'My Assignments' },
        { path: '/frm/kpis', expected: 'KPIs' }
      ];

      routes.forEach(({ path, expected }) => {
        spyOnProperty(router, 'url', 'get').and.returnValue(path);
        component.ngOnInit();
        
        const lastBreadcrumb = component.breadcrumbs[component.breadcrumbs.length - 1];
        expect(lastBreadcrumb.label).toBe(expected);
      });
    });
  });

  describe('Component Lifecycle', () => {
    it('should unsubscribe on destroy', () => {
      component.ngOnInit();
      
      const destroySpy = spyOn(component['destroy$'], 'next');
      const completeSpy = spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(destroySpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should render breadcrumb navigation with aria-label', () => {
      spyOnProperty(router, 'url', 'get').and.returnValue('/frm/dashboard');
      component.ngOnInit();
      fixture.detectChanges();

      const nav = fixture.nativeElement.querySelector('nav');
      expect(nav.getAttribute('aria-label')).toBe('Breadcrumb navigation');
    });

    it('should mark current page with aria-current', () => {
      spyOnProperty(router, 'url', 'get').and.returnValue('/frm/dashboard');
      component.ngOnInit();
      fixture.detectChanges();

      const currentSpan = fixture.nativeElement.querySelector('.breadcrumb-current');
      expect(currentSpan.getAttribute('aria-current')).toBe('page');
    });

    it('should add aria-label to links', () => {
      spyOnProperty(router, 'url', 'get').and.returnValue('/frm/dashboard/details');
      component.ngOnInit();
      fixture.detectChanges();

      const links = fixture.nativeElement.querySelectorAll('.breadcrumb-link');
      links.forEach((link: HTMLElement) => {
        expect(link.getAttribute('aria-label')).toContain('Navigate to');
      });
    });

    it('should hide separator icons from screen readers', () => {
      spyOnProperty(router, 'url', 'get').and.returnValue('/frm/dashboard');
      component.ngOnInit();
      fixture.detectChanges();

      const separators = fixture.nativeElement.querySelectorAll('.breadcrumb-separator');
      separators.forEach((separator: HTMLElement) => {
        expect(separator.getAttribute('aria-hidden')).toBe('true');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty URL', () => {
      spyOnProperty(router, 'url', 'get').and.returnValue('');
      
      component.ngOnInit();

      expect(component.breadcrumbs.length).toBe(0);
    });

    it('should handle root URL', () => {
      spyOnProperty(router, 'url', 'get').and.returnValue('/');
      
      component.ngOnInit();

      expect(component.breadcrumbs.length).toBe(0);
    });

    it('should handle URL with trailing slash', () => {
      spyOnProperty(router, 'url', 'get').and.returnValue('/frm/dashboard/');
      
      component.ngOnInit();

      expect(component.breadcrumbs.length).toBe(2);
      expect(component.breadcrumbs[1].label).toBe('Dashboard');
    });

    it('should handle URL with multiple slashes', () => {
      spyOnProperty(router, 'url', 'get').and.returnValue('/frm//dashboard');
      
      component.ngOnInit();

      expect(component.breadcrumbs.length).toBe(2);
    });
  });
});
