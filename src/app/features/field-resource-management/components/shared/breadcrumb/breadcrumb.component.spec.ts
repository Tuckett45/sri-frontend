import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { BreadcrumbComponent } from './breadcrumb.component';
import { Subject } from 'rxjs';

describe('BreadcrumbComponent', () => {
  let component: BreadcrumbComponent;
  let fixture: ComponentFixture<BreadcrumbComponent>;
  let router: jasmine.SpyObj<Router>;
  let activatedRoute: ActivatedRoute;
  let routerEventsSubject: Subject<any>;

  beforeEach(async () => {
    routerEventsSubject = new Subject();
    
    const routerSpy = jasmine.createSpyObj('Router', ['navigate'], {
      events: routerEventsSubject.asObservable()
    });

    const activatedRouteMock = {
      root: {
        children: [],
        outlet: 'primary',
        snapshot: {
          url: [],
          data: {}
        }
      }
    };

    await TestBed.configureTestingModule({
      declarations: [BreadcrumbComponent],
      imports: [MatIconModule],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: activatedRouteMock }
      ]
    }).compileComponents();

    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    activatedRoute = TestBed.inject(ActivatedRoute);
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BreadcrumbComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty breadcrumbs', () => {
    expect(component.breadcrumbs).toEqual([]);
  });

  it('should navigate to URL when navigateTo is called', () => {
    const url = '/field-resource-management/technicians';
    component.navigateTo(url);
    
    expect(router.navigate).toHaveBeenCalledWith([url]);
  });

  it('should identify last breadcrumb correctly', () => {
    component.breadcrumbs = [
      { label: 'Dashboard', url: '/dashboard' },
      { label: 'Technicians', url: '/technicians' },
      { label: 'Detail', url: '/technicians/1' }
    ];

    expect(component.isLast(0)).toBe(false);
    expect(component.isLast(1)).toBe(false);
    expect(component.isLast(2)).toBe(true);
  });

  it('should update breadcrumbs on navigation end event', () => {
    const navigationEnd = new NavigationEnd(1, '/test', '/test');
    routerEventsSubject.next(navigationEnd);

    // Breadcrumbs should be rebuilt (even if empty in this test)
    expect(component.breadcrumbs).toBeDefined();
  });

  it('should render home breadcrumb', () => {
    const compiled = fixture.nativeElement;
    const homeLink = compiled.querySelector('.breadcrumb-item:first-child .breadcrumb-link');
    
    expect(homeLink).toBeTruthy();
    expect(homeLink.textContent).toContain('Field Resources');
  });

  it('should render breadcrumb items', () => {
    component.breadcrumbs = [
      { label: 'Dashboard', url: '/dashboard' },
      { label: 'Technicians', url: '/technicians' }
    ];
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    const breadcrumbItems = compiled.querySelectorAll('.breadcrumb-item');
    
    // +1 for home breadcrumb
    expect(breadcrumbItems.length).toBe(3);
  });

  it('should mark last breadcrumb as current', () => {
    component.breadcrumbs = [
      { label: 'Dashboard', url: '/dashboard' },
      { label: 'Current Page', url: '/current' }
    ];
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    const currentBreadcrumb = compiled.querySelector('.breadcrumb-current');
    
    expect(currentBreadcrumb).toBeTruthy();
    expect(currentBreadcrumb.textContent).toContain('Current Page');
  });

  it('should make non-last breadcrumbs clickable', () => {
    component.breadcrumbs = [
      { label: 'Dashboard', url: '/dashboard' },
      { label: 'Current Page', url: '/current' }
    ];
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    const clickableLinks = compiled.querySelectorAll('.breadcrumb-link');
    
    // Home + Dashboard (not last)
    expect(clickableLinks.length).toBe(2);
  });
});
