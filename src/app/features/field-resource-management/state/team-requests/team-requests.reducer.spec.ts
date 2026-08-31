/**
 * Unit Tests for Team Requests Reducer
 *
 * Tests initial state, load/success/failure transitions, entity normalization,
 * error storage, and clearTeamData action.
 *
 * Test runner: Karma/Jasmine
 * Requirements: 7.4, 7.5, 7.6
 */

import {
  teamRequestsReducer,
  initialState,
  TeamRequestsState,
  teamPtoAdapter,
  teamOvertimeAdapter
} from './team-requests.reducer';
import * as TeamRequestsActions from './team-requests.actions';
import { PtoRequest, RequestStatus } from '../../models/pto.models';
import { OvertimeRequest, OvertimeRequestStatus, SupportedMarket } from '../../models/overtime.models';

// ─── Test Data Helpers ──────────────────────────────────────────────────────────

function createMockPtoRequest(overrides: Partial<PtoRequest> = {}): PtoRequest {
  return {
    id: 'pto-1',
    employeeId: 'emp-1',
    employeeName: 'John Doe',
    managerId: 'mgr-1',
    managerName: 'Jane Manager',
    startDate: '2024-06-01T00:00:00.000Z',
    endDate: '2024-06-05T00:00:00.000Z',
    requestType: 'Vacation',
    reason: 'Family trip',
    status: RequestStatus.Pending_Manager_Approval,
    createdAt: '2024-05-20T00:00:00.000Z',
    updatedAt: '2024-05-20T00:00:00.000Z',
    market: 'Engineering',
    ...overrides
  } as PtoRequest;
}

function createMockOvertimeRequest(overrides: Partial<OvertimeRequest> = {}): OvertimeRequest {
  return {
    id: 'ot-1',
    employeeId: 'emp-1',
    employeeFullName: 'John Doe',
    department: 'Engineering',
    market: SupportedMarket.Utah,
    emailedSriLead: true,
    sriLeadName: 'Lead Name',
    approvalStatus: OvertimeRequestStatus.Pending_Manager_Approval,
    submissionDate: '2024-06-01T00:00:00.000Z',
    overtimeStartDate: '2024-06-02T00:00:00.000Z',
    estimatedHours: 4,
    estimatedMinutes: 30,
    estimatedDuration: { hours: 4, minutes: 30 },
    justification: 'Project deadline',
    managerId: 'mgr-1',
    managerName: 'Jane Manager',
    approvalHistory: [],
    createdAt: '2024-05-20T00:00:00.000Z',
    updatedAt: '2024-05-20T00:00:00.000Z',
    ...overrides
  } as OvertimeRequest;
}

// ─── Tests ──────────────────────────────────────────────────────────────────────

describe('Team Requests Reducer', () => {

  // Test 1: Should return initial state when unknown action
  describe('unknown action', () => {
    it('should return the initial state', () => {
      const action = { type: 'UNKNOWN_ACTION' } as any;
      const state = teamRequestsReducer(initialState, action);

      expect(state).toBe(initialState);
    });
  });

  // Test 2: loadTeamPtoRequests should set teamPto.loading=true, teamPto.error=null
  describe('loadTeamPtoRequests', () => {
    it('should set teamPto.loading=true and teamPto.error=null', () => {
      const action = TeamRequestsActions.loadTeamPtoRequests({ managerId: 'mgr-1' });
      const state = teamRequestsReducer(initialState, action);

      expect(state.teamPto.loading).toBe(true);
      expect(state.teamPto.error).toBeNull();
    });

    it('should clear any previous error when starting a new load', () => {
      // Set up state with an existing error
      const failureAction = TeamRequestsActions.loadTeamPtoRequestsFailure({ error: 'Previous error' });
      const stateWithError = teamRequestsReducer(initialState, failureAction);
      expect(stateWithError.teamPto.error).toBe('Previous error');

      // Dispatch load action
      const loadAction = TeamRequestsActions.loadTeamPtoRequests({ managerId: 'mgr-1' });
      const state = teamRequestsReducer(stateWithError, loadAction);

      expect(state.teamPto.loading).toBe(true);
      expect(state.teamPto.error).toBeNull();
    });
  });

  // Test 3: loadTeamPtoRequestsSuccess should set entities, loading=false, error=null
  describe('loadTeamPtoRequestsSuccess', () => {
    it('should set entities, loading=false, and error=null', () => {
      const requests: PtoRequest[] = [
        createMockPtoRequest({ id: 'pto-1', employeeId: 'emp-1' }),
        createMockPtoRequest({ id: 'pto-2', employeeId: 'emp-2' }),
        createMockPtoRequest({ id: 'pto-3', employeeId: 'emp-3' })
      ];

      // Start from loading state
      const loadingState = teamRequestsReducer(
        initialState,
        TeamRequestsActions.loadTeamPtoRequests({ managerId: 'mgr-1' })
      );

      const action = TeamRequestsActions.loadTeamPtoRequestsSuccess({ requests });
      const state = teamRequestsReducer(loadingState, action);

      expect(state.teamPto.loading).toBe(false);
      expect(state.teamPto.error).toBeNull();
      expect(state.teamPto.ids.length).toBe(3);
      expect(state.teamPto.entities['pto-1']).toBeDefined();
      expect(state.teamPto.entities['pto-2']).toBeDefined();
      expect(state.teamPto.entities['pto-3']).toBeDefined();
    });

    it('should normalize entities by id (Requirement 7.4)', () => {
      const requests: PtoRequest[] = [
        createMockPtoRequest({ id: 'pto-a', employeeName: 'Alice' }),
        createMockPtoRequest({ id: 'pto-b', employeeName: 'Bob' })
      ];

      const action = TeamRequestsActions.loadTeamPtoRequestsSuccess({ requests });
      const state = teamRequestsReducer(initialState, action);

      // Verify entities are accessible by ID
      expect(state.teamPto.entities['pto-a']!.employeeName).toBe('Alice');
      expect(state.teamPto.entities['pto-b']!.employeeName).toBe('Bob');
    });

    it('should handle empty request array', () => {
      const action = TeamRequestsActions.loadTeamPtoRequestsSuccess({ requests: [] });
      const state = teamRequestsReducer(initialState, action);

      expect(state.teamPto.loading).toBe(false);
      expect(state.teamPto.error).toBeNull();
      expect(state.teamPto.ids.length).toBe(0);
    });
  });

  // Test 4: loadTeamPtoRequestsFailure should set error, loading=false, preserve entities
  describe('loadTeamPtoRequestsFailure', () => {
    it('should set error string, loading=false, and preserve existing entities', () => {
      // First load some entities
      const requests: PtoRequest[] = [
        createMockPtoRequest({ id: 'pto-1' }),
        createMockPtoRequest({ id: 'pto-2' })
      ];
      let state = teamRequestsReducer(
        initialState,
        TeamRequestsActions.loadTeamPtoRequestsSuccess({ requests })
      );

      // Start a new load
      state = teamRequestsReducer(
        state,
        TeamRequestsActions.loadTeamPtoRequests({ managerId: 'mgr-1' })
      );

      // Fail it
      const errorMessage = 'Network timeout after 10 seconds';
      state = teamRequestsReducer(
        state,
        TeamRequestsActions.loadTeamPtoRequestsFailure({ error: errorMessage })
      );

      expect(state.teamPto.loading).toBe(false);
      expect(state.teamPto.error).toBe(errorMessage);
      // Entities are preserved
      expect(state.teamPto.ids.length).toBe(2);
      expect(state.teamPto.entities['pto-1']).toBeDefined();
      expect(state.teamPto.entities['pto-2']).toBeDefined();
    });

    it('should store the exact error string from the payload (Requirement 7.6)', () => {
      const errorMessage = 'Failed to load team PTO requests';
      const action = TeamRequestsActions.loadTeamPtoRequestsFailure({ error: errorMessage });
      const state = teamRequestsReducer(initialState, action);

      expect(state.teamPto.error).toBe(errorMessage);
    });
  });

  // Test 5: loadTeamOvertimeRequests should set teamOvertime.loading=true, error=null
  describe('loadTeamOvertimeRequests', () => {
    it('should set teamOvertime.loading=true and teamOvertime.error=null', () => {
      const action = TeamRequestsActions.loadTeamOvertimeRequests({ managerId: 'mgr-1' });
      const state = teamRequestsReducer(initialState, action);

      expect(state.teamOvertime.loading).toBe(true);
      expect(state.teamOvertime.error).toBeNull();
    });

    it('should clear any previous error when starting a new load', () => {
      const failureAction = TeamRequestsActions.loadTeamOvertimeRequestsFailure({ error: 'Old error' });
      const stateWithError = teamRequestsReducer(initialState, failureAction);

      const loadAction = TeamRequestsActions.loadTeamOvertimeRequests({ managerId: 'mgr-1' });
      const state = teamRequestsReducer(stateWithError, loadAction);

      expect(state.teamOvertime.loading).toBe(true);
      expect(state.teamOvertime.error).toBeNull();
    });
  });

  // Test 6: loadTeamOvertimeRequestsSuccess should normalize entities, loading=false
  describe('loadTeamOvertimeRequestsSuccess', () => {
    it('should normalize entities using id as entity identifier, set loading=false (Requirement 7.5)', () => {
      const requests: OvertimeRequest[] = [
        createMockOvertimeRequest({ id: 'ot-1', employeeFullName: 'Alice', department: 'Engineering' }),
        createMockOvertimeRequest({ id: 'ot-2', employeeFullName: 'Bob', department: 'Operations' }),
        createMockOvertimeRequest({ id: 'ot-3', employeeFullName: 'Charlie', department: 'Sales' })
      ];

      const loadingState = teamRequestsReducer(
        initialState,
        TeamRequestsActions.loadTeamOvertimeRequests({ managerId: 'mgr-1' })
      );

      const action = TeamRequestsActions.loadTeamOvertimeRequestsSuccess({ requests });
      const state = teamRequestsReducer(loadingState, action);

      expect(state.teamOvertime.loading).toBe(false);
      expect(state.teamOvertime.error).toBeNull();
      expect(state.teamOvertime.ids.length).toBe(3);
      expect(state.teamOvertime.entities['ot-1']!.employeeFullName).toBe('Alice');
      expect(state.teamOvertime.entities['ot-2']!.employeeFullName).toBe('Bob');
      expect(state.teamOvertime.entities['ot-3']!.employeeFullName).toBe('Charlie');
    });

    it('should handle empty request array', () => {
      const action = TeamRequestsActions.loadTeamOvertimeRequestsSuccess({ requests: [] });
      const state = teamRequestsReducer(initialState, action);

      expect(state.teamOvertime.loading).toBe(false);
      expect(state.teamOvertime.error).toBeNull();
      expect(state.teamOvertime.ids.length).toBe(0);
    });
  });

  // Test 7: loadTeamOvertimeRequestsFailure should set error, loading=false
  describe('loadTeamOvertimeRequestsFailure', () => {
    it('should set error string and loading=false', () => {
      const errorMessage = 'HTTP 500: Internal Server Error';
      const loadingState = teamRequestsReducer(
        initialState,
        TeamRequestsActions.loadTeamOvertimeRequests({ managerId: 'mgr-1' })
      );

      const action = TeamRequestsActions.loadTeamOvertimeRequestsFailure({ error: errorMessage });
      const state = teamRequestsReducer(loadingState, action);

      expect(state.teamOvertime.loading).toBe(false);
      expect(state.teamOvertime.error).toBe(errorMessage);
    });

    it('should preserve existing overtime entities on failure', () => {
      const requests: OvertimeRequest[] = [
        createMockOvertimeRequest({ id: 'ot-1' }),
        createMockOvertimeRequest({ id: 'ot-2' })
      ];

      let state = teamRequestsReducer(
        initialState,
        TeamRequestsActions.loadTeamOvertimeRequestsSuccess({ requests })
      );

      state = teamRequestsReducer(
        state,
        TeamRequestsActions.loadTeamOvertimeRequests({ managerId: 'mgr-1' })
      );

      state = teamRequestsReducer(
        state,
        TeamRequestsActions.loadTeamOvertimeRequestsFailure({ error: 'Some error' })
      );

      expect(state.teamOvertime.ids.length).toBe(2);
      expect(state.teamOvertime.entities['ot-1']).toBeDefined();
      expect(state.teamOvertime.entities['ot-2']).toBeDefined();
    });
  });

  // Test 8: loadDirectReports should set directReportsLoading=true
  describe('loadDirectReports', () => {
    it('should set directReportsLoading=true and directReportsError=null', () => {
      const action = TeamRequestsActions.loadDirectReports({ managerId: 'mgr-1' });
      const state = teamRequestsReducer(initialState, action);

      expect(state.directReportsLoading).toBe(true);
      expect(state.directReportsError).toBeNull();
    });

    it('should clear previous directReportsError when starting a new load', () => {
      const failState = teamRequestsReducer(
        initialState,
        TeamRequestsActions.loadDirectReportsFailure({ error: 'Previous error' })
      );

      const state = teamRequestsReducer(
        failState,
        TeamRequestsActions.loadDirectReports({ managerId: 'mgr-1' })
      );

      expect(state.directReportsLoading).toBe(true);
      expect(state.directReportsError).toBeNull();
    });
  });

  // Test 9: loadDirectReportsSuccess should set directReports array
  describe('loadDirectReportsSuccess', () => {
    it('should set directReports array and directReportsLoading=false', () => {
      const directReports = [
        { id: 'emp-1', name: 'Alice Smith', department: 'Engineering' },
        { id: 'emp-2', name: 'Bob Jones', department: 'Operations' },
        { id: 'emp-3', name: 'Charlie Brown', department: 'Sales' }
      ];

      const loadingState = teamRequestsReducer(
        initialState,
        TeamRequestsActions.loadDirectReports({ managerId: 'mgr-1' })
      );

      const action = TeamRequestsActions.loadDirectReportsSuccess({ directReports });
      const state = teamRequestsReducer(loadingState, action);

      expect(state.directReports).toEqual(directReports);
      expect(state.directReportsLoading).toBe(false);
      expect(state.directReportsError).toBeNull();
    });

    it('should handle empty direct reports array', () => {
      const action = TeamRequestsActions.loadDirectReportsSuccess({ directReports: [] });
      const state = teamRequestsReducer(initialState, action);

      expect(state.directReports).toEqual([]);
      expect(state.directReportsLoading).toBe(false);
      expect(state.directReportsError).toBeNull();
    });
  });

  // Test 10: loadDirectReportsFailure should set directReportsError
  describe('loadDirectReportsFailure', () => {
    it('should set directReportsError and directReportsLoading=false', () => {
      const errorMessage = 'Hierarchy API timeout after 10 seconds';

      const loadingState = teamRequestsReducer(
        initialState,
        TeamRequestsActions.loadDirectReports({ managerId: 'mgr-1' })
      );

      const action = TeamRequestsActions.loadDirectReportsFailure({ error: errorMessage });
      const state = teamRequestsReducer(loadingState, action);

      expect(state.directReportsError).toBe(errorMessage);
      expect(state.directReportsLoading).toBe(false);
    });

    it('should store the exact error string from the payload', () => {
      const errorMessage = 'Unable to load team. Showing your requests.';
      const action = TeamRequestsActions.loadDirectReportsFailure({ error: errorMessage });
      const state = teamRequestsReducer(initialState, action);

      expect(state.directReportsError).toBe(errorMessage);
    });
  });

  // Test 11: clearTeamData should reset state to initialState
  describe('clearTeamData', () => {
    it('should reset the entire state to initialState', () => {
      // Build up a complex state with data in all slices
      let state: TeamRequestsState = teamRequestsReducer(
        initialState,
        TeamRequestsActions.loadTeamPtoRequestsSuccess({
          requests: [
            createMockPtoRequest({ id: 'pto-1' }),
            createMockPtoRequest({ id: 'pto-2' })
          ]
        })
      );

      state = teamRequestsReducer(
        state,
        TeamRequestsActions.loadTeamOvertimeRequestsSuccess({
          requests: [
            createMockOvertimeRequest({ id: 'ot-1' }),
            createMockOvertimeRequest({ id: 'ot-2' }),
            createMockOvertimeRequest({ id: 'ot-3' })
          ]
        })
      );

      state = teamRequestsReducer(
        state,
        TeamRequestsActions.loadDirectReportsSuccess({
          directReports: [
            { id: 'emp-1', name: 'Alice', department: 'Engineering' },
            { id: 'emp-2', name: 'Bob', department: 'Sales' }
          ]
        })
      );

      // Verify state has data
      expect(state.teamPto.ids.length).toBe(2);
      expect(state.teamOvertime.ids.length).toBe(3);
      expect(state.directReports.length).toBe(2);

      // Clear all team data
      const clearedState = teamRequestsReducer(state, TeamRequestsActions.clearTeamData());

      // Verify everything is reset
      expect(clearedState.teamPto.ids.length).toBe(0);
      expect(Object.keys(clearedState.teamPto.entities).length).toBe(0);
      expect(clearedState.teamPto.loading).toBe(false);
      expect(clearedState.teamPto.error).toBeNull();

      expect(clearedState.teamOvertime.ids.length).toBe(0);
      expect(Object.keys(clearedState.teamOvertime.entities).length).toBe(0);
      expect(clearedState.teamOvertime.loading).toBe(false);
      expect(clearedState.teamOvertime.error).toBeNull();

      expect(clearedState.directReports.length).toBe(0);
      expect(clearedState.directReportsLoading).toBe(false);
      expect(clearedState.directReportsError).toBeNull();
    });

    it('should reset state even when loading is in progress', () => {
      let state = teamRequestsReducer(
        initialState,
        TeamRequestsActions.loadTeamPtoRequests({ managerId: 'mgr-1' })
      );
      expect(state.teamPto.loading).toBe(true);

      const clearedState = teamRequestsReducer(state, TeamRequestsActions.clearTeamData());

      expect(clearedState.teamPto.loading).toBe(false);
      expect(clearedState.teamPto.error).toBeNull();
    });

    it('should reset state even when error is set', () => {
      let state = teamRequestsReducer(
        initialState,
        TeamRequestsActions.loadTeamPtoRequestsFailure({ error: 'Some error' })
      );
      expect(state.teamPto.error).toBe('Some error');

      const clearedState = teamRequestsReducer(state, TeamRequestsActions.clearTeamData());

      expect(clearedState.teamPto.error).toBeNull();
    });
  });

  // Additional cross-concern tests
  describe('state isolation between PTO and Overtime', () => {
    it('loadTeamPtoRequests should not affect teamOvertime state', () => {
      const action = TeamRequestsActions.loadTeamPtoRequests({ managerId: 'mgr-1' });
      const state = teamRequestsReducer(initialState, action);

      expect(state.teamPto.loading).toBe(true);
      expect(state.teamOvertime.loading).toBe(false);
      expect(state.teamOvertime.error).toBeNull();
    });

    it('loadTeamOvertimeRequests should not affect teamPto state', () => {
      const action = TeamRequestsActions.loadTeamOvertimeRequests({ managerId: 'mgr-1' });
      const state = teamRequestsReducer(initialState, action);

      expect(state.teamOvertime.loading).toBe(true);
      expect(state.teamPto.loading).toBe(false);
      expect(state.teamPto.error).toBeNull();
    });

    it('PTO failure should not affect overtime entities', () => {
      // Load some overtime data
      let state = teamRequestsReducer(
        initialState,
        TeamRequestsActions.loadTeamOvertimeRequestsSuccess({
          requests: [createMockOvertimeRequest({ id: 'ot-1' })]
        })
      );

      // Fail a PTO load
      state = teamRequestsReducer(
        state,
        TeamRequestsActions.loadTeamPtoRequestsFailure({ error: 'PTO load failed' })
      );

      // Overtime data should remain
      expect(state.teamOvertime.ids.length).toBe(1);
      expect(state.teamOvertime.entities['ot-1']).toBeDefined();
      expect(state.teamOvertime.loading).toBe(false);
      expect(state.teamOvertime.error).toBeNull();
    });
  });
});
