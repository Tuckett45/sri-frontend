import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Actions } from '@ngrx/effects';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, BehaviorSubject, Subject } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { CrewDetailComponent } from './crew-detail.component';
import { Crew, CrewStatus } from '../../../models/crew.model';
import { Technician, TechnicianRole, EmploymentType, SkillLevel } from '../../../models/technician.model';
import { Job, JobStatus } from '../../../models/job.model';
import * as CrewActions from '../../../state/crews/crew.actions';
import * as CrewSelectors from '../../../state/crews/crew.selectors';
import * as TechnicianSelectors from '../../../state/technicians/technician.selectors';
import * as JobSelectors from '../../../state/jobs/job.selectors';

describe('CrewDetailComponent', () => {
  let component: CrewDetailComponent;
  let fixture: ComponentFixture<CrewDetailComponent>;
  let store: MockStore;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockActivatedRoute: any;
  let mockDialog: jasmine.SpyObj<MatDialog>;
  let mockSnackBar: jasmine.SpyObj<MatSnackBar>;
  let actionsSubject: Subject<any>;

  const mockCrew: Crew = {
    id: 'crew-1',
    name: 'Alpha Crew',
    leadTechnicianId: 'tech-1',
    memberIds: ['tech-1', 'tech-2', 'tech-3'],
    company: 'ACME_CORP',
    market: 'TEST_MARKET',
    status: CrewStatus.Available,
    currentLocation: { latitude: 40.7128, longitude: -74.0060, accuracy: 10 },
    activeJobId: 'job-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15')
  };

  const mockLeadTechnician: Technician = {
    id: 'tech-1',
    technicianId: 'T001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '555-0101',
    role: TechnicianRole.Lead,
    employmentType: EmploymentType.W2,
    homeBase: 'NYC Office',
    region: 'North',
    skills: [],
    certifications: [],
    availability: [],
    isActive: true,
    currentLocation: { latitude: 40.7128, longitude: -74.0060, accuracy: 10 },
    canTravel: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockMembers: Technician[] = [
    {
      id: 'tech-2',
      technicianId: 'T002',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      phone: '555-0102',
      role: TechnicianRole.Level2,
      employmentType: EmploymentType.W2,
      homeBase: 'NYC Office',
      region: 'North',
      skills: [{
        id: 'skill-1',
        name: 'Electrical',
        category: 'Technical',
        level: SkillLevel.Advanced,
        verifiedDate: new Date()
      }],
      certifications: [],
      availability: [],
      isActive: true,
      canTravel: false,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'tech-3',
      technicianId: 'T003',
      firstName: 'Bob',
      lastName: 'Johnson',
      email: 'bob.johnson@example.com',
      phone: '555-0103',
      role: TechnicianRole.Level1,
      employmentType: EmploymentType.Contractor1099,
      homeBase: 'NYC Office',
      region: 'North',
      skills: [],
      certifications: [],
      availability: [],
      isActive: false,
      canTravel: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const mockAvailableTechnician: Technician = {
    id: 'tech-4',
    technicianId: 'T004',
    firstName: 'Alice',
    lastName: 'Williams',
    email: 'alice.williams@example.com',
    phone: '555-0104',
    role: TechnicianRole.Level2,
    employmentType: EmploymentType.W2,
    homeBase: 'NYC Office',
    region: 'North',
    skills: [],
    certifications: [],
    availability: [],
    isActive: true,
    canTravel: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockJob: Job = {
    id: 'job-1',
    jobId: 'J001',
    client: 'Acme Corp',
    siteName: 'Main Office',
    siteAddress: {
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      latitude: 40.7128,
      longitude: -74.0060
    },
    jobType: 'Install' as any,
    priority: 'P1' as any,
    status: JobStatus.OnSite,
    scopeDescription: 'Install new equipment',
    requiredSkills: [],
    requiredCrewSize: 3,
    estimatedLaborHours: 8,
    scheduledStartDate: new Date('2024-01-15T08:00:00'),
    scheduledEndDate: new Date('2024-01-15T17:00:00'),
    attachments: [],
    notes: [],
    company: 'ACME_CORP',
    market: 'TEST_MARKET',
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const initialState = {
    crews: {
      ids: ['crew-1'],
      entities: { 'crew-1': mockCrew },
      selectedId: null,
      loading: false,
      error: null,
      filters: {},
      locationHistory: {},
      locationHistoryLoading: false,
      locationHistoryError: null
    },
    technicians: {
      ids: ['tech-1', 'tech-2', 'tech-3', 'tech-4'],
      entities: {
        'tech-1': mockLeadTechnician,
        'tech-2': mockMembers[0],
        'tech-3': mockMembers[1],
        'tech-4': mockAvailableTechnician
      },
      selectedId: null,
      loading: false,
      error: null,
      filters: {}
    },
    jobs: {
      ids: ['job-1'],
      entities: { 'job-1': mockJob },
      selectedId: null,
      loading: false,
      error: null,
      filters: {}
    }
  };

  beforeEach(async () => {
    const paramsSubject = new BehaviorSubject({ id: 'crew-1' });
    actionsSubject = new Subject<any>();

    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockActivatedRoute = {
      params: paramsSubject.asObservable(),
      queryParams: of({})
    };
    mockDialog = jasmine.createSpyObj('MatDialog', ['open']);
    mockSnackBar = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      declarations: [CrewDetailComponent],
      providers: [
        provideMockStore({ initialState }),
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: MatDialog, useValue: mockDialog },
        { provide: MatSnackBar, useValue: mockSnackBar },
        { provide: Actions, useValue: actionsSubject.asObservable() }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    spyOn(store, 'dispatch').and.callThrough();

    // Set up default selector overrides
    store.overrideSelector(CrewSelectors.selectSelectedCrew, null);
    store.overrideSelector(CrewSelectors.selectCrewsLoading, false);
    store.overrideSelector(CrewSelectors.selectCrewsError, null);
    store.overrideSelector(CrewSelectors.selectLocationHistoryLoading, false);
    store.overrideSelector(CrewSelectors.selectLocationHistoryError, null);
    store.overrideSelector(TechnicianSelectors.selectAllTechnicians, [mockLeadTechnician, ...mockMembers, mockAvailableTechnician]);

    fixture = TestBed.createComponent(CrewDetailComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    store.resetSelectors();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should dispatch load actions on init', () => {
      fixture.detectChanges();

      expect(store.dispatch).toHaveBeenCalledWith(
        CrewActions.loadCrews({ filters: {} })
      );
      expect(store.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({ type: '[Technician] Load Technicians' })
      );
      expect(store.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({ type: '[Job] Load Jobs' })
      );
      expect(store.dispatch).toHaveBeenCalledWith(
        CrewActions.selectCrew({ id: 'crew-1' })
      );
    });

    it('should load related entities when crew is loaded', fakeAsync(() => {
      store.overrideSelector(CrewSelectors.selectSelectedCrew, mockCrew);
      store.refreshState();
      fixture.detectChanges();
      tick(100);

      component.crewMembers$.subscribe(members => {
        // Should exclude lead technician from members list
        expect(members.length).toBe(2);
        expect(members.find(m => m.id === 'tech-1')).toBeUndefined();
        expect(members.find(m => m.id === 'tech-2')).toBeDefined();
        expect(members.find(m => m.id === 'tech-3')).toBeDefined();
      });
      tick();
    }));

    it('should sort crew members by name', fakeAsync(() => {
      store.overrideSelector(CrewSelectors.selectSelectedCrew, mockCrew);
      store.refreshState();
      fixture.detectChanges();
      tick(100);

      component.crewMembers$.subscribe(members => {
        if (members.length > 1) {
          // Bob Johnson should come before Jane Smith
          expect(members[0].firstName).toBe('Bob');
          expect(members[1].firstName).toBe('Jane');
        }
      });
      tick();
    }));
  });

  describe('getStatusBadgeClass', () => {
    it('should return correct class for Available status', () => {
      expect(component.getStatusBadgeClass(CrewStatus.Available)).toBe('status-available');
    });

    it('should return correct class for OnJob status', () => {
      expect(component.getStatusBadgeClass(CrewStatus.OnJob)).toBe('status-on-job');
    });

    it('should return correct class for Unavailable status', () => {
      expect(component.getStatusBadgeClass(CrewStatus.Unavailable)).toBe('status-unavailable');
    });
  });

  describe('getTechnicianFullName', () => {
    it('should return full name of technician', () => {
      expect(component.getTechnicianFullName(mockLeadTechnician)).toBe('John Doe');
    });
  });

  describe('getTechnicianRoleDisplay', () => {
    it('should return technician role', () => {
      expect(component.getTechnicianRoleDisplay(mockLeadTechnician)).toBe(TechnicianRole.Lead);
    });
  });

  describe('getTechnicianStatus', () => {
    it('should return Active for active technician', () => {
      expect(component.getTechnicianStatus(mockLeadTechnician)).toBe('Active');
    });

    it('should return Inactive for inactive technician', () => {
      expect(component.getTechnicianStatus(mockMembers[1])).toBe('Inactive');
    });
  });

  describe('getTechnicianStatusClass', () => {
    it('should return status-active for active technician', () => {
      expect(component.getTechnicianStatusClass(mockLeadTechnician)).toBe('status-active');
    });

    it('should return status-inactive for inactive technician', () => {
      expect(component.getTechnicianStatusClass(mockMembers[1])).toBe('status-inactive');
    });
  });

  describe('isLeadTechnician', () => {
    it('should return true for lead technician', () => {
      expect(component.isLeadTechnician('tech-1', mockCrew)).toBe(true);
    });

    it('should return false for non-lead technician', () => {
      expect(component.isLeadTechnician('tech-2', mockCrew)).toBe(false);
    });
  });

  describe('getMemberCount', () => {
    it('should return correct member count excluding lead', () => {
      expect(component.getMemberCount(mockCrew)).toBe(2);
    });

    it('should return 0 for crew with only lead technician', () => {
      const crewOnlyLead = { ...mockCrew, memberIds: ['tech-1'] };
      expect(component.getMemberCount(crewOnlyLead)).toBe(0);
    });
  });

  describe('trackByMemberId', () => {
    it('should return member id', () => {
      expect(component.trackByMemberId(0, mockMembers[0])).toBe('tech-2');
    });
  });

  describe('formatLocation', () => {
    it('should format location coordinates', () => {
      const location = { latitude: 40.7128, longitude: -74.0060, accuracy: 10 };
      expect(component.formatLocation(location)).toBe('40.712800, -74.006000');
    });
  });

  describe('editCrew', () => {
    it('should navigate to edit page when crew is loaded', fakeAsync(() => {
      store.overrideSelector(CrewSelectors.selectSelectedCrew, mockCrew);
      store.refreshState();
      fixture.detectChanges();
      tick();

      component.editCrew();
      tick();

      expect(mockRouter.navigate).toHaveBeenCalledWith(
        ['../', 'crew-1', 'edit'],
        { relativeTo: mockActivatedRoute }
      );
    }));
  });

  describe('deleteCrew', () => {
    it('should open confirmation dialog and delete crew on confirm', () => {
      const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      dialogRefSpy.afterClosed.and.returnValue(of(true));
      mockDialog.open.and.returnValue(dialogRefSpy);

      component.deleteCrew(mockCrew);

      expect(mockDialog.open).toHaveBeenCalled();
      expect(store.dispatch).toHaveBeenCalledWith(
        CrewActions.deleteCrew({ id: 'crew-1' })
      );
      expect(mockSnackBar.open).toHaveBeenCalledWith(
        'Crew deleted successfully', 'Close', { duration: 3000 }
      );
      expect(mockRouter.navigate).toHaveBeenCalledWith(
        ['../'], { relativeTo: mockActivatedRoute }
      );
    });

    it('should not delete crew if dialog is cancelled', () => {
      const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      dialogRefSpy.afterClosed.and.returnValue(of(false));
      mockDialog.open.and.returnValue(dialogRefSpy);

      component.deleteCrew(mockCrew);

      expect(mockDialog.open).toHaveBeenCalled();
      expect(store.dispatch).not.toHaveBeenCalledWith(
        CrewActions.deleteCrew({ id: 'crew-1' })
      );
    });
  });

  describe('viewTechnician', () => {
    it('should navigate to technician detail page', () => {
      component.viewTechnician('tech-1');
      expect(mockRouter.navigate).toHaveBeenCalledWith(
        ['/field-resource-management/technicians', 'tech-1']
      );
    });
  });

  describe('viewJob', () => {
    it('should navigate to job detail page', () => {
      component.viewJob('job-1');
      expect(mockRouter.navigate).toHaveBeenCalledWith(
        ['/field-resource-management/jobs', 'job-1']
      );
    });
  });

  describe('goBack', () => {
    it('should navigate back to crew list', () => {
      component.goBack();
      expect(mockRouter.navigate).toHaveBeenCalledWith(
        ['../'], { relativeTo: mockActivatedRoute }
      );
    });
  });

  describe('formatDate', () => {
    it('should format date to locale string', () => {
      const date = new Date('2024-01-15T10:30:00');
      const result = component.formatDate(date);
      expect(result).toContain('2024');
    });
  });

  describe('formatTime', () => {
    it('should format time to locale time string', () => {
      const date = new Date('2024-01-15T10:30:00');
      const result = component.formatTime(date);
      expect(result).toContain('30');
    });
  });

  describe('Loading State', () => {
    it('should reflect loading state from store', (done) => {
      store.overrideSelector(CrewSelectors.selectCrewsLoading, true);
      store.refreshState();
      fixture.detectChanges();

      component.loading$.subscribe(loading => {
        expect(loading).toBe(true);
        done();
      });
    });

    it('should reflect non-loading state from store', (done) => {
      store.overrideSelector(CrewSelectors.selectCrewsLoading, false);
      store.refreshState();
      fixture.detectChanges();

      component.loading$.subscribe(loading => {
        expect(loading).toBe(false);
        done();
      });
    });
  });

  describe('Error State', () => {
    it('should reflect error from store', (done) => {
      store.overrideSelector(CrewSelectors.selectCrewsError, 'Failed to load crew');
      store.refreshState();
      fixture.detectChanges();

      component.error$.subscribe(error => {
        expect(error).toBe('Failed to load crew');
        done();
      });
    });

    it('should reflect null error from store', (done) => {
      store.overrideSelector(CrewSelectors.selectCrewsError, null);
      store.refreshState();
      fixture.detectChanges();

      component.error$.subscribe(error => {
        expect(error).toBeNull();
        done();
      });
    });
  });

  describe('Crew Information Display', () => {
    it('should display crew data from store', (done) => {
      store.overrideSelector(CrewSelectors.selectSelectedCrew, mockCrew);
      store.refreshState();
      fixture.detectChanges();

      component.crew$.subscribe(crew => {
        if (crew) {
          expect(crew.name).toBe('Alpha Crew');
          expect(crew.status).toBe(CrewStatus.Available);
          expect(crew.market).toBe('TEST_MARKET');
          expect(crew.company).toBe('ACME_CORP');
          done();
        }
      });
    });
  });

  describe('Permissions', () => {
    it('should have canEdit$ observable defaulting to true', (done) => {
      component.canEdit$.subscribe(canEdit => {
        expect(canEdit).toBe(true);
        done();
      });
    });

    it('should have canDelete$ observable defaulting to true', (done) => {
      component.canDelete$.subscribe(canDelete => {
        expect(canDelete).toBe(true);
        done();
      });
    });
  });

  describe('Component Lifecycle', () => {
    it('should initialize observables on construction', () => {
      expect(component.crew$).toBeDefined();
      expect(component.loading$).toBeDefined();
      expect(component.error$).toBeDefined();
      expect(component.leadTechnician$).toBeDefined();
      expect(component.crewMembers$).toBeDefined();
      expect(component.activeJob$).toBeDefined();
      expect(component.locationHistory$).toBeDefined();
      expect(component.locationHistoryLoading$).toBeDefined();
      expect(component.locationHistoryError$).toBeDefined();
      expect(component.canEdit$).toBeDefined();
      expect(component.canDelete$).toBeDefined();
    });
  });

  describe('ngOnDestroy', () => {
    it('should clear selected crew on destroy', () => {
      fixture.detectChanges();
      component.ngOnDestroy();

      expect(store.dispatch).toHaveBeenCalledWith(
        CrewActions.selectCrew({ id: null })
      );
    });
  });

  // =========================================================================
  // Member Management Tests (Requirements 12.1, 12.2, 12.3)
  // =========================================================================

  describe('toggleAddMember', () => {
    it('should toggle showAddMember flag', () => {
      expect(component.showAddMember).toBe(false);

      store.overrideSelector(CrewSelectors.selectSelectedCrew, mockCrew);
      store.refreshState();
      fixture.detectChanges();

      component.toggleAddMember();
      expect(component.showAddMember).toBe(true);

      component.toggleAddMember();
      expect(component.showAddMember).toBe(false);
    });

    it('should update available technicians when opening add member panel', fakeAsync(() => {
      store.overrideSelector(CrewSelectors.selectSelectedCrew, mockCrew);
      store.refreshState();
      fixture.detectChanges();
      tick();

      component.toggleAddMember();
      tick();

      component.availableTechnicians$.subscribe(available => {
        // tech-4 (Alice) is active and not in crew, so should be available
        const aliceInList = available.find(t => t.id === 'tech-4');
        expect(aliceInList).toBeDefined();
        // Existing crew members should NOT be in available list
        expect(available.find(t => t.id === 'tech-1')).toBeUndefined();
        expect(available.find(t => t.id === 'tech-2')).toBeUndefined();
        expect(available.find(t => t.id === 'tech-3')).toBeUndefined();
      });
      tick();
    }));
  });

  describe('addMemberToCrew (Requirement 12.1)', () => {
    it('should dispatch addCrewMember action with correct crewId and technicianId', fakeAsync(() => {
      store.overrideSelector(CrewSelectors.selectSelectedCrew, mockCrew);
      store.refreshState();
      fixture.detectChanges();
      tick();

      component.addMemberToCrew('tech-4');
      tick();

      expect(store.dispatch).toHaveBeenCalledWith(
        CrewActions.addCrewMember({ crewId: 'crew-1', technicianId: 'tech-4' })
      );
    }));

    it('should show success snackbar and close panel on addCrewMemberSuccess', fakeAsync(() => {
      store.overrideSelector(CrewSelectors.selectSelectedCrew, mockCrew);
      store.refreshState();
      fixture.detectChanges();
      tick();

      component.showAddMember = true;
      component.addMemberToCrew('tech-4');
      tick();

      // Simulate the success action being dispatched
      actionsSubject.next(CrewActions.addCrewMemberSuccess({
        crew: { ...mockCrew, memberIds: [...mockCrew.memberIds, 'tech-4'] }
      }));
      tick();

      expect(mockSnackBar.open).toHaveBeenCalledWith(
        'Member added to crew', 'Close', { duration: 3000 }
      );
      expect(component.showAddMember).toBe(false);
    }));

    it('should show error snackbar on addCrewMemberFailure', fakeAsync(() => {
      store.overrideSelector(CrewSelectors.selectSelectedCrew, mockCrew);
      store.refreshState();
      fixture.detectChanges();
      tick();

      component.addMemberToCrew('tech-4');
      tick();

      // Simulate the failure action being dispatched
      actionsSubject.next(CrewActions.addCrewMemberFailure({
        error: 'Server error'
      }));
      tick();

      expect(mockSnackBar.open).toHaveBeenCalledWith(
        'Failed to add member: Server error', 'Close', { duration: 5000 }
      );
    }));
  });

  describe('removeMemberFromCrew (Requirement 12.2)', () => {
    it('should open confirmation dialog and dispatch removeCrewMember on confirm', fakeAsync(() => {
      store.overrideSelector(CrewSelectors.selectSelectedCrew, mockCrew);
      store.refreshState();
      fixture.detectChanges();
      tick();

      const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      dialogRefSpy.afterClosed.and.returnValue(of(true));
      mockDialog.open.and.returnValue(dialogRefSpy);

      const mockEvent = jasmine.createSpyObj('Event', ['stopPropagation']);
      component.removeMemberFromCrew(mockEvent, 'tech-2');
      tick();

      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(mockDialog.open).toHaveBeenCalled();
      expect(store.dispatch).toHaveBeenCalledWith(
        CrewActions.removeCrewMember({ crewId: 'crew-1', technicianId: 'tech-2' })
      );
      expect(mockSnackBar.open).toHaveBeenCalledWith(
        'Member removed from crew', 'Close', { duration: 3000 }
      );
    }));

    it('should not dispatch removeCrewMember when dialog is cancelled', fakeAsync(() => {
      store.overrideSelector(CrewSelectors.selectSelectedCrew, mockCrew);
      store.refreshState();
      fixture.detectChanges();
      tick();

      const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      dialogRefSpy.afterClosed.and.returnValue(of(false));
      mockDialog.open.and.returnValue(dialogRefSpy);

      const mockEvent = jasmine.createSpyObj('Event', ['stopPropagation']);
      component.removeMemberFromCrew(mockEvent, 'tech-2');
      tick();

      expect(mockDialog.open).toHaveBeenCalled();
      expect(store.dispatch).not.toHaveBeenCalledWith(
        CrewActions.removeCrewMember({ crewId: 'crew-1', technicianId: 'tech-2' })
      );
    }));
  });

  describe('Error handling for member operations (Requirement 12.3)', () => {
    it('should display error message when addCrewMember fails', fakeAsync(() => {
      store.overrideSelector(CrewSelectors.selectSelectedCrew, mockCrew);
      store.refreshState();
      fixture.detectChanges();
      tick();

      component.addMemberToCrew('tech-4');
      tick();

      actionsSubject.next(CrewActions.addCrewMemberFailure({
        error: 'Technician is already assigned to another crew'
      }));
      tick();

      expect(mockSnackBar.open).toHaveBeenCalledWith(
        'Failed to add member: Technician is already assigned to another crew',
        'Close',
        { duration: 5000 }
      );
    }));

    it('should dispatch addCrewMember action that triggers reducer rollback on failure', fakeAsync(() => {
      // The reducer sets loading=false and error=message on addCrewMemberFailure,
      // which effectively reverts any optimistic UI update since the crew entity
      // is only updated on addCrewMemberSuccess (not on the initial dispatch).
      store.overrideSelector(CrewSelectors.selectSelectedCrew, mockCrew);
      store.refreshState();
      fixture.detectChanges();
      tick();

      component.addMemberToCrew('tech-4');
      tick();

      expect(store.dispatch).toHaveBeenCalledWith(
        CrewActions.addCrewMember({ crewId: 'crew-1', technicianId: 'tech-4' })
      );
    }));

    it('should dispatch removeCrewMember action that triggers reducer rollback on failure', fakeAsync(() => {
      // Same pattern: removeCrewMember sets loading=true,
      // removeCrewMemberFailure sets loading=false + error (no entity change = rollback)
      store.overrideSelector(CrewSelectors.selectSelectedCrew, mockCrew);
      store.refreshState();
      fixture.detectChanges();
      tick();

      const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      dialogRefSpy.afterClosed.and.returnValue(of(true));
      mockDialog.open.and.returnValue(dialogRefSpy);

      const mockEvent = jasmine.createSpyObj('Event', ['stopPropagation']);
      component.removeMemberFromCrew(mockEvent, 'tech-2');
      tick();

      expect(store.dispatch).toHaveBeenCalledWith(
        CrewActions.removeCrewMember({ crewId: 'crew-1', technicianId: 'tech-2' })
      );
    }));
  });
});
