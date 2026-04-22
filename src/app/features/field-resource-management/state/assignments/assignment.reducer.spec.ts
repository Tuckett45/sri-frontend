/**
 * Assignment Reducer Unit Tests
 * Tests all reducer state transitions for assignment management
 */

import { assignmentReducer, initialState, assignmentAdapter } from './assignment.reducer';
import * as AssignmentActions from './assignment.actions';
import { Assignment, Conflict, TechnicianMatch, ConflictSeverity, AssignmentStatus } from '../../models/assignment.model';
import { AssignmentState } from './assignment.state';

describe('Assignment Reducer', () => {
  const mockAssignment1: Assignment = {
    id: 'assignment-1',
    jobId: 'job-1',
    technicianId: 'tech-1',
    assignedBy: 'user-1',
    assignedAt: new Date('2024-01-15T10:00:00Z'),
    status: AssignmentStatus.Assigned,
    isActive: true
  };

  const mockAssignment2: Assignment = {
    id: 'assignment-2',
    jobId: 'job-2',
    technicianId: 'tech-2',
    assignedBy: 'user-1',
    assignedAt: new Date('2024-01-16T10:00:00Z'),
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

  describe('Initial State', () => {
    it('should return the initial state', () => {
      const action = { type: 'NOOP' } as any;
      const result = assignmentReducer(undefined, action);

      expect(result).toEqual(initialState);
      expect(result.ids).toEqual([]);
      expect(result.entities).toEqual({});
      expect(result.conflicts).toEqual([]);
      expect(result.qualifiedTechnicians).toEqual([]);
      expect(result.loading).toBe(false);
      expect(result.error).toBeNull();
    });

    it('should have correct initial state structure', () => {
      expect(initialState.loading).toBe(false);
      expect(initialState.error).toBeNull();
      expect(initialState.conflicts).toEqual([]);
      expect(initialState.qualifiedTechnicians).toEqual([]);
    });
  });

  describe('Load Assignments', () => {
    it('should set loading to true on loadAssignments', () => {
      const action = AssignmentActions.loadAssignments({});
      const result = assignmentReducer(initialState, action);

      expect(result.loading).toBe(true);
    });
  });
});