import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FrmLayoutComponent } from './frm-layout.component';
import { selectSidebarOpen } from '../../../state/ui/ui.selectors';
import { toggleSidebar } from '../../../state/ui/ui.actions';

describe('FrmLayoutComponent', () => {
  let component: FrmLayoutComponent;
  let fixture: ComponentFixture<FrmLayoutComponent>;
  let store: MockStore;

  const initialState = {
    ui: {
      sidebarOpen: false,
      mapView: {
        center: { lat: 0, lng: 0 },
        zoom: 10,
        selectedMarkerId: null
      },
      selectedFilters: {
        status: [],
        priority: [],
        market: [],
        company: [],
        dateRange: null
      },
      notifications: []
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FrmLayoutComponent],
      imports: [RouterTestingModule],
      providers: [
        provideMockStore({ initialState })
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(FrmLayoutComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Sidebar State', () => {
    it('should select sidebar open state from store', (done) => {
      store.overrideSelector(selectSidebarOpen, true);
      store.refreshState();

      component.sidebarOpen$.subscribe(isOpen => {
        expect(isOpen).toBe(true);
        done();
      });
    });

    it('should dispatch toggleSidebar action when toggleSidebar is called', () => {
      const dispatchSpy = spyOn(store, 'dispatch');
      
      component.toggleSidebar();
      
      expect(dispatchSpy).toHaveBeenCalledWith(toggleSidebar());
    });

    it('should dispatch toggleSidebar action when closeSidebar is called', () => {
      const dispatchSpy = spyOn(store, 'dispatch');
      
      component.closeSidebar();
      
      expect(dispatchSpy).toHaveBeenCalledWith(toggleSidebar());
    });
  });

  describe('Component Lifecycle', () => {
    it('should initialize on ngOnInit', () => {
      component.ngOnInit();
      expect(component).toBeTruthy();
    });

    it('should cleanup on ngOnDestroy', () => {
      const destroySpy = spyOn(component['destroy$'], 'next');
      const completeSpy = spyOn(component['destroy$'], 'complete');
      
      component.ngOnDestroy();
      
      expect(destroySpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });
  });

  describe('Template Rendering', () => {
    it('should render sidebar', () => {
      fixture.detectChanges();
      const sidebar = fixture.nativeElement.querySelector('.frm-sidebar');
      expect(sidebar).toBeTruthy();
    });

    it('should render main content area', () => {
      fixture.detectChanges();
      const main = fixture.nativeElement.querySelector('.frm-main');
      expect(main).toBeTruthy();
    });

    it('should render router outlet', () => {
      fixture.detectChanges();
      const outlet = fixture.nativeElement.querySelector('router-outlet');
      expect(outlet).toBeTruthy();
    });

    it('should apply open class to sidebar when sidebarOpen is true', () => {
      store.overrideSelector(selectSidebarOpen, true);
      store.refreshState();
      fixture.detectChanges();

      const sidebar = fixture.nativeElement.querySelector('.frm-sidebar');
      expect(sidebar.classList.contains('open')).toBe(true);
    });

    it('should not apply open class to sidebar when sidebarOpen is false', () => {
      store.overrideSelector(selectSidebarOpen, false);
      store.refreshState();
      fixture.detectChanges();

      const sidebar = fixture.nativeElement.querySelector('.frm-sidebar');
      expect(sidebar.classList.contains('open')).toBe(false);
    });
  });

  describe('Accessibility', () => {
    it('should have navigation role on sidebar', () => {
      fixture.detectChanges();
      const sidebar = fixture.nativeElement.querySelector('.frm-sidebar');
      expect(sidebar.getAttribute('role')).toBe('navigation');
    });

    it('should have aria-label on sidebar', () => {
      fixture.detectChanges();
      const sidebar = fixture.nativeElement.querySelector('.frm-sidebar');
      expect(sidebar.getAttribute('aria-label')).toBe('Field Resource Management Navigation');
    });

    it('should have aria-label on toggle buttons', () => {
      fixture.detectChanges();
      const toggleButtons = fixture.nativeElement.querySelectorAll('button[aria-label]');
      expect(toggleButtons.length).toBeGreaterThan(0);
    });
  });
});
