import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSortModule } from '@angular/material/sort';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { TechnicianListComponent } from './technician-list.component';
import { Technician, TechnicianRole, EmploymentType, SkillLevel } from '../../../models/technician.model';
import * as TechnicianActions from '../../../state/technicians/technician.actions';
import * as TechnicianSelectors from '../../../state/technicians/technician.selectors';
import { selectAllTravelProfiles } from '../../../state/travel/travel.selectors';
import { HighlightPipe } from '../../../pipes/highlight.pipe';

describe('TechnicianListComponent', () => {
  let component: TechnicianListComponent;
  let fixture: ComponentFixture<TechnicianListComponent>;
  let store: MockStore;

  const mockTechnicians: Technician[] = [
    {
      id: '1',
      technicianId: 'TECH001',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '555-0100',
      role: TechnicianRole.Installer,
      employmentType: EmploymentType.W2,
      homeBase: 'New York',
      region: 'Northeast',
      skills: [
        { id: 's1', name: 'Cat6', category: 'Cabling', level: SkillLevel.Intermediate },
        { id: 's2', name: 'Fiber Splicing', category: 'Fiber', level: SkillLevel.Advanced }
      ],
      certifications: [],
      availability: [],
      isActive: true,
      canTravel: false,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '2',
      technicianId: 'TECH002',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      phone: '555-0200',
      role: TechnicianRole.Lead,
      employmentType: EmploymentType.W2,
      homeBase: 'Boston',
      region: 'Southeast',
      skills: [
        { id: 's3', name: 'OSHA10', category: 'Safety', level: SkillLevel.Beginner }
      ],
      certifications: [],
      availability: [],
      isActive: false,
      canTravel: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const initialState = {
    technicians: {
      ids: ['1', '2'],
      entities: {
        '1': mockTechnicians[0],
        '2': mockTechnicians[1]
      },
      selectedId: null,
      loading: false,
      error: null,
      filters: {}
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TechnicianListComponent, HighlightPipe],
      imports: [
        ReactiveFormsModule,
        NoopAnimationsModule,
        RouterTestingModule,
        MatTableModule,
        MatPaginatorModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatCheckboxModule,
        MatIconModule,
        MatButtonModule,
        MatCardModule,
        MatChipsModule,
        MatTooltipModule,
        MatProgressSpinnerModule,
        MatMenuModule,
        MatDialogModule,
        MatSortModule,
        MatExpansionModule,
        MatSnackBarModule,
        ScrollingModule
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        provideMockStore({ initialState })
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    store.overrideSelector(TechnicianSelectors.selectFilteredTechnicians, mockTechnicians);
    store.overrideSelector(TechnicianSelectors.selectTechniciansLoading, false);
    store.overrideSelector(TechnicianSelectors.selectTechniciansError, null);
    store.overrideSelector(selectAllTravelProfiles, []);
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TechnicianListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Requirement 9.1: Display name, role, region, skills, active status
  describe('Requirement 9.1 - Display technician data', () => {
    it('should include region in displayed columns', () => {
      expect(component.displayedColumns).toContain('region');
    });

    it('should include name, role, skills, status columns', () => {
      expect(component.displayedColumns).toContain('name');
      expect(component.displayedColumns).toContain('role');
      expect(component.displayedColumns).toContain('skills');
      expect(component.displayedColumns).toContain('status');
    });

    it('should get full name correctly', () => {
      expect(component.getFullName(mockTechnicians[0])).toBe('John Doe');
      expect(component.getFullName(mockTechnicians[1])).toBe('Jane Smith');
    });

    it('should get skill names correctly', () => {
      expect(component.getSkillNames(mockTechnicians[0])).toEqual(['Cat6', 'Fiber Splicing']);
      expect(component.getSkillNames(mockTechnicians[1])).toEqual(['OSHA10']);
    });

    it('should return correct active status', () => {
      expect(component.getCurrentStatus(mockTechnicians[0])).toBe('Active');
      expect(component.getCurrentStatus(mockTechnicians[1])).toBe('Inactive');
    });

    it('should render table when not loading', () => {
      const compiled = fixture.nativeElement;
      const tableContainer = compiled.querySelector('.table-container');
      expect(tableContainer).toBeTruthy();
    });
  });

  // Requirement 9.2: Filters work
  describe('Requirement 9.2 - Filters', () => {
    it('should dispatch loadTechnicians action on init', () => {
      const dispatchSpy = spyOn(store, 'dispatch');
      component.ngOnInit();
      expect(dispatchSpy).toHaveBeenCalled();
    });

    it('should apply search filter with debounce', (done) => {
      const dispatchSpy = spyOn(store, 'dispatch');
      component.searchControl.setValue('John');
      setTimeout(() => {
        expect(dispatchSpy).toHaveBeenCalled();
        done();
      }, 350);
    });

    it('should apply role filter', () => {
      const dispatchSpy = spyOn(store, 'dispatch');
      component.roleControl.setValue(TechnicianRole.Installer);
      expect(dispatchSpy).toHaveBeenCalled();
    });

    it('should apply skills filter', () => {
      const dispatchSpy = spyOn(store, 'dispatch');
      component.skillsControl.setValue(['Cat6'] as any);
      expect(dispatchSpy).toHaveBeenCalled();
    });

    it('should apply region filter', () => {
      const dispatchSpy = spyOn(store, 'dispatch');
      component.regionControl.setValue('Northeast');
      expect(dispatchSpy).toHaveBeenCalled();
    });

    it('should apply active status filter', () => {
      const dispatchSpy = spyOn(store, 'dispatch');
      component.activeStatusControl.setValue('active');
      expect(dispatchSpy).toHaveBeenCalled();
    });

    it('should apply availability filter', () => {
      const dispatchSpy = spyOn(store, 'dispatch');
      component.availabilityControl.setValue(true);
      expect(dispatchSpy).toHaveBeenCalled();
    });

    it('should include region in dispatched filters', () => {
      const dispatchSpy = spyOn(store, 'dispatch');
      component.regionControl.setValue('Northeast');
      const dispatchedAction = dispatchSpy.calls.mostRecent().args[0] as any;
      expect(dispatchedAction.filters.region).toBe('Northeast');
    });

    it('should include isActive true when active status filter is active', () => {
      const dispatchSpy = spyOn(store, 'dispatch');
      component.activeStatusControl.setValue('active');
      const dispatchedAction = dispatchSpy.calls.mostRecent().args[0] as any;
      expect(dispatchedAction.filters.isActive).toBe(true);
    });

    it('should include isActive false when active status filter is inactive', () => {
      const dispatchSpy = spyOn(store, 'dispatch');
      component.activeStatusControl.setValue('inactive');
      const dispatchedAction = dispatchSpy.calls.mostRecent().args[0] as any;
      expect(dispatchedAction.filters.isActive).toBe(false);
    });

    it('should clear all filters including region and activeStatus', () => {
      component.searchControl.setValue('test');
      component.roleControl.setValue(TechnicianRole.Installer);
      component.regionControl.setValue('Northeast');
      component.activeStatusControl.setValue('active');
      component.clearFilters();

      expect(component.searchControl.value).toBe('');
      expect(component.roleControl.value).toBe('');
      expect(component.regionControl.value).toBe('');
      expect(component.activeStatusControl.value).toBe('');
    });

    it('should populate available regions from technicians', () => {
      expect(component.availableRegions).toContain('Northeast');
      expect(component.availableRegions).toContain('Southeast');
    });

    it('should handle page change', () => {
      const event = { pageIndex: 1, pageSize: 25, length: 100 };
      component.onPageChange(event);
      expect(component.pageIndex).toBe(1);
      expect(component.pageSize).toBe(25);
    });
  });

  // Requirement 9.3: Empty state
  describe('Requirement 9.3 - Empty state', () => {
    it('should show no-data row when technician list is empty', () => {
      store.overrideSelector(TechnicianSelectors.selectFilteredTechnicians, []);
      store.refreshState();
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const noDataText = compiled.querySelector('.empty-state');
      expect(noDataText).toBeTruthy();
    });
  });

  // Requirement 9.4: Loading indicator
  describe('Requirement 9.4 - Loading state', () => {
    it('should show loading spinner when loading', () => {
      store.overrideSelector(TechnicianSelectors.selectTechniciansLoading, true);
      store.refreshState();
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const spinner = compiled.querySelector('.loading-container');
      expect(spinner).toBeTruthy();
    });

    it('should hide table when loading', () => {
      store.overrideSelector(TechnicianSelectors.selectTechniciansLoading, true);
      store.refreshState();
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const tableContainer = compiled.querySelector('.table-container');
      expect(tableContainer).toBeFalsy();
    });
  });

  // Requirement 9.5: Error with retry
  describe('Requirement 9.5 - Error state with retry', () => {
    it('should show error card when error exists', () => {
      store.overrideSelector(TechnicianSelectors.selectTechniciansError, 'Failed to load technicians');
      store.refreshState();
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const errorCard = compiled.querySelector('.error-card');
      expect(errorCard).toBeTruthy();
      expect(errorCard.textContent).toContain('Failed to load technicians');
    });

    it('should have retry button in error card', () => {
      store.overrideSelector(TechnicianSelectors.selectTechniciansError, 'Failed to load technicians');
      store.refreshState();
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const retryButton = compiled.querySelector('.error-card .retry-button');
      expect(retryButton).toBeTruthy();
    });

    it('should dispatch loadTechnicians on retry', () => {
      const dispatchSpy = spyOn(store, 'dispatch');
      component.retryLoad();
      expect(dispatchSpy).toHaveBeenCalledWith(
        TechnicianActions.loadTechnicians({ filters: {} })
      );
    });

    it('should not show error card when no error', () => {
      const compiled = fixture.nativeElement;
      const errorCard = compiled.querySelector('.error-card');
      expect(errorCard).toBeFalsy();
    });
  });

  // Requirement 9.6: CM market-based filtering
  describe('Requirement 9.6 - CM market-based filtering', () => {
    it('should use selectFilteredTechnicians selector which supports region filtering', () => {
      // The selectFilteredTechnicians selector in technician.selectors.ts
      // filters by region when filters.region is set.
      // CM users get market-based filtering via the region filter in the selector.
      // Verify the component dispatches filters with region.
      const dispatchSpy = spyOn(store, 'dispatch');
      component.regionControl.setValue('Northeast');
      const dispatchedAction = dispatchSpy.calls.mostRecent().args[0] as any;
      expect(dispatchedAction.type).toBe('[Technician] Set Filters');
      expect(dispatchedAction.filters.region).toBe('Northeast');
    });

    it('should support scoped selectors for market-based filtering', () => {
      // Verify that selectScopedTechnicians exists and can filter by market
      // This is used when CM role is active
      expect(TechnicianSelectors.selectScopedTechnicians).toBeDefined();
      expect(TechnicianSelectors.selectFilteredScopedTechnicians).toBeDefined();
    });
  });

  // Additional component behavior tests
  describe('Component behavior', () => {
    it('should dispatch toggle status action', () => {
      const dispatchSpy = spyOn(store, 'dispatch');
      component.toggleTechnicianStatus(mockTechnicians[0]);
      expect(dispatchSpy).toHaveBeenCalled();
    });

    it('should get active filters including region and activeStatus', () => {
      component.regionControl.setValue('Northeast');
      component.activeStatusControl.setValue('active');
      const filters = component.getActiveFilters();
      const regionFilter = filters.find(f => f.key === 'region');
      const statusFilter = filters.find(f => f.key === 'activeStatus');
      expect(regionFilter).toBeTruthy();
      expect(regionFilter!.value).toBe('Northeast');
      expect(statusFilter).toBeTruthy();
      expect(statusFilter!.value).toBe('Active');
    });
  });
});
