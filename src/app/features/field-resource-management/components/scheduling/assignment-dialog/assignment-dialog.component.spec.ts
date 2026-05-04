import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AssignmentDialogComponent } from './assignment-dialog.component';
import { Job, JobStatus, JobType, Priority } from '../../../models/job.model';
import { TechnicianMatch } from '../../../models/assignment.model';
import { TechnicianRole, EmploymentType , SkillLevel} from '../../../models/technician.model';
import * as AssignmentActions from '../../../state/assignments/assignment.actions';

describe('AssignmentDialogComponent', () => {
  let component: AssignmentDialogComponent;
  let fixture: ComponentFixture<AssignmentDialogComponent>;
  let store: MockStore;
  let dialogRef: jasmine.SpyObj<MatDialogRef<AssignmentDialogComponent>>;

  const mockJob: Job = {
    id: '1',
    jobId: 'JOB-001',
    client: 'Test Client',
    siteName: 'Test Site',
    siteAddress: {
      street: '123 Main St',
      city: 'Test City',
      state: 'TS',
      zipCode: '12345'
    },
    jobType: JobType.Install,
    priority: Priority.Normal,
    status: JobStatus.NotStarted,
    scopeDescription: 'Test job',
    requiredSkills: [
      { id: '1', name: 'Cat6', category: 'Cabling' , level: SkillLevel.Intermediate }
    ],
    requiredCrewSize: 1,
    estimatedLaborHours: 8,
    scheduledStartDate: new Date('2024-01-15T08:00:00'),
    scheduledEndDate: new Date('2024-01-15T16:00:00'),
    attachments: [],
    notes: [],
    createdBy: 'admin',
    company: 'ACME_CORP',
    market: 'TEST_MARKET',
    createdAt: new Date(),
    updatedAt: new Date(),

  };

  const mockTechnicianMatch: TechnicianMatch = {
    technician: {
      id: 'tech1',
      technicianId: 'TECH-001',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '555-0100',
      role: TechnicianRole.Installer,
      employmentType: EmploymentType.W2,
      homeBase: 'Office A',
      region: 'North',
      skills: [{ id: '1', name: 'Cat6', category: 'Cabling' , level: SkillLevel.Intermediate }],
      certifications: [],
      availability: [],
      isActive: true,
      canTravel: false,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    matchPercentage: 100,
    missingSkills: [],
    currentWorkload: 2,
    hasConflicts: false,
    conflicts: []
  };

  const initialState = {
    assignments: {
      ids: [],
      entities: {},
      conflicts: [],
      qualifiedTechnicians: [mockTechnicianMatch],
      loading: false,
      error: null
    }
  };

  beforeEach(async () => {
    const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      declarations: [AssignmentDialogComponent],
      imports: [
        BrowserAnimationsModule,
        ReactiveFormsModule,
        FormsModule,
        MatDialogModule,
        MatCheckboxModule,
        MatFormFieldModule,
        MatInputModule,
        MatChipsModule,
        MatIconModule,
        MatButtonModule,
        MatDividerModule,
        MatTooltipModule,
        MatProgressBarModule,
        MatProgressSpinnerModule,
        MatSelectModule
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        provideMockStore({ initialState }),
        { provide: MAT_DIALOG_DATA, useValue: { job: mockJob } },
        { provide: MatDialogRef, useValue: dialogRefSpy }
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    dialogRef = TestBed.inject(MatDialogRef) as jasmine.SpyObj<MatDialogRef<AssignmentDialogComponent>>;

    fixture = TestBed.createComponent(AssignmentDialogComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with job data', () => {
    expect(component.job).toEqual(mockJob);
  });

  it('should dispatch loadQualifiedTechnicians on init', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    fixture.detectChanges();
    
    expect(dispatchSpy).toHaveBeenCalledWith(
      AssignmentActions.loadQualifiedTechnicians({ jobId: mockJob.id })
    );
  });

  it('should select technician', () => {
    component.onSelectTechnician(mockTechnicianMatch);
    
    expect(component.selectedTechnician).toEqual(mockTechnicianMatch);
    expect(component.assignmentForm.get('technicianId')?.value).toBe('tech1');
  });

  it('should check if technician is selected', () => {
    component.selectedTechnician = mockTechnicianMatch;
    
    expect(component.isSelected(mockTechnicianMatch)).toBe(true);
  });

  it('should get availability status - available', () => {
    const status = component.getAvailabilityStatus(mockTechnicianMatch);
    expect(status).toBe(component.AvailabilityStatus.Available);
  });

  it('should get availability status - partially available', () => {
    const techMatch = { ...mockTechnicianMatch, currentWorkload: 3 };
    const status = component.getAvailabilityStatus(techMatch);
    expect(status).toBe(component.AvailabilityStatus.PartiallyAvailable);
  });

  it('should get availability status - unavailable', () => {
    const techMatch = { ...mockTechnicianMatch, hasConflicts: true };
    const status = component.getAvailabilityStatus(techMatch);
    expect(status).toBe(component.AvailabilityStatus.Unavailable);
  });

  it('should get availability label', () => {
    expect(component.getAvailabilityLabel(component.AvailabilityStatus.Available)).toBe('Available');
    expect(component.getAvailabilityLabel(component.AvailabilityStatus.PartiallyAvailable)).toBe('Partially Available');
    expect(component.getAvailabilityLabel(component.AvailabilityStatus.Unavailable)).toBe('Unavailable');
  });

  it('should get availability icon', () => {
    expect(component.getAvailabilityIcon(component.AvailabilityStatus.Available)).toBe('check_circle');
    expect(component.getAvailabilityIcon(component.AvailabilityStatus.PartiallyAvailable)).toBe('warning');
    expect(component.getAvailabilityIcon(component.AvailabilityStatus.Unavailable)).toBe('cancel');
  });

  it('should get skill match color - perfect', () => {
    expect(component.getSkillMatchColor(100)).toBe('match-perfect');
  });

  it('should get skill match color - good', () => {
    expect(component.getSkillMatchColor(80)).toBe('match-good');
  });

  it('should get skill match color - fair', () => {
    expect(component.getSkillMatchColor(60)).toBe('match-fair');
  });

  it('should get skill match color - poor', () => {
    expect(component.getSkillMatchColor(40)).toBe('match-poor');
  });

  it('should require override when technician has conflicts', () => {
    const techMatch = { ...mockTechnicianMatch, hasConflicts: true };
    component.selectedTechnician = techMatch;
    
    expect(component.requiresOverride()).toBe(true);
  });

  it('should require override when skill match is not 100%', () => {
    const techMatch = { ...mockTechnicianMatch, matchPercentage: 75 };
    component.selectedTechnician = techMatch;
    
    expect(component.requiresOverride()).toBe(true);
  });

  it('should not require override for perfect match without conflicts', () => {
    component.selectedTechnician = mockTechnicianMatch;
    
    expect(component.requiresOverride()).toBe(false);
  });

  it('should enable override checkbox when technician has conflicts', () => {
    const techMatch = { ...mockTechnicianMatch, hasConflicts: true };
    component.onSelectTechnician(techMatch);
    
    expect(component.assignmentForm.get('override')?.value).toBe(true);
  });

  it('should require justification when override is checked', () => {
    fixture.detectChanges();
    component.assignmentForm.patchValue({ override: true });
    
    const justificationControl = component.assignmentForm.get('justification');
    expect(justificationControl?.hasError('required')).toBe(true);
  });

  it('should validate justification minimum length', () => {
    fixture.detectChanges();
    component.assignmentForm.patchValue({
      override: true,
      justification: 'short'
    });
    
    const justificationControl = component.assignmentForm.get('justification');
    expect(justificationControl?.hasError('minlength')).toBe(true);
  });

  it('should allow assignment when form is valid', () => {
    fixture.detectChanges();
    component.selectedTechnician = mockTechnicianMatch;
    component.assignmentForm.patchValue({
      technicianId: 'tech1'
    });
    
    expect(component.canAssign()).toBe(true);
  });

  it('should not allow assignment without selected technician', () => {
    fixture.detectChanges();
    component.selectedTechnician = null;
    
    expect(component.canAssign()).toBe(false);
  });

  it('should dispatch assignTechnician action on assign', () => {
    fixture.detectChanges();
    const dispatchSpy = spyOn(store, 'dispatch');
    
    component.selectedTechnician = mockTechnicianMatch;
    component.assignmentForm.patchValue({
      technicianId: 'tech1',
      override: false,
      justification: ''
    });
    
    component.onAssign();
    
    expect(dispatchSpy).toHaveBeenCalledWith(
      AssignmentActions.assignTechnician({
        jobId: mockJob.id,
        technicianId: 'tech1',
        override: false,
        justification: ''
      })
    );
  });

  it('should close dialog with result on assign', () => {
    fixture.detectChanges();
    component.selectedTechnician = mockTechnicianMatch;
    component.assignmentForm.patchValue({
      technicianId: 'tech1'
    });
    
    component.onAssign();
    
    expect(dialogRef.close).toHaveBeenCalledWith({
      assigned: true,
      technicianId: 'tech1'
    });
  });

  it('should close dialog without result on cancel', () => {
    component.onCancel();
    
    expect(dialogRef.close).toHaveBeenCalledWith({ assigned: false });
  });

  it('should get conflict icon', () => {
    expect(component.getConflictIcon('Error')).toBe('error');
    expect(component.getConflictIcon('Warning')).toBe('warning');
  });

  it('should get conflict color', () => {
    expect(component.getConflictColor('Error')).toBe('conflict-error');
    expect(component.getConflictColor('Warning')).toBe('conflict-warning');
  });

  it('should format time range', () => {
    const start = new Date('2024-01-15T08:00:00');
    const end = new Date('2024-01-15T16:00:00');
    const formatted = component.formatTimeRange(start, end);
    
    expect(formatted).toContain('-');
  });

  it('should clean up subscriptions on destroy', () => {
    const destroySpy = spyOn(component['destroy$'], 'next');
    const completeSpy = spyOn(component['destroy$'], 'complete');

    component.ngOnDestroy();

    expect(destroySpy).toHaveBeenCalled();
    expect(completeSpy).toHaveBeenCalled();
  });
});
