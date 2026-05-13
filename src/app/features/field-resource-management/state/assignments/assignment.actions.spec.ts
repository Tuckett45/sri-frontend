/**
 * Assignment Actions Unit Tests
 * Tests all action creators for assignment state management
 */

import * as AssignmentActions from './assignment.actions';
import { Assignment, Conflict, TechnicianMatch, ConflictSeverity, AssignmentStatus } from '../../models/assignment.model';
import { AssignmentDto, AssignmentFilters } from '../../models/dtos';

describe('Assignment Actions', () => {
  const mockAssignment: Assignment = {
    id: 'assignment-1',
    jobId: 'job-1',
    technicianId: 'tech-1',
    assignedBy: 'user-1',
    assignedAt: new Date('2024-01-15T10:00:00Z'),
    status: AssignmentStatus.Assigned,
    isActive: true
  };

  const mockConflict: Conflict = {
    jobId: 'job-1',
    technicianId: 'tech-1',
    conflictingJobId: 'job-2',
    conflictingJobTitle: 'Conflicting Job',
    timeRange: {
      startDate: new Date('2024-01-15T09:00:00Z'),
      endDate: new Date('2024-01-15T11:00:00Z')
    },
    severity: ConflictSeverity.Error
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
      company: 'TEST_COMPANY',      updatedAt: new Date()
    },
    matchPercentage: 95,
    missingSkills: [],
    currentWorkload: 3,
    hasConflicts: false,
    conflicts: []
  };

  describe('Load Assignments Actions', () => {
    it('should create loadAssignments action', () => {
      const filters: AssignmentFilters = { technicianId: 'tech-1' };
      const action = AssignmentActions.loadAssignments({ filters });

      expect(action.type).toBe('[Assignment] Load Assignments');
      expect(action.filters).toEqual(filters);
    });

    it('should create loadAssignments action without filters', () => {
      const action = AssignmentActions.loadAssignments({});

      expect(action.type).toBe('[Assignment] Load Assignments');
      expect(action.filters).toBeUndefined();
    });

    it('should create loadAssignmentsSuccess action', () => {
      const assignments = [mockAssignment];
      const action = AssignmentActions.loadAssignmentsSuccess({ assignments });

      expect(action.type).toBe('[Assignment] Load Assignments Success');
      expect(action.assignments).toEqual(assignments);
    });

    it('should create loadAssignmentsFailure action', () => {
      const error = 'Failed to load assignments';
      const action = AssignmentActions.loadAssignmentsFailure({ error });

      expect(action.type).toBe('[Assignment] Load Assignments Failure');
      expect(action.error).toBe(error);
    });
  });

  describe('Create Assignment Actions', () => {
    it('should create createAssignment action', () => {
      const assignment: AssignmentDto = {
        jobId: 'job-1',
        technicianId: 'tech-1'
      };
      const action = AssignmentActions.createAssignment({ assignment });

      expect(action.type).toBe('[Assignment] Create Assignment');
      expect(action.assignment).toEqual(assignment);
    });

    it('should create createAssignmentSuccess action', () => {
      const action = AssignmentActions.createAssignmentSuccess({ assignment: mockAssignment });

      expect(action.type).toBe('[Assignment] Create Assignment Success');
      expect(action.assignment).toEqual(mockAssignment);
    });

    it('should create createAssignmentFailure action', () => {
      const error = 'Failed to create assignment';
      const action = AssignmentActions.createAssignmentFailure({ error });

      expect(action.type).toBe('[Assignment] Create Assignment Failure');
      expect(action.error).toBe(error);
    });
  });

  describe('Update Assignment Actions', () => {
    it('should create updateAssignment action', () => {
      const id = 'assignment-1';
      const changes = { isActive: false };
      const action = AssignmentActions.updateAssignment({ id, changes });

      expect(action.type).toBe('[Assignment] Update Assignment');
      expect(action.id).toBe(id);
      expect(action.changes).toEqual(changes);
    });

    it('should create updateAssignmentSuccess action', () => {
      const action = AssignmentActions.updateAssignmentSuccess({ assignment: mockAssignment });

      expect(action.type).toBe('[Assignment] Update Assignment Success');
      expect(action.assignment).toEqual(mockAssignment);
    });

    it('should create updateAssignmentFailure action', () => {
      const error = 'Failed to update assignment';
      const action = AssignmentActions.updateAssignmentFailure({ error });

      expect(action.type).toBe('[Assignment] Update Assignment Failure');
      expect(action.error).toBe(error);
    });
  });

  describe('Accept Assignment Actions', () => {
    it('should create acceptAssignment action', () => {
      const id = 'assignment-1';
      const action = AssignmentActions.acceptAssignment({ id });

      expect(action.type).toBe('[Assignment] Accept Assignment');
      expect(action.id).toBe(id);
    });

    it('should create acceptAssignmentSuccess action', () => {
      const action = AssignmentActions.acceptAssignmentSuccess({ assignment: mockAssignment });

      expect(action.type).toBe('[Assignment] Accept Assignment Success');
      expect(action.assignment).toEqual(mockAssignment);
    });

    it('should create acceptAssignmentFailure action', () => {
      const error = 'Failed to accept assignment';
      const action = AssignmentActions.acceptAssignmentFailure({ error });

      expect(action.type).toBe('[Assignment] Accept Assignment Failure');
      expect(action.error).toBe(error);
    });
  });

  describe('Reject Assignment Actions', () => {
    it('should create rejectAssignment action', () => {
      const id = 'assignment-1';
      const reason = 'Not available';
      const action = AssignmentActions.rejectAssignment({ id, reason });

      expect(action.type).toBe('[Assignment] Reject Assignment');
      expect(action.id).toBe(id);
      expect(action.reason).toBe(reason);
    });

    it('should create rejectAssignment action without reason', () => {
      const id = 'assignment-1';
      const action = AssignmentActions.rejectAssignment({ id });

      expect(action.type).toBe('[Assignment] Reject Assignment');
      expect(action.id).toBe(id);
      expect(action.reason).toBeUndefined();
    });

    it('should create rejectAssignmentSuccess action', () => {
      const action = AssignmentActions.rejectAssignmentSuccess({ assignment: mockAssignment });

      expect(action.type).toBe('[Assignment] Reject Assignment Success');
      expect(action.assignment).toEqual(mockAssignment);
    });

    it('should create rejectAssignmentFailure action', () => {
      const error = 'Failed to reject assignment';
      const action = AssignmentActions.rejectAssignmentFailure({ error });

      expect(action.type).toBe('[Assignment] Reject Assignment Failure');
      expect(action.error).toBe(error);
    });
  });

  describe('Assign Technician Actions', () => {
    it('should create assignTechnician action', () => {
      const jobId = 'job-1';
      const technicianId = 'tech-1';
      const action = AssignmentActions.assignTechnician({ jobId, technicianId });

      expect(action.type).toBe('[Assignment] Assign Technician');
      expect(action.jobId).toBe(jobId);
      expect(action.technicianId).toBe(technicianId);
      expect(action.override).toBeUndefined();
      expect(action.justification).toBeUndefined();
    });

    it('should create assignTechnician action with override and justification', () => {
      const jobId = 'job-1';
      const technicianId = 'tech-1';
      const override = true;
      const justification = 'Emergency assignment';
      const action = AssignmentActions.assignTechnician({ jobId, technicianId, override, justification });

      expect(action.type).toBe('[Assignment] Assign Technician');
      expect(action.jobId).toBe(jobId);
      expect(action.technicianId).toBe(technicianId);
      expect(action.override).toBe(true);
      expect(action.justification).toBe(justification);
    });

    it('should create assignTechnicianSuccess action', () => {
      const action = AssignmentActions.assignTechnicianSuccess({ assignment: mockAssignment });

      expect(action.type).toBe('[Assignment] Assign Technician Success');
      expect(action.assignment).toEqual(mockAssignment);
    });

    it('should create assignTechnicianFailure action', () => {
      const error = 'Failed to assign technician';
      const action = AssignmentActions.assignTechnicianFailure({ error });

      expect(action.type).toBe('[Assignment] Assign Technician Failure');
      expect(action.error).toBe(error);
    });
  });

  describe('Unassign Technician Actions', () => {
    it('should create unassignTechnician action', () => {
      const assignmentId = 'assignment-1';
      const action = AssignmentActions.unassignTechnician({ assignmentId });

      expect(action.type).toBe('[Assignment] Unassign Technician');
      expect(action.assignmentId).toBe(assignmentId);
    });

    it('should create unassignTechnicianSuccess action', () => {
      const assignmentId = 'assignment-1';
      const action = AssignmentActions.unassignTechnicianSuccess({ assignmentId });

      expect(action.type).toBe('[Assignment] Unassign Technician Success');
      expect(action.assignmentId).toBe(assignmentId);
    });

    it('should create unassignTechnicianFailure action', () => {
      const error = 'Failed to unassign technician';
      const action = AssignmentActions.unassignTechnicianFailure({ error });

      expect(action.type).toBe('[Assignment] Unassign Technician Failure');
      expect(action.error).toBe(error);
    });
  });

  describe('Reassign Job Actions', () => {
    it('should create reassignJob action', () => {
      const jobId = 'job-1';
      const fromTechnicianId = 'tech-1';
      const toTechnicianId = 'tech-2';
      const action = AssignmentActions.reassignJob({ jobId, fromTechnicianId, toTechnicianId });

      expect(action.type).toBe('[Assignment] Reassign Job');
      expect(action.jobId).toBe(jobId);
      expect(action.fromTechnicianId).toBe(fromTechnicianId);
      expect(action.toTechnicianId).toBe(toTechnicianId);
    });

    it('should create reassignJobSuccess action', () => {
      const oldAssignmentId = 'assignment-1';
      const newAssignment = { ...mockAssignment, id: 'assignment-2' };
      const action = AssignmentActions.reassignJobSuccess({ oldAssignmentId, newAssignment });

      expect(action.type).toBe('[Assignment] Reassign Job Success');
      expect(action.oldAssignmentId).toBe(oldAssignmentId);
      expect(action.newAssignment).toEqual(newAssignment);
    });

    it('should create reassignJobFailure action', () => {
      const error = 'Failed to reassign job';
      const action = AssignmentActions.reassignJobFailure({ error });

      expect(action.type).toBe('[Assignment] Reassign Job Failure');
      expect(action.error).toBe(error);
    });
  });

  describe('Conflict Actions', () => {
    it('should create loadConflicts action', () => {
      const technicianId = 'tech-1';
      const dateRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };
      const action = AssignmentActions.loadConflicts({ technicianId, dateRange });

      expect(action.type).toBe('[Assignment] Load Conflicts');
      expect(action.technicianId).toBe(technicianId);
      expect(action.dateRange).toEqual(dateRange);
    });

    it('should create loadConflicts action without parameters', () => {
      const action = AssignmentActions.loadConflicts({});

      expect(action.type).toBe('[Assignment] Load Conflicts');
      expect(action.technicianId).toBeUndefined();
      expect(action.dateRange).toBeUndefined();
    });

    it('should create loadConflictsSuccess action', () => {
      const conflicts = [mockConflict];
      const action = AssignmentActions.loadConflictsSuccess({ conflicts });

      expect(action.type).toBe('[Assignment] Load Conflicts Success');
      expect(action.conflicts).toEqual(conflicts);
    });

    it('should create loadConflictsFailure action', () => {
      const error = 'Failed to load conflicts';
      const action = AssignmentActions.loadConflictsFailure({ error });

      expect(action.type).toBe('[Assignment] Load Conflicts Failure');
      expect(action.error).toBe(error);
    });

    it('should create checkConflicts action', () => {
      const technicianId = 'tech-1';
      const jobId = 'job-1';
      const action = AssignmentActions.checkConflicts({ technicianId, jobId });

      expect(action.type).toBe('[Assignment] Check Conflicts');
      expect(action.technicianId).toBe(technicianId);
      expect(action.jobId).toBe(jobId);
    });

    it('should create checkConflictsSuccess action', () => {
      const conflicts = [mockConflict];
      const action = AssignmentActions.checkConflictsSuccess({ conflicts });

      expect(action.type).toBe('[Assignment] Check Conflicts Success');
      expect(action.conflicts).toEqual(conflicts);
    });

    it('should create checkConflictsFailure action', () => {
      const error = 'Failed to check conflicts';
      const action = AssignmentActions.checkConflictsFailure({ error });

      expect(action.type).toBe('[Assignment] Check Conflicts Failure');
      expect(action.error).toBe(error);
    });

    it('should create clearConflicts action', () => {
      const action = AssignmentActions.clearConflicts();

      expect(action.type).toBe('[Assignment] Clear Conflicts');
    });
  });

  describe('Qualified Technicians Actions', () => {
    it('should create loadQualifiedTechnicians action', () => {
      const jobId = 'job-1';
      const action = AssignmentActions.loadQualifiedTechnicians({ jobId });

      expect(action.type).toBe('[Assignment] Load Qualified Technicians');
      expect(action.jobId).toBe(jobId);
    });

    it('should create loadQualifiedTechniciansSuccess action', () => {
      const technicians = [mockTechnicianMatch];
      const action = AssignmentActions.loadQualifiedTechniciansSuccess({ technicians });

      expect(action.type).toBe('[Assignment] Load Qualified Technicians Success');
      expect(action.technicians).toEqual(technicians);
    });

    it('should create loadQualifiedTechniciansFailure action', () => {
      const error = 'Failed to load qualified technicians';
      const action = AssignmentActions.loadQualifiedTechniciansFailure({ error });

      expect(action.type).toBe('[Assignment] Load Qualified Technicians Failure');
      expect(action.error).toBe(error);
    });

    it('should create clearQualifiedTechnicians action', () => {
      const action = AssignmentActions.clearQualifiedTechnicians();

      expect(action.type).toBe('[Assignment] Clear Qualified Technicians');
    });
  });

  describe('Selection and Filter Actions', () => {
    it('should create selectAssignment action', () => {
      const id = 'assignment-1';
      const action = AssignmentActions.selectAssignment({ id });

      expect(action.type).toBe('[Assignment] Select Assignment');
      expect(action.id).toBe(id);
    });

    it('should create selectAssignment action with null', () => {
      const action = AssignmentActions.selectAssignment({ id: null });

      expect(action.type).toBe('[Assignment] Select Assignment');
      expect(action.id).toBeNull();
    });

    it('should create setAssignmentFilters action', () => {
      const filters: AssignmentFilters = {
        technicianId: 'tech-1',
        jobId: 'job-1'
      };
      const action = AssignmentActions.setAssignmentFilters({ filters });

      expect(action.type).toBe('[Assignment] Set Filters');
      expect(action.filters).toEqual(filters);
    });

    it('should create clearAssignmentFilters action', () => {
      const action = AssignmentActions.clearAssignmentFilters();

      expect(action.type).toBe('[Assignment] Clear Filters');
    });
  });
});
