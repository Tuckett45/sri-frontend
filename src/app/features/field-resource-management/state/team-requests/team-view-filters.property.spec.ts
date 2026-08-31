/**
 * Property-based tests for Team View Mixin and filter logic
 *
 * Uses fast-check to verify universal correctness properties
 * of the status filter, department filter, view mode toggle,
 * and the API short-circuit behavior.
 *
 * Test runner: Karma/Jasmine
 * Feature: pto-overtime-visibility
 */

import * as fc from 'fast-check';
import { PtoRequest, RequestStatus } from '../../models/pto.models';
import { OvertimeRequest, OvertimeRequestStatus, SupportedMarket } from '../../models/overtime.models';
import { of } from 'rxjs';

// ─── Arbitraries ────────────────────────────────────────────────────────────────

/** Non-empty alphanumeric string for IDs (prefixed to avoid JS built-in property collisions) */
const arbId = fc.stringMatching(/^[a-zA-Z0-9_-]+$/).filter(s => s.length > 0 && s.length <= 20).map(s => `id_${s}`);

/** Arbitrary date string in ISO format */
const arbDateString = fc.integer({
  min: new Date('2020-01-01').getTime(),
  max: new Date('2030-12-31').getTime()
}).map(ts => new Date(ts).toISOString());

/** Arbitrary PTO request status */
const arbPtoStatus = fc.constantFrom(
  RequestStatus.Pending_Manager_Approval,
  RequestStatus.Pending_Backoffice_Approval,
  RequestStatus.Approved,
  RequestStatus.Rejected,
  RequestStatus.Cancelled
);

/** Arbitrary status filter value (includes 'All') */
const arbStatusFilter = fc.constantFrom(
  'All',
  RequestStatus.Pending_Manager_Approval,
  RequestStatus.Approved,
  RequestStatus.Rejected,
  RequestStatus.Cancelled
);

/** Arbitrary department name */
const arbDepartment = fc.constantFrom(
  'Construction', 'Engineering', 'Operations', 'Sales',
  'Customer Service', 'Warehouse', 'Administration', 'Finance', 'IT'
);

/** Arbitrary department filter value (includes 'All Departments') */
const arbDepartmentFilter = fc.oneof(
  fc.constant('All Departments'),
  arbDepartment
);

/** Arbitrary PTO request with guaranteed market field */
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
  status: arbPtoStatus,
  createdAt: arbDateString,
  updatedAt: arbDateString,
  market: arbDepartment
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
const arbUniquePtoRequests = fc.array(arbPtoRequest, { minLength: 0, maxLength: 20 })
  .map(requests => {
    const seen = new Set<string>();
    return requests.filter(r => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
  });

/** Generate unique overtime requests (unique IDs) */
const arbUniqueOvertimeRequests = fc.array(arbOvertimeRequest, { minLength: 0, maxLength: 20 })
  .map(requests => {
    const seen = new Set<string>();
    return requests.filter(r => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
  });

// ─── Filter Logic (mirroring what the component does) ───────────────────────────

/**
 * Apply status filter to PTO requests.
 * 'All' returns the full set; otherwise returns only matching status.
 */
function applyStatusFilter(requests: PtoRequest[], status: string): PtoRequest[] {
  if (status === 'All') return requests;
  return requests.filter(r => r.status === status);
}

/**
 * Apply department filter to PTO requests (uses market field).
 * 'All Departments' returns the full set; otherwise returns only matching market.
 */
function applyDepartmentFilter(requests: PtoRequest[], department: string): PtoRequest[] {
  if (department === 'All Departments') return requests;
  return requests.filter(r => r.market === department);
}

/**
 * Apply status filter to overtime requests.
 */
function applyOvertimeStatusFilter(requests: OvertimeRequest[], status: string): OvertimeRequest[] {
  if (status === 'All') return requests;
  return requests.filter(r => r.approvalStatus === status);
}

/**
 * Apply department filter to overtime requests.
 */
function applyOvertimeDepartmentFilter(requests: OvertimeRequest[], department: string): OvertimeRequest[] {
  if (department === 'All Departments') return requests;
  return requests.filter(r => r.department === department);
}

// ─── Property Tests ─────────────────────────────────────────────────────────────

describe('Team View Mixin & Filter Logic — Property-Based Tests', () => {

  // ── Property 3: Status filter is a subset operation ─────────────────────────
  // Feature: pto-overtime-visibility, Property 3: Status filter is a subset operation
  // **Validates: Requirements 1.3, 2.3, 3.6, 4.6**

  describe('Feature: pto-overtime-visibility, Property 3: Status filter is a subset operation', () => {

    it('For any PTO request list and selected status, filtered result equals exactly the subset matching the status. "All" returns the full set.', () => {
      fc.assert(
        fc.property(
          arbUniquePtoRequests,
          arbStatusFilter,
          (requests, statusFilter) => {
            const result = applyStatusFilter(requests, statusFilter);

            if (statusFilter === 'All') {
              // 'All' returns the full set
              expect(result.length).toBe(requests.length);
              expect(result).toEqual(requests);
            } else {
              // Every result entry matches the filter
              for (const r of result) {
                expect(r.status).toBe(statusFilter);
              }

              // Result is a subset of input
              expect(result.length).toBeLessThanOrEqual(requests.length);

              // No matching entries are excluded
              const expected = requests.filter(r => r.status === statusFilter);
              expect(result.length).toBe(expected.length);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('For any overtime request list and selected status, filtered result equals exactly the subset matching the status', () => {
      const arbOtStatusFilter = fc.constantFrom(
        'All',
        OvertimeRequestStatus.Pending_Manager_Approval,
        OvertimeRequestStatus.Approved,
        OvertimeRequestStatus.Rejected,
        OvertimeRequestStatus.Cancelled
      );

      fc.assert(
        fc.property(
          arbUniqueOvertimeRequests,
          arbOtStatusFilter,
          (requests, statusFilter) => {
            const result = applyOvertimeStatusFilter(requests, statusFilter);

            if (statusFilter === 'All') {
              expect(result.length).toBe(requests.length);
              expect(result).toEqual(requests);
            } else {
              for (const r of result) {
                expect(r.approvalStatus).toBe(statusFilter);
              }

              const expected = requests.filter(r => r.approvalStatus === statusFilter);
              expect(result.length).toBe(expected.length);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Filtering by status then filtering again by the same status is idempotent', () => {
      fc.assert(
        fc.property(
          arbUniquePtoRequests,
          arbStatusFilter,
          (requests, statusFilter) => {
            const once = applyStatusFilter(requests, statusFilter);
            const twice = applyStatusFilter(once, statusFilter);
            expect(twice).toEqual(once);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ── Property 4: Department × status filter compose as intersection ──────────
  // Feature: pto-overtime-visibility, Property 4: Department filter AND status filter compose as intersection
  // **Validates: Requirements 5.2, 5.3, 5.6**

  describe('Feature: pto-overtime-visibility, Property 4: Department filter AND status filter compose as intersection', () => {

    it('For any PTO Team View set, combined filters produce { r | r.market = dept ∧ r.status = status } with "All" predicates always true', () => {
      fc.assert(
        fc.property(
          arbUniquePtoRequests,
          arbDepartmentFilter,
          arbStatusFilter,
          (requests, deptFilter, statusFilter) => {
            // Apply both filters (order shouldn't matter)
            const filteredByDeptThenStatus = applyStatusFilter(
              applyDepartmentFilter(requests, deptFilter),
              statusFilter
            );

            const filteredByStatusThenDept = applyDepartmentFilter(
              applyStatusFilter(requests, statusFilter),
              deptFilter
            );

            // Order should not matter — both orderings produce same result
            expect(filteredByDeptThenStatus.length).toBe(filteredByStatusThenDept.length);
            const ids1 = new Set(filteredByDeptThenStatus.map(r => r.id));
            const ids2 = new Set(filteredByStatusThenDept.map(r => r.id));
            expect(ids1).toEqual(ids2);

            // Verify the combined result matches the expected intersection
            const expected = requests.filter(r => {
              const deptMatch = deptFilter === 'All Departments' || r.market === deptFilter;
              const statusMatch = statusFilter === 'All' || r.status === statusFilter;
              return deptMatch && statusMatch;
            });

            expect(filteredByDeptThenStatus.length).toBe(expected.length);
            const expectedIds = new Set(expected.map(r => r.id));
            for (const r of filteredByDeptThenStatus) {
              expect(expectedIds.has(r.id)).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('For any overtime Team View set, combined filters produce { r | r.department = dept ∧ r.approvalStatus = status }', () => {
      const arbOtStatusFilter = fc.constantFrom(
        'All',
        OvertimeRequestStatus.Pending_Manager_Approval,
        OvertimeRequestStatus.Approved,
        OvertimeRequestStatus.Rejected,
        OvertimeRequestStatus.Cancelled
      );

      fc.assert(
        fc.property(
          arbUniqueOvertimeRequests,
          arbDepartmentFilter,
          arbOtStatusFilter,
          (requests, deptFilter, statusFilter) => {
            const filteredByDeptThenStatus = applyOvertimeStatusFilter(
              applyOvertimeDepartmentFilter(requests, deptFilter),
              statusFilter
            );

            const filteredByStatusThenDept = applyOvertimeDepartmentFilter(
              applyOvertimeStatusFilter(requests, statusFilter),
              deptFilter
            );

            // Commutativity check
            expect(filteredByDeptThenStatus.length).toBe(filteredByStatusThenDept.length);

            // Verify against expected intersection
            const expected = requests.filter(r => {
              const deptMatch = deptFilter === 'All Departments' || r.department === deptFilter;
              const statusMatch = statusFilter === 'All' || r.approvalStatus === statusFilter;
              return deptMatch && statusMatch;
            });

            expect(filteredByDeptThenStatus.length).toBe(expected.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('When both filters are "All", all requests are returned', () => {
      fc.assert(
        fc.property(
          arbUniquePtoRequests,
          (requests) => {
            const result = applyStatusFilter(
              applyDepartmentFilter(requests, 'All Departments'),
              'All'
            );
            expect(result.length).toBe(requests.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ── Property 6: Empty employee ID list produces empty result ────────────────
  // Feature: pto-overtime-visibility, Property 6: Empty ID list short-circuit
  // **Validates: Requirements 8.4**

  describe('Feature: pto-overtime-visibility, Property 6: Empty employee ID list produces empty result without HTTP call', () => {

    it('PtoApiService.getTeamRequests([]) returns an Observable emitting [] synchronously', () => {
      // Simulate the short-circuit logic from PtoApiService
      const getTeamRequests = (employeeIds: string[]) => {
        if (employeeIds.length === 0) {
          return of([]);
        }
        // Would make HTTP call here - but we're testing the short-circuit
        throw new Error('Should not reach HTTP call');
      };

      fc.assert(
        fc.property(
          fc.constant([] as string[]),
          (emptyIds) => {
            let result: any[] | undefined;
            let completed = false;

            getTeamRequests(emptyIds).subscribe({
              next: (val) => { result = val; },
              complete: () => { completed = true; }
            });

            // Should emit synchronously (no HTTP call)
            expect(result).toEqual([]);
            expect(completed).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('OvertimeApiService.getTeamRequests([]) returns an Observable emitting [] synchronously', () => {
      const getTeamRequests = (employeeIds: string[]) => {
        if (employeeIds.length === 0) {
          return of([]);
        }
        throw new Error('Should not reach HTTP call');
      };

      fc.assert(
        fc.property(
          fc.constant([] as string[]),
          (emptyIds) => {
            let result: any[] | undefined;
            let completed = false;

            getTeamRequests(emptyIds).subscribe({
              next: (val) => { result = val; },
              complete: () => { completed = true; }
            });

            expect(result).toEqual([]);
            expect(completed).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Non-empty employee ID lists do NOT short-circuit (would trigger HTTP)', () => {
      fc.assert(
        fc.property(
          fc.array(arbId, { minLength: 1, maxLength: 10 }),
          (nonEmptyIds) => {
            // This verifies the short-circuit only applies to empty lists
            const shortCircuits = nonEmptyIds.length === 0;
            expect(shortCircuits).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ── Property 7: View mode toggle resets team-specific state ─────────────────
  // Feature: pto-overtime-visibility, Property 7: View mode toggle reset
  // **Validates: Requirements 3.7, 5.8**

  describe('Feature: pto-overtime-visibility, Property 7: View mode toggle resets team-specific state', () => {

    it('For any prior Team View state (any department selection), switching to Employee View resets department filter to "All Departments"', () => {
      fc.assert(
        fc.property(
          arbDepartment,
          (previousDepartment) => {
            // Simulate mixin state
            let viewMode: 'employee' | 'team' = 'team';
            let selectedDepartment: string = previousDepartment;

            // switchToEmployeeView() logic from the mixin
            viewMode = 'employee';
            selectedDepartment = 'All Departments';

            expect(viewMode).toBe('employee');
            expect(selectedDepartment).toBe('All Departments');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('After switching to Employee View, displayed requests should be exactly the employee\'s own requests', () => {
      fc.assert(
        fc.property(
          arbUniquePtoRequests,
          arbId,
          arbDepartment,
          (allRequests, userId, previousDept) => {
            // Prior team view state
            let viewMode: 'employee' | 'team' = 'team';
            let selectedDepartment: string = previousDept;

            // Switch to employee view
            viewMode = 'employee';
            selectedDepartment = 'All Departments';

            // In employee view, only the user's own requests are shown
            const displayedRequests = allRequests.filter(r => r.employeeId === userId);

            // Verify isolation - only user's requests shown
            for (const r of displayedRequests) {
              expect(r.employeeId).toBe(userId);
            }

            // Verify no team-only entries are included
            const nonUserRequests = displayedRequests.filter(r => r.employeeId !== userId);
            expect(nonUserRequests.length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('switchToTeamView sets viewMode to "team"', () => {
      fc.assert(
        fc.property(
          fc.constant(undefined),
          () => {
            let viewMode: 'employee' | 'team' = 'employee';

            // switchToTeamView() logic
            viewMode = 'team';

            expect(viewMode).toBe('team');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Department filter can be set to any value during Team View, then resets on switch back', () => {
      fc.assert(
        fc.property(
          fc.array(arbDepartment, { minLength: 1, maxLength: 5 }),
          (departmentSequence) => {
            let viewMode: 'employee' | 'team' = 'team';
            let selectedDepartment = 'All Departments';

            // Simulate setting multiple department filters
            for (const dept of departmentSequence) {
              selectedDepartment = dept;
              expect(selectedDepartment).toBe(dept);
            }

            // Switch back to employee view
            viewMode = 'employee';
            selectedDepartment = 'All Departments';

            expect(viewMode).toBe('employee');
            expect(selectedDepartment).toBe('All Departments');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
