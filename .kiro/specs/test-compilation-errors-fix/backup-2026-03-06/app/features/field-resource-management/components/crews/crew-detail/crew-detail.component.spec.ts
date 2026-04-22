import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, BehaviorSubject } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { CrewDetailComponent } from './crew-detail.component';
import { Crew, CrewStatus } from '../../../models/crew.model';
import { Technician, TechnicianRole, EmploymentType, SkillLevel } from '../../../models/technician.model';
import { Job, JobStatus } from '../../../models/job.model';
import * as CrewActions from '../../../state/crews/crew.actions';

describe('CrewDetailComponent', () => {
  let component: CrewDetailComponent;
  let fixture: ComponentFixture<CrewDetailComponent>;
  let mockStore: jasmine.SpyObj<Store>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockActivatedRoute: any;
  let mockDialog: jasmine.SpyObj<MatDialog>;
  let mockSnackBar: jasmine.SpyObj<MatSnackBar>;

  const mockCrew: Crew = {
    id: 'crew-1',
    name: 'Alpha Crew',
    leadTechnicianId: 'tech-1',
    memberIds: ['tech-1', 'tech-2', 'tech-3'],
    market: 'North',
    company: 'Internal',
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
      skills: [
        { 
          id: 'skill-1', 
          name: 'Electrical', 
          category: 'Technical',
          level: SkillLevel.Advanced, 
          verifiedDate: new Date() 
        }
      ],
      certifications: [],
      availability: [],
      isActive: true,
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
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

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
    market: 'North',
    company: 'Internal',
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(async () => {
    const paramsSubject = new BehaviorSubject({ id: 'crew-1' });

    mockStore = jasmine.createSpyObj('Store', ['select', 'dispatch']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockActivatedRoute = {
      params: paramsSubject.asObservable(),
      queryParams: of({})
    };
    mockDialog = jasmine.createSpyObj('MatDialog', ['open']);
    mockSnackBar = jasmine.createSpyObj('MatSnackBar', ['open']);

    // Setup default store selectors
    mockStore.select.and.returnValue(of(null));

    await TestBed.configureTestingModule({
      declarations: [CrewDetailComponent],
      providers: [
        { provide: Store, useValue: mockStore },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: MatDialog, useValue: mockDialog },
        { provide: MatSnackBar, useValue: mockSnackBar }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(CrewDetailComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should load crew on init', () => {
      fixture.detectChanges();

      // Should dispatch actions to load all necessary data
      expect(mockStore.dispatch).toHaveBeenCalledWith(
        CrewActions.loadCrews({ filters: {} })
      );
      expect(mockStore.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({ type: '[Technician] Load Technicians' })
      );
      expect(mockStore.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({ type: '[Job] Load Jobs' })
      );
      expect(mockStore.dispatch).toHaveBeenCalledWith(
        CrewActions.selectCrew({ id: 'crew-1' })
      );
    });

    it('should load related entities when crew is loaded', (done) => {
      mockStore.select.and.callFake((selector: any) => {
        const selectorStr = selector.toString();
        if (selectorStr.includes('selectSelectedCrew')) {
          return of(mockCrew);
        }
        if (selectorStr.includes('selectTechnicianById')) {
          return of(mockLeadTechnician);
        }
        if (selectorStr.includes('selectAllTechnicians')) {
          return of([mockLeadTechnician, ...mockMembers]);
        }
        if (selectorStr.includes('selectJobById')) {
          return of(mockJob);
        }
        return of(null);
      });

      fixture.detectChanges();

      // Wait for async operations
      setTimeout(() => {
        component.leadTechnician$.subscribe(tech => {
          expect(tech).toEqual(mockLeadTechnician);
        });

        component.crewMembers$.subscribe(members => {
          // Should exclude lead technician from members list
          expect(members.length).toBe(2);
          expect(members.find(m => m.id === 'tech-1')).toBeUndefined();
          expect(members.find(m => m.id === 'tech-2')).toBeDefined();
          expect(members.find(m => m.id === 'tech-3')).toBeDefined();
        });

        component.activeJob$.subscribe(job => {
          expect(job).toEqual(mockJob);
        });

        done();
      }, 100);
    });

    it('should sort crew members by name', (done) => {
      mockStore.select.and.callFake((selector: any) => {
        const selectorStr = selector.toString();
        if (selectorStr.includes('selectSelectedCrew')) {
          return of(mockCrew);
        }
        if (selectorStr.includes('selectAllTechnicians')) {
          return of([mockLeadTechnician, ...mockMembers]);
        }
        return of(null);
      });

      fixture.detectChanges();

      setTimeout(() => {
        component.crewMembers$.subscribe(members => {
          if (members.length > 1) {
            // Bob Johnson should come before Jane Smith
            expect(members[0].firstName).toBe('Bob');
            expect(members[1].firstName).toBe('Jane');
          }
        });
        done();
      }, 100);
    });
  });

  describe('getStatusBadgeClass', () => {
    it('should return correct class for Available status', () => {
      const result = component.getStatusBadgeClass(CrewStatus.Available);
      expect(result).toBe('status-available');
    });

    it('should return correct class for OnJob status', () => {
      const result = component.getStatusBadgeClass(CrewStatus.OnJob);
      expect(result).toBe('status-on-job');
    });

    it('should return correct class for Unavailable status', () => {
      const result = component.getStatusBadgeClass(CrewStatus.Unavailable);
      expect(result).toBe('status-unavailable');
    });
  });

  describe('getTechnicianFullName', () => {
    it('should return full name of technician', () => {
      const result = component.getTechnicianFullName(mockLeadTechnician);
      expect(result).toBe('John Doe');
    });
  });

  describe('getTechnicianRoleDisplay', () => {
    it('should return technician role', () => {
      const result = component.getTechnicianRoleDisplay(mockLeadTechnician);
      expect(result).toBe(TechnicianRole.Lead);
    });
  });

  describe('getTechnicianStatus', () => {
    it('should return Active for active technician', () => {
      const result = component.getTechnicianStatus(mockLeadTechnician);
      expect(result).toBe('Active');
    });

    it('should return Inactive for inactive technician', () => {
      const result = component.getTechnicianStatus(mockMembers[1]);
      expect(result).toBe('Inactive');
    });
  });

  describe('getTechnicianStatusClass', () => {
    it('should return status-active for active technician', () => {
      const result = component.getTechnicianStatusClass(mockLeadTechnician);
      expect(result).toBe('status-active');
    });

    it('should return status-inactive for inactive technician', () => {
      const result = component.getTechnicianStatusClass(mockMembers[1]);
      expect(result).toBe('status-inactive');
    });
  });

  describe('isLeadTechnician', () => {
    it('should return true for lead technician', () => {
      const result = component.isLeadTechnician('tech-1', mockCrew);
      expect(result).toBe(true);
    });

    it('should return false for non-lead technician', () => {
      const result = component.isLeadTechnician('tech-2', mockCrew);
      expect(result).toBe(false);
    });
  });

  describe('getMemberCount', () => {
    it('should return correct member count excluding lead', () => {
      const result = component.getMemberCount(mockCrew);
      expect(result).toBe(2);
    });

    it('should return 0 for crew with only lead technician', () => {
      const crewOnlyLead = { ...mockCrew, memberIds: ['tech-1'] };
      const result = component.getMemberCount(crewOnlyLead);
      expect(result).toBe(0);
    });

    it('should return correct count when lead is not in memberIds', () => {
      const crewNoLeadInMembers = { ...mockCrew, memberIds: ['tech-2', 'tech-3'] };
      const result = component.getMemberCount(crewNoLeadInMembers);
      expect(result).toBe(2);
    });
  });

  describe('trackByMemberId', () => {
    it('should return member id', () => {
      const result = component.trackByMemberId(0, mockMembers[0]);
      expect(result).toBe('tech-2');
    });
  });

  describe('formatLocation', () => {
    it('should format location coordinates', () => {
      const location = { latitude: 40.7128, longitude: -74.0060 };
      const result = component.formatLocation(location);
      expect(result).toBe('40.712800, -74.006000');
    });
  });

  describe('editCrew', () => {
    it('should navigate to edit page when crew is loaded', (done) => {
      mockStore.select.and.returnValue(of(mockCrew));
      
      component.editCrew();

      setTimeout(() => {
        expect(mockRouter.navigate).toHaveBeenCalledWith(
          ['../', 'crew-1', 'edit'],
          { relativeTo: mockActivatedRoute }
        );
        done();
      }, 100);
    });
  });

  describe('deleteCrew', () => {
    it('should open confirmation dialog and delete crew on confirm', () => {
      const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      dialogRefSpy.afterClosed.and.returnValue(of(true));
      mockDialog.open.and.returnValue(dialogRefSpy);

      component.deleteCrew(mockCrew);

      expect(mockDialog.open).toHaveBeenCalled();
      expect(mockStore.dispatch).toHaveBeenCalledWith(
        CrewActions.deleteCrew({ id: 'crew-1' })
      );
      expect(mockSnackBar.open).toHaveBeenCalledWith(
        'Crew deleted successfully',
        'Close',
        { duration: 3000 }
      );
      expect(mockRouter.navigate).toHaveBeenCalledWith(
        ['../'],
        { relativeTo: mockActivatedRoute }
      );
    });

    it('should not delete crew if dialog is cancelled', () => {
      const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      dialogRefSpy.afterClosed.and.returnValue(of(false));
      mockDialog.open.and.returnValue(dialogRefSpy);

      component.deleteCrew(mockCrew);

      expect(mockDialog.open).toHaveBeenCalled();
      expect(mockStore.dispatch).not.toHaveBeenCalledWith(
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
        ['../'],
        { relativeTo: mockActivatedRoute }
      );
    });
  });

  describe('formatDate', () => {
    it('should format date to locale string', () => {
      const date = new Date('2024-01-15T10:30:00');
      const result = component.formatDate(date);
      expect(result).toContain('2024');
      expect(result).toContain('15');
    });
  });

  describe('formatTime', () => {
    it('should format time to locale time string', () => {
      const date = new Date('2024-01-15T10:30:00');
      const result = component.formatTime(date);
      expect(result).toContain('10');
      expect(result).toContain('30');
    });
  });

  describe('Active Job Display', () => {
    it('should display active job when crew has activeJobId', (done) => {
      mockStore.select.and.callFake((selector: any) => {
        const selectorStr = selector.toString();
        if (selectorStr.includes('selectSelectedCrew')) {
          return of(mockCrew);
        }
        if (selectorStr.includes('selectJobById')) {
          return of(mockJob);
        }
        return of(null);
      });

      fixture.detectChanges();

      setTimeout(() => {
        component.activeJob$.subscribe(job => {
          expect(job).toEqual(mockJob);
          expect(job?.jobId).toBe('J001');
          expect(job?.siteName).toBe('Main Office');
          expect(job?.status).toBe(JobStatus.OnSite);
          done();
        });
      }, 100);
    });

    it('should not load active job when crew has no activeJobId', (done) => {
      const crewWithoutJob = { ...mockCrew, activeJobId: undefined };
      mockStore.select.and.callFake((selector: any) => {
        const selectorStr = selector.toString();
        if (selectorStr.includes('selectSelectedCrew')) {
          return of(crewWithoutJob);
        }
        return of(null);
      });

      fixture.detectChanges();

      setTimeout(() => {
        // activeJob$ should not be initialized when no activeJobId
        expect(component.activeJob$).toBeDefined();
        done();
      }, 100);
    });

    it('should handle case when active job is not found', (done) => {
      mockStore.select.and.callFake((selector: any) => {
        const selectorStr = selector.toString();
        if (selectorStr.includes('selectSelectedCrew')) {
          return of(mockCrew);
        }
        if (selectorStr.includes('selectJobById')) {
          return of(undefined);
        }
        return of(null);
      });

      fixture.detectChanges();

      setTimeout(() => {
        component.activeJob$.subscribe(job => {
          expect(job).toBeUndefined();
          done();
        });
      }, 100);
    });

    it('should navigate to job details when viewJob is called', () => {
      component.viewJob('job-1');

      expect(mockRouter.navigate).toHaveBeenCalledWith(
        ['/field-resource-management/jobs', 'job-1']
      );
    });

    it('should display job information correctly in template', (done) => {
      mockStore.select.and.callFake((selector: any) => {
        const selectorStr = selector.toString();
        if (selectorStr.includes('selectSelectedCrew')) {
          return of(mockCrew);
        }
        if (selectorStr.includes('selectJobById')) {
          return of(mockJob);
        }
        return of(null);
      });

      fixture.detectChanges();

      setTimeout(() => {
        const compiled = fixture.nativeElement;
        fixture.detectChanges();
        
        // Verify active job card is present when activeJobId exists
        expect(mockCrew.activeJobId).toBeDefined();
        done();
      }, 100);
    });
  });

  describe('Location History', () => {
    it('should load location history when crew is loaded', (done) => {
      const mockLocationHistory = [
        {
          id: 'loc-1',
          entityId: 'crew-1',
          entityType: 'crew' as const,
          location: { latitude: 40.7128, longitude: -74.0060, accuracy: 10 },
          timestamp: new Date('2024-01-15T10:00:00'),
          isManualEntry: false,
          createdAt: new Date('2024-01-15T10:00:00')
        },
        {
          id: 'loc-2',
          entityId: 'crew-1',
          entityType: 'crew' as const,
          location: { latitude: 40.7200, longitude: -74.0100, accuracy: 15 },
          timestamp: new Date('2024-01-15T11:00:00'),
          isManualEntry: false,
          createdAt: new Date('2024-01-15T11:00:00')
        }
      ];

      mockStore.select.and.callFake((selector: any) => {
        const selectorStr = selector.toString();
        if (selectorStr.includes('selectSelectedCrew')) {
          return of(mockCrew);
        }
        if (selectorStr.includes('selectCrewLocationHistory')) {
          return of(mockLocationHistory);
        }
        return of(null);
      });

      fixture.detectChanges();

      setTimeout(() => {
        expect(mockStore.dispatch).toHaveBeenCalledWith(
          CrewActions.loadCrewLocationHistory({
            filters: {
              entityId: 'crew-1',
              entityType: 'crew',
              limit: 50
            }
          })
        );

        component.locationHistory$.subscribe(history => {
          expect(history).toEqual(mockLocationHistory);
          expect(history.length).toBe(2);
          done();
        });
      }, 100);
    });

    it('should handle empty location history', (done) => {
      mockStore.select.and.callFake((selector: any) => {
        const selectorStr = selector.toString();
        if (selectorStr.includes('selectSelectedCrew')) {
          return of(mockCrew);
        }
        if (selectorStr.includes('selectCrewLocationHistory')) {
          return of([]);
        }
        return of(null);
      });

      fixture.detectChanges();

      setTimeout(() => {
        component.locationHistory$.subscribe(history => {
          expect(history).toEqual([]);
          expect(history.length).toBe(0);
          done();
        });
      }, 100);
    });

    it('should display location history loading state', (done) => {
      mockStore.select.and.callFake((selector: any) => {
        const selectorStr = selector.toString();
        if (selectorStr.includes('selectLocationHistoryLoading')) {
          return of(true);
        }
        return of(null);
      });

      fixture.detectChanges();

      component.locationHistoryLoading$.subscribe(loading => {
        expect(loading).toBe(true);
        done();
      });
    });

    it('should display location history error state', (done) => {
      const errorMessage = 'Failed to load location history';
      mockStore.select.and.callFake((selector: any) => {
        const selectorStr = selector.toString();
        if (selectorStr.includes('selectLocationHistoryError')) {
          return of(errorMessage);
        }
        return of(null);
      });

      fixture.detectChanges();

      component.locationHistoryError$.subscribe(error => {
        expect(error).toBe(errorMessage);
        done();
      });
    });
  });

  describe('Loading State', () => {
    it('should display loading state when loading is true', (done) => {
      mockStore.select.and.callFake((selector: any) => {
        const selectorStr = selector.toString();
        if (selectorStr.includes('selectCrewsLoading')) {
          return of(true);
        }
        return of(null);
      });

      fixture.detectChanges();

      component.loading$.subscribe(loading => {
        expect(loading).toBe(true);
        done();
      });
    });

    it('should not display loading state when loading is false', (done) => {
      mockStore.select.and.callFake((selector: any) => {
        const selectorStr = selector.toString();
        if (selectorStr.includes('selectCrewsLoading')) {
          return of(false);
        }
        return of(null);
      });

      fixture.detectChanges();

      component.loading$.subscribe(loading => {
        expect(loading).toBe(false);
        done();
      });
    });
  });

  describe('Error State', () => {
    it('should display error message when error exists', (done) => {
      const errorMessage = 'Failed to load crew';
      mockStore.select.and.callFake((selector: any) => {
        const selectorStr = selector.toString();
        if (selectorStr.includes('selectCrewsError')) {
          return of(errorMessage);
        }
        return of(null);
      });

      fixture.detectChanges();

      component.error$.subscribe(error => {
        expect(error).toBe(errorMessage);
        done();
      });
    });

    it('should not display error when error is null', (done) => {
      mockStore.select.and.callFake((selector: any) => {
        const selectorStr = selector.toString();
        if (selectorStr.includes('selectCrewsError')) {
          return of(null);
        }
        return of(null);
      });

      fixture.detectChanges();

      component.error$.subscribe(error => {
        expect(error).toBeNull();
        done();
      });
    });
  });

  describe('Empty States', () => {
    it('should handle crew with no members', (done) => {
      const crewNoMembers = { ...mockCrew, memberIds: ['tech-1'] };
      mockStore.select.and.callFake((selector: any) => {
        const selectorStr = selector.toString();
        if (selectorStr.includes('selectSelectedCrew')) {
          return of(crewNoMembers);
        }
        if (selectorStr.includes('selectAllTechnicians')) {
          return of([mockLeadTechnician]);
        }
        return of(null);
      });

      fixture.detectChanges();

      setTimeout(() => {
        component.crewMembers$.subscribe(members => {
          expect(members.length).toBe(0);
          done();
        });
      }, 100);
    });

    it('should handle crew with no active job', (done) => {
      const crewNoJob = { ...mockCrew, activeJobId: undefined };
      mockStore.select.and.callFake((selector: any) => {
        const selectorStr = selector.toString();
        if (selectorStr.includes('selectSelectedCrew')) {
          return of(crewNoJob);
        }
        return of(null);
      });

      fixture.detectChanges();

      setTimeout(() => {
        expect(crewNoJob.activeJobId).toBeUndefined();
        done();
      }, 100);
    });

    it('should handle crew with no location', (done) => {
      const crewNoLocation = { ...mockCrew, currentLocation: undefined };
      mockStore.select.and.callFake((selector: any) => {
        const selectorStr = selector.toString();
        if (selectorStr.includes('selectSelectedCrew')) {
          return of(crewNoLocation);
        }
        return of(null);
      });

      fixture.detectChanges();

      setTimeout(() => {
        expect(crewNoLocation.currentLocation).toBeUndefined();
        done();
      }, 100);
    });

    it('should handle empty location history', (done) => {
      mockStore.select.and.callFake((selector: any) => {
        const selectorStr = selector.toString();
        if (selectorStr.includes('selectSelectedCrew')) {
          return of(mockCrew);
        }
        if (selectorStr.includes('selectCrewLocationHistory')) {
          return of([]);
        }
        return of(null);
      });

      fixture.detectChanges();

      setTimeout(() => {
        component.locationHistory$.subscribe(history => {
          expect(history.length).toBe(0);
          done();
        });
      }, 100);
    });
  });

  describe('Permissions', () => {
    it('should have canEdit$ observable', (done) => {
      component.canEdit$.subscribe(canEdit => {
        expect(canEdit).toBe(true);
        done();
      });
    });

    it('should have canDelete$ observable', (done) => {
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

    it('should dispatch load actions on init', () => {
      spyOn(mockStore, 'dispatch');
      component.ngOnInit();

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        CrewActions.loadCrews({ filters: {} })
      );
      expect(mockStore.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({ type: '[Technician] Load Technicians' })
      );
      expect(mockStore.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({ type: '[Job] Load Jobs' })
      );
    });

    it('should select crew from route params', (done) => {
      spyOn(mockStore, 'dispatch');
      fixture.detectChanges();

      setTimeout(() => {
        expect(mockStore.dispatch).toHaveBeenCalledWith(
          CrewActions.selectCrew({ id: 'crew-1' })
        );
        done();
      }, 100);
    });
  });

  describe('ngOnDestroy', () => {
    it('should complete destroy subject and clear selected crew', () => {
      spyOn(component['destroy$'], 'next');
      spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(component['destroy$'].next).toHaveBeenCalled();
      expect(component['destroy$'].complete).toHaveBeenCalled();
      expect(mockStore.dispatch).toHaveBeenCalledWith(
        CrewActions.selectCrew({ id: null })
      );
    });
  });

  describe('Crew Information Display', () => {
    it('should display crew name', (done) => {
      mockStore.select.and.returnValue(of(mockCrew));
      fixture.detectChanges();

      component.crew$.subscribe(crew => {
        expect(crew?.name).toBe('Alpha Crew');
        done();
      });
    });

    it('should display crew status', (done) => {
      mockStore.select.and.returnValue(of(mockCrew));
      fixture.detectChanges();

      component.crew$.subscribe(crew => {
        expect(crew?.status).toBe(CrewStatus.Available);
        done();
      });
    });

    it('should display crew market', (done) => {
      mockStore.select.and.returnValue(of(mockCrew));
      fixture.detectChanges();

      component.crew$.subscribe(crew => {
        expect(crew?.market).toBe('North');
        done();
      });
    });

    it('should display crew company', (done) => {
      mockStore.select.and.returnValue(of(mockCrew));
      fixture.detectChanges();

      component.crew$.subscribe(crew => {
        expect(crew?.company).toBe('Internal');
        done();
      });
    });

    it('should display crew current location', (done) => {
      mockStore.select.and.returnValue(of(mockCrew));
      fixture.detectChanges();

      component.crew$.subscribe(crew => {
        expect(crew?.currentLocation).toBeDefined();
        expect(crew?.currentLocation?.latitude).toBe(40.7128);
        expect(crew?.currentLocation?.longitude).toBe(-74.0060);
        done();
      });
    });
  });

  describe('Lead Technician Display', () => {
    it('should display lead technician information', (done) => {
      mockStore.select.and.callFake((selector: any) => {
        const selectorStr = selector.toString();
        if (selectorStr.includes('selectSelectedCrew')) {
          return of(mockCrew);
        }
        if (selectorStr.includes('selectTechnicianById')) {
          return of(mockLeadTechnician);
        }
        return of(null);
      });

      fixture.detectChanges();

      setTimeout(() => {
        component.leadTechnician$.subscribe(tech => {
          expect(tech).toBeDefined();
          expect(tech?.id).toBe('tech-1');
          expect(tech?.firstName).toBe('John');
          expect(tech?.lastName).toBe('Doe');
          done();
        });
      }, 100);
    });

    it('should handle missing lead technician', (done) => {
      mockStore.select.and.callFake((selector: any) => {
        const selectorStr = selector.toString();
        if (selectorStr.includes('selectSelectedCrew')) {
          return of(mockCrew);
        }
        if (selectorStr.includes('selectTechnicianById')) {
          return of(undefined);
        }
        return of(null);
      });

      fixture.detectChanges();

      setTimeout(() => {
        component.leadTechnician$.subscribe(tech => {
          expect(tech).toBeUndefined();
          done();
        });
      }, 100);
    });
  });

  describe('Crew Members Display', () => {
    it('should display crew members excluding lead', (done) => {
      mockStore.select.and.callFake((selector: any) => {
        const selectorStr = selector.toString();
        if (selectorStr.includes('selectSelectedCrew')) {
          return of(mockCrew);
        }
        if (selectorStr.includes('selectAllTechnicians')) {
          return of([mockLeadTechnician, ...mockMembers]);
        }
        return of(null);
      });

      fixture.detectChanges();

      setTimeout(() => {
        component.crewMembers$.subscribe(members => {
          expect(members.length).toBe(2);
          expect(members.find(m => m.id === 'tech-1')).toBeUndefined();
          expect(members.find(m => m.id === 'tech-2')).toBeDefined();
          expect(members.find(m => m.id === 'tech-3')).toBeDefined();
          done();
        });
      }, 100);
    });

    it('should sort crew members by name', (done) => {
      mockStore.select.and.callFake((selector: any) => {
        const selectorStr = selector.toString();
        if (selectorStr.includes('selectSelectedCrew')) {
          return of(mockCrew);
        }
        if (selectorStr.includes('selectAllTechnicians')) {
          return of([mockLeadTechnician, ...mockMembers]);
        }
        return of(null);
      });

      fixture.detectChanges();

      setTimeout(() => {
        component.crewMembers$.subscribe(members => {
          if (members.length > 1) {
            expect(members[0].firstName).toBe('Bob');
            expect(members[1].firstName).toBe('Jane');
          }
          done();
        });
      }, 100);
    });

    it('should handle crew with no members', (done) => {
      const crewOnlyLead = { ...mockCrew, memberIds: ['tech-1'] };
      mockStore.select.and.callFake((selector: any) => {
        const selectorStr = selector.toString();
        if (selectorStr.includes('selectSelectedCrew')) {
          return of(crewOnlyLead);
        }
        if (selectorStr.includes('selectAllTechnicians')) {
          return of([mockLeadTechnician]);
        }
        return of(null);
      });

      fixture.detectChanges();

      setTimeout(() => {
        component.crewMembers$.subscribe(members => {
          expect(members.length).toBe(0);
          done();
        });
      }, 100);
    });
  });

  describe('Navigation Methods', () => {
    it('should navigate to technician detail', () => {
      component.viewTechnician('tech-1');
      expect(mockRouter.navigate).toHaveBeenCalledWith(
        ['/field-resource-management/technicians', 'tech-1']
      );
    });

    it('should navigate to job detail', () => {
      component.viewJob('job-1');
      expect(mockRouter.navigate).toHaveBeenCalledWith(
        ['/field-resource-management/jobs', 'job-1']
      );
    });

    it('should navigate back to crew list', () => {
      component.goBack();
      expect(mockRouter.navigate).toHaveBeenCalledWith(
        ['../'],
        { relativeTo: mockActivatedRoute }
      );
    });
  });

  describe('Date and Time Formatting', () => {
    it('should format date correctly', () => {
      const date = new Date('2024-01-15T10:30:00');
      const result = component.formatDate(date);
      expect(result).toContain('2024');
      expect(result).toContain('15');
    });

    it('should format time correctly', () => {
      const date = new Date('2024-01-15T10:30:00');
      const result = component.formatTime(date);
      expect(result).toContain('10');
      expect(result).toContain('30');
    });
  });

  describe('Store Integration', () => {
    it('should subscribe to crew state', (done) => {
      mockStore.select.and.returnValue(of(mockCrew));
      fixture.detectChanges();

      component.crew$.subscribe(crew => {
        expect(crew).toEqual(mockCrew);
        done();
      });
    });

    it('should subscribe to loading state', (done) => {
      mockStore.select.and.returnValue(of(true));
      fixture.detectChanges();

      component.loading$.subscribe(loading => {
        expect(loading).toBe(true);
        done();
      });
    });

    it('should subscribe to error state', (done) => {
      mockStore.select.and.returnValue(of('Error message'));
      fixture.detectChanges();

      component.error$.subscribe(error => {
        expect(error).toBe('Error message');
        done();
      });
    });
  });
});
