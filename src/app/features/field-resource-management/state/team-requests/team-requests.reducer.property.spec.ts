/**
 * Property-based tests for Team Requests Reducer
 *
 * Uses fast-check to verify universal correctness properties
 * of the team requests reducer state machine across randomly generated actions.
 *
 * Test runner: Karma/Jasmine
 * Feature: pto-overtime-visibility
 */

import * as fc from 'fast-check';
import {
  teamRequestsReducer,
  initialState,
  TeamRequestsState
} from './team-requests.reducer';
import * as TeamRequestsActions from './team-requests.actions';
import { PtoRequest, RequestStatus } from '../../models/pto.models';
import { OvertimeRequest, OvertimeRequestStatus, SupportedMarket } from '../../models/overtime.models';

// ─── Arbitraries ────────────────────────────────────────────────────────────────

/** Non-empty alphanumeric string for IDs (prefixed to avoid JS built-in property collisions) */
const arbId = fc.stringMatching(/^[a-zA-Z0-9_-]+$/).filter(s => s.length > 0 && s.length <= 20).map(s => `id_${s}`);

/** Arbitrary date string in ISO format */
const arbDateString = fc.integer({
  min: new Date('2020-01-01').getTime(),
  max: new Date('2030-12-31').getTime()
}).map(ts => new Date(ts).toISOString());

/** Arbitrary department name */
const arbDepartment = fc.constantFrom(
  'Construction', 'Engineering', 'Operations', 'Sales',
  'Customer Service', 'Warehouse', 'Administration', 'Finance', 'IT'
);

/** Arbitrary PTO request */
const arbPtoRequest: fc.Arbitrary<PtoRequest> = fc.record({
  id: arbId,
  employeeId: arbId,
  employeeName: fc.string({ minLength: 1, maxLength: 20 }),
  managerId: arbId,
  managerName: fc.string({ minLength: 1, maxLength: 20 }),
  startDate: arbDateString,
  endDate: arbDateString,
  requestType: fc.constantFrom('Vacation', 'Sick Leave', 'Personal Day'),
  reason: fc.option(fc.string({ maxLength: 50 }), { nil: null }),
  status: fc.constantFrom(
    RequestStatus.Pending_Manager_Approval,
    RequestStatus.Approved,
    RequestStatus.Rejected,
    RequestStatus.Cancelled
  ),
  createdAt: arbDateString,
  updatedAt: arbDateString,
  market: fc.option(arbDepartment, { nil: null })
}).map(r => r as PtoRequest);

/** Arbitrary overtime request */
const arbOvertimeRequest: fc.Arbitrary<OvertimeRequest> = fc.record({
  id: arbId,
  employeeId: arbId,
  employeeFullName: fc.string({ minLength: 1, maxLength: 20 }),
  department: arbDepartment,
  market: fc.constantFrom(SupportedMarket.Utah, SupportedMarket.Texas, SupportedMarket.Arizona),
  emailedSriLead: fc.boolean(),
  sriLeadName: fc.string({ minLength: 1, maxLength: 20 }),
  approvalStatus: fc.constantFrom(
    OvertimeRequestStatus.Pending_Manager_Approval,
    OvertimeRequestStatus.Approved,
    OvertimeRequestStatus.Rejected,
    OvertimeRequestStatus.Cancelled
  ),
  submissionDate: arbDateString,
  overtimeStartDate: arbDateString,
  estimatedHours: fc.integer({ min: 1, max: 12 }),
  estimatedMinutes: fc.integer({ min: 0, max: 59 }),
  estimatedDuration: fc.record({
    hours: fc.integer({ min: 1, max: 12 }),
    minutes: fc.integer({ min: 0, max: 59 })
  }),
  justification: fc.string({ minLength: 1, maxLength: 50 }),
  managerId: arbId,
  managerName: fc.string({ minLength: 1, maxLength: 20 }),
  approvalHistory: fc.constant([]),
  createdAt: arbDateString,
  updatedAt: arbDateString
}).map(r => r as unknown as OvertimeRequest);

/** Generate unique PTO requests (unique IDs) */
const arbUniquePtoRequests = fc.array(arbPtoRequest, { minLength: 0, maxLength: 15 })
  .map(requests => {
    const seen = new Set<string>();
    return requests.filter(r => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
  });

/** Generate unique overtime requests (unique IDs) */
const arbUniqueOvertimeRequests = fc.array(arbOvertimeRequest, { minLength: 0, maxLength: 15 })
  .map(requests => {
    const seen = new Set<string>();
    return requests.filter(r => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
  });

/** Arbitrary error message */
const arbErrorMessage = fc.string({ minLength: 1, maxLength: 100 });

// ─── Property Tests ─────────────────────────────────────────────────────────────

describe('Team Requests Reducer — Property-Based Tests', () => {

  // ── Property 9: Entity normalization preserves all team entries ──────────────
  // Feature: pto-overtime-visibility, Property 9: Entity normalization
  // **Validates: Requirements 7.4, 7.5**

  describe('Feature: pto-overtime-visibility, Property 9: Entity normalization preserves all team entries', () => {

    it('For any array of PTO requests dispatched via success, EntityState contains every request retrievable by ID', () => {
      fc.assert(
        fc.property(
          arbUniquePtoRequests,
          (requests) => {
            const state = teamRequestsReducer(
              initialState,
              TeamRequestsActions.loadTeamPtoRequestsSuccess({ requests })
            );

            // Every request should be in entities by ID
            expect(state.teamPto.ids.length).toBe(requests.length);
            for (const req of requests) {
              expect(state.teamPto.entities[req.id]).toBeDefined();
              expect(state.teamPto.entities[req.id]!.id).toBe(req.id);
              expect(state.teamPto.entities[req.id]!.employeeId).toBe(req.employeeId);
              expect(state.teamPto.entities[req.id]!.status).toBe(req.status);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('For any array of overtime requests dispatched via success, EntityState contains every request retrievable by ID', () => {
      fc.assert(
        fc.property(
          arbUniqueOvertimeRequests,
          (requests) => {
            const state = teamRequestsReducer(
              initialState,
              TeamRequestsActions.loadTeamOvertimeRequestsSuccess({ requests })
            );

            expect(state.teamOvertime.ids.length).toBe(requests.length);
            for (const req of requests) {
              expect(state.teamOvertime.entities[req.id]).toBeDefined();
              expect(state.teamOvertime.entities[req.id]!.id).toBe(req.id);
              expect(state.teamOvertime.entities[req.id]!.employeeId).toBe(req.employeeId);
              expect(state.teamOvertime.entities[req.id]!.approvalStatus).toBe(req.approvalStatus);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Subsequent success actions replace all previous entities', () => {
      fc.assert(
        fc.property(
          arbUniquePtoRequests,
          arbUniquePtoRequests,
          (firstBatch, secondBatch) => {
            // Load first batch
            let state = teamRequestsReducer(
              initialState,
              TeamRequestsActions.loadTeamPtoRequestsSuccess({ requests: firstBatch })
            );

            // Load second batch (should replace)
            state = teamRequestsReducer(
              state,
              TeamRequestsActions.loadTeamPtoRequestsSuccess({ requests: secondBatch })
            );

            // Only second batch should be in state
            expect(state.teamPto.ids.length).toBe(secondBatch.length);
            for (const req of secondBatch) {
              expect(state.teamPto.entities[req.id]).toBeDefined();
            }

            // First batch entries not in second batch should be gone
            for (const req of firstBatch) {
              if (!secondBatch.find(r => r.id === req.id)) {
                expect(state.teamPto.entities[req.id]).toBeUndefined();
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ── Property 10: Reducer loading/error state machine ────────────────────────
  // Feature: pto-overtime-visibility, Property 10: Reducer loading/error state machine
  // **Validates: Requirements 7.6, 1.4**

  describe('Feature: pto-overtime-visibility, Property 10: Reducer loading/error state machine', () => {

    it('After loadTeamPtoRequests: loading=true, error=null', () => {
      fc.assert(
        fc.property(
          arbId,
          (managerId) => {
            const state = teamRequestsReducer(
              initialState,
              TeamRequestsActions.loadTeamPtoRequests({ managerId })
            );

            expect(state.teamPto.loading).toBe(true);
            expect(state.teamPto.error).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('After loadTeamPtoRequestsSuccess: loading=false, error=null', () => {
      fc.assert(
        fc.property(
          arbId,
          arbUniquePtoRequests,
          (managerId, requests) => {
            // First put into loading state
            let state = teamRequestsReducer(
              initialState,
              TeamRequestsActions.loadTeamPtoRequests({ managerId })
            );

            // Then dispatch success
            state = teamRequestsReducer(
              state,
              TeamRequestsActions.loadTeamPtoRequestsSuccess({ requests })
            );

            expect(state.teamPto.loading).toBe(false);
            expect(state.teamPto.error).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('After loadTeamPtoRequestsFailure: loading=false, error set to payload string', () => {
      fc.assert(
        fc.property(
          arbId,
          arbErrorMessage,
          (managerId, errorMsg) => {
            // First put into loading state
            let state = teamRequestsReducer(
              initialState,
              TeamRequestsActions.loadTeamPtoRequests({ managerId })
            );

            // Then dispatch failure
            state = teamRequestsReducer(
              state,
              TeamRequestsActions.loadTeamPtoRequestsFailure({ error: errorMsg })
            );

            expect(state.teamPto.loading).toBe(false);
            expect(state.teamPto.error).toBe(errorMsg);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('After loadTeamOvertimeRequests: loading=true, error=null', () => {
      fc.assert(
        fc.property(
          arbId,
          (managerId) => {
            const state = teamRequestsReducer(
              initialState,
              TeamRequestsActions.loadTeamOvertimeRequests({ managerId })
            );

            expect(state.teamOvertime.loading).toBe(true);
            expect(state.teamOvertime.error).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('After loadTeamOvertimeRequestsSuccess: loading=false, error=null', () => {
      fc.assert(
        fc.property(
          arbId,
          arbUniqueOvertimeRequests,
          (managerId, requests) => {
            let state = teamRequestsReducer(
              initialState,
              TeamRequestsActions.loadTeamOvertimeRequests({ managerId })
            );

            state = teamRequestsReducer(
              state,
              TeamRequestsActions.loadTeamOvertimeRequestsSuccess({ requests })
            );

            expect(state.teamOvertime.loading).toBe(false);
            expect(state.teamOvertime.error).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('After loadTeamOvertimeRequestsFailure: loading=false, error set to payload string', () => {
      fc.assert(
        fc.property(
          arbId,
          arbErrorMessage,
          (managerId, errorMsg) => {
            let state = teamRequestsReducer(
              initialState,
              TeamRequestsActions.loadTeamOvertimeRequests({ managerId })
            );

            state = teamRequestsReducer(
              state,
              TeamRequestsActions.loadTeamOvertimeRequestsFailure({ error: errorMsg })
            );

            expect(state.teamOvertime.loading).toBe(false);
            expect(state.teamOvertime.error).toBe(errorMsg);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Existing entities are preserved on failure (PTO)', () => {
      fc.assert(
        fc.property(
          arbUniquePtoRequests,
          arbId,
          arbErrorMessage,
          (requests, managerId, errorMsg) => {
            // Load entities first
            let state = teamRequestsReducer(
              initialState,
              TeamRequestsActions.loadTeamPtoRequestsSuccess({ requests })
            );

            const entitiesBefore = { ...state.teamPto.entities };
            const idsBefore = [...state.teamPto.ids];

            // Then trigger a new load cycle that fails
            state = teamRequestsReducer(
              state,
              TeamRequestsActions.loadTeamPtoRequests({ managerId })
            );
            state = teamRequestsReducer(
              state,
              TeamRequestsActions.loadTeamPtoRequestsFailure({ error: errorMsg })
            );

            // Entities should be preserved
            expect(state.teamPto.ids.length).toBe(idsBefore.length);
            for (const id of idsBefore) {
              expect(state.teamPto.entities[id]).toEqual(entitiesBefore[id]);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Existing entities are preserved on failure (Overtime)', () => {
      fc.assert(
        fc.property(
          arbUniqueOvertimeRequests,
          arbId,
          arbErrorMessage,
          (requests, managerId, errorMsg) => {
            // Load entities first
            let state = teamRequestsReducer(
              initialState,
              TeamRequestsActions.loadTeamOvertimeRequestsSuccess({ requests })
            );

            const entitiesBefore = { ...state.teamOvertime.entities };
            const idsBefore = [...state.teamOvertime.ids];

            // Then trigger a new load cycle that fails
            state = teamRequestsReducer(
              state,
              TeamRequestsActions.loadTeamOvertimeRequests({ managerId })
            );
            state = teamRequestsReducer(
              state,
              TeamRequestsActions.loadTeamOvertimeRequestsFailure({ error: errorMsg })
            );

            // Entities should be preserved
            expect(state.teamOvertime.ids.length).toBe(idsBefore.length);
            for (const id of idsBefore) {
              expect(state.teamOvertime.entities[id]).toEqual(entitiesBefore[id]);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('clearTeamData resets all state to initial values', () => {
      fc.assert(
        fc.property(
          arbUniquePtoRequests,
          arbUniqueOvertimeRequests,
          arbId,
          (ptoRequests, otRequests, managerId) => {
            // Build up some state
            let state = teamRequestsReducer(
              initialState,
              TeamRequestsActions.loadTeamPtoRequestsSuccess({ requests: ptoRequests })
            );
            state = teamRequestsReducer(
              state,
              TeamRequestsActions.loadTeamOvertimeRequestsSuccess({ requests: otRequests })
            );
            state = teamRequestsReducer(
              state,
              TeamRequestsActions.loadDirectReportsSuccess({
                directReports: [{ id: 'dr1', name: 'Report 1', department: 'Engineering' }]
              })
            );

            // Clear
            state = teamRequestsReducer(state, TeamRequestsActions.clearTeamData());

            // Should be back to initial
            expect(state.teamPto.ids.length).toBe(0);
            expect(state.teamPto.loading).toBe(false);
            expect(state.teamPto.error).toBeNull();
            expect(state.teamOvertime.ids.length).toBe(0);
            expect(state.teamOvertime.loading).toBe(false);
            expect(state.teamOvertime.error).toBeNull();
            expect(state.directReports.length).toBe(0);
            expect(state.directReportsLoading).toBe(false);
            expect(state.directReportsError).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Loading PTO does not affect overtime state, and vice versa', () => {
      fc.assert(
        fc.property(
          arbUniquePtoRequests,
          arbUniqueOvertimeRequests,
          arbId,
          (ptoRequests, otRequests, managerId) => {
            // Load PTO
            let state = teamRequestsReducer(
              initialState,
              TeamRequestsActions.loadTeamPtoRequests({ managerId })
            );

            // Overtime should still be at initial
            expect(state.teamOvertime.loading).toBe(false);
            expect(state.teamOvertime.error).toBeNull();
            expect(state.teamOvertime.ids.length).toBe(0);

            // Complete PTO load
            state = teamRequestsReducer(
              state,
              TeamRequestsActions.loadTeamPtoRequestsSuccess({ requests: ptoRequests })
            );

            // Now load overtime
            state = teamRequestsReducer(
              state,
              TeamRequestsActions.loadTeamOvertimeRequests({ managerId })
            );

            // PTO should be unaffected
            expect(state.teamPto.loading).toBe(false);
            expect(state.teamPto.ids.length).toBe(ptoRequests.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
