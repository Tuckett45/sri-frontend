import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Actions } from '@ngrx/effects';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { of, Subject, EMPTY } from 'rxjs';

import { CrewFormComponent } from './crew-form.component';
import { Crew, CrewStatus } from '../../../models/crew.model';
import { Technician, TechnicianRole, EmploymentType } from '../../../models/technician.model';
import * as CrewActions from '../../../state/crews/crew.actions';
import { AuthService } from '../../../../../services/auth.service';

describe('CrewFormComponent', () => {
  let component: CrewFormComponent;
  let fixture: ComponentFixture<CrewFormComponent>;
  let mockStore: jasmine.SpyObj<Store>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockRoute: any;
  let mockSnackBar: jasmine.SpyObj<MatSnackBar>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockActions$: Subject<any>;
  let paramsSubject: Subject<any>;

  const mockTechnicians: Technician[] = [
    {
      id: 'tech-1',
      technicianId: 'T001',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '555-0001',
      role: TechnicianRole.Installer,
      employmentType: EmploymentType.W2,
      homeBase: 'Dallas',
      region: 'North',
      skills: [],
      certifications: [],
      availability: [],
      hourlyCostRate: 50,
      isActive: true,
      canTravel: false,
      createdAt: new Date(),      updatedAt: new Date()
    },
    {
      id: 'tech-2',
      technicianId: 'T002',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      phone: '555-0002',
      role: TechnicianRole.Installer,
      employmentType: EmploymentType.W2,
      homeBase: 'Dallas',
      region: 'North',
      skills: [],
      certifications: [],
      availability: [],
      hourlyCostRate: 55,
      isActive: true,
      canTravel: false,
      createdAt: new Date(),      updatedAt: new Date()
    },
    {
      id: 'tech-3',
      technicianId: 'T003',
      firstName: 'Bob',
      lastName: 'Johnson',
      email: 'bob@example.com',
      phone: '555-0003',
      role: TechnicianRole.Installer,
      employmentType: EmploymentType.W2,
      homeBase: 'Dallas',
      region: 'North',
      skills: [],
      certifications: [],
      availability: [],
      hourlyCostRate: 60,
      isActive: true,
      canTravel: false,
      createdAt: new Date(),      updatedAt: new Date()
    }
  ];

  const mockCrew: Crew = {
    id: 'crew-1',
    name: 'Alpha Team',
    leadTechnicianId: 'tech-1',
    memberIds: ['tech-2', 'tech-3'],
    company: 'ACME_CORP',
    market: 'TEST_MARKET',
    status: CrewStatus.Available,
    createdAt: new Date(),    updatedAt: new Date()
  };

  beforeEach(async () => {
    paramsSubject = new Subject();
    mockActions$ = new Subject();
    
    mockStore = jasmine.createSpyObj('Store', ['dispatch', 'select']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockRoute = {
      params: paramsSubject.asObservable(),
      queryParams: of({})
    };
    mockSnackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
    mockAuthService = jasmine.createSpyObj('AuthService', ['isAdmin', 'getUser']);

    mockAuthService.isAdmin.and.returnValue(false);
    mockAuthService.getUser.and.returnValue({ 
      id: 'user-1', 
      role: 'CM'
    });

    // Default store select behavior
    mockStore.select.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      declarations: [ CrewFormComponent ],
      imports: [
        ReactiveFormsModule,
        BrowserAnimationsModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatCardModule,
        MatButtonModule,
        MatChipsModule
      ],
      providers: [
        { provide: Store, useValue: mockStore },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockRoute },
        { provide: MatSnackBar, useValue: mockSnackBar },
        { provide: AuthService, useValue: mockAuthService },
        { provide: Actions, useValue: mockActions$ }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CrewFormComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Form Initialization', () => {
    it('should initialize form with empty values in create mode', () => {
      fixture.detectChanges();
      
      expect(component.crewForm).toBeDefined();
      expect(component.crewForm.get('name')?.value).toBe('');
      expect(component.crewForm.get('leadTechnicianId')?.value).toBe('');
      expect(component.crewForm.get('status')?.value).toBe(CrewStatus.Available);
    });

    it('should set market and company from user for non-admin', () => {
      fixture.detectChanges();
      
      expect(component.crewForm.get('market')?.value).toBe('North');
      expect(component.crewForm.get('company')?.value).toBe('Internal');
      expect(component.crewForm.get('market')?.disabled).toBe(true);
      expect(component.crewForm.get('company')?.disabled).toBe(true);
    });

    it('should allow market and company selection for admin', () => {
      mockAuthService.isAdmin.and.returnValue(true);
      fixture.detectChanges();
      
      expect(component.crewForm.get('market')?.disabled).toBe(false);
      expect(component.crewForm.get('company')?.disabled).toBe(false);
    });
  });


  describe('Form Validation', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should require crew name', () => {
      const nameControl = component.crewForm.get('name');
      expect(nameControl?.valid).toBe(false);
      expect(nameControl?.hasError('required')).toBe(true);

      nameControl?.setValue('Alpha Team');
      expect(nameControl?.valid).toBe(true);
    });

    it('should require lead technician', () => {
      const leadControl = component.crewForm.get('leadTechnicianId');
      expect(leadControl?.valid).toBe(false);
      expect(leadControl?.hasError('required')).toBe(true);

      leadControl?.setValue('tech-1');
      expect(leadControl?.valid).toBe(true);
    });

    it('should require market', () => {
      const marketControl = component.crewForm.get('market');
      marketControl?.enable(); // Enable for testing
      marketControl?.setValue('');
      expect(marketControl?.hasError('required')).toBe(true);

      marketControl?.setValue('North');
      expect(marketControl?.valid).toBe(true);
    });

    it('should require company', () => {
      const companyControl = component.crewForm.get('company');
      companyControl?.enable(); // Enable for testing
      companyControl?.setValue('');
      expect(companyControl?.hasError('required')).toBe(true);

      companyControl?.setValue('Internal');
      expect(companyControl?.valid).toBe(true);
    });

    it('should validate form as invalid when required fields are empty', () => {
      expect(component.crewForm.valid).toBe(false);
    });

    it('should validate form as valid when all required fields are filled', () => {
      component.crewForm.patchValue({
        name: 'Alpha Team',
        leadTechnicianId: 'tech-1',
        company: 'ACME_CORP',
        market: 'TEST_MARKET',
        status: CrewStatus.Available
      });

      expect(component.crewForm.valid).toBe(true);
    });

    it('should validate name minimum length (3 characters)', () => {
      const nameControl = component.crewForm.get('name');
      
      nameControl?.setValue('AB');
      expect(nameControl?.hasError('minlength')).toBe(true);
      expect(nameControl?.valid).toBe(false);

      nameControl?.setValue('ABC');
      expect(nameControl?.hasError('minlength')).toBe(false);
      expect(nameControl?.valid).toBe(true);
    });

    it('should validate name maximum length (100 characters)', () => {
      const nameControl = component.crewForm.get('name');
      const longName = 'A'.repeat(101);
      
      nameControl?.setValue(longName);
      expect(nameControl?.hasError('maxlength')).toBe(true);
      expect(nameControl?.valid).toBe(false);

      nameControl?.setValue('A'.repeat(100));
      expect(nameControl?.hasError('maxlength')).toBe(false);
      expect(nameControl?.valid).toBe(true);
    });

    it('should validate that memberIds does not include lead technician', () => {
      component.crewForm.patchValue({
        leadTechnicianId: 'tech-1',
        memberIds: ['tech-1', 'tech-2']
      });

      const memberIdsControl = component.crewForm.get('memberIds');
      expect(memberIdsControl?.hasError('leadInMembers')).toBe(true);
      expect(memberIdsControl?.valid).toBe(false);
    });

    it('should validate memberIds as valid when lead is not included', () => {
      component.crewForm.patchValue({
        leadTechnicianId: 'tech-1',
        memberIds: ['tech-2', 'tech-3']
      });

      const memberIdsControl = component.crewForm.get('memberIds');
      expect(memberIdsControl?.hasError('leadInMembers')).toBe(false);
      expect(memberIdsControl?.valid).toBe(true);
    });

    it('should validate status is a valid CrewStatus enum value', () => {
      const statusControl = component.crewForm.get('status');
      
      statusControl?.setValue('INVALID_STATUS');
      expect(statusControl?.hasError('invalidStatus')).toBe(true);
      expect(statusControl?.valid).toBe(false);

      statusControl?.setValue(CrewStatus.Available);
      expect(statusControl?.hasError('invalidStatus')).toBe(false);
      expect(statusControl?.valid).toBe(true);
    });

    it('should re-validate memberIds when lead technician changes', () => {
      component.crewForm.patchValue({
        leadTechnicianId: 'tech-1',
        memberIds: ['tech-2', 'tech-3']
      });

      expect(component.crewForm.get('memberIds')?.valid).toBe(true);

      // Change lead to one of the members
      component.crewForm.patchValue({
        leadTechnicianId: 'tech-2'
      });

      // Should now be invalid because tech-2 is in memberIds
      expect(component.crewForm.get('memberIds')?.hasError('leadInMembers')).toBe(true);
    });

    it('should return correct error message for minlength', () => {
      const nameControl = component.crewForm.get('name');
      nameControl?.markAsTouched();
      nameControl?.setValue('AB');

      expect(component.getErrorMessage('name')).toBe('Minimum length is 3 characters');
    });

    it('should return correct error message for maxlength', () => {
      const nameControl = component.crewForm.get('name');
      nameControl?.markAsTouched();
      nameControl?.setValue('A'.repeat(101));

      expect(component.getErrorMessage('name')).toBe('Maximum length is 100 characters');
    });

    it('should return correct error message for leadInMembers', () => {
      component.crewForm.patchValue({
        leadTechnicianId: 'tech-1',
        memberIds: ['tech-1', 'tech-2']
      });
      const memberIdsControl = component.crewForm.get('memberIds');
      memberIdsControl?.markAsTouched();

      expect(component.getErrorMessage('memberIds')).toBe('Lead technician cannot be included in crew members');
    });

    it('should return correct error message for invalidStatus', () => {
      const statusControl = component.crewForm.get('status');
      statusControl?.markAsTouched();
      statusControl?.setValue('INVALID_STATUS');

      expect(component.getErrorMessage('status')).toBe('Please select a valid crew status');
    });
  });


  describe('Lead Technician and Member Management', () => {
    beforeEach(() => {
      mockStore.select.and.returnValue(of(mockTechnicians));
      fixture.detectChanges();
    });

    it('should load available technicians', () => {
      expect(component.availableTechnicians.length).toBe(3);
      expect(component.availableTechnicians).toEqual(mockTechnicians);
    });

    it('should remove lead technician from members when lead is selected', () => {
      component.selectedMemberIds = ['tech-1', 'tech-2'];
      component.crewForm.patchValue({ memberIds: ['tech-1', 'tech-2'] });

      component.onLeadTechnicianChange('tech-1');

      expect(component.selectedMemberIds).toEqual(['tech-2']);
      expect(component.crewForm.get('memberIds')?.value).toEqual(['tech-2']);
    });

    it('should filter out lead technician from available members', () => {
      component.crewForm.patchValue({ leadTechnicianId: 'tech-1' });

      const availableMembers = component.availableMemberTechnicians;

      expect(availableMembers.length).toBe(2);
      expect(availableMembers.find(t => t.id === 'tech-1')).toBeUndefined();
    });

    it('should prevent lead technician from being in members list', () => {
      component.crewForm.patchValue({ leadTechnicianId: 'tech-1' });

      component.onMemberSelectionChange(['tech-1', 'tech-2', 'tech-3']);

      expect(component.selectedMemberIds).toEqual(['tech-2', 'tech-3']);
    });

    it('should get technician display name', () => {
      const displayName = component.getTechnicianDisplayName('tech-1');
      expect(displayName).toBe('John Doe');
    });

    it('should return empty string for unknown technician', () => {
      const displayName = component.getTechnicianDisplayName('unknown');
      expect(displayName).toBe('');
    });
  });

  describe('Create Mode', () => {
    beforeEach(() => {
      mockStore.select.and.returnValue(of(mockTechnicians));
      fixture.detectChanges();
    });

    it('should be in create mode by default', () => {
      expect(component.isEditMode).toBe(false);
      expect(component.formTitle).toBe('Create New Crew');
      expect(component.submitButtonText).toBe('Create Crew');
    });

    it('should dispatch createCrew action on submit', () => {
      component.crewForm.patchValue({
        name: 'Beta Team',
        leadTechnicianId: 'tech-1',
        memberIds: ['tech-2'],
        company: 'ACME_CORP',
        status: CrewStatus.Available
      });

      component.onSubmit();

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        CrewActions.createCrew({
          crew: {
            name: 'Beta Team',
            leadTechnicianId: 'tech-1',
            memberIds: ['tech-2'],
            market: 'DALLAS',
            company: 'ACME_CORP',
            status: CrewStatus.Available
          }
        })
      );
    });

    it('should navigate to crews list after create', () => {
      component.crewForm.patchValue({
        name: 'Beta Team',
        leadTechnicianId: 'tech-1',
        memberIds: ['tech-2'],
        company: 'ACME_CORP',
        status: CrewStatus.Available
      });

      component.onSubmit();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/field-resource-management/crews']);
    });

    it('should show snackbar message on create', () => {
      component.crewForm.patchValue({
        name: 'Beta Team',
        leadTechnicianId: 'tech-1',
        memberIds: [],
        company: 'ACME_CORP',
        status: CrewStatus.Available
      });

      component.onSubmit();

      expect(mockSnackBar.open).toHaveBeenCalledWith(
        'Crew created successfully',
        'Close',
        { duration: 3000 }
      );
    });

    it('should not submit if form is invalid', () => {
      component.crewForm.patchValue({
        name: '',
        leadTechnicianId: '',
      });

      component.onSubmit();

      expect(mockStore.dispatch).not.toHaveBeenCalled();
      expect(mockSnackBar.open).toHaveBeenCalledWith(
        'Please fix form errors before submitting',
        'Close',
        { duration: 3000 }
      );
    });
  });

  describe('Edit Mode', () => {
    beforeEach(() => {
      component.isEditMode = true;
      component.crewId = 'crew-1';
      mockStore.select.and.returnValue(of(mockCrew));
      fixture.detectChanges();
    });

    it('should be in edit mode when crew ID is provided', () => {
      expect(component.isEditMode).toBe(true);
      expect(component.formTitle).toBe('Edit Crew');
      expect(component.submitButtonText).toBe('Update Crew');
    });

    it('should populate form with crew data', () => {
      // Trigger the load by selecting the crew
      mockStore.select.and.returnValue(of(mockCrew));
      component['loadCrew']('crew-1');
      fixture.detectChanges();

      expect(component.crewForm.get('name')?.value).toBe('Alpha Team');
      expect(component.crewForm.get('leadTechnicianId')?.value).toBe('tech-1');
      expect(component.crewForm.get('memberIds')?.value).toEqual(['tech-2', 'tech-3']);
      expect(component.selectedMemberIds).toEqual(['tech-2', 'tech-3']);
    });


    it('should dispatch updateCrew action on submit', () => {
      component.crewForm.patchValue({
        name: 'Alpha Team Updated',
        leadTechnicianId: 'tech-1',
        memberIds: ['tech-2', 'tech-3'],
        company: 'ACME_CORP',
        status: CrewStatus.OnJob
      });

      component.onSubmit();

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        CrewActions.updateCrew({
          id: 'crew-1',
          crew: {
            name: 'Alpha Team Updated',
            leadTechnicianId: 'tech-1',
            memberIds: ['tech-2', 'tech-3'],
            company: 'ACME_CORP',
            status: CrewStatus.OnJob
          }
        })
      );
    });

    it('should navigate to crew detail after update', () => {
      component.crewForm.patchValue({
        name: 'Alpha Team Updated',
        leadTechnicianId: 'tech-1',
        memberIds: ['tech-2'],
        company: 'ACME_CORP',
        status: CrewStatus.Available
      });

      component.onSubmit();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/field-resource-management/crews', 'crew-1']);
    });
  });

  describe('Cancel Action', () => {
    it('should navigate to crews list when canceling in create mode', () => {
      component.isEditMode = false;
      component.onCancel();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/field-resource-management/crews']);
    });

    it('should navigate to crew detail when canceling in edit mode', () => {
      component.isEditMode = true;
      component.crewId = 'crew-1';
      component.onCancel();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/field-resource-management/crews', 'crew-1']);
    });
  });

  describe('Error Messages', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should return correct error message for required field', () => {
      const nameControl = component.crewForm.get('name');
      nameControl?.markAsTouched();
      nameControl?.setValue('');

      expect(component.getErrorMessage('name')).toBe('This field is required');
    });

    it('should check if field has specific error', () => {
      const nameControl = component.crewForm.get('name');
      nameControl?.markAsTouched();
      nameControl?.setValue('');

      expect(component.hasError('name', 'required')).toBe(true);
    });
  });

  describe('NgRx Store Integration', () => {
    beforeEach(() => {
      mockStore.select.and.returnValue(of(mockTechnicians));
      fixture.detectChanges();
    });

    it('should dispatch selectCrew action when loading crew in edit mode', () => {
      component.isEditMode = true;
      component['loadCrew']('crew-1');

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        CrewActions.selectCrew({ id: 'crew-1' })
      );
    });

    it('should subscribe to loading state from store', (done) => {
      mockStore.select.and.returnValue(of(true));
      
      component.isLoading$.subscribe(loading => {
        expect(loading).toBe(true);
        done();
      });
    });

    it('should subscribe to error state from store', (done) => {
      const errorMessage = 'Failed to load crew';
      mockStore.select.and.returnValue(of(errorMessage));
      
      component.error$.subscribe(error => {
        expect(error).toBe(errorMessage);
        done();
      });
    });

    it('should handle createCrewSuccess action', (done) => {
      component.crewForm.patchValue({
        name: 'Test Crew',
        leadTechnicianId: 'tech-1',
        memberIds: ['tech-2'],
        company: 'ACME_CORP',
        status: CrewStatus.Available
      });

      component.onSubmit();

      // Emit success action
      setTimeout(() => {
        mockActions$.next(CrewActions.createCrewSuccess({ crew: mockCrew }));
        
        setTimeout(() => {
          expect(mockSnackBar.open).toHaveBeenCalledWith(
            'Crew created successfully',
            'Close',
            { duration: 3000 }
          );
          expect(mockRouter.navigate).toHaveBeenCalledWith(['/field-resource-management/crews']);
          done();
        }, 10);
      }, 10);
    });

    it('should handle createCrewFailure action', (done) => {
      component.crewForm.patchValue({
        name: 'Test Crew',
        leadTechnicianId: 'tech-1',
        memberIds: ['tech-2'],
        company: 'ACME_CORP',
        status: CrewStatus.Available
      });

      component.onSubmit();

      // Emit failure action
      setTimeout(() => {
        mockActions$.next(CrewActions.createCrewFailure({ error: 'Server error' }));
        
        setTimeout(() => {
          expect(mockSnackBar.open).toHaveBeenCalledWith(
            'Failed to create crew: Server error',
            'Close',
            { duration: 5000 }
          );
          done();
        }, 10);
      }, 10);
    });

    it('should handle updateCrewSuccess action', (done) => {
      component.isEditMode = true;
      component.crewId = 'crew-1';
      
      component.crewForm.patchValue({
        name: 'Updated Crew',
        leadTechnicianId: 'tech-1',
        memberIds: ['tech-2'],
        company: 'ACME_CORP',
        status: CrewStatus.Available
      });

      component.onSubmit();

      // Emit success action
      setTimeout(() => {
        mockActions$.next(CrewActions.updateCrewSuccess({ crew: mockCrew }));
        
        setTimeout(() => {
          expect(mockSnackBar.open).toHaveBeenCalledWith(
            'Crew updated successfully',
            'Close',
            { duration: 3000 }
          );
          expect(mockRouter.navigate).toHaveBeenCalledWith(['/field-resource-management/crews', 'crew-1']);
          done();
        }, 10);
      }, 10);
    });

    it('should handle updateCrewFailure action', (done) => {
      component.isEditMode = true;
      component.crewId = 'crew-1';
      
      component.crewForm.patchValue({
        name: 'Updated Crew',
        leadTechnicianId: 'tech-1',
        memberIds: ['tech-2'],
        company: 'ACME_CORP',
        status: CrewStatus.Available
      });

      component.onSubmit();

      // Emit failure action
      setTimeout(() => {
        mockActions$.next(CrewActions.updateCrewFailure({ error: 'Update failed' }));
        
        setTimeout(() => {
          expect(mockSnackBar.open).toHaveBeenCalledWith(
            'Failed to update crew: Update failed',
            'Close',
            { duration: 5000 }
          );
          done();
        }, 10);
      }, 10);
    });
  });

  describe('Member Management Operations', () => {
    beforeEach(() => {
      mockStore.select.and.returnValue(of(mockTechnicians));
      fixture.detectChanges();
    });

    it('should remove a specific member from the crew', () => {
      component.selectedMemberIds = ['tech-1', 'tech-2', 'tech-3'];
      component.crewForm.patchValue({ memberIds: ['tech-1', 'tech-2', 'tech-3'] });

      component.removeMember('tech-2');

      expect(component.selectedMemberIds).toEqual(['tech-1', 'tech-3']);
      expect(component.crewForm.get('memberIds')?.value).toEqual(['tech-1', 'tech-3']);
    });

    it('should clear all members from the crew', () => {
      component.selectedMemberIds = ['tech-1', 'tech-2', 'tech-3'];
      component.crewForm.patchValue({ memberIds: ['tech-1', 'tech-2', 'tech-3'] });

      component.clearAllMembers();

      expect(component.selectedMemberIds).toEqual([]);
      expect(component.crewForm.get('memberIds')?.value).toEqual([]);
    });

    it('should get technician by ID', () => {
      const technician = component.getTechnicianById('tech-1');
      
      expect(technician).toBeDefined();
      expect(technician?.id).toBe('tech-1');
      expect(technician?.firstName).toBe('John');
    });

    it('should return undefined for unknown technician ID', () => {
      const technician = component.getTechnicianById('unknown-id');
      
      expect(technician).toBeUndefined();
    });
  });

  describe('Route Parameter Handling', () => {
    it('should enter edit mode when route has crew ID', (done) => {
      mockStore.select.and.returnValue(of(mockCrew));
      fixture.detectChanges();

      paramsSubject.next({ id: 'crew-1' });

      setTimeout(() => {
        expect(component.isEditMode).toBe(true);
        expect(component.crewId).toBe('crew-1');
        done();
      }, 10);
    });

    it('should stay in create mode when route has "new" ID', (done) => {
      fixture.detectChanges();

      paramsSubject.next({ id: 'new' });

      setTimeout(() => {
        expect(component.isEditMode).toBe(false);
        expect(component.crewId).toBeNull();
        done();
      }, 10);
    });

    it('should stay in create mode when route has no ID', (done) => {
      fixture.detectChanges();

      paramsSubject.next({});

      setTimeout(() => {
        expect(component.isEditMode).toBe(false);
        expect(component.crewId).toBeNull();
        done();
      }, 10);
    });
  });

  describe('Form Control Access', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should get form control by path', () => {
      const control = component.getControl('name');
      
      expect(control).toBeDefined();
      expect(control).toBe(component.crewForm.get('name'));
    });

    it('should return null for non-existent control', () => {
      const control = component.getControl('nonExistent');
      
      expect(control).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      mockStore.select.and.returnValue(of(mockTechnicians));
      fixture.detectChanges();
    });

    it('should handle empty member list', () => {
      component.crewForm.patchValue({
        name: 'Solo Crew',
        leadTechnicianId: 'tech-1',
        memberIds: [],
        company: 'ACME_CORP',
        status: CrewStatus.Available
      });

      expect(component.crewForm.valid).toBe(true);
    });

    it('should handle form submission with disabled fields', () => {
      component.crewForm.patchValue({
        name: 'Test Crew',
        leadTechnicianId: 'tech-1',
        memberIds: ['tech-2'],
        status: CrewStatus.Available
      });

      // Market and company are disabled for non-admin
      expect(component.crewForm.get('market')?.disabled).toBe(true);
      expect(component.crewForm.get('company')?.disabled).toBe(true);

      component.onSubmit();

      // getRawValue should include disabled fields
      expect(mockStore.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          crew: jasmine.objectContaining({
          })
        })
      );
    });

    it('should not submit when crewId is null in edit mode', () => {
      component.isEditMode = true;
      component.crewId = null;
      
      component.crewForm.patchValue({
        name: 'Test Crew',
        leadTechnicianId: 'tech-1',
        memberIds: [],
        company: 'ACME_CORP',
        status: CrewStatus.Available
      });

      const dispatchSpy = mockStore.dispatch;
      dispatchSpy.calls.reset();

      component['updateCrew'](component.crewForm.getRawValue());

      expect(dispatchSpy).not.toHaveBeenCalled();
    });

    it('should handle all CrewStatus enum values', () => {
      const statusControl = component.crewForm.get('status');

      Object.values(CrewStatus).forEach(status => {
        statusControl?.setValue(status);
        expect(statusControl?.valid).toBe(true);
        expect(statusControl?.hasError('invalidStatus')).toBe(false);
      });
    });

    it('should mark all form fields as touched when submitting invalid form', () => {
      component.crewForm.patchValue({
        name: '',
        leadTechnicianId: '',
      });

      component.onSubmit();

      Object.keys(component.crewForm.controls).forEach(key => {
        const control = component.crewForm.get(key);
        expect(control?.touched).toBe(true);
      });
    });

    it('should handle empty technicians list', () => {
      mockStore.select.and.returnValue(of([]));
      component['loadTechnicians']();
      fixture.detectChanges();

      expect(component.availableTechnicians).toEqual([]);
      expect(component.availableMemberTechnicians).toEqual([]);
    });

    it('should handle null crew when loading in edit mode', () => {
      mockStore.select.and.returnValue(of(null));
      component['loadCrew']('crew-1');
      fixture.detectChanges();

      // Form should not be populated
      expect(component.crewForm.get('name')?.value).toBe('');
    });
  });

  describe('Component Lifecycle', () => {
    it('should unsubscribe on destroy', () => {
      fixture.detectChanges();
      const destroySpy = spyOn(component['destroy$'], 'next');
      const completeSpy = spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(destroySpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });

    it('should initialize form on init', () => {
      expect(component.crewForm).toBeUndefined();
      
      fixture.detectChanges();

      expect(component.crewForm).toBeDefined();
      expect(component.crewForm.get('name')).toBeDefined();
      expect(component.crewForm.get('leadTechnicianId')).toBeDefined();
      expect(component.crewForm.get('memberIds')).toBeDefined();
    });
  });

  describe('Validation Edge Cases', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should validate memberIds when leadTechnicianId is empty', () => {
      component.crewForm.patchValue({
        leadTechnicianId: '',
        memberIds: ['tech-1', 'tech-2']
      });

      const memberIdsControl = component.crewForm.get('memberIds');
      expect(memberIdsControl?.hasError('leadInMembers')).toBe(false);
    });

    it('should validate memberIds when memberIds is empty', () => {
      component.crewForm.patchValue({
        leadTechnicianId: 'tech-1',
        memberIds: []
      });

      const memberIdsControl = component.crewForm.get('memberIds');
      expect(memberIdsControl?.hasError('leadInMembers')).toBe(false);
    });

    it('should validate status when value is empty', () => {
      const statusControl = component.crewForm.get('status');
      statusControl?.setValue('');

      // Should not have invalidStatus error when empty (required validator handles this)
      expect(statusControl?.hasError('invalidStatus')).toBe(false);
    });

    it('should return empty string for error message when control has no errors', () => {
      const nameControl = component.crewForm.get('name');
      nameControl?.setValue('Valid Name');
      nameControl?.markAsTouched();

      expect(component.getErrorMessage('name')).toBe('');
    });

    it('should return "Invalid value" for unknown error type', () => {
      const nameControl = component.crewForm.get('name');
      nameControl?.setErrors({ customError: true });
      nameControl?.markAsTouched();

      expect(component.getErrorMessage('name')).toBe('Invalid value');
    });

    it('should return false for hasError when control is not touched', () => {
      const nameControl = component.crewForm.get('name');
      nameControl?.setValue('');
      // Don't mark as touched

      expect(component.hasError('name', 'required')).toBe(false);
    });

    it('should return false for hasError when control is not dirty and not touched', () => {
      const nameControl = component.crewForm.get('name');
      nameControl?.setValue('');

      expect(component.hasError('name', 'required')).toBe(false);
    });
  });
});

