/**
 * Assignment Effects Unit Tests
 */

import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, of, throwError } from 'rxjs';
import { AssignmentEffects } from './assignment.effects';
import * as AssignmentActions from './assignment.actions';
import { SchedulingService } from '../../services/scheduling.service';
import { Assignment, Conflict, TechnicianMatch } from '../../models/assignment.model';
import { AssignmentDto } from '../../models/dtos';

describe('AssignmentEffects', () => {
  let actions$: Observable<any>;
  let effects: AssignmentEffects;
  let schedulingService: jasmine.SpyObj<SchedulingService>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  const mockAssignment: Assignment = {
    id: 'assignment-1',
    jobId: 'job-1',
    technicianId: 'tech-1',
    assignedBy: 'user-1',
    assignedAt: new Date(),
    isActive: true
  };

  const mockConflict: Conflict = {
    jobId: 'job-1',
    technicianId: 'tech-1',
    conflictingJobId: 'job-2',
    conflictingJobTitle: 'Conflicting Job',
    timeRange: {
      startDate: new Date(),
      endDate: new Date()
    },
    severity: 'Error' as any
  };

  const mockTechnicianMatch: TechnicianMatch = {
    technician: {
      id: 'tech-1',
      technicianId: 'T-001',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '555-0100',
      role: 'Installer' as any,
      employmentType: 'W2' as any,
      homeBase: 'Dallas Office',
      region: 'DALLAS',
      skills: [],
      certifications: [],
      availability: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    matchPercentage: 95,
    missingSkills: [],
    currentWorkload: 3,
    hasConflicts: false,
    conflicts: []
  };

  beforeEach(() => {
    const schedulingServiceSpy = jasmine.createSpyObj('SchedulingService', [
      'getAssignments',
      'assignTechnician',
      'unassignTechnician',
      'reassignJob',
      'detectAllConflicts',
      'checkConflicts',
      'getQualifiedTechnicians'
    ]);

    const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    TestBed.configureTestingModule({
      providers: [
        AssignmentEffects,
        provideMockActions(() => actions$),
        { provide: SchedulingService, useValue: schedulingServiceSpy },
        { provide: MatSnackBar, useValue: snackBarSpy }
      ]
    });

    effects = TestBed.inject(AssignmentEffects);
    schedulingService = TestBed.inject(SchedulingService) as jasmine.SpyObj<SchedulingService>;
    snackBar = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;
  });

  describe('loadAssignments$', () => {
    it('should return loadAssignmentsSuccess on successful load', (done) => {
      const assignments = [mockAssignment];
      const action = AssignmentActions.loadAssignments({ filters: {} });
      const outcome = AssignmentActions.loadAssignmentsSuccess({ assignments });

      actions$ = of(action);
      schedulingService.getAssignments.and.returnValue(of(assignments));

      effects.loadAssignments$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(schedulingService.getAssignments).toHaveBeenCalledWith({});
        done();
      });
    });

    it('should return loadAssignmentsFailure on error', (done) => {
      const error = new Error('Load failed');
      const action = AssignmentActions.loadAssignments({ filters: {} });
      const outcome = AssignmentActions.loadAssignmentsFailure({ error: 'Load failed' });

      actions$ = of(action);
      schedulingService.getAssignments.and.returnValue(throwError(() => error));

      effects.loadAssignments$.subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });
  });

  describe('createAssignment$', () => {
    it('should return createAssignmentSuccess on successful creation', (done) => {
      const assignmentDto: AssignmentDto = {
        jobId: 'job-1',
        technicianId: 'tech-1'
      };
      const action = AssignmentActions.createAssignment({ assignment: assignmentDto });
      const outcome = AssignmentActions.createAssignmentSuccess({ assignment: mockAssignment });

      actions$ = of(action);
      schedulingService.assignTechnician.and.returnValue(of(mockAssignment));

      effects.createAssignment$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(schedulingService.assignTechnician).toHaveBeenCalledWith(
          'job-1',
          'tech-1',
          undefined,
          undefined
        );
        done();
      });
    });

    it('should return createAssignmentFailure on error', (done) => {
      const assignmentDto: AssignmentDto = {
        jobId: 'job-1',
        technicianId: 'tech-1'
      };
      const error = new Error('Creation failed');
      const action = AssignmentActions.createAssignment({ assignment: assignmentDto });
      const outcome = AssignmentActions.createAssignmentFailure({ error: 'Creation failed' });

      actions$ = of(action);
      schedulingService.assignTechnician.and.returnValue(throwError(() => error));

      effects.createAssignment$.subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });
  });

  describe('assignTechnician$', () => {
    it('should return assignTechnicianSuccess on successful assignment', (done) => {
      const action = AssignmentActions.assignTechnician({
        jobId: 'job-1',
        technicianId: 'tech-1',
        override: false
      });
      const outcome = AssignmentActions.assignTechnicianSuccess({ assignment: mockAssignment });

      actions$ = of(action);
      schedulingService.assignTechnician.and.returnValue(of(mockAssignment));

      effects.assignTechnician$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(schedulingService.assignTechnician).toHaveBeenCalledWith(
          'job-1',
          'tech-1',
          false,
          undefined
        );
        done();
      });
    });

    it('should handle override and justification', (done) => {
      const action = AssignmentActions.assignTechnician({
        jobId: 'job-1',
        technicianId: 'tech-1',
        override: true,
        justification: 'Emergency assignment'
      });
      const outcome = AssignmentActions.assignTechnicianSuccess({ assignment: mockAssignment });

      actions$ = of(action);
      schedulingService.assignTechnician.and.returnValue(of(mockAssignment));

      effects.assignTechnician$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(schedulingService.assignTechnician).toHaveBeenCalledWith(
          'job-1',
          'tech-1',
          true,
          'Emergency assignment'
        );
        done();
      });
    });

    it('should return assignTechnicianFailure on error', (done) => {
      const error = new Error('Assignment failed');
      const action = AssignmentActions.assignTechnician({
        jobId: 'job-1',
        technicianId: 'tech-1'
      });
      const outcome = AssignmentActions.assignTechnicianFailure({ error: 'Assignment failed' });

      actions$ = of(action);
      schedulingService.assignTechnician.and.returnValue(throwError(() => error));

      effects.assignTechnician$.subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });
  });

  describe('unassignTechnician$', () => {
    it('should return unassignTechnicianSuccess on successful unassignment', (done) => {
      const action = AssignmentActions.unassignTechnician({ assignmentId: 'assignment-1' });
      const outcome = AssignmentActions.unassignTechnicianSuccess({ assignmentId: 'assignment-1' });

      actions$ = of(action);
      schedulingService.unassignTechnician.and.returnValue(of(undefined));

      effects.unassignTechnician$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(schedulingService.unassignTechnician).toHaveBeenCalledWith('assignment-1');
        done();
      });
    });

    it('should return unassignTechnicianFailure on error', (done) => {
      const error = new Error('Unassignment failed');
      const action = AssignmentActions.unassignTechnician({ assignmentId: 'assignment-1' });
      const outcome = AssignmentActions.unassignTechnicianFailure({ error: 'Unassignment failed' });

      actions$ = of(action);
      schedulingService.unassignTechnician.and.returnValue(throwError(() => error));

      effects.unassignTechnician$.subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });
  });

  describe('reassignJob$', () => {
    it('should return reassignJobSuccess on successful reassignment', (done) => {
      const action = AssignmentActions.reassignJob({
        jobId: 'job-1',
        fromTechnicianId: 'tech-1',
        toTechnicianId: 'tech-2'
      });
      const newAssignment = { ...mockAssignment, technicianId: 'tech-2' };
      const outcome = AssignmentActions.reassignJobSuccess({
        oldAssignmentId: 'job-1-tech-1',
        newAssignment
      });

      actions$ = of(action);
      schedulingService.reassignJob.and.returnValue(of(newAssignment));

      effects.reassignJob$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(schedulingService.reassignJob).toHaveBeenCalledWith('job-1', 'tech-1', 'tech-2');
        done();
      });
    });

    it('should return reassignJobFailure on error', (done) => {
      const error = new Error('Reassignment failed');
      const action = AssignmentActions.reassignJob({
        jobId: 'job-1',
        fromTechnicianId: 'tech-1',
        toTechnicianId: 'tech-2'
      });
      const outcome = AssignmentActions.reassignJobFailure({ error: 'Reassignment failed' });

      actions$ = of(action);
      schedulingService.reassignJob.and.returnValue(throwError(() => error));

      effects.reassignJob$.subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });
  });

  describe('loadConflicts$', () => {
    it('should return loadConflictsSuccess on successful load', (done) => {
      const conflicts = [mockConflict];
      const action = AssignmentActions.loadConflicts({});
      const outcome = AssignmentActions.loadConflictsSuccess({ conflicts });

      actions$ = of(action);
      schedulingService.detectAllConflicts.and.returnValue(of(conflicts));

      effects.loadConflicts$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(schedulingService.detectAllConflicts).toHaveBeenCalledWith(undefined);
        done();
      });
    });

    it('should filter conflicts by technician ID when provided', (done) => {
      const conflicts = [
        mockConflict,
        { ...mockConflict, technicianId: 'tech-2' }
      ];
      const action = AssignmentActions.loadConflicts({ technicianId: 'tech-1' });
      const outcome = AssignmentActions.loadConflictsSuccess({ conflicts: [mockConflict] });

      actions$ = of(action);
      schedulingService.detectAllConflicts.and.returnValue(of(conflicts));

      effects.loadConflicts$.subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });

    it('should return loadConflictsFailure on error', (done) => {
      const error = new Error('Load conflicts failed');
      const action = AssignmentActions.loadConflicts({});
      const outcome = AssignmentActions.loadConflictsFailure({ error: 'Load conflicts failed' });

      actions$ = of(action);
      schedulingService.detectAllConflicts.and.returnValue(throwError(() => error));

      effects.loadConflicts$.subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });
  });

  describe('checkConflicts$', () => {
    it('should return checkConflictsSuccess on successful check', (done) => {
      const conflicts = [mockConflict];
      const action = AssignmentActions.checkConflicts({
        technicianId: 'tech-1',
        jobId: 'job-1'
      });
      const outcome = AssignmentActions.checkConflictsSuccess({ conflicts });

      actions$ = of(action);
      schedulingService.checkConflicts.and.returnValue(of(conflicts));

      effects.checkConflicts$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(schedulingService.checkConflicts).toHaveBeenCalledWith('tech-1', 'job-1');
        done();
      });
    });

    it('should return checkConflictsFailure on error', (done) => {
      const error = new Error('Check conflicts failed');
      const action = AssignmentActions.checkConflicts({
        technicianId: 'tech-1',
        jobId: 'job-1'
      });
      const outcome = AssignmentActions.checkConflictsFailure({ error: 'Check conflicts failed' });

      actions$ = of(action);
      schedulingService.checkConflicts.and.returnValue(throwError(() => error));

      effects.checkConflicts$.subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });
  });

  describe('loadQualifiedTechnicians$', () => {
    it('should return loadQualifiedTechniciansSuccess on successful load', (done) => {
      const technicians = [mockTechnicianMatch];
      const action = AssignmentActions.loadQualifiedTechnicians({ jobId: 'job-1' });
      const outcome = AssignmentActions.loadQualifiedTechniciansSuccess({ technicians });

      actions$ = of(action);
      schedulingService.getQualifiedTechnicians.and.returnValue(of(technicians));

      effects.loadQualifiedTechnicians$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(schedulingService.getQualifiedTechnicians).toHaveBeenCalledWith('job-1');
        done();
      });
    });

    it('should return loadQualifiedTechniciansFailure on error', (done) => {
      const error = new Error('Load qualified technicians failed');
      const action = AssignmentActions.loadQualifiedTechnicians({ jobId: 'job-1' });
      const outcome = AssignmentActions.loadQualifiedTechniciansFailure({
        error: 'Load qualified technicians failed'
      });

      actions$ = of(action);
      schedulingService.getQualifiedTechnicians.and.returnValue(throwError(() => error));

      effects.loadQualifiedTechnicians$.subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });
  });

  describe('notification effects', () => {
    it('should show success notification on createAssignmentSuccess', (done) => {
      const action = AssignmentActions.createAssignmentSuccess({ assignment: mockAssignment });
      actions$ = of(action);

      effects.showCreateAssignmentSuccess$.subscribe(() => {
        expect(snackBar.open).toHaveBeenCalledWith(
          'Assignment created successfully',
          'Close',
          { duration: 3000 }
        );
        done();
      });
    });

    it('should show success notification on assignTechnicianSuccess', (done) => {
      const action = AssignmentActions.assignTechnicianSuccess({ assignment: mockAssignment });
      actions$ = of(action);

      effects.showAssignTechnicianSuccess$.subscribe(() => {
        expect(snackBar.open).toHaveBeenCalledWith(
          'Technician assigned successfully',
          'Close',
          { duration: 3000 }
        );
        done();
      });
    });

    it('should show error notification on failure', (done) => {
      const action = AssignmentActions.loadAssignmentsFailure({ error: 'Test error' });
      actions$ = of(action);

      effects.showErrorNotification$.subscribe(() => {
        expect(snackBar.open).toHaveBeenCalledWith('Test error', 'Close', { duration: 5000 });
        done();
      });
    });
  });

  describe('error logging', () => {
    it('should log errors to console', (done) => {
      spyOn(console, 'error');
      const action = AssignmentActions.loadAssignmentsFailure({ error: 'Test error' });
      actions$ = of(action);

      effects.logErrors$.subscribe(() => {
        expect(console.error).toHaveBeenCalledWith('Assignment Effect Error:', 'Test error');
        done();
      });
    });
  });
});
