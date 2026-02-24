import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { ConflictResolverComponent } from './conflict-resolver.component';
import { Conflict, ConflictSeverity } from '../../../models/assignment.model';
import * as AssignmentActions from '../../../state/assignments/assignment.actions';

describe('ConflictResolverComponent', () => {
  let component: ConflictResolverComponent;
  let fixture: ComponentFixture<ConflictResolverComponent>;
  let store: MockStore;
  let snackBar: jasmine.SpyObj<MatSnackBar>;
  let dialog: jasmine.SpyObj<MatDialog>;

  const mockConflict: Conflict = {
    jobId: 'current-job',
    technicianId: 'tech1',
    conflictingJobId: 'job1',
    conflictingJobTitle: 'Test Job',
    timeRange: {
      startDate: new Date('2024-01-15T08:00:00'),
      endDate: new Date('2024-01-15T16:00:00')
    },
    severity: ConflictSeverity.Error
  };

  const initialState = {
    assignments: {
      ids: [],
      entities: {},
      conflicts: [mockConflict],
      qualifiedTechnicians: [],
      loading: false,
      error: null
    },
    technicians: {
      ids: ['tech1'],
      entities: {
        tech1: {
          id: 'tech1',
          technicianId: 'TECH-001',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '555-0100',
          role: 'Installer',
          employmentType: 'W2',
          homeBase: 'Office A',
          region: 'North',
          skills: [],
          certifications: [],
          availability: [],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      },
      selectedId: null,
      loading: false,
      error: null,
      filters: {}
    },
    jobs: {
      ids: [],
      entities: {},
      selectedId: null,
      loading: false,
      error: null,
      filters: {}
    }
  };

  beforeEach(async () => {
    const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
    const dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);

    await TestBed.configureTestingModule({
      declarations: [ConflictResolverComponent],
      imports: [
        BrowserAnimationsModule,
        FormsModule,
        MatTableModule,
        MatCheckboxModule,
        MatIconModule,
        MatButtonModule,
        MatTooltipModule,
        MatFormFieldModule,
        MatInputModule
      ],
      providers: [
        provideMockStore({ initialState }),
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: MatDialog, useValue: dialogSpy }
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    snackBar = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;
    dialog = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;

    fixture = TestBed.createComponent(ConflictResolverComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should dispatch loadConflicts on init', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    fixture.detectChanges();
    
    expect(dispatchSpy).toHaveBeenCalledWith(AssignmentActions.loadConflicts({}));
  });

  it('should check if all conflicts are selected', () => {
    component.conflicts = [mockConflict];
    component.selection.select(mockConflict);
    
    expect(component.isAllSelected()).toBe(true);
  });

  it('should toggle all conflicts selection', () => {
    component.conflicts = [mockConflict];
    
    component.toggleAllConflicts();
    expect(component.selection.isSelected(mockConflict)).toBe(true);
    
    component.toggleAllConflicts();
    expect(component.selection.isSelected(mockConflict)).toBe(false);
  });

  it('should get technician name by ID', () => {
    fixture.detectChanges();
    component.technicians = [initialState.technicians.entities.tech1 as any];
    
    const name = component.getTechnicianName('tech1');
    expect(name).toBe('John Doe');
  });

  it('should return Unknown for invalid technician ID', () => {
    fixture.detectChanges();
    const name = component.getTechnicianName('invalid');
    expect(name).toBe('Unknown');
  });

  it('should format time range', () => {
    const formatted = component.formatTimeRange(mockConflict);
    expect(formatted).toContain('-');
  });

  it('should get severity color - error', () => {
    const color = component.getSeverityColor(ConflictSeverity.Error);
    expect(color).toBe('severity-error');
  });

  it('should get severity color - warning', () => {
    const color = component.getSeverityColor(ConflictSeverity.Warning);
    expect(color).toBe('severity-warning');
  });

  it('should get severity icon - error', () => {
    const icon = component.getSeverityIcon(ConflictSeverity.Error);
    expect(icon).toBe('error');
  });

  it('should get severity icon - warning', () => {
    const icon = component.getSeverityIcon(ConflictSeverity.Warning);
    expect(icon).toBe('warning');
  });

  it('should start reassignment resolution', () => {
    component.onReassign(mockConflict);
    
    expect(component.resolvingConflict).toBe(mockConflict);
    expect(component.resolutionType).toBe('reassign');
    expect(snackBar.open).toHaveBeenCalled();
  });

  it('should start reschedule resolution', () => {
    component.onReschedule(mockConflict);
    
    expect(component.resolvingConflict).toBe(mockConflict);
    expect(component.resolutionType).toBe('reschedule');
    expect(snackBar.open).toHaveBeenCalled();
  });

  it('should start override resolution', () => {
    component.onOverride(mockConflict);
    
    expect(component.resolvingConflict).toBe(mockConflict);
    expect(component.resolutionType).toBe('override');
    expect(component.justification).toBe('');
  });

  it('should confirm override with valid justification', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.resolvingConflict = mockConflict;
    component.justification = 'Valid justification text';
    
    component.confirmOverride();
    
    // TODO: Update when overrideConflict action is implemented
    // expect(dispatchSpy).toHaveBeenCalledWith(
    //   AssignmentActions.overrideConflict({
    //     conflict: mockConflict,
    //     justification: 'Valid justification text'
    //   })
    // );
    expect(snackBar.open).toHaveBeenCalled();
  });

  it('should not confirm override without justification', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.resolvingConflict = mockConflict;
    component.justification = '';
    
    component.confirmOverride();
    
    expect(dispatchSpy).not.toHaveBeenCalled();
    expect(snackBar.open).toHaveBeenCalled();
  });

  it('should not confirm override with short justification', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.resolvingConflict = mockConflict;
    component.justification = 'short';
    
    component.confirmOverride();
    
    expect(dispatchSpy).not.toHaveBeenCalled();
    expect(snackBar.open).toHaveBeenCalled();
  });

  it('should cancel resolution', () => {
    component.resolvingConflict = mockConflict;
    component.resolutionType = 'override';
    component.justification = 'test';
    
    component.cancelResolution();
    
    expect(component.resolvingConflict).toBeNull();
    expect(component.resolutionType).toBeNull();
    expect(component.justification).toBe('');
  });

  it('should show message for batch reassign without selection', () => {
    component.onBatchReassign();
    expect(snackBar.open).toHaveBeenCalled();
  });

  it('should show message for batch reassign with selection', () => {
    component.selection.select(mockConflict);
    component.onBatchReassign();
    expect(snackBar.open).toHaveBeenCalled();
  });

  it('should show message for batch reschedule without selection', () => {
    component.onBatchReschedule();
    expect(snackBar.open).toHaveBeenCalled();
  });

  it('should show message for batch reschedule with selection', () => {
    component.selection.select(mockConflict);
    component.onBatchReschedule();
    expect(snackBar.open).toHaveBeenCalled();
  });

  it('should clear selection', () => {
    component.selection.select(mockConflict);
    expect(component.selection.selected.length).toBe(1);
    
    component.clearSelection();
    expect(component.selection.selected.length).toBe(0);
  });

  it('should refresh conflicts', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.onRefresh();
    
    expect(dispatchSpy).toHaveBeenCalledWith(AssignmentActions.loadConflicts({}));
    expect(snackBar.open).toHaveBeenCalled();
  });

  it('should clean up subscriptions on destroy', () => {
    const destroySpy = spyOn(component['destroy$'], 'next');
    const completeSpy = spyOn(component['destroy$'], 'complete');

    component.ngOnDestroy();

    expect(destroySpy).toHaveBeenCalled();
    expect(completeSpy).toHaveBeenCalled();
  });
});
