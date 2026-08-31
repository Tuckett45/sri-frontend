/**
 * Unit Tests for Team Requests Selectors
 *
 * Tests the memoized selectors for team PTO and overtime request state.
 * Uses the .projector() method (NgRx pattern) for isolated selector testing.
 *
 * Requirements: 7.7, 5.4, 5.5
 */

import {
  selectAllTeamPtoRequests,
  selectAllTeamOvertimeRequests,
  selectTeamPtoByDepartment,
  selectTeamOvertimeByDepartment,
  selectTeamPtoDepartments,
  selectTeamOvertimeDepartments,
  selectTeamPtoLoading,
  selectDirectReportsError
} from './team-requests.selectors';
import {
  TeamRequestsState,
  initialState,
  teamRequestsReducer,
  teamPtoAdapter,
  teamOvertimeAdapter
} from './team-requests.reducer';
import * as TeamRequestsActions from './team-requests.actions';
import { PtoRequest, RequestStatus } from '../../models/pto.models';
import { OvertimeRequest, OvertimeRequestStatus, SupportedMarket } from '../../models/overtime.models';

// ─── Test Data Factories ────────────────────────────────────────────────────────

function createPtoRequest(overrides: Partial<PtoRequest> = {}): PtoRequest {
  return {
    id: 'pto-1',
    employeeId: 'emp-1',
    employeeName: 'John Doe',
    managerId: 'mgr-1',
    managerName: 'Jane Manager',
    startDate: '2024-03-15T00:00:00.000Z',
    endDate: '2024-03-18T00:00:00.000Z',
    requestType: 'Vacation',
    reason: null,
    status: RequestStatus.Approved,
    createdAt: '2024-03-01T00:00:00.000Z',
    updatedAt: '2024-03-01T00:00:00.000Z',
    market: 'Engineering',
    ...overrides
  };
}

function createOvertimeRequest(overrides: Partial<OvertimeRequest> = {}): OvertimeRequest {
  return {
    id: 'ot-1',
    employeeId: 'emp-1',
    employeeFullName: 'John Doe',
    department: 'Construction',
    market: SupportedMarket.Utah,
    emailedSriLead: true,
    sriLeadName: 'Lead Person',
    approvalStatus: OvertimeRequestStatus.Approved,
    submissionDate: '2024-03-01T00:00:00.000Z',
    overtimeStartDate: '2024-03-15T00:00:00.000Z',
    estimatedHours: 4,
    estimatedMinutes: 30,
    estimatedDuration: { hours: 4, minutes: 30 },
    justification: 'Project deadline',
    managerId: 'mgr-1',
    managerName: 'Jane Manager',
    approvalHistory: [],
    createdAt: '2024-03-01T00:00:00.000Z',
    updatedAt: '2024-03-01T00:00:00.000Z',
    ...overrides
  } as OvertimeRequest;
}

// ─── Helper: Build state via reducer ────────────────────────────────────────────

function buildStateWithPto(requests: PtoRequest[]): TeamRequestsState {
  return teamRequestsReducer(
    initialState,
    TeamRequestsActions.loadTeamPtoRequestsSuccess({ requests })
  );
}

function buildStateWithOvertime(requests: OvertimeRequest[]): TeamRequestsState {
  return teamRequestsReducer(
    initialState,
    TeamRequestsActions.loadTeamOvertimeRequestsSuccess({ requests })
  );
}

// ─── Tests ──────────────────────────────────────────────────────────────────────

describe('Team Requests Selectors — Unit Tests', () => {

  // ── Test 1: selectAllTeamPtoRequests returns all PTO entities sorted by startDate desc ──

  describe('selectAllTeamPtoRequests', () => {
    it('should return all PTO entities sorted by startDate descending', () => {
      const requests: PtoRequest[] = [
        createPtoRequest({ id: 'pto-1', startDate: '2024-01-10T00:00:00.000Z' }),
        createPtoRequest({ id: 'pto-2', startDate: '2024-03-20T00:00:00.000Z' }),
        createPtoRequest({ id: 'pto-3', startDate: '2024-02-15T00:00:00.000Z' })
      ];

      const state = buildStateWithPto(requests);
      const result = selectAllTeamPtoRequests.projector(state);

      expect(result.length).toBe(3);
      // Adapter sorts by startDate descending
      expect(result[0].id).toBe('pto-2'); // March 20
      expect(result[1].id).toBe('pto-3'); // Feb 15
      expect(result[2].id).toBe('pto-1'); // Jan 10
    });

    it('should return an empty array when no PTO requests are loaded', () => {
      const result = selectAllTeamPtoRequests.projector(initialState);
      expect(result).toEqual([]);
    });
  });

  // ── Test 2: selectAllTeamOvertimeRequests returns all overtime entities sorted by overtimeStartDate desc ──

  describe('selectAllTeamOvertimeRequests', () => {
    it('should return all overtime entities sorted by overtimeStartDate descending', () => {
      const requests: OvertimeRequest[] = [
        createOvertimeRequest({ id: 'ot-1', overtimeStartDate: '2024-01-05T00:00:00.000Z' }),
        createOvertimeRequest({ id: 'ot-2', overtimeStartDate: '2024-04-10T00:00:00.000Z' }),
        createOvertimeRequest({ id: 'ot-3', overtimeStartDate: '2024-02-20T00:00:00.000Z' })
      ];

      const state = buildStateWithOvertime(requests);
      const result = selectAllTeamOvertimeRequests.projector(state);

      expect(result.length).toBe(3);
      // Adapter sorts by overtimeStartDate descending
      expect(result[0].id).toBe('ot-2'); // April 10
      expect(result[1].id).toBe('ot-3'); // Feb 20
      expect(result[2].id).toBe('ot-1'); // Jan 5
    });

    it('should return an empty array when no overtime requests are loaded', () => {
      const result = selectAllTeamOvertimeRequests.projector(initialState);
      expect(result).toEqual([]);
    });
  });

  // ── Test 3: selectTeamPtoByDepartment('All Departments') returns all entries ──

  describe('selectTeamPtoByDepartment', () => {
    const ptoRequests: PtoRequest[] = [
      createPtoRequest({ id: 'pto-1', market: 'Engineering' }),
      createPtoRequest({ id: 'pto-2', market: 'Construction' }),
      createPtoRequest({ id: 'pto-3', market: 'Engineering' }),
      createPtoRequest({ id: 'pto-4', market: 'Sales' })
    ];

    it('should return all entries when department is "All Departments"', () => {
      const result = selectTeamPtoByDepartment('All Departments').projector(ptoRequests);

      expect(result.length).toBe(4);
      expect(result).toEqual(ptoRequests);
    });

    // ── Test 4: selectTeamPtoByDepartment('Engineering') returns only matching market entries ──

    it('should return only entries matching the specified market/department', () => {
      const result = selectTeamPtoByDepartment('Engineering').projector(ptoRequests);

      expect(result.length).toBe(2);
      expect(result.every(r => r.market === 'Engineering')).toBe(true);
      expect(result.map(r => r.id)).toEqual(['pto-1', 'pto-3']);
    });

    // ── Test 5: selectTeamPtoByDepartment with non-existent dept returns empty array ──

    it('should return an empty array when no entries match the department', () => {
      const result = selectTeamPtoByDepartment('NonExistentDepartment').projector(ptoRequests);

      expect(result.length).toBe(0);
      expect(result).toEqual([]);
    });
  });

  // ── Test 6: selectTeamOvertimeByDepartment('Construction') returns only matching department entries ──

  describe('selectTeamOvertimeByDepartment', () => {
    const overtimeRequests: OvertimeRequest[] = [
      createOvertimeRequest({ id: 'ot-1', department: 'Construction' }),
      createOvertimeRequest({ id: 'ot-2', department: 'Engineering' }),
      createOvertimeRequest({ id: 'ot-3', department: 'Construction' }),
      createOvertimeRequest({ id: 'ot-4', department: 'Sales' })
    ];

    it('should return only entries matching the specified department', () => {
      const result = selectTeamOvertimeByDepartment('Construction').projector(overtimeRequests);

      expect(result.length).toBe(2);
      expect(result.every(r => r.department === 'Construction')).toBe(true);
      expect(result.map(r => r.id)).toEqual(['ot-1', 'ot-3']);
    });

    it('should return all entries when department is "All Departments"', () => {
      const result = selectTeamOvertimeByDepartment('All Departments').projector(overtimeRequests);

      expect(result.length).toBe(4);
      expect(result).toEqual(overtimeRequests);
    });

    it('should return an empty array when no entries match the department', () => {
      const result = selectTeamOvertimeByDepartment('HR').projector(overtimeRequests);

      expect(result.length).toBe(0);
      expect(result).toEqual([]);
    });
  });

  // ── Test 7: selectTeamPtoDepartments returns sorted unique non-empty market values ──

  describe('selectTeamPtoDepartments', () => {
    it('should return sorted unique non-empty market values', () => {
      const allRequests: PtoRequest[] = [
        createPtoRequest({ id: 'pto-1', market: 'Engineering' }),
        createPtoRequest({ id: 'pto-2', market: 'Construction' }),
        createPtoRequest({ id: 'pto-3', market: 'Engineering' }),  // duplicate
        createPtoRequest({ id: 'pto-4', market: 'Sales' }),
        createPtoRequest({ id: 'pto-5', market: null }),            // null should be excluded
        createPtoRequest({ id: 'pto-6', market: '' })               // empty string should be excluded
      ];

      const result = selectTeamPtoDepartments.projector(allRequests);

      expect(result).toEqual(['Construction', 'Engineering', 'Sales']);
    });

    it('should return an empty array when there are no requests', () => {
      const result = selectTeamPtoDepartments.projector([]);
      expect(result).toEqual([]);
    });

    it('should return an empty array when all market values are null or empty', () => {
      const allRequests: PtoRequest[] = [
        createPtoRequest({ id: 'pto-1', market: null }),
        createPtoRequest({ id: 'pto-2', market: '' }),
        createPtoRequest({ id: 'pto-3', market: undefined as any })
      ];

      const result = selectTeamPtoDepartments.projector(allRequests);
      expect(result).toEqual([]);
    });
  });

  // ── Test 8: selectTeamOvertimeDepartments returns sorted unique non-empty department values ──

  describe('selectTeamOvertimeDepartments', () => {
    it('should return sorted unique non-empty department values', () => {
      const allRequests: OvertimeRequest[] = [
        createOvertimeRequest({ id: 'ot-1', department: 'Warehouse' }),
        createOvertimeRequest({ id: 'ot-2', department: 'Construction' }),
        createOvertimeRequest({ id: 'ot-3', department: 'Construction' }),  // duplicate
        createOvertimeRequest({ id: 'ot-4', department: 'Engineering' }),
        createOvertimeRequest({ id: 'ot-5', department: '' })               // empty should be excluded
      ];

      const result = selectTeamOvertimeDepartments.projector(allRequests);

      expect(result).toEqual(['Construction', 'Engineering', 'Warehouse']);
    });

    it('should return an empty array when there are no requests', () => {
      const result = selectTeamOvertimeDepartments.projector([]);
      expect(result).toEqual([]);
    });
  });

  // ── Test 9: selectTeamPtoLoading returns the loading flag ──

  describe('selectTeamPtoLoading', () => {
    it('should return false when team PTO is not loading', () => {
      const result = selectTeamPtoLoading.projector(initialState);
      expect(result).toBe(false);
    });

    it('should return true when team PTO is loading', () => {
      const loadingState = teamRequestsReducer(
        initialState,
        TeamRequestsActions.loadTeamPtoRequests({ managerId: 'mgr-1' })
      );

      const result = selectTeamPtoLoading.projector(loadingState);
      expect(result).toBe(true);
    });

    it('should return false after team PTO load succeeds', () => {
      let state = teamRequestsReducer(
        initialState,
        TeamRequestsActions.loadTeamPtoRequests({ managerId: 'mgr-1' })
      );
      state = teamRequestsReducer(
        state,
        TeamRequestsActions.loadTeamPtoRequestsSuccess({ requests: [] })
      );

      const result = selectTeamPtoLoading.projector(state);
      expect(result).toBe(false);
    });

    it('should return false after team PTO load fails', () => {
      let state = teamRequestsReducer(
        initialState,
        TeamRequestsActions.loadTeamPtoRequests({ managerId: 'mgr-1' })
      );
      state = teamRequestsReducer(
        state,
        TeamRequestsActions.loadTeamPtoRequestsFailure({ error: 'Network error' })
      );

      const result = selectTeamPtoLoading.projector(state);
      expect(result).toBe(false);
    });
  });

  // ── Test 10: selectDirectReportsError returns the error string ──

  describe('selectDirectReportsError', () => {
    it('should return null when there is no error', () => {
      const result = selectDirectReportsError.projector(initialState);
      expect(result).toBeNull();
    });

    it('should return the error string after direct reports load fails', () => {
      const errorState = teamRequestsReducer(
        initialState,
        TeamRequestsActions.loadDirectReportsFailure({ error: 'Unable to load team' })
      );

      const result = selectDirectReportsError.projector(errorState);
      expect(result).toBe('Unable to load team');
    });

    it('should return null after direct reports load succeeds', () => {
      // First cause an error
      let state = teamRequestsReducer(
        initialState,
        TeamRequestsActions.loadDirectReportsFailure({ error: 'Some error' })
      );
      // Then succeed
      state = teamRequestsReducer(
        state,
        TeamRequestsActions.loadDirectReportsSuccess({ directReports: [] })
      );

      const result = selectDirectReportsError.projector(state);
      expect(result).toBeNull();
    });
  });
});
