import { ComponentFixture, TestBed, fakeAsync, tick, discardPeriodicTasks, flush } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSortModule } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';

import { CrewListComponent } from './crew-list.component';
import { HighlightPipe } from '../../../pipes/highlight.pipe';
import { RoleBasedShowDirective } from '../../../../../directives/role-based-show.directive';
import { Crew, CrewStatus } from '../../../models/crew.model';
import * as CrewSelectors from '../../../state/crews/crew.selectors';
import * as CrewActions from '../../../state/crews/crew.actions';
import { ExportService } from '../../../services/export.service';
import { PermissionService } from '../../../../../services/permission.service';
import { UserRole } from '../../../../../models/role.enum';
import { User } from '../../../../../models/user.model';
import { DataScope, ScopeType } from '../../../services/data-scope.service';

describe('CrewListComponent', () => {
  let component: CrewListComponent;
  let fixture: ComponentFixture<CrewListComponent>;
  let store: MockStore;
  let exportService: jasmine.SpyObj<ExportService>;
  let permissionService: jasmine.SpyObj<PermissionService>;
  let router: Router;
  let activatedRoute: ActivatedRoute;

  const mockAdminUser: User = {
    id: 'admin-1',
    email: 'admin@test.com',
    role: UserRole.Admin,
    market: 'ALL',
    company: 'INTERNAL',
    name: 'Admin User',
    password: '',
    createdDate: new Date(),
    isApproved: true
  };

  const mockCMUser: User = {
    id: 'cm-1',
    email: 'cm@test.com',
    role: UserRole.CM,
    market: 'Dallas',
    company: 'INTERNAL',
    name: 'CM User',
    password: '',
    createdDate: new Date(),
    isApproved: true
  };

  const mockPMUser: User = {
    id: 'pm-1',
    email: 'pm@test.com',
    role: UserRole.PM,
    market: 'Dallas',
    company: 'ACME Corp',
    name: 'PM User',
    password: '',
    createdDate: new Date(),
    isApproved: true
  };

  const mockAdminDataScopes: DataScope[] = [
    { scopeType: 'all' as ScopeType, scopeValues: [] }
  ];

  const mockCMDataScopes: DataScope[] = [
    { scopeType: 'market' as ScopeType, scopeValues: ['Dallas'] }
  ];

  const mockPMDataScopes: DataScope[] = [
    { scopeType: 'company' as ScopeType, scopeValues: ['ACME Corp'] },
    { scopeType: 'market' as ScopeType, scopeValues: ['Dallas'] }
  ];

  const mockCrews: Crew[] = [
    {
      id: 'crew-1',
      name: 'Alpha Crew',
      leadTechnicianId: 'tech-1',
      memberIds: ['tech-1', 'tech-2', 'tech-3'],
      market: 'Dallas',
      company: 'ACME Corp',
      status: CrewStatus.Available,
      currentLocation: { latitude: 32.7767, longitude: -96.7970, accuracy: 10 },
      activeJobId: undefined,
      createdAt: new Date('2024-01-01'),      updatedAt: new Date('2024-01-01')
    },
    {
      id: 'crew-2',
      name: 'Beta Crew',
      leadTechnicianId: 'tech-4',
      memberIds: ['tech-4', 'tech-5'],
      market: 'Houston',
      company: 'Beta Inc',
      status: CrewStatus.OnJob,
      currentLocation: { latitude: 29.7604, longitude: -95.3698, accuracy: 10 },
      activeJobId: 'job-1',
      createdAt: new Date('2024-01-02'),      updatedAt: new Date('2024-01-02')
    },
    {
      id: 'crew-3',
      name: 'Gamma Crew',
      leadTechnicianId: 'tech-6',
      memberIds: ['tech-6', 'tech-7', 'tech-8', 'tech-9'],
      market: 'Dallas',
      company: 'ACME Corp',
      status: CrewStatus.Unavailable,
      createdAt: new Date('2024-01-03'),      updatedAt: new Date('2024-01-03')
    }
  ];

  const initialState = {
    crews: {
      ids: mockCrews.map(c => c.id),
      entities: mockCrews.reduce((acc, crew) => ({ ...acc, [crew.id]: crew }), {}),
      selectedId: null,
      loading: false,
      error: null,
      filters: {}
    }
  };

  beforeEach(async () => {
    const exportServiceSpy = jasmine.createSpyObj('ExportService', [
      'generateCSV',
      'generatePDF',
      'generateTimestampFilename',
      'formatDate'
    ]);

    const permissionServiceSpy = jasmine.createSpyObj('PermissionService', [
      'getCurrentUser',
      'getCurrentUserDataScopes',
      'checkPermission'
    ]);

    // Default to admin user for most tests
    permissionServiceSpy.getCurrentUser.and.returnValue(of(mockAdminUser));
    permissionServiceSpy.getCurrentUserDataScopes.and.returnValue(of(mockAdminDataScopes));
    permissionServiceSpy.checkPermission.and.returnValue(true);

    await TestBed.configureTestingModule({
      declarations: [CrewListComponent, HighlightPipe, RoleBasedShowDirective],
      imports: [
        ReactiveFormsModule,
        RouterTestingModule,
        NoopAnimationsModule,
        MatSnackBarModule,
        MatTableModule,
        MatPaginatorModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatIconModule,
        MatButtonModule,
        MatCardModule,
        MatExpansionModule,
        MatChipsModule,
        MatMenuModule,
        MatTooltipModule,
        MatSortModule,
        MatProgressSpinnerModule,
        ScrollingModule,
        HttpClientTestingModule
      ],
      providers: [
        provideMockStore({ initialState }),
        { provide: ExportService, useValue: exportServiceSpy },
        { provide: PermissionService, useValue: permissionServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({})
          }
        }
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    exportService = TestBed.inject(ExportService) as jasmine.SpyObj<ExportService>;
    permissionService = TestBed.inject(PermissionService) as jasmine.SpyObj<PermissionService>;
    router = TestBed.inject(Router);
    activatedRoute = TestBed.inject(ActivatedRoute);

    // Setup selectors
    store.overrideSelector(CrewSelectors.selectFilteredCrews, mockCrews);
    store.overrideSelector(CrewSelectors.selectCrewsLoading, false);
    store.overrideSelector(CrewSelectors.selectCrewsError, null);

    fixture = TestBed.createComponent(CrewListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should dispatch loadCrews action on init', () => {
      spyOn(store, 'dispatch');
      component.ngOnInit();
      expect(store.dispatch).toHaveBeenCalledWith(
        CrewActions.loadCrews({ filters: {} })
      );
    });

    it('should load crews from store', (done) => {
      component.crews$.subscribe(crews => {
        expect(crews).toEqual(mockCrews);
        expect(crews.length).toBe(3);
        done();
      });
    });

    it('should extract unique markets from crews', (done) => {
      component.crews$.subscribe(() => {
        expect(component.availableMarkets).toContain('Dallas');
        expect(component.availableMarkets).toContain('Houston');
        expect(component.availableMarkets.length).toBe(2);
        done();
      });
    });

    it('should extract unique companies from crews', (done) => {
      component.crews$.subscribe(() => {
        expect(component.availableCompanies).toContain('ACME Corp');
        expect(component.availableCompanies).toContain('Beta Inc');
        expect(component.availableCompanies.length).toBe(2);
        done();
      });
    });
  });

  describe('Search and Filtering', () => {
    it('should apply filters when search term changes', fakeAsync(() => {
      spyOn(store, 'dispatch');
      component.searchControl.setValue('Alpha');
      
      tick(350); // Wait for debounce
      
      expect(store.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: CrewActions.setCrewFilters.type
        })
      );
    }));

    it('should debounce search input', fakeAsync(() => {
      spyOn(store, 'dispatch');
      
      component.searchControl.setValue('A');
      tick(100);
      component.searchControl.setValue('Al');
      tick(100);
      component.searchControl.setValue('Alp');
      tick(100);
      component.searchControl.setValue('Alph');
      tick(350);
      
      // Should only dispatch once after debounce completes
      const dispatchCalls = (store.dispatch as jasmine.Spy).calls.all().filter(
        call => call.args[0].type === CrewActions.setCrewFilters.type
      );
      expect(dispatchCalls.length).toBe(1);
    }));

    it('should apply filters when status changes', () => {
      spyOn(store, 'dispatch');
      component.statusControl.setValue(CrewStatus.Available);
      
      expect(store.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: CrewActions.setCrewFilters.type
        })
      );
    });

    it('should apply filters when market changes', () => {
      spyOn(store, 'dispatch');
      component.marketControl.setValue('Dallas');
      
      expect(store.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: CrewActions.setCrewFilters.type
        })
      );
    });

    it('should apply filters when company changes', () => {
      spyOn(store, 'dispatch');
      component.companyControl.setValue('ACME Corp');
      
      expect(store.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: CrewActions.setCrewFilters.type
        })
      );
    });

    it('should clear all filters', () => {
      spyOn(store, 'dispatch');
      component.searchControl.setValue('test');
      component.statusControl.setValue(CrewStatus.Available);
      component.marketControl.setValue('Dallas');
      component.companyControl.setValue('ACME Corp');
      
      component.clearFilters();
      
      expect(component.searchControl.value).toBe('');
      expect(component.statusControl.value).toBe('');
      expect(component.marketControl.value).toBe('');
      expect(component.companyControl.value).toBe('');
      expect(store.dispatch).toHaveBeenCalledWith(CrewActions.clearCrewFilters());
    });

    it('should get active filters', () => {
      component.searchControl.setValue('Alpha');
      component.statusControl.setValue(CrewStatus.Available);
      
      const activeFilters = component.getActiveFilters();
      
      expect(activeFilters.length).toBe(2);
      expect(activeFilters[0]).toEqual({ label: 'Search', value: 'Alpha', key: 'search' });
      expect(activeFilters[1]).toEqual({ label: 'Status', value: CrewStatus.Available, key: 'status' });
    });

    it('should remove specific filter', () => {
      component.searchControl.setValue('Alpha');
      component.statusControl.setValue(CrewStatus.Available);
      
      component.removeFilter('search');
      
      expect(component.searchControl.value).toBe('');
      expect(component.statusControl.value).toBe(CrewStatus.Available);
    });
  });

  describe('Pagination', () => {
    it('should handle page change', () => {
      spyOn(store, 'dispatch');
      const event = { pageIndex: 1, pageSize: 25, length: 100 };
      
      component.onPageChange(event);
      
      expect(component.pageIndex).toBe(1);
      expect(component.pageSize).toBe(25);
      expect(store.dispatch).toHaveBeenCalled();
    });

    it('should reset to first page when filters change', () => {
      component.pageIndex = 2;
      component.searchControl.setValue('test');
      
      component.applyFilters();
      
      expect(component.pageIndex).toBe(0);
    });
  });

  describe('Navigation', () => {
    it('should navigate to crew detail on view', () => {
      spyOn(store, 'dispatch');
      spyOn(component['router'], 'navigate');
      
      component.viewCrew(mockCrews[0]);
      
      expect(store.dispatch).toHaveBeenCalledWith(
        CrewActions.selectCrew({ id: 'crew-1' })
      );
      expect(component['router'].navigate).toHaveBeenCalledWith(
        ['/field-resource-management/crews', 'crew-1']
      );
    });

    it('should navigate to crew edit on edit', () => {
      spyOn(store, 'dispatch');
      spyOn(component['router'], 'navigate');
      
      component.editCrew(mockCrews[0]);
      
      expect(store.dispatch).toHaveBeenCalledWith(
        CrewActions.selectCrew({ id: 'crew-1' })
      );
      expect(component['router'].navigate).toHaveBeenCalledWith(
        ['/field-resource-management/crews', 'crew-1', 'edit']
      );
    });
  });

  describe('Helper Methods', () => {
    it('should get member count', () => {
      const count = component.getMemberCount(mockCrews[0]);
      expect(count).toBe(3);
    });

    it('should get status badge class', () => {
      expect(component.getStatusBadgeClass(CrewStatus.Available)).toBe('status-available');
      expect(component.getStatusBadgeClass(CrewStatus.OnJob)).toBe('status-on-job');
      expect(component.getStatusBadgeClass(CrewStatus.Unavailable)).toBe('status-unavailable');
    });
  });

  describe('Export', () => {
    it('should export to CSV', () => {
      exportService.generateTimestampFilename.and.returnValue('crews_2024-01-01.csv');
      
      component.exportToCSV();
      
      expect(exportService.generateTimestampFilename).toHaveBeenCalledWith('crews', 'csv');
      expect(exportService.generateCSV).toHaveBeenCalled();
    });

    it('should export to PDF', async () => {
      exportService.generateTimestampFilename.and.returnValue('crews_2024-01-01.pdf');
      exportService.generatePDF.and.returnValue(Promise.resolve());
      
      await component.exportToPDF();
      
      expect(exportService.generateTimestampFilename).toHaveBeenCalledWith('crews', 'pdf');
      expect(exportService.generatePDF).toHaveBeenCalled();
    });
  });

  describe('Loading and Error States', () => {
    it('should show loading spinner when loading', () => {
      store.overrideSelector(CrewSelectors.selectCrewsLoading, true);
      store.refreshState();
      fixture.detectChanges();
      
      const spinner = fixture.nativeElement.querySelector('mat-spinner');
      expect(spinner).toBeTruthy();
    });

    it('should show error message when error exists', () => {
      store.overrideSelector(CrewSelectors.selectCrewsError, 'Failed to load crews');
      store.refreshState();
      fixture.detectChanges();
      
      const errorCard = fixture.nativeElement.querySelector('.error-card');
      expect(errorCard).toBeTruthy();
      expect(errorCard.textContent).toContain('Failed to load crews');
    });

    it('should dispatch loadCrews on retry', () => {
      store.overrideSelector(CrewSelectors.selectCrewsError, 'Failed to load crews');
      store.refreshState();
      fixture.detectChanges();

      spyOn(store, 'dispatch');
      const retryButton = fixture.nativeElement.querySelector('.retry-button');
      expect(retryButton).toBeTruthy();
      retryButton.click();

      expect(store.dispatch).toHaveBeenCalledWith(
        CrewActions.loadCrews({ filters: {} })
      );
    });
  });

  describe('Cleanup', () => {
    it('should unsubscribe on destroy', () => {
      spyOn(component['destroy$'], 'next');
      spyOn(component['destroy$'], 'complete');
      
      component.ngOnDestroy();
      
      expect(component['destroy$'].next).toHaveBeenCalled();
      expect(component['destroy$'].complete).toHaveBeenCalled();
    });
  });

  describe('Role-Based Data Scoping', () => {
    it('should load scoped crews for CM user', fakeAsync(() => {
      permissionService.getCurrentUser.and.returnValue(of(mockCMUser));
      permissionService.getCurrentUserDataScopes.and.returnValue(of(mockCMDataScopes));
      
      const scopedCrews = mockCrews.filter(c => c.market === 'Dallas');
      store.overrideSelector(
        CrewSelectors.selectFilteredScopedCrews(mockCMUser, mockCMDataScopes),
        scopedCrews
      );
      
      component.ngOnInit();
      tick();
      
      component.crews$.subscribe(crews => {
        expect(crews.length).toBe(2); // Only Dallas crews
        expect(crews.every(c => c.market === 'Dallas')).toBe(true);
      });
    }));

    it('should load scoped crews for PM user', fakeAsync(() => {
      permissionService.getCurrentUser.and.returnValue(of(mockPMUser));
      permissionService.getCurrentUserDataScopes.and.returnValue(of(mockPMDataScopes));
      
      const scopedCrews = mockCrews.filter(
        c => c.market === 'Dallas' && c.company === 'ACME Corp'
      );
      store.overrideSelector(
        CrewSelectors.selectFilteredScopedCrews(mockPMUser, mockPMDataScopes),
        scopedCrews
      );
      
      component.ngOnInit();
      tick();
      
      component.crews$.subscribe(crews => {
        expect(crews.length).toBe(2); // Only Dallas + ACME Corp crews
        expect(crews.every(c => c.market === 'Dallas' && c.company === 'ACME Corp')).toBe(true);
      });
    }));

    it('should load all crews for Admin user', fakeAsync(() => {
      permissionService.getCurrentUser.and.returnValue(of(mockAdminUser));
      permissionService.getCurrentUserDataScopes.and.returnValue(of(mockAdminDataScopes));
      
      store.overrideSelector(
        CrewSelectors.selectFilteredScopedCrews(mockAdminUser, mockAdminDataScopes),
        mockCrews
      );
      
      component.ngOnInit();
      tick();
      
      component.crews$.subscribe(crews => {
        expect(crews.length).toBe(3); // All crews
      });
    }));

    it('should extract markets from scoped data only', fakeAsync(() => {
      permissionService.getCurrentUser.and.returnValue(of(mockCMUser));
      permissionService.getCurrentUserDataScopes.and.returnValue(of(mockCMDataScopes));
      
      const scopedCrews = mockCrews.filter(c => c.market === 'Dallas');
      store.overrideSelector(
        CrewSelectors.selectFilteredScopedCrews(mockCMUser, mockCMDataScopes),
        scopedCrews
      );
      
      component.ngOnInit();
      tick();
      
      component.crews$.subscribe(() => {
        expect(component.availableMarkets).toEqual(['Dallas']);
        expect(component.availableMarkets).not.toContain('Houston');
      });
    }));

    it('should extract companies from scoped data only', fakeAsync(() => {
      permissionService.getCurrentUser.and.returnValue(of(mockPMUser));
      permissionService.getCurrentUserDataScopes.and.returnValue(of(mockPMDataScopes));
      
      const scopedCrews = mockCrews.filter(
        c => c.market === 'Dallas' && c.company === 'ACME Corp'
      );
      store.overrideSelector(
        CrewSelectors.selectFilteredScopedCrews(mockPMUser, mockPMDataScopes),
        scopedCrews
      );
      
      component.ngOnInit();
      tick();
      
      component.crews$.subscribe(() => {
        expect(component.availableCompanies).toEqual(['ACME Corp']);
        expect(component.availableCompanies).not.toContain('Beta Inc');
      });
    }));
  });

  describe('URL Query Parameters', () => {
    it('should load filters from URL query params', fakeAsync(() => {
      const queryParams = {
        search: 'Alpha',
        status: CrewStatus.Available,
        market: 'Dallas',
        company: 'ACME Corp',
        page: '2',
        pageSize: '25'
      };
      
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        declarations: [CrewListComponent, HighlightPipe, RoleBasedShowDirective],
        imports: [
          ReactiveFormsModule,
          RouterTestingModule,
          NoopAnimationsModule,
          MatSnackBarModule,
          MatTableModule,
          MatPaginatorModule,
          MatFormFieldModule,
          MatInputModule,
          MatSelectModule,
          MatIconModule,
          MatButtonModule,
          MatCardModule,
          MatExpansionModule,
          MatChipsModule,
          MatMenuModule,
          MatTooltipModule,
          MatSortModule,
          MatProgressSpinnerModule,
          ScrollingModule,
        HttpClientTestingModule
        ],
        providers: [
          provideMockStore({ initialState }),
          { provide: ExportService, useValue: exportService },
          { provide: PermissionService, useValue: permissionService },
          {
            provide: ActivatedRoute,
            useValue: {
              queryParams: of(queryParams)
            }
          }
        ]
      });
      
      fixture = TestBed.createComponent(CrewListComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
      tick();
      
      expect(component.searchControl.value).toBe('Alpha');
      expect(component.statusControl.value).toBe(CrewStatus.Available);
      expect(component.marketControl.value).toBe('Dallas');
      expect(component.companyControl.value).toBe('ACME Corp');
      expect(component.pageIndex).toBe(2);
      expect(component.pageSize).toBe(25);
    }));

    it('should update URL when filters change', () => {
      spyOn(router, 'navigate');
      
      component.searchControl.setValue('Beta');
      component.applyFilters();
      
      expect(router.navigate).toHaveBeenCalledWith(
        [],
        jasmine.objectContaining({
          queryParams: jasmine.objectContaining({
            search: 'Beta'
          })
        })
      );
    });

    it('should clear URL params when filters are cleared', () => {
      spyOn(router, 'navigate');
      
      component.searchControl.setValue('test');
      component.statusControl.setValue(CrewStatus.Available);
      component.clearFilters();
      
      expect(router.navigate).toHaveBeenCalled();
    });
  });

  describe('Sorting', () => {
    it('should setup custom sort accessor after view init', () => {
      component.ngAfterViewInit();
      
      expect(component.dataSource.sort).toBeTruthy();
      expect(component.dataSource.sortingDataAccessor).toBeDefined();
    });

    it('should sort by member count correctly', () => {
      component.ngAfterViewInit();
      
      const sortAccessor = component.dataSource.sortingDataAccessor;
      const count = sortAccessor(mockCrews[0], 'memberCount');
      
      expect(count).toBe(3);
    });

    it('should sort by name correctly', () => {
      component.ngAfterViewInit();
      
      const sortAccessor = component.dataSource.sortingDataAccessor;
      const name = sortAccessor(mockCrews[0], 'name');
      
      expect(name).toBe('alpha crew');
    });

    it('should sort by status correctly', () => {
      component.ngAfterViewInit();
      
      const sortAccessor = component.dataSource.sortingDataAccessor;
      const status = sortAccessor(mockCrews[0], 'status');
      
      expect(status).toBe(CrewStatus.Available);
    });
  });

  describe('Data Source Integration', () => {
    it('should update data source when crews change', fakeAsync(() => {
      const newCrew: Crew = {
        id: 'crew-4',
        name: 'Delta Crew',
        leadTechnicianId: 'tech-10',
        memberIds: ['tech-10'],
        market: 'Austin',
        company: 'Delta Corp',
        status: CrewStatus.Available,
        createdAt: new Date('2024-01-04'),
        updatedAt: new Date('2024-01-04')
      } as Crew;
      const newCrews: Crew[] = [...mockCrews, newCrew];

      // Update the underlying store state so the scoped selector picks up the change
      store.setState({
        crews: {
          ids: newCrews.map(c => c.id),
          entities: newCrews.reduce((acc, crew) => ({ ...acc, [crew.id]: crew }), {}),
          selectedId: null,
          loading: false,
          error: null,
          filters: {}
        }
      });
      store.refreshState();
      fixture.detectChanges();
      tick();

      expect(component.dataSource.data.length).toBe(4);
    }));
  });

  describe('Export with Filters', () => {
    it('should include filter summary in CSV export', fakeAsync(() => {
      exportService.generateTimestampFilename.and.returnValue('crews_2024-01-01.csv');
      
      component.searchControl.setValue('Alpha');
      component.statusControl.setValue(CrewStatus.Available);
      tick(350); // Flush debounce timer (300ms)
      
      component.exportToCSV();
      flush(); // Drain all remaining timers (snackbar duration, etc.)
      
      const csvCall = exportService.generateCSV.calls.mostRecent();
      const headers = csvCall.args[0].headers;
      
      expect(headers[0]).toContain('Filters Applied');
      expect(headers[0]).toContain('Search: Alpha');
      expect(headers[0]).toContain('Status: AVAILABLE');
    }));

    it('should include filter summary in PDF export', fakeAsync(() => {
      exportService.generateTimestampFilename.and.returnValue('crews_2024-01-01.pdf');
      exportService.generatePDF.and.returnValue(Promise.resolve());
      
      component.marketControl.setValue('Dallas');
      tick(350); // Flush any debounce timers
      
      component.exportToPDF();
      flush(); // Drain all remaining timers (snackbar duration, etc.)
      
      const pdfCall = exportService.generatePDF.calls.mostRecent();
      const title = pdfCall.args[0].title;
      
      expect(title).toContain('Filters');
      expect(title).toContain('Market: Dallas');
    }));

    it('should handle PDF export error gracefully', fakeAsync(() => {
      exportService.generateTimestampFilename.and.returnValue('crews_2024-01-01.pdf');
      exportService.generatePDF.and.returnValue(Promise.reject(new Error('PDF generation failed')));
      
      spyOn(component['snackBar'], 'open');
      
      component.exportToPDF();
      tick();
      
      expect(component['snackBar'].open).toHaveBeenCalledWith(
        'Failed to export to PDF',
        'Close',
        { duration: 5000 }
      );
    }));
  });

  describe('Edge Cases', () => {
    it('should handle empty crew list', fakeAsync(() => {
      // Update the underlying store state to have no crews
      store.setState({
        crews: {
          ids: [],
          entities: {},
          selectedId: null,
          loading: false,
          error: null,
          filters: {}
        }
      });
      store.refreshState();
      fixture.detectChanges();
      tick();
      
      expect(component.dataSource.data.length).toBe(0);
      expect(component.availableMarkets.length).toBe(0);
      expect(component.availableCompanies.length).toBe(0);
    }));

    it('should handle crew without location', () => {
      const crewWithoutLocation = mockCrews[2]; // Gamma Crew has no location
      
      component.exportToCSV();
      
      const csvCall = exportService.generateCSV.calls.mostRecent();
      const data = csvCall.args[0].data;
      const gammaRow = data.find((row: string[]) => row[1] === 'Gamma Crew');
      
      expect(gammaRow).toBeDefined();
      if (gammaRow) {
        expect(gammaRow[8]).toBe('No');
      }
    });

    it('should handle crew without active job', () => {
      const crewWithoutJob = mockCrews[0]; // Alpha Crew has no active job
      
      component.exportToCSV();
      
      const csvCall = exportService.generateCSV.calls.mostRecent();
      const data = csvCall.args[0].data;
      const alphaRow = data.find((row: string[]) => row[1] === 'Alpha Crew');
      
      expect(alphaRow).toBeDefined();
      if (alphaRow) {
        expect(alphaRow[7]).toBe('N/A');
      }
    });

    it('should handle multiple filters simultaneously', () => {
      spyOn(store, 'dispatch');
      
      component.searchControl.setValue('Alpha');
      component.statusControl.setValue(CrewStatus.Available);
      component.marketControl.setValue('Dallas');
      component.companyControl.setValue('ACME Corp');
      
      component.applyFilters();
      
      const dispatchCall = (store.dispatch as jasmine.Spy).calls.mostRecent();
      const filters = dispatchCall.args[0].filters;
      
      expect(filters.searchTerm).toBe('Alpha');
      expect(filters.status).toBe(CrewStatus.Available);
      expect(filters.market).toBe('Dallas');
      expect(filters.company).toBe('ACME Corp');
    });

    it('should reset page to 0 when filters change', () => {
      component.pageIndex = 5;
      component.searchControl.setValue('test');
      
      component.applyFilters();
      
      expect(component.pageIndex).toBe(0);
    });

    it('should not reset page when only pagination changes', () => {
      component.pageIndex = 2;
      component.searchControl.setValue('');
      component.statusControl.setValue('');
      component.marketControl.setValue('');
      component.companyControl.setValue('');
      
      component.applyFilters();
      
      expect(component.pageIndex).toBe(2);
    });
  });

  describe('Filter Chips', () => {
    it('should return empty array when no filters active', () => {
      component.searchControl.setValue('');
      component.statusControl.setValue('');
      component.marketControl.setValue('');
      component.companyControl.setValue('');
      
      const activeFilters = component.getActiveFilters();
      
      expect(activeFilters.length).toBe(0);
    });

    it('should return all active filters', () => {
      component.searchControl.setValue('Alpha');
      component.statusControl.setValue(CrewStatus.Available);
      component.marketControl.setValue('Dallas');
      component.companyControl.setValue('ACME Corp');
      
      const activeFilters = component.getActiveFilters();
      
      expect(activeFilters.length).toBe(4);
      expect(activeFilters.map(f => f.key)).toEqual(['search', 'status', 'market', 'company']);
    });

    it('should remove market filter correctly', () => {
      component.marketControl.setValue('Dallas');
      component.companyControl.setValue('ACME Corp');
      
      component.removeFilter('market');
      
      expect(component.marketControl.value).toBe('');
      expect(component.companyControl.value).toBe('ACME Corp');
    });

    it('should remove company filter correctly', () => {
      component.marketControl.setValue('Dallas');
      component.companyControl.setValue('ACME Corp');
      
      component.removeFilter('company');
      
      expect(component.marketControl.value).toBe('Dallas');
      expect(component.companyControl.value).toBe('');
    });
  });
});
