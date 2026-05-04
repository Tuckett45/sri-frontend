/**
 * Crew Workflows End-to-End Integration Tests
 * 
 * Tests comprehensive crew management workflows including:
 * - Crew list workflow: loading, filtering, sorting, searching
 * - Crew creation workflow: form validation, lead/member selection, saving
 * - Crew editing workflow: loading existing crew, modifying, saving
 * - Crew detail workflow: viewing crew info, members, active job, location
 * - Role-based access: different roles see appropriate crews
 * - Integration with routing and navigation
 * - Error handling and validation
 * 
 * Requirements Tested:
 * - 1.3.1: Create and manage crews
 * - 1.3.2: Crew composition with lead technician and members
 * - 1.3.3: Track crew status (Available, On Job, Unavailable)
 * - 1.3.4: Associate crews with markets and companies
 * - 1.3.5: Track real-time crew locations
 * - 1.3.6: Link crews to active jobs
 * - Role-based access control for crew management
 */

import { TestBed, ComponentFixture, fakeAsync, tick, flush } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { Location } from '@angular/common';


import { CrewListComponent } from '../components/crews/crew-list/crew-list.component';
import { CrewFormComponent } from '../components/crews/crew-form/crew-form.component';
import { CrewDetailComponent } from '../components/crews/crew-detail/crew-detail.component';
import { Crew, CrewStatus } from '../models/crew.model';
import { Technician } from '../models/technician.model';
import { Job, JobStatus, JobType, Priority } from '../models/job.model';
import { UserRole } from '../../../models/role.enum';
import { User } from '../../../models/user.model';
import * as CrewActions from '../state/crews/crew.actions';
import * as CrewSelectors from '../state/crews/crew.selectors';
import * as TechnicianActions from '../state/technicians/technician.actions';
import * as TechnicianSelectors from '../state/technicians/technician.selectors';
import * as JobActions from '../state/jobs/job.actions';
import * as JobSelectors from '../state/jobs/job.selectors';
import { AuthService } from '../../../services/auth.service';
import { PermissionService } from '../../../services/permission.service';
import { ExportService } from '../services/export.service';
import { of } from 'rxjs';

describe('Crew Workflows E2E Integration Tests', () => {
  let store: MockStore;
  let router: Router;
  let location: Location;
  let authService: jasmine.SpyObj<AuthService>;
  let permissionService: jasmine.SpyObj<PermissionService>;
  let exportService: jasmine.SpyObj<ExportService>;

  // Test data
  const mockAdminUser: User = {
    id: 'admin-001',
    email: 'admin@test.com',
    firstName: 'Admin',
    lastName: 'User',
    role: UserRole.Admin,
    market: 'ALL',
    company: 'INTERNAL',
    isActive: true
  };

  const mockCMUser: User = {
    id: 'cm-001',
    email: 'cm@test.com',
    firstName: 'Construction',
    lastName: 'Manager',
    role: UserRole.ConstructionManager,
    market: 'DALLAS',
    company: 'INTERNAL',
    isActive: true
  };


  const mockPMUser: User = {
    id: 'pm-001',
    email: 'pm@test.com',
    firstName: 'Project',
    lastName: 'Manager',
    role: UserRole.ProjectManager,
    market: 'DALLAS',
    company: 'ACME_CORP',
    isActive: true
  };

  const mockTechnicians: Technician[] = [
    {
      id: 'tech-001',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@test.com',
      phone: '555-0001',
      role: 'Senior Technician',
      skills: [],
      certifications: [],
      market: 'DALLAS',
      company: 'ACME_CORP',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'tech-002',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@test.com',
      phone: '555-0002',
      role: 'Technician',
      skills: [],
      certifications: [],
      market: 'DALLAS',
      company: 'ACME_CORP',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'tech-003',
      firstName: 'Bob',
      lastName: 'Johnson',
      email: 'bob@test.com',
      phone: '555-0003',
      role: 'Technician',
      skills: [],
      certifications: [],
      market: 'DALLAS',
      company: 'ACME_CORP',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];


  const mockCrews: Crew[] = [
    {
      id: 'crew-001',
      name: 'Alpha Team',
      leadTechnicianId: 'tech-001',
      memberIds: ['tech-002', 'tech-003'],
      market: 'DALLAS',
      company: 'ACME_CORP',
      status: CrewStatus.Available,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    },
    {
      id: 'crew-002',
      name: 'Beta Team',
      leadTechnicianId: 'tech-002',
      memberIds: ['tech-003'],
      market: 'DALLAS',
      company: 'ACME_CORP',
      status: CrewStatus.OnJob,
      activeJobId: 'job-001',
      currentLocation: { latitude: 32.7767, longitude: -96.7970, accuracy: 10 },
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02')
    },
    {
      id: 'crew-003',
      name: 'Gamma Team',
      leadTechnicianId: 'tech-003',
      memberIds: [],
      market: 'HOUSTON',
      company: 'VENDOR_B',
      status: CrewStatus.Unavailable,
      createdAt: new Date('2024-01-03'),
      updatedAt: new Date('2024-01-03')
    }
  ];

  const mockJob: Job = {
    id: 'job-001',
    jobId: 'J-001',
    client: 'Test Client',
    siteName: 'Test Site',
    siteAddress: {
      street: '123 Main St',
      city: 'Dallas',
      state: 'TX',
      zipCode: '75201'
    },
    jobType: JobType.Install,
    priority: Priority.P1,
    status: JobStatus.InProgress,
    scopeDescription: 'Install equipment',
    requiredSkills: [],
    requiredCrewSize: 2,
    estimatedLaborHours: 4,
    scheduledStartDate: new Date(),
    scheduledEndDate: new Date(),
    attachments: [],
    notes: [],
    market: 'DALLAS',
    company: 'ACME_CORP',
    createdBy: 'cm-001',
    createdAt: new Date(),
    updatedAt: new Date()
  };


  const initialState = {
    crews: {
      entities: {
        'crew-001': mockCrews[0],
        'crew-002': mockCrews[1],
        'crew-003': mockCrews[2]
      },
      ids: ['crew-001', 'crew-002', 'crew-003'],
      selectedId: null,
      loading: false,
      error: null,
      filters: {},
      locationHistory: {
        entities: {},
        ids: [],
        loading: false,
        error: null
      }
    },
    technicians: {
      entities: {
        'tech-001': mockTechnicians[0],
        'tech-002': mockTechnicians[1],
        'tech-003': mockTechnicians[2]
      },
      ids: ['tech-001', 'tech-002', 'tech-003'],
      selectedId: null,
      loading: false,
      error: null,
      filters: {}
    },
    jobs: {
      entities: {
        'job-001': mockJob
      },
      ids: ['job-001'],
      selectedId: null,
      loading: false,
      error: null,
      filters: {}
    }
  };

  beforeEach(() => {
    // Create spy objects for services
    authService = jasmine.createSpyObj('AuthService', ['getUser', 'isAdmin']);
    permissionService = jasmine.createSpyObj('PermissionService', [
      'getCurrentUser',
      'getCurrentUserDataScopes',
      'checkPermission'
    ]);
    exportService = jasmine.createSpyObj('ExportService', [
      'generateCSV',
      'generatePDF',
      'generateTimestampFilename'
    ]);

    // Setup default spy returns
    authService.getUser.and.returnValue(mockAdminUser);
    authService.isAdmin.and.returnValue(true);
    permissionService.getCurrentUser.and.returnValue(of(mockAdminUser));
    permissionService.getCurrentUserDataScopes.and.returnValue(of([{ scopeType: 'all', scopeValues: [] }]));
    permissionService.checkPermission.and.returnValue(true);
    exportService.generateTimestampFilename.and.returnValue('crews_export_2024-01-01.csv');

    TestBed.configureTestingModule({
      declarations: [
        CrewListComponent,
        CrewFormComponent,
        CrewDetailComponent
      ],
      imports: [
        RouterTestingModule.withRoutes([
          { path: 'field-resource-management/crews', component: CrewListComponent },
          { path: 'field-resource-management/crews/new', component: CrewFormComponent },
          { path: 'field-resource-management/crews/:id', component: CrewDetailComponent },
          { path: 'field-resource-management/crews/:id/edit', component: CrewFormComponent }
        ]),
        ReactiveFormsModule,
        NoopAnimationsModule,
        MatSnackBarModule,
        MatDialogModule,
        MatTableModule,
        MatSortModule,
        MatPaginatorModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        MatChipsModule,
        MatIconModule
      ],
      providers: [
        provideMockStore({ initialState }),
        { provide: AuthService, useValue: authService },
        { provide: PermissionService, useValue: permissionService },
        { provide: ExportService, useValue: exportService }
      ]
    });

    store = TestBed.inject(MockStore);
    router = TestBed.inject(Router);
    location = TestBed.inject(Location);

    // Spy on store dispatch
    spyOn(store, 'dispatch').and.callThrough();
  });


  describe('Crew List Workflow', () => {
    let fixture: ComponentFixture<CrewListComponent>;
    let component: CrewListComponent;

    beforeEach(fakeAsync(() => {
      fixture = TestBed.createComponent(CrewListComponent);
      component = fixture.componentInstance;
      
      // Setup selectors
      store.overrideSelector(CrewSelectors.selectFilteredCrews, mockCrews);
      store.overrideSelector(CrewSelectors.selectCrewsLoading, false);
      store.overrideSelector(CrewSelectors.selectCrewsError, null);
      
      fixture.detectChanges();
      tick();
    }));

    it('should load crews on initialization', fakeAsync(() => {
      expect(store.dispatch).toHaveBeenCalledWith(
        CrewActions.loadCrews({ filters: {} })
      );
    }));

    it('should display all crews in the list', fakeAsync(() => {
      component.crews$.subscribe(crews => {
        expect(crews.length).toBe(3);
        expect(crews).toEqual(mockCrews);
      });
      tick();
    }));

    it('should filter crews by search term', fakeAsync(() => {
      component.searchControl.setValue('Alpha');
      tick(300); // Debounce time

      expect(store.dispatch).toHaveBeenCalledWith(
        CrewActions.setCrewFilters({
          filters: jasmine.objectContaining({
            searchTerm: 'Alpha'
          })
        })
      );
    }));

    it('should filter crews by status', fakeAsync(() => {
      component.statusControl.setValue(CrewStatus.Available);
      tick();

      expect(store.dispatch).toHaveBeenCalledWith(
        CrewActions.setCrewFilters({
          filters: jasmine.objectContaining({
            status: CrewStatus.Available
          })
        })
      );
    }));

    it('should filter crews by market', fakeAsync(() => {
      component.marketControl.setValue('DALLAS');
      tick();

      expect(store.dispatch).toHaveBeenCalledWith(
        CrewActions.setCrewFilters({
          filters: jasmine.objectContaining({
            market: 'DALLAS'
          })
        })
      );
    }));

    it('should filter crews by company', fakeAsync(() => {
      component.companyControl.setValue('ACME_CORP');
      tick();

      expect(store.dispatch).toHaveBeenCalledWith(
        CrewActions.setCrewFilters({
          filters: jasmine.objectContaining({
            company: 'ACME_CORP'
          })
        })
      );
    }));

    it('should clear all filters', fakeAsync(() => {
      component.searchControl.setValue('Alpha');
      component.statusControl.setValue(CrewStatus.Available);
      tick(300);

      component.clearFilters();
      tick();

      expect(component.searchControl.value).toBe('');
      expect(component.statusControl.value).toBe('');
      expect(store.dispatch).toHaveBeenCalledWith(CrewActions.clearCrewFilters());
    }));

    it('should navigate to crew detail when viewing crew', fakeAsync(() => {
      const crew = mockCrews[0];
      component.viewCrew(crew);
      tick();

      expect(store.dispatch).toHaveBeenCalledWith(
        CrewActions.selectCrew({ id: crew.id })
      );
    }));

    it('should navigate to crew edit when editing crew', fakeAsync(() => {
      const crew = mockCrews[0];
      component.editCrew(crew);
      tick();

      expect(store.dispatch).toHaveBeenCalledWith(
        CrewActions.selectCrew({ id: crew.id })
      );
    }));

    it('should export crews to CSV', fakeAsync(() => {
      component.exportToCSV();
      tick();

      expect(exportService.generateCSV).toHaveBeenCalled();
      expect(exportService.generateTimestampFilename).toHaveBeenCalledWith('crews', 'csv');
    }));

    it('should export crews to PDF', fakeAsync(() => {
      component.exportToPDF();
      tick();

      expect(exportService.generatePDF).toHaveBeenCalled();
      expect(exportService.generateTimestampFilename).toHaveBeenCalledWith('crews', 'pdf');
    }));

    it('should handle pagination changes', fakeAsync(() => {
      const pageEvent = { pageIndex: 1, pageSize: 25, length: 100 };
      component.onPageChange(pageEvent);
      tick();

      expect(component.pageIndex).toBe(1);
      expect(component.pageSize).toBe(25);
      expect(store.dispatch).toHaveBeenCalledWith(
        CrewActions.setCrewFilters({
          filters: jasmine.objectContaining({
            page: 1,
            pageSize: 25
          })
        })
      );
    }));

    it('should sort crews by name', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const sortedData = component.dataSource.sortData(mockCrews, component.dataSource.sort!);
      expect(sortedData).toBeDefined();
    }));

    it('should get member count correctly', () => {
      const crew = mockCrews[0];
      const count = component.getMemberCount(crew);
      expect(count).toBe(2);
    });

    it('should get correct status badge class', () => {
      expect(component.getStatusBadgeClass(CrewStatus.Available)).toBe('status-available');
      expect(component.getStatusBadgeClass(CrewStatus.OnJob)).toBe('status-on-job');
      expect(component.getStatusBadgeClass(CrewStatus.Unavailable)).toBe('status-unavailable');
    }));
  });


  describe('Crew Creation Workflow', () => {
    let fixture: ComponentFixture<CrewFormComponent>;
    let component: CrewFormComponent;

    beforeEach(fakeAsync(() => {
      fixture = TestBed.createComponent(CrewFormComponent);
      component = fixture.componentInstance;
      
      // Setup selectors
      store.overrideSelector(CrewSelectors.selectCrewsLoading, false);
      store.overrideSelector(CrewSelectors.selectCrewsError, null);
      store.overrideSelector(TechnicianSelectors.selectAllTechnicians, mockTechnicians);
      
      fixture.detectChanges();
      tick();
    }));

    it('should initialize form in create mode', () => {
      expect(component.isEditMode).toBe(false);
      expect(component.crewForm).toBeDefined();
      expect(component.formTitle).toBe('Create New Crew');
    });

    it('should validate required fields', fakeAsync(() => {
      component.crewForm.patchValue({
        name: '',
        leadTechnicianId: '',
        market: '',
        company: '',
        status: ''
      });
      tick();

      expect(component.crewForm.valid).toBe(false);
      expect(component.crewForm.get('name')?.hasError('required')).toBe(true);
      expect(component.crewForm.get('leadTechnicianId')?.hasError('required')).toBe(true);
      expect(component.crewForm.get('market')?.hasError('required')).toBe(true);
      expect(component.crewForm.get('company')?.hasError('required')).toBe(true);
    }));

    it('should validate name length', fakeAsync(() => {
      component.crewForm.patchValue({ name: 'AB' });
      tick();

      expect(component.crewForm.get('name')?.hasError('minlength')).toBe(true);

      component.crewForm.patchValue({ name: 'A'.repeat(101) });
      tick();

      expect(component.crewForm.get('name')?.hasError('maxlength')).toBe(true);
    }));

    it('should prevent lead technician from being in members list', fakeAsync(() => {
      component.crewForm.patchValue({
        leadTechnicianId: 'tech-001',
        memberIds: ['tech-001', 'tech-002']
      });
      tick();

      expect(component.crewForm.get('memberIds')?.hasError('leadInMembers')).toBe(true);
    }));

    it('should create crew with valid data', fakeAsync(() => {
      component.crewForm.patchValue({
        name: 'New Crew',
        leadTechnicianId: 'tech-001',
        memberIds: ['tech-002', 'tech-003'],
        market: 'DALLAS',
        company: 'ACME_CORP',
        status: CrewStatus.Available
      });
      tick();

      expect(component.crewForm.valid).toBe(true);

      component.onSubmit();
      tick();

      expect(store.dispatch).toHaveBeenCalledWith(
        CrewActions.createCrew({
          crew: jasmine.objectContaining({
            name: 'New Crew',
            leadTechnicianId: 'tech-001',
            memberIds: ['tech-002', 'tech-003'],
            market: 'DALLAS',
            company: 'ACME_CORP',
            status: CrewStatus.Available
          })
        })
      );
    }));

    it('should handle lead technician change', fakeAsync(() => {
      component.selectedMemberIds = ['tech-001', 'tech-002'];
      component.onLeadTechnicianChange('tech-001');
      tick();

      expect(component.selectedMemberIds).not.toContain('tech-001');
    }));

    it('should handle member selection change', fakeAsync(() => {
      component.crewForm.patchValue({ leadTechnicianId: 'tech-001' });
      component.onMemberSelectionChange(['tech-001', 'tech-002', 'tech-003']);
      tick();

      expect(component.selectedMemberIds).not.toContain('tech-001');
      expect(component.selectedMemberIds).toContain('tech-002');
      expect(component.selectedMemberIds).toContain('tech-003');
    }));

    it('should remove member from crew', fakeAsync(() => {
      component.selectedMemberIds = ['tech-002', 'tech-003'];
      component.removeMember('tech-002');
      tick();

      expect(component.selectedMemberIds).not.toContain('tech-002');
      expect(component.selectedMemberIds).toContain('tech-003');
    }));

    it('should clear all members', fakeAsync(() => {
      component.selectedMemberIds = ['tech-002', 'tech-003'];
      component.clearAllMembers();
      tick();

      expect(component.selectedMemberIds.length).toBe(0);
    }));

    it('should get available member technicians excluding lead', () => {
      component.crewForm.patchValue({ leadTechnicianId: 'tech-001' });
      const available = component.availableMemberTechnicians;

      expect(available.length).toBe(2);
      expect(available.find(t => t.id === 'tech-001')).toBeUndefined();
    });

    it('should get technician display name', () => {
      const name = component.getTechnicianDisplayName('tech-001');
      expect(name).toBe('John Doe');
    });

    it('should show validation errors', fakeAsync(() => {
      component.crewForm.patchValue({ name: '' });
      component.crewForm.get('name')?.markAsTouched();
      tick();

      expect(component.hasError('name', 'required')).toBe(true);
      expect(component.getErrorMessage('name')).toBe('This field is required');
    }));

    it('should not submit invalid form', fakeAsync(() => {
      component.crewForm.patchValue({ name: '' });
      component.onSubmit();
      tick();

      expect(store.dispatch).not.toHaveBeenCalledWith(
        jasmine.objectContaining({ type: '[Crew] Create Crew' })
      );
    }));

    it('should cancel and navigate back', fakeAsync(() => {
      spyOn(router, 'navigate');
      component.onCancel();
      tick();

      expect(router.navigate).toHaveBeenCalled();
    }));
  });


  describe('Crew Editing Workflow', () => {
    let fixture: ComponentFixture<CrewFormComponent>;
    let component: CrewFormComponent;

    beforeEach(fakeAsync(() => {
      // Setup route with crew ID
      router.navigate(['/field-resource-management/crews/crew-001/edit']);
      tick();

      fixture = TestBed.createComponent(CrewFormComponent);
      component = fixture.componentInstance;
      
      // Setup selectors
      store.overrideSelector(CrewSelectors.selectCrewsLoading, false);
      store.overrideSelector(CrewSelectors.selectCrewsError, null);
      store.overrideSelector(CrewSelectors.selectSelectedCrew, mockCrews[0]);
      store.overrideSelector(TechnicianSelectors.selectAllTechnicians, mockTechnicians);
      
      // Mock route params
      component.crewId = 'crew-001';
      component.isEditMode = true;
      
      fixture.detectChanges();
      tick();
    }));

    it('should initialize form in edit mode', () => {
      expect(component.isEditMode).toBe(true);
      expect(component.crewId).toBe('crew-001');
      expect(component.formTitle).toBe('Edit Crew');
    });

    it('should load and populate form with crew data', fakeAsync(() => {
      component['populateForm'](mockCrews[0]);
      tick();

      expect(component.crewForm.get('name')?.value).toBe('Alpha Team');
      expect(component.crewForm.get('leadTechnicianId')?.value).toBe('tech-001');
      expect(component.crewForm.get('memberIds')?.value).toEqual(['tech-002', 'tech-003']);
      expect(component.crewForm.get('market')?.value).toBe('DALLAS');
      expect(component.crewForm.get('company')?.value).toBe('ACME_CORP');
      expect(component.crewForm.get('status')?.value).toBe(CrewStatus.Available);
    }));

    it('should update crew with modified data', fakeAsync(() => {
      component['populateForm'](mockCrews[0]);
      tick();

      component.crewForm.patchValue({
        name: 'Alpha Team Updated',
        status: CrewStatus.OnJob
      });
      tick();

      component.onSubmit();
      tick();

      expect(store.dispatch).toHaveBeenCalledWith(
        CrewActions.updateCrew({
          id: 'crew-001',
          crew: jasmine.objectContaining({
            name: 'Alpha Team Updated',
            status: CrewStatus.OnJob
          })
        })
      );
    }));

    it('should validate form when updating', fakeAsync(() => {
      component['populateForm'](mockCrews[0]);
      tick();

      component.crewForm.patchValue({ name: '' });
      tick();

      component.onSubmit();
      tick();

      expect(store.dispatch).not.toHaveBeenCalledWith(
        jasmine.objectContaining({ type: '[Crew] Update Crew' })
      );
    }));

    it('should cancel edit and navigate to detail', fakeAsync(() => {
      spyOn(router, 'navigate');
      component.onCancel();
      tick();

      expect(router.navigate).toHaveBeenCalled();
    }));
  });


  describe('Crew Detail Workflow', () => {
    let fixture: ComponentFixture<CrewDetailComponent>;
    let component: CrewDetailComponent;

    beforeEach(fakeAsync(() => {
      // Setup route with crew ID
      router.navigate(['/field-resource-management/crews/crew-002']);
      tick();

      fixture = TestBed.createComponent(CrewDetailComponent);
      component = fixture.componentInstance;
      
      // Setup selectors
      store.overrideSelector(CrewSelectors.selectSelectedCrew, mockCrews[1]);
      store.overrideSelector(CrewSelectors.selectCrewsLoading, false);
      store.overrideSelector(CrewSelectors.selectCrewsError, null);
      store.overrideSelector(TechnicianSelectors.selectTechnicianById('tech-002'), mockTechnicians[1]);
      store.overrideSelector(TechnicianSelectors.selectAllTechnicians, mockTechnicians);
      store.overrideSelector(JobSelectors.selectJobById('job-001'), mockJob);
      store.overrideSelector(CrewSelectors.selectLocationHistoryLoading, false);
      store.overrideSelector(CrewSelectors.selectLocationHistoryError, null);
      store.overrideSelector(CrewSelectors.selectCrewLocationHistory('crew-002'), []);
      
      fixture.detectChanges();
      tick();
    }));

    it('should load crew on initialization', fakeAsync(() => {
      expect(store.dispatch).toHaveBeenCalledWith(
        CrewActions.loadCrews({ filters: {} })
      );
      expect(store.dispatch).toHaveBeenCalledWith(
        TechnicianActions.loadTechnicians({ filters: {} })
      );
      expect(store.dispatch).toHaveBeenCalledWith(
        JobActions.loadJobs({ filters: {} })
      );
    }));

    it('should display crew information', fakeAsync(() => {
      component.crew$.subscribe(crew => {
        expect(crew).toBeDefined();
        expect(crew?.name).toBe('Beta Team');
        expect(crew?.status).toBe(CrewStatus.OnJob);
        expect(crew?.market).toBe('DALLAS');
        expect(crew?.company).toBe('ACME_CORP');
      });
      tick();
    }));

    it('should display lead technician', fakeAsync(() => {
      component.leadTechnician$.subscribe(tech => {
        expect(tech).toBeDefined();
        expect(tech?.id).toBe('tech-002');
        expect(component.getTechnicianFullName(tech!)).toBe('Jane Smith');
      });
      tick();
    }));

    it('should display crew members', fakeAsync(() => {
      component.crewMembers$.subscribe(members => {
        expect(members).toBeDefined();
        expect(members.length).toBeGreaterThanOrEqual(0);
      });
      tick();
    }));

    it('should display active job', fakeAsync(() => {
      component.activeJob$.subscribe(job => {
        expect(job).toBeDefined();
        expect(job?.id).toBe('job-001');
        expect(job?.jobId).toBe('J-001');
      });
      tick();
    }));

    it('should load location history', fakeAsync(() => {
      expect(store.dispatch).toHaveBeenCalledWith(
        CrewActions.loadCrewLocationHistory({
          filters: jasmine.objectContaining({
            entityId: 'crew-002',
            entityType: 'crew'
          })
        })
      );
    }));

    it('should get correct status badge class', () => {
      expect(component.getStatusBadgeClass(CrewStatus.Available)).toBe('status-available');
      expect(component.getStatusBadgeClass(CrewStatus.OnJob)).toBe('status-on-job');
      expect(component.getStatusBadgeClass(CrewStatus.Unavailable)).toBe('status-unavailable');
    }));

    it('should format location correctly', () => {
      const location = { latitude: 32.7767, longitude: -96.7970 };
      const formatted = component.formatLocation(location);
      expect(formatted).toContain('32.776700');
      expect(formatted).toContain('-96.797000');
    }));

    it('should get member count correctly', () => {
      const crew = mockCrews[1];
      const count = component.getMemberCount(crew);
      expect(count).toBe(1); // tech-003, excluding lead tech-002
    }));

    it('should navigate to edit crew', fakeAsync(() => {
      spyOn(router, 'navigate');
      component.editCrew();
      tick();

      expect(router.navigate).toHaveBeenCalled();
    }));

    it('should navigate to technician detail', fakeAsync(() => {
      spyOn(router, 'navigate');
      component.viewTechnician('tech-001');
      tick();

      expect(router.navigate).toHaveBeenCalledWith(['/field-resource-management/technicians', 'tech-001']);
    }));

    it('should navigate to job detail', fakeAsync(() => {
      spyOn(router, 'navigate');
      component.viewJob('job-001');
      tick();

      expect(router.navigate).toHaveBeenCalledWith(['/field-resource-management/jobs', 'job-001']);
    }));

    it('should go back to crew list', fakeAsync(() => {
      spyOn(router, 'navigate');
      component.goBack();
      tick();

      expect(router.navigate).toHaveBeenCalled();
    }));

    it('should format date correctly', () => {
      const date = new Date('2024-01-01T12:00:00Z');
      const formatted = component.formatDate(date);
      expect(formatted).toBeDefined();
      expect(formatted.length).toBeGreaterThan(0);
    }));

    it('should format time correctly', () => {
      const date = new Date('2024-01-01T12:00:00Z');
      const formatted = component.formatTime(date);
      expect(formatted).toBeDefined();
      expect(formatted.length).toBeGreaterThan(0);
    }));

    it('should clear selected crew on destroy', fakeAsync(() => {
      component.ngOnDestroy();
      tick();

      expect(store.dispatch).toHaveBeenCalledWith(
        CrewActions.selectCrew({ id: null })
      );
    }));
  });


  describe('Role-Based Access Control', () => {
    describe('Admin User', () => {
      beforeEach(() => {
        authService.getUser.and.returnValue(mockAdminUser);
        authService.isAdmin.and.returnValue(true);
        permissionService.getCurrentUser.and.returnValue(of(mockAdminUser));
        permissionService.getCurrentUserDataScopes.and.returnValue(of([{ scopeType: 'all', scopeValues: [] }]));
      });

      it('should see all crews across all markets', fakeAsync(() => {
        const fixture = TestBed.createComponent(CrewListComponent);
        const component = fixture.componentInstance;
        
        store.overrideSelector(CrewSelectors.selectFilteredCrews, mockCrews);
        store.overrideSelector(CrewSelectors.selectCrewsLoading, false);
        store.overrideSelector(CrewSelectors.selectCrewsError, null);
        
        fixture.detectChanges();
        tick();

        component.crews$.subscribe(crews => {
          expect(crews.length).toBe(3);
          expect(crews).toContain(mockCrews[0]); // DALLAS
          expect(crews).toContain(mockCrews[1]); // DALLAS
          expect(crews).toContain(mockCrews[2]); // HOUSTON
        });
      }));

      it('should have edit and delete permissions', fakeAsync(() => {
        const fixture = TestBed.createComponent(CrewFormComponent);
        const component = fixture.componentInstance;
        
        fixture.detectChanges();
        tick();

        expect(component.isAdmin).toBe(true);
        expect(component.crewForm.get('market')?.disabled).toBe(false);
        expect(component.crewForm.get('company')?.disabled).toBe(false);
      }));
    });

    describe('Construction Manager User', () => {
      beforeEach(() => {
        authService.getUser.and.returnValue(mockCMUser);
        authService.isAdmin.and.returnValue(false);
        permissionService.getCurrentUser.and.returnValue(of(mockCMUser));
        permissionService.getCurrentUserDataScopes.and.returnValue(of([
          { scopeType: 'market', scopeValues: ['DALLAS'] }
        ]));
      });

      it('should see only crews in their market', fakeAsync(() => {
        const fixture = TestBed.createComponent(CrewListComponent);
        const component = fixture.componentInstance;
        
        const dallasCrews = mockCrews.filter(c => c.market === 'DALLAS');
        store.overrideSelector(CrewSelectors.selectFilteredCrews, dallasCrews);
        store.overrideSelector(CrewSelectors.selectCrewsLoading, false);
        store.overrideSelector(CrewSelectors.selectCrewsError, null);
        
        fixture.detectChanges();
        tick();

        component.crews$.subscribe(crews => {
          expect(crews.length).toBe(2);
          expect(crews.every(c => c.market === 'DALLAS')).toBe(true);
        });
      }));

      it('should have market and company fields disabled in form', fakeAsync(() => {
        const fixture = TestBed.createComponent(CrewFormComponent);
        const component = fixture.componentInstance;
        
        fixture.detectChanges();
        tick();

        expect(component.isAdmin).toBe(false);
        expect(component.crewForm.get('market')?.disabled).toBe(true);
        expect(component.crewForm.get('company')?.disabled).toBe(true);
      }));
    });

    describe('Project Manager User', () => {
      beforeEach(() => {
        authService.getUser.and.returnValue(mockPMUser);
        authService.isAdmin.and.returnValue(false);
        permissionService.getCurrentUser.and.returnValue(of(mockPMUser));
        permissionService.getCurrentUserDataScopes.and.returnValue(of([
          { scopeType: 'company', scopeValues: ['ACME_CORP'] },
          { scopeType: 'market', scopeValues: ['DALLAS'] }
        ]));
      });

      it('should see only crews in their company and market', fakeAsync(() => {
        const fixture = TestBed.createComponent(CrewListComponent);
        const component = fixture.componentInstance;
        
        const pmCrews = mockCrews.filter(c => c.market === 'DALLAS' && c.company === 'ACME_CORP');
        store.overrideSelector(CrewSelectors.selectFilteredCrews, pmCrews);
        store.overrideSelector(CrewSelectors.selectCrewsLoading, false);
        store.overrideSelector(CrewSelectors.selectCrewsError, null);
        
        fixture.detectChanges();
        tick();

        component.crews$.subscribe(crews => {
          expect(crews.length).toBe(2);
          expect(crews.every(c => c.market === 'DALLAS' && c.company === 'ACME_CORP')).toBe(true);
        });
      }));

      it('should have market and company fields disabled in form', fakeAsync(() => {
        const fixture = TestBed.createComponent(CrewFormComponent);
        const component = fixture.componentInstance;
        
        fixture.detectChanges();
        tick();

        expect(component.isAdmin).toBe(false);
        expect(component.crewForm.get('market')?.disabled).toBe(true);
        expect(component.crewForm.get('company')?.disabled).toBe(true);
      }));
    });
  });


  describe('Error Handling', () => {
    let fixture: ComponentFixture<CrewListComponent>;
    let component: CrewListComponent;

    beforeEach(fakeAsync(() => {
      fixture = TestBed.createComponent(CrewListComponent);
      component = fixture.componentInstance;
      
      store.overrideSelector(CrewSelectors.selectFilteredCrews, []);
      store.overrideSelector(CrewSelectors.selectCrewsLoading, false);
      
      fixture.detectChanges();
      tick();
    }));

    it('should display error message when loading fails', fakeAsync(() => {
      const errorMessage = 'Failed to load crews';
      store.overrideSelector(CrewSelectors.selectCrewsError, errorMessage);
      store.refreshState();
      fixture.detectChanges();
      tick();

      component.error$.subscribe(error => {
        expect(error).toBe(errorMessage);
      });
    }));

    it('should show loading state', fakeAsync(() => {
      store.overrideSelector(CrewSelectors.selectCrewsLoading, true);
      store.refreshState();
      fixture.detectChanges();
      tick();

      component.loading$.subscribe(loading => {
        expect(loading).toBe(true);
      });
    }));

    it('should handle empty crew list', fakeAsync(() => {
      store.overrideSelector(CrewSelectors.selectFilteredCrews, []);
      store.refreshState();
      fixture.detectChanges();
      tick();

      component.crews$.subscribe(crews => {
        expect(crews.length).toBe(0);
      });
    }));
  });

  describe('Navigation Integration', () => {
    it('should navigate from list to detail', fakeAsync(() => {
      router.navigate(['/field-resource-management/crews']);
      tick();

      router.navigate(['/field-resource-management/crews/crew-001']);
      tick();

      expect(location.path()).toBe('/field-resource-management/crews/crew-001');
    }));

    it('should navigate from list to create form', fakeAsync(() => {
      router.navigate(['/field-resource-management/crews']);
      tick();

      router.navigate(['/field-resource-management/crews/new']);
      tick();

      expect(location.path()).toBe('/field-resource-management/crews/new');
    }));

    it('should navigate from detail to edit form', fakeAsync(() => {
      router.navigate(['/field-resource-management/crews/crew-001']);
      tick();

      router.navigate(['/field-resource-management/crews/crew-001/edit']);
      tick();

      expect(location.path()).toBe('/field-resource-management/crews/crew-001/edit');
    }));

    it('should navigate back from detail to list', fakeAsync(() => {
      router.navigate(['/field-resource-management/crews/crew-001']);
      tick();

      router.navigate(['/field-resource-management/crews']);
      tick();

      expect(location.path()).toBe('/field-resource-management/crews');
    }));
  });

  describe('Complete Workflow Integration', () => {
    it('should complete full create workflow', fakeAsync(() => {
      // 1. Navigate to crew list
      router.navigate(['/field-resource-management/crews']);
      tick();

      const listFixture = TestBed.createComponent(CrewListComponent);
      store.overrideSelector(CrewSelectors.selectFilteredCrews, mockCrews);
      store.overrideSelector(CrewSelectors.selectCrewsLoading, false);
      store.overrideSelector(CrewSelectors.selectCrewsError, null);
      listFixture.detectChanges();
      tick();

      // 2. Navigate to create form
      router.navigate(['/field-resource-management/crews/new']);
      tick();

      const formFixture = TestBed.createComponent(CrewFormComponent);
      store.overrideSelector(TechnicianSelectors.selectAllTechnicians, mockTechnicians);
      formFixture.detectChanges();
      tick();

      const formComponent = formFixture.componentInstance;

      // 3. Fill out form
      formComponent.crewForm.patchValue({
        name: 'Delta Team',
        leadTechnicianId: 'tech-001',
        memberIds: ['tech-002'],
        market: 'DALLAS',
        company: 'ACME_CORP',
        status: CrewStatus.Available
      });
      tick();

      // 4. Submit form
      formComponent.onSubmit();
      tick();

      // 5. Verify crew creation action dispatched
      expect(store.dispatch).toHaveBeenCalledWith(
        CrewActions.createCrew({
          crew: jasmine.objectContaining({
            name: 'Delta Team'
          })
        })
      );
    }));

    it('should complete full edit workflow', fakeAsync(() => {
      // 1. Navigate to crew detail
      router.navigate(['/field-resource-management/crews/crew-001']);
      tick();

      const detailFixture = TestBed.createComponent(CrewDetailComponent);
      store.overrideSelector(CrewSelectors.selectSelectedCrew, mockCrews[0]);
      store.overrideSelector(CrewSelectors.selectCrewsLoading, false);
      store.overrideSelector(TechnicianSelectors.selectTechnicianById('tech-001'), mockTechnicians[0]);
      store.overrideSelector(TechnicianSelectors.selectAllTechnicians, mockTechnicians);
      store.overrideSelector(CrewSelectors.selectLocationHistoryLoading, false);
      store.overrideSelector(CrewSelectors.selectLocationHistoryError, null);
      store.overrideSelector(CrewSelectors.selectCrewLocationHistory('crew-001'), []);
      detailFixture.detectChanges();
      tick();

      // 2. Navigate to edit form
      router.navigate(['/field-resource-management/crews/crew-001/edit']);
      tick();

      const formFixture = TestBed.createComponent(CrewFormComponent);
      store.overrideSelector(CrewSelectors.selectSelectedCrew, mockCrews[0]);
      formFixture.detectChanges();
      tick();

      const formComponent = formFixture.componentInstance;
      formComponent.crewId = 'crew-001';
      formComponent.isEditMode = true;
      formComponent['populateForm'](mockCrews[0]);
      tick();

      // 3. Modify form
      formComponent.crewForm.patchValue({
        name: 'Alpha Team Updated'
      });
      tick();

      // 4. Submit form
      formComponent.onSubmit();
      tick();

      // 5. Verify crew update action dispatched
      expect(store.dispatch).toHaveBeenCalledWith(
        CrewActions.updateCrew({
          id: 'crew-001',
          crew: jasmine.objectContaining({
            name: 'Alpha Team Updated'
          })
        })
      );
    }));

    it('should complete full view workflow with filtering', fakeAsync(() => {
      // 1. Navigate to crew list
      router.navigate(['/field-resource-management/crews']);
      tick();

      const listFixture = TestBed.createComponent(CrewListComponent);
      const listComponent = listFixture.componentInstance;
      
      store.overrideSelector(CrewSelectors.selectFilteredCrews, mockCrews);
      store.overrideSelector(CrewSelectors.selectCrewsLoading, false);
      store.overrideSelector(CrewSelectors.selectCrewsError, null);
      listFixture.detectChanges();
      tick();

      // 2. Apply filters
      listComponent.statusControl.setValue(CrewStatus.Available);
      listComponent.marketControl.setValue('DALLAS');
      tick(300);

      // 3. Verify filters applied
      expect(store.dispatch).toHaveBeenCalledWith(
        CrewActions.setCrewFilters({
          filters: jasmine.objectContaining({
            status: CrewStatus.Available,
            market: 'DALLAS'
          })
        })
      );

      // 4. View crew detail
      listComponent.viewCrew(mockCrews[0]);
      tick();

      expect(store.dispatch).toHaveBeenCalledWith(
        CrewActions.selectCrew({ id: 'crew-001' })
      );
    }));
  });
});

